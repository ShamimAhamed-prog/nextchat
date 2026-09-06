"use client";

import { Btn, PageHead, Panel, Pill, type PillTone } from "../mockup/Primitives";
import type { ModalId } from "../mockup/ModalContext";

/** `/exceptions` — a direct replication of the mockup's `#exceptionsView`. */

/**
 * The mockup carried each exception’s severity as a 4px coloured rail across
 * the top of its card. NextAdmin does not rail its cards — every card is the
 * same hairline box, and meaning is carried *inside* it by an icon chip and a
 * badge. That is the better instrument here too: a rail is a colour with no
 * label, so it fails 1.4.1 on its own, and six cards with six different top
 * edges read as six different components rather than one list.
 */
type ExcIcon = "money" | "channel" | "identity" | "weather" | "policy";

const EXC_ICON: Record<ExcIcon, React.ReactNode> = {
  money: <path d="M12 3v18M8 7h5a3 3 0 0 1 0 6H8h6a3 3 0 0 1 0 6H8" />,
  channel: (
    <>
      <path d="M4 6h16v10H9l-5 4V6Z" />
      <path d="m9 11 2 2 4-4" />
    </>
  ),
  identity: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a6 6 0 0 1 11 0M16 8h5M16 12h5" />
    </>
  ),
  weather: <path d="M7 17a4 4 0 0 1 .6-7.97 5.5 5.5 0 0 1 10.4 1.6A3.5 3.5 0 0 1 17.5 17H7Z" />,
  policy: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

/** Icon chip, badge and hairline all take their hue from the card’s tone. */
const EXC_CHIP: Record<PillTone, string> = {
  red: "bg-danger-bg text-danger-text",
  amber: "bg-warn-bg text-warn-text",
  green: "bg-ok-bg text-ok-text",
  violet: "bg-violet-bg text-violet-text",
  steel: "bg-info-bg text-info-text",
  gray: "bg-panel text-ink-muted",
};

const EXCEPTIONS: { pill: string; tone: PillTone; title: string; detail: string; icon: ExcIcon; actions: { label: string; primary?: boolean; modal?: ModalId }[] }[] = [
  { pill: "P0 · 3 cases", tone: "red", title: "Paid but not ticketed", detail: "Gateway settlement exists, issuance retries exhausted or inventory confirmation failed.", icon: "money", actions: [{ label: "Open queue", modal: "drilldown" }, { label: "Recover", primary: true, modal: "recovery" }] },
  { pill: "Financial · 1", tone: "red", title: "Suspected duplicate charge", detail: "Two captured references for the same order and customer identity.", icon: "money", actions: [{ label: "Investigate", modal: "recovery" }] },
  { pill: "Channel · 18", tone: "amber", title: "WhatsApp delivery failure", detail: "Terminal failures require bounded retry or an approved alternative channel.", icon: "channel", actions: [{ label: "Recover delivery", modal: "channelRecovery" }] },
  { pill: "Identity · 4", tone: "steel", title: "Possible cross-channel match", detail: "Similar attributes never merge automatically; verification and reversible audit required.", icon: "identity", actions: [{ label: "Resolve identities", modal: "identity" }] },
  { pill: "Disruption · 126 PNRs", tone: "amber", title: "DAC–CXB weather cohort", detail: "Informational requests remain AI-served; decision cases enter the surge queue.", icon: "weather", actions: [{ label: "Open command view", modal: "surge" }] },
  { pill: "AI governance", tone: "violet", title: "Bangla payment drift", detail: "Escalation rate increased after policy v17; calibration review is required.", icon: "policy", actions: [{ label: "Review controls", modal: "killSwitch" }] },
];

