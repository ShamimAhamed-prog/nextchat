// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import { fmtBdtCode } from "@/lib/format";
import type { BookingState, Conversation } from "./types";

/* --- Booking actions (AG-05) --------------------------------------------
 *
 * The bot can hold, pay, ticket and resend; before this the human it escalates
 * to could only type. These are the same four operations, reached from the
 * workspace, and deliberately expressed as *state transitions on the booking*
 * rather than free-form buttons: what an agent may do is derived from the
 * booking state and the tenant's commercial config, exactly as the bot's own
 * flow in `widget/engine.ts` is driven by its `Phase`.
 *
 * Each one carries an idempotency key, is confirmed before it runs, and
 * writes both a system message into the transcript (so the customer-visible
 * record matches) and an activity entry (so the audit does).
 */
export type BookingActionId = "retry_ticketing" | "resend_ticket" | "rebook_hold" | "start_refund";

export type BookingActionOffer = {
  id: BookingActionId;
  label: string;
  /** What the agent is about to do, in the confirmation step. */
  detail: string;
  /** Set when the action exists for this booking but the agent may not run
   *  it — shown instead of the button, never as a silent omission. */
  blocked?: string;
};

const BOOKING_ACTION_LABEL: Record<BookingActionId, string> = {
  retry_ticketing: "Retry ticketing",
  resend_ticket: "Resend ticket",
  rebook_hold: "Rebook at current fare",
  start_refund: "Start refund",
};

/**
 * `refundCeilingBdt` is the tenant's own published limit. Above it the agent
 * does not get a blocked button and a shrug — the action is still offered,
 * but as something that needs the second approver ADM-03 already models.
 */
export function availableBookingActions(
  convo: Conversation,
  refundCeilingBdt: number,
): BookingActionOffer[] {
  const offers: BookingActionOffer[] = [];
  const paid = convo.paidAmountBdt;

  if (convo.bookingState === "Ticketing failed" || convo.bookingState === "Paid") {
    offers.push({
      id: "retry_ticketing",
      label: BOOKING_ACTION_LABEL.retry_ticketing,
      detail: `Re-issue against ${convo.pnr ?? "this booking"} using the payment already captured. Safe to run more than once — the same idempotency key can only ticket once.`,
    });
  }

  if (convo.bookingState === "Ticketed") {
    offers.push({
      id: "resend_ticket",
      label: BOOKING_ACTION_LABEL.resend_ticket,
      detail: `Send the e-ticket for ${convo.pnr ?? "this booking"} to the customer again, in this thread.`,
    });
  }

  if (convo.bookingState === "Hold created" || convo.bookingState === "Awaiting payment") {
    offers.push({
      id: "rebook_hold",
      label: BOOKING_ACTION_LABEL.rebook_hold,
      detail: "Take a fresh hold at the fare available now. The customer is told the new price before anything is charged.",
    });
  }

  if (paid !== undefined && (convo.bookingState === "Ticketed" || convo.bookingState === "Paid" || convo.bookingState === "Ticketing failed")) {
    const overCeiling = paid > refundCeilingBdt;
    offers.push({
      id: "start_refund",
      label: BOOKING_ACTION_LABEL.start_refund,
      detail: `Return ${fmtBdtCode(paid)} to the rail it came from.`,
      blocked: overCeiling
        ? `${fmtBdtCode(paid)} is above this tenant's ${fmtBdtCode(refundCeilingBdt)} refund ceiling — needs a second approver before it can run.`
        : undefined,
    });
  }

  return offers;
}

/** The booking state each action leaves behind when it succeeds. */
export const BOOKING_ACTION_RESULT: Record<BookingActionId, { state: BookingState; system: string; audit: string }> = {
  retry_ticketing: { state: "Ticketed", system: "Ticket issued — e-ticket sent", audit: "Ticketing retried by agent" },
  resend_ticket: { state: "Ticketed", system: "E-ticket sent again", audit: "Ticket resent by agent" },
  rebook_hold: { state: "Hold created", system: "New fare held — awaiting the customer's confirmation", audit: "Rebooked at current fare by agent" },
  start_refund: { state: "No active booking", system: "Refund started — 3-5 working days to the original payment method", audit: "Refund started by agent" },
};

/**
 * SUP-03's KPI drill-down, made real for the one card that has a genuine
 * live equivalent: §D2's "paid, not ticketed" critical alarm is exactly
 * `escalationReason` on Tanvir Rahman's seeded P0 conversation, not just a
 * label — see `SLA_MINUTES`'s comment above for the other place this same
 * alarm already grounds a real number. `StatsRow` reads this instead of a
 * fixed "0" so the count (and whether it's still open) tracks live state.
 */
export function paidNotTicketedOpen(conversations: Conversation[]): Conversation[] {
  return conversations.filter((c) => c.escalationReason === "Paid, not ticketed" && c.status !== "resolved");
}
