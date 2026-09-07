"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useInbox } from "../context/InboxContext";
import { heldByAgent } from "../engine/inboxEngine";
import { ALL_PEOPLE, YOU } from "@/shared/lib/people";

const COLLEAGUES = ALL_PEOPLE.filter((p) => p !== YOU);

/**
 * Phase 1 #7: a manual, bulk handover of everything this agent currently
 * holds — as opposed to `TransferModal`, which moves one conversation.
 * History, notes and follow-ups travel with each conversation because
 * nothing here copies or drops them; `CONFIRM_SHIFT_HANDOVER`
 * (`reducers/shiftHandover.ts`) just reassigns the same records. The
 * colleague's "acknowledgment of receipt" happens on their side, from the
 * notification this raises — see `NotificationsBell.tsx`'s `act()`.
 */
export default function ShiftHandoverModal() {
  const { state, dispatch } = useInbox();
  const held = heldByAgent(state.conversations);
  const [to, setTo] = useState(COLLEAGUES[0] ?? "");
  const [note, setNote] = useState("");
  const close = () => dispatch({ type: "CLOSE_SHIFT_HANDOVER" });
  const canSend = held.length > 0 && Boolean(to) && note.trim().length > 0;

  return (
    <Modal titleId="shift-handover-title" onClose={close}>
      <h2 id="shift-handover-title" className="text-lg font-bold text-ink">
        Hand over shift
      </h2>
      <p className="mt-1 text-sm text-ink-dim">
        {held.length === 0
          ? "You aren't holding any conversations right now."
          : "Everything below moves to your colleague, with its full history, notes and follow-ups."}
      </p>

      {held.length > 0 && (
        <ul className="mt-4 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg bg-footer p-2">
          {held.map((c) => {
            const openTasks = (c.tasks ?? []).filter((t) => !t.done).length;
            return (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
                <span className="min-w-0 truncate text-ink">{c.customerName}</span>
                {openTasks > 0 && (
                  <span className="shrink-0 text-xs text-ink-dim">
                    {openTasks} open follow-up{openTasks > 1 ? "s" : ""}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          dispatch({ type: "CONFIRM_SHIFT_HANDOVER", to, note: note.trim() });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Hand over to
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
          >
            {COLLEAGUES.map((p) => (
              <option key={p} value={p} className="bg-footer">
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Handover notes<span className="text-required">*</span>
          <textarea
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Anything they need to know before they pick these up"
            className="resize-none rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
          />
        </label>

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSend}
            className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Hand over{held.length > 0 ? ` (${held.length})` : ""}
          </button>
        </div>
      </form>
    </Modal>
  );
}
