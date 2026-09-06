"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, PageHead, Panel, Pill, Table, Td, type HeadCell, type PillTone } from "./mockup/Primitives";
import { useTenantConfig } from "./TenantConfigContext";
import { confidenceBand, CONFIDENCE_BAND_LABEL } from "./tenantConfigEngine";
import { useInbox } from "../dashboard/InboxContext";
import { useNow } from "../dashboard/useCountdown";
import {
  BREACH_FORECAST_MS,
  INBOX_VIEWS,
  maskPii,
  matchesView,
  queueSort,
  slaBadge,
  type Channel,
  type Conversation,
  type ConvoStatus,
  type InboxView,
  type Priority,
} from "../dashboard/inboxEngine";

/**
 * `#ticketsView` from `Design/preview (2).html`, over live state.
 *
 * The layout is the mockup's, section for section: the saved-view tabs, the
 * filter card, the five-KPI strip, the selection bar, the eleven-column
 * table, and the footer with its result count and pagination. What sits
 * behind it is not the mockup's ten drawn rows but `InboxProvider` — the same
 * conversations `/inbox` is working.
 *
 * That makes this the second page of its kind, and it follows the rule
 * `/admin` already established (IMPLEMENTATION-GUIDE §3): bound when there is
 * real state behind the control, an honest value when there is not, and never
 * a control that looks live and discards what you do with it. Where the
 * drawing shows something this codebase cannot answer, the slot says what it
 * can answer instead rather than repeating the mockup's figure:
 *
 *  - "10,964 conversations · 30 days" becomes the real count, which is small.
 *  - The mockup's "AI active" KPI has no live equivalent — the lifecycle here
 *    has no bot-owned state — so that slot reports Resolved and says so.
 *  - "Save current view" is gone. Nothing persists a view, and a button that
 *    silently does nothing is worse than its absence. "Export tickets" stays,
 *    because that dialog is real.
 *  - The bulk "Add tag" is gone for the same reason: tagging needs a value
 *    and there is no dialog here to collect one.
 *
 * Two deliberate departures. There is no search field — `AdminHeader` already
 * carries one on every supervisor page, over the same grammar. And the
 * sortable headers are kept from this page's previous version: the mockup
 * filters but never sorts, and dropping a working capability to match a
 * static picture would be a downgrade.
 */
