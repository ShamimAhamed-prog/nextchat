"use client";

import type { ReactNode } from "react";

/**
 * The admin view's own shapes from the mockup (`#adminView`) — `.admin-grid`,
 * `.admin-card`, `.setting-list`, `.policy-band`, `.kill-switch`, `.rule-list`
 * and `.role-matrix` — ported to nexchat's dark palette.
 *
 * These are deliberately presentation-only. Unlike the nine replicated views,
 * `/admin` is the working console: every one of these shapes takes its content
 * and its controls from the tenant config engine, so the `action` slots here
 * hold real editors rather than `data-modal` buttons. Keeping the layout in
 * this file and the wiring in `TenantAdminConsole` is what lets the page look
 * like the mockup without pretending to be static.
 *
 * The mockup's own light-theme swatches are not reused: `#a34883` (Instagram)
 * and `#6f7c75` (email) both fail AA as text on a dark surface — the second is
 * the exact value `nfr11-axe-audit` already caught once on the capacity board.
 */

const ICON_TONE: Record<string, string> = {
  whatsapp: "var(--color-channel-whatsapp)",
  web: "var(--color-channel-web)",
  messenger: "var(--color-violet-strong)",
  // Lightened from the mockup's `#a34883` / `#6f7c75`, which measure below
  // 4.5:1 on `bg-footer`. These sit at 5.3:1 and 6.7:1.
  instagram: "var(--color-channel-instagram)",
  email: "var(--color-channel-email)",
  api: "var(--color-amber)",
};

/**
 * The mockup sets these as two- and three-letter monograms (`WA`, `WEB`,
 * `MSG`). Real marks read faster at 36px and match the glyphs already used in
 * `ConnectChannelsModal` and `DetailsPanel`, so WhatsApp, Instagram and
 * Facebook reuse those exact paths rather than a second version of each.
 */
const ICON_GLYPH: Record<string, React.ReactNode> = {
  whatsapp: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A8 8 0 1 1 12 20Z" />,
  web: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 8.5h18M8 21h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  messenger: (
    <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.2 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2Zm1 12.4-2.6-2.8-5 2.8 5.5-5.9 2.7 2.8 4.9-2.8-5.5 5.9Z" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="6.5" r="1.1" />
    </>
  ),
  email: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m3.5 7.5 8.5 6 8.5-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  api: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M2.5 10h19M6 15h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
};

export function IntegrationIcon({ id }: { id: string }) {
  const tone = ICON_TONE[id] ?? "var(--color-ink-dim)";
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-footer"
      style={{ color: tone }}
    >
      <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="currentColor" aria-hidden>
        {ICON_GLYPH[id] ?? <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />}
      </svg>
    </span>
  );
}

/** `.admin-grid` — the channel/integration card grid. */
export function AdminGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

/**
 * `.admin-card`. `preview (3).html` restructured this one: the state pill
 * moved from the footer up to `.admin-card-top`, three `.channel-metric`
 * boxes sit between the blurb and the footer, and the footer now leads with
 * a `.security-signal` rather than the pill.
 *
 * `status` still renders in the footer when no `metrics`/`signal` are given,
 * so the older callers keep the layout they were written against.
 */
export function AdminCard({
  icon,
  title,
  description,
  status,
  metrics,
  signal,
  action,
  detail,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  status: ReactNode;
  /** The mockup's `.channel-metrics` strip. Its presence moves `status` up. */
  metrics?: ReactNode;
  /** The footer's leading credential/health line. */
  signal?: ReactNode;
  action?: ReactNode;
  /** Rendered full-width beneath the status line. The mockup opens a dialog
   *  from `Configure`; this page expands the real editor in place instead, and
   *  it must not sit inside the status line or it wraps the button onto its
   *  own row. */
  detail?: ReactNode;
}) {
  const restructured = Boolean(metrics || signal);
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-footer p-4 shadow-card">
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-dim">{description}</p>
        </div>
        {restructured && status}
      </div>
      {metrics}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {restructured ? signal : status}
        <span className="flex-1" />
        {action}
      </div>
      {detail}
    </article>
  );
}

