"use client";

import InitialsAvatar from "../InitialsAvatar";
import { useInbox } from "./InboxContext";
import { useNow } from "./useCountdown";
import { slaBadge, type DisruptionRecord } from "./inboxEngine";
import { formatSlaBadge, useUiLocale } from "../UiLocale";

/**
 * §B5 "Disruption is a surge, not a queue": affected passengers are grouped
 * under an open record, ordered by consequence (airport presence, then how
 * soon they travel) rather than arrival order, and only the ones who need a
 * decision are queued at all — the rest are already answered from the
 * record itself. This renders as its own section rather than folding into
 * `TicketList`, because mixing a surge into the everyday queue is exactly
 * what the PRD says not to do.
 *
 * More than one can be open at once (`DISRUPTION_SCENARIOS` in
 * `inboxEngine.ts`) — a fog cancellation and a mechanical delay running
 * concurrently is a realistic ops day, not an edge case, so this renders one
 * card per open record rather than assuming there's ever only one.
 */
export default function DisruptionCohort() {
  const { state } = useInbox();
  if (state.disruptions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {state.disruptions.map((d) => (
        <DisruptionCard key={d.id} disruption={d} />
      ))}
    </div>
  );
}

function DisruptionCard({ disruption }: { disruption: DisruptionRecord }) {
  const { state, dispatch } = useInbox();
  const { t } = useUiLocale();
  const now = useNow();

  const cohort = state.conversations
    .filter((c) => c.disruptionId === disruption.id)
    .sort((a, b) => (a.urgencyRank ?? 0) - (b.urgencyRank ?? 0));
  const needDecision = cohort.filter((c) => c.status === "queued").length;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-danger-border-soft bg-[linear-gradient(120deg,var(--color-danger-bg-soft)_0%,var(--color-danger-bg)_100%)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-coral" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M10.3 3.9 2.3 18a1.5 1.5 0 0 0 1.3 2.2h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-14.1a1.5 1.5 0 0 0-2.6 0ZM12 9v4m0 4h.01" />
          </svg>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-ink">
              Disruption open — {disruption.route} · {disruption.reason}
            </span>
            <span className="text-xs text-ink-dim">
              {cohort.length} passengers notified proactively · {needDecision} need a decision
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "CLOSE_DISRUPTION", id: disruption.id })}
          title={needDecision > 0 ? `${needDecision} still need a decision — closing returns them to the normal queue, not out of view` : undefined}
          className="h-8 shrink-0 rounded-full border border-line px-3 text-xs font-medium text-ink transition-colors hover:border-ink-dim"
        >
          Close record
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {cohort.map((c) => {
          const sla = slaBadge(c, now);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => dispatch({ type: "SELECT", id: c.id })}
                aria-current={c.id === state.selectedId || undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  c.id === state.selectedId ? "bg-danger-bg-soft" : "hover:bg-danger-bg-soft/60"
                }`}
              >
                <InitialsAvatar name={c.customerName} size={26} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.customerName}</span>
                <span className="shrink-0 text-xs text-amber">{c.urgencyLabel}</span>
                {sla && (
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 font-[family-name:var(--font-inter)] text-[10px] font-semibold tabular-nums uppercase tracking-wide"
                    style={{ borderColor: sla.color, color: sla.color }}
                    title="This SLA clock belongs to the active disruption cohort, not the everyday queue."
                  >
                    Surge · {formatSlaBadge(sla, t)}
                  </span>
                )}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    c.status === "resolved" ? "bg-ok-bg-soft text-ok-bright" : "bg-panel text-ink"
                  }`}
                >
                  {c.status === "resolved" ? "Answered" : "Needs decision"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
