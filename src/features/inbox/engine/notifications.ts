// A central notification record — Phase 1 #4/#5/#6 of the OTA requirements
// (notification center, shared team visibility, unanswered-assignment
// escalation). One concern, one file, same shape as `bookingActions.ts` and
// `routing.ts`: the type plus the pure helpers that build and read it.
//
// This is a single-agent prototype (`YOU`, from `shared/lib/people.ts`) —
// there is no second live session to actually deliver a notification to.
// So a record addressed to someone else (a transfer destination, "Team" on
// an unanswered assignment) is real and queryable, but the panel only ever
// *renders* the ones addressed to `YOU`, same as everything else here.

import { nid } from "./helpers";
import type { Priority } from "./types";

export type NotificationType = "assignment" | "overdue" | "pending_action" | "handover";

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  /** "Related customer" — drills back to a ticket. */
  conversationId?: string;
  /** Ties a `pending_action` to one `FollowUpTask`, so toggling that task
   *  can flip this exact notification rather than every one on the thread. */
  taskId?: string;
  /** Who it's addressed to — a name from `shared/lib/people`, or "Team" for
   *  the unanswered-assignment escalation case. */
  for: string;
  /** Queue/team id, for the "eligible teammates" case. */
  team?: string;
  priority: Priority;
  /** The underlying thing's completion — distinct from `read` below. */
  status: "open" | "done";
  /** Separate from `status`: reading a notification is not completing its
   *  task. Only the reducer case that resolves the underlying thing (an
   *  accept, a completed follow-up, ...) ever flips `status`. */
  read: boolean;
  createdAt: number;
  /** A response deadline, where one applies, for a countdown in the panel. */
  deadline?: number;
  /** The doc's "available action" — what the button in the panel says. */
  actionLabel: string;
};

export function makeNotification(
  input: Omit<NotificationRecord, "id" | "createdAt" | "read" | "status"> & { status?: "open" | "done" },
): NotificationRecord {
  return {
    id: nid("n"),
    createdAt: Date.now(),
    read: false,
    status: input.status ?? "open",
    ...input,
  };
}

/** Newest first, scoped to one person — what the panel renders. */
export function notificationsFor(records: NotificationRecord[], person: string): NotificationRecord[] {
  return records.filter((n) => n.for === person).sort((a, b) => b.createdAt - a.createdAt);
}
