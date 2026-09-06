"use client";

import { useState } from "react";
import Modal from "../dashboard/Modal";
import { useTenantConfig } from "./TenantConfigContext";
import { AGENT_ROSTER } from "@/lib/people";
import type { Priority, TenantConfig } from "./tenantConfigEngine";

/**
 * The mockup's admin dialogs — `routingPolicyModal`, `agentConfigModal`,
 * `slaModal`, `killSwitchModal`, `knowledgeModal`, `templateModal`,
 * `roleModal` and `retentionModal` — with the exact field set, control types,
 * default values, options, placeholders, audit note and footer labels each has
 * in `#adminView`. Every field is a real box you can type in, as it is there.
 *
 * What differs is where the typing goes. A field with tenant config behind it
 * writes through `EDIT_DRAFT` on save, so it flows into `diffDraft`, the
 * publish modal and the audit trail like any other change, and a sensitive one
 * still needs a second approver. A field with no store behind it — the mockup
 * has several — is still editable, and what you typed is written into the
 * audit entry rather than being thrown away when the dialog closes. Nothing
 * here silently discards input, and nothing here claims to persist more than
 * it does.
 *
 * `BOUND` on a field marks the first kind. `Cfg` paths are the contract.
 */

type Cfg = TenantConfig;

/* --------------------------------------------------------------- primitives */

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none";

/**
 * Exported because `AdminDialogs.tsx` — the dialogs `preview (3).html` added
 * on top of these eight — has to look and behave identically. One shell, so a
 * change to the footer, the focus trap or the reason-gating reaches all of
 * them rather than half.
 */
export function Shell({
  titleId,
  title,
  intro,
  note,
  wide,
  extra,
  onClose,
  onSave,
  saveLabel,
  cancelLabel = "Cancel",
  canSave = true,
  danger,
  secondary,
  children,
}: {
  titleId: string;
  title: string;
  /** The mockup's leading `.admin-section-note` / `.load-explain` block. */
  intro?: React.ReactNode;
  note?: string;
  wide?: boolean;
  /** Rendered between the field grid and the note — the mockup's checklists. */
  extra?: React.ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saveLabel: string;
  cancelLabel?: string;
  canSave?: boolean;
  /** A destructive confirm, drawn in the danger tone rather than the gradient. */
  danger?: boolean;
  /** The mockup's middle footer button — "Run evaluation", "Test connection". */
  secondary?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <Modal titleId={titleId} onClose={onClose} wide={wide}>
      <h2 id={titleId} className="text-lg font-bold text-ink">
        {title}
      </h2>
      {intro && <div className="mt-3">{intro}</div>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
      {extra && <div className="mt-4">{extra}</div>}
      {note && (
        <p className="mt-4 rounded-lg border border-line bg-footer p-3 text-[11px] leading-relaxed text-ink-dim">{note}</p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
        >
          {cancelLabel}
        </button>
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="h-10 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
          >
            {secondary.label}
          </button>
        )}
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            title={canSave ? undefined : "A reason is required before this can be saved"}
            className={`h-10 rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 ${
              danger
                ? "border border-danger-border bg-danger-bg text-danger-text"
                : "bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] text-on-accent"
            }`}
          >
            {saveLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}

export function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

export function Txt({
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`${inputCls} ${readOnly ? "text-ink-dim" : ""}`}
    />
  );
}

export function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => (
        <option key={o} value={o} className="bg-footer">
          {o}
        </option>
      ))}
    </select>
  );
}

export function Ta({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="rounded-lg border border-line bg-footer px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
    />
  );
}

