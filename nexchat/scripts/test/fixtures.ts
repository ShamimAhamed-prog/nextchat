/*
 * `.ts`, while the tests beside it are `.test.mts`, and the split is load
 * bearing in both directions. The tests are `.mts` so Node knows they are
 * ESM without consulting a `package.json` that does not say. This one is
 * `.ts` because `moduleResolution: "bundler"` does not resolve an
 * extensionless `./fixtures` to a `.mts` file, so as `.mts` it type-checked
 * as a missing module while running perfectly — green tests over a red
 * `tsc`, which is the worst of the four possible states.
 */

/**
 * A `Conversation` is 40-odd fields, almost none of which any one pure
 * function reads. `convo()` fills every required field with something inert
 * and lets a test name only what it is actually about, so an assertion about
 * queue order is not buried in twenty lines of irrelevant transcript.
 */
import type { Channel, Conversation, ConvoStatus, Priority } from "@/components/dashboard/inboxEngine";

export const NOW = Date.parse("2026-03-01T12:00:00Z");
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

let seq = 0;

export function convo(over: Partial<Conversation> = {}): Conversation {
  seq += 1;
  return {
    id: `c${seq}`,
    customerName: "Test Customer",
    phone: "+8801711000000",
    email: "test@example.com",
    address: "House 1, Road 1, Dhanmondi, Dhaka",
    passportNid: "1234567890",
    channel: "WhatsApp" as Channel,
    queueId: "q1",
    bookingState: "No active booking",
    language: "English",
    status: "queued" as ConvoStatus,
    priority: "P2" as Priority,
    escalationReason: "",
    summary: "",
    intentTrail: [],
    tags: [],
    transcript: [],
    activity: [],
    unread: 0,
    updatedLabel: "just now",
    lastCustomerAt: NOW,
    channelOptIn: false,
    queuedSince: NOW,
    slaDeadline: NOW + 4 * HOUR,
    ownerLeaseActive: false,
    aiThinking: false,
    identityStatus: "unverified",
    ...over,
  };
}