export default function TicketsPage() {
  const { state, dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const router = useRouter();
  const now = useNow();

  const [view, setView] = useState<InboxView>("all");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const queues = tenantState.published.queues.queues;
  const queueName = (id: string) => queues.find((q) => q.id === id)?.name ?? id;
  const bands = tenantState.published.ai.confidence;

  const filtered = useMemo(
    () => state.conversations.filter((c) => matchesView(c, view, now) && matchesFilters(c, filters, now)),
    [state.conversations, view, filters, now],
  );

  const rows = useMemo(() => {
    if (!sort) return [...filtered].sort(queueSort);
    return [...filtered].sort((a, b) => dir * SORTS[sort](a, b));
  }, [filtered, sort, dir]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const shown = rows.slice((current - 1) * pageSize, current * pageSize);
  const summary = useMemo(() => summarise(filtered, now), [filtered, now]);
  const dirty = view !== "all" || Object.values(filters).some((v) => v !== "all");
  const allOnPageSelected = shown.length > 0 && shown.every((c) => selected.includes(c.id));

  function reset() {
    setView("all");
    setFilters(EMPTY_FILTERS);
    setSelected([]);
    setPage(1);
  }

  function setFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    if (sort !== key) {
      setSort(key);
      setDir(1);
      return;
    }
    // Third click returns to queue order rather than trapping the reader in a
    // two-state toggle they cannot leave.
    if (dir === 1) setDir(-1);
    else {
      setSort(null);
      setDir(1);
    }
  }

  function toggleAllOnPage() {
    const ids = shown.map((c) => c.id);
    setSelected((s) => (allOnPageSelected ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
  }

  return (
    <>
      <PageHead
        eyebrow="Agent workspace"
        title="Tickets and conversations"
        description="A role-scoped record of every customer conversation across AI, queues, and human ownership, with lifecycle, SLA, booking context, and the latest activity visible in one place."
        actions={
          <>
            <Pill tone="gray">{tenantState.published.brand.brandName}</Pill>
            <Pill tone="green">
              {state.conversations.length} conversation{state.conversations.length === 1 ? "" : "s"} · live
            </Pill>
            <Btn modal="export" subject="Ticket list">
              Export tickets
            </Btn>
          </>
        }
      />

      {/* Saved views. The mockup hand-writes seven tabs; these are
          `INBOX_VIEWS` — the same views `/inbox` filters by — and every count
          is live, so a tab reading 0 means there is nothing in it. */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex flex-1 gap-1.5 overflow-x-auto p-0.5" role="group" aria-label="Saved ticket views">
          {INBOX_VIEWS.map((v) => {
            const n = state.conversations.filter((c) => matchesView(c, v.id, now)).length;
            const active = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setView(v.id);
                  setPage(1);
                }}
                className={`h-[34px] shrink-0 whitespace-nowrap rounded-lg border px-2.5 text-[10px] font-bold transition-colors ${
                  active
                    ? "border-coral bg-coral/10 text-coral-text"
                    : "border-line bg-card text-ink-muted hover:border-line-strong hover:bg-raised"
                }`}
              >
                {v.label} · {n}
              </button>
            );
          })}
        </div>
        <Btn onClick={reset} disabled={!dirty} title={dirty ? undefined : "No view or filter is narrowing the list"}>
          Clear filters
        </Btn>
      </div>

      {/* Every select is bound. The mockup's Search is deliberately absent
          (see the header comment) and its Date range becomes an age bound,
          which is the question `queuedSince` can actually answer. */}
      <div className="flex shrink-0 flex-wrap items-stretch gap-2.5 rounded-xl border border-line bg-footer p-3 shadow-card">
        <FilterSelect
          label="Lifecycle"
          value={filters.status}
          onChange={(v) => setFilter("status", v)}
          options={[["all", "All states"], ...STATUSES.map((s) => [s, STATUS_LABEL[s]] as Opt)]}
        />
        <FilterSelect
          label="Channel"
          value={filters.channel}
          onChange={(v) => setFilter("channel", v)}
          options={[["all", "All channels"], ...CHANNELS.map((c) => [c, c] as Opt)]}
        />
        <FilterSelect
          label="Queue"
          value={filters.queue}
          onChange={(v) => setFilter("queue", v)}
          options={[["all", "All queues"], ...queues.map((q) => [q.id, q.name] as Opt)]}
        />
        <FilterSelect
          label="Owner"
          value={filters.owner}
          onChange={(v) => setFilter("owner", v)}
          options={[
            ["all", "Any owner"],
            ["unassigned", "Unassigned"],
            ...[...new Set(state.conversations.map((c) => c.assignee).filter((a): a is string => Boolean(a)))].map(
              (a) => [a, a] as Opt,
            ),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={filters.priority}
          onChange={(v) => setFilter("priority", v)}
          options={[["all", "All priorities"], ...PRIORITIES.map((p) => [p, `${p} ${PRIORITY_WORD[p]}`] as Opt)]}
        />
        <FilterSelect
          label="SLA"
          value={filters.sla}
          onChange={(v) => setFilter("sla", v)}
          options={[
            ["all", "Any SLA state"],
            ["breached", "Breached"],
            ["risk", "At risk"],
            ["healthy", "Healthy"],
            ["paused", "Paused"],
            ["complete", "Complete"],
          ]}
        />
        <FilterSelect
          label="Language"
          value={filters.language}
          onChange={(v) => setFilter("language", v)}
          options={[["all", "All languages"], ...[...new Set(state.conversations.map((c) => c.language))].map((l) => [l, l] as Opt)]}
        />
        <FilterSelect
          label="Queued within"
          value={filters.age}
          onChange={(v) => setFilter("age", v)}
          options={[["all", "Any age"], ["1h", "Last hour"], ["24h", "Last 24 hours"], ["7d", "Last 7 days"]]}
        />
      </div>

      <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Open conversations" value={summary.open} delta="Live" tone="green" note="Across AI, queue, and human ownership" />
        <KpiCard label="Waiting for human" value={summary.waiting} delta={`${summary.offered} offered`} tone="amber" note="Original SLA age preserved" />
        <KpiCard label="Human owned" value={summary.owned} delta={pct(summary.owned, summary.open)} tone="green" note="Assigned to an agent" />
        <KpiCard
          label="SLA risk"
          value={summary.atRisk}
          delta={`${summary.breached} breached`}
          tone={summary.breached > 0 ? "red" : "gray"}
          note={`Breached, or due within ${Math.round(BREACH_FORECAST_MS / 60_000)} min`}
        />
        {/* The mockup's fifth card is "AI active". There is no bot-owned
            lifecycle state here to count, so the slot reports what state does
            have, and its note says why it is not the mockup's figure. */}
        <KpiCard
          label="Resolved"
          value={summary.resolved}
          delta={pct(summary.resolved, filtered.length)}
          tone="gray"
          note="No live equivalent for the mockup's AI-active count"
        />
      </div>

      {selected.length > 0 && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 rounded-[10px] border border-coral/40 bg-coral/10 px-3 py-2.5 text-[10px]"
          aria-live="polite"
        >
          <b className="text-ink">
            {selected.length} ticket{selected.length === 1 ? "" : "s"} selected
          </b>
          <span className="text-ink-dim">Actions remain permission-checked and audited.</span>
          <span className="hidden flex-1 sm:block" />
          <Btn modal="export" subject={`Ticket list · ${selected.length} selected`}>
            Export selection
          </Btn>
          <Btn onClick={() => setSelected([])}>Clear</Btn>
        </div>
      )}

      <Panel
        title="All conversations"
        hint="Newest customer activity first · tenant and role permissions applied"
        action={<Pill tone="green">Live from inbox state</Pill>}
        bodyClass="p-0"
      >
        {rows.length === 0 ? (
          <div className="px-11 py-11 text-center text-[11px] text-ink-dim">
            <b className="text-ink">No tickets match these filters.</b>
            <p className="mt-1">Change a filter or clear the current saved view.</p>
            <div className="mt-3 flex justify-center">
              <Btn onClick={reset}>Clear filters</Btn>
            </div>
          </div>
        ) : (
          <>
            <Table head={heads(sort, dir, toggleSort, allOnPageSelected, toggleAllOnPage)} minWidth={1480}>
              {shown.map((c) => {
                const sla = slaBadge(c, now);
                const conf = c.intentTrail[0]?.confidence;
                const preview = [...c.transcript].reverse().find((m) => m.from === "customer" || m.from === "bot");
                return (
                  <tr key={c.id} className={selected.includes(c.id) ? "bg-raised" : undefined}>
                    <Td>
                      <input
                        type="checkbox"
                        aria-label={`Select ticket ${c.id}`}
                        checked={selected.includes(c.id)}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                        className="h-[15px] w-[15px] accent-[var(--color-coral)]"
                      />
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: "SELECT", id: c.id });
                          router.push("/inbox");
                        }}
                        className="text-left font-extrabold text-info-text-alt hover:underline"
                      >
                        {c.id.toUpperCase()}
                      </button>
                      <span className="mt-0.5 block text-[10px] text-ink-dim">{age(c.queuedSince, now)} old</span>
                    </Td>
                    <Td>
                      <b className="block text-[11px] text-ink">{c.customerName}</b>
                      <small className="mt-0.5 block leading-[1.45] text-ink-dim">
                        {IDENTITY_LABEL[c.identityStatus]} · {maskPii("phone", c.phone)}
                      </small>
                    </Td>
                    <Td>
                      <div className="max-w-[280px]">
                        <b className="block truncate text-[11px] text-ink">{c.summary || c.escalationReason || "—"}</b>
                        {preview && <p className="mt-0.5 line-clamp-2 leading-[1.45] text-ink-dim">{preview.text}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {c.escalationReason && <Pill tone="red">{c.escalationReason}</Pill>}
                          {c.pnr && <Pill tone="gray">PNR {c.pnr}</Pill>}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={c.channel} />
                        <span>{c.channel}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="grid gap-1">
                        <Pill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Pill>
                        <small className="text-ink-dim">{OWNERSHIP[c.status]}</small>
                      </div>
                    </Td>
                    <Td>
                      <div className="grid gap-1">
                        <Pill tone={PRIORITY_TONE[c.priority]}>{c.priority}</Pill>
                        {sla ? (
                          <span className="font-extrabold tabular-nums" style={{ color: sla.color }}>
                            {sla.kind === "breached" ? "over " : ""}
                            {sla.amount}
                            {sla.unit}
                          </span>
                        ) : (
                          <small className="text-ink-dim">{SLA_REST_LABEL[c.status]}</small>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <b className="block text-[11px] text-ink">{queueName(c.queueId)}</b>
                      <small className="mt-0.5 block text-ink-dim">{c.assignee ?? "Unassigned"}</small>
                    </Td>
                    <Td>
                      {conf === undefined ? (
                        <small className="text-ink-dim">No AI turn</small>
                      ) : (
                        <>
                          <b className="block text-[11px] text-ink">
                            {conf.toFixed(2)} · {CONFIDENCE_BAND_LABEL[confidenceBand(conf, bands)]}
                          </b>
                          <small className="mt-0.5 block text-ink-dim">{c.intentTrail[0]?.intent}</small>
                        </>
                      )}
                    </Td>
                    <Td>{c.language}</Td>
                    <Td>
                      <b className="block text-[11px] text-ink">{c.updatedLabel}</b>
                      {c.unread > 0 && <small className="mt-0.5 block text-ink-dim">{c.unread} unread</small>}
                    </Td>
                  </tr>
                );
              })}
            </Table>

            <footer className="flex min-h-[58px] flex-wrap items-center gap-3 border-t border-line px-3.5 py-3 text-[10px] text-ink-dim">
              <span aria-live="polite">
                Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, rows.length)} of {rows.length}{" "}
                conversation{rows.length === 1 ? "" : "s"}
              </span>
              <span aria-hidden>·</span>
              <span>Recomputed from inbox state as it changes</span>
              <span className="hidden flex-1 sm:block" />
              <label htmlFor="ticket-page-size">Rows</label>
              <select
                id="ticket-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-line bg-page px-2 text-[11px] text-ink focus:border-coral focus:outline-none"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Ticket pagination">
                <PageBtn label="‹" ariaLabel="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)} />
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <PageBtn key={n} label={String(n)} active={n === current} onClick={() => setPage(n)} />
                ))}
                <PageBtn label="›" ariaLabel="Next page" disabled={current === pageCount} onClick={() => setPage(current + 1)} />
              </nav>
            </footer>
          </>
        )}
      </Panel>
    </>
  );
}

