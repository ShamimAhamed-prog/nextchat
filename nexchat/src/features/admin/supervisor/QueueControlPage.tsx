"use client";

import { Btn, Feed, Filters, PageHead, Panel, Pill, Table, Td, type PillTone } from "./mockup/Primitives";

/** `/queues` — a direct replication of the mockup's `#queuesView`. */

const PRIORITY_CARDS: { band: string; pill: string; tone: PillTone; value: string; note: string; edge: string }[] = [
  { band: "P0 critical", pill: "Duty owner paged", tone: "red", value: "3", note: "Next breach 00:48", edge: "var(--color-danger-text)" },
  { band: "P1 urgent", pill: "4 waiting", tone: "amber", value: "14", note: "Departure/hold deadline order", edge: "var(--color-warn-text)" },
  { band: "P2 standard", pill: "Aging enabled", tone: "gray", value: "39", note: "Oldest 18:44", edge: "var(--color-info-text)" },
  { band: "P3 deferred", pill: "Due-time order", tone: "gray", value: "8", note: "2 callbacks due today", edge: "var(--color-ink-dim)" },
];

const LIFECYCLE = [
  { stage: "Waiting", value: "34", note: "Oldest 03:42" },
  { stage: "Offered", value: "8", note: "30s acceptance window" },
  { stage: "Assigned", value: "11", note: "Lease acquired" },
  { stage: "Agent active", value: "29", note: "2 unattended risks" },
  { stage: "Waiting customer", value: "17", note: "Excluded from handling time" },
];

const CASES: {
  id: string;
  reason: string;
  priority: string;
  priorityTone: PillTone;
  state: string;
  age: string;
  ageNote?: string;
  countdown?: boolean;
  eligible: string;
  affinity: string;
  action: string;
  danger?: boolean;
}[] = [
  { id: "C-1057", reason: "Paid, ticket not issued", priority: "P0", priorityTone: "red", state: "Offered to Nusrat", age: "00:18", ageNote: "offer countdown", countdown: true, eligible: "3 agents", affinity: "None", action: "Override" },
  { id: "C-1054", reason: "Same-day disruption", priority: "P1", priorityTone: "amber", state: "Waiting", age: "02:12", ageNote: "breach in 02:48", countdown: true, eligible: "6 agents", affinity: "Previous: Nusrat", action: "Assign" },
  { id: "C-1049", reason: "Refund request", priority: "P2", priorityTone: "gray", state: "Returned after timeout", age: "12:44", ageNote: "original age retained", eligible: "4 agents", affinity: "Same PNR: Ayesha", action: "Assign" },
  { id: "C-1046", reason: "Restricted booking", priority: "P2", priorityTone: "gray", state: "No eligible agent", age: "16:09", countdown: true, eligible: "0 agents", affinity: "Restricted", action: "Escalate", danger: true },
];

const CANDIDATES: { name: string; pill: string; tone: PillTone; meta: string[] }[] = [
  { name: "Nusrat Jahan", pill: "Selected", tone: "violet", meta: ["Base 1.20", "Skill 1.00", "Load 38%", "Effective 0.74"] },
  { name: "Ayesha Rahman", pill: "Eligible", tone: "green", meta: ["Base 1.00", "Skill 1.00", "Load 46%", "Effective 0.54"] },
  { name: "Farhana Islam", pill: "Eligible", tone: "green", meta: ["Base 1.10", "Skill .80", "Load 72%", "Effective 0.25"] },
  { name: "Tanvir Hasan", pill: "Excluded", tone: "red", meta: ["At capacity 6/6"] },
];

export default function QueueControlPage() {
  return (
    <>
      <PageHead
        eyebrow="Supervisor intervention"
        title="Queue control and routing"
        description="Inspect the candidate set, assignment age and complete routing explanation before making a permission-checked override."
        actions={
          <>
            <Btn modal="surge">Surge mode</Btn>
            <Btn primary modal="intervention">Manual intervention</Btn>
          </>
        }
      />

      <Filters
        fields={[
          { label: "Tenant", options: ["Takeoff Travels"] },
          { label: "Queue", options: ["All queues", "Payment recovery", "Ticketing"] },
          { label: "Priority", options: ["All priorities", "P0", "P1"] },
          { label: "Language", options: ["All languages", "Bangla", "English"] },
          { label: "Intent", options: ["All intents", "Paid not ticketed", "Refund"] },
          { label: "Resolution", options: ["Unresolved", "Waiting customer"] },
        ]}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {PRIORITY_CARDS.map((p) => (
          <div
            key={p.band}
            className="rounded-xl border border-l-4 border-line bg-page p-3.5 shadow-card"
            style={{ borderLeftColor: p.edge }}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] text-ink-dim">
              <span>{p.band}</span>
              <Pill tone={p.tone}>{p.pill}</Pill>
            </div>
            <b className="mt-2.5 block text-[21px] font-bold leading-none text-ink">{p.value}</b>
            <small className="mt-1 block text-[9px] text-ink-dim">{p.note}</small>
          </div>
        ))}
      </div>

      <Panel title="Assignment lifecycle" hint="Original queue age is preserved through every state" action={<Pill tone="amber">Next breach forecast · 01:36</Pill>}>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {LIFECYCLE.map((l) => (
            <div key={l.stage} className="min-h-[82px] rounded-xl border border-line bg-footer p-3.5">
              <span className="text-[9px] uppercase tracking-[0.07em] text-ink-dim">{l.stage}</span>
              <b className="mt-2 block text-[23px] font-bold leading-none text-ink">{l.value}</b>
              <small className="mt-0.5 block text-[9px] text-ink-dim">{l.note}</small>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Panel
          title="Waiting and offered conversations"
          hint="Original SLA age persists through reject, timeout and reassignment"
          action={<Pill tone="green">Atomic lease healthy</Pill>}
          bodyClass=""
        >
          <Table head={["Conversation", "Priority", "State", "Age / SLA", "Eligible", "Affinity", "Action"]} minWidth={920}>
            {CASES.map((c) => (
              <tr key={c.id}>
                <Td>
                  <span className="font-bold text-info-text">{c.id}</span>
                  <small className="mt-0.5 block text-[10px] text-ink-dim">{c.reason}</small>
                </Td>
                <Td>
                  <Pill tone={c.priorityTone}>{c.priority}</Pill>
                </Td>
                <Td className="text-ink-dim">{c.state}</Td>
                <Td>
                  <span className={`font-extrabold tabular-nums ${c.countdown ? "text-warn-text" : "text-ink"}`}>{c.age}</span>
                  {c.ageNote && <small className="mt-0.5 block text-[10px] text-ink-dim">{c.ageNote}</small>}
                </Td>
                <Td className="text-ink-dim">{c.eligible}</Td>
                <Td className="text-ink-dim">{c.affinity}</Td>
                <Td>{c.danger ? <Btn danger modal="intervention">{c.action}</Btn> : <Btn modal="intervention">{c.action}</Btn>}</Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Routing explanation · C-1057" hint="Candidate set and smooth weighted selection">
            <div className="flex flex-col">
              {CANDIDATES.map((c) => (
                <div key={c.name} className="border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-xs font-bold text-ink">{c.name}</b>
                    <Pill tone={c.tone}>{c.pill}</Pill>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-ink-dim">
                    {c.meta.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Reassignment history" hint="Immutable routing events">
            <Feed
              events={[
                { title: "Offer created", detail: "Nusrat · lease candidate · idempotency key verified", time: "14:21:08" },
                { title: "Previous offer timed out", detail: "Farhana · original SLA age preserved", time: "14:20:37", tone: "amber" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
