"use client";

import type { ReactNode } from "react";

/**
 * The second half of the `#adminView` port. `AdminShapes.tsx` holds the shapes
 * the seven-tab console already used — cards, setting lists, the policy band,
 * the kill-switch bar, rule lists and the role matrix. This file holds
 * everything `preview (3).html` adds around them: the tenant scope bar, the
 * per-pane section notes, the KPI strip, the two-column `admin-layout`, the
 * readiness checklists, the release timeline, the approval list, the card
 * metrics, the config-table cells, the customer-facing brand preview, the
 * danger zone, and the change-request shapes.
 *
 * Same rule as the other file: presentation only. Every one of these takes its
 * content from `TenantAdminConsole`, which reads the real tenant config
 * wherever a value exists and falls back to the mockup's own copy only where
 * this app models nothing.
 */

type Tone = "green" | "amber" | "red" | "steel" | "violet" | "gray";

const TONE_TEXT: Record<Tone, string> = {
  green: "text-ok-text",
  amber: "text-warn-text",
  red: "text-danger-text",
  steel: "text-info-text",
  violet: "text-violet-text",
  gray: "text-ink-dim",
};

const TONE_BG: Record<Tone, string> = {
  green: "bg-ok-bg",
  amber: "bg-warn-bg",
  red: "bg-danger-bg",
  steel: "bg-info-bg",
  violet: "bg-violet-bg",
  gray: "bg-panel",
};

const TONE_BORDER: Record<Tone, string> = {
  green: "border-ok-border",
  amber: "border-warn-border",
  red: "border-danger-border",
  steel: "border-info-border",
  violet: "border-violet-border",
  gray: "border-line",
};

const TONE_FILL: Record<Tone, string> = {
  green: "bg-ok-fill",
  amber: "bg-warn-fill",
  red: "bg-danger-fill",
  steel: "bg-info-fill",
  violet: "bg-violet-fill",
  gray: "bg-line-strong",
};

/**
 * `.admin-section-note` — the tinted strip each pane opens with, stating the
 * rule that governs everything below it. `action` is the pane's primary
 * control, which the mockup parks on the right-hand end of the same strip.
 */
export function SectionNote({
  tone = "steel",
  label,
  children,
  action,
}: {
  tone?: "steel" | "amber" | "red";
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-2.5 rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${TONE_BORDER[tone]} ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}
    >
      <strong className="whitespace-nowrap font-bold">{label}</strong>
      <span className="min-w-[240px] flex-1">{children}</span>
      {action}
    </div>
  );
}

/**
 * `.tenant-mark` — the tenant's square monogram.
 *
 * `ok-text` rather than `ok-fill` for the tile: paired with `ink-invert` it is
 * a deep green under white in the light theme and a bright green under
 * near-black in the dark one. `ok-fill` is the same mid-green in both, so the
 * light theme measured 2.28:1 — caught by the theme-light contrast sweep.
 */
export function TenantMark({ initials, size = 36 }: { initials: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[11px] bg-ok-text font-extrabold text-ink-invert"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {initials}
    </span>
  );
}

/**
 * `.integration-icon` in the mockup's letter form (`P0`, `INV`, `TKT`). The
 * channel cards keep the real marks `IntegrationIcon` already draws; this is
 * for the rows and cards that have no glyph to draw.
 */
export function Monogram({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  return (
    <span
      aria-hidden
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[10px] font-extrabold ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}
    >
      {label}
    </span>
  );
}

/**
 * `.admin-scope-bar` — which tenant, which environment, which data region and
 * how much of the admin session is left, above the tabs. It answers "am I
 * about to change production, and whose?", so it is never collapsed away: on
 * a narrow screen the stats wrap instead of disappearing.
 */
export function ScopeBar({
  initials,
  name,
  sub,
  stats,
  status,
}: {
  initials: string;
  name: string;
  sub: string;
  stats: { label: string; value: ReactNode }[];
  status?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3.5 rounded-xl border border-line border-l-4 border-l-ok-fill bg-footer px-3.5 py-3 shadow-card">
      <div className="flex min-w-[220px] items-center gap-2.5">
        <TenantMark initials={initials} />
        <div className="min-w-0">
          <b className="block text-[12px] font-bold text-ink">{name}</b>
          <small className="mt-0.5 block text-[10px] text-ink-dim">{sub}</small>
        </div>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2.5">
        {stats.map((s) => (
          <div key={s.label} className="border-line pl-0 sm:border-l sm:pl-3.5">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-dim">{s.label}</span>
            <b className="mt-0.5 block text-[10px] font-semibold text-ink">{s.value}</b>
          </div>
        ))}
      </div>
      {status}
    </div>
  );
}

