// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/lib/people";
import { activity, nid } from "../helpers";
import { BOOKING_ACTION_RESULT } from "../bookingActions";
import { mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type BookingAction = Extract<InboxAction, { type: "OPEN_BOOKING_ACTION" | "CLOSE_BOOKING_ACTION" | "RUN_BOOKING_ACTION" }>;

export function bookingReducer(state: InboxState, action: BookingAction): InboxState {
  switch (action.type) {
    case "OPEN_BOOKING_ACTION":
      return {
        ...state,
        bookingActionTarget: { id: action.id, action: action.action, key: nid("bk") },
      };
    case "CLOSE_BOOKING_ACTION":
      return { ...state, bookingActionTarget: null };
    case "RUN_BOOKING_ACTION": {
      const result = BOOKING_ACTION_RESULT[action.action];
      return mapConvo({ ...state, bookingActionTarget: null }, action.id, (c) => {
        // NFR-04's exactly-once visible effect, at the only layer a
        // prototype can honour it: a replayed key changes nothing.
        if ((c.appliedBookingKeys ?? []).includes(action.key)) return c;
        return {
          ...c,
          bookingState: result.state,
          // A refund unwinds the capture, so the amount stops being
          // refundable and the action stops being offered.
          paidAmountBdt: action.action === "start_refund" ? undefined : c.paidAmountBdt,
          appliedBookingKeys: [...(c.appliedBookingKeys ?? []), action.key],
          transcript: [
            ...c.transcript,
            {
              id: nid("m"),
              from: "system",
              text: action.sandbox ? `${result.system} (sandbox — simulated)` : result.system,
              time: nowLabel(),
            },
          ],
          activity: [
            ...c.activity,
            activity(
              `${result.audit}${action.sandbox ? " (sandbox)" : ""}`,
              `${YOU} · ${c.pnr ?? "no PNR"} · key ${action.key}`,
              nowLabel(),
            ),
          ],
        };
      });
    }

    // --- Supervisor actions (RT-08) ---------------------------------------

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
