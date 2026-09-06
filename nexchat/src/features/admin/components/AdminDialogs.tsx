"use client";

import { useState } from "react";
import { YOU } from "@/shared/lib/people";
import { useTenantConfig } from "../context/TenantConfigContext";
import { canApproveSensitiveChanges, SECOND_APPROVER, type AuditEntry } from "../engine/tenantConfigEngine";
import { F, Sel, Shell, Ta, Txt, noteOf } from "./AdminModals";
import { Pill } from "../mockup/Primitives";
import { Check, Checklist, SectionNote } from "../mockup/ConsoleShapes";
import { useNow } from "@/features/inbox/engine/useCountdown";

/**
 * The dialogs `preview (3).html` adds to `#adminView` on top of the eight in
 * `AdminModals.tsx`: the tenant profile, identity and lifecycle policies, the
 * channel emergency stop, routing simulation and escalation matrix, teams and
 * access review, AI policy, integrations, commercial controls, feature
 * rollout, budget, security and data policy, legal hold, data requests,
 * break-glass, rollback, the audit-event viewer, the sandbox test runner and
 * the privileged-change approval review.
 *
 * Same contract as `AdminModals.tsx`, and the same `Shell`: every field the
 * mockup draws is a real control, a field with tenant config behind it writes
 * through `EDIT_DRAFT` on save so it reaches `diffDraft`, the publish modal
 * and the approval gate, and a field with no store behind it is folded into
 * the audit entry rather than discarded when the dialog closes.
 *
 * `BOUND` marks the first kind.
 */

/** Leading number out of "BDT 25,000" / "30 minutes" / "0.85". */
const num = (s: string, fallback: number) => {
  const n = Number.parseFloat(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const bdt = (n: number) => `BDT ${n.toLocaleString("en-US")}`;

/* --------------------------------------------------------- tenant & brand */

export function TenantProfileModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const d = state.draft;

  const [org, setOrg] = useState(`${d.brand.brandName} Ltd.`);
  // BOUND — `brand.brandName` is read by the widget header, the greeting and
  // every automated reply, so this is the one field here that moves the app.
  const [supportName, setSupportName] = useState(d.brand.brandName);
  const [email, setEmail] = useState("support@takeofftravels.com");
  const [phone, setPhone] = useState("+880 9606-••••••");
  const [locale, setLocale] = useState("English (Bangladesh)");
  // BOUND — `brand.supportedLanguages`.
  const [languages, setLanguages] = useState(d.brand.supportedLanguages.join("; "));
  const [owner, setOwner] = useState("Samira Ahmed");
  const [duty, setDuty] = useState("OPS-SUPPORT · 24 × 7 roster");
  const [greeting, setGreeting] = useState(
    `Welcome to ${d.brand.brandName}. I can help with your booking, flight status, ticket, payment, or connect you with a support specialist.`,
  );
  const [reason, setReason] = useState("");

  function save() {
    const langs = languages.split(";").map((s) => s.trim()).filter(Boolean);
    if (supportName.trim() && supportName !== d.brand.brandName) {
      dispatch({ type: "EDIT_DRAFT", path: "brand.brandName", value: supportName.trim() });
    }
    if (langs.length && langs.join("; ") !== d.brand.supportedLanguages.join("; ")) {
      dispatch({ type: "EDIT_DRAFT", path: "brand.supportedLanguages", value: langs });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Tenant profile edited",
      detail: noteOf(
        [
          ["Legal organisation", org],
          ["Support email", email],
          ["Support phone", phone],
          ["Default locale", locale],
          ["Tenant owner", owner],
          ["Duty contact", duty],
          ["Greeting", greeting],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      wide
      titleId="tenant-profile-modal"
      title="Tenant and brand profile"
      note="Tenant ID, isolation key and production data region cannot be edited here. Brand changes are previewed in sandbox before they are added to a release."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Preview & add to draft"
    >
      <F label="Legal organisation">
        <Txt value={org} onChange={setOrg} />
      </F>
      <F label="Customer-facing support name">
        <Txt value={supportName} onChange={setSupportName} />
      </F>
      <F label="Tenant ID">
        <Txt value="TT-BD-PROD-01" readOnly />
      </F>
      <F label="Tenant slug">
        <Txt value="takeoff-travels" readOnly />
      </F>
      <F label="Primary support email">
        <Txt value={email} onChange={setEmail} />
      </F>
      <F label="Verified support phone">
        <Txt value={phone} onChange={setPhone} />
      </F>
      <F label="Default locale">
        <Sel value={locale} onChange={setLocale} options={["English (Bangladesh)", "বাংলা (বাংলাদেশ)"]} />
      </F>
      <F label="Supported languages">
        <Txt value={languages} onChange={setLanguages} />
      </F>
      <F label="Tenant timezone">
        <Sel value="Asia/Dhaka · UTC+06:00" onChange={() => {}} options={["Asia/Dhaka · UTC+06:00"]} />
      </F>
      <F label="Operating currency">
        <Sel value="BDT · Bangladeshi Taka" onChange={() => {}} options={["BDT · Bangladeshi Taka"]} />
      </F>
      <F label="Tenant owner">
        <Sel value={owner} onChange={setOwner} options={["Samira Ahmed", "Nayeem Karim"]} />
      </F>
      <F label="Duty contact">
        <Txt value={duty} onChange={setDuty} />
      </F>
      <F label="Greeting copy · English" full>
        <Ta value={greeting} onChange={setGreeting} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required for the versioned configuration record" />
      </F>
    </Shell>
  );
}

export function IdentityPolicyModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [verification, setVerification] = useState("Account login, OTP, or verified booking attribute");
  const [possible, setPossible] = useState("Create human review task");
  const [otp, setOtp] = useState("6 digits · 5 min · 5 attempts/hour");
  const [booking, setBooking] = useState("PNR + surname + verified contact");
  const [autoMerge, setAutoMerge] = useState("Prohibited");
  const [reversal, setReversal] = useState("Enabled · audited split");
  const [reason, setReason] = useState(
    "Maintain verified cross-channel continuation without risking shared-device or similar-name collisions.",
  );

  return (
    <Shell
      titleId="identity-policy-modal"
      title="Customer identity and channel-linking policy"
      note="Every merge and split records verification method, actor, before/after lineage and reason. Tenant boundaries can never be crossed."
      onClose={onClose}
      canSave={reason.trim().length > 0}
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Identity policy edited",
          detail: noteOf(
            [
              ["Permitted verification", verification],
              ["Possible-match handling", possible],
              ["OTP policy", otp],
              ["Booking verification", booking],
              ["Automatic merge", autoMerge],
              ["Merge reversal", reversal],
              ["Reason", reason],
            ],
            {},
          ),
        });
        onClose();
      }}
      saveLabel="Add to draft"
    >
      <F label="Permitted verification">
        <Sel
          value={verification}
          onChange={setVerification}
          options={["Account login, OTP, or verified booking attribute", "OTP only", "Account login only"]}
        />
      </F>
      <F label="Possible-match handling">
        <Sel value={possible} onChange={setPossible} options={["Create human review task", "Keep identities separate"]} />
      </F>
      <F label="OTP policy">
        <Txt value={otp} onChange={setOtp} />
      </F>
      <F label="Booking verification">
        <Txt value={booking} onChange={setBooking} />
      </F>
      <F label="Automatic name/device merge">
        <Sel value={autoMerge} onChange={setAutoMerge} options={["Prohibited", "Allowed with review"]} />
      </F>
      <F label="Merge reversal">
        <Sel value={reversal} onChange={setReversal} options={["Enabled · audited split", "Disabled"]} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required for the versioned configuration record" />
      </F>
    </Shell>
  );
}