const TIMELINE: { time: string; title: string; detail: string; dot: string }[] = [
  { time: "14:17:42", title: "Payment captured", detail: "Gateway reference PAY-82••91 · idempotency key verified.", dot: "var(--color-ok-fill)" },
  { time: "14:17:48", title: "Ticket issuance failed", detail: "Supplier timeout after three bounded attempts with backoff.", dot: "var(--color-danger-fill)" },
  { time: "14:18:02", title: "Reconciliation task created", detail: "Settlement matched; customer proactively notified; refund clock prepared.", dot: "var(--color-warn-fill)" },
  { time: "14:21:08", title: "Human ownership accepted", detail: "Nusrat Jahan · transcript and booking state loaded · AI outbound locked.", dot: "var(--color-ok-fill)" },
];

const RECOVERY_ACTIONS: { title: string; pill: string; tone: PillTone; meta: string; button: string; primary?: boolean }[] = [
  { title: "Retry ticket issuance", pill: "Available", tone: "green", meta: "Existing payment · same order · idempotent", button: "Review and retry", primary: true },
  { title: "Initiate refund", pill: "Finance approval", tone: "amber", meta: "Use if issuance cannot complete before hold expiry", button: "Prepare refund" },
];

const RECONCILIATION: { label: string; value: string; color?: string }[] = [
  { label: "Settlement", value: "Matched", color: "var(--color-ok-text)" },
  { label: "Ticket", value: "Not issued", color: "var(--color-danger-text)" },
  { label: "Customer notice", value: "Delivered 14:18" },
  { label: "Refund clock", value: "Not started" },
];

export default function ExceptionsPage() {
  return (
    <>
      <PageHead
        eyebrow="Operational recovery"
        title="Exceptions and incident command"
        description="Financial, ticketing, channel, identity and disruption exceptions with named ownership and audited recovery."
        actions={
          <>
            <Btn modal="recovery">Run reconciliation</Btn>
            <Btn primary modal="surge">Open incident cohort</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXCEPTIONS.map((e) => (
          <div
            key={e.title}
            className="flex flex-col rounded-xl border border-line bg-footer p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${EXC_CHIP[e.tone]}`}>
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  {EXC_ICON[e.icon]}
                </svg>
              </span>
              <Pill tone={e.tone}>{e.pill}</Pill>
            </div>
            <h3 className="mt-3.5 text-sm font-semibold text-ink">{e.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">{e.detail}</p>
            <footer className="mt-auto flex flex-wrap gap-2 pt-4">
              {e.actions.map((a) => (
                <Btn key={a.label} primary={a.primary} modal={a.modal}>
                  {a.label}
                </Btn>
              ))}
            </footer>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Recovery case · C-1057" hint="Paid BDT 8,450 · ticket issuance failed · departure tomorrow" action={<Pill tone="red">P0 · owner: Finance duty</Pill>}>
          <div className="flex flex-col">
            {TIMELINE.map((t, i) => (
              <div key={t.time} className="grid grid-cols-[90px_12px_1fr] gap-2.5">
                <time className="pt-0.5 text-[11px] text-ink-dim">{t.time}</time>
                <div className="flex flex-col items-center">
                  <span aria-hidden className="mt-1 h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: t.dot }} />
                  {i < TIMELINE.length - 1 && <span aria-hidden className="w-px flex-1 bg-line" />}
                </div>
                <div className="min-w-0 pb-4">
                  <b className="text-xs font-semibold text-ink">{t.title}</b>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Allowed recovery actions" hint="Validated services and confirmation steps">
            <div className="flex flex-col">
              {RECOVERY_ACTIONS.map((a) => (
                <div key={a.title} className="border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[13px] font-semibold text-ink">{a.title}</b>
                    <Pill tone={a.tone}>{a.pill}</Pill>
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-dim">{a.meta}</p>
                  <div className="mt-2.5">
                    <Btn primary={a.primary} modal="recovery">{a.button}</Btn>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Reconciliation" hint="Gateway settlement versus issued ticket">
            <div className="flex flex-col">
              {RECONCILIATION.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2 border-b border-line py-2 text-[11px] last:border-0">
                  <span className="text-ink-dim">{r.label}</span>
                  <b className="text-right" style={{ color: r.color ?? "var(--color-ink)" }}>
                    {r.value}
                  </b>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
