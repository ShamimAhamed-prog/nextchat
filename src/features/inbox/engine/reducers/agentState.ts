// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/shared/lib/people";
import { activity } from "../helpers";
import { canAcceptWork } from "../types";
import { heldByAgent, queueSort } from "../queue";
import { OFFER_SECONDS } from "../state";
import { mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type AgentStateAction = Extract<InboxAction, { type: "REQUEST_AGENT_STATE" | "CANCEL_AGENT_STATE" | "CONFIRM_AGENT_STATE" | "UNATTENDED_TIMEOUT" | "SET_AGENT_STATE" }>;

export function agentStateReducer(state: InboxState, action: AgentStateAction): InboxState {
  switch (action.type) {
    case "REQUEST_AGENT_STATE": {
      const held = heldByAgent(state.conversations);
      if (canAcceptWork(action.state) || held.length === 0) {
        return agentStateReducer(state, { type: "SET_AGENT_STATE", state: action.state });
      }
      return { ...state, pendingAgentState: action.state };
    }
    case "CANCEL_AGENT_STATE":
      return { ...state, pendingAgentState: null };
    case "CONFIRM_AGENT_STATE": {
      const cleared: InboxState = { ...state, pendingAgentState: null };
      if (!action.releaseHeld) {
        return agentStateReducer(cleared, { type: "SET_AGENT_STATE", state: action.state });
      }
      // Handing them back now is the tidy version of what the unattended
      // timeout would do later anyway.
      const released: InboxState = {
        ...cleared,
        conversations: cleared.conversations.map((c) =>
          c.status === "assigned" && c.ownerLeaseActive
            ? {
                ...c,
                status: "queued",
                ownerLeaseActive: false,
                assignee: undefined,
                routingDecision: undefined,
                activity: [...c.activity, activity("Released to queue", `${YOU} going ${action.state}`, nowLabel())],
              }
            : c,
        ),
      };
      return agentStateReducer(released, { type: "SET_AGENT_STATE", state: action.state });
    }
    case "UNATTENDED_TIMEOUT":
      return mapConvo(state, action.id, (c) =>
        c.status === "assigned" && c.ownerLeaseActive
          ? {
              ...c,
              status: "queued",
              ownerLeaseActive: false,
              assignee: undefined,
              routingDecision: undefined,
              activity: [
                ...c.activity,
                activity("Reassigned — unattended", `Held by ${YOU} past the tenant's unattended timeout`, nowLabel()),
              ],
            }
          : c,
      );
    case "SET_AGENT_STATE": {
      const becameEligible = !canAcceptWork(state.agentState) && canAcceptWork(action.state);
      const next: InboxState = {
        ...state,
        agentState: action.state,
        // Start (or clear) the unattended clock as eligibility changes.
        unavailableSince: canAcceptWork(action.state)
          ? null
          : (state.unavailableSince ?? Date.now()),
      };
      if (!becameEligible) return next;
      // RT-07: "retry on agent-state change" — if there's queue depth and no
      // offer already in flight, becoming eligible again immediately offers
      // the oldest-waiting item, rather than leaving it stranded until the
      // next unrelated event.
      const alreadyOffered = next.conversations.some((c) => c.status === "offered");
      if (alreadyOffered) return next;
      const oldest = next.conversations.filter((c) => c.status === "queued").sort(queueSort)[0];
      if (!oldest) return next;
      return mapConvo(next, oldest.id, (c) => ({
        ...c,
        status: "offered",
        offerExpiresAt: Date.now() + OFFER_SECONDS * 1000,
        activity: [...c.activity, activity("Re-offered", "Agent became eligible again", nowLabel())],
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
