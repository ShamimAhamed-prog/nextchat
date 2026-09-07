// Case bodies for the three actions that touch a notification directly.
// Every other notification event (a new offer, a follow-up, a transfer)
// rides on an existing case in another domain reducer — see `offers.ts`,
// `notes.ts` and `lifecycle.ts` — the same way an `activity` entry already
// piggybacks on those cases rather than being dispatched separately.

import { YOU } from "@/shared/lib/people";
import { makeNotification } from "../notifications";
import { addNotification } from "./shared";
import type { InboxAction, InboxState } from "../state";

type NotificationsAction = Extract<InboxAction, { type: "MARK_NOTIFICATION_READ" | "MARK_ALL_NOTIFICATIONS_READ" | "RAISE_SLA_NOTIFICATION" }>;

export function notificationsReducer(state: InboxState, action: NotificationsAction): InboxState {
  switch (action.type) {
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      };

    // Reading is personal — this only ever touches `YOU`'s own notifications,
    // never ones addressed to someone else that happen to be in the same list.
    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.for === YOU ? { ...n, read: true } : n)),
      };

    // Dispatched by `WorkspaceEffects` when a waiting conversation's SLA
    // deadline passes. Guarded so a conversation that has already been
    // notified doesn't get a second open "overdue" record while the first
    // is still unresolved.
    case "RAISE_SLA_NOTIFICATION": {
      const convo = state.conversations.find((c) => c.id === action.id);
      if (!convo) return state;
      const alreadyRaised = state.notifications.some(
        (n) => n.conversationId === action.id && n.type === "overdue" && n.status === "open",
      );
      if (alreadyRaised) return state;
      return addNotification(
        state,
        makeNotification({
          type: "overdue",
          title: `SLA breached — ${convo.customerName}`,
          detail: `Waiting since past its ${convo.priority} deadline — still ${convo.status}.`,
          conversationId: convo.id,
          for: "Team",
          team: convo.queueId,
          priority: convo.priority,
          actionLabel: "Pick up",
        }),
      );
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