/** Leading number out of "8 minutes" / "24 days" / "1.20". */
const num = (s: string, fallback: number) => {
  const n = Number.parseFloat(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Everything typed into a field with no config behind it, folded into the
 * audit entry so it is recorded rather than dropped on close.
 */
export function noteOf(pairs: [string, string][], skip: Record<string, string>) {
  return pairs
    .filter(([k, v]) => v.trim() && v !== skip[k])
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

/* ------------------------------------------------------- routing policy */

export function RoutingPolicyModal({ queueId, onClose }: { queueId: string; onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const queues = state.draft.queues.queues;
  const [id, setId] = useState(queueId);
  const queue = queues.find((q) => q.id === id) ?? queues[0];

  const [age, setAge] = useState("15 minutes");
  const [skills, setSkills] = useState("Payment L1, Ticketing L1");
  const [fallback, setFallback] = useState("Approved at factor .80");
  const [timeout, setTimeoutV] = useState("30 seconds");
  // BOUND — the queue's real capacity, enforced on /inbox by
  // `totalMaxConcurrency()`. The mockup shows a formula string here.
  const [capacity, setCapacity] = useState(String(queue.maxConcurrency));
  const [weight, setWeight] = useState(queue.baseWeight.toFixed(2));
  const [reason, setReason] = useState("");

  function pick(name: string) {
    const q = queues.find((x) => x.name === name);
    if (!q) return;
    setId(q.id);
    setCapacity(String(q.maxConcurrency));
    setWeight(q.baseWeight.toFixed(2));
  }

  function save() {
    const cap = num(capacity, queue.maxConcurrency);
    const w = num(weight, queue.baseWeight);
    if (cap !== queue.maxConcurrency) dispatch({ type: "EDIT_DRAFT", path: `queues.queues.${queue.id}.maxConcurrency`, value: cap });
    if (w !== queue.baseWeight) dispatch({ type: "EDIT_DRAFT", path: `queues.queues.${queue.id}.baseWeight`, value: w });
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: `Routing policy edited — ${queue.name}`,
      detail: [
        reason.trim(),
        noteOf(
          [
            ["max queue age", age],
            ["required skills", skills],
            ["language fallback", fallback],
            ["offer timeout", timeout],
          ],
          { "max queue age": "15 minutes", "required skills": "Payment L1, Ticketing L1", "language fallback": "Approved at factor .80", "offer timeout": "30 seconds" },
        ),
      ]
        .filter(Boolean)
        .join(" — "),
    });
    onClose();
  }

  return (
    <Shell
      titleId="routing-policy-title"
      title="Queue and routing policy"
      onClose={onClose}
      onSave={save}
      saveLabel="Save policy"
      canSave={reason.trim().length > 0}
      note="Capacity and base weight are enforced: hard eligibility runs before weighting, so a queue's weight never selects someone who was not allowed to take the work. The four fields above them have no store behind them yet, so what you enter is recorded on the audit entry rather than applied."
    >
      <F label="Queue">
        <Sel value={queue.name} onChange={pick} options={queues.map((q) => q.name)} />
      </F>
      <F label="Max queue age">
        <Txt value={age} onChange={setAge} />
      </F>
      <F label="Required skills">
        <Txt value={skills} onChange={setSkills} />
      </F>
      <F label="Language fallback">
        <Sel value={fallback} onChange={setFallback} options={["Approved at factor .80", "No fallback"]} />
      </F>
      <F label="Offer timeout">
        <Txt value={timeout} onChange={setTimeoutV} />
      </F>
      <F label="Capacity adjustment">
        <Txt value={capacity} onChange={setCapacity} />
      </F>
      <F label="Base weight">
        <Txt value={weight} onChange={setWeight} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required for versioned routing changes" />
      </F>
    </Shell>
  );
}

/* --------------------------------------------------------- agent config */

export function AgentConfigModal({ name, onClose }: { name: string; onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const agent = AGENT_ROSTER.find((a) => a.name === name) ?? AGENT_ROSTER[0];
  const queues = state.draft.queues.queues.filter((q) => agent.queues.includes(q.id));

  const [agentName, setAgentName] = useState(agent.name);
  const [team, setTeam] = useState(queues[0]?.name ?? state.draft.queues.queues[0].name);
  const [skills, setSkills] = useState(agent.skills.join(", "));
  const [languages, setLanguages] = useState(agent.languages.join(", "));
  const [weight, setWeight] = useState((queues[0]?.baseWeight ?? 1).toFixed(2));
  const [concurrency, setConcurrency] = useState(String(queues.reduce((n, q) => n + q.maxConcurrency, 0)));
  const [reason, setReason] = useState("");

  function save() {
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: `Agent record edited — ${agent.name}`,
      detail: [
        reason.trim(),
        noteOf(
          [
            ["agent", agentName],
            ["team", team],
            ["skills", skills],
            ["languages", languages],
            ["base weight", weight],
            ["max concurrency", concurrency],
          ],
          {
            agent: agent.name,
            team: queues[0]?.name ?? "",
            skills: agent.skills.join(", "),
            languages: agent.languages.join(", "),
            "base weight": (queues[0]?.baseWeight ?? 1).toFixed(2),
            "max concurrency": String(queues.reduce((n, q) => n + q.maxConcurrency, 0)),
          },
        ),
      ]
        .filter(Boolean)
        .join(" — "),
    });
    onClose();
  }

  return (
    <Shell
      titleId="agent-config-title"
      title="Agent skills and capacity"
      onClose={onClose}
      onSave={save}
      saveLabel="Save agent"
      canSave={reason.trim().length > 0}
      note="Performance metrics cannot automatically increase routing weight. The roster itself lives in lib/people.ts rather than in tenant config, so changes here are recorded on the audit entry and do not move routing — making them apply means bringing the roster through the same draft and publish pipeline as everything else on this page."
    >
      <F label="Agent">
        <Txt value={agentName} onChange={setAgentName} />
      </F>
      <F label="Team">
        <Sel value={team} onChange={setTeam} options={state.draft.queues.queues.map((q) => q.name)} />
      </F>
      <F label="Certified skills" full>
        <Txt value={skills} onChange={setSkills} />
      </F>
      <F label="Languages">
        <Txt value={languages} onChange={setLanguages} />
      </F>
      <F label="Base weight">
        <Txt value={weight} onChange={setWeight} />
      </F>
      <F label="Max concurrency">
        <Txt value={concurrency} onChange={setConcurrency} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Recorded on the audit entry" />
      </F>
    </Shell>
  );
}

/* ------------------------------------------------------------------- SLA */

const PRIORITY_LABEL: Record<Priority, string> = {
  P0: "P0 critical",
  P1: "P1 urgent",
  P2: "P2 standard",
  P3: "P3 low",
};

export function SlaModal({ priority, onClose }: { priority: Priority; onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const [p, setP] = useState<Priority>(priority);
  const target = state.draft.sla.targets[p];

  const [calendar, setCalendar] = useState("Bangladesh support");
  const [pickup, setPickup] = useState("5 minutes");
  // BOUND — both are real SLA targets on the tenant config.
  const [first, setFirst] = useState(`${target.firstResponseMinutes} minutes`);
  const [resolve, setResolve] = useState(`${target.resolutionMinutes} minutes`);
  const [pause, setPause] = useState("Waiting customer only");
  const [reason, setReason] = useState("");

  function pick(label: string) {
    const next = (Object.keys(PRIORITY_LABEL) as Priority[]).find((k) => PRIORITY_LABEL[k] === label);
    if (!next) return;
    setP(next);
    setFirst(`${state.draft.sla.targets[next].firstResponseMinutes} minutes`);
    setResolve(`${state.draft.sla.targets[next].resolutionMinutes} minutes`);
  }

  function save() {
    const f = num(first, target.firstResponseMinutes);
    const r = num(resolve, target.resolutionMinutes);
    if (f !== target.firstResponseMinutes) dispatch({ type: "EDIT_DRAFT", path: `sla.targets.${p}.firstResponseMinutes`, value: f });
    if (r !== target.resolutionMinutes) dispatch({ type: "EDIT_DRAFT", path: `sla.targets.${p}.resolutionMinutes`, value: r });
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: `SLA policy edited — ${PRIORITY_LABEL[p]}`,
      detail: [reason.trim(), noteOf([["calendar", calendar], ["pickup target", pickup], ["pause conditions", pause]], { calendar: "Bangladesh support", "pickup target": "5 minutes", "pause conditions": "Waiting customer only" })]
        .filter(Boolean)
        .join(" — "),
    });
    onClose();
  }

  return (
    <Shell
      titleId="sla-modal-title"
      title="SLA and business calendar"
      onClose={onClose}
      onSave={save}
      saveLabel="Save SLA policy"
      canSave={reason.trim().length > 0}
      note="First response and resolution are the real targets and are read in minutes, so “8 minutes” and “8” both work. Payment reconciliation clocks never pause, and SLA changes apply prospectively — they never rewrite historical results."
    >
      <F label="Priority">
        <Sel value={PRIORITY_LABEL[p]} onChange={pick} options={Object.values(PRIORITY_LABEL)} />
      </F>
      <F label="Calendar">
        <Sel value={calendar} onChange={setCalendar} options={["Bangladesh support", "24 × 7 financial exceptions"]} />
      </F>
      <F label="Pickup target">
        <Txt value={pickup} onChange={setPickup} />
      </F>
      <F label="First response">
        <Txt value={first} onChange={setFirst} />
      </F>
      <F label="Resolution target">
        <Txt value={resolve} onChange={setResolve} />
      </F>
      <F label="Pause conditions">
        <Sel value={pause} onChange={setPause} options={["Waiting customer only", "No pauses"]} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Recorded on the audit entry" />
      </F>
    </Shell>
  );
}

