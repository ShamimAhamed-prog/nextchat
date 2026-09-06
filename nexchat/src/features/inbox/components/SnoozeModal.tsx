"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useInbox } from "../context/InboxContext";
import type { Conversation } from "../engine/inboxEngine";
import { ALL_PEOPLE, YOU } from "@/shared/lib/people";

const WAKE_OPTIONS = [
  { label: "15 minutes", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 240 },
  { label: "Tomorrow morning", minutes: 16 * 60 },
];

export default function SnoozeModal({ conversation }: { conversation: Conversation }) {
  const { dispatch } = useInbox();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState(WAKE_OPTIONS[1].minutes);
  // AG-09: a wake with no named owner is how a snooze becomes a way of losing
  // a case. Defaults to whoever is snoozing it, but it can go to someone else.
  const [owner, setOwner] = useState(YOU);
  const close = () => dispatch({ type: "CLOSE_SNOOZE" });

  return (
    <Modal titleId="snooze-title" onClose={close}>
      <h2 id="snooze-title" className="text-lg font-bold text-ink">
        Snooze conversation
      </h2>
      <p className="mt-1 text-sm text-ink-dim">{conversation.customerName} — wakes to a named owner, not the general queue.</p>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason.trim()) return;
          dispatch({ type: "CONFIRM_SNOOZE", id: conversation.id, reason: reason.trim(), minutes, owner });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Wake condition<span className="text-required">*</span>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Waiting on finance to confirm the refund"
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Wakes to<span className="text-required">*</span>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
          >
            {ALL_PEOPLE.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-0.5 text-sm text-ink">Wake in</legend>
          <div className="flex flex-wrap gap-1.5">
            {WAKE_OPTIONS.map((o) => (
              <button
                key={o.minutes}
                type="button"
                onClick={() => setMinutes(o.minutes)}
                aria-pressed={minutes === o.minutes}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  minutes === o.minutes ? "border-coral bg-coral/10 text-coral" : "border-line text-ink hover:border-ink-dim"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!reason.trim()}
            className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Snooze
          </button>
        </div>
      </form>
    </Modal>
  );
}
