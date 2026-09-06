"use client";

import { useInbox } from "../context/InboxContext";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { HEADER_CONTROL } from "@/shared/workspaceChrome";

/**
 * The notifications bell, shared by the agent and supervisor headers.
 *
 * It was the same hand-drawn SVG copied into both, and in both it was inert —
 * a bell with nothing behind it. NextAdmin's carries an unread dot, and this
 * app has a real number to put behind one: the unread counts already shown on
 * each row in `TicketList`. So the dot appears only when something is
 * actually unread, and the count goes in the accessible name rather than
 * being left as colour-only information (WCAG 1.4.1).
 *
 * The dot is ringed in the surface colour, which is what keeps it legible as
 * a dot rather than a smudge on the bell's own outline — and why the ring is
 * a token: it has to match whichever theme is on.
 */
export default function NotificationsBell() {
  const { state } = useInbox();
  const { t } = useUiLocale();
  const unread = state.conversations.reduce((n, c) => n + c.unread, 0);
  const label = unread > 0 ? `${t("Notifications")} — ${unread} unread` : t("Notifications");

  return (
    <button type="button" aria-label={label} title={label} className={`relative ${HEADER_CONTROL}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {unread > 0 && (
        <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral ring-2 ring-card" />
      )}
    </button>
  );
}
