"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useInbox } from "../dashboard/InboxContext";
import { useTenantConfig } from "./TenantConfigContext";
import { ALL_PEOPLE } from "@/lib/people";
import { useNow } from "../dashboard/useCountdown";
import type { Channel, Conversation, Priority } from "../dashboard/inboxEngine";

/**
 * SUP-02: "Filter every dashboard by tenant-authorised team, queue, agent,
 * channel, language, priority, intent, resolution and date."
 *
 * All of it is filterable now. Queue and agent were the two that used to be
 * missing, and they were missing for a real reason rather than an oversight:
 * conversations carried neither. Adding `queueId` and `assignee` for `RT-01`'s
 * routing is what made these two possible, which is why the three landed
 * together — one data-model extension, three requirements.
 *
 * "Team" and "queue" are the same axis here: the tenant defines two queues
 * (`queues.queues`) and a team is the set of agents who serve one, so
 * filtering by queue *is* filtering by team. A separate control would be two
 * names for one filter.
 */
export type SupervisorFilter = {
  queueId: string | "all";
  assignee: string | "all";
  channel: Channel | "all";
  priority: Priority | "all";
  language: string | "all";
  intent: string | "all";
  resolution: string | "all";
  /** Milliseconds of history to include, or null for all time. */
  windowMs: number | null;
};

const EMPTY: SupervisorFilter = {
  queueId: "all",
  assignee: "all",
  channel: "all",
  priority: "all",
  language: "all",
  intent: "all",
  resolution: "all",
  windowMs: null,
};

export function isFiltered(f: SupervisorFilter): boolean {
  return (
    f.queueId !== "all" ||
    f.assignee !== "all" ||
    f.channel !== "all" ||
    f.priority !== "all" ||
    f.language !== "all" ||
    f.intent !== "all" ||
    f.resolution !== "all" ||
    f.windowMs !== null
  );
}

export function matchesSupervisorFilter(
  c: Conversation,
  f: SupervisorFilter,
  now: number,
): boolean {
  if (f.queueId !== "all" && c.queueId !== f.queueId) return false;
  if (f.assignee !== "all") {
    // "unassigned" is the useful other half of an agent filter — the work
    // nobody owns is exactly what a supervisor is looking for.
    if (f.assignee === "unassigned" ? Boolean(c.assignee) : c.assignee !== f.assignee) return false;
  }
  if (f.channel !== "all" && c.channel !== f.channel) return false;
  if (f.priority !== "all" && c.priority !== f.priority) return false;
  if (f.language !== "all" && c.language !== f.language) return false;
  if (f.intent !== "all" && !c.intentTrail.some((i) => i.intent === f.intent)) return false;
  if (f.resolution !== "all" && c.resolution?.category !== f.resolution) return false;
  if (f.windowMs !== null && now - c.queuedSince > f.windowMs) return false;
  return true;
}

type Ctx = {
  filter: SupervisorFilter;
  setFilter: (f: SupervisorFilter) => void;
  /** Conversations passing the current filter, disruption rows excluded. */
  filtered: Conversation[];
};

const SupervisorFilterContext = createContext<Ctx | null>(null);

export function SupervisorFilterProvider({ children }: { children: ReactNode }) {
  const { state } = useInbox();
  const [filter, setFilter] = useState<SupervisorFilter>(EMPTY);
  // The date-range filter is relative ("last 24 hours"), so its cutoff has to
  // move with the clock rather than being sampled once during a render.
  const now = useNow();

  const filtered = useMemo(
    () =>
      state.conversations.filter(
        (c) => !c.disruptionId && matchesSupervisorFilter(c, filter, now),
      ),
    [state.conversations, filter, now],
  );

  return (
    <SupervisorFilterContext.Provider value={{ filter, setFilter, filtered }}>
      {children}
    </SupervisorFilterContext.Provider>
  );
}

