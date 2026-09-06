import { SECOND_APPROVER, YOU } from "@/shared/lib/people";
// Tenant configuration engine — TODO.md "P2: Tenant administration."
// Separate from `inboxEngine.ts` on purpose: this is policy/config state
// (draft → review → publish, versioned, sometimes needing a second
// approver) with its own lifecycle, not live conversation state. Four
// things are wired to actually change behavior elsewhere in the app once
// published, because a config screen that only writes into its own state
// and nothing else isn't demonstrating governance, just a form:
// `ai.killSwitch` (read directly in `ChatPanel.tsx`), each
// `brand.channels.*.enabled` (read in `TicketFilterBar.tsx`), the sum of
// `queues.queues[].maxConcurrency` (read via `totalMaxConcurrency` below,
// in `OfferBanner.tsx`/`ChatPanel.tsx`/`NoEligibleAgentNotice.tsx`) as the
// one real agent's total simultaneous-assignment cap, and a role's
// `privileged` flag (read via `canApproveSensitiveChanges` below, in
// the Changes & audit pane) as the real gate on who can act as the second
// approver — including a temporary break-glass override of that same gate.

export type Priority = "P0" | "P1" | "P2" | "P3";
export type ChannelId = "web" | "whatsapp" | "messenger" | "instagram" | "email";

export type ChannelConfig = { id: ChannelId; label: string; enabled: boolean; connected: boolean };
export type Role = { id: string; name: string; privileged: boolean };

export type TenantConfig = {
  brand: {
    brandName: string;
    supportedLanguages: string[];
    businessHours: string;
    channels: ChannelConfig[];
    /** ADM-06: everything runs against test doubles — no real customer is
     *  contacted and no money moves. Leaving it on in production is the
     *  risk, so the surfaces it governs say so loudly. */
    sandboxMode: boolean;
  };
  queues: {
    queues: { id: string; name: string; baseWeight: number; maxConcurrency: number }[];
    surgeRosterEnabled: boolean;
  };
  ai: {
    killSwitch: boolean;
    allowedIntents: string[];
    confidence: { high: number; guarded: number; clarify: number };
    knowledgeVersion: string;
  };
  sla: {
    targets: Record<Priority, { firstResponseMinutes: number; resolutionMinutes: number }>;
    reopenWindowHours: number;
    afterHours: "queue" | "auto_reply_only";
    /** AG-11: how long a conversation may sit with an agent who has stopped
     *  taking work before it is released back to the queue. */
    unattendedMinutes: number;
  };
  /** SUP-04's "configured threshold" — the PRD is explicit that these are
   *  tenant settings, not constants baked into the dashboard. */
  alerts: {
    queueSurgeWaiting: number;
    escalationSpikePerHour: number;
    channelFailuresBeforeAlert: number;
    /** A disabled rule is skipped in `computeAlerts` entirely — not shown
     *  and greyed out, actually never evaluated. SLA breach and no-eligible-
     *  agent aren't here: they're hard state checks with no threshold to
     *  disable independently of the fact they're describing. */
    enabled: {
      queueSurge: boolean;
      escalationSpike: boolean;
      channelFailure: boolean;
    };
  };
  security: {
    mfaRequired: boolean;
    piiRevealRequiresReason: boolean;
    retentionDays: { transcripts: number; identityDocs: number; paymentRefs: number };
    dataResidency: string;
    /** ADM-02's role composition — a role's `privileged` flag is what
     *  `canApproveSensitiveChanges` below actually checks. */
    roles: Role[];
    roleAssignments: { person: string; roleId: string }[];
  };
  commercial: {
    paymentRails: { id: "bkash" | "nagad" | "card"; enabled: boolean }[];
    refundCeilingBdt: number;
    monthlyBudgetBdt: number;
  };
};

