"use client";

import { createContext, useContext, useState } from "react";
import { AGENT_ROSTER, ALL_PEOPLE, SECOND_APPROVER, YOU } from "@/lib/people";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useTenantConfig } from "./TenantConfigContext";
import {
  SETUP_SESSION,
  canApproveSensitiveChanges,
  diffDraft,
  totalMaxConcurrency,
  type AuditEntry,
  type Priority,
} from "./tenantConfigEngine";
import PublishReviewModal from "./PublishReviewModal";
import RolesAndAccess from "./RolesAndAccess";
import ChannelConfigModal from "./ChannelConfigModal";
import Modal from "../dashboard/Modal";
import { useNow } from "../dashboard/useCountdown";
import {
  AgentConfigModal,
  CalendarModal,
  KillSwitchModal,
  KnowledgeModal,
  RetentionModal,
  RoleModal,
  RoutingPolicyModal,
  SlaModal,
  TemplateModal,
} from "./AdminModals";
import {
  AccessReviewModal,
  AiPolicyModal,
  ApprovalReviewModal,
  AuditEventModal,
  BreakGlassModal,
  BudgetControlsModal,
  ChannelStopModal,
  CommercialControlsModal,
  ConfigTestModal,
  ConversationDefaultsModal,
  DataPolicyModal,
  DataRequestModal,
  EscalationMatrixModal,
  FeatureFlagModal,
  IdentityPolicyModal,
  IntegrationModal,
  LegalHoldModal,
  RollbackModal,
  RoutingSimulationModal,
  SecurityPolicyModal,
  TeamModal,
  TenantProfileModal,
} from "./AdminDialogs";
import SandboxBanner from "./SandboxBanner";
import { useInbox } from "../dashboard/InboxContext";
import { APPROVED_TEMPLATES } from "../dashboard/inboxEngine";
import { FAQ } from "../widget/engine";
import { Btn, PageHead, Panel, Pill, Table, Td } from "./mockup/Primitives";
import {
  AdminCard,
  AdminGrid,
  IntegrationIcon,
  KillSwitchBar,
  PolicyBand,
  PolicyCard,
  SettingList,
  SettingRow,
} from "./mockup/AdminShapes";
import {
  AdminKpi,
  AdminKpis,
  AdminLayout,
  AdminPanelGrid,
  ApprovalItem,
  ApprovalList,
  ApprovalRoute,
  AuditActor,
  BrandPreview,
  CardMetrics,
  ChangeDiff,
  ChangeSummary,
  Check,
  Checklist,
  ConfigTitle,
  ConfigValue,
  DangerZone,
  DetailRows,
  Monogram,
  ScopeBar,
  SectionNote,
  SecuritySignal,
  TagList,
  TenantSummary,
  Timeline,
} from "./mockup/ConsoleShapes";

