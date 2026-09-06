// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import type { RoutingDecision } from "../routing";
import { AGENT_ROSTER, MIN_QA_SAMPLE, YOU } from "@/lib/people";

export type ConvoStatus = "queued" | "offered" | "assigned" | "snoozed" | "resolved";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Channel = "WhatsApp" | "Website" | "Messenger" | "Instagram" | "Email";
export type BookingState = "Searching" | "Hold created" | "Awaiting payment" | "Paid" | "Ticketing failed" | "Ticketed" | "No active booking";
export type AgentState = "available" | "busy" | "wrap_up" | "away" | "break" | "training" | "offline";

export type IntentTrail = { intent: string; confidence: number };
export type ActivityEntry = { id: string; title: string; detail: string; time: string };
export type Attachment = {
  kind: "image" | "file" | "location";
  name: string;
  /** Object URL for the picked file — session-scoped, like everything else here. */
  url: string;
  sizeLabel: string;
  /** INB-05: a shared location renders as a place, not a file. */
  place?: string;
};

/**
 * INB-09: "Show channel send states — queued, sent, delivered, read and
 * failed *where the channel supplies them* — with bounded retry and an
 * operator-visible terminal failure."
 *
 * The "where the channel supplies them" clause is the reason this is a table
 * rather than one shared progression. A web-widget session reports delivery
 * but has no concept of a read receipt, so showing a read state there would
 * be inventing a guarantee the channel never gave — which is exactly what
 * the decorative double-tick this replaces was doing on every outbound
 * message regardless of channel or outcome.
 */
export type DeliveryState = "queued" | "sent" | "delivered" | "read" | "failed";

export const CHANNEL_DELIVERY_STATES: Record<Channel, DeliveryState[]> = {
  WhatsApp: ["queued", "sent", "delivered", "read"],
  Messenger: ["queued", "sent", "delivered", "read"],
  Instagram: ["queued", "sent", "delivered", "read"],
  // The widget knows the browser received it; it never reports a read.
  Website: ["queued", "sent", "delivered"],
  // Plain email confirms nothing past hand-off to the mail relay — no
  // delivery or read receipt to show without inventing one.
  Email: ["queued", "sent"],
};

/** Retry is bounded — three attempts, then it is the operator's problem. */
export const MAX_SEND_ATTEMPTS = 3;

export type Delivery = {
  state: DeliveryState;
  /** Send attempts made, including the current one. */
  attempts: number;
  /** Set once `failed` is terminal — no further automatic retry. */
  terminalReason?: string;
};

/** The next state for this channel, or null when it has reached its last. */
export function nextDeliveryState(channel: Channel, current: DeliveryState): DeliveryState | null {
  const ladder = CHANNEL_DELIVERY_STATES[channel];
  const i = ladder.indexOf(current);
  if (i < 0 || i === ladder.length - 1) return null;
  return ladder[i + 1];
}

export function canAutoRetry(d: Delivery): boolean {
  return d.state === "failed" && !d.terminalReason && d.attempts < MAX_SEND_ATTEMPTS;
}

export type TranscriptMsg = {
  id: string;
  /**
   * INB-08's hard rule is "internal content must never be sent to the
   * customer", so a note is its own kind of entry rather than an agent
   * message with a flag. It is created by `ADD_NOTE`, never by
   * `SEND_MESSAGE`, and carries no `delivery` — the delivery effect only
   * looks at entries that have one, so a note has no path to a channel even
   * if something later gets the styling wrong.
   */
  from: "customer" | "agent" | "bot" | "system" | "note";
  text: string;
  time: string;
  /** INB-05: images and files render as themselves rather than as a name in
   *  a text bubble. Unsupported types fall back to the file card. */
  attachment?: Attachment;
  /** INB-09. Outbound only — an inbound message has no send state. */
  delivery?: Delivery;
  /**
   * AG-04: an English rendering of a message the agent may not read. Stored
   * rather than generated — see `TranslateToggle` in `ChatPanel` for why the
   * absence of one is shown rather than hidden.
   */
  translation?: string;
  /** INB-08: colleagues named in a note, parsed from `@Name` on submit. */
  mentions?: string[];
  /** INB-05: channel reactions, where the channel reports them. */
  reactions?: { emoji: string; from: string }[];
};

/** INB-08's follow-up tasks: something to do later, with an owner and a time. */
export type FollowUpTask = {
  id: string;
  title: string;
  owner: string;
  dueAt: number;
  done: boolean;
};

/**
 * INB-08's saved replies. Customer-facing, unlike notes — which is exactly
 * why they live in a separate list from `APPROVED_TEMPLATES` (INB-12's
 * out-of-window templates) and from notes: three things that all put text
 * somewhere, with three different audiences and rules.
 */
