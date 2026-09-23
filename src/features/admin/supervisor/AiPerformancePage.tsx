"use client";

import { AuditNote, Btn, Filters, Funnel, Histogram, Kpi, PageHead, Panel, Pill, ReasonBars, Seg, Table, Td, type PillTone } from "../mockup/Primitives";

/** `/ai-performance` — a direct replication of the mockup's `#aiPerformanceView`. */

const CHANNELS: { channel: string; convos: string; containment: string; good?: boolean; escalation: string; grounded: string; csat: string; p95: string; status: string; tone: PillTone }[] = [
  { channel: "Web chat", convos: "3,120", containment: "77.4%", good: true, escalation: "14.9%", grounded: "99.1%", csat: "4.38", p95: "1.2s", status: "Healthy", tone: "green" },
  { channel: "WhatsApp", convos: "2,840", containment: "69.8%", good: true, escalation: "20.9%", grounded: "98.4%", csat: "4.29", p95: "2.1s", status: "Healthy", tone: "green" },
  { channel: "Messenger", convos: "1,460", containment: "67.2%", escalation: "25.4%", grounded: "98.5%", csat: "4.21", p95: "1.9s", status: "Watch", tone: "amber" },
  { channel: "Email", convos: "1,000", containment: "71.8%", escalation: "19.3%", grounded: "98.9%", csat: "4.35", p95: "3.4s", status: "Healthy", tone: "green" },
];

const LANGUAGES = [
  { language: "English", volume: "3,740", containment: "75.6%", good: true, escalation: "17.1%", grounded: "99.0%", csat: "4.37", p95: "1.5s" },
  { language: "Bangla", volume: "3,280", containment: "71.2%", escalation: "19.7%", grounded: "98.5%", csat: "4.29", p95: "1.9s" },
  { language: "Banglish", volume: "1,200", containment: "66.8%", escalation: "25.2%", grounded: "97.6%", csat: "4.16", p95: "2.0s" },
  { language: "Other / fallback", volume: "200", containment: "65.8%", escalation: "17.0%", grounded: "98.0%", csat: "4.22", p95: "2.4s" },
];

const INTENTS: { intent: string; volume: string; conf: string; containment: string; good?: boolean; escalation: string; escGood?: boolean; accuracy: string; sample: string; status: string; tone: PillTone }[] = [
  { intent: "Booking status", volume: "2,150", conf: ".88", containment: "86.2%", good: true, escalation: "8.1%", accuracy: "98.8%", sample: "n=340", status: "Healthy", tone: "green" },
  { intent: "Baggage allowance", volume: "1,640", conf: ".84", containment: "80.6%", good: true, escalation: "11.9%", accuracy: "97.9%", sample: "n=260", status: "Healthy", tone: "green" },
  { intent: "Refund policy", volume: "1,310", conf: ".76", containment: "68.7%", escalation: "23.4%", accuracy: "95.8%", sample: "n=210", status: "Watch grounding", tone: "amber" },
  { intent: "Name changes", volume: "980", conf: ".72", containment: "61.8%", escalation: "28.9%", accuracy: "94.6%", sample: "n=160", status: "Review boundary", tone: "amber" },
  { intent: "Payment / ticket failure", volume: "890", conf: ".54", containment: "18.2%", escalation: "75.1%", escGood: true, accuracy: "99.2%", sample: "n=140", status: "Protected handoff", tone: "violet" },
  { intent: "Disruption / rebooking", volume: "1,450", conf: ".66", containment: "52.7%", escalation: "39.6%", accuracy: "96.4%", sample: "n=130", status: "Expected caution", tone: "amber" },
];

const HEALTH: { title: string; pill: string; tone: PillTone; value: string; note: string }[] = [
  { title: "Model release", pill: "Stable", tone: "green", value: "v3.8", note: "100% traffic · deployed 14 Aug · rollback ready" },
  { title: "Knowledge freshness", pill: "3 blocked", tone: "amber", value: "99.2%", note: "Approved sources within validity window" },
  { title: "Tool execution", pill: "Healthy", tone: "green", value: "97.6%", note: "p95 1.1s · retry budget 0.7%" },
  { title: "Safety guardrails", pill: "Enforced", tone: "green", value: "51", note: "Fallbacks before delivery · 100% audit traces" },
  { title: "Inference cost", pill: "68% budget", tone: "green", value: "$0.10", note: "Per contained outcome · $612 total" },
];