/** `.admin-kpis` — the four-across strip a pane opens with. */
export function AdminKpis({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

/** `.admin-kpi` — label and state pill, one big figure, one line of context. */
export function AdminKpi({
  label,
  pill,
  value,
  note,
}: {
  label: string;
  pill?: ReactNode;
  value: string;
  note: string;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-line bg-footer p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-ink-dim">{label}</span>
        {pill}
      </div>
      <strong className="mt-2.5 block font-[family-name:var(--font-inter)] text-[24px] font-bold leading-none tracking-[-0.035em] text-ink">
        {value}
      </strong>
      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-dim">{note}</p>
    </article>
  );
}

/** `.admin-layout` — wide main column, narrow aside. */
export function AdminLayout({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <div className="flex min-w-0 flex-col gap-4">{main}</div>
      <aside className="flex min-w-0 flex-col gap-4">{aside}</aside>
    </div>
  );
}

/** `.admin-panel-grid` — two equal panels side by side. */
export function AdminPanelGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">{children}</div>;
}

/** `.admin-checklist` — the readiness / rule list inside a panel. */
export function Checklist({ children }: { children: ReactNode }) {
  return <div className="flex flex-col px-4 pb-3 pt-1">{children}</div>;
}

/**
 * `.admin-check`. The mockup's icon is a bare glyph. Here it also carries a
 * word, because the tick and the exclamation mark are the only thing
 * separating a cleared control from a blocking one, and a glyph is not a
 * status a screen reader can announce.
 */
export function Check({
  tone = "green",
  glyph,
  state,
  title,
  detail,
  trailing,
}: {
  tone?: "green" | "amber" | "red" | "gray";
  /** Defaults to a tick for green, "!" otherwise; the release ladder passes a step number. */
  glyph?: string;
  /** What the icon means, for assistive tech. */
  state?: string;
  title: string;
  detail: string;
  trailing?: ReactNode;
}) {
  const mark = glyph ?? (tone === "green" ? "✓" : "!");
  const label =
    state ?? (tone === "green" ? "Clear" : tone === "amber" ? "Needs attention" : tone === "red" ? "Blocking" : "Pending");
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-line py-2.5 last:border-0">
      <span
        role="img"
        aria-label={label}
        className={`grid h-[22px] w-[22px] place-items-center rounded-full text-[10px] font-black ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}
      >
        {mark}
      </span>
      <div className="min-w-0">
        <b className="block text-[11px] font-bold text-ink">{title}</b>
        <small className="mt-0.5 block text-[10px] leading-relaxed text-ink-dim">{detail}</small>
      </div>
      {trailing}
    </div>
  );
}

/** `.admin-timeline` — scheduled and recent releases. */
export function Timeline({
  items,
}: {
  items: { time: string; sub: string; tone?: Tone; title: string; detail: string }[];
}) {
  return (
    <div className="flex flex-col px-4 pb-3 pt-1">
      {items.map((i, n) => (
        <div key={i.title} className="grid grid-cols-[62px_9px_minmax(0,1fr)] gap-2.5 pt-2.5">
          <time className="text-[9px] leading-tight text-ink-dim">
            {i.time}
            <br />
            {i.sub}
          </time>
          <span aria-hidden className="relative mt-1">
            <span className={`block h-2 w-2 rounded-full ${TONE_FILL[i.tone ?? "green"]}`} />
            {/* The connector, drawn downward — the last item has nothing to
                connect to, so it does not get one. */}
            {n < items.length - 1 && <span className="absolute left-[3.5px] top-2 block h-[calc(100%+10px)] w-px bg-line" />}
          </span>
          <div className="min-w-0 pb-2.5">
            <b className="block text-[10px] font-bold text-ink">{i.title}</b>
            <small className="mt-0.5 block text-[10px] leading-relaxed text-ink-dim">{i.detail}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

/** `.admin-approval-list` / `.admin-approval`. */
export function ApprovalList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col px-4 pb-3 pt-1">{children}</div>;
}

export function ApprovalItem({
  title,
  detail,
  tags,
  action,
}: {
  title: string;
  detail: string;
  tags?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0">
        <b className="block text-[10px] font-bold text-ink">{title}</b>
        <small className="mt-0.5 block text-[10px] leading-relaxed text-ink-dim">{detail}</small>
        {tags && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{tags}</div>}
      </div>
      {action}
    </div>
  );
}

/** `.context-body` + `.detail-row` — a label/value list in an aside panel. */
export function DetailRows({ rows }: { rows: { label: string; value: ReactNode; tone?: Tone }[] }) {
  return (
    <div className="flex flex-col px-4 pb-3.5 pt-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[11px] last:border-0">
          <span className="text-ink-dim">{r.label}</span>
          <b className={`text-right font-semibold ${r.tone ? TONE_TEXT[r.tone] : "text-ink"}`}>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

/** `.channel-metrics` — the three small facts on a channel/integration card. */
export function CardMetrics({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((m) => (
        <div key={m.label} className="rounded-lg border border-line bg-raised px-2 py-1.5">
          <b className="block text-[10px] font-bold text-ink">{m.value}</b>
          <span className="mt-0.5 block text-[9px] leading-tight text-ink-dim">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

/** `.security-signal` — a dot plus one line on the credential's state. */
export function SecuritySignal({ tone = "green", children }: { tone?: "green" | "amber" | "red"; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-ink-dim">
      <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${TONE_FILL[tone]}`} />
      <span className="truncate">{children}</span>
    </span>
  );
}

