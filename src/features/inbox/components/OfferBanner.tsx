"use client";

import { useInbox } from "../context/InboxContext";
import { useCountdown } from "../engine/useCountdown";
import { canAcceptWork } from "../engine/inboxEngine";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import { totalMaxConcurrency } from "@/features/admin/engine/tenantConfigEngine";
import InitialsAvatar from "@/shared/ui/InitialsAvatar";

const PRIORITY_COLOR: Record<string, string> = { P0: "var(--color-danger-strong)", P1: "var(--color-warn-strong)", P2: "var(--color-state-busy)", P3: "var(--color-ink-dim)" };

/**
 * A real agent desk surfaces a new offer as an alert, not something you
 * only discover by happening to click into the ticket list — RT-04's 30s
 * accept window is meaningless if nobody notices it started.
 */
export default function OfferBanner() {
  const { state } = useInbox();
  const offered = state.conversations.find((c) => c.status === "offered");

  if (!offered) return null;

  return <OfferBannerInner id={offered.id} name={offered.customerName} priority={offered.priority} reason={offered.escalationReason} expiresAt={offered.offerExpiresAt} />;
}

function OfferBannerInner({
  id,
  name,
  priority,
  reason,
  expiresAt,
}: {
  id: string;
  name: string;
  priority: string;
  reason: string;
  expiresAt?: number;
}) {
  const { state, dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const remaining = useCountdown(expiresAt, () => dispatch({ type: "OFFER_TIMEOUT", id }));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const assignedCount = state.conversations.filter((c) => c.status === "assigned").length;
  const atCapacity = assignedCount >= totalMaxConcurrency(tenantState.published);
  const eligible = canAcceptWork(state.agentState) && !atCapacity;

  return (
    <div role="status" aria-live="assertive" className="flex flex-col gap-1.5 rounded-2xl border border-coral/50 bg-[linear-gradient(120deg,var(--color-footer)_0%,var(--color-danger-bg-soft)_100%)] px-5 py-3.5">
      <div className="flex items-center gap-4">
        <InitialsAvatar name={name} size={38} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-ink">New assignment — {name}</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-on-accent" style={{ background: PRIORITY_COLOR[priority] }}>
              {priority}
            </span>
          </div>
          <span className="truncate text-xs text-ink-dim">{reason}</span>
        </div>
        <span className="font-[family-name:var(--font-inter)] text-lg font-bold tabular-nums text-coral">
          {mm}:{ss}
        </span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "DECLINE", id })}
            className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "ACCEPT", id })}
            disabled={!eligible}
            className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Accept
          </button>
        </div>
      </div>
      {!eligible && (
        <span className="pl-[54px] text-xs text-amber">
          {atCapacity
            ? `At your ${totalMaxConcurrency(tenantState.published)}-conversation concurrency cap — resolve or release one first.`
            : "You changed your status after this offer arrived — update it to accept."}
        </span>
      )}
    </div>
  );
}