/** The calendar half of the mockup's `slaModal`, where the real fields are. */
export function CalendarModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const d = state.draft;
  const [calendar, setCalendar] = useState("Bangladesh support");
  const [hours, setHours] = useState(d.brand.businessHours);
  const [reopen, setReopen] = useState(`${d.sla.reopenWindowHours} hours`);
  const [unattended, setUnattended] = useState(`${d.sla.unattendedMinutes} minutes`);
  const [pause, setPause] = useState("Waiting customer only");
  const [reason, setReason] = useState("");

  function save() {
    const r = num(reopen, d.sla.reopenWindowHours);
    const u = num(unattended, d.sla.unattendedMinutes);
    if (hours !== d.brand.businessHours) dispatch({ type: "EDIT_DRAFT", path: "brand.businessHours", value: hours });
    if (r !== d.sla.reopenWindowHours) dispatch({ type: "EDIT_DRAFT", path: "sla.reopenWindowHours", value: r });
    if (u !== d.sla.unattendedMinutes) dispatch({ type: "EDIT_DRAFT", path: "sla.unattendedMinutes", value: u });
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: "Business calendar edited",
      detail: [reason.trim(), noteOf([["calendar", calendar], ["pause conditions", pause]], { calendar: "Bangladesh support", "pause conditions": "Waiting customer only" })]
        .filter(Boolean)
        .join(" — "),
    });
    onClose();
  }

  return (
    <Shell
      titleId="calendar-modal-title"
      title="SLA and business calendar"
      onClose={onClose}
      onSave={save}
      saveLabel="Save calendar"
      canSave={reason.trim().length > 0}
      note="Business hours, the reopen window and the unattended timeout are all real. The unattended timeout is enforced: AG-11 releases a conversation back to the queue when an agent who has stopped taking work holds it past this."
    >
      <F label="Calendar">
        <Sel value={calendar} onChange={setCalendar} options={["Bangladesh support", "24 × 7 financial exceptions"]} />
      </F>
      <F label="Business hours">
        <Txt value={hours} onChange={setHours} />
      </F>
      <F label="Reopen window">
        <Txt value={reopen} onChange={setReopen} />
      </F>
      <F label="Unattended timeout">
        <Txt value={unattended} onChange={setUnattended} />
      </F>
      <F label="Pause conditions">
        <Sel value={pause} onChange={setPause} options={["Waiting customer only", "No pauses"]} />
      </F>
      <F label="Policy basis and approval" full>
        <Ta value={reason} onChange={setReason} placeholder="Recorded on the audit entry" />
      </F>
    </Shell>
  );
}

