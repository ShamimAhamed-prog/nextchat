// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/lib/people";
import { activity } from "../helpers";
import { PII_LABEL } from "../pii";
import { mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type PiiAction = Extract<InboxAction, { type: "OPEN_PII_REVEAL" | "CLOSE_PII_REVEAL" | "REVEAL_PII" | "HIDE_PII" }>;

export function piiReducer(state: InboxState, action: PiiAction): InboxState {
  switch (action.type) {
    case "OPEN_PII_REVEAL":
      return { ...state, piiRevealTarget: { id: action.id, field: action.field } };
    case "CLOSE_PII_REVEAL":
      return { ...state, piiRevealTarget: null };
    case "REVEAL_PII": {
      const already = state.revealedPii[action.id] ?? [];
      const withReveal = {
        ...state,
        piiRevealTarget: null,
        revealedPii: already.includes(action.field)
          ? state.revealedPii
          : { ...state.revealedPii, [action.id]: [...already, action.field] },
      };
      // The audit entry is the requirement, so it is written even when the
      // field was already open — a second look is a second access.
      return mapConvo(withReveal, action.id, (c) => ({
        ...c,
        activity: [
          ...c.activity,
          activity(
            `${PII_LABEL[action.field]} revealed`,
            `${YOU}${action.reason ? ` — ${action.reason}` : ""}`,
            nowLabel(),
          ),
        ],
      }));
    }
    case "HIDE_PII":
      return {
        ...state,
        revealedPii: {
          ...state.revealedPii,
          [action.id]: (state.revealedPii[action.id] ?? []).filter((f) => f !== action.field),
        },
      };

    // --- Booking actions (AG-05) ------------------------------------------

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
