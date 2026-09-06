"use client";

/**
 * The conversation pane: who this is, what state the conversation is in, and
 * the two regions that do the work.
 *
 * This file was 1,075 lines. It held three separable things — the transcript
 * and its row affordances, the composer and everything that writes into a
 * draft, and this shell arranging them — and the composer alone was 217
 * lines of JSX plus five pieces of state and four handlers that existed only
 * for it. The transcript is now `chat/Transcript.tsx`, the composer
 * `chat/Composer.tsx`, and what is left is the shell.
 *
 * The split follows where state lives, not where the lines happened to fall.
 * The composer's mode, popovers and textarea never belonged to this
 * component; it held them because they were in the same file.
 */

import { useEffect, useRef, useState } from "react";
import InitialsAvatar from "@/shared/ui/InitialsAvatar";
import { useInbox } from "../context/InboxContext";
import { useNow } from "../engine/useCountdown";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { maskPii, reopenWindowOpen, type Conversation } from "../engine/inboxEngine";
import Transcript from "../chat/Transcript";
import Composer from "../chat/Composer";
import type { ComposerHandle } from "../chat/composerHandle";

/* Shared with `DashboardHeader`'s channel filter by eye, not by import —
   see the note there. */
const CHANNEL_COLOR: Record<string, string> = {
  WhatsApp: "var(--color-channel-whatsapp)",
  Website: "var(--color-channel-web)",
  Messenger: "var(--color-violet-strong)",
  Instagram: "var(--color-channel-instagram)",
  Email: "var(--color-channel-email)",
};

function OptionsMenu({ convo }: { convo: Conversation }) {
  const { state: cfg } = useTenantConfig();
  const nowTs = useNow();
  const canReopen = reopenWindowOpen(convo, cfg.published.sla.reopenWindowHours, nowTs);
  const { dispatch } = useInbox();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const items = [
    { label: "Transfer…", action: () => dispatch({ type: "OPEN_TRANSFER", id: convo.id }), show: convo.status !== "resolved" },
    { label: "Resolve…", action: () => dispatch({ type: "OPEN_RESOLVE", id: convo.id }), show: convo.status === "assigned" },
    { label: "Snooze…", action: () => dispatch({ type: "OPEN_SNOOZE", id: convo.id }), show: convo.status === "assigned" },
    { label: "Release to AI", action: () => dispatch({ type: "RELEASE", id: convo.id }), show: convo.ownerLeaseActive },
    // AG-10: only inside the tenant's configured reopen window.
    { label: "Reopen", action: () => dispatch({ type: "REOPEN", id: convo.id }), show: canReopen },
  ].filter((i) => i.show);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Conversation options"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-panel text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="card-hairline absolute right-0 top-11 z-10 flex w-48 flex-col gap-0.5 rounded-lg bg-footer p-1.5 shadow-pop">
          {items.length === 0 && <span className="px-3 py-2 text-xs text-ink-dim">No actions available</span>}
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              className="rounded-md px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-panel"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({
  onBack,
  onShowDetails,
  composerRef,
}: {
  /** Below `lg` the list and the conversation share the screen; this returns
   *  to the list. Absent on wide layouts, where both are visible. */
  onBack?: () => void;
  /** Below `2xl` the details pane is an overlay rather than a third column. */
  onShowDetails?: () => void;
  /** Lets the keyboard shortcuts reach the composer, without lifting
   *  composer state out of the component that owns it. */
  composerRef?: React.RefObject<ComposerHandle | null>;
} = {}) {
  const { state, dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const { t } = useUiLocale();
  const aiDisabledTenantWide = tenantState.published.ai.killSwitch;
  const convo = state.conversations.find((c) => c.id === state.selectedId);

  /*
   * This pane's own handle on the composer. The AI draft card offers "edit",
   * which means put the draft in the composer and put the cursor in it — the
   * text goes through `SET_DRAFT` like any other edit, and only the focus
   * needs the composer itself. `focus` rather than `focusReply` on purpose:
   * taking the agent out of note mode because they clicked edit would be
   * deciding for them what that text is.
   */
  const composerHandle = useRef<ComposerHandle | null>(null);

  if (!convo) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center rounded-lg bg-page p-2 text-ink-dim">
        Select a conversation to view it here.
      </section>
    );
  }

  const owned = convo.status === "assigned";

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-lg bg-page p-2">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-footer px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t("Back to conversation list")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-panel lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}
          <InitialsAvatar name={convo.customerName} size={42} />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-medium leading-[22px] text-ink">{convo.customerName}</span>
              <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ background: `${CHANNEL_COLOR[convo.channel]}22`, color: CHANNEL_COLOR[convo.channel] }}>
                {convo.channel}
              </span>
            </div>
            {/* Masked like everywhere else (AG-06). The reveal control lives
                once, in `DetailsPanel` — a second one here would be a second
                place to keep the audit right. */}
            <span className="text-sm leading-[18px] text-ink-muted">{maskPii("phone", convo.phone)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onShowDetails && (
            <button
              type="button"
              onClick={onShowDetails}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral 2xl:hidden"
            >
              {t("Details")}
            </button>
          )}
          <OptionsMenu convo={convo} />
        </div>
      </div>

      {convo.presence && (
        <div className="flex items-center gap-2 rounded-lg border border-info-border-alt bg-info-bg-alt px-4 py-2 text-xs text-info-text-alt" role="status">
          <span aria-hidden className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-1 animate-pulse rounded-full bg-current"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          {convo.presence.person}{" "}
          {convo.presence.state === "typing"
            ? t("is typing on this conversation")
            : t("is viewing this conversation")}
        </div>
      )}

      {aiDisabledTenantWide && (
        <div className="flex items-center gap-2 rounded-lg border border-coral/50 bg-coral/10 px-4 py-2 text-xs text-coral">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M10.3 3.9 2.3 18a1.5 1.5 0 0 0 1.3 2.2h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-14.1a1.5 1.5 0 0 0-2.6 0ZM12 9v4m0 4h.01" />
          </svg>
          AI is disabled tenant-wide from Settings — drafting and automated replies are off everywhere.
        </div>
      )}

      {convo.ownerLeaseActive && (
        <div className="flex items-center gap-2 rounded-lg border border-ok-border-soft bg-ok-bg-soft px-4 py-2 text-xs text-ok-bright">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M9 12.5 11 14.5 15 9.5" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          {t("You're in control — AI is silent on this thread until you release it.")}
        </div>
      )}

      <Transcript
        convo={convo}
        onEditDraft={(text) => {
          dispatch({ type: "SET_DRAFT", id: convo.id, text });
          requestAnimationFrame(() => composerHandle.current?.focus());
        }}
      />

      <Composer convo={convo} owned={owned} handleRef={composerHandle} externalRef={composerRef} />
    </section>
  );
}