export function useSupervisorFilter(): Ctx {
  const ctx = useContext(SupervisorFilterContext);
  if (!ctx) throw new Error("useSupervisorFilter must be used inside SupervisorFilterProvider");
  return ctx;
}

const WINDOWS: { label: string; ms: number | null }[] = [
  { label: "All time", ms: null },
  { label: "24 hours", ms: 24 * 60 * 60_000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60_000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60_000 },
];

export function SupervisorFilterBar() {
  const { state } = useInbox();
  const { state: tenant } = useTenantConfig();
  const { filter, setFilter, filtered } = useSupervisorFilter();

  // Options come from the data actually present, so the bar never offers a
  // value that would return nothing.
  const { languages, intents, resolutions } = useMemo(() => {
    const rows = state.conversations.filter((c) => !c.disruptionId);
    return {
      languages: [...new Set(rows.map((c) => c.language))].sort(),
      intents: [...new Set(rows.flatMap((c) => c.intentTrail.map((i) => i.intent)))].sort(),
      resolutions: [...new Set(rows.map((c) => c.resolution?.category).filter(Boolean) as string[])].sort(),
    };
  }, [state.conversations]);

  const total = state.conversations.filter((c) => !c.disruptionId).length;
  const active = isFiltered(filter);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-page p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      <Select
        label="Team / queue"
        value={
          filter.queueId === "all"
            ? "all"
            : tenant.published.queues.queues.find((q) => q.id === filter.queueId)?.name ?? "all"
        }
        options={["all", ...tenant.published.queues.queues.map((q) => q.name)]}
        onChange={(v) =>
          setFilter({
            ...filter,
            queueId: v === "all" ? "all" : tenant.published.queues.queues.find((q) => q.name === v)?.id ?? "all",
          })
        }
      />
      <Select
        label="Agent"
        value={filter.assignee}
        options={["all", "unassigned", ...ALL_PEOPLE]}
        onChange={(v) => setFilter({ ...filter, assignee: v })}
      />
      <Select
        label="Channel"
        value={filter.channel}
        options={["all", "WhatsApp", "Website", "Messenger", "Instagram", "Email"]}
        onChange={(v) => setFilter({ ...filter, channel: v as Channel | "all" })}
      />
      <Select
        label="Priority"
        value={filter.priority}
        options={["all", "P0", "P1", "P2", "P3"]}
        onChange={(v) => setFilter({ ...filter, priority: v as Priority | "all" })}
      />
      <Select
        label="Language"
        value={filter.language}
        options={["all", ...languages]}
        onChange={(v) => setFilter({ ...filter, language: v })}
      />
      <Select
        label="Intent"
        value={filter.intent}
        options={["all", ...intents]}
        onChange={(v) => setFilter({ ...filter, intent: v })}
      />
      <Select
        label="Resolution"
        value={filter.resolution}
        options={["all", ...resolutions]}
        onChange={(v) => setFilter({ ...filter, resolution: v })}
      />
      <Select
        label="Date range"
        value={WINDOWS.find((w) => w.ms === filter.windowMs)?.label ?? "All time"}
        options={WINDOWS.map((w) => w.label)}
        onChange={(v) => setFilter({ ...filter, windowMs: WINDOWS.find((w) => w.label === v)?.ms ?? null })}
      />

      </div>

      <div className="flex items-center justify-end gap-3">
        <span aria-live="polite" className="text-sm text-ink-dim">
          {active ? `${filtered.length} of ${total} conversations` : `${total} conversations`}
        </span>
        <button
          type="button"
          onClick={() => setFilter(EMPTY)}
          disabled={!active}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const id = `supervisor-filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5 text-xs text-ink-dim">
      {label}
      {/* `w-full` inside a grid cell: a native select otherwise sizes to its
          longest option, which made eight filters eight different widths. */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full min-w-0 rounded-lg border border-line bg-footer px-2 text-sm text-ink focus:border-coral focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "All" : o}
          </option>
        ))}
      </select>
    </label>
  );
}
