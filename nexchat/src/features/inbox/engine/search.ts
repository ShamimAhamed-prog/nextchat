// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import { YOU } from "@/lib/people";
import type { Conversation } from "./types";

/* --- Search (INB-07) -----------------------------------------------------
 *
 * The PRD asks for search by handle, verified phone/email, PNR, ticket
 * number, payment reference, conversation ID, tag, assignee and date range.
 * Bare words match across all of the text dimensions at once; the rest are
 * reachable as `field:value` prefixes, which is how agents in every other
 * inbox product already expect to narrow a list, and which gets the date
 * range in without a second piece of chrome.
 *
 * Note this matches against the *unmasked* phone and email on purpose. An
 * agent searching for a number they were given on a call is not a data
 * disclosure — the results still render masked (AG-06), so finding a
 * conversation never shows the value.
 */
const SEARCH_PREFIXES = ["pnr", "tag", "assignee", "channel", "status", "since", "until"] as const;
type SearchPrefix = (typeof SEARCH_PREFIXES)[number];

export const SEARCH_HINT = "pnr: tag: assignee: channel: status: since: until:";

/** `2d`, `36h`, `90m` or an ISO date. Returns a timestamp, or null. */
function parseWhen(value: string, now: number): number | null {
  const rel = /^(\d+)([dhm])$/.exec(value.trim());
  if (rel) {
    const n = Number(rel[1]);
    const ms = rel[2] === "d" ? 86_400_000 : rel[2] === "h" ? 3_600_000 : 60_000;
    return now - n * ms;
  }
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function searchableText(c: Conversation): string {
  return [
    c.customerName,
    c.phone,
    c.email,
    c.pnr,
    c.route,
    c.id,
    c.paymentSummary,
    c.resolution?.reference,
    c.escalationReason,
    ...c.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * An unrecognised prefix (`foo:bar`) is treated as a plain term rather than
 * silently matching everything — a typo should narrow to nothing visible,
 * not quietly widen the result set.
 */
export function matchesQuery(c: Conversation, query: string, now: number): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = searchableText(c);

  return terms.every((term) => {
    const split = term.indexOf(":");
    const prefix = split > 0 ? term.slice(0, split) : "";
    const value = split > 0 ? term.slice(split + 1) : "";

    if (!(SEARCH_PREFIXES as readonly string[]).includes(prefix) || !value) {
      return haystack.includes(term);
    }

    switch (prefix as SearchPrefix) {
      case "pnr":
        return (c.pnr ?? "").toLowerCase().includes(value);
      case "tag":
        return c.tags.some((t) => t.toLowerCase().includes(value));
      case "assignee":
        // Only one agent exists in the prototype, so "me"/their name both
        // mean the same thing; "unassigned" is the useful other half.
        return value === "unassigned"
          ? c.status === "queued" || c.status === "offered"
          : (value === "me" || YOU.toLowerCase().includes(value)) && c.status === "assigned";
      case "channel":
        return c.channel.toLowerCase().includes(value);
      case "status":
        return c.status.toLowerCase().includes(value);
      case "since": {
        const t = parseWhen(value, now);
        return t === null ? false : c.queuedSince >= t;
      }
      case "until": {
        const t = parseWhen(value, now);
        return t === null ? false : c.queuedSince <= t;
      }
    }
  });
}
