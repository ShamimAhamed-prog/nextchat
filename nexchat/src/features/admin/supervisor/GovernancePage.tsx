"use client";

import { Bar, Btn, Code, EmptyState, Feed, PageHead, Panel, Pill, Table, Td, type PillTone } from "./mockup/Primitives";

/** `/governance` — a direct replication of the mockup's `#governanceView`. */

const CATALOG: { kpi: string; definition: string; reporting: string; guardrail: string; code?: boolean }[] = [
  { kpi: "Queue wait", definition: "assigned_at − escalated_at", reporting: "Median, p90, p95, sample", guardrail: "Not attributed to receiving agent", code: true },
  { kpi: "Human first response", definition: "first_human_reply_at − escalated_at", reporting: "Median, p90, channel delay", guardrail: "Bot acknowledgement does not stop clock", code: true },
  { kpi: "Agent reaction", definition: "first_human_reply_at − assigned_at", reporting: "Median, p90, sample", guardrail: "Show system delivery separately", code: true },
  { kpi: "Active handling", definition: "Active work + configured wrap-up", reporting: "Mean, median, occupancy input", guardrail: "Exclude waiting and snooze" },
  { kpi: "Resolution time", definition: "resolved_at − escalated_at", reporting: "Gross and SLA-clock time", guardrail: "Money reconciliation never pauses", code: true },
  { kpi: "FCR", definition: "Resolved without transfer/reopen in 72h", reporting: "Rate, denominator, exclusions", guardrail: "Same-reason recontact included" },
  { kpi: "CSAT", definition: "Verified post-resolution responses", reporting: "Mean, distribution, response rate", guardrail: "No imputation; five-response minimum" },
  { kpi: "Occupancy", definition: "Active handling ÷ available login time", reporting: "Team planning cohorts", guardrail: "Never individual excellence target" },
  { kpi: "QA score", definition: "Versioned weighted review", reporting: "Rubric, reviewer, appeal result", guardrail: "Monthly reviewer calibration" },
  { kpi: "AI containment", definition: "AI-eligible conversation resolved without human transfer or same-reason reopen in 72h", reporting: "Rate, numerator, denominator, model/policy version", guardrail: "Exclude deterministic notices and ineligible conversations" },
  { kpi: "AI escalation", definition: "AI-eligible conversation transferred to human ownership", reporting: "Total plus low-confidence, hard-rule, and explicit-request reasons", guardrail: "High rate is not automatically negative for protected intents" },
  { kpi: "Grounded-answer rate", definition: "Fact-bearing AI reply backed by an approved citation or successful tool result", reporting: "Rate, source coverage, blocked-source count", guardrail: "Unsupported replies are blocked, not counted as grounded" },
  { kpi: "Confidence calibration", definition: "Difference between confidence bands and reviewed outcome accuracy", reporting: "ECE, sample, intent, language, model version", guardrail: "Average confidence is never presented as a quality score" },
  { kpi: "AI response latency", definition: "Customer message received to AI reply accepted by channel", reporting: "Median, p90, p95, channel delivery split", guardrail: "Tool and channel delays reported separately" },
];

const POSTURE: { title: string; pill: string; tone: "green" | "amber"; meta: string }[] = [
  { title: "Tenant isolation", pill: "Enforced", tone: "green", meta: "All queries scoped by tenant_id" },
  { title: "PII masking", pill: "Role-based", tone: "green", meta: "Passport, NID, payment references masked by default" },
  { title: "Protected-data reveals", pill: "4 today", tone: "amber", meta: "Actor, reason and conversation recorded" },
];

const EXPORTS: {
  name: string;
  meta: string;
  rows: string;
  status: string;
  tone: PillTone;
  expiry: string;
  progress?: number;
  download?: boolean;
  pending?: string;
}[] = [
  { name: "Monthly team performance · PDF", meta: "Requested by Kazal · filters: team, 30d, all channels", rows: "4,216 rows", status: "Ready", tone: "green", expiry: "Expires 7 Sep", download: true },
  { name: "P0 source events · CSV", meta: "Redacted · audit EX-2041", rows: "1,082 rows", status: "Processing 68%", tone: "amber", expiry: "—", progress: 68, pending: "Preparing" },
];

