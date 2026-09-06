"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useInbox } from "../context/InboxContext";
import { PII_LABEL, type Conversation, type PiiField } from "../engine/inboxEngine";

/**
 * AG-06's reveal gate. Only shown when the tenant has
 * `security.piiRevealRequiresReason` on — with it off, `DetailsPanel`
 * dispatches `REVEAL_PII` directly with an empty reason. Either way the
 * reveal is audited; the reason is what the *tenant* can additionally
 * require, not what makes the audit happen.
 */
export default function RevealPiiModal({
  conversation,
  field,
}: {
  conversation: Conversation;
  field: PiiField;
}) {
  const { dispatch } = useInbox();
  const [reason, setReason] = useState("");
  const close = () => dispatch({ type: "CLOSE_PII_REVEAL" });

  return (
    <Modal titleId="reveal-pii-title" onClose={close}>
      <h2 id="reveal-pii-title" className="text-lg font-bold text-ink">
        Reveal {PII_LABEL[field].toLowerCase()}
      </h2>
      <p className="mt-1 text-sm text-ink-dim">
        {conversation.customerName} — this is protected customer data. Your
        name, the field and this reason are written to the conversation&rsquo;s
        activity history.
      </p>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason.trim()) return;
          dispatch({ type: "REVEAL_PII", id: conversation.id, field, reason: reason.trim() });
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Why do you need it?<span className="text-required">*</span>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Calling the passenger back about the failed ticketing"
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
          />
        </label>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!reason.trim()}
            className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Reveal
          </button>
        </div>
      </form>
    </Modal>
  );
}
