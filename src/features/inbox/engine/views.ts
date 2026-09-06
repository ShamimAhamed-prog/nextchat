// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import { BREACH_FORECAST_MINUTES } from "./queue";
import type { Conversation } from "./types";

/* --- Inbox views (INB-06) ------------------------------------------------
 *
 * The eight views the PRD names, plus "All". They are computed from the
 * conversation rather than stored on it, so a conversation appears in every
 * view it currently qualifies for and leaves each one the moment it stops —
 * no view membership to keep in sync.
 */
export type InboxView =
  | "all"
  | "unassigned"
  | "mine"
  | "team"
  | "sla_risk"
  | "incidents"
  | "waiting_customer"
  | "snoozed"
  | "recently_resolved";

export const INBOX_VIEWS: { id: InboxView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unassigned", label: "Unassigned" },
  { id: "mine", label: "Assigned to me" },
  { id: "team", label: "Team queues" },
  { id: "sla_risk", label: "SLA risk" },
  { id: "incidents", label: "Priority incidents" },
  { id: "waiting_customer", label: "Waiting customer" },
  { id: "snoozed", label: "Snoozed" },
  { id: "recently_resolved", label: "Recently resolved" },
];

const RECENTLY_RESOLVED_MS = 24 * 60 * 60_000;

function isOpen(c: Conversation): boolean {
  return c.status !== "resolved";
}

export function matchesView(c: Conversation, view: InboxView, now: number): boolean {
  switch (view) {
    case "all":
      return true;
    case "unassigned":
      return c.status === "queued" || c.status === "offered";
    case "mine":
      return c.status === "assigned";
    case "team":
      // Everything open that this agent does not personally own — the
      // shared pool, which is what "team queues" means with one team.
      return isOpen(c) && c.status !== "assigned";
    case "sla_risk":
      return isOpen(c) && c.slaDeadline - now <= BREACH_FORECAST_MINUTES * 60_000;
    case "incidents":
      return isOpen(c) && (c.priority === "P0" || c.priority === "P1");
    case "waiting_customer": {
      // The customer spoke last and nobody has answered — the queue that
      // actually costs you a reply, as distinct from "assigned".
      const last = c.transcript[c.transcript.length - 1];
      return isOpen(c) && last?.from === "customer";
    }
    case "snoozed":
      return c.status === "snoozed";
    case "recently_resolved":
      return c.status === "resolved" && now - (c.resolvedAt ?? 0) <= RECENTLY_RESOLVED_MS;
  }
}