/** `.config-title` — monogram plus name and identifier, in a table cell. */
export function ConfigTitle({ icon, title, sub }: { icon?: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex min-w-[150px] items-center gap-2.5">
      {icon}
      <div className="min-w-0">
        <b className="block text-[10px] font-bold text-ink">{title}</b>
        <small className="mt-0.5 block text-[9px] text-ink-dim">{sub}</small>
      </div>
    </div>
  );
}

/** `.tag-list` / `.config-tag`. */
export function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="inline-flex whitespace-nowrap rounded-md border border-line bg-raised px-1.5 py-0.5 text-[9px] text-ink-dim">
          {t}
        </span>
      ))}
    </div>
  );
}

/**
 * `.config-value` — the bold current value with its qualifier underneath.
 * The same shape serves the mockup's stacked table cells, so table rows use
 * it too rather than a near-identical second component.
 */
export function ConfigValue({ value, note }: { value: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0">
      <b className="block text-[10px] font-semibold text-ink">{value}</b>
      {note && <small className="mt-0.5 block text-[9px] leading-relaxed text-ink-dim">{note}</small>}
    </div>
  );
}

/** `.tenant-summary` — the tenant's identity row at the top of its own tab. */
export function TenantSummary({
  initials,
  name,
  sub,
  status,
  action,
}: {
  initials: string;
  name: string;
  sub: string;
  status?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <TenantMark initials={initials} size={44} />
      <div className="min-w-[180px] flex-1">
        <h2 className="text-[15px] font-semibold text-ink">{name}</h2>
        <p className="mt-0.5 text-[10px] text-ink-dim">{sub}</p>
      </div>
      {status}
      {action}
    </div>
  );
}

/** `.brand-preview-card` — what the customer sees, drawn at widget scale. */
export function BrandPreview({
  initials,
  name,
  presence,
  greeting,
  languages,
}: {
  initials: string;
  name: string;
  presence: string;
  greeting: string;
  languages: ReactNode;
}) {
  return (
    <div className="p-4">
      <div className="overflow-hidden rounded-xl border border-line bg-raised">
        <div className="flex items-center gap-2.5 bg-toast px-4 py-3.5">
          <TenantMark initials={initials} />
          <div className="min-w-0">
            <b className="block text-[12px] font-bold text-white">{name}</b>
            <small className="mt-0.5 block text-[9px] text-ok-fill">{presence}</small>
          </div>
        </div>
        <div className="p-3.5">
          <p className="m-0 mb-2.5 text-[10px] leading-relaxed text-ink-muted">{greeting}</p>
          <div className="flex flex-wrap gap-1.5">{languages}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * `.danger-zone` — break-glass and tenant data requests. Deliberately its own
 * bordered region rather than two more rows in a settings list: the mockup's
 * point is that neither is ever reached by flipping a toggle in passing.
 */
export function DangerZone({
  title,
  hint,
  heading,
  children,
  actions,
}: {
  title: string;
  hint: string;
  heading: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-danger-border bg-footer">
      <div className="border-b border-danger-border bg-danger-bg px-4 py-3">
        <h2 className="text-[15px] font-semibold text-danger-text">{title}</h2>
        <p className="mt-0.5 text-[10px] text-ink-dim">{hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3.5 px-4 py-3.5">
        <div className="min-w-[240px] flex-1">
          <b className="block text-[11px] font-bold text-ink">{heading}</b>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-dim">{children}</p>
        </div>
        {actions}
      </div>
    </div>
  );
}

/** `.change-summary` + `.mini-kpi` — three counts across a release panel. */
export function ChangeSummary({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border border-line bg-raised px-3 py-2.5">
          <b className="block font-[family-name:var(--font-inter)] text-[16px] font-bold leading-none text-ink">{i.value}</b>
          <span className="mt-1.5 block text-[9px] leading-tight text-ink-dim">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

/** `.change-diff` — before → after, in a change-request row. */
export function ChangeDiff({ before, after }: { before: string; after: string }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[10px]">
      <b className="font-semibold text-ink">{before}</b>
      <span aria-hidden className="text-ink-dim">
        &rarr;
      </span>
      <span className="sr-only">changes to</span>
      <b className="font-semibold text-ink">{after}</b>
    </span>
  );
}

/** `.approval-route` — the approvals a change still has to clear, in order. */
export function ApprovalRoute({ steps }: { steps: { label: string; done?: boolean }[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {steps.map((s) => (
        <span
          key={s.label}
          className={`rounded-md border px-1.5 py-0.5 text-[9px] ${
            s.done ? "border-ok-border bg-ok-bg text-ok-text" : "border-warn-border bg-warn-bg text-warn-text"
          }`}
        >
          {s.label}
          {s.done ? " ✓" : ""}
        </span>
      ))}
    </span>
  );
}

/** `.audit-actor` — who did it, and the role they held at the time. */
export function AuditActor({ name, role }: { name: string; role: string }) {
  return (
    <span className="block min-w-0">
      <b className="block text-[10px] font-semibold text-ink">{name}</b>
      <small className="mt-0.5 block text-[9px] text-ink-dim">{role}</small>
    </span>
  );
}
