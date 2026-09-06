// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { activity, nid } from "../helpers";
import { slaDeadlineFor } from "../queue";
import { nowLabel } from "./shared";
import type { DisruptionRecord } from "../state";
import type { InboxAction, InboxState } from "../state";
import type { Conversation, Priority } from "../types";

function seedFromName(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * What makes two open disruptions actually distinguishable from each other
 * rather than two copies of the same banner — a real route, a real cause,
 * and wording that matches it (a delay isn't a cancelled rotation).
 */

type DisruptionScenario = {
  route: string;
  reason: string;
  queuedSummary: string;
  resolvedSummary: string;
  resolvedOffer: string;
  noticeBn: string;
  noticeEn: string;
  passengers: { name: string; urgencyRank: number; urgencyLabel: string; priority: Priority; kind: "queued" | "resolved-informational" }[];
};

/**
 * One passenger inside a disruption cohort. `kind` is what makes §B5's
 * distinction real rather than asserted: "queued" passengers need a human
 * decision (rebook vs. refund); "resolved-informational" ones are answered
 * directly from the disruption record and never enter a queue at all.
 */
function disruptionPassenger(
  disruptionId: string,
  scenario: DisruptionScenario,
  name: string,
  urgencyRank: number,
  urgencyLabel: string,
  priority: Priority,
  noticeText: string,
  kind: "queued" | "resolved-informational"
): Conversation {
  const queuedSince = Date.now();
  const seed = seedFromName(name);
  const base: Conversation = {
    id: nid("c"),
    queuedSince,
    slaDeadline: slaDeadlineFor(priority, queuedSince),
    customerName: name,
    queueId: "q1",
    phone: `+880 1${String(700000000 + (seed % 99999999)).padStart(9, "0")}`,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    address: "Dhaka",
    passportNid: `NID ${1980 + (seed % 25)} ${String(1000 + (seed % 8999))} ${String(1000 + (seed % 8999))}`,
    identityStatus: "unverified",
    channel: "WhatsApp",
    route: scenario.route,
    bookingState: "Ticketed",
    paymentSummary: "bKash · settled",
    paidAmountBdt: 9400,
    language: "Bangla",
    status: kind === "queued" ? "queued" : "resolved",
    resolvedAt: kind === "queued" ? undefined : Date.now(),
    priority,
    escalationReason: "Involuntary disruption",
    summary: kind === "queued" ? scenario.queuedSummary : scenario.resolvedSummary,
    intentTrail: [{ intent: "disruption.status", confidence: 0.97 }],
    tags: [],
    transcript: [{ id: nid("m"), from: "bot", text: noticeText, time: nowLabel() }],
    activity: [activity("Notified proactively", `${scenario.reason} — ${scenario.route}`, nowLabel())],
    unread: kind === "queued" ? 1 : 0,
    lastCustomerAt: Date.now(),
    channelOptIn: true,
    updatedLabel: "just now",
    ownerLeaseActive: false,
    aiThinking: false,
    disruptionId,
    urgencyLabel,
    urgencyRank,
  };
  if (kind === "queued") return base;
  return {
    ...base,
    transcript: [
      ...base.transcript,
      { id: nid("m"), from: "bot", text: scenario.resolvedOffer, time: nowLabel() },
    ],
    activity: [...base.activity, activity("Answered from disruption record", "No queueing — rebooking offer sent", nowLabel())],
    resolution: { category: "Disruption", reference: "Informational — no action needed" },
  };
}

/**
 * Two genuinely different events, not two copies of one — different route,
 * different cause, different cohort — so that `SIMULATE_DISRUPTION` opening
 * a second record while the first is still open (§B5's "a disruption is a
 * surge, not a queue," plural in the real world) is a real second surge to
 * manage, not a duplicate banner. Capped at two: honest about being a demo
 * fixture, not a claim this scales to arbitrarily many concurrent events.
 */
const DISRUPTION_SCENARIOS: DisruptionScenario[] = [
  {
    route: "DAC → CXB",
    reason: "Rotation cancelled — fog",
    queuedSummary: "Cancelled rotation — needs a rebooking decision.",
    resolvedSummary: "Cancelled rotation — offered free rebooking or refund directly from the disruption record; no queueing needed.",
    resolvedOffer: "Full refund, or a free rebook onto tomorrow's 09:45 flight — reply any time if you'd rather speak to a person.",
    noticeBn: "আপনার DAC → CXB ফ্লাইট আজ কুয়াশার কারণে বাতিল হয়েছে। আমরা বিকল্প ব্যবস্থা করছি।",
    noticeEn: "Your DAC → CXB flight is cancelled today due to fog. We're arranging alternatives — reply if you'd like to make a different choice.",
    passengers: [
      { name: "Imran Kabir", urgencyRank: 0, urgencyLabel: "At the airport now", priority: "P1", kind: "queued" },
      { name: "Farzana Haque", urgencyRank: 1, urgencyLabel: "Departs in 55m", priority: "P1", kind: "queued" },
      { name: "Shaon Ahmed", urgencyRank: 2, urgencyLabel: "Departs in 4h", priority: "P1", kind: "queued" },
      { name: "Liton Das", urgencyRank: 3, urgencyLabel: "Departs tomorrow", priority: "P3", kind: "resolved-informational" },
      { name: "Promi Akter", urgencyRank: 4, urgencyLabel: "Departs in 2 days", priority: "P3", kind: "resolved-informational" },
    ],
  },
  {
    route: "DAC → ZYL",
    reason: "Delayed 3h+ — mechanical",
    queuedSummary: "3-hour-plus mechanical delay — needs a rebooking or compensation decision.",
    resolvedSummary: "3-hour-plus mechanical delay — offered compensation or a later flight directly from the disruption record; no queueing needed.",
    resolvedOffer: "Meal voucher and a seat on the 21:15 departure, or a full refund — reply any time if you'd rather speak to a person.",
    noticeBn: "আপনার DAC → ZYL ফ্লাইট যান্ত্রিক ত্রুটির কারণে ৩ ঘণ্টার বেশি বিলম্বিত হবে। আমরা বিকল্প ব্যবস্থা করছি।",
    noticeEn: "Your DAC → ZYL flight is delayed 3+ hours due to a mechanical issue. We're arranging alternatives — reply if you'd like to make a different choice.",
    passengers: [
      { name: "Kamrul Hasan", urgencyRank: 0, urgencyLabel: "At the airport now", priority: "P1", kind: "queued" },
      { name: "Ruma Begum", urgencyRank: 1, urgencyLabel: "Departs in 40m", priority: "P1", kind: "queued" },
      { name: "Tanvir Islam", urgencyRank: 2, urgencyLabel: "Departs in 6h", priority: "P2", kind: "queued" },
      { name: "Nasrin Jahan", urgencyRank: 3, urgencyLabel: "Departs tomorrow", priority: "P3", kind: "resolved-informational" },
    ],
  },
];

export const DISRUPTION_SCENARIO_COUNT = DISRUPTION_SCENARIOS.length;

function buildDisruptionCohort(disruptionId: string, scenario: DisruptionScenario): Conversation[] {
  return scenario.passengers.map((p) =>
    disruptionPassenger(
      disruptionId,
      scenario,
      p.name,
      p.urgencyRank,
      p.urgencyLabel,
      p.priority,
      p.kind === "queued" ? scenario.noticeBn : scenario.noticeEn,
      p.kind
    )
  );
}


type DisruptionAction = Extract<InboxAction, { type: "SIMULATE_DISRUPTION" | "CLOSE_DISRUPTION" }>;

export function disruptionReducer(state: InboxState, action: DisruptionAction): InboxState {
  switch (action.type) {
    case "SIMULATE_DISRUPTION": {
      const scenario = DISRUPTION_SCENARIOS[state.disruptions.length];
      if (!scenario) return state; // every scripted scenario is already open
      const record: DisruptionRecord = { id: nid("d"), route: scenario.route, reason: scenario.reason, openedAt: Date.now() };
      const cohort = buildDisruptionCohort(record.id, scenario);
      return { ...state, disruptions: [...state.disruptions, record], conversations: [...cohort, ...state.conversations] };
    }
    case "CLOSE_DISRUPTION":
      // Closing the record archives the event, not the people still in it —
      // anyone who still needs a human decision falls back into the normal
      // queue instead of becoming permanently invisible (TicketList excludes
      // anything with a disruptionId, so leaving it set here would silently
      // strand a still-open case once its banner disappears).
      return {
        ...state,
        disruptions: state.disruptions.filter((d) => d.id !== action.id),
        conversations: state.conversations.map((c) => (c.disruptionId === action.id ? { ...c, disruptionId: undefined } : c)),
      };

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
