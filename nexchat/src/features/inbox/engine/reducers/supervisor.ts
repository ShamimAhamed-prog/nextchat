// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/lib/people";
import { activity } from "../helpers";
import type { ActivityEntry } from "../types";
import { mapConvo, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type SupervisorAction = Extract<InboxAction, { type: "OPEN_MANUAL_ASSIGN" | "CLOSE_MANUAL_ASSIGN" | "CONFIRM_MANUAL_ASSIGN" | "OPEN_QA_REVIEW" | "CLOSE_QA_REVIEW" | "SUBMIT_QA_REVIEW" | "FILE_APPEAL" | "RESOLVE_APPEAL" }>;

export function supervisorReducer(state: InboxState, action: SupervisorAction): InboxState {
  switch (action.type) {
    case "OPEN_MANUAL_ASSIGN":
      return { ...state, manualAssignTargetId: action.id };
    case "CLOSE_MANUAL_ASSIGN":
      return { ...state, manualAssignTargetId: null };
    case "CONFIRM_MANUAL_ASSIGN":
      return mapConvo({ ...state, manualAssignTargetId: null }, action.id, (c) => {
        const priorityChanged = c.priority !== action.priority;
        const entries: ActivityEntry[] = [];
        if (priorityChanged) entries.push(activity("Priority changed by supervisor", `${c.priority} → ${action.priority} — ${action.reason}`, nowLabel()));
        if (action.assignToMe) entries.push(activity("Manually assigned by supervisor", `To ${YOU} — ${action.reason}`, nowLabel()));
        else if (!priorityChanged) entries.push(activity("Supervisor note recorded", action.reason, nowLabel()));
        return {
          ...c,
          priority: action.priority,
          status: action.assignToMe ? "assigned" : c.status,
          assignee: action.assignToMe ? YOU : c.assignee,
          ownerLeaseActive: action.assignToMe ? true : c.ownerLeaseActive,
          offerExpiresAt: action.assignToMe ? undefined : c.offerExpiresAt,
          activity: [...c.activity, ...entries],
        };
      });

    // --- QA sampling (SUP-05/SUP-09) ---------------------------------------
    case "OPEN_QA_REVIEW":
      return { ...state, qaReviewTargetId: action.id };
    case "CLOSE_QA_REVIEW":
      return { ...state, qaReviewTargetId: null };
    case "SUBMIT_QA_REVIEW": {
      const { accuracy, policy, communication, ownership, security } = action.scores;
      const overall = Math.round(((accuracy + policy + communication + ownership + security) / 5) * 10) / 10;
      return mapConvo({ ...state, qaReviewTargetId: null }, action.id, (c) => ({
        ...c,
        qaReview: { reviewer: YOU, rubricVersion: "v3", scores: action.scores, overall, note: action.note },
        activity: [...c.activity, activity("QA reviewed", `Overall ${overall}/5 · rubric v3`, nowLabel())],
      }));
    }
    case "FILE_APPEAL":
      return mapConvo(state, action.id, (c) =>
        c.qaReview
          ? { ...c, qaReview: { ...c.qaReview, appeal: { status: "pending", note: action.note } }, activity: [...c.activity, activity("QA appeal filed", action.note, nowLabel())] }
          : c
      );
    case "RESOLVE_APPEAL":
      return mapConvo(state, action.id, (c) =>
        c.qaReview?.appeal
          ? {
              ...c,
              qaReview: { ...c.qaReview, appeal: { status: action.status, note: action.note } },
              activity: [...c.activity, activity(`QA appeal ${action.status}`, action.note, nowLabel())],
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
