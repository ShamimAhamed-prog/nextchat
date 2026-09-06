/**
 * §C1/§E3 ordering, and RT-08's supervisor pin. This is a comparator, so
 * the thing worth asserting is a whole sorted list rather than one pair —
 * the bug the engine's own comment records (priority scoped to unclaimed
 * work only) was invisible pairwise and obvious once rendered in order.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { queueSort, type Conversation } from "@/features/inbox/engine/inboxEngine";
import { convo, HOUR, MIN, NOW } from "./fixtures";

const order = (cs: Conversation[]) => [...cs].sort(queueSort).map((c) => c.id);

describe("queueSort", () => {
  it("puts live work first, then snoozed, then resolved", () => {
    const cs = [
      convo({ id: "resolved", status: "resolved" }),
      convo({ id: "snoozed", status: "snoozed" }),
      convo({ id: "queued", status: "queued" }),
    ];
    assert.deepEqual(order(cs), ["queued", "snoozed", "resolved"]);
  });

  it("ranks by priority band across the live group, whoever holds it", () => {
    // An assigned P0 outranks an unclaimed P2: it is still the most urgent
    // thing on the screen, and has to read that way.
    const cs = [
      convo({ id: "queued-p2", status: "queued", priority: "P2" }),
      convo({ id: "assigned-p0", status: "assigned", priority: "P0" }),
      convo({ id: "offered-p1", status: "offered", priority: "P1" }),
      convo({ id: "queued-p3", status: "queued", priority: "P3" }),
    ];
    assert.deepEqual(order(cs), ["assigned-p0", "offered-p1", "queued-p2", "queued-p3"]);
  });

  it("breaks a priority tie by age, oldest first", () => {
    const cs = [
      convo({ id: "newer", priority: "P1", queuedSince: NOW - 5 * MIN }),
      convo({ id: "older", priority: "P1", queuedSince: NOW - 3 * HOUR }),
      convo({ id: "middle", priority: "P1", queuedSince: NOW - 40 * MIN }),
    ];
    assert.deepEqual(order(cs), ["older", "middle", "newer"]);
  });

  it("lets a supervisor's pin outrank priority within the live group", () => {
    const cs = [
      convo({ id: "p0", priority: "P0" }),
      convo({ id: "pinned-p3", priority: "P3", pinned: { by: "Supervisor", reason: "Escalated by the airline" } }),
    ];
    assert.deepEqual(order(cs), ["pinned-p3", "p0"]);
  });

  it("does not let a pin resurrect a resolved conversation", () => {
    const cs = [
      convo({ id: "live-p3", status: "queued", priority: "P3" }),
      convo({ id: "pinned-resolved", status: "resolved", priority: "P0", pinned: { by: "Supervisor", reason: "Check this" } }),
    ];
    assert.deepEqual(order(cs), ["live-p3", "pinned-resolved"]);
  });

  it("leaves settled work in the order it was already in", () => {
    // Returns 0 for any pair outside the live group, so Array#sort's
    // stability is what preserves it. Asserted because the guarantee is the
    // reason no priority rule is applied there.
    const cs = [
      convo({ id: "r1", status: "resolved", priority: "P3" }),
      convo({ id: "r2", status: "resolved", priority: "P0" }),
      convo({ id: "r3", status: "resolved", priority: "P1" }),
    ];
    assert.deepEqual(order(cs), ["r1", "r2", "r3"]);
  });
});
