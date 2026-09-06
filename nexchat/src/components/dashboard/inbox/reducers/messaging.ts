// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { YOU } from "@/lib/people";
import { activity, nid } from "../helpers";
import { MAX_SEND_ATTEMPTS, nextDeliveryState } from "../types";
import { mapConvo, mapMessage, nowLabel } from "./shared";
import type { InboxAction, InboxState } from "../state";

type MessagingAction = Extract<InboxAction, { type: "SEND_MESSAGE" | "REQUEST_AI_DRAFT" | "RESOLVE_AI_DRAFT" | "EDIT_AI_DRAFT" | "DISCARD_AI_DRAFT" | "ADVANCE_DELIVERY" | "FAIL_DELIVERY" | "RETRY_SEND" }>;

export function messagingReducer(state: InboxState, action: MessagingAction): InboxState {
  switch (action.type) {
    case "SEND_MESSAGE":
      return mapConvo({ ...state, drafts: { ...state.drafts, [action.id]: "" } }, action.id, (c) => ({
        ...c,
        transcript: [
          ...c.transcript,
          {
            id: nid("m"),
            from: "agent",
            text: action.text,
            time: nowLabel(),
            attachment: action.attachment,
            // INB-09: nothing is "sent" until the channel says so.
            delivery: { state: "queued", attempts: 1 },
          },
        ],
        aiDraft: undefined,
        activity: [
          ...c.activity,
          action.attachment
            ? activity(
                `Agent sent ${action.attachment.kind}${action.sandbox ? " (sandbox)" : ""}`,
                action.attachment.name,
                nowLabel(),
              )
            : activity(
                `Agent replied${action.sandbox ? " (sandbox — not delivered)" : ""}`,
                action.text.length > 40 ? `${action.text.slice(0, 40)}…` : action.text,
                nowLabel(),
              ),
        ],
      }));
    case "REQUEST_AI_DRAFT":
      return mapConvo(state, action.id, (c) => ({ ...c, aiThinking: true }));
    case "RESOLVE_AI_DRAFT":
      return mapConvo(state, action.id, (c) => ({ ...c, aiThinking: false, aiDraft: action.text }));
    case "EDIT_AI_DRAFT":
      return mapConvo(state, action.id, (c) => ({ ...c, aiDraft: undefined }));
    case "DISCARD_AI_DRAFT":
      return mapConvo(state, action.id, (c) => ({ ...c, aiDraft: undefined }));

    case "ADVANCE_DELIVERY":
      return mapMessage(state, action.id, action.msgId, (m, channel) => {
        if (!m.delivery) return m;
        const next = nextDeliveryState(channel, m.delivery.state);
        return next ? { ...m, delivery: { ...m.delivery, state: next } } : m;
      });

    case "FAIL_DELIVERY":
      return mapConvo(state, action.id, (c) => {
        const msg = c.transcript.find((m) => m.id === action.msgId);
        if (!msg?.delivery) return c;
        // Bounded: the last permitted attempt makes the failure terminal, and
        // from there it is the operator's call rather than a silent loop.
        const terminal = msg.delivery.attempts >= MAX_SEND_ATTEMPTS;
        return {
          ...c,
          transcript: c.transcript.map((m) =>
            m.id === action.msgId
              ? {
                  ...m,
                  delivery: {
                    ...msg.delivery!,
                    state: "failed",
                    terminalReason: terminal ? action.reason : undefined,
                  },
                }
              : m,
          ),
          activity: terminal
            ? [
                ...c.activity,
                activity(
                  "Send failed — needs an operator",
                  `${action.reason} · ${msg.delivery.attempts}/${MAX_SEND_ATTEMPTS} attempts`,
                  nowLabel(),
                ),
              ]
            : c.activity,
        };
      });

    case "RETRY_SEND":
      return mapConvo(state, action.id, (c) => ({
        ...c,
        transcript: c.transcript.map((m) =>
          m.id === action.msgId && m.delivery
            ? {
                ...m,
                delivery: {
                  state: "queued",
                  // A manual retry is a fresh decision by a human, so it gets
                  // the full allowance again rather than inheriting a
                  // budget the automatic attempts already spent.
                  attempts: action.manual ? 1 : m.delivery.attempts + 1,
                  terminalReason: undefined,
                },
              }
            : m,
        ),
        activity: action.manual
          ? [...c.activity, activity("Send retried by agent", `${YOU} · attempt reset`, nowLabel())]
          : c.activity,
      }));

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
