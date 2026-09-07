// Phase 1 #8: entry/exit tracking. `REPORT_ATTENDANCE_EXCEPTION` notifies
// the manager *and* every other name in the roster — at this prototype's
// small, illustrative cast, "relevant teammates" is everyone else, so this
// is one notification per person rather than a broadcast primitive that
// doesn't exist anywhere else in this engine.

import { nid } from "../helpers";
import { ALL_PEOPLE, MANAGER, YOU } from "@/shared/lib/people";
import { openEntry, ATTENDANCE_EXCEPTION_LABEL } from "../attendance";
import { makeNotification } from "../notifications";
import type { InboxAction, InboxState } from "../state";

type AttendanceAction = Extract<InboxAction, { type: "CLOCK_IN" | "CLOCK_OUT" | "REPORT_ATTENDANCE_EXCEPTION" }>;

export function attendanceReducer(state: InboxState, action: AttendanceAction): InboxState {
  switch (action.type) {
    case "CLOCK_IN": {
      if (openEntry(state.attendance)) return state;
      return {
        ...state,
        attendance: [...state.attendance, { id: nid("att"), clockInAt: Date.now() }],
      };
    }

    case "CLOCK_OUT": {
      const open = openEntry(state.attendance);
      if (!open) return state;
      return {
        ...state,
        attendance: state.attendance.map((e) => (e.id === open.id ? { ...e, clockOutAt: Date.now() } : e)),
      };
    }

    case "REPORT_ATTENDANCE_EXCEPTION": {
      const open = openEntry(state.attendance);
      if (!open) return state;
      const exception = { type: action.exceptionType, reason: action.reason, reportedAt: Date.now() };
      const withException: InboxState = {
        ...state,
        attendance: state.attendance.map((e) => (e.id === open.id ? { ...e, exception } : e)),
      };
      const recipients = [MANAGER, ...ALL_PEOPLE.filter((p) => p !== YOU)];
      return {
        ...withException,
        notifications: [
          ...withException.notifications,
          ...recipients.map((person) =>
            makeNotification({
              type: "pending_action",
              title: `Attendance exception — ${YOU}`,
              detail: `${ATTENDANCE_EXCEPTION_LABEL[action.exceptionType]}: ${action.reason}`,
              for: person,
              priority: "P3",
              actionLabel: "Acknowledge",
            }),
          ),
        ],
      };
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