export function defaultTenantConfig(): TenantConfig {
  return {
    brand: {
      brandName: "Takeoff Travels",
      supportedLanguages: ["Bangla", "English", "Banglish"],
      businessHours: "24/7",
      sandboxMode: false,
      channels: [
        { id: "whatsapp", label: "WhatsApp", enabled: true, connected: true },
        { id: "web", label: "Web widget", enabled: true, connected: true },
        { id: "messenger", label: "Messenger", enabled: false, connected: false },
        { id: "instagram", label: "Instagram", enabled: false, connected: false },
        { id: "email", label: "Email", enabled: false, connected: false },
      ],
    },
    queues: {
      queues: [
        { id: "q1", name: "General support", baseWeight: 1, maxConcurrency: 4 },
        { id: "q2", name: "Refunds & disruption", baseWeight: 1.2, maxConcurrency: 3 },
      ],
      surgeRosterEnabled: true,
    },
    ai: {
      killSwitch: false,
      allowedIntents: ["flight.search", "flight.book", "pnr.status", "policy.baggage", "refund.status"],
      // §E2's own default decision-policy bands, verbatim.
      confidence: { high: 0.85, guarded: 0.7, clarify: 0.45 },
      knowledgeVersion: "Fare Rules v3 · 12 Aug 2026",
    },
    sla: {
      targets: {
        P0: { firstResponseMinutes: 5, resolutionMinutes: 60 },
        P1: { firstResponseMinutes: 15, resolutionMinutes: 240 },
        P2: { firstResponseMinutes: 240, resolutionMinutes: 1440 },
        P3: { firstResponseMinutes: 1440, resolutionMinutes: 4320 },
      },
      reopenWindowHours: 72,
      unattendedMinutes: 10,
      afterHours: "queue",
    },
    alerts: {
      queueSurgeWaiting: 3,
      escalationSpikePerHour: 4,
      channelFailuresBeforeAlert: 1,
      enabled: { queueSurge: true, escalationSpike: true, channelFailure: true },
    },
    security: {
      mfaRequired: true,
      piiRevealRequiresReason: true,
      retentionDays: { transcripts: 365, identityDocs: 90, paymentRefs: 2555 },
      dataResidency: "Bangladesh",
      roles: [
        { id: "r-admin", name: "Tenant Admin", privileged: true },
        { id: "r-supervisor", name: "Supervisor", privileged: true },
        { id: "r-agent", name: "Agent", privileged: false },
      ],
      roleAssignments: [
        { person: YOU, roleId: "r-admin" },
        { person: SECOND_APPROVER, roleId: "r-supervisor" },
      ],
    },
    commercial: {
      paymentRails: [
        { id: "bkash", enabled: true },
        { id: "nagad", enabled: false },
        { id: "card", enabled: true },
      ],
      refundCeilingBdt: 15000,
      monthlyBudgetBdt: 500000,
    },
  };
}

export type FieldPath = string; // dot path, e.g. "commercial.refundCeilingBdt"

export type PendingApproval = {
  id: string;
  path: FieldPath;
  label: string;
  before: unknown;
  after: unknown;
  reason: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  resolvedBy?: string;
  resolutionNote?: string;
};

export type ConfigVersion = { version: number; config: TenantConfig; publishedBy: string; note: string; time: string };
/**
 * ADM-07: "actor, role, tenant, before/after values, reason, approver,
 * IP/session and effective time." The entry used to carry four of those.
 * The rest are not decoration — an audit trail that cannot say *which role*
 * an actor held, or *which tenant* the action touched, cannot answer the
 * question it exists for once there is more than one of either.
 */
export type AuditEntry = {
  id: string;
  actor: string;
  /** The role the actor held at the time, not whatever they hold now. */
  role: string;
  tenant: string;
  action: string;
  detail: string;
  /** Who approved it, where the action needed a second pair of eyes. */
  approver?: string;
  /** Session, standing in for the IP/session pair a server would record. */
  session: string;
  /** When it took effect, which is not always when it was requested. */
  effectiveAt: number;
  time: string;
};

/**
 * One id per browser session. A real deployment records the IP and the
 * server-side session; this is the closest a client can honestly get, and
 * it is enough to tell two sessions apart in the trail.
 *
 * Random, so it differs between the server render and the client one. That is
 * fine for entries a user creates — those only ever happen client-side — but
 * the seed entry below is rendered during SSR, so it takes `SETUP_SESSION`
 * instead. Without that, hydration fails on /admin with React's #418 text
 * mismatch: an error that fails no build and shows nothing on screen.
 */
export const SESSION_ID = `sess-${Math.random().toString(36).slice(2, 8)}`;

/** The seed entry's session and time, fixed so SSR and the client agree. */
export const SETUP_SESSION = "setup";

/**
 * ADM-04's "support scheduled activation" — a batch of already-validated,
 * non-sensitive diffs waiting for a future timestamp rather than applying
 * on publish. Only non-sensitive diffs are ever scheduled: a sensitive
 * field always needs its approval gate first (see the `PUBLISH` reducer
 * case), so scheduling and maker-checker never have to be reasoned about
 * together.
 */
export type ScheduledChange = { id: string; effectiveAt: number; diffs: DraftDiff[]; note: string; requestedBy: string };

/**
 * A time-limited elevation, not a permanent role change — the point of
 * break-glass is that it's granted immediately, without waiting on the
 * normal approval flow, in exchange for a mandatory reason and a hard
 * expiry rather than a second approver. One at a time, same simplicity as
 * `disruptions` before this app supported concurrent ones — this is the
 * emergency-access equivalent, not the everyday path.
 */
