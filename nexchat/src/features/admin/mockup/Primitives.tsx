"use client";

/**
 * The mockup's shared building blocks — `.page-head`, `.filters`, `.panel`,
 * `.kpi`, `.pill`, `.bar`, `.feed` — ported to nexchat's dark palette.
 *
 * These render the design's own content. Where a figure here looks like a
 * metric, it is the mockup's fixture value, not something computed from
 * this app's state: the design is the specification being replicated.
 */

import { useModal, type ModalId } from "./ModalContext";

export type PillTone = "green" | "amber" | "red" | "gray" | "violet" | "steel";

/**
 * NextAdmin's badge: a soft `50`-tint field, `700` text, and no border.
 *
 * Dropping the border is the whole change and it is not cosmetic — a badge
 * that outlines itself reads as a control you can press, which is wrong for
 * something that only reports state, and at 10px the outline crowds the two
 * or three characters inside it. The `500`-level dot carries the hue at a
 * glance instead, so tone survives being read at speed down a column.
 */
const PILL: Record<PillTone, string> = {
  green: "bg-ok-bg text-ok-text",
  amber: "bg-warn-bg text-warn-text",
  red: "bg-danger-bg text-danger-text",
  gray: "bg-panel text-ink-muted",
  violet: "bg-violet-bg text-violet-text",
  steel: "bg-info-bg text-info-text",
};

const PILL_DOT: Record<PillTone, string> = {
  green: "bg-ok-fill",
  amber: "bg-warn-fill",
  red: "bg-danger-fill",
  gray: "bg-line-strong",
  violet: "bg-violet-fill",
  steel: "bg-info-fill",
};

export function Pill({ tone = "gray", dot = true, children }: { tone?: PillTone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-[10px] font-semibold ${PILL[tone]}`}>
      {dot && <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${PILL_DOT[tone]}`} />}
      {children}
    </span>
  );
}

export function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-coral">{eyebrow}</span>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
        <p className="max-w-[680px] text-[13px] leading-relaxed text-ink-dim">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

