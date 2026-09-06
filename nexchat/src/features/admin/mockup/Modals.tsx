"use client";

import { useEffect } from "react";
import { AuditNote, Avatar, Pill } from "./Primitives";
import { useModal, type ModalId } from "./ModalContext";

/**
 * The mockup's dialogs — `#interventionModal` through `#aiReviewModal` — plus
 * its agent drawer and commit toast. Same fields, same copy, same footer
 * actions; a commit closes the dialog and raises the mockup's toast rather
 * than mutating anything, since these views are the design, not the engine.
 */

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-line bg-footer px-2.5 py-2 text-[11px] text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none";

function Select({ options }: { options: string[] }) {
  return (
    <select defaultValue={options[0]} className={inputCls}>
      {options.map((o) => (
        <option key={o} className="bg-footer">
          {o}
        </option>
      ))}
    </select>
  );
}

function Input({ value, placeholder, type = "text", readOnly }: { value?: string; placeholder?: string; type?: string; readOnly?: boolean }) {
  return <input type={type} defaultValue={value} placeholder={placeholder} readOnly={readOnly} className={inputCls} />;
}

function TextArea({ value, placeholder }: { value?: string; placeholder?: string }) {
  return <textarea defaultValue={value} placeholder={placeholder} className={`${inputCls} min-h-[82px] resize-y`} />;
}

