"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import TicketFilterBar, { type ChannelFilter } from "./TicketFilterBar";
import TicketList from "./TicketList";
import ChatPanel from "./ChatPanel";
import DetailsPanel from "./DetailsPanel";
import OfferBanner from "./OfferBanner";
import NoEligibleAgentNotice from "./NoEligibleAgentNotice";
import DisruptionCohort from "./DisruptionCohort";
import TransferModal from "./TransferModal";
import ResolveModal from "./ResolveModal";
import SnoozeModal from "./SnoozeModal";
import RevealPiiModal from "./RevealPiiModal";
import BookingActionModal from "./BookingActionModal";
import AgentStateGuardModal from "./AgentStateGuardModal";
import SandboxBanner from "../admin/SandboxBanner";
import KeyboardShortcuts, { type ShortcutActions } from "./KeyboardShortcuts";
import type { ComposerHandle } from "./chat/composerHandle";
import { useInbox } from "./InboxContext";
import type { InboxView } from "./inboxEngine";

// No InboxProvider here — `/inbox` and `/dashboard` share one, mounted at
// `src/app/(workspace)/layout.tsx`, so a supervisor's live queue view
// reflects the same conversations rather than a second, independent
// simulation. See that layout's comment for why.
export default function TicketDashboard() {
  const { state, dispatch } = useInbox();
  const [view, setView] = useState<InboxView>(() => state.viewIntent ?? "all");
  // NFR-12: below `lg` the list and the conversation take turns; below `2xl`
  // the details pane is an overlay rather than a third column, so the
  // conversation keeps real width on every laptop screen instead of being
  // squeezed to a sliver between two fixed-width columns. Above `2xl`
  // neither piece of state does anything — all three panes are visible and
  // the CSS ignores them.
  const [pane, setPane] = useState<"list" | "conversation">("list");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  // Set by ChatPanel so `r` and `n` can reach the composer it owns.
  const composerRef = useRef<ComposerHandle | null>(null);

  const step = useCallback(
    (delta: number) => {
      if (visibleIds.length === 0) return;
      const i = visibleIds.indexOf(state.selectedId ?? "");
      // From nothing selected, `j` starts at the top rather than doing nothing.
      const next = i < 0 ? 0 : Math.min(visibleIds.length - 1, Math.max(0, i + delta));
      dispatch({ type: "SELECT", id: visibleIds[next] });
      setPane("conversation");
    },
    [visibleIds, state.selectedId, dispatch],
  );

  const shortcutActions: ShortcutActions = useMemo(
    () => ({
      next: () => step(1),
      previous: () => step(-1),
      focusSearch: () => {
        setPane("list");
        document.getElementById("ticket-search")?.focus();
      },
      focusReply: () => composerRef.current?.focusReply(),
      toggleNote: () => composerRef.current?.toggleNote(),
    }),
    [step],
  );
  // Lazy initializer: picks up a `/dashboard` "Details" drill-down's
  // requested channel exactly once, on this mount, then behaves like
  // ordinary local filter state — see `channelFilterIntent`'s doc comment
  // in `inboxEngine.ts` for why it also gets cleared right after.
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(() => state.channelFilterIntent ?? "all");

  useEffect(() => {
    // Guarded to a no-op once already null (see the reducer case), so this
    // can safely list its real dependencies instead of a mount-only `[]` —
    // it only ever does anything on the first render where an intent was
    // actually pending.
    dispatch({ type: "CLEAR_CHANNEL_FILTER_INTENT" });
  }, [state.channelFilterIntent, dispatch]);

  useEffect(() => {
    dispatch({ type: "CLEAR_VIEW_INTENT" });
  }, [state.viewIntent, dispatch]);

  const transferTarget = state.conversations.find((c) => c.id === state.transferTargetId);
  const resolveTarget = state.conversations.find((c) => c.id === state.resolveTargetId);
  const snoozeTarget = state.conversations.find((c) => c.id === state.snoozeTargetId);
  const piiTarget = state.piiRevealTarget;
  const piiConvo = state.conversations.find((c) => c.id === piiTarget?.id);
  const bookingTarget = state.bookingActionTarget;
  const bookingConvo = state.conversations.find((c) => c.id === bookingTarget?.id);

  return (
    // An agent tool should not scroll its own chrome away. `h-screen` +
    // `overflow-hidden` makes this an app shell: the header, filters and view
    // tabs stay put, and only the three panes scroll, each on its own axis.
    // `min-h-screen` let the whole page grow to ~2300px instead.
    <main className="flex h-screen gap-3 overflow-hidden bg-page p-3 sm:gap-4 sm:p-4">
      <DashboardSidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <DashboardHeader channelFilter={channelFilter} onChannelChange={setChannelFilter} />
        <SandboxBanner />
        <DisruptionCohort />
        <OfferBanner />
        <NoEligibleAgentNotice />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-2xl bg-footer p-3 sm:p-4">
          <TicketFilterBar view={view} onViewChange={setView} />

          <div className="flex min-h-0 min-w-0 flex-1 gap-3">
            <div
              className={`flex min-h-0 min-w-0 ${pane === "conversation" ? "hidden" : "flex flex-1"} lg:flex lg:flex-none`}
            >
              <TicketList
                view={view}
                channelFilter={channelFilter}
                onOpen={() => setPane("conversation")}
                onVisibleChange={setVisibleIds}
              />
            </div>

            {/* Keyed on the selection so per-conversation refs and transient
                UI reset cleanly on switch. The composer *draft* deliberately
                no longer lives here — it is in inbox state, so switching away
                mid-sentence and back does not throw the text away. */}
            <div
              className={`min-h-0 min-w-0 flex-1 ${pane === "list" ? "hidden" : "flex"} lg:flex`}
            >
              <ChatPanel
                key={state.selectedId}
                onBack={() => setPane("list")}
                onShowDetails={() => setDetailsOpen(true)}
                composerRef={composerRef}
              />
            </div>

            <div className="hidden min-h-0 min-w-0 2xl:flex">
              <DetailsPanel />
            </div>
          </div>
        </div>
      </div>

      {transferTarget && <TransferModal conversation={transferTarget} />}
      {resolveTarget && <ResolveModal conversation={resolveTarget} />}
      {snoozeTarget && <SnoozeModal conversation={snoozeTarget} />}
      {piiTarget && piiConvo && <RevealPiiModal conversation={piiConvo} field={piiTarget.field} />}
      {/* Below `2xl` the details pane slides in over the workspace instead of
          being a third column that would otherwise squeeze the conversation
          down to a sliver on every laptop screen up to ~1536px (NFR-12). */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-scrim/70 2xl:hidden" onClick={() => setDetailsOpen(false)}>
          <div
            className="h-full w-full max-w-[420px] overflow-y-auto bg-footer p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <DetailsPanel onClose={() => setDetailsOpen(false)} />
          </div>
        </div>
      )}

      <KeyboardShortcuts actions={shortcutActions} />

      {state.pendingAgentState && <AgentStateGuardModal nextState={state.pendingAgentState} />}
      {bookingTarget && bookingConvo && (
        <BookingActionModal conversation={bookingConvo} action={bookingTarget.action} actionKey={bookingTarget.key} />
      )}
    </main>
  );
}
