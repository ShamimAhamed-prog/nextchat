"use client";

import { Btn, Filters, Funnel, Histogram, Kpi, PageHead, Panel, Pill, ReasonBars, Seg, Table, Td } from "../mockup/Primitives";

/** `/performance` — a direct replication of the mockup's `#performanceView`. */

const SCORECARDS = [
  { agent: "Nusrat Jahan", csat: "4.78", qa: "95%", sla: "97%", fcr: "87%", transfer: "4.8%", reopen: "1.7%", sample: "284 cases · 122 surveys" },
  { agent: "Ayesha Rahman", csat: "4.71", qa: "94%", sla: "96%", fcr: "84%", transfer: "5.2%", reopen: "2.0%", sample: "318 cases · 136 surveys" },
  { agent: "Farhana Islam", csat: "4.58", qa: "92%", sla: "93%", fcr: "82%", transfer: "7.1%", reopen: "2.8%", sample: "297 cases · 104 surveys" },
];

const TREND_SLA = [126, 118, 130, 100, 108, 88, 95, 72, 82, 60, 68, 51, 57, 43, 49];
const TREND_CSAT = [145, 139, 152, 143, 129, 136, 120, 127, 106, 111, 102, 94, 101, 85, 89];

export default function HumanPerformancePage() {
  return (
    <>
      <PageHead
        eyebrow="Historical analytics"
        title="Human agent performance"
        description="Quality, resolution and service-speed reporting with minimum samples and no default composite ranking."
        actions={
          <>
            <Btn>KPI definitions v2.3</Btn>
            <Btn primary modal="export">Export dashboard</Btn>
          </>
        }
      />

      <Filters
        fields={[
          { label: "Date range", options: ["Last 30 days", "Last 7 days", "Quarter to date"] },
          { label: "Tenant", options: ["Nexchatgen", "Authorized tenants"] },
          { label: "Team", options: ["Bangladesh support", "All teams"] },
          { label: "Queue", options: ["All queues", "Ticketing", "Payment recovery"] },
          { label: "Agent", options: ["All permitted agents", "Ayesha Rahman", "Nusrat Jahan"] },
          { label: "Channel", options: ["All channels", "Web chat", "WhatsApp"] },
        ]}
      />
      <Filters
        fields={[
          { label: "Language", options: ["All languages", "Bangla", "English"] },
          { label: "Priority", options: ["All priorities", "P0", "P1", "P2"] },
          { label: "Intent", options: ["All intents", "Ticketing failure", "Refund", "Disruption"] },
          { label: "Resolution", options: ["All outcomes", "Resolved", "Transferred", "Reopened"] },
          { label: "Complexity", options: ["All complexity", "Low", "Medium", "High"] },
          { label: "Timezone", options: ["Asia/Dhaka (UTC+6)", "UTC"] },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="CSAT" delta="+0.2" value="4.62" suffix=" / 5" note="1,284 responses · 38% rate" />
        <Kpi label="First response" delta="−18s" value="01:24" note="p90 03:12 · excludes queue wait" />
        <Kpi label="SLA compliance" delta="+2.8%" value="94.7%" note="172 of 3,246 breached" />
        <Kpi label="First-contact resolution" delta="+1.4%" value="81.3%" note="Reopen window: 72 hours" />
        <Kpi label="QA score" delta="−0.6%" deltaTone="amber" value="91.2%" note="312 calibrated reviews" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Queue wait" delta="p50" value="02:08" note="p90 05:42 · p95 07:18" />
        <Kpi label="Agent reaction" delta="−9s" value="00:42" note="After assignment · p90 01:36" />
        <Kpi label="Resolution time" delta="Gross" deltaTone="amber" value="18:34" note="SLA-clock 12:08 · p90 41:22" />
        <Kpi label="Transfer / reopen" delta="Healthy" value="8.4%" note="Transfer 6.1% · reopen 2.3%" />
        <Kpi label="Occupancy" delta="Planning only" deltaTone="amber" value="76.8%" note="AHT 08:42 · 2,714 handling hours" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Service quality trend"
          hint="Daily SLA compliance and CSAT normalized to percentage"
          action={<Seg options={["7D", "30D", "90D"]} active="30D" />}
        >
          <div className="mb-2 flex gap-4 text-[10px] text-ink-dim">
            <span className="flex items-center gap-1.5">
              <i aria-hidden className="h-[3px] w-4 rounded-full bg-ok-fill" />
              SLA compliance
            </span>
            <span className="flex items-center gap-1.5">
              <i aria-hidden className="h-[3px] w-4 rounded-full bg-info-fill" />
              CSAT normalized
            </span>
          </div>
          <svg viewBox="0 0 760 250" className="w-full" role="img" aria-label="SLA compliance and CSAT trends over 30 days">
            <defs>
              <linearGradient id="sla-trend-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-ok-fill)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-ok-fill)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[30, 80, 130, 180, 230].map((y) => (
              <line key={y} x1="40" y1={y} x2="740" y2={y} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            {[
              { y: 34, t: "100%" },
              { y: 84, t: "95%" },
              { y: 134, t: "90%" },
              { y: 184, t: "85%" },
            ].map((l) => (
              <text key={l.t} x="4" y={l.y} fill="var(--color-ink-dim)" fontSize="9">
                {l.t}
              </text>
            ))}
            <polygon
              points={`40,240 ${TREND_SLA.map((y, i) => `${40 + i * 50},${y}`).join(" ")} ${40 + (TREND_SLA.length - 1) * 50},240`}
              fill="url(#sla-trend-area)"
              stroke="none"
            />
            <polyline
              points={TREND_SLA.map((y, i) => `${40 + i * 50},${y}`).join(" ")}
              fill="none"
              stroke="var(--color-ok-fill)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={TREND_CSAT.map((y, i) => `${40 + i * 50},${y}`).join(" ")}
              fill="none"
              stroke="var(--color-info-fill)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[
              { x: 40, t: "Aug 03" },
              { x: 360, t: "Aug 17" },
              { x: 700, t: "Aug 31" },
            ].map((l) => (
              <text key={l.t} x={l.x} y="247" fill="var(--color-ink-dim)" fontSize="9">
                {l.t}
              </text>
            ))}
          </svg>
        </Panel>

        <Panel title="Performance data coverage" hint="Eligible human-owned cases by evidence source">
          <Funnel
            rows={[
              { label: "Human-owned cases", pct: 100, value: "3,246", color: "var(--color-info-fill)" },
              { label: "SLA measured", pct: 97, value: "3,151", color: "var(--color-info-fill)" },
              { label: "Resolution eligible", pct: 89, value: "2,887", color: "var(--color-info-fill)" },
              { label: "CSAT requested", pct: 68, value: "2,214", color: "var(--color-ok-fill)" },
              { label: "CSAT received", pct: 39, value: "1,284", color: "var(--color-ok-fill)" },
              { label: "QA reviewed", pct: 10, value: "312", color: "var(--color-violet-fill)" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Agent scorecards"
          hint="Individual dimensions shown without a default composite rank"
          action={<Pill>30 cases + 5 surveys minimum</Pill>}
          bodyClass=""
        >
          <Table head={["Agent", "CSAT", "QA", "SLA", "FCR", "Transfer", "Reopen", "Sample coverage"]} minWidth={640}>
            {SCORECARDS.map((s) => (
              <tr key={s.agent}>
                <Td>
                  <b className="font-bold">{s.agent}</b>
                </Td>
                <Td>{s.csat}</Td>
                <Td>{s.qa}</Td>
                <Td>{s.sla}</Td>
                <Td>{s.fcr}</Td>
                <Td>{s.transfer}</Td>
                <Td>{s.reopen}</Td>
                <Td className="text-ink-dim">{s.sample}</Td>
              </tr>
            ))}
            <tr>
              <Td>
                <b className="font-bold">Mahin Chowdhury</b>
              </Td>
              <Td className="text-center" >
                <span className="block">
                  <Pill>Insufficient sample — individual metrics suppressed</Pill>
                </span>
              </Td>
              <Td />
              <Td />
              <Td />
              <Td />
              <Td />
              <Td className="text-ink-dim">18 cases · 3 surveys</Td>
            </tr>
          </Table>
        </Panel>

        <Panel title="SLA breach reasons" hint="Root cause, not attributed blindly to agents">
          <ReasonBars
            rows={[
              { label: "Capacity shortage", pct: 38, bar: 76 },
              { label: "External dependency", pct: 24, bar: 48 },
              { label: "Incorrect routing", pct: 17, bar: 34 },
              { label: "Customer waiting", pct: 13, bar: 26 },
              { label: "System failure", pct: 8, bar: 16, color: "var(--color-danger-fill)" },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Human response-time distribution"
          hint="Median 01:24 · p90 03:12 · p95 04:48 · n=3,246"
          action={<Btn modal="drilldown">View source events</Btn>}
        >
          <Histogram bars={[18, 42, 76, 100, 82, 61, 39, 24, 14, 8]} labels={["0s", "2m", "4m", "6m+"]} />
        </Panel>
        <Panel title="Resolution-time distribution" hint="Gross and SLA-clock duration by eligible conversation" action={<Pill>Paused time visible</Pill>}>
          <Histogram bars={[32, 68, 100, 86, 63, 42, 28, 19, 11, 6]} tone="steel" labels={["0m", "15m", "30m", "60m+"]} />
        </Panel>
      </div>
    </>
  );
}