export type BreakGlassGrant = { id: string; person: string; reason: string; grantedBy: string; grantedAt: number; expiresAt: number };

export type TenantConfigState = {
  published: TenantConfig;
  draft: TenantConfig;
  version: number;
  history: ConfigVersion[];
  pendingApprovals: PendingApproval[];
  scheduled: ScheduledChange[];
  breakGlass: BreakGlassGrant | null;
  audit: AuditEntry[];
};

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

function set<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone: Record<string, unknown> = Array.isArray(obj) ? [...(obj as unknown[])] as unknown as Record<string, unknown> : { ...(obj as Record<string, unknown>) };
  let cursor = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cursor[k];
    cursor[k] = Array.isArray(next) ? [...next] : { ...(next as Record<string, unknown>) };
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}

/**
 * ADM-03's own list — refund authority, AI side-effect scope, retention
 * reduction, payment routing — encoded directionally: only the direction
 * that *expands* risk needs a second approver. Tightening a control never
 * does, the same way you don't need permission to lock a door.
 */
function isSensitiveChange(path: FieldPath, before: unknown, after: unknown): boolean {
  if (path === "commercial.refundCeilingBdt") return Number(after) > Number(before);
  if (path === "ai.killSwitch") return before === true && after === false; // re-enabling AI
  if (path.startsWith("security.retentionDays.")) return Number(after) < Number(before);
  if (path.startsWith("commercial.paymentRails.")) return before === false && after === true;
  // Leaving sandbox is the risky direction: real customers and real money
  // come back. Entering it only ever makes the blast radius smaller.
  if (path === "brand.sandboxMode") return before === true && after === false;
  return false;
}

export type ConfidenceBand = "high" | "guarded" | "clarify" | "handoff";

/**
 * AI-07. The tenant's published bands are the only definition of what a
 * confidence score means, so anything that colours, labels or gates on a
 * score resolves it here rather than carrying its own literals.
 *
 * This exists because `DetailsPanel` used to hardcode `0.85` and `0.45` —
 * the same two numbers as the shipped defaults, which is precisely why
 * nobody noticed that editing and publishing the bands changed nothing.
 * Duplicated constants don't look wrong until one of them is meant to move.
 *
 * TODO: Extend to key by intent × language × channel (AI-07).
 *       Current implementation uses global thresholds only.
 *       Per-dimension bands require calibration UI and drift detection.
 */
export function confidenceBand(score: number, bands: TenantConfig["ai"]["confidence"]): ConfidenceBand {
  if (score >= bands.high) return "high";
  if (score >= bands.guarded) return "guarded";
  if (score >= bands.clarify) return "clarify";
  return "handoff";
}

/** The console's own vocabulary for the bands, plus the floor case. */
export const CONFIDENCE_BAND_LABEL: Record<ConfidenceBand, string> = {
  high: "High",
  guarded: "Guarded",
  clarify: "Clarify",
  handoff: "Handoff",
};

export function validateConfig(draft: TenantConfig): string[] {
  const errors: string[] = [];
  if (draft.commercial.refundCeilingBdt < 0) errors.push("Refund ceiling can't be negative.");
  if (draft.commercial.monthlyBudgetBdt < 0) errors.push("Monthly budget can't be negative.");
  if (!draft.brand.channels.some((c) => c.enabled)) errors.push("At least one channel must stay enabled.");
  for (const [k, v] of Object.entries(draft.security.retentionDays)) {
    if (v < 1) errors.push(`Retention for ${k} must be at least 1 day.`);
  }
  for (const q of draft.queues.queues) {
    if (q.maxConcurrency < 1) errors.push(`${q.name}'s max concurrency must be at least 1.`);
    if (q.baseWeight <= 0) errors.push(`${q.name}'s base weight must be greater than 0.`);
  }
  if (draft.sla.unattendedMinutes < 1) errors.push("Unattended timeout must be at least 1 minute.");
  for (const [k, v] of Object.entries(draft.alerts)) {
    if (typeof v === "number" && v < 1) errors.push(`Alert threshold ${k} must be at least 1.`);
  }
  const { high, guarded, clarify } = draft.ai.confidence;
  if (!(high > guarded && guarded > clarify)) errors.push("Confidence bands must run High > Guarded > Clarify.");
  return errors;
}

export type DraftDiff = { path: FieldPath; label: string; before: unknown; after: unknown; sensitive: boolean; scheduledFor?: number };