export function ConversationDefaultsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const d = state.draft;
  // BOUND — `sla.reopenWindowHours` is what `reopen.ts` actually enforces.
  const [reopen, setReopen] = useState(`${Math.round(d.sla.reopenWindowHours / 24)} days`);
  const [closed, setClosed] = useState("After reopen window");
  const [reminder, setReminder] = useState("24 hours");
  const [maxReminders, setMaxReminders] = useState("2");
  const [idle, setIdle] = useState("7 days");
  const [spam, setSpam] = useState("30 days");
  const [snooze, setSnooze] = useState("Named owner + wake condition + deadline");
  const [ownership, setOwnership] = useState("Previous eligible owner, then queue");
  const [reason, setReason] = useState("");

  function save() {
    const hours = Math.round(num(reopen, d.sla.reopenWindowHours / 24) * 24);
    if (hours > 0 && hours !== d.sla.reopenWindowHours) {
      dispatch({ type: "EDIT_DRAFT", path: "sla.reopenWindowHours", value: hours });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Conversation defaults edited",
      detail: noteOf(
        [
          ["Reopen window", reopen],
          ["Resolved to closed", closed],
          ["Waiting-customer reminder", reminder],
          ["Maximum reminders", maxReminders],
          ["Idle unresolved review", idle],
          ["Spam close", spam],
          ["Snooze requirement", snooze],
          ["Reopen ownership", ownership],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      titleId="conversation-defaults-modal"
      title="Conversation lifecycle defaults"
      note="Queue-specific SLA and legal requirements override lifecycle convenience settings. Closing a conversation never deletes its immutable event history."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Add to draft"
    >
      <F label="Reopen window">
        <Txt value={reopen} onChange={setReopen} />
      </F>
      <F label="Resolved → closed">
        <Txt value={closed} onChange={setClosed} />
      </F>
      <F label="Waiting-customer reminder">
        <Txt value={reminder} onChange={setReminder} />
      </F>
      <F label="Maximum reminders">
        <Txt value={maxReminders} onChange={setMaxReminders} />
      </F>
      <F label="Idle unresolved review">
        <Txt value={idle} onChange={setIdle} />
      </F>
      <F label="Spam close">
        <Txt value={spam} onChange={setSpam} />
      </F>
      <F label="Snooze requirement">
        <Sel
          value={snooze}
          onChange={setSnooze}
          options={["Named owner + wake condition + deadline", "Deadline only"]}
        />
      </F>
      <F label="Reopen ownership">
        <Sel value={ownership} onChange={setOwnership} options={["Previous eligible owner, then queue", "Queue only"]} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required for audit and release review" />
      </F>
    </Shell>
  );
}

/* -------------------------------------------------------------- channels */

export function ChannelStopModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const live = state.draft.brand.channels.filter((c) => c.connected);
  const [channelId, setChannelId] = useState(live[0]?.id ?? state.draft.brand.channels[0].id);
  const [mode, setMode] = useState("Pause outbound; accept inbound");
  const [duration, setDuration] = useState("60 minutes");
  const [fallback, setFallback] = useState("Channel delivery exception");
  const [reason, setReason] = useState("");
  const label = (id: string) => state.draft.brand.channels.find((c) => c.id === id)?.label ?? id;

  function save() {
    // BOUND — pausing a channel is `brand.channels.<id>.enabled = false`, the
    // same flag `TicketFilterBar` and the composer's send policy read. The
    // mockup's dialog only raises a toast; here the channel really goes dark.
    dispatch({ type: "EDIT_DRAFT", path: `brand.channels.${channelId}.enabled`, value: false });
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Channel emergency stop",
      detail: noteOf(
        [
          ["Channel", label(channelId)],
          ["Stop mode", mode],
          ["Duration", duration],
          ["Fallback route", fallback],
          ["Incident and reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      titleId="channel-stop-modal"
      title="Channel emergency stop"
      intro={
        <SectionNote tone="red" label="Live customer impact">
          Inbound messages stay recorded. Outbound delivery is paused only for the selected tenant and channel; queued sends
          remain visible for recovery.
        </SectionNote>
      }
      onClose={onClose}
      onSave={save}
      danger
      canSave={reason.trim().length > 0}
      saveLabel="Pause channel outbound"
    >
      <F label="Channel">
        <select
          value={channelId}
          onChange={(e) => setChannelId(e.target.value as typeof channelId)}
          className="h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink focus:border-coral focus:outline-none"
        >
          {state.draft.brand.channels.map((c) => (
            <option key={c.id} value={c.id} className="bg-footer">
              {c.label}
              {c.enabled ? "" : " · already paused"}
            </option>
          ))}
        </select>
      </F>
      <F label="Stop mode">
        <Sel value={mode} onChange={setMode} options={["Pause outbound; accept inbound", "Pause new sessions only"]} />
      </F>
      <F label="Duration">
        <Sel value={duration} onChange={setDuration} options={["60 minutes", "Until manually restored", "4 hours"]} />
      </F>
      <F label="Fallback route">
        <Sel value={fallback} onChange={setFallback} options={["Channel delivery exception", "Standard support"]} />
      </F>
      <F label="Incident reference and reason" full>
        <Ta value={reason} onChange={setReason} placeholder="INC-#### · Required for immediate production action" />
      </F>
    </Shell>
  );
}

/* ------------------------------------------------------ queues & routing */

export function RoutingSimulationModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [config, setConfig] = useState("Draft · routing policy v13");
  const [pack, setPack] = useState("10,000 seeded conversations · Eid/disruption mix");
  const [roster, setRoster] = useState("Current certified roster + scheduled shifts");

  return (
    <Shell
      wide
      titleId="routing-simulation-modal"
      title="Workload-aware routing simulation"
      note="Evidence records the exact configuration, roster snapshot, seed, candidate counts, effective weights, selections and deviations."
      onClose={onClose}
      cancelLabel="Close"
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Routing simulation rerun",
          detail: noteOf([["Configuration", config], ["Scenario pack", pack], ["Roster", roster]], {}),
        });
        onClose();
      }}
      saveLabel="Rerun & attach evidence"
      extra={
        <Checklist>
          <Check
            title="Hard eligibility"
            detail="No assignment crossed tenant, queue, skill, language, channel, state or capacity boundaries."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            title="Weighted distribution"
            detail="Observed share remained within the approved tolerance for each eligible cohort."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            title="Capacity and workload"
            detail="At-capacity agents were excluded; pending tasks contributed half-weight to load."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            title="Aging and recovery"
            detail="No starvation; reject, timeout, disconnect and requeue preserved original SLA age."
            trailing={<Pill tone="green">Passed</Pill>}
          />
        </Checklist>
      }
    >
      <F label="Configuration">
        <Sel value={config} onChange={setConfig} options={["Draft · routing policy v13", "Published · policy v12"]} />
      </F>
      <F label="Scenario pack">
        <Sel
          value={pack}
          onChange={setPack}
          options={[
            "10,000 seeded conversations · Eid/disruption mix",
            "Standard business day",
            "No-eligible-agent failures",
          ]}
        />
      </F>
      <F label="Agent roster">
        <Sel value={roster} onChange={setRoster} options={["Current certified roster + scheduled shifts"]} />
      </F>
      <F label="Deterministic seed">
        <Txt value="TT-ROUTE-20260903-04" readOnly />
      </F>
    </Shell>
  );
}

export function EscalationMatrixModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [trigger, setTrigger] = useState("P0 · no eligible agent");
  const [delay, setDelay] = useState("0 seconds");
  const [recipients, setRecipients] = useState("Finance Duty; tenant incident commander");
  const [routes, setRoutes] = useState("In-app; Pager; Email");
  const [repeat, setRepeat] = useState("Every 5 minutes until resolved");
  const [resolution, setResolution] = useState("When an eligible owner accepts");
  const [reason, setReason] = useState("");

  return (
    <Shell
      titleId="escalation-matrix-modal"
      title="Routing escalation matrix"
      note="Escalation may notify and recommend an intervention; it never bypasses tenant, skill, capacity or restricted-data eligibility."
      onClose={onClose}
      canSave={reason.trim().length > 0}
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Escalation matrix edited",
          detail: noteOf(
            [
              ["Trigger", trigger],
              ["Initial delay", delay],
              ["Recipients", recipients],
              ["Notification routes", routes],
              ["Repeat", repeat],
              ["Auto-resolution", resolution],
              ["Reason", reason],
            ],
            {},
          ),
        });
        onClose();
      }}
      saveLabel="Add to draft"
    >
      <F label="Trigger">
        <Sel
          value={trigger}
          onChange={setTrigger}
          options={[
            "P0 · no eligible agent",
            "P1 · no eligible agent after 60s",
            "Three expired offers",
            "Queue surge threshold",
          ]}
        />
      </F>
      <F label="Initial delay">
        <Txt value={delay} onChange={setDelay} />
      </F>
      <F label="Recipients">
        <Txt value={recipients} onChange={setRecipients} />
      </F>
      <F label="Notification routes">
        <Txt value={routes} onChange={setRoutes} />
      </F>
      <F label="Repeat">
        <Sel value={repeat} onChange={setRepeat} options={["Every 5 minutes until resolved", "Once"]} />
      </F>
      <F label="Auto-resolution">
        <Sel value={resolution} onChange={setResolution} options={["When an eligible owner accepts", "Manual acknowledgement"]} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; identify the staffing or risk policy" />
      </F>
    </Shell>
  );
}