export function Btn({
  children,
  primary,
  danger,
  modal,
  subject,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
  /** Opens one of the mockup's dialogs, the way `data-modal` does there. */
  modal?: ModalId;
  subject?: string;
  onClick?: () => void;
  /** Only `/admin` needs this: its buttons act on real state, so publishing
   *  and discarding are unavailable until there is a draft to act on. */
  disabled?: boolean;
  title?: string;
}) {
  const ctx = useModal();
  const base = "flex h-9 items-center rounded-lg border px-3.5 text-xs font-semibold transition-colors";
  const tone = primary
    ? "border-transparent bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] text-on-accent hover:opacity-90"
    : danger
      ? "border-danger-border bg-danger-bg text-danger-text hover:border-danger-border-strong hover:bg-danger-bg-soft"
      : "border-line bg-card text-ink hover:bg-raised hover:border-line-strong";

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={() => {
        onClick?.();
        if (modal) ctx?.open(modal, subject);
      }}
      className={`${base} ${tone} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/** The mockup's `.filters` bar — a row of labelled selects, optionally with a search field. */
export function Filters({ fields, search }: { fields: { label: string; options: string[] }[]; search?: string }) {
  return (
    <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-line bg-footer p-3 shadow-card">
      {fields.map((f) => (
        <label key={f.label} className="flex min-w-[138px] flex-1 flex-col gap-1.5">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-dim">{f.label}</span>
          <select
            defaultValue={f.options[0]}
            className="h-8 w-full rounded-lg border border-line bg-footer px-2 text-xs text-ink focus:border-coral focus:outline-none"
          >
            {f.options.map((o) => (
              <option key={o} value={o} className="bg-footer">
                {o}
              </option>
            ))}
          </select>
        </label>
      ))}
      {search && (
        <label className="flex min-w-[220px] flex-[2] flex-col gap-1.5">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-ink-dim">Find agent</span>
          <input
            type="search"
            placeholder={search}
            className="h-8 w-full rounded-lg border border-line bg-footer px-2.5 text-xs text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
          />
        </label>
      )}
    </div>
  );
}

/** The mockup's `.kpi` card: label + delta pill, big value, note. */
export function Kpi({
  label,
  delta,
  deltaTone = "green",
  value,
  suffix,
  valueColor,
  note,
}: {
  label: string;
  delta?: string;
  deltaTone?: PillTone;
  value: string;
  suffix?: string;
  valueColor?: string;
  note: string;
}) {
  return (
    <div className="flex min-h-[112px] flex-col justify-between rounded-xl border border-line bg-footer p-4 shadow-card">
      <div className="flex min-h-[30px] items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.06em] text-ink-dim">{label}</span>
        {delta && <Pill tone={deltaTone}>{delta}</Pill>}
      </div>
      <div className="mt-3 font-[family-name:var(--font-inter)] text-[29px] font-bold leading-none tracking-[-0.045em]" style={{ color: valueColor ?? "var(--color-ink)" }}>
        {value}
        {suffix && <span className="text-base font-medium text-ink-dim">{suffix}</span>}
      </div>
      <div className="mt-1.5 text-[11px] text-ink-dim">{note}</div>
    </div>
  );
}

/** The mockup's `.panel` with its `.panel-head`. */
export function Panel({
  title,
  hint,
  action,
  children,
  bodyClass = "p-4",
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClass?: string;
}) {
  // No `flex-1` here: as a full-width child of the page's flex column it
  // would stretch to fill the viewport, leaving a tall empty panel. Grid and
  // flex-row parents stretch their children on their own.
  return (
    <div className="flex min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-footer shadow-card">
      <div className="flex min-h-[58px] items-center gap-3 px-4 pb-1 pt-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-[10px] text-ink-dim">{hint}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

/** The mockup's `.bar` — a thin track with a coloured fill. */
export function Bar({ pct, tone = "green", height = 6 }: { pct: number; tone?: "green" | "amber" | "red" | "steel" | "violet"; height?: number }) {
  // `-fill`, not `-text`: this is a graphic held to 3:1, and the text values
  // are now dark enough that a bar drawn in them reads as a dead line.
  const color = { green: "var(--color-ok-fill)", amber: "var(--color-warn-fill)", red: "var(--color-danger-fill)", steel: "var(--color-info-fill)", violet: "var(--color-violet-fill)" }[tone];
  return (
    <div className="w-full overflow-hidden rounded-full bg-ink/10" style={{ height }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** The mockup's `.feed` / `.event` list. */
export function Feed({ events }: { events: { title: string; detail: string; time: string; tone?: "green" | "amber" | "red" }[] }) {
  const dot = { green: "var(--color-ok-text)", amber: "var(--color-warn-text)", red: "var(--color-danger-text)" };
  return (
    <div className="flex flex-col">
      {events.map((e) => (
        <div key={e.title} className="grid grid-cols-[10px_1fr_auto] gap-2.5 border-b border-line py-2.5 last:border-0">
          <span aria-hidden className="mt-1.5 h-2 w-2 rounded-full" style={{ background: dot[e.tone ?? "green"] }} />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-ink">{e.title}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-dim">{e.detail}</p>
          </div>
          <time className="text-[9px] text-ink-dim">{e.time}</time>
        </div>
      ))}
    </div>
  );
}

/** The mockup's `.table-wrap` + table shell. */
/**
 * A sortable column. `head` still takes plain strings — every table the
 * mockup replicates is static — and a cell object where a column can be
 * sorted, so the `aria-sort` a screen reader needs is carried by the same
 * thing that draws the arrow rather than by a second, parallel array.
 */
export type HeadCell = {
  label: string;
  /** Present makes the header a button. */
  onSort?: () => void;
  /** Omit for a column that cannot be sorted at all. */
  sort?: "ascending" | "descending" | "none";
};

export function Table({ head, children, minWidth = 850, cols }: { head: (string | HeadCell)[]; children: React.ReactNode; minWidth?: number; cols?: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs" style={{ minWidth }}>
        {cols && (
          <colgroup>
            {cols.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
        )}
        {/*
          NextAdmin's table: a tinted header band with no rule under it, rows
          divided by a hairline and nothing else, and a row that tints on
          hover so the eye can hold a line across a wide table. The header
          used to be `bg-footer`, which is white in the light theme — the same
          colour as the body, so the band simply vanished.
        */}
        <thead>
          <tr className="bg-raised text-left">
            {head.map((h) => {
              const cell: HeadCell = typeof h === "string" ? { label: h } : h;
              return (
                <th
                  key={cell.label}
                  scope="col"
                  aria-sort={cell.sort}
                  className="whitespace-nowrap px-3.5 py-3 text-[9px] font-bold uppercase tracking-[0.07em] text-ink-dim first:rounded-l-md last:rounded-r-md"
                >
                  {cell.onSort ? (
                    <button
                      type="button"
                      onClick={cell.onSort}
                      className="inline-flex items-center gap-1 uppercase tracking-[0.07em] text-inherit transition-colors hover:text-coral"
                    >
                      {cell.label}
                      {/* Only a sortable column gets an indicator: a header
                          button that performs some other action (selecting
                          the page, say) is not sorted by anything. */}
                      {cell.sort && (
                        <span aria-hidden className="text-[8px] leading-none">
                          {cell.sort === "ascending" ? "▲" : cell.sort === "descending" ? "▼" : "↕"}
                        </span>
                      )}
                    </button>
                  ) : (
                    cell.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="[&>tr]:transition-colors [&>tr:hover]:bg-raised">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "", colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`border-b border-line px-3.5 py-3.5 align-middle text-ink ${className}`}>
      {children}
    </td>
  );
}

/** The mockup's `.funnel` — label, proportional bar, value. */
export function Funnel({ rows }: { rows: { label: string; pct: number; value: string; color: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[140px_1fr_42px] items-center gap-2.5 text-[10px]">
          <span className="text-ink-dim">{r.label}</span>
          <div className="h-[22px] overflow-hidden rounded-md bg-ink/10">
            <div className="h-full rounded-md" style={{ width: `${r.pct}%`, background: r.color }} />
          </div>
          <b className="text-right text-ink">{r.value}</b>
        </div>
      ))}
    </div>
  );
}

/** The mockup's `.reason-bars`. */
export function ReasonBars({ rows }: { rows: { label: string; pct: number; bar: number; color?: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[150px_1fr_34px] items-center gap-2.5 text-[10px]">
          <span className="text-ink-dim">{r.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full" style={{ width: `${r.bar}%`, background: r.color ?? "var(--color-info-fill)" }} />
          </div>
          <b className="text-right text-ink">{r.pct}%</b>
        </div>
      ))}
    </div>
  );
}

/** The mockup's `.histogram` + `.axis-labels`. */
export function Histogram({ bars, tone = "green", labels }: { bars: number[]; tone?: "green" | "steel" | "confidence"; labels: string[] }) {
  const fill = (i: number) => {
    if (tone === "confidence") return i < 4 ? "var(--color-danger-fill)" : i < 7 ? "var(--color-warn-fill)" : "var(--color-ok-fill)";
    if (tone === "steel") return "var(--color-info-fill)";
    return "var(--color-ok-fill)";
  };
  return (
    <div className="flex flex-col">
      <div className="flex h-[150px] items-end gap-[5px] border-b border-line px-1.5">
        {bars.map((h, i) => (
          <div key={i} className="min-w-2 flex-1 rounded-t-[3px]" style={{ height: `${h}%`, background: fill(i) }} />
        ))}
      </div>
      <div className="flex justify-between pt-1.5 text-[9px] text-ink-dim">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/** The mockup's `.seg` display-density toggle. */
export function Seg({ options, active }: { options: string[]; active: string }) {
  return (
    <div className="flex shrink-0 rounded-lg border border-line bg-panel p-0.5">
      {options.map((o) => (
        <span key={o} className={`rounded-md px-2 py-1 text-[10px] font-medium ${o === active ? "bg-card text-ink shadow-card" : "text-ink-dim"}`}>
          {o}
        </span>
      ))}
    </div>
  );
}

/** A field name or expression — monospace, in a tinted chip. */
export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline-block rounded-[5px] bg-info-bg px-1.5 py-0.5 font-mono text-[11px] leading-relaxed text-info-text">
      {children}
    </code>
  );
}

/** The mockup's `.audit-note` — a steel-tinted explanatory block. */
export function AuditNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-info-border bg-info-bg p-2.5 text-[10px] leading-relaxed text-info-text">{children}</div>;
}

/** The mockup's `.empty-state`. */
export function EmptyState({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-2xl bg-ok-bg text-xl text-ok-text">{icon}</div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[360px] text-[10px] leading-relaxed text-ink-dim">{children}</p>
    </div>
  );
}

/** The mockup's `.switch` toggle, shown in its on/off state. */
export function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-block h-5 w-[34px] shrink-0 rounded-full transition-colors ${on ? "bg-ok-fill" : "bg-track-off"}`}>
      <span className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-knob ${on ? "right-[3px]" : "left-[3px]"}`} />
    </span>
  );
}

/** The mockup's `.avatar` initials circle. */
export function Avatar({ initials, color, size = 32 }: { initials: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-on-accent"
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}
