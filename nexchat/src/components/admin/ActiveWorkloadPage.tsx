"use client";

import { Avatar, Bar, Btn, Feed, Filters, Kpi, PageHead, Panel, Pill, Table, Td, type PillTone } from "./mockup/Primitives";
import { useModal } from "./mockup/ModalContext";

/**
 * `/dashboard` — a direct replication of the mockup's `#workloadView`:
 * page head, two filter rows, five KPIs, then the main/aside split of
 * agent capacity board + SLA pressure heatmap and queue balance + routing
 * activity. Content is the design's own, section for section.
 */

const AGENTS: {
  name: string;
  initials: string;
  color: string;
  sub: string;
  status: string;
  statusTone: "available" | "busy" | "away";
  active: string;
  pct: number;
  barTone: "green" | "amber" | "red";
  load: number;
  loadTone: "good" | "warn" | "bad";
  sla: string;
  slaTone: PillTone;
  skills: string;
  routing: string;
  routingTone: PillTone;
}[] = [
  { name: "Ayesha Rahman", initials: "AR", color: "#2f5f7c", sub: "Last assignment 2m ago", status: "Available", statusTone: "available", active: "3 / 6", pct: 50, barTone: "green", load: 46, loadTone: "good", sla: "04:12 risk", slaTone: "amber", skills: "Ticketing · BN", routing: "Eligible", routingTone: "green" },
  { name: "Tanvir Hasan", initials: "TH", color: "#584593", sub: "Last assignment 18s ago", status: "Busy", statusTone: "busy", active: "6 / 6", pct: 100, barTone: "red", load: 94, loadTone: "bad", sla: "01:36 risk", slaTone: "red", skills: "Refund · Payment", routing: "At capacity", routingTone: "red" },
  { name: "Nusrat Jahan", initials: "NJ", color: "#00694b", sub: "Last assignment 7m ago", status: "Available", statusTone: "available", active: "2 / 5", pct: 40, barTone: "green", load: 38, loadTone: "good", sla: "12:48 healthy", slaTone: "green", skills: "Disruption · EN", routing: "Next likely", routingTone: "violet" },
  { name: "Rakib Ahmed", initials: "RA", color: "#96690a", sub: "Away for 06:14", status: "Away", statusTone: "away", active: "1 / 6", pct: 17, barTone: "green", load: 18, loadTone: "good", sla: "No risk", slaTone: "gray", skills: "Baggage · BN", routing: "Paused", routingTone: "gray" },
  { name: "Farhana Islam", initials: "FI", color: "#bc3126", sub: "Last assignment 1m ago", status: "Available", statusTone: "available", active: "4 / 6", pct: 67, barTone: "amber", load: 72, loadTone: "warn", sla: "03:08 risk", slaTone: "amber", skills: "Payment · EN", routing: "Eligible", routingTone: "green" },
  { name: "Mahin Chowdhury", initials: "MC", color: "#2f5f7c", sub: "Supervisor review enabled", status: "Training", statusTone: "away", active: "1 / 2", pct: 50, barTone: "green", load: 42, loadTone: "good", sla: "Healthy", slaTone: "green", skills: "Baggage · EN", routing: "Limited queues", routingTone: "violet" },
  { name: "Sadia Akter", initials: "SA", color: "#00694b", sub: "Wrap-up ends in 01:20", status: "Wrap-up", statusTone: "busy", active: "0 / 5", pct: 0, barTone: "green", load: 12, loadTone: "good", sla: "No risk", slaTone: "gray", skills: "Disruption · BN", routing: "Paused", routingTone: "gray" },
  { name: "Imran Kabir", initials: "IK", color: "#5f6b65", sub: "Offline since 14:02", status: "Offline", statusTone: "away", active: "0 / 6", pct: 0, barTone: "green", load: 0, loadTone: "good", sla: "No active work", slaTone: "gray", skills: "Refund · BN", routing: "Ineligible", routingTone: "gray" },
];

// Imran's avatar is the mockup's `--ink-3` grey darkened from #6f7c75:
// white initials on the original measured 4.36:1, under the 4.5 floor the
// axe audit enforces (NFR-11). Every other avatar colour clears it as-is.
const STATUS_COLOR = { available: "var(--color-ok-text)", busy: "var(--color-warn-text)", away: "var(--color-ink-dim)" };
const LOAD_COLOR = { good: "var(--color-ok-text)", warn: "var(--color-warn-text)", bad: "var(--color-danger-text)" };