/* --- Pieces ------------------------------------------------------------- */

type Opt = [value: string, label: string];

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  const id = `ticket-filter-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="min-w-[138px] flex-1">
      <label htmlFor={id} className="mb-1 ml-0.5 block text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-dim">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[34px] w-full rounded-lg border border-line bg-page px-2.5 text-xs text-ink focus:border-coral focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The mockup's five-card strip, at the size this page needs. */
function KpiCard({
  label,
  value,
  delta,
  tone,
  note,
}: {
  label: string;
  value: number;
  delta: string;
  tone: PillTone;
  note: string;
}) {
  return (
    <article className="flex flex-col gap-1.5 rounded-xl border border-line bg-footer p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase leading-[1.35] tracking-[0.06em] text-ink-dim">{label}</span>
        <Pill tone={tone}>{delta}</Pill>
      </div>
      <span className="font-[family-name:var(--font-inter)] text-[24px] font-bold leading-none tracking-[-0.04em] text-ink">
        {value}
      </span>
      <span className="text-[10px] leading-snug text-ink-dim">{note}</span>
    </article>
  );
}

/*
 * The mockup paints a solid square per channel with white letters on it.
 * nexchat's channel hues are the app's own — the same ones `ChatPanel`'s
 * header uses — and neither arrangement survives a contrast check at this
 * size: white on `--color-channel-whatsapp` fails in dark, and the hue as
 * 8px letters over a tint of itself measured 3.76:1 for Website against the
 * 4.5:1 floor.
 *
 * So the hue stays as the identity, in the tint, and the code is drawn in
 * ink. Nothing is lost by that: the channel's name is rendered immediately
 * beside the badge, so the square was never the only thing naming it — which
 * is also why it is `aria-hidden`.
 */
const CHANNEL_CODE: Record<Channel, string> = { WhatsApp: "WA", Website: "WEB", Messenger: "M", Instagram: "IG", Email: "EM" };
const CHANNEL_HUE: Record<Channel, string> = {
  WhatsApp: "var(--color-channel-whatsapp)",
  Website: "var(--color-channel-web)",
  Messenger: "var(--color-violet-strong)",
  Instagram: "var(--color-channel-instagram)",
  Email: "var(--color-channel-email)",
};

function ChannelBadge({ channel }: { channel: Channel }) {
  const hue = CHANNEL_HUE[channel];
  return (
    <span
      aria-hidden
      className="grid h-5 w-[26px] shrink-0 place-items-center rounded-md text-[8px] font-extrabold"
      style={{ background: `color-mix(in srgb, ${hue} 38%, transparent)`, color: "var(--color-ink)" }}
    >
      {CHANNEL_CODE[channel]}
    </span>
  );
}

function PageBtn({
  label,
  ariaLabel,
  active,
  disabled,
  onClick,
}: {
  label: string;
  ariaLabel?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 min-w-8 rounded-[7px] border px-1.5 text-[10px] transition-colors disabled:opacity-40 ${
        active ? "border-coral bg-coral/15 font-bold text-coral-text" : "border-line bg-card text-ink hover:bg-raised"
      }`}
    >
      {label}
    </button>
  );
}