/* ---------------------------------------------------------- team & access */

export function TeamModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const queueNames = state.draft.queues.queues.map((q) => q.name).join("; ");
  const [team, setTeam] = useState("Customer Care");
  const [lead, setLead] = useState(SECOND_APPROVER);
  const [queues, setQueues] = useState(queueNames);
  const [calendar, setCalendar] = useState("Bangladesh support");
  const [surge, setSurge] = useState(state.draft.queues.surgeRosterEnabled ? "Disruption surge team" : "Not assigned");
  const [seats, setSeats] = useState("8");
  const [owner, setOwner] = useState("Workforce Planning");
  const [reason, setReason] = useState("");

  function save() {
    // BOUND — assigning a team to the surge roster is `queues.surgeRosterEnabled`,
    // the flag `routing.ts` reads when disruption capacity is short.
    const wantSurge = surge !== "Not assigned";
    if (wantSurge !== state.draft.queues.surgeRosterEnabled) {
      dispatch({ type: "EDIT_DRAFT", path: "queues.surgeRosterEnabled", value: wantSurge });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Team configuration edited",
      detail: noteOf(
        [
          ["Team", team],
          ["Team lead", lead],
          ["Permitted queues", queues],
          ["Primary calendar", calendar],
          ["Surge roster", surge],
          ["Minimum staffed seats", seats],
          ["Coverage owner", owner],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      titleId="team-modal"
      title="Team and coverage configuration"
      note="Team membership grants only potential queue access. Each person must still satisfy role, current certification, language, channel, availability and capacity requirements."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Add to draft"
    >
      <F label="Team">
        <Sel value={team} onChange={setTeam} options={["Customer Care", "Disruption response", "Finance operations"]} />
      </F>
      <F label="Team lead">
        <Sel value={lead} onChange={setLead} options={[SECOND_APPROVER, YOU]} />
      </F>
      <F label="Permitted queues" full>
        <Txt value={queues} onChange={setQueues} />
      </F>
      <F label="Primary calendar">
        <Sel value={calendar} onChange={setCalendar} options={["Bangladesh support", "Operations 24 × 7"]} />
      </F>
      <F label="Surge roster">
        <Sel value={surge} onChange={setSurge} options={["Not assigned", "Disruption surge team"]} />
      </F>
      <F label="Minimum staffed seats">
        <Txt value={seats} onChange={setSeats} />
      </F>
      <F label="Coverage owner">
        <Txt value={owner} onChange={setOwner} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required for team, queue or coverage changes" />
      </F>
    </Shell>
  );
}

export function AccessReviewModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const privileged = state.draft.security.roles.filter((r) => r.privileged);
  const inScope = state.draft.security.roleAssignments.filter((a) =>
    privileged.some((r) => r.id === a.roleId),
  ).length;
  const [due, setDue] = useState("2026-09-15");
  const [owner, setOwner] = useState("Farhan Ali · Security");

  return (
    <Shell
      titleId="access-review-modal"
      title="Quarterly privileged-access review"
      onClose={onClose}
      cancelLabel="Save progress"
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Privileged-access review completed",
          detail: noteOf([["Period", "Q3 2026"], ["Due", due], ["Owner", owner], ["Population", `${inScope} accounts`]], {}),
        });
        onClose();
      }}
      saveLabel="Complete review"
      extra={
        <Checklist>
          <Check
            title={`${privileged.length} privileged role${privileged.length === 1 ? "" : "s"} defined`}
            detail={`${privileged.map((r) => r.name).join(", ") || "None"} — the roles \`canApproveSensitiveChanges\` accepts as a second approver.`}
            trailing={<Pill tone="green">Reviewed</Pill>}
          />
          <Check
            tone={inScope > 0 ? "green" : "amber"}
            title={`${inScope} account${inScope === 1 ? "" : "s"} hold one`}
            detail="Employment active · SSO/MFA verified · no dormant account."
            trailing={<Pill tone={inScope > 0 ? "green" : "amber"}>{inScope > 0 ? "Reviewed" : "No approver"}</Pill>}
          />
          <Check
            tone={state.breakGlass ? "amber" : "green"}
            title="Break-glass grants"
            detail={
              state.breakGlass
                ? `${state.breakGlass.person} holds an active grant — “${state.breakGlass.reason}”.`
                : "No active grant. Independent checker status and incident contact verified."
            }
            trailing={<Pill tone={state.breakGlass ? "amber" : "green"}>{state.breakGlass ? "1 active" : "Reviewed"}</Pill>}
          />
        </Checklist>
      }
    >
      <F label="Review period">
        <Txt value="Q3 2026" readOnly />
      </F>
      <F label="Due date">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink focus:border-coral focus:outline-none"
        />
      </F>
      <F label="Population">
        <Txt value={`${inScope} privileged accounts`} readOnly />
      </F>
      <F label="Review owner">
        <Sel value={owner} onChange={setOwner} options={["Farhan Ali · Security", "Samira Ahmed · Tenant owner"]} />
      </F>
    </Shell>
  );
}

/* ----------------------------------------------------------- AI & content */

