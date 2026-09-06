"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useInbox } from "./InboxContext";
import type { Conversation } from "./inboxEngine";

import { SECOND_APPROVER } from "@/lib/people";

const DESTINATIONS = [
  "Refunds & Disruption team",
  "Booking Specialist queue",
  "Duty Operations Manager",
  `${SECOND_APPROVER} (agent)`,
];

export default function TransferModal({ conversation }: { conversation: Conversation }) {
  const { dispatch } = useInbox();
  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [reason, setReason] = useState("");
  const close = () => dispatch({ type: "CLOSE_TRANSFER" });

  return (
    <Modal titleId="transfer-title" onClose={close}>
      <h2 id="transfer-title" className="text-lg font-bold text-ink">
        Transfer conversation
      </h2>
      <p className="mt-1 text-sm text-ink-dim">{conversation.customerName} keeps their full context and original SLA age.</p>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason.trim()) return;
          dispatch({ type: "CONFIRM_TRANSFER", id: conversation.id, destination, reason: reason.trim() });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Destination
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
          >
            {DESTINATIONS.map((d) => (
              <option key={d} value={d} className="bg-footer">
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Reason<span className="text-required">*</span>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is this moving?"
            className="resize-none rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
          />
        </label>

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!reason.trim()}
            className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Transfer
          </button>
        </div>
      </form>
    </Modal>
  );
}
