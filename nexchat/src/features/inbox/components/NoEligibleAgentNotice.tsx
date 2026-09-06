"use client";

import { useInbox } from "./InboxContext";
import { useNow } from "./useCountdown";
import { canAcceptWork } from "./inboxEngine";
import { useTenantConfig } from "../admin/TenantConfigContext";
import { totalMaxConcurrency } from "../admin/tenantConfigEngine";

/**
 * RT-07: "tell the customer the queue state, preserve their place, alert
 * the supervisor at the configured threshold and retry on agent-state
 * change." The retry is `SET_AGENT_STATE`'s job in the engine; this is the
 * alert half — in this single-agent view, the agent *is* the routing
 * capacity, so their own state change is what a supervisor would otherwise
 * be paged about. Being at the tenant-configured concurrency cap is the
 * same "no eligible agent" situation even while marked Available/Busy, so
 * it surfaces the same notice rather than a silently-stuck queue.
 */
export default function NoEligibleAgentNotice() {
  const { state } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const now = useNow();
  const waiting = state.conversations.filter((c) => (c.status === "queued" || c.status === "offered") && !c.disruptionId);

  const stateIneligible = !canAcceptWork(state.agentState);
  const cap = totalMaxConcurrency(tenantState.published);
  const assignedCount = state.conversations.filter((c) => c.status === "assigned").length;
  const atCapacity = assignedCount >= cap;

  if ((!stateIneligible && !atCapacity) || waiting.length === 0) return null;

  const oldest = waiting.reduce((a, b) => (a.queuedSince < b.queuedSince ? a : b));
  const oldestMinutes = Math.max(0, Math.round((now - oldest.queuedSince) / 60_000));

  return (
    <div role="alert" className="flex items-center gap-3 rounded-2xl border border-warn-border-dim bg-warn-bg-alt px-5 py-3">
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-amber" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 9v4m0 4h.01M10.3 3.9 2.3 18a1.5 1.5 0 0 0 1.3 2.2h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-14.1a1.5 1.5 0 0 0-2.6 0Z" />
      </svg>
      <p className="text-sm text-ink">
        <b className="font-semibold">No eligible agent</b> —{" "}
        {stateIneligible ? (
          <>
            you&rsquo;re marked {AGENT_STATE_LABEL[state.agentState]}, so {waiting.length} conversation{waiting.length === 1 ? "" : "s"} can&rsquo;t be
            accepted right now. Oldest has waited {oldestMinutes}m. Their place is held — switching back to Available or Busy retries the longest-waiting one automatically.
          </>
        ) : (
          <>
            you&rsquo;re at the {cap}-conversation concurrency cap, so {waiting.length} conversation{waiting.length === 1 ? "" : "s"} can&rsquo;t be accepted right now. Oldest
            has waited {oldestMinutes}m. Their place is held — resolve or release one of your open conversations to free up room.
          </>
        )}
      </p>
    </div>
  );
}

const AGENT_STATE_LABEL: Record<string, string> = {
  wrap_up: "Wrap-up",
  away: "Away",
  break: "On break",
  training: "in Training",
  offline: "Offline",
};
