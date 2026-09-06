// Case bodies lifted verbatim from `inboxReducer`'s switch.

import type { InboxAction, InboxState } from "../state";

type IntentsAction = Extract<InboxAction, { type: "SELECT" | "REQUEST_CHANNEL_FILTER" | "CLEAR_CHANNEL_FILTER_INTENT" | "REQUEST_SEARCH" | "CLEAR_SEARCH_INTENT" | "SET_DRAFT" | "REQUEST_VIEW" | "CLEAR_VIEW_INTENT" | "OPEN_KNOWLEDGE" | "CLEAR_KNOWLEDGE_REQUEST" }>;

export function intentsReducer(state: InboxState, action: IntentsAction): InboxState {
  switch (action.type) {
    case "SELECT":
      return { ...state, selectedId: action.id };
    // AG-11: asking for a state that stops new work while conversations are
    // still held parks the change until it is confirmed. Everything else
    // falls straight through to SET_AGENT_STATE.

    case "REQUEST_CHANNEL_FILTER":
      return { ...state, channelFilterIntent: action.channel };
    case "CLEAR_CHANNEL_FILTER_INTENT":
      return state.channelFilterIntent === null ? state : { ...state, channelFilterIntent: null };
    case "REQUEST_SEARCH":
      return { ...state, searchIntent: action.query };
    case "CLEAR_SEARCH_INTENT":
      return state.searchIntent === null ? state : { ...state, searchIntent: null };
    // AG-01: identity is a state an agent changes after checking a document,
    // and every change is audited — it gates money and name changes.

    case "SET_DRAFT":
      return { ...state, drafts: { ...state.drafts, [action.id]: action.text } };
    case "REQUEST_VIEW":
      return { ...state, viewIntent: action.view };
    case "CLEAR_VIEW_INTENT":
      return state.viewIntent === null ? state : { ...state, viewIntent: null };
    case "OPEN_KNOWLEDGE":
      return { ...state, knowledgeRequest: action.articleId };
    case "CLEAR_KNOWLEDGE_REQUEST":
      return state.knowledgeRequest === null ? state : { ...state, knowledgeRequest: null };

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