const FIELD_LABELS: Record<string, string> = {
  "brand.brandName": "Brand name",
  "brand.businessHours": "Business hours",
  "ai.killSwitch": "AI kill switch",
  "ai.knowledgeVersion": "Knowledge corpus version",
  "brand.sandboxMode": "Sandbox / test mode",
  "alerts.queueSurgeWaiting": "Queue surge threshold",
  "alerts.escalationSpikePerHour": "Escalation spike threshold",
  "alerts.channelFailuresBeforeAlert": "Channel failure threshold",
  "alerts.enabled.queueSurge": "Queue surge alert rule",
  "alerts.enabled.escalationSpike": "Escalation spike alert rule",
  "alerts.enabled.channelFailure": "Channel failure alert rule",
  "sla.reopenWindowHours": "Reopen window",
  "sla.unattendedMinutes": "Unattended conversation timeout",
  "sla.afterHours": "After-hours behavior",
  "security.mfaRequired": "MFA required",
  "security.piiRevealRequiresReason": "PII reveal requires reason",
  "security.dataResidency": "Data residency",
  "commercial.refundCeilingBdt": "Refund ceiling",
  "commercial.monthlyBudgetBdt": "Monthly budget",
};

function labelFor(path: FieldPath): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  if (path.startsWith("brand.channels.")) return `Channel: ${path.split(".")[2]}`;
  if (path.startsWith("security.retentionDays.")) return `Retention — ${path.split(".")[2]}`;
  if (path.startsWith("commercial.paymentRails.")) return `Payment rail: ${path.split(".")[2]}`;
  if (path.startsWith("ai.confidence.")) return `AI confidence — ${path.split(".")[2]}`;
  if (path.startsWith("sla.targets.")) {
    const parts = path.split(".");
    const metric = parts[3] === "firstResponseMinutes" ? "first response" : "resolution";
    return `SLA target — ${parts[2]} ${metric}`;
  }
  if (path.startsWith("queues.queues.")) {
    const parts = path.split(".");
    const field = parts[3] === "baseWeight" ? "base weight" : "max concurrency";
    return `Queue: ${parts[2]} — ${field}`; // raw queue id, same convention as "Channel: whatsapp" above
  }
  return path;
}

const DIFF_PATHS: FieldPath[] = [
  "brand.brandName",
  "brand.businessHours",
  "brand.channels.whatsapp.enabled",
  "brand.channels.web.enabled",
  "brand.channels.messenger.enabled",
  "brand.channels.instagram.enabled",
  "brand.channels.email.enabled",
  "queues.surgeRosterEnabled",
  "queues.queues.q1.baseWeight",
  "queues.queues.q1.maxConcurrency",
  "queues.queues.q2.baseWeight",
  "queues.queues.q2.maxConcurrency",
  "brand.sandboxMode",
  "alerts.queueSurgeWaiting",
  "alerts.escalationSpikePerHour",
  "alerts.channelFailuresBeforeAlert",
  "alerts.enabled.queueSurge",
  "alerts.enabled.escalationSpike",
  "alerts.enabled.channelFailure",
  "sla.unattendedMinutes",
  "sla.targets.P0.firstResponseMinutes",
  "sla.targets.P0.resolutionMinutes",
  "sla.targets.P1.firstResponseMinutes",
  "sla.targets.P1.resolutionMinutes",
  "sla.targets.P2.firstResponseMinutes",
  "sla.targets.P2.resolutionMinutes",
  "sla.targets.P3.firstResponseMinutes",
  "sla.targets.P3.resolutionMinutes",
  "ai.killSwitch",
  "ai.knowledgeVersion",
  "ai.confidence.high",
  "ai.confidence.guarded",
  "ai.confidence.clarify",
  "sla.reopenWindowHours",
  "sla.afterHours",
  "security.mfaRequired",
  "security.piiRevealRequiresReason",
  "security.retentionDays.transcripts",
  "security.retentionDays.identityDocs",
  "security.retentionDays.paymentRefs",
  "security.dataResidency",
  "commercial.refundCeilingBdt",
  "commercial.monthlyBudgetBdt",
  "commercial.paymentRails.bkash.enabled",
  "commercial.paymentRails.nagad.enabled",
  "commercial.paymentRails.card.enabled",
];

