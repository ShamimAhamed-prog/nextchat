// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/shared/lib/people";
import { activity, nid } from "../helpers";
import { canAcceptWork, type Conversation } from "../types";
import { slaDeadlineFor } from "../queue";
import { OFFER_SECONDS } from "../state";
import { makeNotification } from "../notifications";
import { addNotification, mapConvo, nowLabel, resolveNotifications } from "./shared";
import type { InboxAction, InboxState } from "../state";

type OffersAction = Extract<InboxAction, { type: "ACCEPT" | "DECLINE" | "OFFER_TIMEOUT" | "SIMULATE_INCOMING_OFFER" | "RECORD_ROUTING" }>;

export function offersReducer(state: InboxState, action: OffersAction): InboxState {
  switch (action.type) {
    case "ACCEPT": {
      if (!canAcceptWork(state.agentState)) return state;
      return resolveNotifications(
        mapConvo(
          { ...state, selectedId: action.id },
          action.id,
          (c) => ({
            ...c,
            status: "assigned",
            ownerLeaseActive: true,
            assignee: YOU,
            offerExpiresAt: undefined,
            activity: [...c.activity, activity("Assignment accepted", "AI silenced on this thread", nowLabel())],
          })
        ),
        (n) => n.type === "assignment" && n.conversationId === action.id,
      );
    }
    case "DECLINE":
      return resolveNotifications(
        mapConvo(state, action.id, (c) => ({
          ...c,
          status: "queued",
          offerExpiresAt: undefined,
          // Routed afresh next round rather than inheriting the decision that
          // just picked an agent who said no.
          routingDecision: undefined,
          activity: [...c.activity, activity("Assignment declined", "Returned to queue — age preserved", nowLabel())],
        })),
        (n) => n.type === "assignment" && n.conversationId === action.id,
      );
    case "OFFER_TIMEOUT": {
      const convo = state.conversations.find((c) => c.id === action.id);
      if (!convo || convo.status !== "offered") return state;
      const resolved = resolveNotifications(
        mapConvo(state, action.id, (c) => ({
          ...c,
          status: "queued",
          offerExpiresAt: undefined,
          routingDecision: undefined,
          activity: [...c.activity, activity("Offer timed out", "Returned to queue — age preserved", nowLabel())],
        })),
        (n) => n.type === "assignment" && n.conversationId === action.id,
      );
      // RT-06 / the doc's #6: unanswered within the offer window escalates
      // to whoever else is eligible, rather than silently waiting again.
      return addNotification(
        resolved,
        makeNotification({
          type: "overdue",
          title: `Unanswered — ${convo.customerName}`,
          detail: `${YOU} did not respond within the offer window — needs another agent.`,
          conversationId: convo.id,
          for: "Team",
          team: convo.queueId,
          priority: convo.priority,
          actionLabel: "Pick up",
        }),
      );
    }
    case "SIMULATE_INCOMING_OFFER": {
      // Matches the E5 "Agent state and capacity" table: only AVAILABLE (and
      // BUSY, while capacity remains — not modeled here) actually receives
      // new work. Switching to Away/Break/Offline/Training really does stop
      // new offers, rather than the dropdown being cosmetic.
      const alreadyOffered = state.conversations.some((c) => c.status === "offered");
      if (!canAcceptWork(state.agentState) || alreadyOffered) return state;
      const queuedSince = Date.now();
      const fresh: Conversation = {
        id: nid("c"),
        queuedSince,
        slaDeadline: slaDeadlineFor("P1", queuedSince),
        customerName: "Nusrat Jahan",
        queueId: "q1",
        phone: "+880 1811 223344",
        email: "nusrat.jahan@example.com",
        address: "Uttara, Dhaka",
        passportNid: "NID 1996 3318 5507",
        identityStatus: "pending",
        channel: "WhatsApp",
        route: "DAC → CXB",
        bookingState: "Hold created",
        paymentSummary: undefined,
        language: "Banglish",
        status: "offered",
        priority: "P1",
        escalationReason: "Fare hold expiring",
        summary: "Fare hold running, customer asked to speak to a person about splitting payment across two cards — outside self-service scope.",
        intentTrail: [
          { intent: "flight.book", confidence: 0.91 },
          { intent: "handoff.request", confidence: 1.0 },
        ],
        tags: [],
        transcript: [
          { id: nid("m"), from: "customer", text: "Can I split payment on two cards? kotha bolte chai", time: nowLabel() },
        ],
        activity: [activity("Escalated to queue", "Fare hold expiring — P1", nowLabel())],
        unread: 1,
        lastCustomerAt: Date.now(),
        channelOptIn: true,
        updatedLabel: "just now",
        offerExpiresAt: Date.now() + OFFER_SECONDS * 1000,
        ownerLeaseActive: false,
        aiThinking: false,
      };
      return addNotification(
        { ...state, conversations: [fresh, ...state.conversations] },
        makeNotification({
          type: "assignment",
          title: `New assignment — ${fresh.customerName}`,
          detail: fresh.escalationReason,
          conversationId: fresh.id,
          for: YOU,
          priority: fresh.priority,
          deadline: fresh.offerExpiresAt,
          actionLabel: "Accept",
        }),
      );
    }

    case "RECORD_ROUTING":
      return mapConvo(state, action.id, (c) =>
        c.routingDecision
          ? c
          : {
              ...c,
              routingDecision: action.decision,
              activity: [...c.activity, activity("Routing decision", action.decision.reason, nowLabel())],
            },
      );
    // --- Delivery state (INB-09) ------------------------------------------

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