const HEATMAP: { agent: string; cells: { value: number; level: 0 | 1 | 2 | 3 }[] }[] = [
  { agent: "Ayesha R.", cells: [{ value: 2, level: 1 }, { value: 1, level: 2 }, { value: 0, level: 0 }, { value: 0, level: 0 }] },
  { agent: "Tanvir H.", cells: [{ value: 3, level: 1 }, { value: 2, level: 2 }, { value: 1, level: 3 }, { value: 1, level: 3 }] },
  { agent: "Nusrat J.", cells: [{ value: 2, level: 1 }, { value: 0, level: 0 }, { value: 0, level: 0 }, { value: 0, level: 0 }] },
  { agent: "Farhana I.", cells: [{ value: 2, level: 1 }, { value: 2, level: 2 }, { value: 0, level: 0 }, { value: 0, level: 0 }] },
];

const HM_STYLE: Record<0 | 1 | 2 | 3, { bg: string; color: string }> = {
  0: { bg: "var(--color-raised)", color: "var(--color-ink-dim)" },
  1: { bg: "var(--color-ok-bg)", color: "var(--color-ok-text)" },
  2: { bg: "var(--color-warn-bg)", color: "var(--color-warn-text)" },
  3: { bg: "var(--color-danger-bg)", color: "var(--color-danger-text)" },
};

const QUEUES: { name: string; waiting: string; tone: PillTone; pct: number; barTone: "green" | "amber" | "red"; meta: string[] }[] = [
  { name: "Ticketing", waiting: "12 waiting", tone: "amber", pct: 72, barTone: "amber", meta: ["7 eligible", "Oldest 03:42"] },
  { name: "Payment recovery", waiting: "8 waiting", tone: "red", pct: 91, barTone: "red", meta: ["3 eligible", "2 SLA breached"] },
  { name: "Disruption", waiting: "9 waiting", tone: "green", pct: 54, barTone: "green", meta: ["6 eligible", "Oldest 02:08"] },
  { name: "Baggage", waiting: "5 waiting", tone: "gray", pct: 34, barTone: "green", meta: ["8 eligible", "Healthy"] },
];

const ROUTING_EVENTS: { title: string; detail: string; time: string; tone?: "green" | "amber" | "red" }[] = [
  { title: "C-1042 assigned to Nusrat", detail: "Skill match · 38% load · longest since previous assignment", time: "12s" },
  { title: "Tanvir skipped", detail: "At concurrency limit 6/6; effective weight set to zero", time: "18s", tone: "amber" },
  { title: "C-1041 offered to Ayesha", detail: "Exact Bangla + ticketing match · 46% weighted load", time: "2m" },
  { title: "Payment queue threshold crossed", detail: "Eligible capacity below configured minimum of four agents", time: "4m", tone: "red" },
];

