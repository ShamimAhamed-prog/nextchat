"use client";

import { useState } from "react";
import ConnectChannelsButton from "./ConnectChannelsButton";
import { useInbox } from "../context/InboxContext";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import { confidenceBand, CONFIDENCE_BAND_LABEL, type ConfidenceBand } from "@/features/admin/engine/tenantConfigEngine";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { FAQ } from "@/features/widget/engine";
import { ALL_PEOPLE, YOU } from "@/shared/lib/people";
import { availableBookingActions, conversationStatusLabel, maskPii, PII_LABEL, type Conversation, type PiiField, type Priority } from "../engine/inboxEngine";

/*
 * A hue per known tag. The border is always the gradient's own `from`, so
 * it is derived rather than restated. Values are tokens (see `globals.css`,
 * "Customer tags and booking-state text") — identical in both themes today,
 * but nameable in one place when the light theme gets its own.
 */
const TAG_STYLE: Record<string, { from: string; to: string; text: string }> = {
  VIP: { from: "var(--color-tag-vip-from)", to: "var(--color-tag-vip-to)", text: "var(--color-tag-vip-text)" },
  Repeat: { from: "var(--color-tag-repeat-from)", to: "var(--color-tag-repeat-to)", text: "var(--color-tag-repeat-text)" },
  Dhaka: { from: "var(--color-tag-route-from)", to: "var(--color-tag-route-to)", text: "var(--color-tag-route-text)" },
  bKash: { from: "var(--color-tag-wallet-from)", to: "var(--color-tag-wallet-to)", text: "var(--color-tag-wallet-text)" },
};
const DEFAULT_TAG_STYLE = {
  from: "var(--color-line-strong)",
  to: "var(--color-line)",
  text: "var(--color-ink)",
};

const PRIORITY_COLOR: Record<Priority, string> = { P0: "var(--color-danger-strong)", P1: "var(--color-warn-strong)", P2: "var(--color-state-busy)", P3: "var(--color-ink-dim)" };

/** §1.2's status palette, keyed by band — all four already clear AA on `bg-page`. */
const CONFIDENCE_BAND_CLASS: Record<ConfidenceBand, string> = {
  high: "text-ok-bright",
  guarded: "text-amber",
  clarify: "text-warn-strong",
  handoff: "text-coral",
};
const BOOKING_COLOR: Record<string, string> = {
  Searching: "var(--color-booking-searching)",
  "Hold created": "var(--color-state-busy)",
  "Awaiting payment": "var(--color-state-busy)",
  Paid: "var(--color-booking-paid)",
  "Ticketing failed": "var(--color-danger-strong)",
  Ticketed: "var(--color-ok-strong)",
  "No active booking": "var(--color-ink-dim)",
};