/** `.setting-list` — queues, SLA bands and retention classes all use this. */
export function SettingList({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-footer shadow-card">
      {children}
    </div>
  );
}

/**
 * `.setting-row` — title and blurb, the current value, then the control.
 * `detail` renders full-width underneath, which is where an expanded editor
 * goes; the mockup opens a dialog there instead.
 */
export function SettingRow({
  title,
  description,
  value,
  action,
  detail,
}: {
  title: string;
  description: string;
  value?: ReactNode;
  action?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-dim">{description}</p>
        </div>
        {value && <div className="text-[11px] text-ink-dim sm:text-right">{value}</div>}
        {action}
      </div>
      {detail}
    </div>
  );
}

const POLICY_TONE = {
  direct: { edge: "var(--color-ok-text)", label: "text-ok-text" },
  // `preview (3).html` splits the old "direct answer" band in two — a High
  // band that may run a reversible action, and a Guarded band that may only
  // answer or confirm one value. Steel rather than green, because the whole
  // point of the band is that it is *not* full authority.
  guarded: { edge: "var(--color-info-text)", label: "text-info-text" },
  clarify: { edge: "var(--color-amber)", label: "text-amber" },
  handoff: { edge: "var(--color-coral-text)", label: "text-coral-text" },
} as const;

/** `.policy-band` — the confidence bands, side by side. `.four` since v28. */
export function PolicyBand({ four, children }: { four?: boolean; children: ReactNode }) {
  return <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${four ? "xl:grid-cols-4" : "md:grid-cols-3"}`}>{children}</div>;
}

export function PolicyCard({
  tone,
  title,
  range,
  description,
}: {
  tone: keyof typeof POLICY_TONE;
  title: string;
  range: string;
  description: string;
}) {
  const t = POLICY_TONE[tone];
  return (
    <article
      className="flex flex-col gap-1.5 rounded-xl border border-line bg-footer p-4"
      style={{ borderLeft: `3px solid ${t.edge}` }}
    >
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <div className={`font-[family-name:var(--font-inter)] text-lg font-bold tabular-nums ${t.label}`}>{range}</div>
      <p className="text-[11px] leading-relaxed text-ink-dim">{description}</p>
    </article>
  );
}

/** `.kill-switch` — its own band, deliberately not a row in a list. */
export function KillSwitchBar({
  title,
  description,
  status,
  action,
}: {
  title: string;
  description: string;
  status: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-coral/40 bg-coral/[0.06] p-4">
      <div className="min-w-[240px] flex-1">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <p className="mt-0.5 max-w-[680px] text-[11px] leading-relaxed text-ink-dim">{description}</p>
      </div>
      {status}
      {action}
    </div>
  );
}

/** `.rule-list` — routing precedence, escalation rules, templates. */
export function RuleList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

export function RuleRow({
  title,
  sub,
  columns = [],
  action,
}: {
  title: string;
  sub: string;
  columns?: ReactNode[];
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <div className="min-w-[220px] flex-1">
        <b className="text-[13px] font-semibold text-ink">{title}</b>
        <small className="mt-0.5 block text-[11px] leading-relaxed text-ink-dim">{sub}</small>
      </div>
      {columns.map((c, i) => (
        <span key={i} className="min-w-[110px] text-[11px] text-ink-dim">
          {c}
        </span>
      ))}
      {action}
    </div>
  );
}

/**
 * `.role-matrix` — a real table rather than the mockup's bare grid of divs,
 * because a permission matrix read without sight is a row of unlabelled cells
 * otherwise. Same shape on screen, headers a screen reader can associate.
 */
export function RoleMatrix({ columns, rows }: { columns: string[]; rows: { role: string; cells: ReactNode[] }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-dim">
              Role
            </th>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-dim">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.role} className="border-b border-line last:border-0">
              <th scope="row" className="px-4 py-2.5 text-left text-[12px] font-semibold text-ink">
                {r.role}
              </th>
              {r.cells.map((cell, i) => (
                <td key={i} className="px-3 py-2.5 text-ink-dim">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
