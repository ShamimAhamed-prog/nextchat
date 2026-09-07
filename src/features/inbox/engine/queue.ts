// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import type { Conversation, ConvoStatus, Priority } from "./types";

// PRD §C1/§E3 queue priority table gives each band a *mechanism*, not a
// number — P0 borrows the 5-minute figure from the "paid, not ticketed"
// critical alarm threshold in §D2 (the one case where the PRD is explicit);
// P1/P2/P3 are illustrative but ordered the way the table describes them.
const SLA_MINUTES: Record<Priority, number> = { P0: 5, P1: 15, P2: 240, P3: 1440 };

export function slaDeadlineFor(priority: Priority, queuedSince: number): number {
  return queuedSince + SLA_MINUTES[priority] * 60_000;
}

export const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
// offered/queued/assigned all rank together — a P0 already assigned to you
// is still the most urgent thing on the screen and has to read that way,
// not be outranked by an unclaimed P2 just because nobody owns it yet.
// Confirmed by actually looking at the rendered list: the first version
// scoped priority ordering to the unclaimed queue only, which is a
// defensible reading of §C1/§E3 in the abstract but buried a near-breach
// P0 beneath two lower-priority queued tickets once rendered — fixed here.
const QUEUE_GROUP: Record<ConvoStatus, number> = { offered: 0, queued: 0, assigned: 0, snoozed: 1, resolved: 2 };

/**
 * §C1/§E3's ordering rule: priority band first, then age within a band —
 * "not by who messaged first" in the way a plain recency sort would.
 * Snoozed and resolved keep their existing relative order (stable sort),
 * since the priority rule is about live work, not a settled outcome.
 */
export function queueSort(a: Conversation, b: Conversation): number {
  const g = QUEUE_GROUP[a.status] - QUEUE_GROUP[b.status];
  if (g !== 0) return g;
  if (QUEUE_GROUP[a.status] !== 0) return 0;
  // RT-08: a supervisor pin outranks priority within the open group. It does
  // not cross groups — pinning does not resurrect a resolved conversation.
  const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
  if (pin !== 0) return pin;
  const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (pr !== 0) return pr;
  return a.queuedSince - b.queuedSince;
}

// A near-term breach forecast needs a horizon — 15 minutes is short enough
// to be an actionable "about to breach" warning rather than "everything
// eventually breaches if you look far enough out."
export const BREACH_FORECAST_MINUTES = 15;
export const BREACH_FORECAST_MS = BREACH_FORECAST_MINUTES * 60_000;

export type QueueSnapshot = {
  waiting: number;
  offered: number;
  assigned: number;
  byPriority: Record<Priority, number>;
  oldestWaitMinutes: number;
  breached: number;
  breachingSoon: number;
};

/** SUP-01's "waiting/offered/assigned counts by priority, oldest wait,
 *  breach forecast" — a pure selector over live conversations, not stored
 *  state, so it's always consistent with whatever `/inbox` is doing. */
export function queueSnapshot(conversations: Conversation[], now: number): QueueSnapshot {
  const live = conversations.filter((c) => !c.disruptionId);
  const waiting = live.filter((c) => c.status === "queued" || c.status === "offered");
  const offered = live.filter((c) => c.status === "offered");
  const assigned = live.filter((c) => c.status === "assigned");
  const byPriority: Record<Priority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const c of waiting) byPriority[c.priority] += 1;
  const oldestWaitMinutes = waiting.length ? Math.max(0, Math.round((now - Math.min(...waiting.map((c) => c.queuedSince))) / 60_000)) : 0;
  const breached = waiting.filter((c) => c.slaDeadline <= now).length;
  const breachingSoon = waiting.filter((c) => c.slaDeadline > now && c.slaDeadline - now <= BREACH_FORECAST_MINUTES * 60_000).length;
  return { waiting: waiting.length, offered: offered.length, assigned: assigned.length, byPriority, oldestWaitMinutes, breached, breachingSoon };
}

/**
 * Structured rather than a finished sentence, so `NFR-15` can render it in
 * either language — the engine decides *what* the badge says, the component
 * decides how to word it.
 */
export type SlaBadge = {
  kind: "due" | "breached";
  /** Whole minutes, or hours when `unit` is "h". */
  amount: number;
  unit: "m" | "h";
  color: string;
  surge: boolean;
};

/**
 * The one SLA-badge selector both `TicketList` and `DisruptionCohort` read
 * from — a disruption-cohort conversation gets a `slaDeadline` exactly like
 * any other (see `disruptionPassenger` below), so it needs the same badge,
 * just flagged `surge: true` so the UI can visibly distinguish "this P1 is
 * part of an active surge" from an ordinary queued P1 rather than rendering
 * an identical, context-free badge in both places.
 */
export function slaBadge(convo: Conversation, now: number): SlaBadge | null {
  if (convo.status !== "queued" && convo.status !== "offered") return null;
  const surge = Boolean(convo.disruptionId);
  const diff = convo.slaDeadline - now;
  const mins = Math.round(Math.abs(diff) / 60_000);
  if (diff <= 0) return { kind: "breached", amount: mins, unit: "m", color: "var(--color-danger-strong)", surge };
  if (diff < 5 * 60_000) return { kind: "due", amount: Math.max(1, mins), unit: "m", color: "var(--color-warn-strong)", surge };
  if (mins < 60) return { kind: "due", amount: mins, unit: "m", color: "var(--color-ink-dim)", surge };
  return { kind: "due", amount: Math.round(mins / 60), unit: "h", color: "var(--color-ink-dim)", surge };
}

/**
 * AG-11: conversations this agent personally owns. Going Away/Break/Offline
 * while this is non-empty is the thing that needs a warning — a customer
 * mid-conversation with an agent who has walked away is the failure the
 * requirement exists to prevent.
 */
export function heldByAgent(conversations: Conversation[]): Conversation[] {
  return conversations.filter((c) => c.status === "assigned" && c.ownerLeaseActive);
}

/**
 * The one status-label selector `TicketList` and `DetailsPanel` both read
 * from (they used to each carry their own identical `STATUS_LABEL` map).
 * `assigned` now needs a live decision rather than a fixed string — a
 * transfer or shift handover (Phase 1 #2/#7) can leave a conversation
 * `assigned` to someone other than the agent viewing this workspace, and
 * §5's "show who is handling it" is this function saying so, in one place,
 * rather than two components each guessing.
 */
export function conversationStatusLabel(c: Conversation): string {
  switch (c.status) {
    case "queued":
      return "Unassigned";
    case "offered":
      return "Offered";
    case "assigned":
      return c.ownerLeaseActive ? "Assigned to you" : `Assigned to ${c.assignee ?? "another agent"}`;
    case "snoozed":
      return "Snoozed";
    case "resolved":
      return "Resolved";
  }
}
