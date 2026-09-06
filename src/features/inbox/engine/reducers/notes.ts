// Case bodies lifted verbatim from `inboxReducer`'s switch.

import { activity, nid } from "../helpers";
import { mapConvo, nowLabel, parseMentions } from "./shared";
import type { InboxAction, InboxState } from "../state";

type NotesAction = Extract<InboxAction, { type: "ADD_NOTE" | "ADD_TASK" | "TOGGLE_TASK" }>;

export function notesReducer(state: InboxState, action: NotesAction): InboxState {
  switch (action.type) {
    case "ADD_NOTE": {
      const mentions = parseMentions(action.text);
      return mapConvo({ ...state, drafts: { ...state.drafts, [action.id]: "" } }, action.id, (c) => ({
        ...c,
        transcript: [
          ...c.transcript,
          {
            id: nid("m"),
            from: "note",
            text: action.text,
            time: nowLabel(),
            mentions: mentions.length ? mentions : undefined,
            // No `delivery` — deliberately. See `TranscriptMsg.from`.
          },
        ],
        activity: [
          ...c.activity,
          activity(
            mentions.length ? `Note added — ${mentions.join(", ")} mentioned` : "Internal note added",
            action.text.length > 48 ? `${action.text.slice(0, 48)}…` : action.text,
            nowLabel(),
          ),
        ],
      }));
    }

    case "ADD_TASK":
      return mapConvo(state, action.id, (c) => ({
        ...c,
        tasks: [
          ...(c.tasks ?? []),
          {
            id: nid("task"),
            title: action.title,
            owner: action.owner,
            dueAt: Date.now() + action.dueMinutes * 60_000,
            done: false,
          },
        ],
        activity: [
          ...c.activity,
          activity("Follow-up raised", `${action.title} · ${action.owner}`, nowLabel()),
        ],
      }));

    case "TOGGLE_TASK":
      return mapConvo(state, action.id, (c) => {
        const task = (c.tasks ?? []).find((t) => t.id === action.taskId);
        if (!task) return c;
        return {
          ...c,
          tasks: (c.tasks ?? []).map((t) => (t.id === action.taskId ? { ...t, done: !t.done } : t)),
          activity: [
            ...c.activity,
            activity(task.done ? "Follow-up reopened" : "Follow-up completed", task.title, nowLabel()),
          ],
        };
      });

    default: {
      // Exhaustive over this domain's slice of the union: an action added to
      // the group without a case here is a compile error, which the single
      // 637-line switch could not give (its `default` returned state).
      const unhandled: never = action;
      return unhandled;
    }
  }
}