export function AiPolicyModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const bands = state.draft.ai.confidence;
  const [release, setRelease] = useState("trv-ai-2026.08 · policy v17");
  // BOUND — `ai.knowledgeVersion` is what AI Reply is allowed to cite.
  const [snapshot, setSnapshot] = useState(state.draft.ai.knowledgeVersion);
  // BOUND — the three bands `confidenceBand()` resolves every score against.
  const [high, setHigh] = useState(bands.high.toFixed(2));
  const [guarded, setGuarded] = useState(bands.guarded.toFixed(2));
  const [clarify, setClarify] = useState(bands.clarify.toFixed(2));
  const [budget, setBudget] = useState("2 unsuccessful turns maximum");
  const [grounding, setGrounding] = useState("Current approved citation required");
  const [ownership, setOwnership] = useState("Silence all automated outbound");
  // BOUND — `ai.allowedIntents` is the server-side tool allowlist.
  const [tools, setTools] = useState(state.draft.ai.allowedIntents.join("; "));
  const [triggers, setTriggers] = useState(
    "Explicit human request; payment captured without ticket; fraud/account takeover; safety/legal/media threat; involuntary disruption decision; authority exceeded; repeated tool failure; missing/conflicting policy; repeated task failure.",
  );
  const [reason, setReason] = useState("");

  function save() {
    const h = num(high, bands.high);
    const g = num(guarded, bands.guarded);
    const c = num(clarify, bands.clarify);
    if (h !== bands.high) dispatch({ type: "EDIT_DRAFT", path: "ai.confidence.high", value: h });
    if (g !== bands.guarded) dispatch({ type: "EDIT_DRAFT", path: "ai.confidence.guarded", value: g });
    if (c !== bands.clarify) dispatch({ type: "EDIT_DRAFT", path: "ai.confidence.clarify", value: c });
    if (snapshot.trim() && snapshot !== state.draft.ai.knowledgeVersion) {
      dispatch({ type: "EDIT_DRAFT", path: "ai.knowledgeVersion", value: snapshot.trim() });
    }
    const intents = tools.split(";").map((s) => s.trim()).filter(Boolean);
    if (intents.length && intents.join("; ") !== state.draft.ai.allowedIntents.join("; ")) {
      dispatch({ type: "EDIT_DRAFT", path: "ai.allowedIntents", value: intents });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "AI policy edited",
      detail: noteOf(
        [
          ["Production release", release],
          ["Clarification budget", budget],
          ["Grounding", grounding],
          ["Human ownership", ownership],
          ["Hard handoff triggers", triggers],
          ["Reason and evidence", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      wide
      titleId="ai-policy-modal"
      title="AI policy, authority and release"
      note="Expanding AI side-effect scope requires independent AI Governance and Operations approval. Model output never authorises a side effect; the policy service and domain tool enforce it."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Submit for approval"
      secondary={{
        label: "Run evaluation",
        onClick: () =>
          dispatch({
            type: "RECORD_AUDIT",
            actor: YOU,
            action: "AI policy evaluated in sandbox",
            detail: `Bands ${high} / ${guarded} / ${clarify} against snapshot ${snapshot}`,
          }),
      }}
    >
      <F label="Production release">
        <Sel value={release} onChange={setRelease} options={["trv-ai-2026.08 · policy v17", "trv-ai-2026.07 · policy v16"]} />
      </F>
      <F label="Knowledge snapshot">
        <Txt value={snapshot} onChange={setSnapshot} />
      </F>
      <F label="High-confidence floor">
        <Txt value={high} onChange={setHigh} />
      </F>
      <F label="Guarded floor">
        <Txt value={guarded} onChange={setGuarded} />
      </F>
      <F label="Clarification floor">
        <Txt value={clarify} onChange={setClarify} />
      </F>
      <F label="Clarification budget">
        <Txt value={budget} onChange={setBudget} />
      </F>
      <F label="Grounding requirement">
        <Sel value={grounding} onChange={setGrounding} options={["Current approved citation required", "Citation optional"]} />
      </F>
      <F label="Human ownership behavior">
        <Sel value={ownership} onChange={setOwnership} options={["Silence all automated outbound", "Allow suggestions only"]} />
      </F>
      <F label="Allowed read-only tools" full>
        <Txt value={tools} onChange={setTools} />
      </F>
      <F label="Prohibited side effects" full>
        <Txt
          value="Refund approval; cancellation; booking change commit; ticket-state assertion; credential collection"
          readOnly
        />
      </F>
      <F label="Hard handoff triggers" full>
        <Ta value={triggers} onChange={setTriggers} />
      </F>
      <F label="Change reason and evaluation evidence" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; include approved evaluation ID and rollback release" />
      </F>
    </Shell>
  );
}

/* -------------------------------------------------- integrations & commerce */

export function IntegrationModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [integration, setIntegration] = useState("Air inventory gateway");
  const [environment, setEnvironment] = useState("Production");
  const [endpoint, setEndpoint] = useState("https://partner-api.example.com/v2");
  const [auth, setAuth] = useState("mTLS + OAuth 2.0 client credentials");
  const [replacement, setReplacement] = useState("");
  const [timeout, setTimeoutV] = useState("30 seconds");
  const [rate, setRate] = useState("300 requests/minute");
  const [retry, setRetry] = useState("3 bounded attempts · exponential backoff");
  const [idempotency, setIdempotency] = useState("Required for all write operations");
  const [owner, setOwner] = useState("Integration Operations");
  const [failure, setFailure] = useState("Integration exception queue");
  const [reason, setReason] = useState("");

  return (
    <Shell
      wide
      titleId="integration-modal"
      title="Production integration configuration"
      intro={
        <SectionNote label="Secret handling">
          The current credential can be rotated but never retrieved. A replacement remains write-only and activates only after
          a successful overlap test.
        </SectionNote>
      }
      onClose={onClose}
      canSave={reason.trim().length > 0}
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Integration configuration edited",
          detail: noteOf(
            [
              ["Integration", integration],
              ["Environment", environment],
              ["Endpoint", endpoint],
              ["Authentication", auth],
              // Deliberately not the value: a write-only secret must not reach
              // the audit trail either, only the fact that one was supplied.
              ["Credential", replacement ? "Replacement supplied · write-only" : "Unchanged"],
              ["Timeout", timeout],
              ["Rate limit", rate],
              ["Retry policy", retry],
              ["Idempotency", idempotency],
              ["Owner", owner],
              ["Failure route", failure],
              ["Reason", reason],
            ],
            {},
          ),
        });
        onClose();
      }}
      saveLabel="Add to draft"
      secondary={{
        label: "Test connection",
        onClick: () =>
          dispatch({
            type: "RECORD_AUDIT",
            actor: YOU,
            action: "Integration connection tested",
            detail: `${integration} · ${environment} · ${endpoint}`,
          }),
      }}
      extra={
        <Checklist>
          <Check
            title="Sandbox contract suite"
            detail="Schema, authentication, timeout, retry, duplicate, idempotency and failure mapping."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            title="Secret overlap"
            detail="Old and new credentials can coexist through the monitored activation window."
            trailing={<Pill tone="green">Supported</Pill>}
          />
        </Checklist>
      }
    >
      <F label="Integration">
        <Sel
          value={integration}
          onChange={setIntegration}
          options={[
            "Air inventory gateway",
            "Ticket issuance service",
            "Hosted payment gateway",
            "OTP and SMS provider",
            "Analytics event export",
          ]}
        />
      </F>
      <F label="Environment">
        <Sel value={environment} onChange={setEnvironment} options={["Production", "Sandbox"]} />
      </F>
      <F label="Base endpoint" full>
        <Txt value={endpoint} onChange={setEndpoint} />
      </F>
      <F label="Authentication">
        <Sel value={auth} onChange={setAuth} options={["mTLS + OAuth 2.0 client credentials", "Signed API key"]} />
      </F>
      <F label="Current credential">
        <Txt value="Secret v7 · rotated 25 Aug 2026" readOnly />
      </F>
      <F label="Replacement credential" full>
        <input
          type="password"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="Paste once; value will not be shown again"
          className="h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
        />
      </F>
      <F label="Request timeout">
        <Txt value={timeout} onChange={setTimeoutV} />
      </F>
      <F label="Rate limit">
        <Txt value={rate} onChange={setRate} />
      </F>
      <F label="Retry policy">
        <Txt value={retry} onChange={setRetry} />
      </F>
      <F label="Idempotency">
        <Sel value={idempotency} onChange={setIdempotency} options={["Required for all write operations", "Not applicable"]} />
      </F>
      <F label="Operational owner">
        <Sel value={owner} onChange={setOwner} options={["Integration Operations", "Finance Operations"]} />
      </F>
      <F label="Failure route">
        <Sel value={failure} onChange={setFailure} options={["Integration exception queue", "Payment recovery P0"]} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required for version and audit history" />
      </F>
    </Shell>
  );
}

