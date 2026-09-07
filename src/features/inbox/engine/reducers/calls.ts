// Case bodies for Phase 1 #3's simulated incoming call.

import { YOU } from "@/shared/lib/people";
import { activity, nid } from "../helpers";
import { callDuration, callableConversation } from "../calls";
import { makeNotification } from "../notifications";
import { addNotification, mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type CallsAction = Extract<InboxAction, { type: "SIMULATE_INCOMING_CALL" | "ANSWER_CALL" | "DECLINE_CALL" | "END_CALL" }>;

export function callsReducer(state: InboxState, action: CallsAction): InboxState {
  switch (action.type) {
    case "SIMULATE_INCOMING_CALL": {
      if (state.incomingCall && (state.incomingCall.state === "ringing" || state.incomingCall.state === "connected")) {
        return state;
      }
      const convo = callableConversation(state.conversations);
      if (!convo) return state;
      return {
        ...state,
        incomingCall: {
          conversationId: convo.id,
          customerName: convo.customerName,
          phone: convo.phone,
          channel: convo.channel,
          state: "ringing",
          startedAt: Date.now(),
        },
      };
    }

    case "ANSWER_CALL": {
      if (!state.incomingCall || state.incomingCall.state !== "ringing") return state;
      const call = state.incomingCall;
      return mapConvo(
        { ...state, incomingCall: { ...call, state: "connected", connectedAt: Date.now() }, selectedId: call.conversationId },
        call.conversationId,
        (c) => ({
          ...c,
          transcript: [...c.transcript, { id: nid("m"), from: "system", text: "Call answered", time: nowLabel() }],
          activity: [...c.activity, activity("Call answered", `Incoming call on ${c.channel}`, nowLabel())],
        }),
      );
    }

    case "DECLINE_CALL": {
      if (!state.incomingCall || state.incomingCall.state !== "ringing") return state;
      const call = state.incomingCall;
      const mapped = mapConvo({ ...state, incomingCall: null }, call.conversationId, (c) => ({
        ...c,
        transcript: [...c.transcript, { id: nid("m"), from: "system", text: "Missed call", time: nowLabel() }],
        activity: [...c.activity, activity("Missed call", `Incoming call on ${c.channel} not answered`, nowLabel())],
      }));
      return addNotification(
        mapped,
        makeNotification({
          type: "pending_action",
          title: `Missed call — ${call.customerName}`,
          detail: "Call back when you have a moment.",
          conversationId: call.conversationId,
          for: YOU,
          priority: "P2",
          actionLabel: "View",
        }),
      );
    }

    case "END_CALL": {
      if (!state.incomingCall || state.incomingCall.state !== "connected") return state;
      const call = { ...state.incomingCall, state: "ended" as const, endedAt: Date.now() };
      return mapConvo({ ...state, incomingCall: null }, call.conversationId, (c) => ({
        ...c,
        transcript: [...c.transcript, { id: nid("m"), from: "system", text: `Call ended — ${callDuration(call)}`, time: nowLabel() }],
        activity: [...c.activity, activity("Call ended", callDuration(call), nowLabel())],
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
