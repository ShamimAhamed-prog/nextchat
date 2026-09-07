"use client";

import { useEffect, useState } from "react";
import InitialsAvatar from "@/shared/ui/InitialsAvatar";
import { useInbox } from "../context/InboxContext";
import { useCountdown, useNow } from "../engine/useCountdown";
import { formatSlaBadge, useUiLocale } from "@/shared/providers/UiLocale";
import type { ChannelFilter } from "./TicketFilterBar";
import { matchesQuery, matchesView, queueSort, SEARCH_HINT, slaBadge, type Conversation, type InboxView, type Priority } from "../engine/inboxEngine";

const STATUS_LABEL: Record<Conversation["status"], string> = {
  queued: "Unassigned",
  offered: "Offered",
  assigned: "Assigned to you",
  snoozed: "Snoozed",
  resolved: "Resolved",
};
const STATUS_COLOR: Record<Conversation["status"], string> = {
  queued: "var(--color-ink-dim)",
  offered: "var(--color-warn-strong)",
  assigned: "var(--color-ok-strong)",
  snoozed: "var(--color-violet-strong)",
  resolved: "var(--color-state-resolved)",
};
const PRIORITY_COLOR: Record<Priority, string> = { P0: "var(--color-danger-strong)", P1: "var(--color-warn-strong)", P2: "var(--color-state-busy)", P3: "var(--color-ink-dim)" };

export default function TicketList({
  view,
  channelFilter,
  onOpen,
  onVisibleChange,
}: {
  view: InboxView;
  channelFilter: ChannelFilter;
  /** Below `lg` the list and conversation share the screen — selecting a row
   *  has to switch to it, since it is not visible beside the list. */
  onOpen?: () => void;
  /** The ids currently on screen, in order, so keyboard navigation follows
   *  what the agent can actually see rather than the unfiltered list. */
  onVisibleChange?: (ids: string[]) => void;
}) {
  const { state, dispatch } = useInbox();
  const { t } = useUiLocale();
  // Lazy initializer + one-shot clear, matching how `TicketDashboard` picks
  // up `channelFilterIntent`: a search handed over from another screen
  // applies on this mount and then behaves like ordinary local state.
  const [query, setQuery] = useState(() => state.searchIntent ?? "");

  useEffect(() => {
    dispatch({ type: "CLEAR_SEARCH_INTENT" });
  }, [state.searchIntent, dispatch]);
  const now = useNow();

  const inScope = state.conversations.filter((c) => {
    if (c.disruptionId) return false; // shown in the DisruptionCohort banner instead, not duplicated here
    if (!matchesView(c, view, now)) return false;
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    return true;
  });

  const visible = inScope.filter((c) => matchesQuery(c, query, now)).sort(queueSort);
  const searching = query.trim().length > 0;

  const visibleKey = visible.map((c) => c.id).join(",");
  useEffect(() => {
    onVisibleChange?.(visibleKey ? visibleKey.split(",") : []);
  }, [visibleKey, onVisibleChange]);

  return (
    <div className="flex w-full min-w-0 shrink-0 flex-col gap-4 rounded-lg bg-page p-2 lg:w-[340px] xl:w-[412px]">
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 rounded-full border border-line bg-footer px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="ticket-search"
            placeholder={t("Name, PNR, phone, payment ref…")}
            aria-describedby="ticket-search-hint"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink focus:outline-none"
          />
        </label>

        <p id="ticket-search-hint" className="px-1 text-[11px] leading-4 text-ink-dim">
          {searching ? (
            <span aria-live="polite">
              {visible.length} / {inScope.length} {t("in this view")}
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-1">
              {t("Narrow with")}
              {SEARCH_HINT.split(" ").map((prefix) => (
                <code
                  key={prefix}
                  className="rounded bg-footer px-1 py-0.5 font-[family-name:var(--font-inter)] text-[10px] text-ink"
                >
                  {prefix}
                </code>
              ))}
            </span>
          )}
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-line overflow-y-auto rounded-lg bg-footer">
        {visible.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-ink-dim">
            {searching ? `${t("Nothing matches")} “${query.trim()}”.` : t("No conversations match this filter.")}
          </li>
        )}
        {visible.map((c) => (
          <TicketRow
            key={c.id}
            convo={c}
            selected={c.id === state.selectedId}
            onSelect={() => {
              dispatch({ type: "SELECT", id: c.id });
              onOpen?.();
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function TicketRow({ convo, selected, onSelect }: { convo: Conversation; selected: boolean; onSelect: () => void }) {
  const { state, dispatch } = useInbox();
  const hasDraft = Boolean(state.drafts[convo.id]?.trim());
  const { t } = useUiLocale();
  const remaining = useCountdown(convo.status === "offered" ? convo.offerExpiresAt : undefined, () => dispatch({ type: "OFFER_TIMEOUT", id: convo.id }));
  const now = useNow();
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const sla = slaBadge(convo, now);
  // Every row carries status; priority only earns a place here when it is
  // urgent enough to change what an agent does next — P2/P3 is the common
  // case and a pill on every single row for it is noise, not signal.
  const elevatedPriority = convo.priority === "P0" || convo.priority === "P1";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors ${
          selected ? "border-coral bg-coral/10" : "border-transparent hover:bg-panel/40"
        }`}
      >
        <InitialsAvatar name={convo.customerName} size={44} className="self-start" />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold leading-[21px] text-ink">{convo.customerName}</span>

          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-[18px]">
            <span className="inline-flex items-center gap-1.5" style={{ color: STATUS_COLOR[convo.status] }}>
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[convo.status] }} />
              {t(STATUS_LABEL[convo.status])}
            </span>
            {elevatedPriority && (
              <span className="font-semibold" style={{ color: PRIORITY_COLOR[convo.priority] }}>
                · {convo.priority}
              </span>
            )}
            {hasDraft && (
              <span className="shrink-0 rounded-sm bg-amber/20 px-1 text-[10px] font-medium text-amber">
                Draft
              </span>
            )}
            {convo.pinned && (
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-coral" fill="currentColor" aria-label="Pinned by a supervisor" role="img">
                <path d="M14 2 9 7H5l4 4-5 9 9-5 4 4V15l5-5-8-3Z" />
              </svg>
            )}
          </span>

          <span className="truncate text-xs leading-[18px] text-ink-dim">
            {convo.pnr ? `PNR ${convo.pnr} · ` : `${convo.channel} · `}
            {convo.summary}
          </span>

          {(convo.status === "offered" || sla) && (
            <span className="flex items-center gap-2 text-[11px] font-medium">
              {convo.status === "offered" && (
                <span className="font-[family-name:var(--font-inter)] font-semibold tabular-nums text-coral">
                  {mm}:{ss}
                </span>
              )}
              {sla && (
                <span className="font-[family-name:var(--font-inter)] tabular-nums" style={{ color: sla.color }}>
                  {formatSlaBadge(sla, t)}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 self-start">
          <span className="text-xs text-ink-dim">{convo.updatedLabel}</span>
          {/* Dark on coral: white measured 2.99:1 on this badge (NFR-11). */}
          {convo.unread > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral text-xs font-semibold text-ink-invert">{convo.unread}</span>
          )}
        </div>
      </button>
    </li>
  );
}