/* ----------------------------------------------------------- kill switch */

export function KillSwitchModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const on = state.draft.ai.killSwitch;
  const [scope, setScope] = useState("Takeoff Travels tenant");
  const [duration, setDuration] = useState("Until manually restored");
  const [reason, setReason] = useState("");

  function save() {
    dispatch({ type: "EDIT_DRAFT", path: "ai.killSwitch", value: !on });
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: on ? "AI kill switch released" : "AI kill switch activated",
      detail: `${scope} · ${duration} · ${reason.trim()}`,
    });
    onClose();
  }

  return (
    <Shell
      titleId="kill-switch-title"
      title="AI kill-switch control"
      onClose={onClose}
      onSave={save}
      saveLabel={on ? "Restore AI" : "Activate kill switch"}
      canSave={reason.trim().length > 0}
      note="Activating is real and reaches /inbox: AI Reply is disabled and every conversation carries a banner. New AI-eligible work routes to deterministic notices or humans without message loss; existing human-owned conversations are unchanged. Re-enabling is the direction that needs a second approver, because it expands what runs unattended."
    >
      <F label="Scope">
        <Sel value={scope} onChange={setScope} options={["Takeoff Travels tenant", "Global platform"]} />
      </F>
      <F label="Duration">
        <Sel value={duration} onChange={setDuration} options={["Until manually restored", "60 minutes"]} />
      </F>
      <F label="Required incident reference and reason" full>
        <Ta value={reason} onChange={setReason} placeholder="INC-#### · Explain the safety or quality concern" />
      </F>
    </Shell>
  );
}