function heads(
  sort: SortKey | null,
  dir: 1 | -1,
  toggle: (k: SortKey) => void,
  allSelected: boolean,
  onToggleAll: () => void,
): (string | HeadCell)[] {
  const cell = (label: string, key: SortKey): HeadCell => ({
    label,
    onSort: () => toggle(key),
    sort: sort === key ? (dir === 1 ? "ascending" : "descending") : "none",
  });
  return [
    { label: allSelected ? "Deselect page" : "Select page", onSort: onToggleAll },
    cell("Ticket", "id"),
    cell("Customer", "customer"),
    "Conversation",
    cell("Channel", "channel"),
    cell("Lifecycle", "status"),
    cell("Priority / SLA", "priority"),
    cell("Queue / owner", "owner"),
    "AI decision",
    cell("Language", "language"),
    cell("Last activity", "updated"),
  ];
}

/* --- Filtering ---------------------------------------------------------- */

type Filters = {
  status: string;
  channel: string;
  queue: string;
  owner: string;
  priority: string;
  sla: string;
  language: string;
  age: string;
};
const EMPTY_FILTERS: Filters = {
  status: "all",
  channel: "all",
  queue: "all",
  owner: "all",
  priority: "all",
  sla: "all",
  language: "all",
  age: "all",
};