// A few paths above are synthetic (e.g. "brand.channels.whatsapp.enabled"
// addresses an array by id, not index) — resolved through these two
// helpers rather than `get`/`set`, which only walk plain object keys.
function readSynthetic(config: TenantConfig, path: FieldPath): unknown {
  const parts = path.split(".");
  if (parts[0] === "brand" && parts[1] === "channels") return config.brand.channels.find((c) => c.id === parts[2])?.enabled;
  if (parts[0] === "commercial" && parts[1] === "paymentRails") return config.commercial.paymentRails.find((r) => r.id === parts[2])?.enabled;
  if (parts[0] === "queues" && parts[1] === "queues") {
    const queue = config.queues.queues.find((q) => q.id === parts[2]);
    return parts[3] === "baseWeight" ? queue?.baseWeight : queue?.maxConcurrency;
  }
  return get(config, path);
}

export function diffDraft(published: TenantConfig, draft: TenantConfig, scheduled: ScheduledChange[] = []): DraftDiff[] {
  const diffs: DraftDiff[] = [];
  for (const path of DIFF_PATHS) {
    const before = readSynthetic(published, path);
    const after = readSynthetic(draft, path);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      const activeSchedule = scheduled.find((s) => s.diffs.some((d) => d.path === path));
      diffs.push({ path, label: labelFor(path), before, after, sensitive: isSensitiveChange(path, before, after), scheduledFor: activeSchedule?.effectiveAt });
    }
  }
  return diffs;
}

function applySynthetic(config: TenantConfig, path: FieldPath, value: unknown): TenantConfig {
  const parts = path.split(".");
  if (parts[0] === "brand" && parts[1] === "channels") {
    return { ...config, brand: { ...config.brand, channels: config.brand.channels.map((c) => (c.id === parts[2] ? { ...c, enabled: value as boolean } : c)) } };
  }
  if (parts[0] === "commercial" && parts[1] === "paymentRails") {
    return { ...config, commercial: { ...config.commercial, paymentRails: config.commercial.paymentRails.map((r) => (r.id === parts[2] ? { ...r, enabled: value as boolean } : r)) } };
  }
  if (parts[0] === "queues" && parts[1] === "queues") {
    const field = parts[3] as "baseWeight" | "maxConcurrency";
    return { ...config, queues: { ...config.queues, queues: config.queues.queues.map((q) => (q.id === parts[2] ? { ...q, [field]: value as number } : q)) } };
  }
  return set(config, path, value);
}

/** The one real agent's total simultaneous-assignment cap — see the file
 *  header comment for where this actually gates something. */
export function totalMaxConcurrency(config: TenantConfig): number {
  return config.queues.queues.reduce((sum, q) => sum + q.maxConcurrency, 0);
}

/**
 * ADM-02's role composition made real rather than a flag with nothing
 * behind it: whether `person` can act as the second approver on a
 * sensitive change (the Changes & audit pane's approval review) depends
 * on their assigned role's `privileged` flag, or a live break-glass grant.
 */
export function canApproveSensitiveChanges(config: TenantConfig, person: string, breakGlass: BreakGlassGrant | null, now: number): boolean {
  const assignment = config.security.roleAssignments.find((a) => a.person === person);
  const role = assignment ? config.security.roles.find((r) => r.id === assignment.roleId) : undefined;
  if (role?.privileged) return true;
  return Boolean(breakGlass && breakGlass.person === person && breakGlass.expiresAt > now);
}

let uid = 0;
function nid(prefix: string): string {
  uid += 1;
  return `${prefix}${uid}`;
}
function nowLabel(): string {
  return "just now";
}
function audit(
  actor: string,
  action: string,
  detail: string,
  extra: { role?: string; approver?: string; effectiveAt?: number; session?: string } = {},
): AuditEntry {
  return {
    id: nid("aud"),
    actor,
    role: extra.role ?? "—",
    tenant: TENANT_ID,
    action,
    detail,
    approver: extra.approver,
    session: extra.session ?? SESSION_ID,
    effectiveAt: extra.effectiveAt ?? Date.now(),
    time: nowLabel(),
  };
}

/** Single tenant in this prototype, but the field is not optional. */
export const TENANT_ID = "takeoff-travels";

export function roleOf(config: TenantConfig, person: string): string {
  const assignment = config.security.roleAssignments.find((a) => a.person === person);
  const role = config.security.roles.find((r) => r.id === assignment?.roleId);
  return role ? role.name : "Unassigned";
}

// Imported *and* re-exported: existing call sites keep importing these from
// the engine they already depend on, while the values themselves live once.
export { YOU, SECOND_APPROVER };

export function initialTenantConfigState(): TenantConfigState {
  const config = defaultTenantConfig();
  return {
    published: config,
    draft: config,
    version: 1,
    history: [{ version: 1, config, publishedBy: "System", note: "Initial configuration", time: "Setup" }],
    pendingApprovals: [],
    scheduled: [],
    breakGlass: null,
    audit: [audit("System", "Initialized", "Tenant configuration created at v1", { role: "System", session: SETUP_SESSION, effectiveAt: 0 })],
  };
}