export function CommercialControlsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const ceiling = state.draft.commercial.refundCeilingBdt;
  const [merchant, setMerchant] = useState(`${state.draft.brand.brandName} Ltd.`);
  const [currency, setCurrency] = useState("BDT · Bangladeshi Taka");
  // BOUND — `commercial.refundCeilingBdt`. Raising it is one of the four
  // changes `isSensitiveChange` routes through a second approver.
  const [agentCeiling, setAgentCeiling] = useState(bdt(ceiling));
  const [supervisorCeiling, setSupervisorCeiling] = useState(bdt(ceiling * 3));
  const [above, setAbove] = useState("Finance Duty approval");
  const [partial, setPartial] = useState("Disabled in production");
  const [feeTable, setFeeTable] = useState("FEE-BD-2026-08 · active");
  const [cadence, setCadence] = useState("Daily + event-driven exceptions");
  const [pnt, setPnt] = useState("Immediate P0 assignment");
  const [reason, setReason] = useState("");

  function save() {
    const next = Math.round(num(agentCeiling, ceiling));
    if (next > 0 && next !== ceiling) {
      dispatch({ type: "EDIT_DRAFT", path: "commercial.refundCeilingBdt", value: next });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Commercial controls edited",
      detail: noteOf(
        [
          ["Merchant of record", merchant],
          ["Settlement currency", currency],
          ["Supervisor ceiling", supervisorCeiling],
          ["Above-ceiling route", above],
          ["Partial refunds", partial],
          ["Fee table", feeTable],
          ["Reconciliation cadence", cadence],
          ["Paid-not-ticketed target", pnt],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      wide
      titleId="commercial-controls-modal"
      title="Commercial and financial controls"
      note="Financial authority is enforced by the same server-side policy for AI, agents, supervisors and back-office tools. A configuration label alone cannot move money."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Submit for approval"
    >
      <F label="Merchant of record">
        <Txt value={merchant} onChange={setMerchant} />
      </F>
      <F label="Settlement currency">
        <Sel value={currency} onChange={setCurrency} options={["BDT · Bangladeshi Taka"]} />
      </F>
      <F label="Agent refund preparation ceiling">
        <Txt value={agentCeiling} onChange={setAgentCeiling} />
      </F>
      <F label="Supervisor preparation ceiling">
        <Txt value={supervisorCeiling} onChange={setSupervisorCeiling} />
      </F>
      <F label="Above-ceiling route">
        <Sel value={above} onChange={setAbove} options={["Finance Duty approval", "Tenant owner approval"]} />
      </F>
      <F label="AI refund authority">
        <Txt value="None" readOnly />
      </F>
      <F label="Partial refunds">
        <Sel
          value={partial}
          onChange={setPartial}
          options={["Disabled in production", "Enabled for verified supported suppliers"]}
        />
      </F>
      <F label="Fee table">
        <Sel value={feeTable} onChange={setFeeTable} options={["FEE-BD-2026-08 · active"]} />
      </F>
      <F label="Reconciliation cadence">
        <Sel value={cadence} onChange={setCadence} options={["Daily + event-driven exceptions", "Daily only"]} />
      </F>
      <F label="Paid-not-ticketed target">
        <Txt value={pnt} onChange={setPnt} />
      </F>
      <F label="Change reason and financial policy reference" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; high-risk authority changes need Finance and Security approval" />
      </F>
    </Shell>
  );
}

/**
 * Two of the mockup's four flags are real settings in this app — the email
 * channel and the surge roster — so picking one of those and choosing an
 * exposure writes through to the flag rather than only to the audit note.
 */
const FLAG_PATHS: Record<string, { path: string; on: string }> = {
  "Inbound email workspace": { path: "brand.channels.email.enabled", on: "50% of new email threads" },
  "Disruption surge mode": { path: "queues.surgeRosterEnabled", on: "100% of eligible traffic" },
};

export function FeatureFlagModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [feature, setFeature] = useState("Inbound email workspace");
  const [environment, setEnvironment] = useState("Production");
  const [exposure, setExposure] = useState("50% of new email threads");
  const [audience, setAudience] = useState("Customer Care team");
  const [start, setStart] = useState("2026-09-04T08:00");
  const [end, setEnd] = useState("2026-09-18T18:00");
  const [owner, setOwner] = useState("Support Operations");
  const [rollback, setRollback] = useState("Immediate tenant-level disable");
  const [criteria, setCriteria] = useState(
    "No cross-channel thread loss; no restricted attachment exposure; delivery and queue events reconcile. Stop on any P0 privacy or routing defect.",
  );
  const [reason, setReason] = useState("");

  function save() {
    const bound = FLAG_PATHS[feature];
    if (bound) {
      dispatch({ type: "EDIT_DRAFT", path: bound.path, value: exposure !== "Disabled" && environment === "Production" });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Feature rollout edited",
      detail: noteOf(
        [
          ["Feature", feature],
          ["Environment", environment],
          ["Exposure", exposure],
          ["Audience", audience],
          ["Start", start],
          ["Automatic end", end],
          ["Owner", owner],
          ["Rollback", rollback],
          ["Success and stop criteria", criteria],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  const dtCls =
    "h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink focus:border-coral focus:outline-none";

  return (
    <Shell
      titleId="feature-flag-modal"
      title="Tenant feature rollout"
      note="Feature flags never bypass role, data, channel, financial, supplier or AI authority policy."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Add to draft"
    >
      <F label="Feature">
        <Sel
          value={feature}
          onChange={setFeature}
          options={["Inbound email workspace", "International booking", "Self-service date change", "Disruption surge mode"]}
        />
      </F>
      <F label="Environment">
        <Sel value={environment} onChange={setEnvironment} options={["Production", "Sandbox only"]} />
      </F>
      <F label="Exposure">
        <Sel
          value={exposure}
          onChange={setExposure}
          options={["50% of new email threads", "Named teams only", "100% of eligible traffic", "Disabled"]}
        />
      </F>
      <F label="Audience">
        <Sel value={audience} onChange={setAudience} options={["Customer Care team", "All tenant users"]} />
      </F>
      <F label="Start">
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={dtCls} />
      </F>
      <F label="Automatic end">
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={dtCls} />
      </F>
      <F label="Owner">
        <Sel value={owner} onChange={setOwner} options={["Support Operations", "Product Operations"]} />
      </F>
      <F label="Rollback">
        <Sel value={rollback} onChange={setRollback} options={["Immediate tenant-level disable"]} />
      </F>
      <F label="Success and stop criteria" full>
        <Ta value={criteria} onChange={setCriteria} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; include experiment or rollout reference" />
      </F>
    </Shell>
  );
}

export function BudgetControlsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const current = state.draft.commercial.monthlyBudgetBdt;
  // BOUND — `commercial.monthlyBudgetBdt`.
  const [ceiling, setCeiling] = useState(bdt(current));
  const [ops, setOps] = useState("75%");
  const [finance, setFinance] = useState("90%");
  const [notify, setNotify] = useState("100%");
  const [owner, setOwner] = useState("Samira Ahmed + Finance partner");
  const [behavior, setBehavior] = useState(
    "Preserve inbound, P0/P1 and human routing; pause non-critical backfills",
  );
  const [reason, setReason] = useState("");

  function save() {
    const next = Math.round(num(ceiling, current));
    if (next > 0 && next !== current) {
      dispatch({ type: "EDIT_DRAFT", path: "commercial.monthlyBudgetBdt", value: next });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Tenant budget edited",
      detail: noteOf(
        [
          ["Operations warning", ops],
          ["Finance warning", finance],
          ["Ceiling notification", notify],
          ["Forecast owner", owner],
          ["At-ceiling behavior", behavior],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      titleId="budget-controls-modal"
      title="Tenant usage budget"
      note="A budget ceiling never discards inbound messages, hides work, disables P0/P1 recovery or strands an owned conversation. Overage actions are explicit, reversible and audited."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Submit budget change"
    >
      <F label="Budget period">
        <Txt value="September 2026" readOnly />
      </F>
      <F label="Approved ceiling">
        <Txt value={ceiling} onChange={setCeiling} />
      </F>
      <F label="Operations warning">
        <Txt value={ops} onChange={setOps} />
      </F>
      <F label="Finance warning">
        <Txt value={finance} onChange={setFinance} />
      </F>
      <F label="Ceiling notification">
        <Txt value={notify} onChange={setNotify} />
      </F>
      <F label="Forecast owner">
        <Sel value={owner} onChange={setOwner} options={["Samira Ahmed + Finance partner", "Finance partner only"]} />
      </F>
      <F label="At-ceiling behavior" full>
        <Sel
          value={behavior}
          onChange={setBehavior}
          options={[
            "Preserve inbound, P0/P1 and human routing; pause non-critical backfills",
            "Notify only; no automated pause",
          ]}
        />
      </F>
      <F label="Change reason and finance approval" full>
        <Ta value={reason} onChange={setReason} placeholder="Required for budget changes" />
      </F>
    </Shell>
  );
}

/* --------------------------------------------------------- security & data */

export function SecurityPolicyModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const [idp, setIdp] = useState("Google Workspace SAML");
  const [sync, setSync] = useState("Every 15 minutes");
  // BOUND — `security.mfaRequired` gates privileged actions elsewhere.
  const [privilegedMfa, setPrivilegedMfa] = useState(
    state.draft.security.mfaRequired ? "Required · phishing-resistant preferred" : "Optional",
  );
  const [agentMfa, setAgentMfa] = useState("Required · TOTP permitted");
  const [idle, setIdle] = useState("30 minutes");
  const [absolute, setAbsolute] = useState("12 hours");
  const [stepUp, setStepUp] = useState("15 minutes");
  const [network, setNetwork] = useState("Office or approved VPN · 3 CIDRs");
  const [ranges, setRanges] = useState(
    "10.26.0.0/16 · Corporate VPN; 103.84.••.0/24 · Dhaka office; 203.76.••.0/25 · DR office",
  );
  const [lockout, setLockout] = useState("10 attempts · 30 minutes");
  const [offboarding, setOffboarding] = useState("Immediate session and token revocation");
  const [reason, setReason] = useState("");

  function save() {
    const required = privilegedMfa !== "Optional";
    if (required !== state.draft.security.mfaRequired) {
      dispatch({ type: "EDIT_DRAFT", path: "security.mfaRequired", value: required });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Security policy edited",
      detail: noteOf(
        [
          ["Identity provider", idp],
          ["Directory sync", sync],
          ["Agent MFA", agentMfa],
          ["Idle session timeout", idle],
          ["Absolute session limit", absolute],
          ["Step-up window", stepUp],
          ["Admin network policy", network],
          ["Approved ranges", ranges],
          ["Lockout", lockout],
          ["Offboarding", offboarding],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      wide
      titleId="security-policy-modal"
      title="Tenant security policy"
      note="Tenant security settings cannot weaken platform minimums. Tenant admins cannot view authentication secrets or grant themselves approval authority."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Submit for approval"
    >
      <F label="Federated identity provider">
        <Sel value={idp} onChange={setIdp} options={["Google Workspace SAML", "Microsoft Entra ID"]} />
      </F>
      <F label="Directory sync">
        <Sel value={sync} onChange={setSync} options={["Every 15 minutes", "Hourly"]} />
      </F>
      <F label="Privileged MFA">
        <Sel
          value={privilegedMfa}
          onChange={setPrivilegedMfa}
          options={["Required · phishing-resistant preferred", "Optional"]}
        />
      </F>
      <F label="Agent MFA">
        <Sel value={agentMfa} onChange={setAgentMfa} options={["Required · TOTP permitted", "Optional"]} />
      </F>
      <F label="Idle session timeout">
        <Txt value={idle} onChange={setIdle} />
      </F>
      <F label="Absolute session limit">
        <Txt value={absolute} onChange={setAbsolute} />
      </F>
      <F label="High-risk step-up window">
        <Txt value={stepUp} onChange={setStepUp} />
      </F>
      <F label="Admin network policy">
        <Sel value={network} onChange={setNetwork} options={["Office or approved VPN · 3 CIDRs", "No restriction"]} />
      </F>
      <F label="Approved network ranges" full>
        <Ta value={ranges} onChange={setRanges} />
      </F>
      <F label="Failed sign-in lockout">
        <Txt value={lockout} onChange={setLockout} />
      </F>
      <F label="Offboarding">
        <Sel value={offboarding} onChange={setOffboarding} options={["Immediate session and token revocation"]} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; role escalation and network exceptions need Security approval" />
      </F>
    </Shell>
  );
}

export function DataPolicyModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const [display, setDisplay] = useState("Mask all protected fields");
  const [scope, setScope] = useState("Assigned task only · time-boxed");
  // BOUND — `security.piiRevealRequiresReason` is what `RevealPiiModal` reads.
  const [requirement, setRequirement] = useState(
    state.draft.security.piiRevealRequiresReason ? "Reason + active booking or incident" : "No reason required",
  );
  const [bulk, setBulk] = useState("Prohibited");
  const [redaction, setRedaction] = useState("Redacted by default");
  const [expiry, setExpiry] = useState("24 hours");
  const [download, setDownload] = useState("SSO session + audit event");
  // BOUND — `security.dataResidency`.
  const [region, setRegion] = useState(state.draft.security.dataResidency);
  const [reason, setReason] = useState("");

  function save() {
    const needsReason = requirement !== "No reason required";
    if (needsReason !== state.draft.security.piiRevealRequiresReason) {
      dispatch({ type: "EDIT_DRAFT", path: "security.piiRevealRequiresReason", value: needsReason });
    }
    if (region !== state.draft.security.dataResidency) {
      dispatch({ type: "EDIT_DRAFT", path: "security.dataResidency", value: region });
    }
    dispatch({
      type: "RECORD_AUDIT",
      actor: YOU,
      action: "Protected-data policy edited",
      detail: noteOf(
        [
          ["Default display", display],
          ["Reveal scope", scope],
          ["Bulk reveal", bulk],
          ["Export redaction", redaction],
          ["Export expiry", expiry],
          ["Download policy", download],
          ["Reason", reason],
        ],
        {},
      ),
    });
    onClose();
  }

  return (
    <Shell
      titleId="data-policy-modal"
      title="Protected data and export policy"
      note="Exports record requester, tenant, filters, fields, row count, redaction version, creation, expiry and every download. Secrets and prohibited PII are never exported."
      onClose={onClose}
      onSave={save}
      canSave={reason.trim().length > 0}
      saveLabel="Submit for approval"
    >
      <F label="Default display">
        <Sel value={display} onChange={setDisplay} options={["Mask all protected fields", "Mask payment fields only"]} />
      </F>
      <F label="Reveal scope">
        <Sel value={scope} onChange={setScope} options={["Assigned task only · time-boxed", "Whole conversation"]} />
      </F>
      <F label="Reveal requirement">
        <Sel
          value={requirement}
          onChange={setRequirement}
          options={["Reason + active booking or incident", "No reason required"]}
        />
      </F>
      <F label="Bulk reveal">
        <Sel value={bulk} onChange={setBulk} options={["Prohibited", "Security-approved only"]} />
      </F>
      <F label="Export redaction">
        <Sel value={redaction} onChange={setRedaction} options={["Redacted by default", "Full with approval"]} />
      </F>
      <F label="Export expiry">
        <Sel value={expiry} onChange={setExpiry} options={["24 hours", "7 days with approval"]} />
      </F>
      <F label="Download policy">
        <Sel value={download} onChange={setDownload} options={["SSO session + audit event"]} />
      </F>
      <F label="Production region">
        <Sel value={region} onChange={setRegion} options={["Bangladesh", "Singapore", "EU"]} />
      </F>
      <F label="Change reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; expanding access needs Privacy and Security approval" />
      </F>
    </Shell>
  );
}

export function LegalHoldModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [status, setStatus] = useState("Active");
  const [reference, setReference] = useState("LEGAL-882 · Customer payment dispute");
  const [scope, setScope] = useState("Conversation, attachments, booking, financial ledger");
  const [subject, setSubject] = useState("Customer CUST-18••42 · PNR W7F4K2");
  const [owner, setOwner] = useState("Legal Operations");
  const [review, setReview] = useState("2026-12-01");
  const [reason, setReason] = useState(
    "Preserve records relevant to the active customer payment dispute until Legal releases the hold.",
  );

  return (
    <Shell
      titleId="legal-hold-modal"
      title="Legal hold"
      note="An active hold is applied before deletion, data-subject requests and retention jobs. Release requires an authorised Legal actor and remains in the audit history."
      onClose={onClose}
      canSave={reason.trim().length > 0}
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Legal hold updated",
          detail: noteOf(
            [
              ["Hold", "LH-2026-018"],
              ["Status", status],
              ["Reference", reference],
              ["Scope", scope],
              ["Subject", subject],
              ["Owner", owner],
              ["Review date", review],
              ["Reason", reason],
            ],
            {},
          ),
        });
        onClose();
      }}
      saveLabel="Submit hold update"
    >
      <F label="Hold ID">
        <Txt value="LH-2026-018" readOnly />
      </F>
      <F label="Status">
        <Sel value={status} onChange={setStatus} options={["Active", "Released"]} />
      </F>
      <F label="Case or authority reference" full>
        <Txt value={reference} onChange={setReference} />
      </F>
      <F label="Scope">
        <Sel
          value={scope}
          onChange={setScope}
          options={["Conversation, attachments, booking, financial ledger", "Named data classes"]}
        />
      </F>
      <F label="Subject reference">
        <Txt value={subject} onChange={setSubject} />
      </F>
      <F label="Owner">
        <Sel value={owner} onChange={setOwner} options={["Legal Operations", "Finance Disputes"]} />
      </F>
      <F label="Review date">
        <input
          type="date"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink focus:border-coral focus:outline-none"
        />
      </F>
      <F label="Reason and evidence" full>
        <Ta value={reason} onChange={setReason} />
      </F>
    </Shell>
  );
}

export function DataRequestModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [type, setType] = useState("Verified customer access export");
  const [reference, setReference] = useState("DSR-2026-0041");
  const [verification, setVerification] = useState("Account login + OTP verified");
  const [due, setDue] = useState("2026-09-17");
  const [subjects, setSubjects] = useState("CUST-18••42; verified email nu••••@mail.com");
  const [requested, setRequested] = useState("Conversation, identity, booking references, audit copy");
  const [output, setOutput] = useState("Encrypted · redacted · expires 24 hours");
  const [note, setNote] = useState("");

  return (
    <Shell
      wide
      titleId="data-request-modal"
      title="Tenant data export or deletion request"
      note="The workflow previews eligible records, exclusions, counts and irreversible steps before execution. A generic tenant-admin action never directly deletes production data."
      onClose={onClose}
      cancelLabel="Save draft"
      canSave={note.trim().length > 0}
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Tenant data request submitted",
          detail: noteOf(
            [
              ["Request type", type],
              ["Reference", reference],
              ["Identity verification", verification],
              ["Due", due],
              ["Subjects", subjects],
              ["Requested data", requested],
              ["Output policy", output],
              ["Reviewer note", note],
            ],
            {},
          ),
        });
        onClose();
      }}
      saveLabel="Submit for review"
      extra={
        <Checklist>
          <Check
            title="Tenant and identity scope"
            detail="Only verified records matching the subject within this tenant are eligible."
            trailing={<Pill tone="green">Verified</Pill>}
          />
          <Check
            tone="amber"
            title="Legal holds"
            detail="One active dispute hold intersects the booking and attachment scope."
            trailing={<Pill tone="amber">Exclude</Pill>}
          />
          <Check
            tone="amber"
            title="Financial ledger"
            detail="Statutory transaction records remain preserved and are listed in the response."
            trailing={<Pill tone="amber">Retain</Pill>}
          />
        </Checklist>
      }
    >
      <F label="Request type">
        <Sel
          value={type}
          onChange={setType}
          options={["Verified customer access export", "Verified customer deletion", "Tenant operational export"]}
        />
      </F>
      <F label="Request reference">
        <Txt value={reference} onChange={setReference} />
      </F>
      <F label="Identity verification">
        <Sel
          value={verification}
          onChange={setVerification}
          options={["Account login + OTP verified", "Manual privacy verification"]}
        />
      </F>
      <F label="Due date">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink focus:border-coral focus:outline-none"
        />
      </F>
      <F label="Tenant-scoped subject references" full>
        <Txt value={subjects} onChange={setSubjects} />
      </F>
      <F label="Requested data">
        <Sel
          value={requested}
          onChange={setRequested}
          options={["Conversation, identity, booking references, audit copy", "All legally eligible data"]}
        />
      </F>
      <F label="Output policy">
        <Sel value={output} onChange={setOutput} options={["Encrypted · redacted · expires 24 hours"]} />
      </F>
      <F label="Reviewer note" full>
        <Ta value={note} onChange={setNote} placeholder="Record privacy/legal assessment and permitted scope" />
      </F>
    </Shell>
  );
}

