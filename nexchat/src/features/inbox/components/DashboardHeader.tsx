"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useInbox } from "./InboxContext";
import { DISRUPTION_SCENARIO_COUNT, type AgentState } from "./inboxEngine";
import { LocaleToggle, useUiLocale } from "../UiLocale";
import { ThemeToggle } from "../ThemeContext";
import NotificationsBell from "./NotificationsBell";
import { useTenantConfig } from "../admin/TenantConfigContext";
import type { ChannelId } from "../admin/tenantConfigEngine";
import type { ChannelFilter } from "./TicketFilterBar";

/**
 * Two colours per state: `color` is read on the dark menu, `pill` on the
 * white trigger. The single green that used to do both measured 2.36:1 on
 * white — the same hue simply cannot pass in both places (NFR-11).
 */
const AGENT_STATES: { id: AgentState; label: string; color: string; pill: string; receivesWork: string }[] = [
  { id: "available", label: "Available", color: "var(--color-ok-strong)", pill: "#0f7a2e", receivesWork: "Receives new work" },
  { id: "busy", label: "Busy", color: "var(--color-state-busy)", pill: "#8a6a00", receivesWork: "Receives work while capacity remains" },
  { id: "wrap_up", label: "Wrap-up", color: "var(--color-violet-strong)", pill: "#5b3fb0", receivesWork: "No new work — finishing notes" },
  { id: "away", label: "Away", color: "var(--color-ink-dim)", pill: "#595959", receivesWork: "No new work" },
  { id: "break", label: "On break", color: "var(--color-ink-dim)", pill: "#595959", receivesWork: "No new work" },
  { id: "training", label: "Training", color: "#2b7fff", pill: "#1b5fc4", receivesWork: "Approved queues only" },
  { id: "offline", label: "Offline", color: "var(--color-danger-strong)", pill: "#b32020", receivesWork: "No routing" },
];

/**
 * The channel filter used to be a row of text tabs above the ticket list.
 * Moved here as an icon nav so it reads as a workspace-wide filter (it also
 * narrows the supervisor's queue) rather than something scoped to the list
 * column, and so the list column itself stops competing with it for width.
 * Colours match the channel pill shown on each ticket and conversation
 * (`CHANNEL_COLOR` in `ChatPanel.tsx`) so the same channel reads the same
 * everywhere; "All" borrows the app's coral "active" accent instead, since
 * it has no channel colour of its own.
 */
const CHANNEL_NAV: { id: ChannelFilter; label: string; configId?: ChannelId; color: string; filled?: boolean; icon: React.ReactNode }[] = [
  {
    id: "all",
    label: "All Conversations",
    color: "var(--color-coral)",
    icon: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.35 0-2.62-.32-3.73-.9L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />,
  },
  {
    id: "Website",
    label: "Website",
    configId: "web",
    color: "var(--color-channel-web)",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9Z" />
      </>
    ),
  },
  {
    id: "WhatsApp",
    label: "WhatsApp",
    configId: "whatsapp",
    color: "var(--color-channel-whatsapp)",
    filled: true,
    icon: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A8 8 0 1 1 12 20Z" />,
  },
  {
    id: "Messenger",
    label: "Messenger",
    configId: "messenger",
    color: "var(--color-violet-strong)",
    filled: true,
    icon: <path d="M14 9h3V6h-3a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9Z" />,
  },
  {
    id: "Instagram",
    label: "Instagram",
    configId: "instagram",
    color: "var(--color-channel-instagram)",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: "Email",
    label: "Email",
    configId: "email",
    color: "var(--color-channel-email)",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
  },
];

