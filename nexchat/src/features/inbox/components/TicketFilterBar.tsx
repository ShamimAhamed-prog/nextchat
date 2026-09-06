"use client";

import { useInbox } from "./InboxContext";
import { useNow } from "./useCountdown";
import { useUiLocale } from "../UiLocale";
import { INBOX_VIEWS, matchesView, type Channel, type InboxView } from "./inboxEngine";

// The channel filter (All/Website/WhatsApp/Messenger) lives in
// `DashboardHeader` now, as an icon nav — this type is the one thing from
// that move both `TicketDashboard` and `TicketList` still need, so it stays
// exported from here rather than forcing an unrelated import change.
export type ChannelFilter = "all" | Channel;

export default function TicketFilterBar({
  view,
  onViewChange,
}: {
  view: InboxView;
  onViewChange: (v: InboxView) => void;
}) {
  const { state } = useInbox();
  const { t } = useUiLocale();
  // SLA risk and recently-resolved are time-dependent, so the counts have to
  // move with the clock rather than only on dispatch.
  const now = useNow();

  return (
    <div className="rounded-lg bg-page p-2">
      {/* Nine views scroll rather than wrap — the workspace is already a
          fixed-width three-pane layout and a second row would push it. */}
      {/* The last view was being clipped with nothing to suggest it existed.
          The mask fades the trailing edge so the row reads as scrollable
          rather than as a tab that happens to be cut in half. */}
      <nav
        aria-label={t("Inbox views")}
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-footer p-1.5 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {INBOX_VIEWS.map((tab) => {
          const count = state.conversations.filter((c) => !c.disruptionId && matchesView(c, tab.id, now)).length;
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onViewChange(tab.id)}
              aria-current={active || undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                // Dark on coral, not white: white measured 2.99:1 here.
                active ? "bg-coral text-ink-invert" : "text-ink hover:bg-panel"
              }`}
            >
              {t(tab.label)}
              <span
                className={`inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] ${
                  active ? "bg-danger-bg-strong text-on-accent" : "bg-raised text-violet-text-pale"
                }`}
              >
                {String(count).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