/**
 * The mockup's break-glass dialog raises a toast. This one dispatches
 * `GRANT_BREAK_GLASS`, which is the real, time-boxed override of the
 * `privileged`-role gate that `canApproveSensitiveChanges` enforces — so the
 * grant it creates actually changes who can approve, and expires on its own.
 */
export function BreakGlassModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const [person, setPerson] = useState(SECOND_APPROVER);
  const [incident, setIncident] = useState("");
  const [approver, setApprover] = useState("Security on-call");
  const [systems, setSystems] = useState("");
  const [why, setWhy] = useState("");

  return (
    <Shell
      titleId="break-glass-modal"
      title="Request break-glass access"
      intro={
        <SectionNote tone="red" label="Exceptional access">
          Use only for an active incident where normal least-privilege access cannot restore service or protect a customer.
        </SectionNote>
      }
      note="If approved, access is time-boxed to 15 minutes, continuously logged, security-notified and automatically revoked. Bulk customer browsing and credential retrieval remain prohibited."
      onClose={onClose}
      danger
      canSave={incident.trim().length > 0 && why.trim().length > 0}
      onSave={() => {
        dispatch({
          type: "GRANT_BREAK_GLASS",
          person,
          reason: `${incident.trim()} — ${why.trim()}${systems.trim() ? ` (scope: ${systems.trim()})` : ""}`,
          minutes: 15,
        });
        onClose();
      }}
      saveLabel="Request approval"
    >
      <F label="Tenant">
        <Txt value="Takeoff Travels" readOnly />
      </F>
      <F label="Grant to">
        <Sel value={person} onChange={setPerson} options={[SECOND_APPROVER, YOU]} />
      </F>
      <F label="Maximum duration">
        <Sel value="15 minutes" onChange={() => {}} options={["15 minutes"]} />
      </F>
      <F label="Independent approver">
        <Sel value={approver} onChange={setApprover} options={["Security on-call", "Tenant owner + Security"]} />
      </F>
      <F label="Incident">
        <Txt value={incident} onChange={setIncident} placeholder="INC-#### · active incident required" />
      </F>
      <F label="Exact systems or data required" full>
        <Txt value={systems} onChange={setSystems} placeholder="Name the minimum service, queue, booking or protected field" />
      </F>
      <F label="Why normal access is insufficient" full>
        <Ta value={why} onChange={setWhy} placeholder="Required; explain the customer or service risk and intended action" />
      </F>
    </Shell>
  );
}

