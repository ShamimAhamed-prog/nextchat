import type { TenantConfig } from "../engine/tenantConfigEngine";
import {
  BREACH_FORECAST_MS,
  canAcceptWork,
  type AgentState,
  type Conversation,
  type InboxView,
} from "@/features/inbox/engine/inboxEngine";

/**
 * SUP-04: "Alert before SLA breach and when no eligible agent, abnormal
 * escalation spike, channel failure or queue surge crosses its configured
 * threshold."
 *
 * Every one of these is computed from live state rather than simulated,
 * which is why the channel-failure alert only became possible once `INB-09`
 * gave messages a real terminal failure to count. Thresholds come from tenant
 * config, because the PRD says "configured threshold" and a number baked into
 * the dashboard is not one.
 *
 * Each alert carries the inbox view that shows the conversations behind it —
 * SUP-03's drill-down. An alert you cannot act on is a notification.
 */
export type AlertLevel = "warning" | "critical";

export type Alert = {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  /** Where to look — drives the drill-through to `/inbox`. */
  view: InboxView;
};

export function computeAlerts(
  conversations: Conversation[],
  agentState: AgentState,
  config: TenantConfig,
  now: number,
): Alert[] {
  const alerts: Alert[] = [];
  const live = conversations.filter((c) => !c.disruptionId);
  const open = live.filter((c) => c.status !== "resolved");
  const waiting = live.filter((c) => c.status === "queued" || c.status === "offered");

  // 1. Before SLA breach.
  const breaching = open.filter((c) => c.slaDeadline - now <= BREACH_FORECAST_MS && c.slaDeadline > now);
  const breached = open.filter((c) => c.slaDeadline <= now);
  if (breached.length > 0) {
    alerts.push({
      id: "sla-breached",
      level: "critical",
      title: `${breached.length} conversation${breached.length === 1 ? "" : "s"} past SLA`,
      detail: breached.map((c) => `${c.customerName} (${c.priority})`).join(", "),
      view: "sla_risk",
    });
  } else if (breaching.length > 0) {
    alerts.push({
      id: "sla-breaching",
      level: "warning",
      title: `${breaching.length} approaching SLA breach`,
      detail: breaching.map((c) => `${c.customerName} (${c.priority})`).join(", "),
      view: "sla_risk",
    });
  }

  // 2. No eligible agent for work that is waiting.
  if (waiting.length > 0 && !canAcceptWork(agentState)) {
    alerts.push({
      id: "no-eligible-agent",
      level: "critical",
      title: "No eligible agent for waiting work",
      detail: `${waiting.length} waiting while the only available agent is ${agentState}`,
      view: "unassigned",
    });
  }

  // 3. Queue surge.
  if (config.alerts.enabled.queueSurge && waiting.length >= config.alerts.queueSurgeWaiting) {
    alerts.push({
      id: "queue-surge",
      level: "warning",
      title: `Queue surge — ${waiting.length} waiting`,
      detail: `At or above the configured threshold of ${config.alerts.queueSurgeWaiting}`,
      view: "unassigned",
    });
  }

  // 4. Escalation spike — conversations that reached the queue within the hour.
  const recentlyEscalated = live.filter((c) => now - c.queuedSince <= 60 * 60_000);
  if (config.alerts.enabled.escalationSpike && recentlyEscalated.length >= config.alerts.escalationSpikePerHour) {
    alerts.push({
      id: "escalation-spike",
      level: "warning",
      title: `Escalation spike — ${recentlyEscalated.length} in the last hour`,
      detail: `At or above the configured threshold of ${config.alerts.escalationSpikePerHour}`,
      view: "all",
    });
  }

  // 5. Channel failure, counted from real terminal send failures (INB-09).
  const failuresByChannel = new Map<string, number>();
  if (config.alerts.enabled.channelFailure) {
    for (const c of live) {
      for (const m of c.transcript) {
        if (m.delivery?.state === "failed" && m.delivery.terminalReason) {
          failuresByChannel.set(c.channel, (failuresByChannel.get(c.channel) ?? 0) + 1);
        }
      }
    }
  }
  for (const [channel, count] of failuresByChannel) {
    if (count >= config.alerts.channelFailuresBeforeAlert) {
      alerts.push({
        id: `channel-failure-${channel}`,
        level: "critical",
        title: `${channel} is not delivering`,
        detail: `${count} message${count === 1 ? "" : "s"} exhausted their retries on ${channel}`,
        view: "all",
      });
    }
  }

  return alerts;
}