/**
 * `/admin` is `preview (3).html`'s `#adminView`: its page head, its tenant
 * scope bar, its ten tabs, and every pane inside them — Overview, Tenant &
 * brand, Channels, Queues & routing, Team & access, SLA & hours, AI & content,
 * Integrations & commerce, Security & data, and Changes & audit — drawn over
 * the real tenant config engine rather than over fixtures.
 *
 * That is the one way this page differs from the replicated supervisor views:
 * every control here edits a draft, every draft goes through `diffDraft` and
 * the publish modal, and the sensitive ones need a second approver. Where the
 * mockup opens a static dialog (`data-modal="slaModal"`), the equivalent
 * button here opens the real editor for that field, and what you type either
 * writes to the draft or is recorded on the audit entry.
 *
 * Where the mockup shows something this app has no data for, the shape is kept
 * and the content is narrowed to what is true. Three places say so out loud:
 * the role matrix, which cannot show task-level permissions because `Role`
 * models a name and a `privileged` flag; the people table, whose weight and
 * concurrency are derived from queues rather than stored per agent; and the
 * connector cards, whose health is a fixture because nothing here calls a
 * partner API.
 *
 * The former `ApprovalsAndHistory` panel is gone: everything it did — approve,
 * reject, roll back, cancel a scheduled change, read the trail — now happens
 * through the Changes & audit pane's own shapes, against the same reducer.
 */
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "tenant", label: "Tenant & brand" },
  { id: "channels", label: "Channels" },
  { id: "routing", label: "Queues & routing" },
  { id: "people", label: "Team & access" },
  { id: "sla", label: "SLA & hours" },
  { id: "ai", label: "AI & content" },
  { id: "integrations", label: "Integrations & commerce" },
  { id: "security", label: "Security & data" },
  { id: "changes", label: "Changes & audit" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TabContext = createContext<TabId>("overview");

/** A tab's pane. Renders nothing unless its tab is the active one. */
function Pane({ tab, children }: { tab: TabId; children: React.ReactNode }) {
  const active = useContext(TabContext);
  if (tab !== active) return null;
  return <div className="flex flex-col gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-ink">
      {label}
      {children}
    </label>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
    />
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  /** Needed wherever the input is not wrapped in a `Field`'s own label —
   *  the confidence-band grid lays them out bare in a row (NFR-11). */
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink focus:border-coral focus:outline-none"
      />
      {suffix && <span className="shrink-0 text-xs text-ink-dim">{suffix}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm text-ink"
    >
      {/* `inline-block` and an explicit `left` — without them the absolutely
          positioned knob started from its static position and slid 14px past
          the end of the track, colliding with the label whenever it was on. */}
      <span className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-coral" : "bg-panel"}`}>
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-knob transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </span>
      {label}
    </button>
  );
}

/** For the mockup's buttons that open an existing panel rather than a form. */
function DialogShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  const titleId = `dialog-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Modal titleId={titleId} onClose={onClose}>
      <h2 id={titleId} className="text-lg font-bold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>}
      <div className="mt-4">{children}</div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

/** The mockup's own copy for each channel card, kept verbatim. */
const CHANNEL_COPY: Record<string, { title: string; blurb: string; metrics: { value: string; label: string }[]; signal: string }> = {
  whatsapp: {
    title: "WhatsApp Business",
    blurb: "+880 17•• ••• 620 · WABA 1048••29",
    metrics: [
      { value: "12 / 14", label: "Templates approved" },
      { value: "24 hours", label: "Session window" },
      { value: "03 Sep 14:31", label: "Last webhook" },
    ],
    signal: "Signed · secret rotated 10 Aug",
  },
  web: {
    title: "Web chat",
    blurb: "support.takeofftravels.com · widget v4.8",
    metrics: [
      { value: "3 domains", label: "Allowlisted" },
      { value: "20 MB", label: "Attachment limit" },
      { value: "JWT + OTP", label: "Continuation" },
    ],
    signal: "CSP and origin check enabled",
  },
  messenger: {
    title: "Messenger",
    blurb: "Takeoff Travels · Page 3094••11",
    metrics: [
      { value: "Standard", label: "Messaging tier" },
      { value: "3 attempts", label: "Bounded retry" },
      { value: "04 Sep", label: "Rotation scheduled" },
    ],
    signal: "Delivery receipts active",
  },
  instagram: {
    title: "Instagram Direct",
    blurb: "@takeofftravels · Business 778••41",
    metrics: [
      { value: "06 Sep", label: "Token expires" },
      { value: "Image + text", label: "Supported types" },
      { value: "Email", label: "Fallback" },
    ],
    signal: "Rotation required within 72h",
  },
  email: {
    title: "Support email",
    blurb: "support@takeofftravels.com · Google Workspace",
    metrics: [
      { value: "Verified", label: "SPF · DKIM · DMARC" },
      { value: "25 MB", label: "Message limit" },
      { value: "Ticketing", label: "Default queue" },
    ],
    signal: "50% pilot cohort",
  },
};

/**
 * The mockup's four queue rows. This app's tenant config carries two queues
 * with a name, a base weight and a concurrency cap, so the eligibility,
 * calendar and offer columns come from here — they are the design's content,
 * and the row's name, weight and capacity are the real ones.
 */
const QUEUE_COPY: Record<string, { mark: string; tone: "red" | "amber" | "steel" | "gray"; id: string; owner: string; admits: string; eligibility: string[]; selection: string; selectionNote: string; offer: string; offerNote: string; calendar: string }> = {
  q1: {
    mark: "P2",
    tone: "steel",
    id: "Q-STD-01",
    owner: "Customer Care",
    admits: "Booking help, baggage, complaint, low-confidence handoff",
    eligibility: ["Support L1", "Channel access", "BN/EN fallback .80"],
    selection: "Weighted RR + affinity",
    selectionNote: "Continuous aging",
    offer: "30s",
    offerNote: "3 offers then supervisor",
    calendar: "Bangladesh support",
  },
  q2: {
    mark: "P0",
    tone: "red",
    id: "Q-PAY-01",
    owner: "Finance Duty",
    admits: "Paid-not-ticketed, duplicate capture, same-day disruption, refund review",
    eligibility: ["Payment L2", "Ticketing L1", "BN or EN"],
    selection: "Weighted RR",
    selectionNote: "No language fallback",
    offer: "15s",
    offerNote: "Auto-accept P0",
    calendar: "Financial 24 × 7",
  },
};

const SLA_COPY: Record<Priority, { applied: string; calendar: string; ack: string; pickup: string; next: string; pause: string; pauseNote: string; alert: string }> = {
  P0: {
    applied: "Paid-not-ticketed, duplicate charge, security incident",
    calendar: "Financial 24 × 7",
    ack: "1m",
    pickup: "Immediate",
    next: "5m",
    pause: "Never pauses",
    pauseNote: "Payment reconciliation continues",
    alert: "At creation + 50%",
  },
  P1: {
    applied: "Departure <6h, airport customer, active fare hold, same-day disruption",
    calendar: "Operations 24 × 7",
    ack: "2m",
    pickup: "5m",
    next: "15m",
    pause: "Customer wait only",
    pauseNote: "Travel deadline continues",
    alert: "5m remaining",
  },
  P2: {
    applied: "Changes, refund request, complaint, complex support",
    calendar: "Bangladesh support",
    ack: "5m",
    pickup: "15m",
    next: "2 business h",
    pause: "Waiting customer",
    pauseNote: "Maximum pause 72h",
    alert: "25% remaining",
  },
  P3: {
    applied: "Document follow-up, scheduled callback, offline task",
    calendar: "Bangladesh support",
    ack: "30m",
    pickup: "4 business h",
    next: "1 business day",
    pause: "Waiting customer",
    pauseNote: "Due time cannot pass silently",
    alert: "1 business day",
  },
};

const bdt = (n: number) => `BDT ${n.toLocaleString("en-US")}`;
const mins = (n: number) => (n >= 60 && n % 60 === 0 ? `${n / 60}h` : `${n}m`);

export default function TenantAdminConsole() {
  return <TenantAdminConsoleBody />;
}

function TenantAdminConsoleBody() {
  const { state, dispatch } = useTenantConfig();
  const { state: inbox } = useInbox();
  const now = useNow();
  const { draft } = state;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  // Excludes already-scheduled diffs — those are committed requests waiting
  // for their effective time, not unsaved edits still needing a decision.
  const diffs = diffDraft(state.published, draft, state.scheduled).filter((d) => !d.scheduledFor);
  const pending = state.pendingApprovals.filter((p) => p.status === "pending");
  const openChanges = diffs.length + pending.length + state.scheduled.length;

  function edit(path: string, value: unknown) {
    dispatch({ type: "EDIT_DRAFT", path, value });
  }

  const initials = draft.brand.brandName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const lastPublished = state.history[state.history.length - 1];
  const approverEligible = canApproveSensitiveChanges(state.published, SECOND_APPROVER, state.breakGlass, now);

  return (
    // App shell, matching /inbox: the rail, the header and the sandbox banner
    // stay put and only the content column scrolls. Before this the whole page
    // scrolled, so on a 3,700px settings page the nav and the search box were
    // gone by the time you were halfway down it.
    <main className="flex h-screen gap-3 overflow-hidden bg-page p-3 sm:gap-4 sm:p-4">
      <AdminSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <AdminHeader />
        <SandboxBanner />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <PageHead
            eyebrow={`${draft.brand.brandName} · tenant administration`}
            title="Tenant configuration"
            description="Configure the customer-support operation for this tenant only. Production changes are validated, versioned, approved where required, scheduled, and reversible."
            actions={
              <>
                <Pill tone="green">Production · v{state.version}</Pill>
                <Btn onClick={() => setTestsOpen(true)}>Sandbox &amp; tests</Btn>
                <Btn onClick={() => setTab("changes")}>
                  {openChanges > 0 ? `Review ${openChanges} change${openChanges === 1 ? "" : "s"}` : "Changes & audit"}
                </Btn>
                <Btn
                  primary
                  onClick={() => setReviewOpen(true)}
                  disabled={diffs.length === 0}
                  title={diffs.length === 0 ? "Nothing to publish — edit something first" : undefined}
                >
                  Review &amp; publish
                </Btn>
              </>
            }
          />

          <ScopeBar
            initials={initials}
            name={`${draft.brand.brandName} Ltd.`}
            sub="Tenant TT-BD-PROD-01 · Active"
            stats={[
              { label: "Environment", value: draft.brand.sandboxMode ? "Sandbox · simulated" : "Production · live customers" },
              { label: "Data region", value: `${draft.security.dataResidency} · approved` },
              { label: "Last published", value: `v${state.version} · ${lastPublished?.publishedBy ?? "System"}` },
              { label: "Admin session", value: draft.security.mfaRequired ? "MFA verified" : "MFA not required" },
            ]}
            status={
              diffs.length > 0 ? (
                <Pill tone="amber">
                  {diffs.length} draft change{diffs.length === 1 ? "" : "s"}
                </Pill>
              ) : (
                <Pill tone="green">No draft changes</Pill>
              )
            }
          />

          {/* `shrink-0`: as a flex child in a scrolling column this strip was
              compressed below its own content height and rendered as a sliver. */}
          <div className="flex shrink-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Tenant administration sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  tab === t.id ? "border-coral bg-panel text-coral-text" : "border-line text-ink-dim hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <TabContext.Provider value={tab}>
            <OverviewPane state={state} diffs={diffs} pending={pending} goTo={setTab} approverEligible={approverEligible} />
            <TenantPane draft={draft} />
            <ChannelsPane draft={draft} />
            <RoutingPane draft={draft} edit={edit} />
            <PeoplePane draft={draft} />
            <SlaPane draft={draft} />
            <AiPane draft={draft} edit={edit} inbox={inbox} />
            <IntegrationsPane draft={draft} />
            <SecurityPane draft={draft} edit={edit} />
            <ChangesPane state={state} diffs={diffs} pending={pending} onPublish={() => setReviewOpen(true)} onTests={() => setTestsOpen(true)} />
          </TabContext.Provider>
        </div>
      </div>

      {reviewOpen && <PublishReviewModal onClose={() => setReviewOpen(false)} />}
      {testsOpen && <ConfigTestModal onClose={() => setTestsOpen(false)} />}
    </main>
  );
}

type State = ReturnType<typeof useTenantConfig>["state"];
type Draft = State["draft"];
type Edit = (path: string, value: unknown) => void;
type Diff = ReturnType<typeof diffDraft>[number];
type Approval = State["pendingApprovals"][number];

/* ---------------------------------------------------------------- Overview */

function OverviewPane({
  state,
  diffs,
  pending,
  goTo,
  approverEligible,
}: {
  state: State;
  diffs: Diff[];
  pending: Approval[];
  goTo: (t: TabId) => void;
  approverEligible: boolean;
}) {
  const { draft } = state;
  const [reviewing, setReviewing] = useState<string | null>(null);
  const connected = draft.brand.channels.filter((c) => c.connected);
  const live = connected.filter((c) => c.enabled);
  const privileged = draft.security.roles.filter((r) => r.privileged);
  const privilegedPeople = draft.security.roleAssignments.filter((a) => privileged.some((r) => r.id === a.roleId));
  const capacity = totalMaxConcurrency(draft);

  const readiness = [
    {
      tone: "green" as const,
      title: "Tenant identity and isolation",
      detail: "Tenant key is applied to queries, search, objects, analytics, and background jobs.",
      trailing: <Pill tone="green">Verified</Pill>,
    },
    {
      tone: connected.length > 0 ? ("green" as const) : ("amber" as const),
      title: "Channel signatures and delivery fallbacks",
      detail: `${connected.length} of ${draft.brand.channels.length} channels are connected; ${live.length} accept outbound today.`,
      trailing: <Pill tone={connected.length > 0 ? "green" : "amber"}>{connected.length > 0 ? "Passed" : "Not connected"}</Pill>,
    },
    {
      tone: "green" as const,
      title: "Routing distribution and capacity",
      detail: `${draft.queues.queues.length} queues, ${capacity} simultaneous assignments, surge roster ${draft.queues.surgeRosterEnabled ? "armed" : "off"}.`,
      trailing: <Pill tone="green">Simulation passed</Pill>,
    },
    {
      tone: draft.security.mfaRequired && privilegedPeople.length > 0 ? ("green" as const) : ("amber" as const),
      title: "Privileged access policy",
      detail:
        draft.security.mfaRequired && privilegedPeople.length > 0
          ? "SSO, MFA, tenant scope, and maker-checker approval are enforced."
          : "Maker-checker needs at least one privileged role holder with MFA required.",
      trailing:
        draft.security.mfaRequired && privilegedPeople.length > 0 ? (
          <Pill tone="green">Enforced</Pill>
        ) : (
          <Btn onClick={() => goTo("security")}>Resolve</Btn>
        ),
    },
    {
      tone: "green" as const,
      title: "Knowledge validity",
      detail: `AI Reply may cite ${draft.ai.knowledgeVersion} only. Anything outside the published corpus is a handoff, not an answer.`,
      trailing: <Btn onClick={() => goTo("ai")}>Review</Btn>,
    },
    {
      tone: draft.brand.sandboxMode ? ("amber" as const) : ("green" as const),
      title: "Production traffic",
      detail: draft.brand.sandboxMode
        ? "Sandbox mode is on: messages are simulated and booking actions move no money."
        : "Sandbox mode is off — this tenant is serving real customers.",
      trailing: draft.brand.sandboxMode ? <Btn onClick={() => goTo("security")}>Leave sandbox</Btn> : <Pill tone="green">Live</Pill>,
    },
  ];
  const clear = readiness.filter((r) => r.tone === "green").length;

  const releases = [
    ...state.scheduled.map((s) => ({
      time: new Date(s.effectiveAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
      sub: new Date(s.effectiveAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      tone: "steel" as const,
      title: `${s.diffs.length} change${s.diffs.length === 1 ? "" : "s"} · scheduled`,
      detail: `${s.diffs.map((d) => d.label).join(", ")} — requested by ${s.requestedBy}.`,
    })),
    ...[...state.history].reverse().slice(0, 3).map((h) => ({
      time: `v${h.version}`,
      sub: h.time,
      tone: "green" as const,
      title: `Configuration v${h.version} published`,
      detail: `${h.publishedBy} · ${h.note}`,
    })),
  ];

  return (
    <Pane tab="overview">
      <AdminKpis>
        <AdminKpi
          label="Channel setup"
          pill={<Pill tone={live.length > 0 ? "green" : "amber"}>{live.length > 0 ? "Operational" : "Paused"}</Pill>}
          value={`${live.length} / ${draft.brand.channels.length}`}
          note={`${live.length} live channel${live.length === 1 ? "" : "s"}; ${draft.brand.channels.length - connected.length} not yet connected.`}
        />
        <AdminKpi
          label="Routing setup"
          pill={<Pill tone="green">Validated</Pill>}
          value={`${draft.queues.queues.length} queues`}
          note={`${ALL_PEOPLE.length} routable people and ${capacity} simultaneous assignments across them.`}
        />
        <AdminKpi
          label="Access directory"
          pill={<Pill tone="gray">Synced</Pill>}
          value={`${ALL_PEOPLE.length} users`}
          note={`${draft.security.roles.length} roles, ${privileged.length} privileged, ${privilegedPeople.length} account${privilegedPeople.length === 1 ? "" : "s"} holding one.`}
        />
        <AdminKpi
          label="Change control"
          pill={<Pill tone={pending.length > 0 ? "amber" : "green"}>{pending.length > 0 ? "Action needed" : "Clear"}</Pill>}
          value={`${diffs.length + pending.length} pending`}
          note={
            pending.length > 0
              ? `${pending.length} change${pending.length === 1 ? " is" : "s are"} blocked until a second approver signs off.`
              : "No change is waiting on an independent approver."
          }
        />
      </AdminKpis>

      <AdminLayout
        main={
          <>
            <Panel
              title="Production readiness"
              hint="Required controls for the currently published configuration"
              action={<Pill tone={clear === readiness.length ? "green" : "amber"}>{clear} of {readiness.length} clear</Pill>}
              bodyClass=""
            >
              <Checklist>
                {readiness.map((r) => (
                  <Check key={r.title} tone={r.tone} title={r.title} detail={r.detail} trailing={r.trailing} />
                ))}
              </Checklist>
            </Panel>

            <Panel
              title="Scheduled and recent releases"
              hint="Every activation retains author, reason, approval, and rollback target"
              action={<Btn onClick={() => goTo("changes")}>Full history</Btn>}
              bodyClass=""
            >
              <Timeline items={releases} />
            </Panel>
          </>
        }
        aside={
          <>
            <Panel
              title="Approvals requiring action"
              hint="High-risk changes cannot be self-approved"
              action={<Pill tone={pending.length ? "amber" : "green"}>{pending.length} open</Pill>}
              bodyClass=""
            >
              <ApprovalList>
                {pending.length === 0 && (
                  <p className="py-3 text-[11px] leading-relaxed text-ink-dim">
                    Nothing is waiting on a second approver. Raising a refund ceiling, re-enabling AI, shortening a retention
                    window, enabling a payment rail or leaving sandbox mode each opens one.
                  </p>
                )}
                {pending.map((p) => (
                  <ApprovalItem
                    key={p.id}
                    title={`${p.label} · ${String(p.before)} → ${String(p.after)}`}
                    detail={`Requested by ${p.requestedBy} — “${p.reason}”`}
                    tags={
                      <>
                        <Pill tone="green">Maker recorded</Pill>
                        <Pill tone={approverEligible ? "amber" : "red"}>
                          {approverEligible ? `${SECOND_APPROVER} pending` : "No eligible approver"}
                        </Pill>
                      </>
                    }
                    action={<Btn onClick={() => setReviewing(p.id)}>Review</Btn>}
                  />
                ))}
              </ApprovalList>
            </Panel>

            <Panel title="Administrative safeguards" hint="Current production enforcement" bodyClass="">
              <DetailRows
                rows={[
                  { label: "Tenant isolation", value: "Enforced", tone: "green" },
                  { label: "Privileged MFA", value: draft.security.mfaRequired ? "Required" : "Optional", tone: draft.security.mfaRequired ? "green" : "amber" },
                  { label: "Secret visibility", value: "Write-only after entry" },
                  { label: "Export default", value: "Redacted · expires 24h" },
                  { label: "Rollback", value: state.history.length > 1 ? `v${state.history[state.history.length - 2].version} available` : "No earlier version" },
                  { label: "Audit stream", value: `Append-only · ${state.audit.length} ${state.audit.length === 1 ? "entry" : "entries"}`, tone: "green" },
                ]}
              />
            </Panel>
          </>
        }
      />

      {reviewing && <ApprovalReviewModal id={reviewing} onClose={() => setReviewing(null)} />}
    </Pane>
  );
}

/* --------------------------------------------------------- Tenant & brand */

function TenantPane({ draft }: { draft: Draft }) {
  const [profile, setProfile] = useState(false);
  const [identity, setIdentity] = useState(false);
  const [lifecycle, setLifecycle] = useState(false);
  const [tests, setTests] = useState(false);
  const initials = draft.brand.brandName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Pane tab="tenant">
      <SectionNote label="Tenant scope">
        These settings affect {draft.brand.brandName} only. Tenant ID, isolation key, and production data region are immutable
        after provisioning; changes require platform security review.
      </SectionNote>

      <AdminLayout
        main={
          <>
            <Panel title="Tenant" hint="Identity, ownership and current state" bodyClass="">
              <TenantSummary
                initials={initials}
                name={`${draft.brand.brandName} Ltd.`}
                sub="Commercial OTA · Bangladesh · Production tenant"
                status={<Pill tone="green">Active</Pill>}
                action={<Btn onClick={() => setProfile(true)}>Edit profile</Btn>}
              />
            </Panel>

            <SettingList>
              <SettingRow
                title="Tenant identity"
                description="Stable identifiers used by APIs, events, objects, and reporting."
                value={<ConfigValue value="TT-BD-PROD-01 · takeoff-travels" note="Isolation key tk_01HZZ7•••• · created 12 Jan 2026" />}
                action={<Btn onClick={() => setProfile(true)}>Inspect</Btn>}
              />
              <SettingRow
                title="Brand and support identity"
                description="Customer-facing name, logo, sender name, and verified support contacts."
                value={<ConfigValue value={`${draft.brand.brandName} Support`} note="support@takeofftravels.com · +880 9606-••••••" />}
                action={<Btn onClick={() => setProfile(true)}>Edit</Btn>}
              />
              <SettingRow
                title="Locale and languages"
                description="Canonical operational values remain English while replies follow customer language."
                value={<ConfigValue value={draft.brand.supportedLanguages.join(" · ")} note="Asia/Dhaka · BDT · Banglish supported" />}
                action={<Btn onClick={() => setProfile(true)}>Edit</Btn>}
              />
              <SettingRow
                title="Customer identity rules"
                description="Controls authenticated continuation and cross-channel linking."
                value={<ConfigValue value="OTP or verified booking attribute" note="No name/device auto-merge · merge and split are reversible" />}
                action={<Btn onClick={() => setIdentity(true)}>Configure</Btn>}
              />
              <SettingRow
                title="Conversation defaults"
                description="Lifecycle timings that apply unless a queue policy is stricter."
                value={
                  <ConfigValue
                    value={`Reopen ${Math.round(draft.sla.reopenWindowHours / 24)} days · unattended ${draft.sla.unattendedMinutes}m`}
                    note="Waiting-customer reminder after 24h · maximum 2 reminders"
                  />
                }
                action={<Btn onClick={() => setLifecycle(true)}>Edit</Btn>}
              />
              <SettingRow
                title="Environments and test data"
                description="Sandbox has isolated identities, credentials, webhooks, and payment stubs."
                value={
                  <ConfigValue
                    value={draft.brand.sandboxMode ? "Sandbox active" : "Production + Sandbox"}
                    note="Test mode cannot contact customers or move money"
                  />
                }
                action={<Btn onClick={() => setTests(true)}>Open sandbox</Btn>}
              />
            </SettingList>
          </>
        }
        aside={
          <>
            <Panel title="Customer-facing preview" hint="Header, greeting, and supported-language badge" bodyClass="">
              <BrandPreview
                initials={initials}
                name={`${draft.brand.brandName} Support`}
                presence={`Online · replies in ${draft.brand.supportedLanguages.slice(0, 2).join(" or ")}`}
                greeting={`Welcome to ${draft.brand.brandName}. I can help with your booking, flight status, ticket, payment, or connect you with a support specialist.`}
                languages={draft.brand.supportedLanguages.map((l) => (
                  <Pill key={l} tone={l === "Banglish" ? "gray" : "green"}>
                    {l}
                  </Pill>
                ))}
              />
            </Panel>

            <Panel title="Operational owner" hint="Named accountability for this tenant" bodyClass="">
              <DetailRows
                rows={[
                  { label: "Tenant owner", value: YOU },
                  { label: "Support operations", value: SECOND_APPROVER },
                  { label: "Content owner", value: "Rumana Sultana" },
                  { label: "Security contact", value: "security@takeofftravels.com" },
                  { label: "Duty contact", value: "24 × 7 on-call roster" },
                ]}
              />
            </Panel>
          </>
        }
      />

      <Panel
        title="Brand voice and required customer copy"
        hint="Versioned content shared by the widget, automated replies, and human templates"
        action={<Btn onClick={() => setProfile(true)}>Edit content</Btn>}
        bodyClass=""
      >
        <SettingRow
          title="Voice and tone"
          description="Clear, calm, factual, and travel-aware; never promise an unconfirmed fare, ticket, or refund."
          value={<ConfigValue value="Professional + reassuring" note="Short sentences · explain next step · no internal jargon" />}
          action={<Pill tone="green">Approved</Pill>}
        />
        <SettingRow
          title="Consent and privacy notice"
          description="Shown before cross-channel contact, file upload, or identity verification."
          value={<ConfigValue value="PRIVACY-COPY-06 · EN/BN" note="Legal approved 12 Aug 2026" />}
          action={<Btn onClick={() => setProfile(true)}>Preview</Btn>}
        />
        <SettingRow
          title="Brand assets"
          description="Logo, support mark, light/dark header, and email footer."
          value={<ConfigValue value="Asset pack BRAND-TT-04" note="SVG logo · accessible contrast verified" />}
          action={<Btn onClick={() => setProfile(true)}>Manage</Btn>}
        />
      </Panel>

      {profile && <TenantProfileModal onClose={() => setProfile(false)} />}
      {identity && <IdentityPolicyModal onClose={() => setIdentity(false)} />}
      {lifecycle && <ConversationDefaultsModal onClose={() => setLifecycle(false)} />}
      {tests && <ConfigTestModal onClose={() => setTests(false)} />}
    </Pane>
  );
}

/* ---------------------------------------------------------------- Channels */

function ChannelsPane({ draft }: { draft: Draft }) {
  const [connecting, setConnecting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [identity, setIdentity] = useState(false);
  const enabled = draft.brand.channels.filter((c) => c.enabled).length;

  return (
    <Pane tab="channels">
      <SectionNote
        label="Channel controls"
        action={<Btn primary onClick={() => setConnecting(true)}>Connect channel</Btn>}
      >
        Credentials are stored as write-only secrets. Every connection must pass signature, retry, deduplication, ordering,
        messaging-window, and delivery-fallback tests before production activation.
      </SectionNote>

      <AdminGrid>
        {draft.brand.channels.map((c) => (
          <ChannelCard key={c.id} channel={c} />
        ))}
      </AdminGrid>

      <Panel
        title="Cross-channel defaults"
        hint="Identity, consent, send policy, and failure handling shared by enabled channels"
        action={<Pill tone="green">Policy v9</Pill>}
        bodyClass=""
      >
        <SettingRow
          title="Inbound identity"
          description="Create a provisional tenant-scoped identity until verified."
          value={
            <ConfigValue
              value="Link only after OTP, login, or booking verification"
              note="Possible matches create a review task; never auto-merge by name or device"
            />
          }
          action={<Btn onClick={() => setIdentity(true)}>Edit</Btn>}
        />
        <SettingRow
          title="Outbound eligibility"
          description="Enforce opt-in, messaging window, template category, and channel policy before send."
          value={
            <ConfigValue
              value="Block invalid sends before enqueue"
              note="Enforced in channelSendPolicy — outside a window the composer offers an approved template instead"
            />
          }
          action={<Pill tone="green">Enforced in code</Pill>}
        />
        <SettingRow
          title="Delivery failure"
          description="Retries are bounded; terminal failures remain visible to operators."
          value={
            <ConfigValue
              value="3 attempts · exponential backoff"
              note={`Alert after ${draft.alerts.channelFailuresBeforeAlert} failure${draft.alerts.channelFailuresBeforeAlert === 1 ? "" : "s"} or p95 delivery >30s`}
            />
          }
          action={<Pill tone="green">Bounded</Pill>}
        />
        <SettingRow
          title="Channel emergency stop"
          description="Pause outbound delivery without losing inbound messages or history."
          value={
            <ConfigValue
              value={`${enabled} of ${draft.brand.channels.length} channels enabled`}
              note="Incident reference and tenant-admin role required"
            />
          }
          action={<Btn danger onClick={() => setStopping(true)}>Manage</Btn>}
        />
      </Panel>

      {stopping && <ChannelStopModal onClose={() => setStopping(false)} />}
      {identity && <IdentityPolicyModal onClose={() => setIdentity(false)} />}
      {connecting && (
        <DialogShell
          title="Connect a channel"
          subtitle="Every connection is verified in sandbox before it accepts production traffic"
          onClose={() => setConnecting(false)}
        >
          <ul className="flex flex-col gap-2">
            {draft.brand.channels.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-footer px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{CHANNEL_COPY[c.id]?.title ?? c.label}</p>
                  <p className="text-[11px] text-ink-dim">{CHANNEL_COPY[c.id]?.blurb}</p>
                </div>
                <Pill tone={c.connected ? "green" : "gray"}>{c.connected ? "Connected" : "Available"}</Pill>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-dim">
            A channel is connected from its own card — the credential is entered there and never rendered back. This list is
            what the tenant is licensed for.
          </p>
        </DialogShell>
      )}
    </Pane>
  );
}

/**
 * One channel card. The mockup's status words are fixture states — "Live",
 * "Attention", "Pilot" — resolved here against the real `enabled`/`connected`
 * pair, so the pill says what is actually true. Its three metrics and its
 * credential line are the design's content: this app holds no webhook
 * timestamps or template counts to put there.
 */
function ChannelCard({ channel }: { channel: Draft["brand"]["channels"][number] }) {
  const [open, setOpen] = useState(false);
  const copy = CHANNEL_COPY[channel.id];
  const warn = channel.connected && !channel.enabled;
  return (
    <>
      <AdminCard
        icon={<IntegrationIcon id={channel.id} />}
        title={copy?.title ?? channel.label}
        description={copy?.blurb ?? "Channel configured for this tenant."}
        status={
          !channel.connected ? (
            <Pill tone="gray">Not connected</Pill>
          ) : channel.enabled ? (
            <Pill tone="green">Live</Pill>
          ) : (
            <Pill tone="amber">Paused</Pill>
          )
        }
        // Only for a connected channel: the design's figures are a token
        // expiry and a last-webhook time, and printing those beside "no
        // credential stored" would have the card contradict itself.
        metrics={copy && channel.connected ? <CardMetrics items={copy.metrics} /> : undefined}
        signal={
          <SecuritySignal tone={warn ? "amber" : channel.connected ? "green" : "red"}>
            {channel.connected ? copy?.signal ?? "Signed webhook verified" : "No credential stored"}
          </SecuritySignal>
        }
        action={<Btn onClick={() => setOpen(true)}>Configure</Btn>}
      />
      {open && <ChannelConfigModal channel={channel} title={copy?.title ?? channel.label} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ----------------------------------------------------------------- Routing */

function RoutingPane({ draft, edit }: { draft: Draft; edit: Edit }) {
  const [simulating, setSimulating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const [editingQueue, setEditingQueue] = useState<string | null>(null);
  const eligible = (queueId: string) => AGENT_ROSTER.filter((a) => a.queues.includes(queueId));

  return (
    <Pane tab="routing">
      <SectionNote
        label="Assignment order"
        action={
          <>
            <Btn onClick={() => setSimulating(true)}>Run simulation</Btn>
            <Btn primary onClick={() => setCreating(true)}>Create queue</Btn>
          </>
        }
      >
        Priority and SLA age select the next conversation. Hard eligibility then filters by tenant, queue, availability,
        certification, language, channel permission, and remaining capacity before workload-adjusted smooth weighted round
        robin.
      </SectionNote>

      <Panel
        title="Queues"
        hint="Production queue definitions, eligibility, calendars, and assignment policy"
        action={<Pill tone="green">{draft.queues.queues.length} enabled · policy v12</Pill>}
        bodyClass=""
      >
        <Table
          minWidth={1180}
          head={["Queue", "Work admitted", "Required eligibility", "Eligible staff", "Selection", "Offer", "Calendar", "Status", "Action"]}
        >
          {draft.queues.queues.map((q) => {
            const copy = QUEUE_COPY[q.id];
            const staff = eligible(q.id);
            return (
              <tr key={q.id}>
                <Td>
                  <ConfigTitle
                    icon={<Monogram label={copy?.mark ?? "Q"} tone={copy?.tone ?? "gray"} />}
                    title={q.name}
                    sub={`${copy?.id ?? q.id} · owner ${copy?.owner ?? "Support Ops"}`}
                  />
                </Td>
                <Td className="text-ink-dim">{copy?.admits ?? "Tenant queue."}</Td>
                <Td>
                  <TagList tags={copy?.eligibility ?? ["Support L1"]} />
                </Td>
                <Td>
                  <ConfigValue
                    value={`${staff.filter((a) => a.state === "available").length} now`}
                    note={`${staff.length} certified`}
                  />
                </Td>
                <Td>
                  <ConfigValue value={copy?.selection ?? "Weighted RR"} note={`Base weight ${q.baseWeight.toFixed(2)}`} />
                </Td>
                <Td>
                  <ConfigValue value={copy?.offer ?? "30s"} note={copy?.offerNote ?? "Return keeps SLA age"} />
                </Td>
                <Td className="text-ink-dim">{copy?.calendar ?? draft.brand.businessHours}</Td>
                <Td>
                  <Pill tone="green">Enabled</Pill>
                </Td>
                <Td>
                  <Btn onClick={() => setEditingQueue(q.id)}>Edit</Btn>
                </Td>
              </tr>
            );
          })}
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            &ldquo;Eligible staff&rdquo; counts the roster entries whose <code>queues</code> include this queue and whose state
            is <code>available</code> — the same filter <code>routing.ts</code> applies before any weighting. Concurrency is{" "}
            {totalMaxConcurrency(draft)} across every queue, which is the cap <code>/inbox</code> enforces on new offers.
          </p>
        </div>
      </Panel>

      <AdminPanelGrid>
        <Panel
          title="Selection policy"
          hint="Versioned tenant defaults used by every enabled queue"
          action={<Pill tone="green">Enforced in code</Pill>}
          bodyClass=""
        >
          <SettingRow
            title="Tenant and queue permission"
            description="A candidate outside the queue is never scored."
            value={<ConfigValue value="Hard constraint" note="Cannot be overridden by weight or affinity" />}
          />
          <SettingRow
            title="Skill, language and channel certification"
            description="Filtered before weighting, so a confident pick is never someone who was not allowed to take the work."
            value={<ConfigValue value="Exact match · versioned" note="Language fallback only where a queue approves one" />}
          />
          <SettingRow
            title="Reopen and PNR affinity"
            description="Prefer the previous eligible owner when a higher-priority SLA is not harmed (RT-05)."
            value={<ConfigValue value="Enabled as tie-break only" note="Never bypasses certification or capacity" />}
          />
          <SettingRow
            title="Remaining-capacity factor"
            description="Base weight is scaled by spare capacity — deterministic, with no random tie-break, so a decision stays explainable."
            value={<ConfigValue value="Continuous · audited" note={`At ${totalMaxConcurrency(draft)} active the agent is excluded`} />}
          />
          <SettingRow
            title="Surge roster"
            description="The one part of this precedence that is a setting rather than code."
            detail={
              <Toggle
                checked={draft.queues.surgeRosterEnabled}
                onChange={(v) => edit("queues.surgeRosterEnabled", v)}
                label="Surge roster active (fog/monsoon season)"
              />
            }
          />
          <div className="border-t border-line px-4 py-3">
            <p className="text-[11px] leading-relaxed text-ink-dim">
              The first four describe the precedence implemented in <code>routing.ts</code>, which is why they have no toggles:
              reordering them is a code change, and every candidate that fails one is kept with the reason and rendered in{" "}
              <code>DetailsPanel</code>.
            </p>
          </div>
        </Panel>

        <Panel
          title="Escalation matrix"
          hint="No eligible agent, offer exhaustion, and SLA risk"
          action={<Btn onClick={() => setMatrix(true)}>Edit matrix</Btn>}
          bodyClass=""
        >
          <Checklist>
            <Check
              tone="red"
              title="P0 · no eligible agent"
              detail="Page Finance Duty and tenant incident commander immediately; repeat every 5 minutes."
              trailing={<Pill tone="red">Immediate</Pill>}
            />
            <Check
              tone="amber"
              title="P1 · no eligible agent"
              detail="Notify queue supervisor after 60 seconds and recommend surge roster activation."
              trailing={<Pill tone="amber">60s</Pill>}
            />
            <Check
              tone="amber"
              title="Three declined or expired offers"
              detail="Return to queue with original SLA age and create a supervisor intervention task."
              trailing={<Pill tone="amber">3 offers</Pill>}
            />
            <Check
              title="Queue surge threshold"
              detail={`Alert once ${draft.alerts.queueSurgeWaiting} conversations are waiting — the tenant threshold computeAlerts reads.`}
              trailing={<Pill tone={draft.alerts.enabled.queueSurge ? "green" : "gray"}>{draft.alerts.enabled.queueSurge ? "Enabled" : "Disabled"}</Pill>}
            />
            <Check
              title="Supervisor override"
              detail="Reason required; cannot bypass tenant or restricted-data permissions."
              trailing={<Pill tone="gray">Audited</Pill>}
            />
          </Checklist>
        </Panel>
      </AdminPanelGrid>

      {simulating && <RoutingSimulationModal onClose={() => setSimulating(false)} />}
      {matrix && <EscalationMatrixModal onClose={() => setMatrix(false)} />}
      {(creating || editingQueue) && (
        <RoutingPolicyModal
          queueId={editingQueue ?? draft.queues.queues[0].id}
          onClose={() => {
            setCreating(false);
            setEditingQueue(null);
          }}
        />
      )}
    </Pane>
  );
}

/* ------------------------------------------------------------ Team & access */

function PeoplePane({ draft }: { draft: Draft }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [teams, setTeams] = useState(false);
  const [review, setReview] = useState(false);
  const roleFor = (person: string) =>
    draft.security.roles.find((r) => r.id === draft.security.roleAssignments.find((a) => a.person === person)?.roleId)?.name ??
    "Support agent";
  const queueName = (id: string) => draft.queues.queues.find((q) => q.id === id)?.name ?? id;
  const concurrencyFor = (queues: string[]) =>
    draft.queues.queues.filter((q) => queues.includes(q.id)).reduce((n, q) => n + q.maxConcurrency, 0);
  const weightFor = (queues: string[]) =>
    draft.queues.queues.filter((q) => queues.includes(q.id)).map((q) => q.baseWeight.toFixed(2)).join(" / ") || "—";

  const active = AGENT_ROSTER.filter((a) => a.state !== "offline");
  const training = AGENT_ROSTER.filter((a) => a.state === "training");
  const privileged = draft.security.roles.filter((r) => r.privileged);
  const privilegedPeople = draft.security.roleAssignments.filter((a) => privileged.some((r) => r.id === a.roleId));

  const STATE_TONE: Record<string, "green" | "amber" | "gray"> = {
    available: "green",
    busy: "amber",
    wrap_up: "amber",
    training: "amber",
    away: "gray",
    break: "gray",
    offline: "gray",
  };

  return (
    <Pane tab="people">
      <AdminKpis>
        <AdminKpi
          label="Active members"
          pill={<Pill tone="green">Directory synced</Pill>}
          value={String(ALL_PEOPLE.length)}
          note={`${AGENT_ROSTER.length} roster agents plus the signed-in admin, across ${draft.security.roles.length} roles.`}
        />
        <AdminKpi
          label="Privileged accounts"
          pill={<Pill tone={privilegedPeople.length ? "green" : "amber"}>{privilegedPeople.length ? "In scope" : "None"}</Pill>}
          value={String(privilegedPeople.length)}
          note={`Can act as the independent approver ADM-03 requires: ${privileged.map((r) => r.name).join(", ") || "no privileged role defined"}.`}
        />
        <AdminKpi
          label="In training"
          pill={<Pill tone="amber">Production ineligible</Pill>}
          value={String(training.length)}
          note="Training state removes an agent from routing without removing their account or history."
        />
        <AdminKpi
          label="Break-glass"
          pill={<Pill tone="gray">Time-boxed</Pill>}
          value="15m"
          note="Maximum grant length. Every grant names a reason, expires on its own and stays on the audit trail."
        />
      </AdminKpis>

      <Panel
        title="People and operational access"
        hint="Identity, role, teams, certifications, channel permissions, and routing capacity"
        action={
          <>
            <Btn onClick={() => setTeams(true)}>Manage teams</Btn>
            <Btn primary onClick={() => setEditing(AGENT_ROSTER[0]?.name ?? YOU)}>Invite member</Btn>
          </>
        }
        bodyClass=""
      >
        <Table
          minWidth={1100}
          head={["Person", "Status", "Role", "Teams / queues", "Certified skills", "Languages", "Channels", "Weight / capacity", "Action"]}
        >
          {AGENT_ROSTER.map((a) => (
            <tr key={a.name}>
              <Td>
                <ConfigTitle title={a.name} sub={`${a.name.split(" ")[0]?.toLowerCase()}@takeofftravels.com`} />
              </Td>
              <Td>
                <Pill tone={STATE_TONE[a.state] ?? "gray"}>{a.state.replace("_", " ")}</Pill>
              </Td>
              <Td className="text-ink-dim">{roleFor(a.name)}</Td>
              <Td className="text-ink-dim">{a.queues.map(queueName).join(", ")}</Td>
              <Td>
                <TagList tags={a.skills} />
              </Td>
              <Td className="text-ink-dim">{a.languages.join(" · ")}</Td>
              <Td className="text-ink-dim">{a.channels.join(" · ")}</Td>
              <Td>
                <ConfigValue value={weightFor(a.queues)} note={`${concurrencyFor(a.queues)} concurrent · ${a.activeCount} active`} />
              </Td>
              <Td>
                <Btn onClick={() => setEditing(a.name)}>Edit</Btn>
              </Td>
            </tr>
          ))}
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            The mockup gives every agent their own weight and concurrency. Here both are derived from the queues they belong
            to, because that is where the real numbers live — editing them per agent would mean moving the roster out of{" "}
            <code>lib/people.ts</code> and through the same draft/publish pipeline as everything else on this page, which is a
            data-model change rather than a form. Role is the assignment, editable under Security &amp; data.
          </p>
        </div>
      </Panel>

      <AdminPanelGrid>
        <Panel
          title="Teams and coverage"
          hint="Queue membership is granted through teams plus current certification"
          action={<Btn onClick={() => setTeams(true)}>Edit</Btn>}
          bodyClass=""
        >
          {draft.queues.queues.map((q) => {
            const members = AGENT_ROSTER.filter((x) => x.queues.includes(q.id));
            const ready = members.filter((x) => x.state === "available");
            return (
              <SettingRow
                key={q.id}
                title={q.name}
                description={`${members.length} certified · ${ready.length} available now`}
                value={<ConfigValue value={draft.brand.businessHours} note={`Concurrency ${q.maxConcurrency} · weight ${q.baseWeight.toFixed(2)}`} />}
                action={<Pill tone={ready.length > 0 ? "green" : "amber"}>{ready.length > 0 ? "Covered" : "No cover"}</Pill>}
              />
            );
          })}
          <SettingRow
            title="Surge roster"
            description="Extra disruption capacity, armed from Queues & routing."
            value={<ConfigValue value={draft.queues.surgeRosterEnabled ? "Armed" : "Standing down"} note="Airport escalation enabled" />}
            action={<Pill tone={draft.queues.surgeRosterEnabled ? "green" : "gray"}>{draft.queues.surgeRosterEnabled ? "On" : "Off"}</Pill>}
          />
        </Panel>

        <Panel title="Access lifecycle" hint="Provisioning, review, suspension, and offboarding" bodyClass="">
          <Checklist>
            <Check
              title="Directory sync"
              detail="Google Workspace · groups and employment state · every 15 minutes."
              trailing={<Pill tone="green">Healthy</Pill>}
            />
            <Check
              tone="amber"
              title="Quarterly privileged review"
              detail={`${privilegedPeople.length} account${privilegedPeople.length === 1 ? "" : "s"} in scope · due 15 Sep 2026 · owner Security.`}
              trailing={<Btn onClick={() => setReview(true)}>Review</Btn>}
            />
            <Check
              title="Offboarding automation"
              detail="Revokes sessions, tokens, queue eligibility, exports, and device trust."
              trailing={<Pill tone="green">Enabled</Pill>}
            />
            <Check
              tone={active.length === AGENT_ROSTER.length ? "green" : "amber"}
              title="Suspended accounts"
              detail="A suspended account keeps its history and loses every session, token and queue eligibility."
              trailing={<Pill tone="gray">{AGENT_ROSTER.length - active.length}</Pill>}
            />
          </Checklist>
        </Panel>
      </AdminPanelGrid>

      {editing && <AgentConfigModal name={editing} onClose={() => setEditing(null)} />}
      {teams && <TeamModal onClose={() => setTeams(false)} />}
      {review && <AccessReviewModal onClose={() => setReview(false)} />}
    </Pane>
  );
}

/* ------------------------------------------------------------- SLA & hours */

function SlaPane({ draft }: { draft: Draft }) {
  const [editing, setEditing] = useState<Priority | null>(null);
  const [calendar, setCalendar] = useState(false);
  const [creating, setCreating] = useState(false);
  const NAME: Record<Priority, string> = { P0: "P0 critical", P1: "P1 urgent", P2: "P2 standard", P3: "P3 deferred" };
  const TONE: Record<Priority, "red" | "amber" | "gray"> = { P0: "red", P1: "amber", P2: "gray", P3: "gray" };

  return (
    <Pane tab="sla">
      <SectionNote
        label="Prospective only"
        action={<Btn primary onClick={() => setCreating(true)}>Create SLA policy</Btn>}
      >
        Queue wait, first human response, next response, and resolution are separate clocks. Changes never rewrite historical
        SLA results; payment-reconciliation clocks never pause.
      </SectionNote>

      <Panel
        title="Priority and SLA policies"
        hint="Targets, clocks, pause conditions, and pre-breach notifications"
        action={<Pill tone="green">Policy v11 · active</Pill>}
        bodyClass=""
      >
        <Table
          minWidth={1240}
          head={[
            "Priority",
            "Applied when",
            "Calendar",
            "Acknowledge",
            "Human pickup",
            "First human response",
            "Next response",
            "Resolution",
            "Pause policy",
            "Alert before breach",
            "Action",
          ]}
        >
          {PRIORITIES.map((p) => {
            const t = draft.sla.targets[p];
            const c = SLA_COPY[p];
            return (
              <tr key={p}>
                <Td>
                  <Pill tone={TONE[p]}>{NAME[p]}</Pill>
                </Td>
                <Td className="text-ink-dim">{c.applied}</Td>
                <Td className="text-ink-dim">{c.calendar}</Td>
                <Td className="text-ink-dim">{c.ack}</Td>
                <Td className="text-ink-dim">{c.pickup}</Td>
                <Td>
                  <b className="text-[11px] font-semibold text-ink">{mins(t.firstResponseMinutes)}</b>
                </Td>
                <Td className="text-ink-dim">{c.next}</Td>
                <Td>
                  <b className="text-[11px] font-semibold text-ink">{mins(t.resolutionMinutes)}</b>
                </Td>
                <Td>
                  <ConfigValue value={c.pause} note={c.pauseNote} />
                </Td>
                <Td className="text-ink-dim">{c.alert}</Td>
                <Td>
                  <Btn onClick={() => setEditing(p)}>Edit</Btn>
                </Td>
              </tr>
            );
          })}
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            First response and resolution are the tenant&rsquo;s own published targets — the two numbers <code>/inbox</code>{" "}
            counts down against, and the ones an edit here really moves. Acknowledge, pickup, next response and the pause
            policy are the design&rsquo;s content: this app models one clock per conversation, not four.
          </p>
        </div>
      </Panel>

      <AdminPanelGrid>
        <Panel
          title="Business calendars"
          hint="Tenant timezone: Asia/Dhaka (UTC+06:00)"
          action={<Btn onClick={() => setCalendar(true)}>Add calendar</Btn>}
          bodyClass=""
        >
          <SettingRow
            title="Bangladesh support"
            description="Standard and deferred customer support."
            value={<ConfigValue value={draft.brand.businessHours} note="Holidays inherited · after-hours acknowledgement" />}
            action={<Btn onClick={() => setCalendar(true)}>Edit</Btn>}
          />
          <SettingRow
            title="Operations 24 × 7"
            description="Disruption and urgent travel work."
            value={<ConfigValue value="Always open" note="Shift roster controls capacity, not the clock" />}
            action={<Btn onClick={() => setCalendar(true)}>Edit</Btn>}
          />
          <SettingRow
            title="Finance business hours"
            description="Voluntary refunds and non-P0 money operations."
            value={<ConfigValue value="Sun–Thu 09:00–18:00" note="Bank holidays inherited" />}
            action={<Btn onClick={() => setCalendar(true)}>Edit</Btn>}
          />
        </Panel>

        <Panel
          title="Clock behavior"
          hint="Lifecycle events that start, pause, resume, or stop clocks"
          action={<Btn onClick={() => setCalendar(true)}>Configure</Btn>}
          bodyClass=""
        >
          <Checklist>
            <Check
              title="First-human clock starts"
              detail="When an escalation package is accepted by routing; AI acknowledgements do not stop it."
              trailing={<Pill tone="gray">Immutable event</Pill>}
            />
            <Check
              title="Customer-wait pause"
              detail="Requires an outbound question and WAITING_CUSTOMER state; P0 never pauses."
              trailing={<Pill tone="green">Validated</Pill>}
            />
            <Check
              title="Unattended release"
              detail={`A conversation held by an agent who has stopped taking work returns to the queue after ${draft.sla.unattendedMinutes} minutes, keeping its original SLA age (AG-11).`}
              trailing={<Pill tone="green">{draft.sla.unattendedMinutes}m</Pill>}
            />
            <Check
              tone="amber"
              title="After-hours acknowledgement"
              detail={`Send deterministic copy, preserve arrival time, and show the next staffed period. Current policy: ${draft.sla.afterHours === "queue" ? "queue and answer when staffed" : "automatic reply only"}.`}
              trailing={<Pill tone="amber">Template v6</Pill>}
            />
            <Check
              title="Reopen window"
              detail={`A resolved conversation reopens onto the same thread for ${draft.sla.reopenWindowHours} hours before a new one is created (RT-05).`}
              trailing={<Pill tone="green">{draft.sla.reopenWindowHours}h</Pill>}
            />
          </Checklist>
        </Panel>
      </AdminPanelGrid>

      {(editing || creating) && (
        <SlaModal
          priority={editing ?? "P2"}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
      {calendar && <CalendarModal onClose={() => setCalendar(false)} />}
    </Pane>
  );
}

/* ------------------------------------------------------------ AI & content */

const AI_AUTHORITY = [
  {
    capability: "Policy and FAQ answer",
    sub: "Baggage, check-in, general travel",
    behavior: "Grounded answer in EN, BN, or readable Banglish",
    tool: "Knowledge retrieval only",
    checks: "Approved effective-dated citation · language coverage",
    risk: "Missing/conflicting evidence → handoff",
    status: <Pill tone="green">Allowed</Pill>,
  },
  {
    capability: "Booking and itinerary lookup",
    sub: "Read-only customer context",
    behavior: "Show confirmed facts from tool result",
    tool: "Read itinerary after verification",
    checks: "OTP/login/booking verification · tenant match · field masking",
    risk: "Mismatch or repeated failure → handoff",
    status: <Pill tone="amber">Pending v18</Pill>,
  },
  {
    capability: "Flight search and quote",
    sub: "No commitment",
    behavior: "Collect slots and present live validated offers",
    tool: "Search inventory · create expiring offer",
    checks: "Route/date/passenger validation · fare expiry displayed",
    risk: "Supplier timeout → safe retry or handoff",
    status: <Pill tone="green">Allowed</Pill>,
  },
  {
    capability: "Payment initiation",
    sub: "Hosted payment only",
    behavior: "Send a hosted link after exact summary and confirmation",
    tool: "Create single-use payment session",
    checks: "Idempotency · amount/currency/order match · no credential collection",
    risk: "Capture without ticket → immediate P0",
    status: <Pill tone="green">Guarded</Pill>,
  },
  {
    capability: "Change, cancel, or refund",
    sub: "Material booking side effect",
    behavior: "Explain options and prepare a structured handoff",
    tool: "No commit authority",
    checks: "Human permission, fare rule, amount ceiling, customer confirmation",
    risk: "Always handoff before side effect",
    status: <Pill tone="red">Human only</Pill>,
  },
];

function AiPane({
  draft,
  edit,
  inbox,
}: {
  draft: Draft;
  edit: Edit;
  inbox: ReturnType<typeof useInbox>["state"];
}) {
  const [policyOpen, setPolicyOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [source, setSource] = useState<{ title: string; owner: string } | null>(null);
  const [template, setTemplate] = useState<{ label: string; body: string } | null>(null);
  const [tests, setTests] = useState(false);
  const bands = draft.ai.confidence;
  const pct = (n: number) => n.toFixed(2);

  return (
    <Pane tab="ai">
      <SectionNote label="Authority boundary" action={<Btn onClick={() => setPolicyOpen(true)}>Edit policy</Btn>}>
        AI may converse, retrieve approved tenant knowledge, and request allowlisted tools. It cannot authorise fare rules,
        identity, refunds, cancellations, booking changes, or ticketing state. Human ownership silences automated outbound
        messages.
      </SectionNote>

      {/* The mockup hardcodes ≥0.85 / 0.70 / 0.45. These read the tenant's own
          bands, so the cards move when the numbers below are published — the
          same values `confidenceBand()` applies on /inbox. */}
      <PolicyBand four>
        <PolicyCard
          tone="direct"
          title="High confidence"
          range={`≥ ${pct(bands.high)}`}
          description="Reply or run an approved reversible action only when required slots, current evidence, and policy checks pass. A draft scored here keeps its one-click send."
        />
        <PolicyCard
          tone="guarded"
          title="Guarded"
          range={`${pct(bands.guarded)}–${pct(bands.high)}`}
          description="Low-risk answer or confirmation of one material value. No refund, cancel, change, or financial promise."
        />
        <PolicyCard
          tone="clarify"
          title="Clarify once"
          range={`${pct(bands.clarify)}–${pct(bands.guarded)}`}
          description="Ask one focused question using known context. Escalate after two unsuccessful clarification turns."
        />
        <PolicyCard
          tone="handoff"
          title="Human handoff"
          range={`< ${pct(bands.clarify)}`}
          description="Route with transcript, language, confidence trail, unresolved intents, sources, tool state, and recommended skill."
        />
      </PolicyBand>

      <SettingList>
        <SettingRow
          title="Confidence thresholds"
          description="Bands must run High > Guarded > Clarify. Published bands are read on /inbox: they name and colour every score in the intent trail, and only a draft in the High band keeps its Send as-is button. They take effect on publish, not on edit."
          detail={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="High ≥">
                <NumberInput value={bands.high} onChange={(v) => edit("ai.confidence.high", v)} />
              </Field>
              <Field label="Guarded ≥">
                <NumberInput value={bands.guarded} onChange={(v) => edit("ai.confidence.guarded", v)} />
              </Field>
              <Field label="Clarify ≥">
                <NumberInput value={bands.clarify} onChange={(v) => edit("ai.confidence.clarify", v)} />
              </Field>
            </div>
          }
        />
        <SettingRow
          title="Knowledge corpus version"
          description="Which published corpus AI Reply may cite."
          action={<div className="w-56"><TextInput value={draft.ai.knowledgeVersion} onChange={(v) => edit("ai.knowledgeVersion", v)} /></div>}
        />
      </SettingList>

      <KillSwitchBar
        title={`${draft.brand.brandName} AI emergency stop`}
        description="Tenant scope only. New AI-eligible work receives approved deterministic copy and routes to humans without message loss. Human-owned and queued work remains intact."
        status={draft.ai.killSwitch ? <Pill tone="red">AI disabled</Pill> : <Pill tone="green">Enabled · policy v17</Pill>}
        action={<Btn danger onClick={() => setKillOpen(true)}>{draft.ai.killSwitch ? "Restore" : "Manage"}</Btn>}
      />

      <Panel
        title="Intent and action authority"
        hint="Server-side enforcement applies even when model confidence is high"
        action={<Btn onClick={() => setPolicyOpen(true)}>Manage scope</Btn>}
        bodyClass=""
      >
        <Table minWidth={980} head={["Capability", "Customer-facing behavior", "Tool authority", "Required checks", "Risk handling", "Status"]}>
          {AI_AUTHORITY.map((r) => (
            <tr key={r.capability}>
              <Td>
                <ConfigValue value={r.capability} note={r.sub} />
              </Td>
              <Td className="text-ink-dim">{r.behavior}</Td>
              <Td className="text-ink-dim">{r.tool}</Td>
              <Td className="text-ink-dim">{r.checks}</Td>
              <Td className="text-ink-dim">{r.risk}</Td>
              <Td>{r.status}</Td>
            </tr>
          ))}
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            The allowlist behind this table is <code>ai.allowedIntents</code> — currently{" "}
            <code>{draft.ai.allowedIntents.join(", ")}</code> — editable under Manage scope. Hard escalation triggers (an
            explicit human request, a captured payment with no ticket, an answer with no citation) override every band above
            and are properties of the widget&rsquo;s escalation path rather than settings.
          </p>
        </div>
      </Panel>

      <AdminPanelGrid>
        <Panel
          title="Knowledge collections"
          hint="Approved sources, effective dates, owners, translations, and retrieval state"
          action={<Btn primary onClick={() => setSource({ title: "New source", owner: "Content Ops" })}>Add source</Btn>}
          bodyClass=""
        >
          <Table minWidth={620} head={["Source", "Owner", "Coverage", "Referenced", "Status", "Action"]}>
            {FAQ.map((f) => {
              const referenced = inbox.conversations.filter((c) => c.citedKnowledge?.includes(f.id)).length;
              return (
                <tr key={f.id}>
                  <Td>
                    <ConfigValue value={f.q} note={`${f.id.toUpperCase()} · ${draft.ai.knowledgeVersion}`} />
                  </Td>
                  <Td className="text-ink-dim">{f.source}</Td>
                  <Td className="text-ink-dim">EN · BN</Td>
                  <Td className="text-ink-dim">
                    {referenced} conversation{referenced === 1 ? "" : "s"}
                  </Td>
                  <Td>
                    <Pill tone={referenced > 0 ? "green" : "gray"}>{referenced > 0 ? "Cited" : "Approved"}</Pill>
                  </Td>
                  <Td>
                    <Btn onClick={() => setSource({ title: f.q, owner: f.source })}>Open</Btn>
                  </Td>
                </tr>
              );
            })}
          </Table>
          <div className="border-t border-line px-4 py-3">
            <p className="text-[11px] leading-relaxed text-ink-dim">
              &ldquo;Referenced&rdquo; counts conversations where AI Reply actually cited this source (
              <code>citedKnowledge</code>) — not a static content-ops metric, the same field <code>DetailsPanel</code>&rsquo;s
              &ldquo;Bot cited&rdquo; list reads. The mockup&rsquo;s validity and approval columns need a content lifecycle
              this app does not model.
            </p>
          </div>
        </Panel>

        <Panel
          title="Production AI release"
          hint="Configuration, evidence, and rollback — not performance statistics"
          action={<Pill tone={draft.ai.killSwitch ? "red" : "green"}>{draft.ai.killSwitch ? "Stopped" : "Approved"}</Pill>}
          bodyClass=""
        >
          <SettingRow
            title="Model and prompt policy"
            description="Provider-agnostic production release reference."
            value={<ConfigValue value="trv-ai-2026.08 · policy v17" note="Rollback: 2026.07 / v16" />}
            action={<Btn onClick={() => setPolicyOpen(true)}>Inspect</Btn>}
          />
          <SettingRow
            title="Knowledge snapshot"
            description="Only approved, effective sources are retrievable."
            value={<ConfigValue value={draft.ai.knowledgeVersion} note={`${FAQ.length} sources · EN and BN`} />}
            action={<Btn onClick={() => setSource({ title: draft.ai.knowledgeVersion, owner: "Content Ops" })}>Open</Btn>}
          />
          <SettingRow
            title="Release gate"
            description="Bilingual, Banglish, channel, confusion-pair, tool, and safety suites."
            value={<ConfigValue value="All required suites passed" note="Evidence EV-AI-2026-0817" />}
            action={<Btn onClick={() => setTests(true)}>Evidence</Btn>}
          />
          <SettingRow
            title="Allowed read-only tools"
            description="The server-side allowlist a tool call is checked against before it runs."
            value={<ConfigValue value={`${draft.ai.allowedIntents.length} intents`} note={draft.ai.allowedIntents.join(" · ")} />}
            action={<Btn onClick={() => setPolicyOpen(true)}>Manage</Btn>}
          />
        </Panel>
      </AdminPanelGrid>

      <Panel
        title="Channel templates and saved replies"
        hint="Customer-facing copy with owner, translations, channel approval, and effective dates"
        action={<Btn onClick={() => setTemplate({ label: "New template", body: "" })}>New template</Btn>}
        bodyClass=""
      >
        <Table minWidth={860} head={["Template", "Use", "Channel", "Languages", "Owner", "Approval", "Action"]}>
          {APPROVED_TEMPLATES.map((t) => (
            <tr key={t.id}>
              <Td>
                <ConfigValue value={t.label} note={t.id.toUpperCase()} />
              </Td>
              <Td className="text-ink-dim">{t.body}</Td>
              <Td className="text-ink-dim">All enabled</Td>
              <Td className="text-ink-dim">EN · BN</Td>
              <Td className="text-ink-dim">Content Ops</Td>
              <Td>
                <Pill tone="green">Approved</Pill>
              </Td>
              <Td>
                <Btn onClick={() => setTemplate({ label: t.label, body: t.body })}>Open</Btn>
              </Td>
            </tr>
          ))}
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            These are the templates <code>channelSendPolicy</code> (INB-12) falls back to: outside a channel&rsquo;s free-reply
            window a typed message is blocked and one of these is not.
          </p>
        </div>
      </Panel>

      {policyOpen && <AiPolicyModal onClose={() => setPolicyOpen(false)} />}
      {killOpen && <KillSwitchModal onClose={() => setKillOpen(false)} />}
      {source && <KnowledgeModal source={source} onClose={() => setSource(null)} />}
      {template && <TemplateModal template={template} onClose={() => setTemplate(null)} />}
      {tests && <ConfigTestModal onClose={() => setTests(false)} />}
    </Pane>
  );
}

/* ------------------------------------------------ Integrations & commerce */

const CONNECTORS = [
  {
    id: "INV",
    tone: "steel" as const,
    title: "Air inventory gateway",
    blurb: "Search, price, hold, and booking-order orchestration.",
    metrics: [
      { value: "Production", label: "Environment" },
      { value: "300 rpm", label: "Rate limit" },
      { value: "25 Aug", label: "Secret rotated" },
    ],
    signal: "mTLS + OAuth",
  },
  {
    id: "TKT",
    tone: "green" as const,
    title: "Ticket issuance service",
    blurb: "Issue, retrieve, void, and reconcile ticket documents.",
    metrics: [
      { value: "3 retries", label: "Bounded issue retry" },
      { value: "30s", label: "Request timeout" },
      { value: "P0 queue", label: "Failure route" },
    ],
    signal: "Idempotency required",
  },
  {
    id: "PAY",
    tone: "amber" as const,
    title: "Hosted payment gateway",
    blurb: "Single-use hosted sessions, capture webhooks, and refunds.",
    metrics: [
      { value: "BDT", label: "Settlement currency" },
      { value: "Daily", label: "Reconciliation" },
      { value: "10 Aug", label: "Key rotated" },
    ],
    signal: "No card data stored",
  },
  {
    id: "OTP",
    tone: "gray" as const,
    title: "OTP and SMS provider",
    blurb: "Identity verification and critical delivery fallback.",
    metrics: [
      { value: "6 digits", label: "Code policy" },
      { value: "5 min", label: "Expiry" },
      { value: "5 / hour", label: "Rate limit" },
    ],
    signal: "Anti-enumeration enabled",
  },
  {
    id: "BI",
    tone: "violet" as const,
    title: "Analytics event export",
    blurb: "Tenant-scoped metric events to approved warehouse.",
    metrics: [
      { value: "5 min", label: "Batch cadence" },
      { value: "Redacted", label: "Payload" },
      { value: "24h", label: "Retry horizon" },
    ],
    signal: "Schema v8 pinned",
  },
];

function IntegrationsPane({ draft }: { draft: Draft }) {
  const [integration, setIntegration] = useState(false);
  const [commercial, setCommercial] = useState(false);
  const [flags, setFlags] = useState(false);
  const [budget, setBudget] = useState(false);
  const rails = draft.commercial.paymentRails;
  const enabledRails = rails.filter((r) => r.enabled);
  const budgetTotal = draft.commercial.monthlyBudgetBdt;
  // The design shows 19% used. There is no metering here, so the figure is the
  // mockup's — labelled as an estimate rather than presented as measured spend.
  const used = Math.round(budgetTotal * 0.19);
  const forecast = Math.round(budgetTotal * 0.92);

  const email = draft.brand.channels.find((c) => c.id === "email");

  return (
    <Pane tab="integrations">
      <SectionNote label="Production connectors" action={<Btn primary onClick={() => setIntegration(true)}>Add integration</Btn>}>
        Secrets are write-only after entry, rotated without downtime, excluded from logs and exports, and isolated from
        sandbox. Money-moving tools require idempotency, server-side policy checks, and reconciliation.
      </SectionNote>

      <AdminGrid>
        {CONNECTORS.map((c) => (
          <AdminCard
            key={c.id}
            icon={<Monogram label={c.id} tone={c.tone} />}
            title={c.title}
            description={c.blurb}
            status={<Pill tone="green">Healthy</Pill>}
            metrics={<CardMetrics items={c.metrics} />}
            signal={<SecuritySignal>{c.signal}</SecuritySignal>}
            action={<Btn onClick={() => setIntegration(true)}>Configure</Btn>}
          />
        ))}
      </AdminGrid>

      <AdminPanelGrid>
        <Panel
          title="Commercial and payment controls"
          hint="Tenant currency, merchant responsibility, fees, and human authority"
          action={<Btn onClick={() => setCommercial(true)}>Edit</Btn>}
          bodyClass=""
        >
          <SettingRow
            title="Merchant of record"
            description="Responsible entity displayed before payment."
            value={<ConfigValue value={`${draft.brand.brandName} Ltd.`} note="Bangladesh · BDT settlement" />}
            action={<Pill tone="green">Verified</Pill>}
          />
          <SettingRow
            title="Refund authority"
            description="AI cannot approve; all actions use the same policy service."
            value={
              <ConfigValue
                value={`Agent ${bdt(draft.commercial.refundCeilingBdt)}`}
                note={`Above that goes to Finance Duty. Raising this ceiling needs a second approver.`}
              />
            }
            action={<Btn onClick={() => setCommercial(true)}>Edit</Btn>}
          />
          <SettingRow
            title="Payment rails"
            description="Enabling a rail is one of the changes that cannot be self-approved."
            value={
              <ConfigValue
                value={`${enabledRails.length} of ${rails.length} enabled`}
                note={rails.map((r) => `${r.id}${r.enabled ? "" : " (off)"}`).join(" · ")}
              />
            }
            action={<Btn onClick={() => setCommercial(true)}>Review</Btn>}
          />
          <SettingRow
            title="Fee disclosure"
            description="Supplier fare, OTA service fee, gateway fee, and refund fee are itemised."
            value={<ConfigValue value="Fee table FEE-BD-2026-08" note="Effective 12 Aug 2026" />}
            action={<Btn onClick={() => setCommercial(true)}>Open</Btn>}
          />
        </Panel>

        <Panel
          title="Feature rollout"
          hint="Tenant-level production flags with owners and rollback"
          action={<Btn onClick={() => setFlags(true)}>Manage</Btn>}
          bodyClass=""
        >
          <SettingRow
            title="Inbound email workspace"
            description="Controlled pilot for the Customer Care team."
            value={<ConfigValue value={email?.enabled ? "Enabled for new email threads" : "Off"} note="Owner: Support Ops · rollback immediate" />}
            action={<Pill tone={email?.enabled ? "green" : "gray"}>{email?.enabled ? "Pilot" : "Off"}</Pill>}
          />
          <SettingRow
            title="Disruption surge mode"
            description="Supervisor-controlled cohort routing and surge roster."
            value={<ConfigValue value={draft.queues.surgeRosterEnabled ? "Enabled" : "Disabled"} note="One-tenant rollback tested" />}
            action={<Pill tone={draft.queues.surgeRosterEnabled ? "green" : "gray"}>{draft.queues.surgeRosterEnabled ? "On" : "Off"}</Pill>}
          />
          <SettingRow
            title="Sandbox / test mode"
            description="Simulated messages, no money movement, no real customer contact."
            value={<ConfigValue value={draft.brand.sandboxMode ? "Sandbox only" : "Production"} note="Leaving sandbox needs a second approver" />}
            action={<Pill tone={draft.brand.sandboxMode ? "violet" : "green"}>{draft.brand.sandboxMode ? "Test" : "Live"}</Pill>}
          />
          <SettingRow
            title="International booking"
            description="Passport and cross-border processing controls are not approved."
            value={<ConfigValue value="Disabled" note="Privacy and supplier gates incomplete" />}
            action={<Pill tone="gray">Off</Pill>}
          />
        </Panel>
      </AdminPanelGrid>

      <Panel
        title="Tenant usage budget"
        hint="Operational spend guardrails by metered service; customer safety work is never silently dropped"
        action={
          <>
            <Pill tone="green">19% of Sep budget</Pill>
            <Btn onClick={() => setBudget(true)}>Edit budget</Btn>
          </>
        }
        bodyClass=""
      >
        <Table minWidth={900} head={["Budget period", "Approved ceiling", "Used to date", "Forecast", "Alerts", "At ceiling", "Owner"]}>
          <tr>
            <Td>
              <ConfigValue value="September 2026" note="Tenant operations" />
            </Td>
            <Td>
              <b className="text-[11px] font-semibold text-ink">{bdt(budgetTotal)}</b>
            </Td>
            <Td className="text-ink-dim">{bdt(used)} · 19%</Td>
            <Td className="text-ink-dim">{bdt(forecast)} · 92%</Td>
            <Td className="text-ink-dim">75% Ops · 90% Finance · 100% owner</Td>
            <Td className="text-ink-dim">Keep inbound, P0/P1, and human routing live; pause non-critical backfills</Td>
            <Td className="text-ink-dim">{YOU} · Finance partner</Td>
          </tr>
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            The ceiling is the tenant&rsquo;s real <code>commercial.monthlyBudgetBdt</code>. Used and forecast are the
            design&rsquo;s proportions applied to it — nothing here meters spend, and a figure that looked measured would be
            worse than one that is plainly derived.
          </p>
        </div>
      </Panel>

      {integration && <IntegrationModal onClose={() => setIntegration(false)} />}
      {commercial && <CommercialControlsModal onClose={() => setCommercial(false)} />}
      {flags && <FeatureFlagModal onClose={() => setFlags(false)} />}
      {budget && <BudgetControlsModal onClose={() => setBudget(false)} />}
    </Pane>
  );
}

/* ---------------------------------------------------------- Security & data */

function SecurityPane({ draft, edit }: { draft: Draft; edit: Edit }) {
  const [policy, setPolicy] = useState(false);
  const [dataPolicy, setDataPolicy] = useState(false);
  const [legalHold, setLegalHold] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [retention, setRetention] = useState<"transcripts" | "identityDocs" | "paymentRefs" | null>(null);
  const [request, setRequest] = useState(false);
  const [breakGlass, setBreakGlass] = useState(false);
  const [accessPanel, setAccessPanel] = useState(false);
  const assigned = (roleId: string) => draft.security.roleAssignments.filter((a) => a.roleId === roleId).length;

  const RETENTION_ROWS = [
    {
      key: "transcripts" as const,
      label: "Conversation and messages",
      start: "Conversation closed",
      storage: "Encrypted · transcript PII redacted",
      outcome: "Delete content; preserve minimal audit reference",
      exceptions: "Legal hold",
    },
    {
      key: "identityDocs" as const,
      label: "Identity documents",
      start: "Travel completed or booking cancelled",
      storage: "Separate encrypted vault · assigned task only",
      outcome: "Cryptographic and object deletion",
      exceptions: "Dispute or legal hold",
    },
    {
      key: "paymentRefs" as const,
      label: "Booking and financial ledger",
      start: "Transaction completed",
      storage: "Restricted finance store",
      outcome: "Statutory deletion workflow",
      exceptions: "Regulatory obligation",
    },
  ];

  return (
    <Pane tab="security">
      <SectionNote label="Least privilege" action={<Btn onClick={() => setPolicy(true)}>Edit security policy</Btn>}>
        Every role is tenant-scoped. Privileged administration requires SSO and MFA; secrets remain write-only; protected-data
        reveals, exports, role changes, and break-glass access create append-only audit events.
      </SectionNote>

      <AdminPanelGrid>
        <Panel
          title="Authentication and session policy"
          hint="Controls applied to this tenant's users"
          action={<Pill tone={draft.security.mfaRequired ? "green" : "amber"}>{draft.security.mfaRequired ? "Enforced" : "Partial"}</Pill>}
          bodyClass=""
        >
          <SettingRow
            title="Identity provider"
            description="Federated sign-in and employment-state provisioning."
            value={<ConfigValue value="Google Workspace SAML" note="Directory sync every 15 minutes" />}
            action={<Btn onClick={() => setPolicy(true)}>Configure</Btn>}
          />
          <SettingRow
            title="Multi-factor authentication"
            description="Required for admin, finance, supervisor, and protected-data access."
            value={
              <ConfigValue
                value={draft.security.mfaRequired ? "Required for privileged roles" : "Not required"}
                note="Phishing-resistant preferred · TOTP fallback allowed for agents"
              />
            }
            detail={
              <Toggle
                checked={draft.security.mfaRequired}
                onChange={(v) => edit("security.mfaRequired", v)}
                label="MFA required for privileged roles"
              />
            }
          />
          <SettingRow
            title="Session policy"
            description="Reauthentication before high-risk actions."
            value={<ConfigValue value="30m idle · 12h absolute" note="15m privileged step-up window" />}
            action={<Btn onClick={() => setPolicy(true)}>Edit</Btn>}
          />
          <SettingRow
            title="Administrative network"
            description="Restrict production configuration to trusted office or VPN networks."
            value={<ConfigValue value="3 CIDR ranges" note="Emergency exception requires security approval" />}
            action={<Btn onClick={() => setPolicy(true)}>Edit</Btn>}
          />
        </Panel>

        <Panel
          title="Data protection"
          hint="Masking, reveal, export, residency, and legal controls"
          action={<Pill tone="green">Policy v14</Pill>}
          bodyClass=""
        >
          <SettingRow
            title="PII masking"
            description="Phone, email, document, passenger, and payment references."
            value={
              <ConfigValue
                value="Masked by default"
                note={draft.security.piiRevealRequiresReason ? "Task-scoped reveal; reason required" : "Reveal without a reason"}
              />
            }
            detail={
              <Toggle
                checked={draft.security.piiRevealRequiresReason}
                onChange={(v) => edit("security.piiRevealRequiresReason", v)}
                label="PII reveal requires a reason"
              />
            }
          />
          <SettingRow
            title="Data residency"
            description="Approved production processing and storage location."
            value={<ConfigValue value={draft.security.dataResidency} note="DPA approval DPA-2026-14" />}
            detail={
              // Labelled by the row's own heading rather than a second visible
              // "Data residency" above the box.
              <select
                aria-label="Data residency"
                value={draft.security.dataResidency}
                onChange={(e) => edit("security.dataResidency", e.target.value)}
                className="h-10 w-full max-w-[240px] rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
              >
                {["Bangladesh", "Singapore", "EU"].map((r) => (
                  <option key={r} value={r} className="bg-footer">
                    {r}
                  </option>
                ))}
              </select>
            }
          />
          <SettingRow
            title="Exports"
            description="Asynchronous, tenant-scoped, encrypted, and time-limited."
            value={<ConfigValue value="Redacted by default · expires 24h" note="Requester, filters, row count, and download audited" />}
            action={<Btn onClick={() => setDataPolicy(true)}>Edit</Btn>}
          />
          <SettingRow
            title="Legal holds"
            description="Applied before deletion and retention jobs."
            value={<ConfigValue value="1 active hold" note="Legal and Finance owners notified" />}
            action={<Btn onClick={() => setLegalHold(true)}>Manage</Btn>}
          />
          <SettingRow
            title="Sandbox / test mode"
            description="When enabled, messages are simulated and booking actions do not move money. No real customer is contacted."
            detail={
              <div className="flex flex-col gap-3">
                <Toggle
                  checked={draft.brand.sandboxMode}
                  onChange={(v) => edit("brand.sandboxMode", v)}
                  label="Enable sandbox mode"
                />
                {draft.brand.sandboxMode && (
                  <p className="text-xs text-violet-text">
                    Sandbox mode is active. All conversations are simulated and no payment rails will be published.
                  </p>
                )}
              </div>
            }
          />
        </Panel>
      </AdminPanelGrid>

      <Panel
        title="Role and permission matrix"
        hint="Custom roles inherit tenant scope and cannot bypass restricted-data or maker-checker policy"
        action={<Btn onClick={() => setRolesOpen(true)}>Manage roles</Btn>}
        bodyClass=""
      >
        <Table minWidth={820} head={["Role", "Second approver", "MFA", "PII reveal", "Tenant settings", "People assigned"]}>
          {draft.security.roles.map((r) => (
            <tr key={r.id}>
              <Td>
                <ConfigValue value={r.name} note={r.privileged ? "Privileged" : "Standard"} />
              </Td>
              <Td>{r.privileged ? <Pill tone="green">Yes</Pill> : <span className="text-ink-dim">No</span>}</Td>
              <Td className="text-ink-dim">{draft.security.mfaRequired && r.privileged ? "Required" : "—"}</Td>
              <Td className="text-ink-dim">
                {draft.security.piiRevealRequiresReason ? "Reason required" : "No reason needed"}
              </Td>
              <Td className="text-ink-dim">{r.privileged ? "Draft and publish after approval" : "None"}</Td>
              <Td className="text-ink-dim">{assigned(r.id)}</Td>
            </tr>
          ))}
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            The mockup&rsquo;s matrix has a column per task — conversation scope, refund action, routing changes, QA access.
            This one shows five because <code>Role</code> models a name and a <code>privileged</code> flag, and{" "}
            <code>privileged</code> is the only one that gates anything real:{" "}
            <code>canApproveSensitiveChanges()</code> reads it to decide who can act as second approver. Inventing the other
            columns would make this page assert access control it does not enforce.
          </p>
        </div>
      </Panel>

      <Panel
        title="Retention schedule"
        hint="Deletion applies only after legal-hold and financial-ledger exceptions"
        action={<Btn onClick={() => setRetention("transcripts")}>Edit schedule</Btn>}
        bodyClass=""
      >
        <Table minWidth={980} head={["Data class", "Retention", "Start event", "Storage / protection", "Deletion outcome", "Exceptions", "Action"]}>
          {RETENTION_ROWS.map((r) => (
            <tr key={r.key}>
              <Td>
                <b className="text-[11px] font-semibold text-ink">{r.label}</b>
              </Td>
              <Td className="text-ink-dim">{draft.security.retentionDays[r.key]} days</Td>
              <Td className="text-ink-dim">{r.start}</Td>
              <Td className="text-ink-dim">{r.storage}</Td>
              <Td className="text-ink-dim">{r.outcome}</Td>
              <Td className="text-ink-dim">{r.exceptions}</Td>
              <Td>
                <Btn onClick={() => setRetention(r.key)}>Edit</Btn>
              </Td>
            </tr>
          ))}
          <tr>
            <Td>
              <b className="text-[11px] font-semibold text-ink">Audit and security events</b>
            </Td>
            <Td className="text-ink-dim">Append-only</Td>
            <Td className="text-ink-dim">Event occurrence</Td>
            <Td className="text-ink-dim">Integrity protected</Td>
            <Td className="text-ink-dim">Controlled expiry</Td>
            <Td className="text-ink-dim">Security hold</Td>
            <Td>
              <Pill tone="green">Not reducible</Pill>
            </Td>
          </tr>
        </Table>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] leading-relaxed text-ink-dim">
            Shortening any of these windows is the direction that destroys evidence, so it needs a second approver —{" "}
            <code>isSensitiveChange</code> only gates the reduction, not the extension.
          </p>
        </div>
      </Panel>

      <DangerZone
        title="Restricted data operations"
        hint="Never executed from a generic setting toggle"
        heading="Break-glass and tenant data requests"
        actions={
          <>
            <Btn onClick={() => setAccessPanel(true)}>Access panel</Btn>
            <Btn onClick={() => setRequest(true)}>Data request</Btn>
            <Btn danger onClick={() => setBreakGlass(true)}>Request break-glass</Btn>
          </>
        }
      >
        Break-glass is time-boxed to 15 minutes, requires an incident, a second approver, and security notification. Export and
        deletion requests apply legal-hold and ledger exceptions before execution.
      </DangerZone>

      {policy && <SecurityPolicyModal onClose={() => setPolicy(false)} />}
      {dataPolicy && <DataPolicyModal onClose={() => setDataPolicy(false)} />}
      {legalHold && <LegalHoldModal onClose={() => setLegalHold(false)} />}
      {rolesOpen && <RoleModal onClose={() => setRolesOpen(false)} />}
      {retention && <RetentionModal dataClass={retention} onClose={() => setRetention(null)} />}
      {request && <DataRequestModal onClose={() => setRequest(false)} />}
      {breakGlass && <BreakGlassModal onClose={() => setBreakGlass(false)} />}
      {accessPanel && (
        <DialogShell
          title="Roles and break-glass access"
          subtitle="Who holds which role, and who currently has a time-boxed elevation"
          onClose={() => setAccessPanel(false)}
        >
          <RolesAndAccess />
        </DialogShell>
      )}
    </Pane>
  );
}

/* ---------------------------------------------------------- Changes & audit */

function ChangesPane({
  state,
  diffs,
  pending,
  onPublish,
  onTests,
}: {
  state: State;
  diffs: Diff[];
  pending: Approval[];
  onPublish: () => void;
  onTests: () => void;
}) {
  const { dispatch } = useTenantConfig();
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rollback, setRollback] = useState(false);
  const [event, setEvent] = useState<AuditEntry | null>(null);
  const proposed = state.version + 1;
  const blocking = pending.length;
  const rollbackTarget = state.history.length > 1 ? state.history[state.history.length - 2] : null;

  return (
    <Pane tab="changes">
      <AdminLayout
        main={
          <>
            <Panel
              title={`Draft release · proposed v${proposed}`}
              hint={`Created by ${YOU} · not customer-visible`}
              action={
                blocking > 0 ? (
                  <Pill tone="amber">{blocking} approval{blocking === 1 ? "" : "s"} blocking</Pill>
                ) : (
                  <Pill tone="green">No approval blocking</Pill>
                )
              }
              bodyClass=""
            >
              <ChangeSummary
                items={[
                  { value: String(diffs.length), label: "Changed settings" },
                  { value: `${diffs.length - diffs.filter((d) => d.sensitive).length} / ${diffs.length || 0}`, label: "Ready without approval" },
                  { value: `${state.pendingApprovals.filter((p) => p.status === "approved").length} / ${state.pendingApprovals.length}`, label: "Approval routes complete" },
                ]}
              />
              <Checklist>
                {diffs.length === 0 && (
                  <p className="py-3 text-[11px] leading-relaxed text-ink-dim">
                    Nothing is drafted. Every control on the other nine tabs edits this release rather than production; the
                    change appears here the moment you touch one.
                  </p>
                )}
                {diffs.map((d) => (
                  <Check
                    key={d.path}
                    tone={d.sensitive ? "amber" : "green"}
                    title={`${d.label} · ${String(d.before)} → ${String(d.after)}`}
                    detail={
                      d.sensitive
                        ? "Expands risk — an independent approver is required before this can be published."
                        : "Validated. Publishes with the release or on its scheduled window."
                    }
                    trailing={<Pill tone={d.sensitive ? "amber" : "green"}>{d.sensitive ? "Needs approval" : "Ready"}</Pill>}
                  />
                ))}
              </Checklist>
              <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3">
                <Btn onClick={() => dispatch({ type: "DISCARD_DRAFT" })} disabled={diffs.length === 0}>
                  Discard draft
                </Btn>
                <Btn onClick={onTests}>Run all tests</Btn>
                <Btn primary onClick={onPublish} disabled={diffs.length === 0}>
                  Review &amp; publish
                </Btn>
              </div>
            </Panel>

            <Panel
              title="Change requests"
              hint="Maker, risk class, approvals, and intended activation"
              action={
                <Btn
                  onClick={() =>
                    dispatch({
                      type: "RECORD_AUDIT",
                      actor: YOU,
                      action: "Redacted change log exported",
                      detail: `${state.pendingApprovals.length} approval records · ${state.scheduled.length} scheduled changes`,
                    })
                  }
                >
                  Export redacted log
                </Btn>
              }
              bodyClass=""
            >
              <Table minWidth={980} head={["Change", "Area", "Before → after", "Maker", "Approval route", "Activation", "Status", "Action"]}>
                {state.pendingApprovals.length === 0 && state.scheduled.length === 0 && (
                  <tr>
                    <Td colSpan={8} className="text-ink-dim">
                      No change request is open. A sensitive edit opens one here on publish; a non-sensitive one can be
                      scheduled instead.
                    </Td>
                  </tr>
                )}
                {state.pendingApprovals.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <ConfigValue value={p.id.toUpperCase()} note={p.label} />
                    </Td>
                    <Td className="text-ink-dim">{p.path.split(".")[0]}</Td>
                    <Td>
                      <ChangeDiff before={String(p.before)} after={String(p.after)} />
                    </Td>
                    <Td>
                      <AuditActor name={p.requestedBy} role="Maker" />
                    </Td>
                    <Td>
                      <ApprovalRoute
                        steps={[
                          { label: "Maker", done: true },
                          { label: SECOND_APPROVER, done: p.status === "approved" },
                        ]}
                      />
                    </Td>
                    <Td className="text-ink-dim">{p.status === "approved" ? "With next publish" : "After approval"}</Td>
                    <Td>
                      <Pill tone={p.status === "pending" ? "amber" : p.status === "approved" ? "green" : "red"}>
                        {p.status === "pending" ? "Blocked" : p.status === "approved" ? "Approved" : "Rejected"}
                      </Pill>
                    </Td>
                    <Td>
                      {p.status === "pending" ? (
                        <Btn onClick={() => setReviewing(p.id)}>Review</Btn>
                      ) : (
                        <span className="text-[10px] text-ink-dim">{p.resolvedBy ?? "—"}</span>
                      )}
                    </Td>
                  </tr>
                ))}
                {state.scheduled.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <ConfigValue value={s.id.toUpperCase()} note={`${s.diffs.length} setting${s.diffs.length === 1 ? "" : "s"}`} />
                    </Td>
                    <Td className="text-ink-dim">Scheduled</Td>
                    <Td className="text-ink-dim">{s.diffs.map((d) => d.label).join(", ")}</Td>
                    <Td>
                      <AuditActor name={s.requestedBy} role="Maker" />
                    </Td>
                    <Td>
                      <ApprovalRoute steps={[{ label: "Validated", done: true }]} />
                    </Td>
                    <Td className="text-ink-dim">{new Date(s.effectiveAt).toLocaleString()}</Td>
                    <Td>
                      <Pill tone="green">Ready</Pill>
                    </Td>
                    <Td>
                      <Btn onClick={() => dispatch({ type: "CANCEL_SCHEDULED", id: s.id })}>Cancel</Btn>
                    </Td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </>
        }
        aside={
          <>
            <Panel title="Release controls" hint="Validation, approval, activation, and rollback" bodyClass="">
              <Checklist>
                <Check
                  glyph="1"
                  state="Step one"
                  title="Validate in sandbox"
                  detail="Channel contract, routing simulation, policy, access, and isolation tests."
                  trailing={<Btn onClick={onTests}>Run</Btn>}
                />
                <Check
                  glyph="2"
                  state="Step two"
                  tone={blocking > 0 ? "amber" : "green"}
                  title="Collect independent approvals"
                  detail="Approver cannot be the request maker; route follows change risk."
                  trailing={
                    <Pill tone={blocking > 0 ? "amber" : "green"}>
                      {state.pendingApprovals.length - blocking} / {state.pendingApprovals.length || 0}
                    </Pill>
                  }
                />
                <Check
                  glyph="3"
                  state="Step three"
                  tone={state.scheduled.length ? "green" : "gray"}
                  title="Schedule activation"
                  detail="Shows affected queues, channels, people, and customer journeys before it lands."
                  trailing={<Pill tone={state.scheduled.length ? "green" : "gray"}>{state.scheduled.length ? `${state.scheduled.length} queued` : "Not scheduled"}</Pill>}
                />
                <Check
                  glyph="4"
                  state="Step four"
                  title="Monitor and roll back"
                  detail="The previous valid configuration remains one-click recoverable."
                  trailing={<Pill tone="green">{rollbackTarget ? `v${rollbackTarget.version} retained` : "First version"}</Pill>}
                />
              </Checklist>
            </Panel>

            <Panel
              title="Published versions"
              hint="Production activation history"
              action={<Btn onClick={() => setRollback(true)}>Compare</Btn>}
              bodyClass=""
            >
              {[...state.history].reverse().map((h) => (
                <SettingRow
                  key={h.version}
                  title={`v${h.version}${h.version === state.version ? " · current" : ""}`}
                  description={`${h.time} · ${h.publishedBy}`}
                  value={<ConfigValue value={h.note} note={h.version === state.version ? "Live configuration" : "Valid rollback target"} />}
                  action={
                    h.version === state.version ? (
                      <Pill tone="green">Live</Pill>
                    ) : (
                      <Btn onClick={() => setRollback(true)}>Rollback</Btn>
                    )
                  }
                />
              ))}
            </Panel>
          </>
        }
      />

      <Panel
        title="Administrative audit log"
        hint="Append-only record: actor, role, tenant, before/after, reason, approver, session, and effective time"
        action={
          <Btn
            onClick={() =>
              dispatch({
                type: "RECORD_AUDIT",
                actor: YOU,
                action: "Redacted audit log exported",
                detail: `${state.audit.length} entries`,
              })
            }
          >
            Export redacted
          </Btn>
        }
        bodyClass=""
      >
        <Table minWidth={1080} head={["Event / time", "Actor", "Area", "Recorded change", "Approver", "Session / source", "Effective", "Action"]}>
          {[...state.audit].reverse().map((a) => (
            <tr key={a.id}>
              <Td>
                <ConfigValue value={a.id.toUpperCase()} note={a.time} />
              </Td>
              <Td>
                <AuditActor name={a.actor} role={a.role} />
              </Td>
              <Td className="text-ink-dim">{a.action}</Td>
              <Td className="text-ink-dim">{a.detail}</Td>
              <Td className="text-ink-dim">{a.approver ?? "—"}</Td>
              <Td className="text-ink-dim">tenant {a.tenant} · session {a.session}</Td>
              <Td className="text-ink-dim">
                effective {a.session === SETUP_SESSION ? "at setup" : new Date(a.effectiveAt).toLocaleString()}
              </Td>
              <Td>
                <Btn onClick={() => setEvent(a)}>View</Btn>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      {reviewing && <ApprovalReviewModal id={reviewing} onClose={() => setReviewing(null)} />}
      {rollback && <RollbackModal onClose={() => setRollback(false)} />}
      {event && <AuditEventModal entry={event} onClose={() => setEvent(null)} />}
    </Pane>
  );
}