/* ---------------------------------------------------------- changes & audit */

/** The mockup's `rollbackModal`, over the real version history. */
export function RollbackModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const previous = [...state.history].reverse().filter((h) => h.version !== state.version);
  const [target, setTarget] = useState(previous[0]?.version ?? state.version);
  const [activation, setActivation] = useState("Immediately after approval");
  const [approver, setApprover] = useState("Tenant owner + affected control owner");
  const [reason, setReason] = useState("");
  const current = state.history.find((h) => h.version === state.version);
  const to = state.history.find((h) => h.version === target);

  return (
    <Shell
      titleId="rollback-modal"
      title="Compare and roll back tenant configuration"
      note="Rollback creates a new immutable version from the prior valid configuration; it does not erase the current version or its audit record."
      onClose={onClose}
      danger
      canSave={reason.trim().length > 0 && previous.length > 0}
      onSave={() => {
        dispatch({ type: "ROLLBACK", toVersion: target });
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Rollback requested",
          detail: noteOf([["Target", `v${target}`], ["Activation", activation], ["Approver", approver], ["Reason", reason]], {}),
        });
        onClose();
      }}
      saveLabel="Request rollback approval"
      extra={
        <Checklist>
          <Check
            tone={previous.length ? "amber" : "gray"}
            title="Configuration difference"
            detail={
              to
                ? `v${state.version} “${current?.note ?? "current"}” returns to v${to.version} “${to.note}”, published by ${to.publishedBy}.`
                : "There is no earlier published version to compare against yet."
            }
            trailing={<Pill tone={previous.length ? "amber" : "gray"}>{previous.length ? "Affected" : "None"}</Pill>}
          />
          <Check
            title="Approvals and schedules"
            detail="Pending approvals and scheduled activations are unaffected; each still applies against whichever version is live when it lands."
            trailing={<Pill tone="green">Unchanged</Pill>}
          />
          <Check
            title="Audit history"
            detail="Every superseded version stays inspectable. Rolling back adds a version rather than removing one."
            trailing={<Pill tone="green">Retained</Pill>}
          />
        </Checklist>
      }
    >
      <F label="Current version">
        <Txt value={`v${state.version} · ${current?.note ?? "published"}`} readOnly />
      </F>
      <F label="Rollback target">
        <select
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          disabled={previous.length === 0}
          className="h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink focus:border-coral focus:outline-none disabled:opacity-50"
        >
          {previous.length === 0 && <option>No earlier version</option>}
          {previous.map((h) => (
            <option key={h.version} value={h.version} className="bg-footer">
              v{h.version} · {h.note}
            </option>
          ))}
        </select>
      </F>
      <F label="Activation">
        <Sel value={activation} onChange={setActivation} options={["Immediately after approval", "Schedule maintenance window"]} />
      </F>
      <F label="Approver">
        <Sel value={approver} onChange={setApprover} options={["Tenant owner + affected control owner"]} />
      </F>
      <F label="Incident or rollback reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; identify the defect, evidence and monitoring owner" />
      </F>
    </Shell>
  );
}

