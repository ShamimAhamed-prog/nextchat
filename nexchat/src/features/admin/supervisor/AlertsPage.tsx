"use client";

import { Btn, PageHead, Panel, Pill, Switch, type PillTone } from "./mockup/Primitives";
import type { ModalId } from "./mockup/ModalContext";

/** `/alerts` — a direct replication of the mockup's `#alertsView`. */

const ALERTS: { pill: string; tone: PillTone; title: string; detail: string; time: string; edge: string; actions: { label: string; primary?: boolean; modal?: ModalId }[] }[] = [
  {
    pill: "Critical",
    tone: "red",
    title: "No eligible agent · restricted booking",
    detail: "Payment recovery queue has one P0 conversation with no permitted agent.",
    time: "1m ago",
    edge: "var(--color-danger-text)",
    actions: [{ label: "Inspect case", modal: "drilldown" }, { label: "Assign specialist", primary: true, modal: "intervention" }],
  },
  {
    pill: "Warning",
    tone: "amber",
    title: "SLA breach forecast",
    detail: "Six P1 cases are forecast to breach within five minutes at current capacity.",
    time: "2m ago",
    edge: "var(--color-warn-text)",
    actions: [{ label: "View queue", modal: "drilldown" }, { label: "Start surge mode", modal: "surge" }],
  },
  {
    pill: "Channel",
    tone: "red",
    title: "WhatsApp delivery degradation",
    detail: "Delivery receipt latency p95 is 42 seconds; 18 outbound messages are pending.",
    time: "4m ago",
    edge: "var(--color-danger-text)",
    actions: [{ label: "Open incident", modal: "channelRecovery" }, { label: "Acknowledge", primary: true, modal: "alert" }],
  },
  {
    pill: "Spike",
    tone: "gray",
    title: "AI escalation rate +37%",
    detail: "Bangla payment intents exceeded the rolling baseline after knowledge snapshot 31 Aug.",
    time: "7m ago",
    edge: "var(--color-info-text)",
    actions: [{ label: "Open AI cohort", modal: "aiReview" }, { label: "Acknowledge", modal: "alert" }],
  },
];

const RULES = [
  { name: "No eligible agent", detail: "Any P0 immediately; P1 after 60 seconds", who: "Supervisor + duty owner", policy: "Repeat every 5m" },
  { name: "SLA breach forecast", detail: "Forecast probability ≥70% inside 5 minutes", who: "Queue supervisors", policy: "Resolve automatically" },
  { name: "Channel delivery failure", detail: "Error rate >3% or p95 >30 seconds", who: "Operations + engineering", policy: "Incident required" },
  { name: "Disruption surge", detail: "10× route-normal traffic for 3 minutes", who: "Surge roster", policy: "Cohort deduplicated" },
];

export default function AlertsPage() {
  return (
    <>
      <PageHead
        eyebrow="Operational awareness"
        title="Alerts and thresholds"
        description="Supervisor notifications for SLA risk, missing eligibility, delivery failures, escalation spikes and disruption surges."
        actions={
          <>
            <Btn>Notification history</Btn>
            <Btn primary modal="alert">Create alert rule</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {ALERTS.map((a) => (
          <div
            key={a.title}
            className="rounded-xl border border-l-4 border-line bg-page p-4 shadow-card"
            style={{ borderLeftColor: a.edge }}
          >
            <div className="flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <Pill tone={a.tone}>{a.pill}</Pill>
                <h3 className="mt-1.5 text-[13px] font-bold text-ink">{a.title}</h3>
                <p className="mt-1.5 text-[10px] leading-relaxed text-ink-dim">{a.detail}</p>
              </div>
              <time className="shrink-0 whitespace-nowrap text-[9px] text-ink-dim">{a.time}</time>
            </div>
            <div className="mt-3.5 flex gap-2">
              {a.actions.map((act) => (
                <Btn key={act.label} primary={act.primary} modal={act.modal}>
                  {act.label}
                </Btn>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Panel title="Alert rules" hint="Tenant-scoped thresholds with escalation and acknowledgement policy" action={<Pill>Version 12 · audited</Pill>}>
        <div className="flex flex-col">
          {RULES.map((r) => (
            <div key={r.name} className="grid grid-cols-1 items-center gap-3.5 border-b border-line py-3 text-[10px] first:pt-0 last:border-0 last:pb-0 lg:grid-cols-[minmax(180px,1.5fr)_1fr_1fr_auto]">
              <div>
                <b className="text-[11px] font-bold text-ink">{r.name}</b>
                <small className="mt-0.5 block text-ink-dim">{r.detail}</small>
              </div>
              <span className="text-ink-dim">{r.who}</span>
              <span className="text-ink-dim">{r.policy}</span>
              <Switch on />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
