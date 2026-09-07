// Phase 1 #8: entry/exit tracking. One concern, one file, same shape as
// `calls.ts`/`bookingActions.ts` — the type plus the pure helpers that read
// it. This is deliberately separate from `AgentState` (`available`/`busy`/
// `away`/...): that control is about routing eligibility right now,
// this is a clocked, historical record of when the agent was actually at
// work, kept regardless of what their live status says.

export type AttendanceExceptionType = "late_entry" | "early_exit" | "other";

export type AttendanceException = {
  type: AttendanceExceptionType;
  reason: string;
  reportedAt: number;
};

export type AttendanceEntry = {
  id: string;
  clockInAt: number;
  clockOutAt?: number;
  exception?: AttendanceException;
};

export const ATTENDANCE_EXCEPTION_LABEL: Record<AttendanceExceptionType, string> = {
  late_entry: "Late entry",
  early_exit: "Early exit",
  other: "Other",
};

/** The open entry, if the agent is currently clocked in. */
export function openEntry(entries: AttendanceEntry[]): AttendanceEntry | undefined {
  return entries.find((e) => e.clockOutAt === undefined);
}