export default function GovernancePage() {
  return (
    <>
      <PageHead
        eyebrow="Definitions and audit"
        title="KPI governance and exports"
        description="Versioned metric definitions, labelled historical backfills, redacted asynchronous exports and traceable access."
        actions={
          <>
            <Btn modal="backfill">Start labelled backfill</Btn>
            <Btn primary modal="export">New export</Btn>
          </>
        }
      />

      <Panel
        title="Canonical KPI catalog"
        hint="Definition v2.3 · effective 01 Aug 2026 · Asia/Dhaka reporting calendar"
        action={<Pill tone="green">Published</Pill>}
        bodyClass=""
      >
        <Table head={["KPI", "Definition", "Required reporting", "Guardrail"]} minWidth={860} cols={["17%", "31%", "25%", "27%"]}>
          {CATALOG.map((k) => (
            <tr key={k.kpi} className="align-top">
              <Td className="font-semibold">{k.kpi}</Td>
              <Td className={k.code ? undefined : "text-ink-muted"}>{k.code ? <Code>{k.definition}</Code> : k.definition}</Td>
              <Td className="text-ink-dim">{k.reporting}</Td>
              <Td className="text-ink-dim">{k.guardrail}</Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel title="Export jobs" hint="Requester, filters, row count, expiry and audit retained" action={<Btn modal="export">Create export</Btn>} bodyClass="">
          {/*
            This was two hand-built grid rows with the same five columns
            written out twice — a table that had not admitted it was one, so
            it inherited none of the header band, row rules or hover the real
            tables get, and the two rows had already drifted apart in
            alignment. Rendering it through `Table` makes it a table.
          */}
          <Table head={["Export", "Rows", "Status", "Expiry", ""]} minWidth={620}>
            {EXPORTS.map((x) => (
              <tr key={x.name}>
                <Td>
                  <b className="text-xs font-semibold text-ink">{x.name}</b>
                  <small className="mt-0.5 block text-[11px] text-ink-dim">{x.meta}</small>
                  {x.progress !== undefined && (
                    <div className="mt-1.5 max-w-[260px]">
                      <Bar pct={x.progress} tone="amber" />
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-[11px] text-ink-dim">{x.rows}</Td>
                <Td>
                  <Pill tone={x.tone}>{x.status}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-[11px] text-ink-dim">{x.expiry}</Td>
                <Td className="text-right">
                  {x.download ? <Btn modal="export">Download</Btn> : <span className="text-[11px] text-ink-dim">{x.pending}</span>}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Version and backfill history" hint="Historical data changes require an explicit label">
          <Feed
            events={[
              { title: "KPI definition v2.3 published", detail: "Clarified paused intervals for gross and SLA-clock resolution", time: "1 Aug" },
              { title: "Backfill BF-018 completed", detail: "Label: exclude bot acknowledgement from first response · 12,482 facts", time: "3 Aug", tone: "amber" },
              { title: "Export policy v8 approved", detail: "Seven-day expiry and tenant-scoped redaction", time: "9 Aug" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel title="Permission and audit posture" hint="Current session · Operations admin · Takeoff Travels tenant">
          <div className="flex flex-col">
            {POSTURE.map((p) => (
              <div key={p.title} className="border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[13px] font-semibold text-ink">{p.title}</b>
                  <Pill tone={p.tone}>{p.pill}</Pill>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-dim">{p.meta}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Production states" hint="Required fallback behavior" bodyClass="">
          <EmptyState icon="↻" title="Loading, empty, stale and error states included">
            Event-stream loss freezes the last trusted value, shows its timestamp, disables unsafe controls and provides a retry path
            without discarding filters.
          </EmptyState>
        </Panel>
      </div>
    </>
  );
}