export default function ActiveWorkloadPage() {
  const modal = useModal();

  return (
    <>
      <PageHead
        eyebrow="Live operations"
        title="Human agent active workload"
        description="Capacity, eligibility and SLA pressure across every active support queue. Updated from assignment and presence events within five seconds."
        actions={
          <>
            <Btn modal="export">Export snapshot</Btn>
            <Btn>Configure alerts</Btn>
            <Btn primary modal="intervention">Rebalance queue</Btn>
          </>
        }
      />

      <Filters
        fields={[
          { label: "Tenant", options: ["Takeoff Travels", "All tenants"] },
          { label: "Team", options: ["Bangladesh support", "Payments", "Disruption response"] },
          { label: "Queue", options: ["All queues", "Ticketing", "Payment recovery", "Disruption"] },
          { label: "Channel", options: ["All channels", "Web chat", "WhatsApp", "Messenger"] },
        ]}
        search="Name, skill or language"
      />

      <Filters
        fields={[
          { label: "Agent state", options: ["All states", "Available", "Busy", "Wrap-up", "Away / break", "Training", "Offline"] },
          { label: "Priority", options: ["All priorities", "P0 critical", "P1 urgent", "P2 standard", "P3 deferred"] },
          { label: "Intent", options: ["All intents", "Paid not ticketed", "Refund", "Disruption", "Baggage"] },
          { label: "Resolution", options: ["Any resolution", "Unresolved", "Waiting customer", "Snoozed"] },
          { label: "Complexity", options: ["All complexity", "Low", "Medium", "High"] },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Human-owned" delta="+8" deltaTone="amber" value="82" note="29 active · 17 waiting customer" />
        <Kpi label="Average weighted load" delta="Balanced" value="61%" note="Team spread 18–94%" />
        <Kpi label="At capacity" delta="Review" deltaTone="amber" value="3" valueColor="var(--color-warn-text)" note="2 agents carry SLA risk" />
        <Kpi label="Eligible agents" delta="Healthy" value="18" suffix=" / 24" note="6 at capacity or unavailable" />
        <Kpi label="Assignment p95" delta="Target <3s" value="1.8s" note="Last 15 minutes" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_0.72fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title="Agent capacity board"
            hint="Weighted load includes volume, complexity, SLA urgency and active tasks"
            bodyClass=""
            action={
              <div className="flex shrink-0 rounded-lg border border-line bg-footer p-0.5">
                <span className="rounded-md bg-page px-2 py-1 text-[10px] text-ink">Compact</span>
                <span className="px-2 py-1 text-[10px] text-ink-dim">Comfortable</span>
              </div>
            }
          >
            <Table head={["Agent", "Status", "Active / limit", "Weighted load", "Oldest SLA", "Skills", "Routing"]}>
              {AGENTS.map((a) => (
                <tr
                  key={a.name}
                  tabIndex={0}
                  onClick={() => modal?.open("agentDrawer", a.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      modal?.open("agentDrawer", a.name);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={a.initials} color={a.color} />
                      <div className="min-w-0">
                        <b className="block text-xs font-bold">{a.name}</b>
                        <small className="mt-0.5 block text-[10px] text-ink-dim">{a.sub}</small>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold" style={{ color: STATUS_COLOR[a.statusTone] }}>
                      <i aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: STATUS_COLOR[a.statusTone] }} />
                      {a.status}
                    </span>
                  </Td>
                  <Td className="min-w-[105px]">
                    <div className="flex justify-between text-[10px] text-ink-dim">
                      <span>{a.active}</span>
                      <span>{a.pct}%</span>
                    </div>
                    <div className="mt-1.5">
                      <Bar pct={a.pct} tone={a.barTone} />
                    </div>
                  </Td>
                  <Td>
                    <span className="font-bold tabular-nums" style={{ color: LOAD_COLOR[a.loadTone] }}>
                      {a.load}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={a.slaTone}>{a.sla}</Pill>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-dim">{a.skills}</Td>
                  <Td>
                    <Pill tone={a.routingTone}>{a.routing}</Pill>
                  </Td>
                </tr>
              ))}
            </Table>
          </Panel>

          <Panel
            title="SLA pressure heatmap"
            hint="Open conversations grouped by assigned agent and urgency"
            action={<Pill>Last 15 min</Pill>}
          >
            <div className="grid gap-1.5 overflow-x-auto" style={{ gridTemplateColumns: "110px repeat(4, minmax(0, 1fr))" }}>
              <div />
              {["Healthy", "At risk", "Breached", "P0"].map((h) => (
                <div key={h} className="grid h-6 place-items-center text-[9px] font-bold text-ink-dim">
                  {h}
                </div>
              ))}
              {HEATMAP.map((row) => (
                <Row key={row.agent} row={row} />
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Queue balance" hint="Waiting work versus available capacity">
            <div className="flex flex-col">
              {QUEUES.map((q) => (
                <div key={q.name} className="border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <b className="text-xs font-bold text-ink">{q.name}</b>
                    <Pill tone={q.tone}>{q.waiting}</Pill>
                  </div>
                  <Bar pct={q.pct} tone={q.barTone} height={7} />
                  <div className="mt-1.5 flex gap-3 text-[10px] text-ink-dim">
                    {q.meta.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Routing activity" hint="Auditable weighted round-robin decisions" action={<Btn modal="drilldown">View log</Btn>}>
            <Feed events={ROUTING_EVENTS} />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ row }: { row: (typeof HEATMAP)[number] }) {
  return (
    <>
      <div className="flex items-center text-[10px] text-ink-muted">{row.agent}</div>
      {row.cells.map((c, i) => (
        <div
          key={i}
          className="grid h-[34px] place-items-center rounded-md text-[10px] font-bold"
          style={{ background: HM_STYLE[c.level].bg, color: HM_STYLE[c.level].color }}
        >
          {c.value}
        </div>
      ))}
    </>
  );
}
