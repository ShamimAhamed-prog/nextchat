/**
 * INB-12. Every branch of the send gate, including the two that differ from
 * "the window closed, use a template": a web widget has nowhere to deliver
 * to at all, and a customer who never opted in cannot be sent even one.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { channelSendPolicy, type Channel } from "@/features/inbox/engine/inboxEngine";
import { convo, DAY, HOUR, MIN, NOW } from "./fixtures";

const ALL: Channel[] = ["WhatsApp", "Website", "Messenger", "Instagram", "Email"];
const policy = (over: Parameters<typeof convo>[0], enabled = ALL) =>
  channelSendPolicy(convo(over), NOW, enabled);

describe("channelSendPolicy — inside the window", () => {
  it("allows anything while a 24-hour messaging window is open", () => {
    for (const channel of ["WhatsApp", "Messenger", "Instagram"] as Channel[]) {
      const p = policy({ channel, lastCustomerAt: NOW - 2 * HOUR });
      assert.equal(p.canFreeType, true, channel);
      assert.equal(p.canTemplate, true, channel);
      assert.equal(p.windowClosesAt, NOW - 2 * HOUR + DAY, channel);
      assert.equal(p.reason, undefined, channel);
    }
  });

  it("gives the web widget a 30-minute session rather than a day", () => {
    assert.equal(policy({ channel: "Website", lastCustomerAt: NOW - 20 * MIN }).canFreeType, true);
    assert.equal(policy({ channel: "Website", lastCustomerAt: NOW - 40 * MIN }).canFreeType, false);
  });

  it("never closes an email thread, because a reply thread does not expire", () => {
    const p = policy({ channel: "Email", lastCustomerAt: NOW - 400 * DAY });
    assert.equal(p.canFreeType, true);
    assert.equal(p.windowClosesAt, Infinity);
  });
});

describe("channelSendPolicy — after it closes", () => {
  const closed = { channel: "WhatsApp" as Channel, lastCustomerAt: NOW - 25 * HOUR };

  it("permits an approved template once the customer has opted in", () => {
    const p = policy({ ...closed, channelOptIn: true });
    assert.equal(p.canFreeType, false);
    assert.equal(p.canTemplate, true);
    assert.match(p.reason ?? "", /approved template/);
  });

  it("permits nothing at all without opt-in", () => {
    const p = policy({ ...closed, channelOptIn: false });
    assert.equal(p.canFreeType, false);
    assert.equal(p.canTemplate, false);
    assert.match(p.reason ?? "", /has not opted in/);
  });

  it("offers no template for a web widget even with opt-in, having nowhere to send it", () => {
    const p = policy({ channel: "Website", lastCustomerAt: NOW - 2 * HOUR, channelOptIn: true });
    assert.equal(p.canTemplate, false);
    assert.match(p.reason ?? "", /session has ended/);
  });

  it("suggests another enabled channel, and never the closed one or the widget", () => {
    const p = policy({ ...closed, channelOptIn: true });
    assert.notEqual(p.alternative, "WhatsApp");
    assert.notEqual(p.alternative, "Website");
    assert.ok(p.alternative && ALL.includes(p.alternative), String(p.alternative));
  });

  it("suggests nothing when only the closed channel is enabled", () => {
    assert.equal(policy({ ...closed, channelOptIn: true }, ["WhatsApp"]).alternative, undefined);
  });

  it("suggests nothing when no phone number is held", () => {
    // The alternative is only reachable via an identifier, so an empty phone
    // rules out every messaging channel rather than some of them.
    assert.equal(policy({ ...closed, channelOptIn: true, phone: "" }).alternative, undefined);
  });
});
