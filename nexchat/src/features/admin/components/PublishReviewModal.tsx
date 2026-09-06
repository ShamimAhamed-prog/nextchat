"use client";

import { useState } from "react";
import Modal from "@/features/inbox/components/Modal";
import { useTenantConfig } from "../context/TenantConfigContext";
import { diffDraft, validateConfig } from "../engine/tenantConfigEngine";

function formatValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

// A datetime-local input's value has no timezone — treat it as local time,
// same as the input itself displays.
function toEpoch(datetimeLocal: string): number | undefined {
  if (!datetimeLocal) return undefined;
  const ms = new Date(datetimeLocal).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/**
 * ADM-04: "Validate configuration before publish, show the affected
 * queues/channels, support scheduled activation and retain one-click
 * rollback." All four are real: validation blocks publish with real
 * errors, every changed field is shown before it goes anywhere, sensitive
 * fields are visibly routed to approval rather than silently published,
 * and a non-sensitive batch can be scheduled for a future time instead of
 * applying immediately — see `TenantConfigEffects.tsx` for the watchdog
 * that actually applies it when the time comes.
 */
export default function PublishReviewModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const [note, setNote] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [scheduleValue, setScheduleValue] = useState(defaultScheduleValue);
  // A snapshot, not a live clock — "is this in the future" only needs to be
  // right relative to when the modal opened, and reading `Date.now()`
  // directly during render is an impure-render footgun (`react-hooks/purity`).
  const [openedAt] = useState(() => Date.now());
  const diffs = diffDraft(state.published, state.draft, state.scheduled);
  const newDiffs = diffs.filter((d) => !d.scheduledFor);
  const errors = validateConfig(state.draft);
  const sensitiveCount = newDiffs.filter((d) => d.sensitive).length;
  const directCount = newDiffs.length - sensitiveCount;
  const canSchedule = sensitiveCount === 0;
  const scheduleFor = when === "later" ? toEpoch(scheduleValue) : undefined;
  const scheduleInFuture = scheduleFor !== undefined && scheduleFor > openedAt;
  const canSubmit = errors.length === 0 && note.trim().length > 0 && (when === "now" || scheduleInFuture);

  return (
    <Modal titleId="publish-review-title" onClose={onClose}>
      <h2 id="publish-review-title" className="text-lg font-bold text-ink">
        Review changes
      </h2>
      <p className="mt-1 text-sm text-ink-dim">
        {directCount} publish{directCount === 1 ? "es" : ""} {when === "later" ? "at the scheduled time" : "immediately"}
        {sensitiveCount > 0 && `, ${sensitiveCount} need${sensitiveCount === 1 ? "s" : ""} a second approver`}
      </p>

      <div className="mt-4 flex max-h-[320px] flex-col gap-2 overflow-y-auto">
        {diffs.map((d) => (
          <div key={d.path} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{d.label}</p>
              <p className="truncate text-xs text-ink-dim">
                {formatValue(d.before)} → <span className="text-ink">{formatValue(d.after)}</span>
              </p>
            </div>
            {d.scheduledFor ? (
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-ink-dim">
                Scheduled for {new Date(d.scheduledFor).toLocaleString()}
              </span>
            ) : (
              d.sensitive && <span className="shrink-0 rounded-full border border-amber/50 px-2 py-0.5 text-[10px] font-semibold text-amber">Needs approval</span>
            )}
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="mt-4 flex flex-col gap-1 rounded-lg border border-coral/50 bg-coral/10 px-3 py-2">
          {errors.map((e) => (
            <p key={e} className="text-xs text-coral">
              {e}
            </p>
          ))}
        </div>
      )}

      {newDiffs.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-sm text-ink">When should this apply?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWhen("now")}
              className={`h-9 flex-1 rounded-full border text-sm font-medium transition-colors ${when === "now" ? "border-coral bg-coral/10 text-coral" : "border-line text-ink hover:border-ink-dim"}`}
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => canSchedule && setWhen("later")}
              disabled={!canSchedule}
              title={canSchedule ? undefined : "A batch with a sensitive field can't be scheduled — it needs approval first"}
              className={`h-9 flex-1 rounded-full border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${when === "later" ? "border-coral bg-coral/10 text-coral" : "border-line text-ink hover:border-ink-dim"}`}
            >
              Schedule for later
            </button>
          </div>
          {when === "later" && (
            <input
              type="datetime-local"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              aria-label="Schedule date and time"
              className="h-9 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
            />
          )}
          {when === "later" && !scheduleInFuture && <p className="text-xs text-coral">Pick a time in the future.</p>}
        </div>
      )}

      <label className="mt-4 flex flex-col gap-1.5 text-sm text-ink">
        Publish note<span className="text-required">*</span>
        <textarea
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Why these changes?"
          className="resize-none rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
        />
      </label>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim">
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            dispatch({ type: "PUBLISH", note: note.trim(), scheduleFor });
            onClose();
          }}
          className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {when === "later" ? "Schedule" : sensitiveCount > 0 ? "Publish & request approval" : "Publish"}
        </button>
      </div>
    </Modal>
  );
}