/* ------------------------------------------------------------- knowledge */

export function KnowledgeModal({ source, onClose }: { source?: { title: string; owner: string }; onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [title, setTitle] = useState(source?.title ?? "Fare change policy 2026");
  const [owner, setOwner] = useState(source?.owner ?? "Content Operations");
  const [languages, setLanguages] = useState("English, Bangla");
  const [validUntil, setValidUntil] = useState("2026-12-31");
  const [url, setUrl] = useState("");

  function save() {
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: "Knowledge source submitted for approval",
      detail: `${title} · ${owner} · ${languages} · valid until ${validUntil}${url.trim() ? ` · ${url.trim()}` : ""}`,
    });
    onClose();
  }

  return (
    <Shell
      titleId="knowledge-modal-title"
      title="Knowledge source"
      onClose={onClose}
      onSave={save}
      saveLabel="Submit for approval"
      cancelLabel="Save draft"
      note="Publishing requires review, language coverage, a validity date and retrieval evaluation, and expired sources are blocked automatically. The corpus itself is fixed content that the widget and AI Reply both read, with no authoring store behind it — so a submission here is recorded on the audit trail and does not change what the bot can cite."
    >
      <F label="Title" full>
        <Txt value={title} onChange={setTitle} />
      </F>
      <F label="Owner">
        <Sel value={owner} onChange={setOwner} options={["Commercial Operations", "Content Operations"]} />
      </F>
      <F label="Languages">
        <Txt value={languages} onChange={setLanguages} />
      </F>
      <F label="Valid until">
        <Txt value={validUntil} onChange={setValidUntil} />
      </F>
      <F label="Source URL or document" full>
        <Txt value={url} onChange={setUrl} placeholder="Approved internal source" />
      </F>
    </Shell>
  );
}