/** The mockup's `auditEventModal`, over a real `AuditEntry`. */
export function AuditEventModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const { dispatch } = useTenantConfig();
  const rows: [string, string[]][] = [
    ["Actor and scope", [`${entry.actor} · ${entry.role}`, `Tenant ${entry.tenant}`]],
    ["Recorded change", [entry.action, entry.detail]],
    ["Approval and state", [entry.approver ? `${entry.approver} · approved` : "No second approver required", `Effective ${entry.effectiveAt ? new Date(entry.effectiveAt).toLocaleString() : "at setup"}`]],
    ["Source", [entry.time, `Session ${entry.session}`]],
  ];
  return (
    <Shell
      titleId="audit-event-modal"
      title={`Administrative event ${entry.id}`}
      note="This event is append-only and integrity protected. Corrections create a new linked event; they do not edit or delete this record."
      onClose={onClose}
      cancelLabel="Close"
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Redacted audit-event copy prepared",
          detail: `Event ${entry.id} · ${entry.action}`,
        });
        onClose();
      }}
      saveLabel="Copy redacted event"
    >
      <div className="sm:col-span-2 flex flex-col gap-2">
        {rows.map(([label, lines]) => (
          <div key={label} className="rounded-lg border border-line bg-footer p-3">
            <b className="block text-[11px] font-bold text-ink">{label}</b>
            {lines.map((l) => (
              <span key={l} className="mt-1 block text-[11px] leading-relaxed text-ink-dim">
                {l}
              </span>
            ))}
          </div>
        ))}
      </div>
    </Shell>
  );
}

/**
 * The mockup's `configTestModal`. Its checklist is drawn from real state: the
 * blocking row is the app's own maker-checker gate, so it clears when the
 * pending approval does rather than staying amber forever.
 */
export function ConfigTestModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const blocking = state.pendingApprovals.filter((p) => p.status === "pending");
  const [environment, setEnvironment] = useState("Sandbox · isolated synthetic data");
  const [under, setUnder] = useState("Draft");
  const [fixtures, setFixtures] = useState("OTA production release gate · 10,000 cases");

  return (
    <Shell
      wide
      titleId="config-test-modal"
      title="Tenant sandbox and configuration tests"
      note="Sandbox cannot contact real customers, read production identities, issue live tickets or move money. Test evidence is attached to the configuration version."
      onClose={onClose}
      cancelLabel="Close"
      onSave={() => {
        dispatch({
          type: "RECORD_AUDIT",
          actor: YOU,
          action: "Configuration test suites queued",
          detail: noteOf([["Environment", environment], ["Under test", under], ["Fixture set", fixtures]], {}),
        });
        onClose();
      }}
      saveLabel="Run all tests"
      extra={
        <Checklist>
          <Check
            title="Tenant isolation negative suite"
            detail="API, cache, search, object, analytics, export and background-job probes."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            title="Channel contract suite"
            detail="Replay, signatures, duplicates, ordering, window policy, send states and fallbacks."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            title="Routing simulation"
            detail="Eligibility, workload weighting, capacity exclusion, fairness and starvation."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            title="AI and knowledge policy"
            detail="Decision bounds, hard handoffs, expired sources, human silence and tool allowlists."
            trailing={<Pill tone="green">Passed</Pill>}
          />
          <Check
            tone={blocking.length ? "amber" : "green"}
            title="Maker-checker release gate"
            detail={
              blocking.length
                ? `${blocking.length} change${blocking.length === 1 ? "" : "s"} still need an independent approver: ${blocking.map((p) => p.label).join(", ")}.`
                : "No sensitive change is waiting on a second approver."
            }
            trailing={<Pill tone={blocking.length ? "amber" : "green"}>{blocking.length ? "Blocking" : "Clear"}</Pill>}
          />
        </Checklist>
      }
    >
      <F label="Tenant">
        <Txt value={`${state.draft.brand.brandName} · TT-BD-PROD-01`} readOnly />
      </F>
      <F label="Test environment">
        <Sel value={environment} onChange={setEnvironment} options={["Sandbox · isolated synthetic data"]} />
      </F>
      <F label="Configuration under test">
        <Sel value={under} onChange={setUnder} options={["Draft", `Published v${state.version}`]} />
      </F>
      <F label="Fixture set">
        <Sel
          value={fixtures}
          onChange={setFixtures}
          options={["OTA production release gate · 10,000 cases", "Channel contract suite", "Routing fairness suite"]}
        />
      </F>
    </Shell>
  );
}

/**
 * The mockup's `approvalModal`, over a real `PendingApproval`. Approving here
 * dispatches the same `APPROVE` the audit panel does — including its gate:
 * the second approver has to actually hold a privileged role (or a live
 * break-glass grant), so this dialog can refuse.
 */
export function ApprovalReviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch } = useTenantConfig();
  const now = useNow();
  const approval = state.pendingApprovals.find((p) => p.id === id);
  const [decision, setDecision] = useState("Approve as independent checker");
  const [effective, setEffective] = useState("With the next published version");
  const [reason, setReason] = useState("");
  const eligible = canApproveSensitiveChanges(state.published, SECOND_APPROVER, state.breakGlass, now);

  if (!approval) return null;
  const rejecting = decision !== "Approve as independent checker";

  return (
    <Shell
      titleId="approval-review-modal"
      title="Review privileged configuration change"
      intro={
        <div className="rounded-lg border border-line bg-footer p-3">
          <b className="block text-[12px] font-bold text-ink">{approval.label}</b>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">
            Requested by {approval.requestedBy}. This change expands risk and cannot be self-approved by its maker.
          </p>
        </div>
      }
      note="Approval records actor, role, tenant, before/after values, reason, session and effective time. Approving does not bypass remaining release validation."
      onClose={onClose}
      canSave={reason.trim().length > 0 && (rejecting || eligible)}
      onSave={() => {
        if (rejecting) dispatch({ type: "REJECT", id: approval.id, note: reason.trim() });
        else dispatch({ type: "APPROVE", id: approval.id });
        dispatch({
          type: "RECORD_AUDIT",
          actor: SECOND_APPROVER,
          action: rejecting ? "Change returned to maker" : "Independent approval recorded",
          detail: noteOf([["Change", approval.label], ["Effective", effective], ["Decision reason", reason]], {}),
        });
        onClose();
      }}
      saveLabel={rejecting ? "Record decision" : `Approve as ${SECOND_APPROVER}`}
    >
      <F label="Tenant">
        <Txt value={state.draft.brand.brandName} readOnly />
      </F>
      <F label="Risk class">
        <Txt value="High · expands risk" readOnly />
      </F>
      <F label="Current value">
        <Txt value={String(approval.before)} readOnly />
      </F>
      <F label="Proposed value">
        <Txt value={String(approval.after)} readOnly />
      </F>
      <F label="Maker">
        <Txt value={approval.requestedBy} readOnly />
      </F>
      <F label="Stated reason">
        <Txt value={approval.reason} readOnly />
      </F>
      <F label="Your decision">
        <Sel
          value={decision}
          onChange={setDecision}
          options={["Approve as independent checker", "Reject", "Request changes"]}
        />
      </F>
      <F label="Effective policy">
        <Sel value={effective} onChange={setEffective} options={["With the next published version", "Return to draft"]} />
      </F>
      <F label="Decision reason" full>
        <Ta value={reason} onChange={setReason} placeholder="Required; cite policy, evidence and any conditions" />
      </F>
      {!eligible && !rejecting && (
        <p className="sm:col-span-2 rounded-lg border border-warn-border bg-warn-bg p-3 text-[11px] leading-relaxed text-warn-text">
          {SECOND_APPROVER} does not currently hold a privileged role, so this approval cannot be recorded. Assign one under
          Security &amp; data, or request break-glass access.
        </p>
      )}
    </Shell>
  );
}
