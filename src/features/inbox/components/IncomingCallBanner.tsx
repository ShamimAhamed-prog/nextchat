"use client";

import { useInbox } from "../context/InboxContext";
import { useNow } from "../engine/useCountdown";
import InitialsAvatar from "@/shared/ui/InitialsAvatar";

/**
 * Phase 1 #3, simulated (see `engine/calls.ts`'s doc comment for why this
 * is a call *event* rather than a new messaging channel). A slim banner
 * like `OfferBanner`, not a blocking modal — a call rings alongside
 * whatever the agent is already doing, it doesn't take the workspace over.
 */
export default function IncomingCallBanner() {
  const { state, dispatch } = useInbox();
  const call = state.incomingCall;
  const now = useNow(1000);

  if (!call || call.state === "ended" || call.state === "missed") return null;

  if (call.state === "ringing") {
    return (
      <div role="status" aria-live="assertive" className="flex items-center gap-4 rounded-2xl border border-info-border-alt bg-[linear-gradient(120deg,var(--color-footer)_0%,var(--color-info-bg-alt)_100%)] px-5 py-3.5">
        <InitialsAvatar name={call.customerName} size={38} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold text-ink">Incoming call — {call.customerName}</span>
          <span className="truncate text-xs text-ink-dim">{call.phone} · {call.channel}</span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "DECLINE_CALL" })}
            className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "ANSWER_CALL" })}
            className="h-9 rounded-full bg-info-text-alt px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
          >
            Answer
          </button>
        </div>
      </div>
    );
  }

  // Connected.
  const elapsed = Math.max(0, Math.round((now - (call.connectedAt ?? call.startedAt)) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <div role="status" className="flex items-center gap-4 rounded-2xl border border-info-border-alt bg-[linear-gradient(120deg,var(--color-footer)_0%,var(--color-info-bg-alt)_100%)] px-5 py-3.5">
      <InitialsAvatar name={call.customerName} size={38} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-bold text-ink">On call — {call.customerName}</span>
        <span className="truncate text-xs text-ink-dim">{call.phone} · {call.channel}</span>
      </div>
      <span className="font-[family-name:var(--font-inter)] text-lg font-bold tabular-nums text-info-text-alt">
        {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={() => dispatch({ type: "END_CALL" })}
        className="h-9 shrink-0 rounded-full border border-danger-strong px-4 text-sm font-medium text-danger-strong transition-colors hover:bg-danger-strong/10"
      >
        End call
      </button>
    </div>
  );
}
