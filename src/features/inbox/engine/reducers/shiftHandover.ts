// Phase 1 #7: a manual, bulk handover of everything this agent holds — as
// opposed to `CONFIRM_TRANSFER` (`lifecycle.ts`), which moves one
// conversation at a time. `ACKNOWLEDGE_HANDOVER` is the doc's explicit
// "acknowledgment of receipt", made real: it flips the notification a
// handover raised from `open` to `done`, and writes that to the
// conversation's own audit trail.

import { YOU } from "@/shared/lib/people";
import { activity } from "../helpers";
import { heldByAgent } from "../queue";
import { makeNotification } from "../notifications";
import { addNotification, assignToPerson, mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type ShiftHandoverAction = Extract<InboxAction, { type: "OPEN_SHIFT_HANDOVER" | "CLOSE_SHIFT_HANDOVER" | "CONFIRM_SHIFT_HANDOVER" | "ACKNOWLEDGE_HANDOVER" }>;

export function shiftHandoverReducer(state: InboxState, action: ShiftHandoverAction): InboxState {
  switch (action.type) {
    case "OPEN_SHIFT_HANDOVER":
      return { ...state, shiftHandoverOpen: true };
    case "CLOSE_SHIFT_HANDOVER":
      return { ...state, shiftHandoverOpen: false };

    case "CONFIRM_SHIFT_HANDOVER": {
      const held = heldByAgent(state.conversations);
      let next: InboxState = { ...state, shiftHandoverOpen: false };
      for (const c of held) {
        next = assignToPerson(next, c.id, action.to);
        next = mapConvo(next, c.id, (convo) => ({
          ...convo,
          activity: [...convo.activity, activity(`Shift handover to ${action.to}`, action.note, nowLabel())],
        }));
        next = addNotification(
          next,
          makeNotification({
            type: "handover",
            title: `Shift handover from ${YOU} — ${c.customerName}`,
            detail: action.note,
            conversationId: c.id,
            for: action.to,
            priority: c.priority,
            actionLabel: "Acknowledge",
          }),
        );
      }
      return next;
    }

    case "ACKNOWLEDGE_HANDOVER": {
      const n = state.notifications.find((n) => n.id === action.id);
      if (!n || n.status === "done") return state;
      const acked: InboxState = {
        ...state,
        notifications: state.notifications.map((rec) => (rec.id === action.id ? { ...rec, status: "done" } : rec)),
      };
      if (!n.conversationId) return acked;
      return mapConvo(acked, n.conversationId, (c) => ({
        ...c,
        activity: [...c.activity, activity("Handover acknowledged", `Acknowledged by ${YOU}`, nowLabel())],
      }));
    }

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