export default function DetailsPanel({ onClose }: { onClose?: () => void } = {}) {
  const { state } = useInbox();
  const { t } = useUiLocale();
  const convo = state.conversations.find((c) => c.id === state.selectedId);

  if (!convo) {
    return <aside className="flex w-full shrink-0 items-center justify-center rounded-lg bg-page p-2 text-sm text-ink-dim 2xl:w-[392px]">{t("Nothing selected.")}</aside>;
  }

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col gap-6 overflow-y-auto rounded-lg bg-page p-2 2xl:w-[392px]">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="self-end rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral"
        >
          {t("Close details")}
        </button>
      )}

      <HandoffSummary convo={convo} />

      <BookingActions convo={convo} />

      <RoutingDecisionPanel convo={convo} />

      <div
        className="flex flex-col gap-5 rounded-lg p-5"
        style={{ background: "var(--gradient-brief)" }}
      >
        <p className="text-sm font-medium text-ink">{t("Connected channels")}</p>
        <div className="flex items-center gap-3">
          <ChannelIcon bg="#ffffff" color="#25d366">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A8 8 0 1 1 12 20Z" />
          </ChannelIcon>
          <ChannelIcon bg="#ffffff">
            <defs>
              <linearGradient id="ig-gradient" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#f9ce34" />
                <stop offset="50%" stopColor="#ee2a7b" />
                <stop offset="100%" stopColor="#6228d7" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="18" height="18" rx="5" fill="url(#ig-gradient)" stroke="none" />
            <circle cx="12" cy="12" r="4" fill="none" stroke="#ffffff" />
            <circle cx="17.5" cy="6.5" r="1" fill="#ffffff" stroke="none" />
          </ChannelIcon>
          <ChannelIcon bg="#1877f2" color="#ffffff">
            <path d="M14 9h3V6h-3a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9Z" fill="currentColor" stroke="none" />
          </ChannelIcon>
          <ConnectChannelsButton />
        </div>
      </div>

      <details open className="group flex flex-col gap-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-ink">
          {t("Ticket Details")}
          <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div className="flex flex-col gap-4">
          <ReadField label={t("Status")} value={conversationStatusLabel(convo)} />
          <ReadField label={t("Priority")} value={convo.priority} dotColor={PRIORITY_COLOR[convo.priority]} />
          <ReadField label={t("Escalation reason")} value={convo.escalationReason} />
        </div>
      </details>

      <Section
        title={t("Contact Information")}
        defaultOpen
        icon={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}
      >
        <div className="flex flex-col gap-3 rounded-lg bg-footer p-4">
          <ContactRow convo={convo} field="email">
            <path d="M4 6h16v12H4V6Zm0 0 8 7 8-7" />
          </ContactRow>
          <ContactRow convo={convo} field="phone">
            <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z" />
          </ContactRow>
          <ContactRow convo={convo} field="address">
            <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
            <circle cx="12" cy="9" r="2.5" />
          </ContactRow>
          <ContactRow convo={convo} field="passportNid">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <circle cx="12" cy="10" r="2.5" />
            <path d="M8 17c1-2 7-2 8 0" />
          </ContactRow>
          <IdentityStatus convo={convo} />
        </div>
      </Section>

      <Section
        title={t("Tags")}
        icon={<><path d="M20.6 12.4 12.4 4.2a2 2 0 0 0-1.4-.6H5a1 1 0 0 0-1 1v6a2 2 0 0 0 .6 1.4l8.2 8.2a2 2 0 0 0 2.8 0l5-5a2 2 0 0 0 0-2.8Z" /><circle cx="8" cy="8" r="1" /></>}
      >
        <TagsSection convo={convo} />
      </Section>

      <Section
        title={t("Follow-ups")}
        icon={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
      >
        <FollowUpTasks convo={convo} />
      </Section>

      {/* Open by default, unlike Tags and Follow-ups. An agent taking a
          conversation over needs to see what already happened to it — "payment
          received", "ticketing failed x3" — and every audited action lands
          here, so folding it away hides the evidence trail at exactly the
          moment it matters. Density comes from folding the two reference
          sections, not this one. */}
      <Section
        title={t("Activity Summary")}
        defaultOpen
        icon={<path d="M3 17 9 11l4 4 8-8" />}
      >
        <ol className="relative flex flex-col gap-5 pl-1">
          <span aria-hidden className="absolute bottom-4 left-[13px] top-4 w-px" style={{ background: "linear-gradient(180deg,var(--color-violet-strong),transparent)" }} />
          {[...convo.activity].reverse().map((a) => (
            <li key={a.id} className="relative flex items-start gap-3">
              <span aria-hidden className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-accent" style={{ background: "linear-gradient(135deg,#00d492,#00bba7)" }}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 12.5 11 14.5 15 9.5" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-ink">{a.title}</span>
                <span className="text-xs text-ink-muted">{a.detail}</span>
                <span className="text-[10px] text-ink-muted">{a.time}</span>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </aside>
  );
}

function HandoffSummary({ convo }: { convo: Conversation }) {
  const { t } = useUiLocale();
  const { state: tenantState } = useTenantConfig();
  const bands = tenantState.published.ai.confidence;
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-violet-border bg-violet-bg p-4">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-violet-strong" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 2 3 6v5c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4Z" />
        </svg>
        <p className="text-base font-medium text-ink">{t("AI handoff summary")}</p>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{convo.summary}</p>

      <div className="grid grid-cols-2 gap-3 border-t border-violet-border-soft pt-3 text-xs">
        <Field label={t("Booking state")}>
          <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: BOOKING_COLOR[convo.bookingState] }}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: BOOKING_COLOR[convo.bookingState] }} />
            {convo.bookingState}
          </span>
        </Field>
        <Field label="PNR / route">
          <span className="font-[family-name:var(--font-inter)] text-ink">{convo.pnr ?? "—"}{convo.route ? ` · ${convo.route}` : ""}</span>
        </Field>
        <Field label={t("Payment")}>
          {convo.paymentSummary ? (
            <ProtectedValue convo={convo} field="paymentSummary" value={convo.paymentSummary} className="font-[family-name:var(--font-inter)] text-ink" />
          ) : (
            <span className="font-[family-name:var(--font-inter)] text-ink">No payment on this thread</span>
          )}
        </Field>
        <Field label={t("Language")}>
          <span className="text-ink">{convo.language}</span>
        </Field>
      </div>

      <CitedKnowledge convo={convo} />

      <div className="flex flex-col gap-1.5 border-t border-violet-border-soft pt-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-violet-text-soft">{t("Last intents")}</span>
        {convo.intentTrail.map((it, i) => {
          // AI-07: the band comes from the tenant's published thresholds, so
          // publishing a new one re-reads every score here. The name is shown
          // next to the number because a colour shift alone is invisible to
          // anyone who wasn't already staring at the panel.
          const band = confidenceBand(it.confidence, bands);
          return (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-[family-name:var(--font-inter)] text-ink-muted">{it.intent}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-ink-dim">{t(CONFIDENCE_BAND_LABEL[band])}</span>
                <span className={`font-[family-name:var(--font-inter)] font-semibold tabular-nums ${CONFIDENCE_BAND_CLASS[band]}`}>
                  {Math.round(it.confidence * 100)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * AG-05: the booking-domain actions the bot can already perform, reachable
 * from the workspace. Which ones appear is derived from the booking state and
 * the tenant's published refund ceiling, so an agent is never shown an action
 * this booking cannot take.
 */
function BookingActions({ convo }: { convo: Conversation }) {
  const { dispatch } = useInbox();
  const { state: configState } = useTenantConfig();
  const { t } = useUiLocale();
  const offers = availableBookingActions(convo, configState.published.commercial.refundCeilingBdt);

  if (offers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 11.5 21 3l-6 18-4-7-8-2.5Z" />
        </svg>
        <p className="text-base font-medium text-ink">{t("Booking actions")}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-footer p-4">
        {offers.map((o) => (
          <div key={o.id} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => dispatch({ type: "OPEN_BOOKING_ACTION", id: convo.id, action: o.id })}
              className={`flex h-9 items-center justify-between rounded-lg border px-3 text-sm font-medium transition-colors ${
                o.blocked
                  ? "border-warn-border-soft text-amber hover:border-amber"
                  : "border-line text-ink hover:border-coral hover:text-coral"
              }`}
            >
              {t(o.label)}
              {o.blocked ? <span className="text-[10px] uppercase tracking-wide">{t("Needs approval")}</span> : null}
            </button>
          </div>
        ))}
        <p className="mt-1 text-xs leading-relaxed text-ink-dim">
          {t(
            "Every action here confirms first and runs under an idempotency key — the same key can only take effect once.",
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * RT-10: "Expose assignment reason, eligible candidate count, effective
 * weights, selected agent and reassignment history for audit and debugging."
 * Every candidate is listed, including the ruled-out ones and why — the
 * question this answers is "why didn't it go to Arif?", which a list of
 * winners cannot.
 */
function RoutingDecisionPanel({ convo }: { convo: Conversation }) {
  const { t } = useUiLocale();
  const d = convo.routingDecision;
  if (!d) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 3v12a3 3 0 0 0 3 3h9" />
          <path d="m15 15 3 3-3 3" />
        </svg>
        <p className="text-base font-medium text-ink">{t("Routing decision")}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-footer p-4">
        <p className="text-sm leading-relaxed text-ink">{d.reason}</p>
        <p className="text-xs text-ink-dim">
          {d.queueName}
          {d.requiredSkill ? ` · requires “${d.requiredSkill}”` : ""} ·{" "}
          {d.eligibleCount} of {d.candidates.length} eligible
        </p>

        <ul className="mt-1 flex flex-col gap-1">
          {d.candidates.map((c) => (
            <li
              key={c.agent}
              className="flex items-center justify-between gap-3 rounded-md border border-line px-2.5 py-1.5 text-xs"
            >
              <span className={c.agent === d.selected ? "font-semibold text-ok-strong" : "text-ink"}>
                {c.agent}
                {c.agent === d.selected ? " ✓" : ""}
              </span>
              <span className={`text-right ${c.eligible ? "text-ink-dim" : "text-amber"}`}>
                {c.eligible
                  ? `weight ${c.effectiveWeight} · ${c.activeCount}/${c.capacity}`
                  : c.reason}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * AG-04 / AI-03. The bot cites a source when it answers from knowledge; the
 * agent who takes the thread over should be able to open exactly that, rather
 * than searching for whatever they think it quoted.
 */
function CitedKnowledge({ convo }: { convo: Conversation }) {
  const { dispatch } = useInbox();
  const { t } = useUiLocale();
  const cited = (convo.citedKnowledge ?? [])
    .map((id) => FAQ.find((f) => f.id === id))
    .filter(Boolean);

  if (cited.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 border-t border-violet-border-soft pt-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-violet-text-soft">
        {t("Bot cited")}
      </span>
      {cited.map((f) => (
        <button
          key={f!.id}
          type="button"
          onClick={() => dispatch({ type: "OPEN_KNOWLEDGE", articleId: f!.id })}
          className="text-left text-xs text-ink-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-coral"
        >
          {f!.source}
        </button>
      ))}
    </div>
  );
}

/**
 * The panel had grown to nine blocks, every one expanded and every one the
 * same visual weight, so the ones that decide what an agent does next were no
 * easier to find than the ones they read once a day. This gives them one
 * header treatment and lets the reference material fold away.
 *
 * What stays open by default is what you need *before acting*: the handoff
 * summary, the booking actions, and who the customer is.
 */
function Section({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group flex flex-col gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink marker:hidden">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-dim" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
        <span className="flex-1">{title}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-dim transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-violet-text-soft">{label}</span>
      {children}
    </div>
  );
}

function ReadField({ label, value, dotColor }: { label: string; value: string; dotColor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium leading-[22px] text-ink">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm text-ink">
        {dotColor && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: dotColor }} />}
        {value}
      </span>
    </div>
  );
}

function TagsSection({ convo }: { convo: Conversation }) {
  const { dispatch } = useInbox();
  const { t } = useUiLocale();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {convo.tags.map((tag) => {
          const s = TAG_STYLE[tag] ?? DEFAULT_TAG_STYLE;
          return (
            <span
              key={tag}
              className="rounded-full border px-3 py-1.5 text-xs"
              style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${s.from} 25%, transparent), color-mix(in srgb, ${s.to} 25%, transparent))`, borderColor: s.from, color: s.text }}
            >
              {tag}
            </span>
          );
        })}

        {adding ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) dispatch({ type: "ADD_TAG", id: convo.id, tag: draft.trim() });
              setDraft("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setAdding(false)}
              placeholder="Tag name"
              aria-label="Tag name"
              className="h-7 w-24 rounded-full border border-ink/40 bg-transparent px-3 text-xs text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label={t("Add tag")}
            className="flex items-center gap-1 rounded-full border border-ink px-3 py-1.5 text-xs text-info-text-dim transition-colors hover:border-coral hover:text-coral"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("Add")}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * INB-08's follow-up tasks. A named owner and a due time, because "someone
 * should chase this" with neither is how a follow-up stops happening — the
 * same reasoning as AG-09's named owner on a snooze.
 */
function FollowUpTasks({ convo }: { convo: Conversation }) {
  const { dispatch } = useInbox();
  const { t } = useUiLocale();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(YOU);
  const [dueMinutes, setDueMinutes] = useState(60);
  const tasks = convo.tasks ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-label={adding ? t("Cancel follow-up") : t("Add follow-up")}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral"
        >
          {adding ? t("Cancel") : t("Add")}
        </button>
      </div>

      {adding && (
        <form
          className="flex flex-col gap-2 rounded-lg bg-footer p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            dispatch({ type: "ADD_TASK", id: convo.id, title: title.trim(), owner, dueMinutes });
            setTitle("");
            setAdding(false);
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-ink-dim">
            {t("What needs doing")}
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confirm the reissue cleared with finance"
              className="h-9 rounded-lg border border-line bg-card px-2.5 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-ink-dim">
              {t("Owner")}
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="h-9 rounded-lg border border-line bg-card px-2 text-sm text-ink focus:border-coral focus:outline-none"
              >
                {ALL_PEOPLE.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-dim">
              {t("Due in")}
              <select
                value={dueMinutes}
                onChange={(e) => setDueMinutes(Number(e.target.value))}
                className="h-9 rounded-lg border border-line bg-card px-2 text-sm text-ink focus:border-coral focus:outline-none"
              >
                <option value={60}>1 hour</option>
                <option value={240}>4 hours</option>
                <option value={1440}>Tomorrow</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={!title.trim()}
            aria-label={t("Save follow-up")}
            className="h-8 self-start rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-xs font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t("Add follow-up")}
          </button>
        </form>
      )}

      {tasks.length === 0 && !adding ? (
        <p className="text-xs text-ink-dim">{t("No follow-ups on this conversation.")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li key={task.id}>
              <label className="flex items-start gap-2.5 rounded-lg bg-footer p-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => dispatch({ type: "TOGGLE_TASK", id: convo.id, taskId: task.id })}
                  className="mt-0.5 accent-coral"
                />
                <span className="flex min-w-0 flex-col">
                  <span className={task.done ? "text-ink-dim line-through" : "text-ink"}>{task.title}</span>
                  <span className="text-xs text-ink-dim">
                    {task.owner} · {t("due")} {new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const IDENTITY_STYLE: Record<Conversation["identityStatus"], { label: string; color: string }> = {
  unverified: { label: "Not verified", color: "var(--color-ink-dim)" },
  pending: { label: "Check in progress", color: "var(--color-warn-strong)" },
  verified: { label: "Verified", color: "var(--color-ok-strong)" },
  mismatch: { label: "Mismatch", color: "var(--color-danger-strong)" },
};

/**
 * AG-01 asks for identity status on open, alongside the transcript and the
 * booking state. The workspace showed the document (masked) but never whether
 * it had been *checked*, which is the part that gates a refund or a name
 * change. Changing it is an agent action and is audited.
 */
function IdentityStatus({ convo }: { convo: Conversation }) {
  const { dispatch } = useInbox();
  const { t } = useUiLocale();
  const style = IDENTITY_STYLE[convo.identityStatus];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
      {/* The dot carries the state at a glance and the select carries it in
          words — spelling it out a third time in between was noise. */}
      <span className="flex items-center gap-2 text-sm">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: style.color }} />
        <span className="text-ink-dim">{t("Identity")}</span>
      </span>
      <select
        value={convo.identityStatus}
        aria-label={t("Set identity status")}
        onChange={(e) =>
          dispatch({
            type: "SET_IDENTITY",
            id: convo.id,
            status: e.target.value as Conversation["identityStatus"],
          })
        }
        className="h-8 rounded-lg border border-line bg-card px-2 text-xs text-ink focus:border-coral focus:outline-none"
      >
        {Object.entries(IDENTITY_STYLE).map(([value, s]) => (
          <option key={value} value={value}>{t(s.label)}</option>
        ))}
      </select>
    </div>
  );
}

function ChannelIcon({ bg, color = "currentColor", children }: { bg: string; color?: string; children: React.ReactNode }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: bg, color }}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

function ContactRow({ convo, field, children }: { convo: Conversation; field: PiiField; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      <ProtectedValue convo={convo} field={field} value={convo[field] ?? ""} className="text-sm text-ink" />
    </div>
  );
}

/**
 * AG-06 at the point of use: masked by default, with a reveal that either
 * asks for a reason first (when the tenant requires one) or reveals straight
 * away — and audits either way. Revealed values re-mask on Hide, and are
 * dropped entirely when the workspace unmounts.
 */
function ProtectedValue({
  convo,
  field,
  value,
  className = "",
}: {
  convo: Conversation;
  field: PiiField;
  value: string;
  className?: string;
}) {
  const { state, dispatch } = useInbox();
  const { state: configState } = useTenantConfig();
  const { t } = useUiLocale();
  const revealed = (state.revealedPii[convo.id] ?? []).includes(field);
  const needsReason = configState.published.security.piiRevealRequiresReason;

  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span className={`min-w-0 truncate ${className}`} title={revealed ? value : undefined}>
        {revealed ? value : maskPii(field, value)}
      </span>
      <button
        type="button"
        onClick={() =>
          revealed
            ? dispatch({ type: "HIDE_PII", id: convo.id, field })
            : needsReason
              ? dispatch({ type: "OPEN_PII_REVEAL", id: convo.id, field })
              : dispatch({ type: "REVEAL_PII", id: convo.id, field, reason: "" })
        }
        aria-label={`${revealed ? "Hide" : "Reveal"} ${PII_LABEL[field].toLowerCase()} for ${convo.customerName}`}
        className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-dim transition-colors hover:border-coral hover:text-coral"
      >
        {revealed ? t("Hide") : t("Reveal")}
      </button>
    </span>
  );
}