export type ConfigAction =
  | { type: "EDIT_DRAFT"; path: FieldPath; value: unknown }
  | { type: "DISCARD_DRAFT" }
  | { type: "PUBLISH"; note: string; scheduleFor?: number }
  | { type: "APPROVE"; id: string }
  | { type: "REJECT"; id: string; note: string }
  | { type: "ROLLBACK"; toVersion: number }
  | { type: "APPLY_SCHEDULED"; id: string }
  | { type: "CANCEL_SCHEDULED"; id: string }
  | { type: "ADD_ROLE"; name: string; privileged: boolean }
  | { type: "REMOVE_ROLE"; id: string }
  | { type: "SET_ROLE_PRIVILEGED"; id: string; privileged: boolean }
  | { type: "ASSIGN_ROLE"; person: string; roleId: string }
  | { type: "GRANT_BREAK_GLASS"; person: string; reason: string; minutes: number }
  | { type: "REVOKE_BREAK_GLASS" }
  | { type: "EXPIRE_BREAK_GLASS"; id: string }
  /** SUP-08 writes its audit record here rather than starting a second
   *  audit trail — an export is an administrative action like any other. */
  | { type: "RECORD_AUDIT"; actor: string; action: string; detail: string };

export function tenantConfigReducer(state: TenantConfigState, action: ConfigAction): TenantConfigState {
  // Every entry records the role the actor held at the time — see AuditEntry.
  const aud = (
    actor: string,
    act: string,
    detail: string,
    extra: { approver?: string; effectiveAt?: number } = {},
  ): AuditEntry => audit(actor, act, detail, { role: roleOf(state.published, actor), ...extra });

  switch (action.type) {
    case "EDIT_DRAFT":
      return { ...state, draft: applySynthetic(state.draft, action.path, action.value) };
    case "DISCARD_DRAFT":
      // Not a blanket reset to `published` — a still-pending approval or a
      // still-pending schedule already represents a committed request, not
      // an in-progress edit, so discarding shouldn't make either one look
      // reverted in the form while it's still going to apply later.
      return { ...state, draft: projectedDraft(state.published, state.pendingApprovals.filter((p) => p.status === "pending"), state.scheduled) };
    case "PUBLISH": {
      const diffs = diffDraft(state.published, state.draft, state.scheduled);
      if (diffs.length === 0) return state;
      const errors = validateConfig(state.draft);
      if (errors.length > 0) return state; // caller is expected to check validateConfig before dispatching
      const alreadyPending = new Set(state.pendingApprovals.filter((p) => p.status === "pending").map((p) => p.path));
      const alreadyScheduled = new Set(state.scheduled.flatMap((s) => s.diffs.map((d) => d.path)));
      // Skip re-requesting/re-scheduling a field that already has one in
      // flight — otherwise clicking Publish twice before the first request
      // resolves queues a second, duplicate one for the same change.
      const sensitive = diffs.filter((d) => d.sensitive && !alreadyPending.has(d.path));
      const direct = diffs.filter((d) => !d.sensitive && !alreadyScheduled.has(d.path));
      if (direct.length === 0 && sensitive.length === 0) return state;

      // Scheduled activation only applies to a batch with nothing sensitive
      // in it — see `ScheduledChange`'s doc comment for why.
      if (action.scheduleFor && sensitive.length === 0 && direct.length > 0) {
        const change: ScheduledChange = { id: nid("sched"), effectiveAt: action.scheduleFor, diffs: direct, note: action.note, requestedBy: YOU };
        const scheduled = [...state.scheduled, change];
        return {
          ...state,
          scheduled,
          draft: projectedDraft(state.published, state.pendingApprovals.filter((p) => p.status === "pending"), scheduled),
          audit: [...state.audit, aud(YOU, "Scheduled", `${direct.length} change(s) effective ${new Date(action.scheduleFor).toLocaleString()} — ${action.note}`, { effectiveAt: action.scheduleFor })],
        };
      }

      let published = state.published;
      for (const d of direct) published = applySynthetic(published, d.path, d.after);

      const newApprovals: PendingApproval[] = sensitive.map((d) => ({
        id: nid("appr"),
        path: d.path,
        label: d.label,
        before: d.before,
        after: d.after,
        reason: action.note,
        requestedBy: YOU,
        status: "pending",
      }));

      const auditEntries: AuditEntry[] = [];
      if (direct.length > 0) {
        auditEntries.push(aud(YOU, "Published", `${direct.length} change(s) — ${action.note}`));
      }
      for (const a of newApprovals) {
        auditEntries.push(aud(YOU, "Approval requested", `${a.label}: ${JSON.stringify(a.before)} → ${JSON.stringify(a.after)}`));
      }

      const version = direct.length > 0 ? state.version + 1 : state.version;
      const history = direct.length > 0 ? [...state.history, { version, config: published, publishedBy: YOU, note: action.note, time: nowLabel() }] : state.history;
      const pendingApprovals = [...state.pendingApprovals, ...newApprovals];

      // Draft keeps any still-pending sensitive/scheduled values showing (so
      // the admin can see what they asked for) but reflects the
      // newly-published state for everything that went live directly.
      return { ...state, published, draft: projectedDraft(published, pendingApprovals.filter((p) => p.status === "pending"), state.scheduled), version, history, pendingApprovals, audit: [...state.audit, ...auditEntries] };
    }
    case "APPROVE": {
      const item = state.pendingApprovals.find((p) => p.id === action.id);
      if (!item || item.status !== "pending") return state;
      const published = applySynthetic(state.published, item.path, item.after);
      const version = state.version + 1;
      const pendingApprovals = state.pendingApprovals.map((p) => (p.id === action.id ? { ...p, status: "approved" as const, resolvedBy: SECOND_APPROVER } : p));
      // Rebuilt from `published`, not the previous draft — otherwise any
      // *other* fields still sitting in pendingApprovals/scheduled would be
      // silently dropped from view the moment any one approval resolves.
      const draft = projectedDraft(published, pendingApprovals.filter((p) => p.status === "pending"), state.scheduled);
      return {
        ...state,
        published,
        draft,
        version,
        history: [...state.history, { version, config: published, publishedBy: SECOND_APPROVER, note: `Approved: ${item.label}`, time: nowLabel() }],
        pendingApprovals,
        audit: [
          ...state.audit,
          aud(SECOND_APPROVER, "Approved", `${item.label}: ${JSON.stringify(item.before)} → ${JSON.stringify(item.after)}`, {
            approver: SECOND_APPROVER,
          }),
        ],
      };
    }
    case "REJECT": {
      const item = state.pendingApprovals.find((p) => p.id === action.id);
      if (!item || item.status !== "pending") return state;
      const pendingApprovals = state.pendingApprovals.map((p) => (p.id === action.id ? { ...p, status: "rejected" as const, resolvedBy: SECOND_APPROVER, resolutionNote: action.note } : p));
      const draft = projectedDraft(state.published, pendingApprovals.filter((p) => p.status === "pending"), state.scheduled);
      return {
        ...state,
        draft,
        pendingApprovals,
        audit: [
          ...state.audit,
          aud(SECOND_APPROVER, "Rejected", `${item.label} — ${action.note}`, { approver: SECOND_APPROVER }),
        ],
      };
    }
    case "ROLLBACK": {
      const target = state.history.find((h) => h.version === action.toVersion);
      if (!target) return state;
      const version = state.version + 1;
      return {
        ...state,
        published: target.config,
        draft: target.config,
        version,
        history: [...state.history, { version, config: target.config, publishedBy: YOU, note: `Rolled back to v${action.toVersion}`, time: nowLabel() }],
        audit: [...state.audit, aud(YOU, "Rolled back", `To v${action.toVersion} (${target.note})`)],
      };
    }
    case "APPLY_SCHEDULED": {
      const item = state.scheduled.find((s) => s.id === action.id);
      if (!item) return state;
      let published = state.published;
      for (const d of item.diffs) published = applySynthetic(published, d.path, d.after);
      const version = state.version + 1;
      const scheduled = state.scheduled.filter((s) => s.id !== action.id);
      const draft = projectedDraft(published, state.pendingApprovals.filter((p) => p.status === "pending"), scheduled);
      return {
        ...state,
        published,
        draft,
        version,
        scheduled,
        history: [...state.history, { version, config: published, publishedBy: item.requestedBy, note: `Scheduled change applied — ${item.note}`, time: nowLabel() }],
        audit: [...state.audit, aud(item.requestedBy, "Scheduled change applied", `${item.diffs.length} change(s) — ${item.note}`)],
      };
    }
    case "CANCEL_SCHEDULED": {
      const item = state.scheduled.find((s) => s.id === action.id);
      if (!item) return state;
      const scheduled = state.scheduled.filter((s) => s.id !== action.id);
      const draft = projectedDraft(state.published, state.pendingApprovals.filter((p) => p.status === "pending"), scheduled);
      return { ...state, scheduled, draft, audit: [...state.audit, aud(YOU, "Schedule canceled", `${item.diffs.length} change(s) — ${item.note}`)] };
    }
    // Role composition and break-glass are immediate + audited, not part of
    // the draft/version/publish lifecycle the six config domains above use
    // — the diff engine's `DIFF_PATHS` is a fixed list of known scalar
    // paths and doesn't generalize to array insert/remove without a larger
    // rework, which felt like more machinery than this gap warranted. Both
    // `published` and `draft` are updated in lockstep so the two never
    // drift apart for these two fields specifically.
    case "ADD_ROLE": {
      const role: Role = { id: nid("role"), name: action.name, privileged: action.privileged };
      const withRole = (c: TenantConfig): TenantConfig => ({ ...c, security: { ...c.security, roles: [...c.security.roles, role] } });
      return { ...state, published: withRole(state.published), draft: withRole(state.draft), audit: [...state.audit, aud(YOU, "Role created", `${role.name}${role.privileged ? " (privileged)" : ""}`)] };
    }
    case "REMOVE_ROLE": {
      const role = state.published.security.roles.find((r) => r.id === action.id);
      if (!role) return state;
      const inUse = state.published.security.roleAssignments.some((a) => a.roleId === action.id);
      if (inUse) return state; // caller checks first — a role in use can't be deleted out from under whoever holds it
      const withoutRole = (c: TenantConfig): TenantConfig => ({ ...c, security: { ...c.security, roles: c.security.roles.filter((r) => r.id !== action.id) } });
      return { ...state, published: withoutRole(state.published), draft: withoutRole(state.draft), audit: [...state.audit, aud(YOU, "Role removed", role.name)] };
    }
    case "SET_ROLE_PRIVILEGED": {
      const role = state.published.security.roles.find((r) => r.id === action.id);
      if (!role) return state;
      const update = (c: TenantConfig): TenantConfig => ({ ...c, security: { ...c.security, roles: c.security.roles.map((r) => (r.id === action.id ? { ...r, privileged: action.privileged } : r)) } });
      return {
        ...state,
        published: update(state.published),
        draft: update(state.draft),
        audit: [...state.audit, aud(YOU, action.privileged ? "Role marked privileged" : "Role unmarked privileged", role.name)],
      };
    }
    case "ASSIGN_ROLE": {
      const role = state.published.security.roles.find((r) => r.id === action.roleId);
      if (!role) return state;
      const update = (c: TenantConfig): TenantConfig => ({
        ...c,
        security: { ...c.security, roleAssignments: [...c.security.roleAssignments.filter((a) => a.person !== action.person), { person: action.person, roleId: action.roleId }] },
      });
      return { ...state, published: update(state.published), draft: update(state.draft), audit: [...state.audit, aud(YOU, "Role assigned", `${action.person} → ${role.name}`)] };
    }
    case "GRANT_BREAK_GLASS": {
      if (state.breakGlass) return state; // one emergency grant at a time, by design — not the everyday path
      const grant: BreakGlassGrant = { id: nid("bg"), person: action.person, reason: action.reason, grantedBy: YOU, grantedAt: Date.now(), expiresAt: Date.now() + action.minutes * 60_000 };
      return { ...state, breakGlass: grant, audit: [...state.audit, aud(YOU, "Break-glass granted", `${action.person} — ${action.minutes}m — ${action.reason}`)] };
    }
    case "REVOKE_BREAK_GLASS": {
      if (!state.breakGlass) return state;
      const g = state.breakGlass;
      return { ...state, breakGlass: null, audit: [...state.audit, aud(YOU, "Break-glass revoked", g.person)] };
    }
    case "RECORD_AUDIT":
      return { ...state, audit: [...state.audit, aud(action.actor, action.action, action.detail)] };
    case "EXPIRE_BREAK_GLASS": {
      if (!state.breakGlass || state.breakGlass.id !== action.id) return state;
      const g = state.breakGlass;
      return { ...state, breakGlass: null, audit: [...state.audit, aud("System", "Break-glass expired", g.person)] };
    }
    default:
      return state;
  }
}

/** Layers still-pending approval targets and still-pending scheduled
 *  targets onto `published` to produce what the draft form should show —
 *  neither one is a live edit, but both are committed requests waiting to
 *  take effect, so the form keeps showing what was actually asked for. */
function projectedDraft(published: TenantConfig, pending: PendingApproval[], scheduled: ScheduledChange[]): TenantConfig {
  let draft = published;
  for (const p of pending) draft = applySynthetic(draft, p.path, p.after);
  for (const s of scheduled) for (const d of s.diffs) draft = applySynthetic(draft, d.path, d.after);
  return draft;
}
