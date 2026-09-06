// The inbox state machine's data: what the state is, and every action that
// can change it. Separate from the reducer so the domain reducers under
// `reducers/` can name the types they operate on without importing from
// `inboxEngine.ts`, which imports them — a cycle the split exists to avoid.

import { seedConversations } from "./seed";
import type {
  Channel,
  AgentState,
  Attachment,
  Conversation,
  Priority,
  QaScores,
} from "./types";
import type { BookingActionId } from "./bookingActions";
import type { PiiField } from "./pii";
import type { InboxView } from "./views";
import type { RoutingDecision } from "../routing";

export type DisruptionRecord = { id: string; route: string; reason: string; openedAt: number };

export type InboxState = {
  conversations: Conversation[];
  selectedId: string | null;
  agentState: AgentState;
  transferTargetId: string | null;
  resolveTargetId: string | null;
  snoozeTargetId: string | null;
  /** More than one can be open at once — see `DISRUPTION_SCENARIOS` and the
   *  `SIMULATE_DISRUPTION` reducer case below. */
  disruptions: DisruptionRecord[];
  manualAssignTargetId: string | null;
  qaReviewTargetId: string | null;
  /** AG-06: which protected fields the agent has currently revealed, per
   *  conversation. Deliberately not persisted — closing the workspace
   *  re-masks everything. */
  revealedPii: Record<string, PiiField[]>;
  piiRevealTarget: { id: string; field: PiiField } | null;
  /** The booking action awaiting confirmation, with the idempotency key it
   *  will run under — minted when the confirmation opens, so confirming
   *  twice replays one key rather than issuing two. */
  bookingActionTarget: { id: string; action: BookingActionId; key: string } | null;
  /** AG-11: an agent-state change waiting on the "you still hold work"
   *  confirmation. Null when nothing is pending. */
  pendingAgentState: AgentState | null;
  /** When the agent stopped being able to take work, so the unattended
   *  timeout has something to count from. */
  unavailableSince: number | null;
  /** Set by a `/dashboard` "Details" drill-down right before navigating to
   *  `/inbox`, so it lands pre-filtered to the real channel that was
   *  clicked — consumed and cleared on `/inbox`'s next mount so a later,
   *  unrelated visit (e.g. via the sidebar) isn't silently pre-filtered by
   *  a stale request. */
  channelFilterIntent: Channel | null;
  /** A search handed over from another screen's search box, applied once by
   *  `TicketList` on mount then cleared — same one-shot handover as
   *  `channelFilterIntent`. */
  searchIntent: string | null;
  /** AG-04: a knowledge article the agent asked to open, from wherever they
   *  clicked it. Cleared once the panel has it. */
  knowledgeRequest: string | null;
  /** SUP-03: an inbox view requested by a drill-down from an aggregate. */
  viewIntent: InboxView | null;
  /**
   * Unsent composer text, per conversation. It lives here rather than in
   * `ChatPanel` because that component is deliberately remounted when the
   * selection changes — which meant clicking another conversation silently
   * threw away whatever the agent had typed.
   */
  drafts: Record<string, string>;
};

export const OFFER_SECONDS = 30;

export function initialInboxState(): InboxState {
  const conversations = seedConversations();
  return {
    conversations,
    selectedId: conversations[0]?.id ?? null,
    agentState: "available",
    transferTargetId: null,
    resolveTargetId: null,
    snoozeTargetId: null,
    disruptions: [],
    manualAssignTargetId: null,
    qaReviewTargetId: null,
    channelFilterIntent: null,
    searchIntent: null,
    knowledgeRequest: null,
    viewIntent: null,
    drafts: {},
    revealedPii: {},
    piiRevealTarget: null,
    bookingActionTarget: null,
    pendingAgentState: null,
    unavailableSince: null,
  };
}

