// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import { YOU } from "@/shared/lib/people";
import { BREACH_FORECAST_MINUTES, PRIORITY_RANK } from "./queue";
import { canAcceptWork, type AgentState, type Conversation } from "./types";

/* --- Reopen and agent affinity (RT-05, AG-10) ----------------------------
 *
 * "Prefer the previous eligible agent for a reopened conversation… when
 * doing so will not breach a higher-priority SLA." Both halves matter: the
 * affinity is worth real money in a support queue (the agent already knows
 * the case), but it is a *preference*, and the PRD is explicit that it
 * yields to someone else's tighter deadline.
 */
export type ReopenRouting = {
  /** Whether the previous owner gets it back. */
  toPreviousAgent: boolean;
  /** RT-10: the reason, in the words that go into the audit entry. */
  reason: string;
};

export function reopenWindowOpen(c: Conversation, reopenWindowHours: number, now: number): boolean {
  if (c.status !== "resolved") return false;
  return now - (c.resolvedAt ?? 0) <= reopenWindowHours * 60 * 60_000;
}

/**
 * The affinity check. A higher-priority conversation already waiting and
 * within the breach forecast is exactly the case the PRD carves out: taking
 * the reopened one first would push that one over.
 */
export function routeReopen(
  c: Conversation,
  all: Conversation[],
  agentState: AgentState,
  now: number,
): ReopenRouting {
  if (!c.lastAgent || c.lastAgent !== YOU) {
    return { toPreviousAgent: false, reason: "No previous owner on record — queued normally" };
  }
  if (!canAcceptWork(agentState)) {
    return { toPreviousAgent: false, reason: `Previous agent is ${agentState} — queued normally` };
  }

  const blocking = all.find(
    (o) =>
      o.id !== c.id &&
      (o.status === "queued" || o.status === "offered") &&
      PRIORITY_RANK[o.priority] < PRIORITY_RANK[c.priority] &&
      o.slaDeadline - now <= BREACH_FORECAST_MINUTES * 60_000,
  );
  if (blocking) {
    return {
      toPreviousAgent: false,
      reason: `Queued instead — ${blocking.customerName}'s ${blocking.priority} is inside its SLA breach window`,
    };
  }

  return { toPreviousAgent: true, reason: `Offered back to ${YOU}, who resolved it` };
}