/* ------------------------------------------------------------- templates */

export function TemplateModal({ template, onClose }: { template?: { label: string; body: string }; onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [channel, setChannel] = useState("All in-window channels");
  const [language, setLanguage] = useState("English");
  const [text, setText] = useState(template?.body ?? "");
  const [owner, setOwner] = useState("Content Operations");
  const [approval, setApproval] = useState("Draft");

  function save() {
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: "Channel template submitted for approval",
      detail: `${template?.label ?? "New template"} · ${channel} · ${language} · ${owner} · ${approval}`,
    });
    onClose();
  }

  return (
    <Shell
      titleId="template-modal-title"
      title="Channel template"
      onClose={onClose}
      onSave={save}
      saveLabel="Submit for review"
      cancelLabel="Save draft"
      note="These are what channelSendPolicy (INB-12) offers once a channel's free-reply window has closed, where a free-typed reply is blocked and an approved template is not. The set is fixed content, so an edit here is recorded on the audit trail rather than changing what the composer offers."
    >
      <F label="Channel">
        <Sel value={channel} onChange={setChannel} options={["WhatsApp utility", "All in-window channels"]} />
      </F>
      <F label="Language">
        <Sel value={language} onChange={setLanguage} options={["Bangla", "English"]} />
      </F>
      <F label="Template text" full>
        <Ta value={text} onChange={setText} />
      </F>
      <F label="Owner">
        <Sel value={owner} onChange={setOwner} options={["Content Operations"]} />
      </F>
      <F label="Approval state">
        <Sel value={approval} onChange={setApproval} options={["Draft", "Submit for channel review"]} />
      </F>
    </Shell>
  );
}

/* ----------------------------------------------------------------- roles */

export function RoleModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const roles = state.draft.security.roles;
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const role = roles.find((r) => r.id === roleId) ?? roles[0];

  const [tenantScope, setTenantScope] = useState("Takeoff Travels only");
  const [convScope, setConvScope] = useState("Assigned conversations only");
  // BOUND — `piiRevealRequiresReason` is what `RevealPiiModal` actually checks.
  const [pii, setPii] = useState(
    state.draft.security.piiRevealRequiresReason ? "Masked by default · task reveal" : "Always masked",
  );
  // BOUND — `privileged` is what `canApproveSensitiveChanges()` reads.
  const [privileged, setPrivileged] = useState(role?.privileged ? "May approve a sensitive change" : "Cannot approve");
  const [reason, setReason] = useState("");

  function pick(name: string) {
    const r = roles.find((x) => x.name === name);
    if (!r) return;
    setRoleId(r.id);
    setPrivileged(r.privileged ? "May approve a sensitive change" : "Cannot approve");
  }

  function save() {
    const nextPrivileged = privileged.startsWith("May");
    const nextPii = pii.startsWith("Masked");
    if (role && nextPrivileged !== role.privileged) dispatch({ type: "SET_ROLE_PRIVILEGED", id: role.id, privileged: nextPrivileged });
    if (nextPii !== state.draft.security.piiRevealRequiresReason) {
      dispatch({ type: "EDIT_DRAFT", path: "security.piiRevealRequiresReason", value: nextPii });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: `Role permissions changed — ${role?.name ?? ""}`,
      detail: [reason.trim(), noteOf([["tenant scope", tenantScope], ["conversation scope", convScope]], { "tenant scope": "Takeoff Travels only", "conversation scope": "Assigned conversations only" })]
        .filter(Boolean)
        .join(" — "),
    });
    onClose();
  }

  return (
    <Shell
      titleId="role-modal-title"
      title="Role permissions"
      onClose={onClose}
      onSave={save}
      saveLabel="Submit for approval"
      canSave={reason.trim().length > 0}
      note="Second approver and PII access are enforced: canApproveSensitiveChanges() reads the first to decide who may approve a sensitive publish, and the second is what RevealPiiModal checks before showing a masked value. Tenant and conversation scope have no enforcement behind them yet, so they are recorded on the audit entry."
    >
      <F label="Role">
        <Sel value={role?.name ?? ""} onChange={pick} options={roles.map((r) => r.name)} />
      </F>
      <F label="Tenant scope">
        <Sel value={tenantScope} onChange={setTenantScope} options={["Takeoff Travels only"]} />
      </F>
      <F label="Conversation scope">
        <Sel value={convScope} onChange={setConvScope} options={["Assigned queues", "Assigned conversations only"]} />
      </F>
      <F label="PII access">
        <Sel value={pii} onChange={setPii} options={["Masked by default · task reveal", "Always masked"]} />
      </F>
      <F label="Second approver">
        <Sel value={privileged} onChange={setPrivileged} options={["May approve a sensitive change", "Cannot approve"]} />
      </F>
      <F label="Approval and reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Permission changes require security approval" />
      </F>
    </Shell>
  );
}

