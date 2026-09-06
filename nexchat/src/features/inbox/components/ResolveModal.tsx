"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useInbox } from "../context/InboxContext";
import type { Conversation } from "../engine/inboxEngine";

const CATEGORIES = ["Booking & Payment", "Refund", "Baggage & Fare Policy", "Complaint", "General Inquiry"];
const REQUIRES_REFERENCE = new Set(["Booking & Payment", "Refund", "Complaint"]);

export default function ResolveModal({ conversation }: { conversation: Conversation }) {
  const { dispatch } = useInbox();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reference, setReference] = useState(conversation.pnr ?? "");
  const close = () => dispatch({ type: "CLOSE_RESOLVE" });
  const needsReference = REQUIRES_REFERENCE.has(category);

  return (
    <Modal titleId="resolve-title" onClose={close}>
      <h2 id="resolve-title" className="text-lg font-bold text-ink">
        Resolve conversation
      </h2>
      <p className="mt-1 text-sm text-ink-dim">{conversation.customerName} — a resolution category is required to close this out.</p>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (needsReference && !reference.trim()) return;
          dispatch({ type: "CONFIRM_RESOLVE", id: conversation.id, category, reference: reference.trim() });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Resolution category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-footer">
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Domain reference{needsReference && <span className="text-required">*</span>}
          <input
            type="text"
            required={needsReference}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={needsReference ? "PNR, refund ID, or ticket number" : "Optional"}
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
          />
        </label>

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim">
            Cancel
          </button>
          <button
            type="submit"
            disabled={needsReference && !reference.trim()}
            className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Resolve
          </button>
        </div>
      </form>
    </Modal>
  );
}
