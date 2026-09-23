// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import type { Channel, Conversation } from "./types";

/* --- Channel send rules (INB-12) -----------------------------------------
 *
 * Every channel here has a window inside which you may say anything, and a
 * rule for what you may send once it closes. These are the real platform
 * rules, not invented ones: WhatsApp and Messenger both open a 24-hour
 * customer-service window on each inbound message and allow only approved
 * templates outside it; a web widget can only be answered while the session
 * is actually open.
 *
 * The gate is deliberately in the engine and not in the composer, because
 * the answer ("you may not free-type, here is what you may do instead") is
 * the same wherever a send is attempted.
 *
 * Instagram Direct sits under the same Meta messaging policy as Messenger —
 * a real 24-hour window, not a guess. Email has no such rule at all: a
 * reply thread doesn't expire, so its window never closes (`Infinity`)
 * rather than inventing a platform restriction email doesn't have.
 */
const CHANNEL_WINDOW_MS: Record<Channel, number> = {
  WhatsApp: 24 * 60 * 60_000,
  Messenger: 24 * 60 * 60_000,
  Instagram: 24 * 60 * 60_000,
  Website: 30 * 60_000,
  Email: Infinity,
};

export const APPROVED_TEMPLATES = [
  { id: "booking_update", label: "Booking update", body: "We have an update on your booking. Reply to this message and we can continue here." },
  { id: "ticket_issued", label: "Ticket issued", body: "Your e-ticket has been issued and sent to your email. Reply here if it has not arrived." },
  { id: "agent_followup", label: "Agent follow-up", body: "Following up on your recent request with Nexchatgen. Reply to reopen the conversation." },
];

export type SendPolicy = {
  /** Free-typed replies allowed. */
  canFreeType: boolean;
  /** Approved templates allowed (false when the customer has not opted in). */
  canTemplate: boolean;
  /** Why the composer is restricted, in the agent's terms. */
  reason?: string;
  /** How long the window has left, when it is open. */
  windowClosesAt?: number;
  /** An enabled channel that can still reach this customer. */
  alternative?: Channel;
};

export function channelSendPolicy(
  c: Conversation,
  now: number,
  enabledChannels: Channel[],
): SendPolicy {
  const windowMs = CHANNEL_WINDOW_MS[c.channel];
  const closesAt = c.lastCustomerAt + windowMs;
  const open = now < closesAt;

  if (open) return { canFreeType: true, canTemplate: true, windowClosesAt: closesAt };

  // The window is shut. Anything else depends on consent, and on whether we
  // hold an identifier for a channel that is still open to us.
  const alternative = enabledChannels.find(
    (ch) => ch !== c.channel && ch !== "Website" && c.phone.length > 0,
  );

  if (!c.channelOptIn) {
    return {
      canFreeType: false,
      canTemplate: false,
      reason: `The ${c.channel} reply window has closed and this customer has not opted in to messages outside it. Nothing can be sent on ${c.channel} until they message again.`,
      alternative,
    };
  }

  if (c.channel === "Website") {
    return {
      canFreeType: false,
      canTemplate: false,
      reason: "The web widget session has ended, so there is nowhere to deliver a reply. Reach them on a messaging channel instead.",
      alternative,
    };
  }

  return {
    canFreeType: false,
    canTemplate: true,
    reason: `The 24-hour ${c.channel} reply window has closed. Only an approved template can be sent until the customer replies.`,
    alternative,
  };
}
