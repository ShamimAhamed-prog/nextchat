// Helpers shared across the domain reducers. Each was module-private inside
// the old 637-line `inboxReducer`; splitting that function is what made
// them need a home of their own.

import { ALL_PEOPLE } from "@/lib/people";
import type { InboxState } from "../state";
import type { Channel, Conversation, TranscriptMsg } from "../types";

/**
 * `@Name` mentions, matched against the real roster rather than any word
 * after an @ — an email address in a note should not mention anybody.
 */
export function parseMentions(text: string): string[] {
  return ALL_PEOPLE.filter((person) => {
    const first = person.split(" ")[0];
    // `\\b` — a literal word-boundary escape for the RegExp constructor. A
    // bare `\b` inside a template literal is a backspace character, which
    // silently matches nothing.
    return new RegExp(`@${first}\\b`, "i").test(text);
  });
}

/** Map one message inside one conversation, with the channel in hand. */
function mapMessage(
  state: InboxState,
  id: string,
  msgId: string,
  fn: (m: TranscriptMsg, channel: Channel) => TranscriptMsg,
): InboxState {
  return mapConvo(state, id, (c) => ({
    ...c,
    transcript: c.transcript.map((m) => (m.id === msgId ? fn(m, c.channel) : m)),
  }));
}

function mapConvo(state: InboxState, id: string, fn: (c: Conversation) => Conversation): InboxState {
  return { ...state, conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)) };
}

function nowLabel(): string {
  return "just now";
}

const AI_DRAFTS: Record<string, string> = {
  "policy.baggage": "Economy Saver includes 20kg checked baggage and 7kg cabin on domestic routes — for a group of 5 travelling together I've also flagged this for a fare check, since group pricing can differ slightly.",
  "refund.status": "I can see the date-change fee refund was approved on our side but hasn't settled to your card yet — card refunds typically take 5–10 business days. I'll chase this with finance and update you within the hour.",
  default: "Thanks for your patience — I'm looking into this now and will have an update for you shortly.",
};

export { mapConvo, mapMessage, nowLabel };

/** The AI's suggested reply for a conversation's top intent. */
export function draftFor(c: Conversation): string {
  const topIntent = c.intentTrail[0]?.intent;
  return AI_DRAFTS[topIntent ?? "default"] ?? AI_DRAFTS.default;
}