export type InboxAction =
  | { type: "SELECT"; id: string }
  | { type: "SET_AGENT_STATE"; state: AgentState }
  | { type: "ACCEPT"; id: string }
  | { type: "DECLINE"; id: string }
  | { type: "OFFER_TIMEOUT"; id: string }
  | { type: "SIMULATE_INCOMING_OFFER" }
  | { type: "SIMULATE_DISRUPTION" }
  | { type: "CLOSE_DISRUPTION"; id: string }
  | { type: "REQUEST_CHANNEL_FILTER"; channel: Channel }
  | { type: "CLEAR_CHANNEL_FILTER_INTENT" }
  | { type: "REQUEST_SEARCH"; query: string }
  | { type: "CLEAR_SEARCH_INTENT" }
  | { type: "SET_IDENTITY"; id: string; status: Conversation["identityStatus"] }
  | { type: "TOGGLE_PIN"; id: string; reason: string }
  | { type: "ADD_NOTE"; id: string; text: string }
  | { type: "ADD_TASK"; id: string; title: string; owner: string; dueMinutes: number }
  | { type: "TOGGLE_TASK"; id: string; taskId: string }
  | { type: "SET_DRAFT"; id: string; text: string }
  | { type: "REQUEST_VIEW"; view: InboxView }
  | { type: "CLEAR_VIEW_INTENT" }
  | { type: "OPEN_KNOWLEDGE"; articleId: string | null }
  | { type: "CLEAR_KNOWLEDGE_REQUEST" }
  | { type: "SEND_MESSAGE"; id: string; text: string; attachment?: Attachment; sandbox?: boolean }
  | { type: "REQUEST_AI_DRAFT"; id: string }
  | { type: "RESOLVE_AI_DRAFT"; id: string; text: string }
  | { type: "EDIT_AI_DRAFT"; id: string }
  | { type: "DISCARD_AI_DRAFT"; id: string }
  | { type: "RELEASE"; id: string }
  | { type: "OPEN_TRANSFER"; id: string }
  | { type: "CLOSE_TRANSFER" }
  | { type: "CONFIRM_TRANSFER"; id: string; destination: string; reason: string }
  | { type: "OPEN_RESOLVE"; id: string }
  | { type: "CLOSE_RESOLVE" }
  | { type: "CONFIRM_RESOLVE"; id: string; category: string; reference: string }
  | { type: "OPEN_SNOOZE"; id: string }
  | { type: "CLOSE_SNOOZE" }
  | { type: "CONFIRM_SNOOZE"; id: string; reason: string; minutes: number; owner: string }
  | { type: "SNOOZE_WOKE"; id: string }
  | { type: "ADD_TAG"; id: string; tag: string }
  | { type: "OPEN_PII_REVEAL"; id: string; field: PiiField }
  | { type: "CLOSE_PII_REVEAL" }
  | { type: "REVEAL_PII"; id: string; field: PiiField; reason: string }
  | { type: "HIDE_PII"; id: string; field: PiiField }
  | { type: "OPEN_BOOKING_ACTION"; id: string; action: BookingActionId }
  | { type: "CLOSE_BOOKING_ACTION" }
  | { type: "RUN_BOOKING_ACTION"; id: string; action: BookingActionId; key: string; sandbox?: boolean }
  | { type: "REQUEST_AGENT_STATE"; state: AgentState }
  | { type: "CANCEL_AGENT_STATE" }
  | { type: "CONFIRM_AGENT_STATE"; state: AgentState; releaseHeld: boolean }
  | { type: "UNATTENDED_TIMEOUT"; id: string }
  | { type: "REOPEN"; id: string }
  | { type: "RECORD_ROUTING"; id: string; decision: RoutingDecision }
  | { type: "ADVANCE_DELIVERY"; id: string; msgId: string }
  | { type: "FAIL_DELIVERY"; id: string; msgId: string; reason: string }
  | { type: "RETRY_SEND"; id: string; msgId: string; manual?: boolean }
  | { type: "OPEN_MANUAL_ASSIGN"; id: string }
  | { type: "CLOSE_MANUAL_ASSIGN" }
  | { type: "CONFIRM_MANUAL_ASSIGN"; id: string; priority: Priority; assignToMe: boolean; reason: string }
  | { type: "OPEN_QA_REVIEW"; id: string }
  | { type: "CLOSE_QA_REVIEW" }
  | { type: "SUBMIT_QA_REVIEW"; id: string; scores: QaScores; note: string }
  | { type: "FILE_APPEAL"; id: string; note: string }
  | { type: "RESOLVE_APPEAL"; id: string; status: "upheld" | "overturned"; note: string };

/**
 * `@Name` mentions, matched against the real roster rather than any word
 * after an @ — an email address in a note should not mention anybody.
 */
