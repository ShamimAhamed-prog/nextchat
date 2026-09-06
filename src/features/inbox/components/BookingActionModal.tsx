"use client";

import Modal from "./Modal";
import { useInbox } from "../context/InboxContext";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import { availableBookingActions, type BookingActionId, type Conversation } from "../engine/inboxEngine";

/**
 * AG-05's confirmation step. The offer is re-derived here rather than passed
 * in, so an action that stopped being available between opening this dialog
 * and confirming it (the booking moved on, the tenant lowered its refund
 * ceiling) cannot still be run from a stale button.
 */
export default function BookingActionModal({
  conversation,
  action,
  actionKey,
}: {
  conversation: Conversation;
  action: BookingActionId;
  actionKey: string;
}) {
  const { dispatch } = useInbox();
  const { state: configState } = useTenantConfig();
  const close = () => dispatch({ type: "CLOSE_BOOKING_ACTION" });

  const offer = availableBookingActions(
    conversation,
    configState.published.commercial.refundCeilingBdt,
  ).find((o) => o.id === action);

  if (!offer) {
    return (
      <Modal titleId="booking-action-title" onClose={close}>
        <h2 id="booking-action-title" className="text-lg font-bold text-ink">
          No longer available
        </h2>
        <p className="mt-2 text-sm text-ink-dim">
          This booking has moved on since you opened it. Close and take another
          look at its current state.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={close}
            className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titleId="booking-action-title" onClose={close}>
      <h2 id="booking-action-title" className="text-lg font-bold text-ink">
        {offer.label}
      </h2>
      <p className="mt-1 text-sm text-ink-dim">
        {conversation.customerName} · {conversation.pnr ?? "no PNR"}
        {conversation.route ? ` · ${conversation.route}` : ""}
      </p>

      <p className="mt-4 text-sm leading-relaxed text-ink">{offer.detail}</p>

      {configState.published.brand.sandboxMode && (
        <p className="mt-4 rounded-lg border border-violet-border-strong bg-violet-bg-alt p-3 text-sm leading-relaxed text-violet-text-alt">
          Sandbox mode — this is simulated. No ticket is issued and no money
          moves.
        </p>
      )}

      {offer.blocked ? (
        <p className="mt-4 rounded-lg border border-warn-border-soft bg-warn-bg-soft p-3 text-sm leading-relaxed text-amber">
          {offer.blocked}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={Boolean(offer.blocked)}
          onClick={() =>
            dispatch({
              type: "RUN_BOOKING_ACTION",
              id: conversation.id,
              action,
              key: actionKey,
              sandbox: configState.published.brand.sandboxMode,
            })
          }
          className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {offer.blocked ? "Needs approval" : offer.label}
        </button>
      </div>
    </Modal>
  );
}
