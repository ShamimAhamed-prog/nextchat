// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/lib/people";
import { activity } from "../helpers";
import { slaDeadlineFor } from "../queue";
import { routeReopen } from "../reopen";
import { OFFER_SECONDS } from "../state";
import { mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type LifecycleAction = Extract<InboxAction, { type: "RELEASE" | "OPEN_TRANSFER" | "CLOSE_TRANSFER" | "CONFIRM_TRANSFER" | "OPEN_RESOLVE" | "CLOSE_RESOLVE" | "CONFIRM_RESOLVE" | "REOPEN" | "OPEN_SNOOZE" | "CLOSE_SNOOZE" | "CONFIRM_SNOOZE" | "SNOOZE_WOKE" }>;

export function lifecycleReducer(state: InboxState, action: LifecycleAction): InboxState {
  switch (action.type) {
    case "RELEASE":
      return mapConvo(state, action.id, (c) => ({
        ...c,
        ownerLeaseActive: false,
        status: "queued",
        assignee: undefined,
        routingDecision: undefined,
        activity: [...c.activity, activity("Released to AI", "Automated replies resume on this thread", nowLabel())],
      }));
    case "OPEN_TRANSFER":
      return { ...state, transferTargetId: action.id };
    case "CLOSE_TRANSFER":
      return { ...state, transferTargetId: null };
    case "CONFIRM_TRANSFER":
      return mapConvo(
        { ...state, transferTargetId: null, selectedId: state.conversations.length > 1 ? state.conversations.find((c) => c.id !== action.id)?.id ?? state.selectedId : state.selectedId },
        action.id,
        (c) => ({
          ...c,
          status: "queued",
          ownerLeaseActive: false,
          activity: [...c.activity, activity(`Transferred to ${action.destination}`, action.reason, nowLabel())],
        })
      );
    case "OPEN_RESOLVE":
      return { ...state, resolveTargetId: action.id };
    case "CLOSE_RESOLVE":
      return { ...state, resolveTargetId: null };
    case "CONFIRM_RESOLVE":
      return mapConvo({ ...state, resolveTargetId: null }, action.id, (c) => ({
        ...c,
        status: "resolved",
        ownerLeaseActive: false,
        resolvedAt: Date.now(),
        lastAgent: YOU,
        resolution: { category: action.category, reference: action.reference },
        activity: [...c.activity, activity("Resolved", `${action.category}${action.reference ? ` · ${action.reference}` : ""}`, nowLabel())],
      }));
    // AG-10 / RT-05. The window check lives in the component, which has the
    // tenant config; the reducer owns the routing decision and its audit.
    case "REOPEN": {
      const convo = state.conversations.find((c) => c.id === action.id);
      if (!convo || convo.status !== "resolved") return state;
      const now = Date.now();
      const routing = routeReopen(convo, state.conversations, state.agentState, now);
      return mapConvo(state, action.id, (c) => ({
        ...c,
        status: routing.toPreviousAgent ? "offered" : "queued",
        offerExpiresAt: routing.toPreviousAgent ? now + OFFER_SECONDS * 1000 : undefined,
        ownerLeaseActive: false,
        resolvedAt: undefined,
        // A reopened case starts its SLA clock again — it is new work — but
        // the original resolution stays on the record.
        queuedSince: now,
        slaDeadline: slaDeadlineFor(c.priority, now),
        activity: [
          ...c.activity,
          activity("Reopened", routing.reason, nowLabel()),
        ],
      }));
    }
    // RT-10. Computed by `WorkspaceEffects`, which has the tenant config the
    // reducer deliberately does not — recorded here so it lands on the
    // conversation and in the audit trail together.

    case "OPEN_SNOOZE":
      return { ...state, snoozeTargetId: action.id };
    case "CLOSE_SNOOZE":
      return { ...state, snoozeTargetId: null };
    case "CONFIRM_SNOOZE":
      return mapConvo({ ...state, snoozeTargetId: null }, action.id, (c) => ({
        ...c,
        status: "snoozed",
        snoozeUntil: Date.now() + action.minutes * 60_000,
        snoozeReason: action.reason,
        snoozeOwner: action.owner,
        activity: [
          ...c.activity,
          activity("Snoozed", `${action.reason} · ${action.owner} · wakes in ${action.minutes}m`, nowLabel()),
        ],
      }));
    case "SNOOZE_WOKE":
      return mapConvo(state, action.id, (c) =>
        c.status === "snoozed"
          ? {
              ...c,
              status: "assigned",
              ownerLeaseActive: true,
              snoozeUntil: undefined,
              activity: [
                ...c.activity,
                activity(
                  `Snooze woke — ${c.snoozeOwner ?? YOU} alerted`,
                  c.snoozeReason ?? "",
                  nowLabel(),
                ),
              ],
            }
          : c
      );

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
