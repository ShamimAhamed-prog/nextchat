"use client";

import Modal from "./Modal";
import { useInbox } from "../context/InboxContext";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import { heldByAgent, type AgentState } from "../engine/inboxEngine";

const STATE_LABEL: Record<AgentState, string> = {
  available: "Available",
  busy: "Busy",
  wrap_up: "Wrap-up",
  away: "Away",
  break: "On break",
  training: "Training",
  offline: "Offline",
};

/**
 * AG-11's warning. The agent is not blocked — going on break is not something
 * software should refuse — but the choice is made explicit, and the option
 * that leaves a customer waiting says so. Whichever way they go, the tenant's
 * unattended timeout still applies afterwards.
 */
export default function AgentStateGuardModal({ nextState }: { nextState: AgentState }) {
  const { state, dispatch } = useInbox();
  const { state: configState } = useTenantConfig();
  const held = heldByAgent(state.conversations);
  const unattended = configState.published.sla.unattendedMinutes;
  const close = () => dispatch({ type: "CANCEL_AGENT_STATE" });

  return (
    <Modal titleId="agent-state-title" onClose={close}>
      <h2 id="agent-state-title" className="text-lg font-bold text-ink">
        Go {STATE_LABEL[nextState]} with {held.length} conversation
        {held.length === 1 ? "" : "s"} open?
      </h2>
      <p className="mt-1 text-sm text-ink-dim">
        You stop receiving new work either way. These are the ones you still
        hold:
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {held.map((c) => (
          <li key={c.id} className="rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink">
            <span className="font-medium">{c.customerName}</span>
            <span className="text-ink-dim">
              {" "}
              · {c.priority} · {c.escalationReason}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-ink-dim">
        If you keep them, anything still unattended after {unattended} minute
        {unattended === 1 ? "" : "s"} returns to the queue automatically and is
        recorded against this conversation.
      </p>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
        >
          Stay {STATE_LABEL[state.agentState]}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "CONFIRM_AGENT_STATE", state: nextState, releaseHeld: false })}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
        >
          Keep them
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "CONFIRM_AGENT_STATE", state: nextState, releaseHeld: true })}
          className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
        >
          Release to queue
        </button>
      </div>
    </Modal>
  );
}
