// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/lib/people";
import { activity } from "../helpers";
import { mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type ConversationAction = Extract<InboxAction, { type: "SET_IDENTITY" | "TOGGLE_PIN" | "ADD_TAG" }>;

export function conversationReducer(state: InboxState, action: ConversationAction): InboxState {
  switch (action.type) {
    case "SET_IDENTITY":
      return mapConvo(state, action.id, (c) =>
        c.identityStatus === action.status
          ? c
          : {
              ...c,
              identityStatus: action.status,
              activity: [
                ...c.activity,
                activity("Identity status changed", `${c.identityStatus} → ${action.status} · ${YOU}`, nowLabel()),
              ],
            },
      );

    // RT-08: pinning is a supervisor action, so it takes a reason like the
    // rest of them.
    case "TOGGLE_PIN":
      return mapConvo(state, action.id, (c) => ({
        ...c,
        pinned: c.pinned ? undefined : { by: YOU, reason: action.reason },
        activity: [
          ...c.activity,
          activity(c.pinned ? "Unpinned by supervisor" : "Pinned by supervisor", action.reason, nowLabel()),
        ],
      }));

    // --- Internal collaboration (INB-08) ----------------------------------

    case "ADD_TAG":
      return mapConvo(state, action.id, (c) => (c.tags.includes(action.tag) ? c : { ...c, tags: [...c.tags, action.tag] }));

    // --- Protected data (AG-06) -------------------------------------------

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
