/**
 * INB-07. `matchesQuery` is the richest input domain in the engine: seven
 * prefixes, three relative-time forms, an ISO fallback, and a deliberate
 * rule about what an unrecognised prefix does. The browser suite types a
 * handful of queries into a real box; this enumerates the grammar.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesQuery } from "@/components/dashboard/inboxEngine";
import { convo, DAY, HOUR, MIN, NOW } from "./fixtures";

const c = convo({
  customerName: "Rahim Uddin",
  pnr: "TK4A9Z",
  route: "DAC-CXB",
  tags: ["VIP", "bKash"],
  channel: "WhatsApp",
  status: "queued",
  email: "rahim@example.com",
});
const match = (q: string, target = c) => matchesQuery(target, q, NOW);

describe("matchesQuery — free text", () => {
  it("matches nothing-as-everything: an empty query keeps the list whole", () => {
    assert.equal(match(""), true);
    assert.equal(match("    "), true);
  });

  it("searches name, PNR and route case-insensitively", () => {
    assert.equal(match("rahim"), true);
    assert.equal(match("RAHIM"), true);
    assert.equal(match("tk4a9z"), true);
    assert.equal(match("cxb"), true);
  });

  it("ANDs multiple terms rather than ORing them", () => {
    assert.equal(match("rahim cxb"), true);
    assert.equal(match("rahim tokyo"), false);
  });

  it("does not match a term that appears nowhere", () => {
    assert.equal(match("karim"), false);
  });
});

describe("matchesQuery — prefixes", () => {
  it("filters on pnr, tag, channel and status", () => {
    assert.equal(match("pnr:tk4a"), true);
    assert.equal(match("pnr:zzzz"), false);
    assert.equal(match("tag:vip"), true);
    assert.equal(match("tag:bkash"), true);
    assert.equal(match("tag:nagad"), false);
    assert.equal(match("channel:whatsapp"), true);
    assert.equal(match("channel:email"), false);
    assert.equal(match("status:queued"), true);
    assert.equal(match("status:resolved"), false);
  });

  it("treats an unrecognised prefix as a plain term, so a typo narrows", () => {
    // The alternative — ignoring the prefix and matching everything — turns
    // a typo into a silently wider result set, which is the failure the
    // engine's own comment calls out.
    assert.equal(match("foo:rahim"), false);
    assert.equal(match("pnrr:tk4a9z"), false);
  });

  it("treats a prefix with no value as a plain term too", () => {
    assert.equal(match("pnr:"), false);
  });

  it("does not read a leading colon as an empty prefix", () => {
    assert.equal(match(":rahim"), false);
  });

  it("resolves assignee:unassigned to whatever nobody holds", () => {
    assert.equal(match("assignee:unassigned", convo({ status: "queued" })), true);
    assert.equal(match("assignee:unassigned", convo({ status: "offered" })), true);
    assert.equal(match("assignee:unassigned", convo({ status: "assigned" })), false);
    assert.equal(match("assignee:unassigned", convo({ status: "resolved" })), false);
  });

  it("resolves assignee:me to work actually held", () => {
    assert.equal(match("assignee:me", convo({ status: "assigned" })), true);
    assert.equal(match("assignee:me", convo({ status: "queued" })), false);
  });
});

describe("matchesQuery — time bounds", () => {
  const twoDaysOld = convo({ queuedSince: NOW - 2 * DAY });
  const fresh = convo({ queuedSince: NOW - 5 * MIN });

  it("reads relative days, hours and minutes", () => {
    assert.equal(match("since:3d", twoDaysOld), true);
    assert.equal(match("since:1d", twoDaysOld), false);
    assert.equal(match("since:1h", fresh), true);
    assert.equal(match("since:90m", fresh), true);
    assert.equal(match("since:1m", fresh), false);
  });

  it("reads an ISO date", () => {
    assert.equal(match("since:2026-02-01", twoDaysOld), true);
    assert.equal(match("since:2026-03-01", twoDaysOld), false);
  });

  it("bounds from the other side with until", () => {
    assert.equal(match("until:1d", twoDaysOld), true);
    assert.equal(match("until:1d", fresh), false);
  });

  it("matches nothing on an unparseable time rather than everything", () => {
    // Failing open here would show a supervisor a list they believe is
    // filtered. Both bounds return false on null.
    assert.equal(match("since:yesterday", twoDaysOld), false);
    assert.equal(match("until:soon", twoDaysOld), false);
  });

  it("combines a bound with a prefix and a plain term", () => {
    const hit = convo({ pnr: "TK4A9Z", tags: ["VIP"], queuedSince: NOW - 2 * HOUR, customerName: "Rahim Uddin" });
    assert.equal(match("pnr:tk4a tag:vip since:3h rahim", hit), true);
    assert.equal(match("pnr:tk4a tag:vip since:1h rahim", hit), false);
  });
});
