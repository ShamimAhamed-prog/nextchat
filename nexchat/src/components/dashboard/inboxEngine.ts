// Conversation engine for the agent workspace — TODO.md "P1: Agent
// workspace." Pure `useReducer` state machine, same discipline as
// `widget/engine.ts`: no side effects inside the reducer, real-world delays
// (AI "thinking," a new offer arriving) are timers owned by the components
// that dispatch into it.
//
// This file is now the routing table and nothing else. What used to be here:
//
//  - the pure functions answering questions about a conversation, which are
//    under `inbox/`, one requirement per file (see `inbox/README.md`);
//  - `InboxState` and `InboxAction`, in `inbox/state.ts`, so a domain
//    reducer can name what it operates on without importing this module,
//    which imports it;
//  - 637 lines of `switch`, in `inbox/reducers/`, grouped by domain.
//
// The switch below routes each action to its domain. Listing the action
// types twice — here and in the domain's own `Extract<>` union — is not
// duplication that can drift: both ends are exhaustiveness-checked against
// `InboxAction`, so a mismatch is a compile error. That is a guarantee the
// single switch never had, its `default` having quietly returned `state`
// for anything unhandled.
//
// Every name is re-exported. The twenty-odd components importing from this
// module did not change and should not have to know where a function went.

import type { InboxAction, InboxState } from "./inbox/state";
import { agentStateReducer } from "./inbox/reducers/agentState";
import { offersReducer } from "./inbox/reducers/offers";
import { disruptionReducer } from "./inbox/reducers/disruption";
import { intentsReducer } from "./inbox/reducers/intents";
import { conversationReducer } from "./inbox/reducers/conversation";
import { notesReducer } from "./inbox/reducers/notes";
import { messagingReducer } from "./inbox/reducers/messaging";
import { lifecycleReducer } from "./inbox/reducers/lifecycle";
import { piiReducer } from "./inbox/reducers/pii";
import { bookingReducer } from "./inbox/reducers/booking";
import { supervisorReducer } from "./inbox/reducers/supervisor";

export * from "./inbox/types";
export * from "./inbox/queue";
export * from "./inbox/pii";
export * from "./inbox/channels";
export * from "./inbox/reopen";
export * from "./inbox/views";
export * from "./inbox/search";
export * from "./inbox/bookingActions";
export * from "./inbox/state";
export { draftFor, parseMentions } from "./inbox/reducers/shared";
export { DISRUPTION_SCENARIO_COUNT } from "./inbox/reducers/disruption";

export function inboxReducer(state: InboxState, action: InboxAction): InboxState {
  switch (action.type) {
    case "REQUEST_AGENT_STATE":
    case "CANCEL_AGENT_STATE":
    case "CONFIRM_AGENT_STATE":
    case "UNATTENDED_TIMEOUT":
    case "SET_AGENT_STATE":
      return agentStateReducer(state, action);

    case "ACCEPT":
    case "DECLINE":
    case "OFFER_TIMEOUT":
    case "SIMULATE_INCOMING_OFFER":
    case "RECORD_ROUTING":
      return offersReducer(state, action);

    case "SIMULATE_DISRUPTION":
    case "CLOSE_DISRUPTION":
      return disruptionReducer(state, action);

    case "SELECT":
    case "REQUEST_CHANNEL_FILTER":
    case "CLEAR_CHANNEL_FILTER_INTENT":
    case "REQUEST_SEARCH":
    case "CLEAR_SEARCH_INTENT":
    case "SET_DRAFT":
    case "REQUEST_VIEW":
    case "CLEAR_VIEW_INTENT":
    case "OPEN_KNOWLEDGE":
    case "CLEAR_KNOWLEDGE_REQUEST":
      return intentsReducer(state, action);

    case "SET_IDENTITY":
    case "TOGGLE_PIN":
    case "ADD_TAG":
      return conversationReducer(state, action);

    case "ADD_NOTE":
    case "ADD_TASK":
    case "TOGGLE_TASK":
      return notesReducer(state, action);

    case "SEND_MESSAGE":
    case "REQUEST_AI_DRAFT":
    case "RESOLVE_AI_DRAFT":
    case "EDIT_AI_DRAFT":
    case "DISCARD_AI_DRAFT":
    case "ADVANCE_DELIVERY":
    case "FAIL_DELIVERY":
    case "RETRY_SEND":
      return messagingReducer(state, action);

    case "RELEASE":
    case "OPEN_TRANSFER":
    case "CLOSE_TRANSFER":
    case "CONFIRM_TRANSFER":
    case "OPEN_RESOLVE":
    case "CLOSE_RESOLVE":
    case "CONFIRM_RESOLVE":
    case "REOPEN":
    case "OPEN_SNOOZE":
    case "CLOSE_SNOOZE":
    case "CONFIRM_SNOOZE":
    case "SNOOZE_WOKE":
      return lifecycleReducer(state, action);

    case "OPEN_PII_REVEAL":
    case "CLOSE_PII_REVEAL":
    case "REVEAL_PII":
    case "HIDE_PII":
      return piiReducer(state, action);

    case "OPEN_BOOKING_ACTION":
    case "CLOSE_BOOKING_ACTION":
    case "RUN_BOOKING_ACTION":
      return bookingReducer(state, action);

    case "OPEN_MANUAL_ASSIGN":
    case "CLOSE_MANUAL_ASSIGN":
    case "CONFIRM_MANUAL_ASSIGN":
    case "OPEN_QA_REVIEW":
    case "CLOSE_QA_REVIEW":
    case "SUBMIT_QA_REVIEW":
    case "FILE_APPEAL":
    case "RESOLVE_APPEAL":
      return supervisorReducer(state, action);

    default: {
      // Every member of `InboxAction` is routed above, so this is
      // unreachable and `action` has narrowed to `never`. Adding an action
      // without giving it a home fails here rather than silently no-opping.
      const unrouted: never = action;
      return unrouted;
    }
  }
}