const AGE_MS: Record<string, number> = { "1h": 3_600_000, "24h": 86_400_000, "7d": 7 * 86_400_000 };

/**
 * The SLA states the mockup's filter names, derived rather than stored — and
 * agreeing with `slaBadge`, which reports a clock only for work still
 * waiting to be picked up. Once an agent holds it the pickup SLA has been
 * met, so "paused" is the honest answer rather than a countdown that would
 * keep running against a target already satisfied.
 */
function slaState(c: Conversation, now: number): "breached" | "risk" | "healthy" | "paused" | "complete" {
  if (c.status === "resolved") return "complete";
  if (c.status === "assigned" || c.status === "snoozed") return "paused";
  if (c.slaDeadline <= now) return "breached";
  return c.slaDeadline - now <= BREACH_FORECAST_MS ? "risk" : "healthy";
}

function matchesFilters(c: Conversation, f: Filters, now: number): boolean {
  if (f.status !== "all" && c.status !== f.status) return false;
  if (f.channel !== "all" && c.channel !== f.channel) return false;
  if (f.queue !== "all" && c.queueId !== f.queue) return false;
  if (f.owner === "unassigned" && c.assignee) return false;
  if (f.owner !== "all" && f.owner !== "unassigned" && c.assignee !== f.owner) return false;
  if (f.priority !== "all" && c.priority !== f.priority) return false;
  if (f.sla !== "all" && slaState(c, now) !== f.sla) return false;
  if (f.language !== "all" && c.language !== f.language) return false;
  if (f.age !== "all" && now - c.queuedSince > (AGE_MS[f.age] ?? Infinity)) return false;
  return true;
}