export const SAVED_REPLIES = [
  { id: "ack", label: "Acknowledge & hold", body: "Thanks for your patience — I have your booking open and I'm checking this now." },
  { id: "refund_timing", label: "Refund timing", body: "The refund is approved. bKash and Nagad usually show it within 3 business days; a card can take 5–10 depending on your bank." },
  { id: "docs", label: "Ask for documents", body: "Could you send a photo of the passenger's passport or NID page? I'll attach it to the booking and continue from there." },
  { id: "closing", label: "Closing", body: "Anything else I can help with before I close this? You can reply here any time and it comes back to us." },
];

export type Conversation = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  passportNid: string;
  channel: Channel;
  /** RT-01: which tenant queue this belongs to (`queues.queues` ids). */
  queueId: string;
  /** RT-01: a skill the handling agent must hold, where the case needs one. */
  requiredSkill?: string;
  /** Who currently owns it. `undefined` while it sits in a queue — this is
   *  what makes SUP-02's agent filter possible. */
  assignee?: string;
  pnr?: string;
  route?: string;
  bookingState: BookingState;
  paymentSummary?: string;
  /** Captured amount, where money has actually moved. Drives the refund
   *  ceiling check in `availableBookingActions`. */
  paidAmountBdt?: number;
  /** AG-05 / NFR-04: idempotency keys of booking actions already applied to
   *  this conversation. A replayed key is a no-op, so a double-submit or a
   *  re-dispatch cannot issue two refunds. */
  appliedBookingKeys?: string[];
  language: string;
  status: ConvoStatus;
  priority: Priority;
  escalationReason: string;
  summary: string;
  intentTrail: IntentTrail[];
  tags: string[];
  transcript: TranscriptMsg[];
  activity: ActivityEntry[];
  unread: number;
  updatedLabel: string;
  /** INB-12: when the customer last messaged, which is what opens each
   *  channel's reply window. The transcript only carries display times. */
  lastCustomerAt: number;
  /** Whether this customer has opted in to being messaged on this channel
   *  outside a reply window. */
  channelOptIn: boolean;
  /** When this conversation first entered the queue — preserved across
   *  decline/timeout/transfer/release so age is never reset, per RT-06. */
  queuedSince: number;
  /** `queuedSince` + the priority's SLA window — see `SLA_MINUTES`. */
  slaDeadline: number;
  offerExpiresAt?: number;
  ownerLeaseActive: boolean;
  aiThinking: boolean;
  aiDraft?: string;
  snoozeUntil?: number;
  snoozeReason?: string;
  /** AG-09: who owns the wake. "Someone should look at this later" with
   *  nobody named is how a snooze becomes a way of losing a case. */
  snoozeOwner?: string;
  /** RT-08: pinned by a supervisor, with the reason they had to give. */
  pinned?: { by: string; reason: string };
  /**
   * AG-01: identity verification state. The workspace showed passport/NID
   * (masked) but never whether it had been *checked* — which is the part an
   * agent needs before moving money or changing a name.
   */
  identityStatus: "unverified" | "pending" | "verified" | "mismatch";
  /** INB-11: another agent looking at, or typing on, this conversation. */
  presence?: { person: string; state: "viewing" | "typing" };
  resolution?: { category: string; reference: string };
  /** When it was resolved — drives the "Recently resolved" view. */
  resolvedAt?: number;
  /** RT-05: the agent who last held the lease, so a reopen can prefer them. */
  lastAgent?: string;
  /** RT-10: the full routing decision that put this where it is — candidates,
   *  weights, why each was ruled out, and who was selected. */
  routingDecision?: RoutingDecision;
  /** AG-04 / AI-03: knowledge article ids the bot answered from on this
   *  thread, so the agent can open what was actually cited to the customer
   *  rather than searching for it blind. */
  citedKnowledge?: string[];
  /** INB-08: follow-up tasks raised on this conversation. */
  tasks?: FollowUpTask[];
  /** Set only for conversations opened as part of a disruption cohort. */
  disruptionId?: string;
  urgencyLabel?: string;
  urgencyRank?: number;
  qaReview?: QaReview;
};

export type QaScores = { accuracy: number; policy: number; communication: number; ownership: number; security: number };
export type QaReview = {
  reviewer: string;
  rubricVersion: string;
  scores: QaScores;
  overall: number;
  note: string;
  appeal?: { status: "pending" | "upheld" | "overturned"; note: string };
};

// Imported *and* re-exported so the twenty-odd existing call sites keep
// importing from the engine, while the values live once in `lib/people`.
export { YOU, MIN_QA_SAMPLE, AGENT_ROSTER };

/*
 * Moved out of `inboxEngine.ts` with the split. It is a predicate over the
 * `AgentState` union and nothing else, and `reopen.ts` needs it — leaving
 * it in the state machine would have had a pure module importing from its
 * own importer.
 */

/** Can this agent state actually receive new work? Matches the E5 "Agent
 *  state and capacity" table — everything but Available/Busy is "No." */
export function canAcceptWork(state: AgentState): boolean {
  return state === "available" || state === "busy";
}
