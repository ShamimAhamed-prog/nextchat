"use client";

import { useEffect, useRef, useState } from "react";
import { useInbox } from "../context/InboxContext";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { ATTENDANCE_EXCEPTION_LABEL, openEntry, type AttendanceExceptionType } from "../engine/inboxEngine";

const EXCEPTION_TYPES = Object.keys(ATTENDANCE_EXCEPTION_LABEL) as AttendanceExceptionType[];

/**
 * Phase 1 #8: a clock-in/out toggle plus exception reporting, in one
 * dropdown off the header — the same trigger+popover shape as the agent-
 * state dropdown next to it in `DashboardHeader.tsx`. Reporting an
 * exception is what raises the notifications to `MANAGER` and the rest of
 * the roster (`reducers/attendance.ts`); this component only ever reads
 * `state.attendance`, the clocked-in history, for its own small read-only
 * summary — a dedicated history page is out of scope for this pass.
 */
export default function AttendanceControl() {
  const { state, dispatch } = useInbox();
  const { t } = useUiLocale();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [exceptionType, setExceptionType] = useState<AttendanceExceptionType>("late_entry");
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = openEntry(state.attendance);
  const clockedIn = Boolean(current);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title={clockedIn ? t("Clocked in") : t("Clocked out")}
        className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors ${
          clockedIn ? "border-ok-strong text-ok-strong" : "border-line text-ink-dim hover:text-ink"
        }`}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: clockedIn ? "var(--color-ok-strong)" : "var(--color-ink-dim)" }} />
        {clockedIn ? t("Clocked in") : t("Clocked out")}
      </button>

      {open && (
        <div className="card-hairline absolute right-0 top-11 z-20 flex w-72 flex-col gap-3 rounded-lg bg-page p-3 shadow-pop">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{t("Attendance")}</span>
            <button
              type="button"
              onClick={() => dispatch({ type: clockedIn ? "CLOCK_OUT" : "CLOCK_IN" })}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral"
            >
              {clockedIn ? t("Clock out") : t("Clock in")}
            </button>
          </div>

          {current && (
            <p className="text-xs text-ink-dim">
              {t("Clocked in at")} {new Date(current.clockInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {current?.exception && (
            <p className="rounded-md border border-warn-border-soft bg-warn-bg-soft px-2.5 py-1.5 text-[11px] text-amber">
              {t(ATTENDANCE_EXCEPTION_LABEL[current.exception.type])}: {current.exception.reason}
            </p>
          )}

          {!clockedIn && (
            <p className="text-xs text-ink-dim">{t("Clock in to report an exception.")}</p>
          )}

          {clockedIn && !reporting && (
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="self-start text-xs text-ink-dim underline decoration-dotted underline-offset-2 transition-colors hover:text-coral"
            >
              {t("Report an exception")}
            </button>
          )}

          {clockedIn && reporting && (
            <form
              className="flex flex-col gap-2 rounded-lg bg-footer p-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reason.trim()) return;
                dispatch({ type: "REPORT_ATTENDANCE_EXCEPTION", exceptionType, reason: reason.trim() });
                setReason("");
                setReporting(false);
              }}
            >
              <select
                value={exceptionType}
                onChange={(e) => setExceptionType(e.target.value as AttendanceExceptionType)}
                className="h-8 rounded-lg border border-line bg-card px-2 text-xs text-ink focus:border-coral focus:outline-none"
              >
                {EXCEPTION_TYPES.map((k) => (
                  <option key={k} value={k} className="bg-footer">
                    {t(ATTENDANCE_EXCEPTION_LABEL[k])}
                  </option>
                ))}
              </select>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder={t("What happened, briefly")}
                className="resize-none rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReporting(false)} className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:border-ink-dim">
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!reason.trim()}
                  className="rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-2.5 py-1 text-[11px] font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {t("Notify")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