function Case({ title, meta }: { title: string; meta: string[] }) {
  return (
    <div className="mt-2 grid grid-cols-[1fr_auto] gap-1 rounded-lg border border-line p-3">
      <b className="text-[11px] font-bold text-ink">{title}</b>
      {meta.map((m, i) => (
        <span key={i} className={`text-[9px] text-ink-dim ${i === 0 ? "text-right" : "col-span-2"}`}>
          {m}
        </span>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-6 text-[10px] uppercase tracking-[0.1em] text-ink-dim first:mt-0">{children}</div>;
}

type Def = { title: string; body: React.ReactNode; cancel?: string; confirm: string; danger?: boolean; commit: string };

function definitions(): Record<Exclude<ModalId, "agentDrawer">, Def> {
  return {
    intervention: {
      title: "Supervisor intervention",
      commit: "Intervention saved and audit event created",
      confirm: "Confirm intervention",
      body: (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Conversation">
              <Select options={["C-1057 · P0 paid not ticketed", "C-1054 · P1 disruption"]} />
            </Field>
            <Field label="Action">
              <Select options={["Assign agent", "Reassign queue", "Change priority", "Pin conversation"]} />
            </Field>
            <Field label="Destination">
              <Select options={["Nusrat Jahan · eligible", "Ayesha Rahman · eligible", "Payment recovery queue"]} />
            </Field>
            <Field label="Priority">
              <Select options={["Keep P0", "P1 urgent", "P2 standard"]} />
            </Field>
            <Field label="Required reason" full>
              <TextArea placeholder="Explain why the routing result is being overridden" />
            </Field>
          </div>
          <div className="mt-3.5">
            <AuditNote>
              Tenant, restricted-data and skill permissions remain hard constraints. The action, reason, previous owner, SLA age and
              resulting lease will be written to the immutable audit timeline.
            </AuditNote>
          </div>
        </>
      ),
    },
    export: {
      title: "Create redacted export",
      commit: "Export job created",
      confirm: "Create export job",
      body: (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Report">
              <Select options={["Human performance dashboard", "AI agent performance dashboard", "Active workload snapshot", "Source metric events", "QA reviews"]} />
            </Field>
            <Field label="Format">
              <Select options={["PDF", "CSV"]} />
            </Field>
            <Field label="Date range">
              <Select options={["Current dashboard filters", "Last 7 days", "Last 30 days"]} />
            </Field>
            <Field label="Expiry">
              <Select options={["7 days", "24 hours"]} />
            </Field>
            <Field label="Export label" full>
              <Input value="Supervisor performance review" />
            </Field>
          </div>
          <div className="mt-3.5">
            <AuditNote>
              The job runs asynchronously. The requester, complete filters, model and policy versions, row count, redaction policy, expiry,
              download events and tenant scope are retained.
            </AuditNote>
          </div>
        </>
      ),
    },
    drilldown: {
      title: "Metric source drill-down",
      commit: "Conversation audit opened",
      confirm: "Open permitted conversation",
      cancel: "Close",
      body: (
        <>
          <SectionTitle>Conversation C-1057</SectionTitle>
          <Case title="Escalated" meta={["14:20:11.042", "Reason: PAYMENT_CAPTURED_TICKET_FAILED · AI confidence .38"]} />
          <Case title="Offer timed out" meta={["14:20:37.118", "Farhana Islam · original queue age preserved"]} />
          <Case title="Assigned" meta={["14:21:08.301", "Nusrat Jahan · 3 eligible candidates · lease L-8821"]} />
          <Case title="First human reply" meta={["14:21:46.802", "Queue wait 57.259s · reaction 38.501s · delivery 0.442s"]} />
          <div className="mt-3.5">
            <AuditNote>Metric definition v2.3 · event schema v6 · trace tr_8bc21 · PII redacted for supervisor role.</AuditNote>
          </div>
        </>
      ),
    },
    alert: {
      title: "Create alert rule",
      commit: "Alert rule created and versioned",
      confirm: "Create versioned rule",
      body: (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Signal">
            <Select options={["No eligible agent", "SLA breach forecast", "Channel delivery failure", "Escalation spike", "Queue surge"]} />
          </Field>
          <Field label="Severity">
            <Select options={["Critical", "Warning", "Information"]} />
          </Field>
          <Field label="Threshold">
            <Input value="1 P0 or 60s P1" />
          </Field>
          <Field label="Recipients">
            <Select options={["Queue supervisors + duty owner", "Operations team"]} />
          </Field>
          <Field label="Escalation policy" full>
            <TextArea value="Repeat every five minutes until acknowledged or the eligible set changes." />
          </Field>
        </div>
      ),
    },
    qa: {
      title: "QA review workflow",
      commit: "QA workflow updated",
      confirm: "Save QA record",
      body: (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Sampling strategy">
              <Select options={["Risk-based", "Random", "Targeted"]} />
            </Field>
            <Field label="Rubric">
              <Select options={["OTA Support v4.2", "Payment recovery v2.1"]} />
            </Field>
            <Field label="Reviewer">
              <Select options={["Auto-assign calibrated reviewer", "Senior QA pool"]} />
            </Field>
            <Field label="Due date">
              <Input type="date" value="2026-09-03" />
            </Field>
            <Field label="Review or appeal note" full>
              <TextArea placeholder="Record evidence, coaching note or appeal decision" />
            </Field>
          </div>
          <div className="mt-3.5">
            <AuditNote>
              Rubric version, reviewer, calibration cohort, scores, coaching acknowledgement and appeal outcome remain attached to the
              immutable QA record.
            </AuditNote>
          </div>
        </>
      ),
    },
    surge: {
      title: "Activate disruption surge mode",
      commit: "Surge mode activated and roster notified",
      confirm: "Activate surge mode",
      danger: true,
      body: (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Incident cohort">
            <Select options={["DAC–CXB · weather disruption", "Create new incident cohort"]} />
          </Field>
          <Field label="Duration">
            <Select options={["60 minutes", "Until manually resolved"]} />
          </Field>
          <Field label="Roster">
            <Select options={["Disruption surge team", "All certified agents"]} />
          </Field>
          <Field label="Informational traffic">
            <Select options={["Keep AI-served from incident record", "Queue all traffic"]} />
          </Field>
          <Field label="Reason" full>
            <TextArea value="Traffic exceeded route baseline and six urgent rebooking decisions require human support." />
          </Field>
        </div>
      ),
    },
    backfill: {
      title: "Start KPI backfill",
      commit: "Labelled KPI backfill queued",
      confirm: "Queue labelled backfill",
      body: (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Definition version">
              <Select options={["v2.3"]} />
            </Field>
            <Field label="Date range">
              <Select options={["01 Jul–31 Jul 2026", "Custom range"]} />
            </Field>
            <Field label="Required public label" full>
              <Input value="Exclude bot acknowledgements from first response" />
            </Field>
            <Field label="Change ticket and approval" full>
              <TextArea value="METRIC-284 · Approved by Data Governance and Support Operations." />
            </Field>
          </div>
          <div className="mt-3.5">
            <AuditNote>
              Backfills never silently replace published facts. Every affected dashboard and export displays the label, definition version
              and recomputation timestamp.
            </AuditNote>
          </div>
        </>
      ),
    },
    aiReview: {
      title: "Review AI decision trace",
      commit: "AI decision review recorded",
      confirm: "Save review",
      body: (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: ".41", l: "Decision confidence" },
              { v: ".45", l: "Handoff threshold" },
              { v: "1.4s", l: "End-to-end latency" },
            ].map((k) => (
              <div key={k.l} className="rounded-xl border border-line bg-footer p-3">
                <b className="block text-[19px] font-bold leading-none text-ink">{k.v}</b>
                <span className="mt-1 block text-[9px] text-ink-dim">{k.l}</span>
              </div>
            ))}
          </div>
          <SectionTitle>Decision evidence</SectionTitle>
          <Case title="Primary intent" meta={["Name change · .41", "Runner-up: schedule change · .37"]} />
          <Case title="Grounding and tools" meta={["POL-NAME-08 blocked", "Source expired; no customer-facing answer delivered"]} />
          <Case title="Escalation package" meta={["Complete", "Transcript, language, confidence trail, PNR context, and recommended skill"]} />
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Decision quality">
              <Select options={["Correct handoff", "Should have clarified", "Should have answered", "Unsafe or unsupported"]} />
            </Field>
            <Field label="Root cause">
              <Select options={["Intent boundary", "Expired knowledge source", "Tool failure", "Policy rule"]} />
            </Field>
          </div>
        </>
      ),
    },
    recovery: {
      title: "Payment and ticket recovery",
      commit: "Recovery action submitted with idempotency protection",
      confirm: "Confirm recovery action",
      body: (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Action">
              <Select options={["Retry ticket issuance", "Prepare refund", "Investigate duplicate charge"]} />
            </Field>
            <Field label="Order">
              <Input value="ORD-1057 · PNR W7F4K2" readOnly />
            </Field>
            <Field label="Payment reference">
              <Input value="PAY-82••91" readOnly />
            </Field>
            <Field label="Idempotency">
              <Input value="retry-ticket-1057-v4" readOnly />
            </Field>
            <Field label="Customer confirmation" full>
              <TextArea value="I confirm that the existing payment will be reused and no second charge will be created." />
            </Field>
          </div>
          <div className="mt-3.5">
            <AuditNote>
              The same validated services, permissions, confirmation steps and idempotency controls are used by AI and human agents.
            </AuditNote>
          </div>
        </>
      ),
    },
    channelRecovery: {
      title: "Recover failed delivery",
      commit: "Approved alternative-channel recovery queued",
      confirm: "Queue recovery",
      body: (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Terminal failure" full>
              <Input value="WhatsApp template rejected: outside session window" readOnly />
            </Field>
            <Field label="Approved recovery" full>
              <Select options={["Use approved utility template", "Offer verified email", "Offer web account notification"]} />
            </Field>
            <Field label="Customer-safe message" full>
              <TextArea value="Your WhatsApp session window has closed. We can send this update using an approved template or your verified email." />
            </Field>
          </div>
          <div className="mt-3.5">
            <AuditNote>
              Unsupported or legally unavailable delivery never fails silently. The alternative channel must be verified and
              consent-permitted.
            </AuditNote>
          </div>
        </>
      ),
    },
    identity: {
      title: "Identity resolution",
      commit: "Identity decision recorded and reversible",
      confirm: "Apply identity decision",
      body: (
        <>
          <div className="grid gap-2">
            <div className="rounded-lg border border-line p-3">
              <header className="flex items-center gap-2">
                <Avatar initials="NJ" color="#00694b" size={28} />
                <h3 className="text-[10px] font-bold text-ink">WhatsApp · +880 17•• ••• 482</h3>
                <span className="ml-auto">
                  <Pill tone="green">OTP verified</Pill>
                </span>
              </header>
              <p className="mt-1.5 text-[9px] text-ink-dim">PNR W7F4K2 · verified surname and booking phone.</p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <header className="flex items-center gap-2">
                <Avatar initials="NJ" color="#596bd7" size={28} />
                <h3 className="text-[10px] font-bold text-ink">Messenger · nusrat.j</h3>
                <span className="ml-auto">
                  <Pill tone="amber">Provisional</Pill>
                </span>
              </header>
              <p className="mt-1.5 text-[9px] text-ink-dim">Similar name and device region are not sufficient for automatic merge.</p>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Verification method">
              <Select options={["OTP verified phone/email", "Customer-confirmed booking attribute"]} />
            </Field>
            <Field label="Action">
              <Select options={["Link after verification", "Keep separate", "Reverse previous link"]} />
            </Field>
            <Field label="Reason" full>
              <TextArea value="Customer confirmed both channel identities after OTP verification." />
            </Field>
          </div>
        </>
      ),
    },
    killSwitch: {
      title: "AI kill-switch control",
      commit: "AI kill switch activated; new work routed safely",
      confirm: "Activate kill switch",
      danger: true,
      body: (
        <>
          <div className="rounded-xl border border-danger-border bg-danger-bg p-3.5">
            <b className="text-xs text-danger-text">Route new AI-eligible work to humans</b>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
              Messages remain accepted. Deterministic notices explain the delay. Existing human ownership and operational records are
              preserved.
            </p>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Scope">
              <Select options={["Takeoff Travels tenant", "Global platform"]} />
            </Field>
            <Field label="Duration">
              <Select options={["Until manually restored", "60 minutes"]} />
            </Field>
            <Field label="Required incident reference and reason" full>
              <TextArea placeholder="INC-#### · Explain the safety or quality concern" />
            </Field>
          </div>
        </>
      ),
    },
  };
}

export default function MockupModals() {
  const ctx = useModal();

  useEffect(() => {
    if (!ctx?.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx]);

  if (!ctx) return null;
  const { active, subject, close, commit, toast } = ctx;

  return (
    <>
      {active === "agentDrawer" && <AgentDrawer name={subject ?? "Ayesha Rahman"} onClose={close} />}

      {active && active !== "agentDrawer" && (
        <Dialog def={definitions()[active]} onClose={close} onCommit={commit} />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-toast px-4 py-2.5 text-[11px] text-on-accent shadow-pop"
        >
          {toast}
        </div>
      )}
    </>
  );
}

function Dialog({ def, onClose, onCommit }: { def: Def; onClose: () => void; onCommit: (m: string) => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={def.title} className="max-h-[90vh] w-full max-w-[620px] overflow-auto rounded-2xl border border-line bg-footer shadow-modal">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-bold text-ink">{def.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-line text-ink hover:border-ink-dim"
          >
            ×
          </button>
        </header>
        <div className="px-5 py-4">{def.body}</div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
          <button type="button" onClick={onClose} className="flex h-9 items-center rounded-lg border border-line px-3.5 text-xs font-bold text-ink hover:border-ink-dim">
            {def.cancel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => onCommit(def.commit)}
            className={`flex h-9 items-center rounded-lg border px-3.5 text-xs font-bold ${
              def.danger
                ? "border-danger-border bg-danger-bg text-danger-text hover:border-danger-border-strong"
                : "border-transparent bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] text-on-accent hover:opacity-90"
            }`}
          >
            {def.confirm}
          </button>
        </footer>
      </div>
    </div>
  );
}

/** The mockup's `#agentDrawer` — opens from a row on the agent capacity board. */
function AgentDrawer({ name, onClose }: { name: string; onClose: () => void }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-scrim/40" onClick={onClose} />
      <aside aria-label={`${name} details`} className="fixed right-0 top-0 z-[45] h-screen w-[min(460px,100%)] overflow-auto border-l border-line bg-page shadow-drawer">
        <header className="sticky top-0 z-[2] flex items-center gap-3 border-b border-line bg-page px-5 py-4">
          <Avatar initials={initials} color="#2f5f7c" size={44} />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">{name}</h2>
            <p className="mt-1 text-[10px] text-ink-dim">Available · Ticketing and Bangla</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close agent details" className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-line text-ink hover:border-ink-dim">
            ×
          </button>
        </header>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "46%", l: "Weighted load" },
              { v: "3 / 6", l: "Active capacity" },
              { v: "4.71", l: "30-day CSAT" },
            ].map((k) => (
              <div key={k.l} className="rounded-xl border border-line bg-footer p-3">
                <b className="block text-[19px] font-bold leading-none text-ink">{k.v}</b>
                <span className="mt-1 block text-[9px] text-ink-dim">{k.l}</span>
              </div>
            ))}
          </div>

          <SectionTitle>Workload explanation</SectionTitle>
          <div className="rounded-xl border border-warn-border bg-warn-bg p-3.5">
            <b className="text-xs text-warn-text">Healthy capacity with one SLA risk</b>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
              3 active conversations, including one P1 ticketing case. No P0 case, no pending wrap-up tasks and 54% capacity remains.
            </p>
          </div>

          <SectionTitle>Current conversations</SectionTitle>
          <Case title="C-1041 · Paid, ticket pending" meta={["04:12", "WhatsApp · P1 · Ticketing"]} />
          <Case title="C-1032 · Name correction policy" meta={["Healthy", "Web chat · P2 · Waiting customer"]} />
          <Case title="C-1028 · Baggage allowance" meta={["Snoozed", "Messenger · P3"]} />

          <SectionTitle>Routing eligibility</SectionTitle>
          <Case title="Ticketing queue" meta={["Eligible", "Exact skill and language match · effective weight 1.18"]} />
        </div>
      </aside>
    </>
  );
}