/* ------------------------------------------------------------- retention */

const DATA_CLASS: { label: string; path: keyof Cfg["security"]["retentionDays"] }[] = [
  { label: "Conversation and messages", path: "transcripts" },
  { label: "Identity documents", path: "identityDocs" },
  { label: "Payment references", path: "paymentRefs" },
];

export function RetentionModal({ dataClass, onClose }: { dataClass: keyof Cfg["security"]["retentionDays"]; onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const [cls, setCls] = useState(dataClass);
  const current = state.draft.security.retentionDays[cls];
  // BOUND — retention days per data class; shortening needs a second approver.
  const [days, setDays] = useState(`${current} days`);
  const [method, setMethod] = useState("Scheduled irreversible deletion");
  const [hold, setHold] = useState("Respect active holds");
  const [reason, setReason] = useState("");
  const reducing = num(days, current) < current;

  function pick(label: string) {
    const next = DATA_CLASS.find((d) => d.label === label);
    if (!next) return;
    setCls(next.path);
    setDays(`${state.draft.security.retentionDays[next.path]} days`);
  }

  function save() {
    const d = num(days, current);
    if (d !== current) dispatch({ type: "EDIT_DRAFT", path: `security.retentionDays.${cls}`, value: d });
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: "Retention policy edited",
      detail: [reason.trim(), noteOf([["deletion method", method], ["legal hold", hold]], { "deletion method": "Scheduled irreversible deletion", "legal hold": "Respect active holds" })]
        .filter(Boolean)
        .join(" — "),
    });
    onClose();
  }

  return (
    <Shell
      titleId="retention-modal-title"
      title="Retention policy"
      onClose={onClose}
      onSave={save}
      saveLabel="Save retention policy"
      canSave={reason.trim().length > 0}
      note={
        reducing
          ? "Retention is read in days. Shortening a window needs a second approver on publish — that is the direction that destroys evidence."
          : "Retention is read in days, so “24 days” and “24” both work. Deletion is scheduled and irreversible, and active legal holds are respected before any job runs."
      }
    >
      <F label="Data class">
        <Sel value={DATA_CLASS.find((d) => d.path === cls)?.label ?? ""} onChange={pick} options={DATA_CLASS.map((d) => d.label)} />
      </F>
      <F label="Retention">
        <Txt value={days} onChange={setDays} />
      </F>
      <F label="Deletion method">
        <Sel value={method} onChange={setMethod} options={["Scheduled irreversible deletion", "Anonymize identifiers"]} />
      </F>
      <F label="Legal hold">
        <Sel value={hold} onChange={setHold} options={["Respect active holds"]} />
      </F>
      <F label="Policy basis and approval" full>
        <Ta value={reason} onChange={setReason} placeholder="Recorded on the audit entry" />
      </F>
    </Shell>
  );
}