export default function DashboardHeader({
  channelFilter,
  onChannelChange,
}: {
  channelFilter: ChannelFilter;
  onChannelChange: (f: ChannelFilter) => void;
}) {
  const { state, dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const { t } = useUiLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AGENT_STATES.find((s) => s.id === state.agentState)!;

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

  return (
    <header className="flex min-h-[48px] flex-wrap items-center justify-between gap-3 rounded-2xl bg-footer px-3 py-1.5 sm:px-4">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "linear-gradient(135deg,#de4559,#ff601c)" }}>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
            <path d="M3 12h4l2 3h6l2-3h4" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
            <rect x="3" y="6" width="18" height="13" rx="2" stroke="#ffffff" strokeWidth="1.6" />
          </svg>
        </span>
        <h1 className="text-base font-bold leading-6 text-ink">{t("Support Inbox")}</h1>
      </div>

      <nav aria-label={t("Filter by channel")} className="flex items-center gap-1">
        {CHANNEL_NAV.map((tab) => {
          const active = channelFilter === tab.id;
          const channelOff = tab.configId && !tenantState.published.brand.channels.find((c) => c.id === tab.configId)?.enabled;
          // "All" has no brand colour of its own, so it stays neutral until
          // selected. Website/WhatsApp/Messenger keep their colour even when
          // not the active filter — same reasoning as the always-coloured
          // `ChannelIcon`s in `DetailsPanel`: an icon that only reveals its
          // brand colour on selection is not recognisable at a glance, which
          // defeats the point of using icons here at all.
          const isBrand = tab.id !== "all";
          const iconStyle = channelOff
            ? undefined
            : active
              ? { background: `${tab.color}26`, color: tab.color, borderColor: tab.color }
              : isBrand
                ? { color: tab.color }
                : undefined;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChannelChange(tab.id)}
              disabled={channelOff}
              title={channelOff ? `${t(tab.label)} ${t("is disabled tenant-wide — see Settings")}` : t(tab.label)}
              aria-label={t(tab.label)}
              aria-current={active || undefined}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                channelOff
                  ? "cursor-not-allowed border-line text-ink-dim opacity-40"
                  : active
                    ? "border-transparent"
                    : `border-line hover:border-ink-dim ${isBrand ? "opacity-80 hover:opacity-100" : "text-ink-dim hover:text-ink"}`
              }`}
              style={iconStyle}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill={tab.filled ? "currentColor" : "none"}
                stroke={tab.filled ? "none" : "currentColor"}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {tab.icon}
              </svg>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <LocaleToggle />
        <button
          type="button"
          onClick={() => dispatch({ type: "SIMULATE_DISRUPTION" })}
          disabled={state.disruptions.length >= DISRUPTION_SCENARIO_COUNT}
          title={
            state.disruptions.length >= DISRUPTION_SCENARIO_COUNT
              ? "All scripted disruption scenarios are already open"
              : state.disruptions.length > 0
                ? "Open a second, concurrent disruption (demo)"
                : "Simulate a disruption (demo)"
          }
          aria-label={state.disruptions.length > 0 ? "Simulate another disruption" : t("Simulate disruption")}
          className="flex h-8 items-center gap-1.5 rounded-full border border-line px-2 text-[11px] font-medium text-ink-dim transition-colors hover:border-amber hover:text-amber disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-dim sm:px-2.5"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M10.3 3.9 2.3 18a1.5 1.5 0 0 0 1.3 2.2h16.8a1.5 1.5 0 0 0 1.3-2.2l-8-14.1a1.5 1.5 0 0 0-2.6 0ZM12 9v4m0 4h.01" />
          </svg>
          <span className="hidden sm:inline">{state.disruptions.length > 0 ? "Simulate another disruption" : t("Simulate disruption")}</span>
        </button>

        <ThemeToggle />

        <NotificationsBell />

        <div ref={ref} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            // Literally white in both themes, and the only place in the
            // workspace that is: `AGENT_STATES.pill` above is a set of
            // colours chosen to clear AA *on white*, so theming the pill
            // would break the dot and label riding on it. In light the
            // header behind it is white too, hence the hairline.
            className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 sm:px-3"
          >
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: current.pill }} />
            <span className="text-xs" style={{ color: current.pill }}>
              {t(current.label)}
            </span>
            <svg viewBox="0 0 24 24" className={`h-3 w-3 shrink-0 text-on-pill transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open && (
            <div role="menu" className="card-hairline absolute right-0 top-10 z-20 flex w-64 flex-col gap-0.5 rounded-lg bg-page p-1.5 shadow-pop">
              {AGENT_STATES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={state.agentState === s.id}
                  onClick={() => {
                    // Guarded (AG-11): falls straight through unless this
                    // agent still holds conversations and is stepping away.
                    dispatch({ type: "REQUEST_AGENT_STATE", state: s.id });
                    setOpen(false);
                  }}
                  className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-panel ${state.agentState === s.id ? "bg-panel" : ""}`}
                >
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {t(s.label)}
                  </span>
                  <span className="pl-4 text-[11px] text-ink-dim">{t(s.receivesWork)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Image src="/figma/ticket/agent.webp" alt="Your profile" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" />
      </div>
    </header>
  );
}