const REVIEWS: { title: string; sub: string; conf: string; decision: string; decisionTone: string; flag: string }[] = [
  { title: "C-1079 · Name mismatch after schedule change", sub: "Banglish · Messenger · intent boundary", conf: ".41 confidence", decision: "Handoff", decisionTone: "var(--color-warn-text)", flag: "Calibration sample" },
  { title: "C-1068 · Refund timeline answer reopened", sub: "Bangla · WhatsApp · citation POL-REF-19", conf: ".73 confidence", decision: "Direct", decisionTone: "var(--color-danger-text)", flag: "Possible false containment" },
  { title: "C-1057 · Paid, ticket not issued", sub: "English · Web chat · hard policy rule", conf: ".38 confidence", decision: "Handoff", decisionTone: "var(--color-warn-text)", flag: "Expected action" },
];

const T_CONTAIN = [63, 67, 60, 59, 54, 57, 49, 52, 45, 48, 41, 43, 38, 40, 36];
const T_ESCALATE = [178, 174, 181, 175, 184, 180, 187, 183, 190, 188, 194, 191, 197, 194, 198];
const T_AUDIT = [219, 220, 218, 219, 221, 220, 222, 221, 223, 222, 224, 223, 224, 225, 224];

export default function AiPerformancePage() {
  return (
    <>
      <PageHead
        eyebrow="AI operations"
        title="AI agent performance"
        description="Automation quality, calibrated confidence, safe escalation, grounded answers, response speed, and customer outcomes across every supported channel."
        actions={
          <>
            <Btn>AI policy thresholds</Btn>
            <Btn primary modal="export">Export dashboard</Btn>
          </>
        }
      />

      <Filters
        fields={[
          { label: "Date range", options: ["Last 30 days", "Last 7 days", "Quarter to date"] },
          { label: "Tenant", options: ["Nexchatgen", "Authorized tenants"] },
          { label: "Model release", options: ["ota-support-v3.8", "Compare with v3.7"] },
          { label: "Channel", options: ["All channels", "Web chat", "WhatsApp", "Messenger", "Email"] },
          { label: "Language", options: ["All languages", "Bangla", "English", "Banglish"] },
          { label: "Intent", options: ["All intents", "Booking status", "Baggage allowance", "Refund policy", "Payment failure"] },
          { label: "Decision", options: ["All decisions", "Direct answer", "Clarification", "Human handoff"] },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-violet-border-alt bg-violet-bg-soft px-3.5 py-3 text-[10px] leading-relaxed text-ink-muted">
        <Pill tone="violet">Production</Pill>
        <span>
          <b className="text-violet-text">ota-support-v3.8</b> · policy v28 · knowledge snapshot 31 Aug 2026 · 8,420 AI-eligible conversations
        </span>
        <code className="ml-auto text-[9px] text-violet-text">Metrics frozen at resolution + 72h reopen window</code>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="AI conversations" delta="+9.4%" value="8,420" note="76.8% of inbound conversations eligible" />
        <Kpi label="Containment" delta="+3.1%" value="72.4%" note="6,096 resolved without human transfer or 72h reopen" />
        <Kpi label="Human escalation" delta="−1.8%" value="19.3%" note="1,622 handoffs · reason captured for every case" />
        <Kpi label="Grounded answers" delta="+0.5%" value="98.7%" note="7,390 of 7,487 fact-bearing replies cited or tool-backed" />
        <Kpi label="AI CSAT" delta="+0.14" value="4.31" suffix=" / 5" note="2,106 responses · 34.5% response rate" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Average confidence" delta="Stable" value="0.78" note="Median .82 · compare only within model v3.8" />
        <Kpi label="Calibration error" delta="−0.9%" value="3.8%" note="Expected calibration error · 1,240 reviewed outcomes" />
        <Kpi label="First response" delta="Target met" value="1.3s" note="Platform p95 · end-to-end 1.8s including delivery" />
        <Kpi label="Tool success" delta="−0.4%" deltaTone="amber" value="97.6%" note="5,148 of 5,275 policy-permitted calls succeeded" />
        <Kpi label="Safe fallback" delta="Within limit" value="0.6%" note="51 guarded responses · blocked before customer delivery" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel title="Automation and escalation trend" hint="Daily decision rates for the selected production cohort" action={<Seg options={["7D", "30D", "90D"]} active="30D" />}>
          <div className="mb-2 flex flex-wrap gap-4 text-[10px] text-ink-dim">
            <span className="flex items-center gap-1.5"><i aria-hidden className="h-[3px] w-4 rounded-full bg-ok-fill" />Containment</span>
            <span className="flex items-center gap-1.5"><i aria-hidden className="h-[3px] w-4 rounded-full bg-violet-fill" />Human escalation</span>
            <span className="flex items-center gap-1.5"><i aria-hidden className="h-[3px] w-4 rounded-full bg-danger-fill" />Incorrect-answer audits</span>
          </div>
          <svg viewBox="0 0 760 250" className="w-full" role="img" aria-label="AI containment, escalation, and incorrect-answer audit rates over 30 days">
            <defs>
              <linearGradient id="ai-trend-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-ok-fill)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-ok-fill)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[30, 80, 130, 180, 230].map((y) => (
              <line key={y} x1="40" y1={y} x2="740" y2={y} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            {[{ y: 34, t: "80%" }, { y: 84, t: "60%" }, { y: 134, t: "40%" }, { y: 184, t: "20%" }, { y: 234, t: "0%" }].map((l) => (
              <text key={l.t} x="4" y={l.y} fill="var(--color-ink-dim)" fontSize="9">{l.t}</text>
            ))}
            <polygon
              points={`40,240 ${T_CONTAIN.map((y, i) => `${40 + i * 50},${y}`).join(" ")} ${40 + (T_CONTAIN.length - 1) * 50},240`}
              fill="url(#ai-trend-area)"
              stroke="none"
            />
            {[
              { pts: T_CONTAIN, stroke: "var(--color-ok-fill)" },
              { pts: T_ESCALATE, stroke: "var(--color-violet-fill)" },
              { pts: T_AUDIT, stroke: "var(--color-danger-fill)" },
            ].map((s) => (
              <polyline key={s.stroke} points={s.pts.map((y, i) => `${40 + i * 50},${y}`).join(" ")} fill="none" stroke={s.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {[{ x: 40, t: "Aug 03" }, { x: 360, t: "Aug 17" }, { x: 700, t: "Aug 31" }].map((l) => (
              <text key={l.t} x={l.x} y="247" fill="var(--color-ink-dim)" fontSize="9">{l.t}</text>
            ))}
          </svg>
        </Panel>

        <Panel title="Decision path and outcome" hint="Counts preserve mutually exclusive first decisions">
          <Funnel
            rows={[
              { label: "AI conversations", pct: 100, value: "8,420", color: "var(--color-violet-fill)" },
              { label: "Direct answer", pct: 67.8, value: "5,708", color: "var(--color-ok-fill)" },
              { label: "One clarification", pct: 12.9, value: "1,090", color: "var(--color-warn-fill)" },
              { label: "Human handoff", pct: 19.3, value: "1,622", color: "var(--color-danger-fill)" },
              { label: "Contained outcome", pct: 72.4, value: "6,096", color: "var(--color-ok-fill)" },
              { label: "Reopened in 72h", pct: 2.4, value: "202", color: "var(--color-danger-fill)" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Confidence-to-action distribution"
          hint="Thresholds from AI policy v28; hard rules can override any score"
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Pill tone="green">No drift detected</Pill>
              <Btn modal="killSwitch">Edit policy</Btn>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              { title: "Direct answer", pill: "≥ .70", tone: "green" as PillTone, value: "67.8%", note: "5,708 conversations · 97.2% reviewed decision accuracy", pct: 67.8, bg: "var(--color-ok-bg)", border: "var(--color-ok-border)" },
              { title: "One clarification", pill: ".45–.699", tone: "amber" as PillTone, value: "12.9%", note: "1,090 conversations · no repeated clarification loops", pct: 12.9, bg: "var(--color-warn-bg)", border: "var(--color-warn-border)" },
              { title: "Human handoff", pill: "< .45 / rule", tone: "red" as PillTone, value: "19.3%", note: "1,622 conversations · full context delivered in 99.6%", pct: 19.3, bg: "var(--color-danger-bg)", border: "var(--color-danger-border)" },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border p-3.5" style={{ background: c.bg, borderColor: c.border }}>
                <header className="flex items-center justify-between gap-2">
                  <h3 className="text-[11px] font-bold text-ink">{c.title}</h3>
                  <Pill tone={c.tone}>{c.pill}</Pill>
                </header>
                <strong className="mt-3 block text-[22px] font-bold leading-none text-ink">{c.value}</strong>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-dim">{c.note}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-scrim/30">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.border }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Histogram bars={[4, 7, 11, 18, 27, 36, 49, 71, 100, 84]} tone="confidence" labels={["0.0", ".45 handoff", ".70 direct", "1.0"]} />
          </div>
        </Panel>

        <Panel title="Handoff reasons" hint="Every escalation has one primary trigger">
          <ReasonBars
            rows={[
              { label: "Low confidence", pct: 70.7, bar: 70.7, color: "var(--color-violet-fill)" },
              { label: "Hard policy rule", pct: 20.1, bar: 20.1, color: "var(--color-danger-fill)" },
              { label: "Explicit human request", pct: 9.2, bar: 9.2, color: "var(--color-info-fill)" },
            ]}
          />
          <div className="mt-3.5">
            <AuditNote>
              Correct escalation rate: <b>96.8%</b> across 632 audited handoffs. A high escalation rate is not automatically negative when
              policy requires human ownership.
            </AuditNote>
          </div>
        </Panel>
      </div>

      <Panel
        title="Channel performance"
        hint="Volume, outcome, grounding, satisfaction, and end-to-end response latency"
        action={<Pill>Channel delivery included only in latency column</Pill>}
        bodyClass=""
      >
        <Table head={["Channel", "AI conversations", "Containment", "Escalation", "Grounded", "AI CSAT", "Response p95", "Status"]} minWidth={760}>
          {CHANNELS.map((c) => (
            <tr key={c.channel}>
              <Td><b className="font-bold">{c.channel}</b></Td>
              <Td className="text-ink-dim">{c.convos}</Td>
              <Td className={c.good ? "font-bold text-ok-text" : "text-ink-dim"}>{c.containment}</Td>
              <Td className="text-ink-dim">{c.escalation}</Td>
              <Td className="text-ink-dim">{c.grounded}</Td>
              <Td className="text-ink-dim">{c.csat}</Td>
              <Td className="text-ink-dim">{c.p95}</Td>
              <Td><Pill tone={c.tone}>{c.status}</Pill></Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Language performance"
          hint="Calibration and outcomes are monitored independently for bilingual and transliterated traffic"
          action={<Pill tone="green">No language drift</Pill>}
          bodyClass=""
        >
          <Table head={["Language", "Volume", "Containment", "Escalation", "Grounded", "AI CSAT", "Response p95"]} minWidth={620}>
            {LANGUAGES.map((l) => (
              <tr key={l.language}>
                <Td><b className="font-bold">{l.language}</b></Td>
                <Td className="text-ink-dim">{l.volume}</Td>
                <Td className={l.good ? "font-bold text-ok-text" : "text-ink-dim"}>{l.containment}</Td>
                <Td className="text-ink-dim">{l.escalation}</Td>
                <Td className="text-ink-dim">{l.grounded}</Td>
                <Td className="text-ink-dim">{l.csat}</Td>
                <Td className="text-ink-dim">{l.p95}</Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Unanswered-question backlog" hint="Observed gaps become owned content work" action={<Pill tone="amber">119 in 30 days</Pill>}>
          <div className="flex flex-col">
            {[
              { q: "Partial-flight refund timing", n: "46", tone: "red" as PillTone, meta: ["Missing approved rule", "Owner: Commercial Ops"] },
              { q: "Name change after disruption", n: "31", tone: "amber" as PillTone, meta: ["Conflicting policy sources", "Due 3 Sep"] },
              { q: "Codeshare baggage allowance", n: "24", tone: "amber" as PillTone, meta: ["Bangla translation incomplete", "Owner: Content Ops"] },
              { q: "Transit visa advice", n: "18", tone: "gray" as PillTone, meta: ["Out of approved scope", "Human handoff retained"] },
            ].map((b) => (
              <div key={b.q} className="border-b border-line py-3 first:pt-0 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-xs font-bold text-ink">{b.q}</b>
                  <Pill tone={b.tone}>{b.n}</Pill>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-ink-dim">
                  {b.meta.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-3">
              <Btn>Open knowledge backlog</Btn>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Intent performance"
        hint="Confidence and automation must be interpreted against intent risk and expected escalation"
        action={<Pill tone="violet">8,420 conversations classified</Pill>}
        bodyClass=""
      >
        <Table head={["Intent", "Volume", "Average confidence", "Containment", "Escalation", "Reviewed answer accuracy", "Review sample", "Operating status"]} minWidth={880}>
          {INTENTS.map((i) => (
            <tr key={i.intent}>
              <Td><b className="font-bold">{i.intent}</b></Td>
              <Td className="text-ink-dim">{i.volume}</Td>
              <Td className="text-ink-dim">{i.conf}</Td>
              <Td className={i.good ? "font-bold text-ok-text" : "text-ink-dim"}>{i.containment}</Td>
              <Td className={i.escGood ? "font-bold text-ok-text" : "text-ink-dim"}>{i.escalation}</Td>
              <Td className="text-ink-dim">{i.accuracy}</Td>
              <Td className="text-ink-dim">{i.sample}</Td>
              <Td><Pill tone={i.tone}>{i.status}</Pill></Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel title="Model, knowledge, and safety health" hint="Production dependencies behind every AI reply" action={<Pill tone="green">No active incident</Pill>}>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            {HEALTH.map((h) => (
              <div key={h.title} className="rounded-xl border border-line bg-footer p-3.5">
                <header className="flex items-center justify-between gap-1.5">
                  <h3 className="text-[10px] font-bold text-ink">{h.title}</h3>
                  <Pill tone={h.tone}>{h.pill}</Pill>
                </header>
                <b className="mt-3 block text-xl font-bold leading-none text-ink">{h.value}</b>
                <p className="mt-1 text-[10px] leading-tight text-ink-dim">{h.note}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Low-confidence and quality review" hint="Risk, calibration, and outcome-triggered sampling" action={<Pill tone="amber">14 awaiting review</Pill>} bodyClass="">
          {REVIEWS.map((r) => (
            <div key={r.title} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-3 text-[10px] last:border-0">
              <div className="min-w-0">
                <b className="text-[11px] font-bold text-ink">{r.title}</b>
                <small className="mt-0.5 block text-ink-dim">{r.sub}</small>
                <p className="mt-1 text-ink-dim">
                  {r.conf} · <span className="font-bold" style={{ color: r.decisionTone }}>{r.decision}</span> · {r.flag}
                </p>
              </div>
              <Btn modal="aiReview">Review</Btn>
            </div>
          ))}
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-footer px-3.5 py-3 text-[10px] leading-relaxed text-ink-muted">
        <Pill>Interpretation guardrail</Pill>
        <span>
          Confidence is a decision signal—not a standalone quality score. Review it with calibration, intent risk, grounding, customer
          outcome, and policy-required escalations.
        </span>
      </div>
    </>
  );
}
