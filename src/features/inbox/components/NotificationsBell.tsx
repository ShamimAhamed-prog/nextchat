"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useInbox } from "../context/InboxContext";
import { useNow } from "../engine/useCountdown";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { HEADER_CONTROL } from "@/shared/workspaceChrome";
import { notificationsFor, YOU, type NotificationRecord, type NotificationType } from "../engine/inboxEngine";

/**
 * Phase 1 #4's notification center: assignments, overdue responses, pending
 * actions and handovers, in one place — not just an unread dot. Shared by
 * the agent header (`DashboardHeader.tsx`) and the supervisor one
 * (`AdminHeader.tsx`), so both surfaces get it from this one component.
 *
 * This is a single-agent prototype: a notification can be addressed to
 * someone else (a transfer destination, "Team" on an unanswered
 * assignment) and that record is real and stored, but there is no second
 * logged-in session to show it to, so the panel only ever renders `YOU`'s
 * own — see `notifications.ts`'s doc comment for why that's the honest
 * scope here rather than a gap.
 *
 * The trigger stays a bare `<button>` — not wrapped in a container — so it
 * remains a literal DOM sibling of `ThemeToggle` (asserted by
 * `theme-light.mjs`). The popover is a sibling *of the button*, returned
 * alongside it from a Fragment, and anchors off the `relative` header
 * cluster both callers already wrap them in.
 */
const TYPE_COLOR: Record<NotificationType, string> = {
  assignment: "var(--color-ok-strong)",
  overdue: "var(--color-danger-strong)",
  pending_action: "var(--color-warn-strong)",
  handover: "var(--color-info-text-alt)",
};

const TYPE_LABEL: Record<NotificationType, string> = {
  assignment: "Assignment",
  overdue: "Overdue",
  pending_action: "Pending action",
  handover: "Handover",
};

/** `t()` looks strings up by their English text, so a template with an
 *  interpolated number can't be a dictionary key — build the two fixed
 *  halves separately and translate only those, same as `formatSlaBadge`
 *  does for the SLA badge next to it in `TicketList`. */
function deadlineLabel(deadline: number | undefined, now: number, t: (s: string) => string): string | null {
  if (!deadline) return null;
  const mins = Math.max(1, Math.round(Math.abs(deadline - now) / 60_000));
  if (deadline <= now) return `${mins}${t("m overdue")}`;
  if (mins < 60) return `${mins}${t("m left")}`;
  return `${Math.round(mins / 60)}${t("h left")}`;
}

function NotificationRow({ n, now, onAct }: { n: NotificationRecord; now: number; onAct: () => void }) {
  const { t } = useUiLocale();
  const deadline = deadlineLabel(n.deadline, now, t);
  return (
    <li className={`flex flex-col gap-1 rounded-md p-2.5 ${n.read ? "" : "bg-panel/40"}`}>
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR[n.type] }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TYPE_COLOR[n.type] }}>
          {t(TYPE_LABEL[n.type])}
        </span>
        {deadline && <span className="ml-auto text-[10px] tabular-nums text-ink-dim">{deadline}</span>}
      </div>
      <p className="text-sm font-medium text-ink">{n.title}</p>
      {n.detail && <p className="truncate text-xs text-ink-dim">{n.detail}</p>}
      <button
        type="button"
        onClick={onAct}
        className="mt-1 self-start rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:border-coral hover:text-coral"
      >
        {t(n.actionLabel)}
      </button>
    </li>
  );
}

export default function NotificationsBell() {
  const { state, dispatch } = useInbox();
  const { t } = useUiLocale();
  const router = useRouter();
  const pathname = usePathname();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const mine = notificationsFor(state.notifications, YOU);
  const unread = mine.filter((n) => !n.read).length;
  const label = unread > 0 ? `${t("Notifications")} — ${unread} unread` : t("Notifications");

  function act(n: NotificationRecord) {
    dispatch({ type: "MARK_NOTIFICATION_READ", id: n.id });
    // §5's "take ownership of the required action" — an assignment (an
    // offer) or an overdue escalation both mean "claim this," so the
    // panel's own action does that rather than only linking to the
    // conversation and making the agent find Accept a second time. `ACCEPT`
    // already no-ops when the agent isn't eligible, so this is safe to
    // always send.
    if ((n.type === "assignment" || n.type === "overdue") && n.conversationId) {
      dispatch({ type: "ACCEPT", id: n.conversationId });
    }
    if (n.type === "handover" && n.actionLabel === "Acknowledge") {
      dispatch({ type: "ACKNOWLEDGE_HANDOVER", id: n.id });
    }
    if (n.conversationId) {
      dispatch({ type: "SELECT", id: n.conversationId });
      if (pathname !== "/inbox") router.push("/inbox");
    }
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative ${HEADER_CONTROL}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {unread > 0 && (
          <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral ring-2 ring-card" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="region"
          aria-label={t("Notifications")}
          className="card-hairline absolute right-0 top-11 z-20 flex w-80 flex-col gap-1 rounded-lg bg-page p-2 shadow-pop"
        >
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-sm font-semibold text-ink">{t("Notifications")}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" })}
                className="text-xs text-ink-dim transition-colors hover:text-coral"
              >
                {t("Mark all read")}
              </button>
            )}
          </div>

          {mine.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-ink-dim">{t("You're all caught up.")}</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
              {mine.map((n) => (
                <NotificationRow key={n.id} n={n} now={now} onAct={() => act(n)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
