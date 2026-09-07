// Phase 1 #3: an incoming call, simulated — there is no telephony provider
// wired into this prototype (no backend at all, in fact), so this models
// the real state a call goes through (ringing, connected, ended or missed)
// rather than faking audio. It is deliberately not a `Channel`: a call has
// no message-delivery ladder and no reply-window policy, and the
// requirement itself only asks to "associate each call with the
// customer's conversation" — an event overlaid on an existing conversation,
// not a new persistent channel a conversation belongs to. See
// `IncomingCallBanner.tsx` for where this is driven from.

import type { Channel, Conversation } from "./types";

export type CallState = "ringing" | "connected" | "ended" | "missed";

export type IncomingCall = {
  conversationId: string;
  customerName: string;
  phone: string;
  /** Which connected channel the call arrived on — descriptive only. */
  channel: Channel;
  state: CallState;
  startedAt: number;
  connectedAt?: number;
  endedAt?: number;
};

/** A conversation a simulated call can plausibly come in on — has a phone
 *  number and isn't already resolved. */
export function callableConversation(conversations: Conversation[]): Conversation | undefined {
  return conversations.find((c) => c.phone && c.status !== "resolved");
}

export function callDuration(call: IncomingCall): string {
  const ms = (call.endedAt ?? Date.now()) - (call.connectedAt ?? call.startedAt);
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}