/* --- Sorting ------------------------------------------------------------ */

type SortKey = "id" | "customer" | "channel" | "status" | "priority" | "owner" | "language" | "updated";

const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const STATUS_RANK: Record<ConvoStatus, number> = { offered: 0, queued: 1, assigned: 2, snoozed: 3, resolved: 4 };

const SORTS: Record<SortKey, (a: Conversation, b: Conversation) => number> = {
  id: (a, b) => a.id.localeCompare(b.id),
  customer: (a, b) => a.customerName.localeCompare(b.customerName),
  channel: (a, b) => a.channel.localeCompare(b.channel),
  status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  // Unassigned last when ascending: an empty owner is not a name at the top
  // of the alphabet.
  owner: (a, b) => (a.assignee ?? "\uffff").localeCompare(b.assignee ?? "\uffff"),
  language: (a, b) => a.language.localeCompare(b.language),
  updated: (a, b) => b.queuedSince - a.queuedSince,
};

/* --- Labels and summary ------------------------------------------------- */

const STATUSES: ConvoStatus[] = ["offered", "queued", "assigned", "snoozed", "resolved"];
const CHANNELS: Channel[] = ["WhatsApp", "Website", "Messenger", "Instagram", "Email"];
const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

const STATUS_LABEL: Record<ConvoStatus, string> = {
  offered: "Offered",
  queued: "Queued",
  assigned: "Assigned",
  snoozed: "Snoozed",
  resolved: "Resolved",
};
const STATUS_TONE: Record<ConvoStatus, PillTone> = {
  offered: "violet",
  queued: "amber",
  assigned: "green",
  snoozed: "steel",
  resolved: "gray",
};
/** The mockup's second line under each lifecycle pill: who holds it. */
const OWNERSHIP: Record<ConvoStatus, string> = {
  offered: "Waiting human",
  queued: "Waiting human",
  assigned: "Human owned",
  snoozed: "Human owned",
  resolved: "Closed out",
};
const PRIORITY_TONE: Record<Priority, PillTone> = { P0: "red", P1: "amber", P2: "steel", P3: "gray" };
const PRIORITY_WORD: Record<Priority, string> = { P0: "critical", P1: "urgent", P2: "standard", P3: "deferred" };
const IDENTITY_LABEL: Record<Conversation["identityStatus"], string> = {
  unverified: "Unverified",
  pending: "Verification pending",
  verified: "Identity verified",
  mismatch: "Identity mismatch",
};

/** What the SLA cell says when `slaBadge` reports no clock. */
const SLA_REST_LABEL: Record<ConvoStatus, string> = {
  queued: "—",
  offered: "—",
  assigned: "Picked up",
  snoozed: "Paused",
  resolved: "Complete",
};

const pct = (n: number, of: number) => (of === 0 ? "0%" : `${Math.round((n / of) * 100)}%`);

function age(from: number, now: number): string {
  const mins = Math.max(0, Math.round((now - from) / 60_000));
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function summarise(rows: Conversation[], now: number) {
  const open = rows.filter((c) => c.status === "queued" || c.status === "offered" || c.status === "assigned");
  // `waiting`, not `open`, for the SLA figures — the same choice
  // `queueSnapshot` makes. The pickup target is met the moment an agent
  // takes the conversation, so counting assigned work against it would
  // report a breach that has already been answered.
  const waiting = rows.filter((c) => c.status === "queued" || c.status === "offered");
  return {
    open: open.length,
    waiting: waiting.length,
    offered: rows.filter((c) => c.status === "offered").length,
    owned: rows.filter((c) => c.status === "assigned").length,
    atRisk: waiting.filter((c) => c.slaDeadline - now <= BREACH_FORECAST_MS).length,
    breached: waiting.filter((c) => c.slaDeadline <= now).length,
    resolved: rows.filter((c) => c.status === "resolved").length,
  };
}
