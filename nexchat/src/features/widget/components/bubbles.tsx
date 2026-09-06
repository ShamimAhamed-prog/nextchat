"use client";

import { useEffect, useRef, useState } from "react";
import type { FareOffer, Passenger, PassengerType, QuickOption } from "../engine";
import { DEMO_HOLD_SECONDS } from "../engine";
import { fmtBdt } from "@/shared/lib/format";

const TYPE_LABEL: Record<PassengerType, string> = { adult: "Adult", child: "Child", infant: "Infant on lap" };
const TYPE_COLOR: Record<PassengerType, string> = {
  adult: "text-white border-white/25",
  child: "text-amber border-amber/40",
  infant: "text-coral border-coral/40",
};

export function BotText({ text }: { text: string }) {
  return (
    <div className="flex max-w-[85%] flex-col gap-1">
      <p className="whitespace-pre-line rounded-tr-xl rounded-br-xl rounded-tl-sm border border-panel bg-footer px-3.5 py-2.5 text-[13.5px] leading-[1.45] text-ink">
        {text}
      </p>
    </div>
  );
}

export function UserText({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-line rounded-tl-xl rounded-bl-xl rounded-tr-sm bg-[linear-gradient(135deg,var(--color-grad-from),var(--color-grad-to))] px-3.5 py-2.5 text-[13.5px] leading-[1.45] text-white">
        {text}
      </p>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 rounded-tr-xl rounded-br-xl rounded-tl-sm border border-panel bg-footer px-3.5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-dim"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
      <span className="sr-only">Assistant is typing</span>
    </div>
  );
}

export function QuickReplies({ options, active, onPick }: { options: QuickOption[]; active: boolean; onPick: (o: QuickOption) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick replies">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={!active}
          onClick={() => onPick(o)}
          className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            active
              ? "border-coral/50 text-coral hover:bg-coral/10 focus-visible:bg-coral/10"
              : "cursor-default border-panel text-ink-dim opacity-60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FareResults({ offers, active, onSelect }: { offers: FareOffer[]; active: boolean; onSelect: (offerId: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {offers.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={!active}
          onClick={() => onSelect(o.id)}
          className={`card-hairline flex items-center justify-between gap-3 rounded-lg bg-footer px-3.5 py-2.5 text-left transition-colors ${
            active ? "hover:border-coral/60" : "opacity-60"
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-[family-name:var(--font-inter)] text-[13px] font-medium tabular-nums text-ink">
              {o.depart} → {o.arrive}
            </span>
            <span className="text-[11.5px] text-ink-dim">{o.fareFamily}</span>
          </div>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-amber">{fmtBdt(o.priceBdt)}</span>
        </button>
      ))}
    </div>
  );
}

export function RepriceCard({
  original,
  updated,
  changed,
  active,
  onAccept,
  onDecline,
}: {
  original: FareOffer;
  updated: FareOffer;
  changed: boolean;
  active: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className={`card-hairline flex flex-col gap-2.5 rounded-lg bg-footer p-3.5 ${changed ? "border-amber/50" : ""}`}>
      <p className="text-[12.5px] text-ink-dim">
        {changed
          ? "This fare moved since you searched. Here's the current price — please confirm before I hold it."
          : "Confirming today's fare before I hold it."}
      </p>
      <div className="flex items-center justify-between font-[family-name:var(--font-inter)] text-[13px] tabular-nums">
        <span className="text-ink">
          {updated.depart} → {updated.arrive} · {updated.fareFamily}
        </span>
        <span className="flex items-baseline gap-1.5">
          {changed && <span className="text-ink-dim line-through">{fmtBdt(original.priceBdt)}</span>}
          <span className={`font-semibold ${changed ? "text-amber" : "text-ink"}`}>{fmtBdt(updated.priceBdt)}</span>
        </span>
      </div>
      {active && (
        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            onClick={onAccept}
            className="h-8 flex-1 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {changed ? "Confirm new price" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="h-8 rounded-full border border-panel px-3 text-[12.5px] font-medium text-ink transition-colors hover:border-ink-dim"
          >
            Other options
          </button>
        </div>
      )}
    </div>
  );
}

export function PassengerSummary({
  passengers,
  totalBdt,
  active,
  onConfirm,
}: {
  passengers: Passenger[];
  totalBdt: number;
  active: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="card-hairline flex flex-col gap-2.5 rounded-lg bg-footer p-3.5">
      <p className="text-[12.5px] text-ink-dim">Passenger type is derived from date of birth — please confirm it&rsquo;s right.</p>
      <ul className="flex flex-col gap-1.5">
        {passengers.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-[13px] text-ink">
            <span className="truncate">{p.name || `Passenger ${i + 1}`}</span>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TYPE_COLOR[p.type]}`}>{TYPE_LABEL[p.type]}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-panel pt-2 font-[family-name:var(--font-inter)] text-[13px] tabular-nums">
        <span className="text-ink-dim">Total</span>
        <span className="font-semibold text-amber">{fmtBdt(totalBdt)}</span>
      </div>
      {active && (
        <button
          type="button"
          onClick={onConfirm}
          className="h-8 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Confirm and hold the fare
        </button>
      )}
    </div>
  );
}

/*
 * The widget's own hold countdown. Deliberately not the workspace's
 * `dashboard/useCountdown` — the widget does not import from the agent
 * workspace, and this one's deadline is never absent — but it carries the
 * same callback-ref treatment, and for the same reason: keying the interval
 * on `expiresAt` alone while calling a caller's inline arrow is only safe
 * if that arrow is read fresh on each tick.
 */
function useCountdown(expiresAt: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
  const firedRef = useRef(false);

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);

  return remaining;
}

export function HoldCountdown({
  pnr,
  totalBdt,
  expiresAt,
  active,
  onExpire,
  onPay,
}: {
  pnr: string;
  totalBdt: number;
  expiresAt: number;
  active: boolean;
  onExpire: () => void;
  onPay: () => void;
}) {
  const remaining = useCountdown(expiresAt, onExpire);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const urgent = remaining <= 20 && remaining > 0;
  const expired = remaining <= 0;

  return (
    <div className={`card-hairline flex flex-col gap-2.5 rounded-lg bg-footer p-3.5 ${urgent ? "border-red-400/50" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-inter)] text-[12.5px] text-ink-dim">
          PNR <span className="text-ink">{pnr}</span>
        </span>
        <span className={`font-[family-name:var(--font-inter)] text-[13px] font-semibold tabular-nums ${expired ? "text-ink-dim" : urgent ? "text-coral" : "text-amber"}`}>
          {expired ? "Expired" : `${mm}:${ss}`}
        </span>
      </div>
      <div className="flex items-center justify-between font-[family-name:var(--font-inter)] text-[13px] tabular-nums">
        <span className="text-ink-dim">Seats held — pay before the timer ends</span>
        <span className="font-semibold text-ink">{fmtBdt(totalBdt)}</span>
      </div>
      {active && !expired && (
        <button
          type="button"
          onClick={onPay}
          className="h-8 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Pay now
        </button>
      )}
      <p className="text-[10.5px] text-ink-dim">Demo hold — {DEMO_HOLD_SECONDS}s here, 12 minutes in production.</p>
    </div>
  );
}

export function HoldExpiredCard({ active, onRebook }: { active: boolean; onRebook: () => void }) {
  return (
    <div className="card-hairline flex flex-col gap-2 rounded-lg border-amber/40 bg-footer p-3.5">
      <p className="text-[13px] text-ink">Your hold expired before payment came through — the seats were released. Your search is still here.</p>
      {active && (
        <button
          type="button"
          onClick={onRebook}
          className="h-8 self-start rounded-full border border-amber/50 px-3 text-[12.5px] font-medium text-amber transition-colors hover:bg-amber/10"
        >
          Rebook the same fare
        </button>
      )}
    </div>
  );
}

export function PaymentVoidedCard({
  pnr,
  totalBdt,
  active,
  onRebook,
}: {
  pnr: string;
  totalBdt: number;
  active: boolean;
  onRebook: () => void;
}) {
  return (
    <div className="card-hairline flex flex-col gap-2.5 rounded-lg border-coral/40 bg-footer p-3.5">
      <p className="text-[13px] text-ink">
        Your payment for PNR <span className="font-medium">{pnr}</span> went through, but the seat hold had just
        expired before we could confirm it — the seats were released. No ticket was issued.
      </p>
      <div className="flex items-center justify-between font-[family-name:var(--font-inter)] text-[13px] tabular-nums">
        <span className="text-ink-dim">Automatically refunded within 3 business days</span>
        <span className="font-semibold text-ink">{fmtBdt(totalBdt)}</span>
      </div>
      {active && (
        <button
          type="button"
          onClick={onRebook}
          className="h-8 self-start rounded-full border border-coral/50 px-3 text-[12.5px] font-medium text-coral transition-colors hover:bg-coral/10"
        >
          Rebook the same fare
        </button>
      )}
    </div>
  );
}

export function PaymentPanel({
  totalBdt,
  active,
  onSimulate,
}: {
  totalBdt: number;
  active: boolean;
  onSimulate: () => void;
}) {
  const [rail, setRail] = useState<"bkash" | "nagad" | "card">("bkash");
  const rails: { id: "bkash" | "nagad" | "card"; label: string }[] = [
    { id: "bkash", label: "bKash" },
    { id: "nagad", label: "Nagad" },
    { id: "card", label: "Card" },
  ];
  return (
    <div className="card-hairline flex flex-col gap-3 rounded-lg bg-footer p-3.5">
      <div className="flex items-center gap-1.5 text-[11.5px] text-ink-dim">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="5" y="10" width="14" height="9" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        Secure hosted checkout — Takeoff Travels never sees your PIN or card number.
      </div>
      <div className="flex gap-1.5" role="group" aria-label="Payment method">
        {rails.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={rail === r.id}
            onClick={() => setRail(r.id)}
            className={`h-8 flex-1 rounded-full text-[12.5px] font-medium transition-colors ${
              rail === r.id ? "bg-panel text-coral" : "border border-panel text-ink-dim hover:text-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between font-[family-name:var(--font-inter)] text-[13px] tabular-nums">
        <span className="text-ink-dim">Amount</span>
        <span className="font-semibold text-ink">{fmtBdt(totalBdt)}</span>
      </div>
      {active && (
        <button
          type="button"
          onClick={onSimulate}
          className="h-8 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Simulate successful payment
        </button>
      )}
    </div>
  );
}

export function TicketCard({
  pnr,
  originName,
  destName,
  passengers,
  totalBdt,
}: {
  pnr: string;
  originName: string;
  destName: string;
  passengers: Passenger[];
  totalBdt: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-amber/40 bg-footer p-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-amber">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M3 11.5 21 3l-6 18-4-7-8-2.5Z" />
          </svg>
          E-ticket
        </span>
        <span className="font-[family-name:var(--font-inter)] text-[12px] tabular-nums text-ink-dim">PNR {pnr}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2 text-[15px] font-semibold text-ink">
        <span>{originName}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink-dim" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
        <span>{destName}</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {passengers.map((p, i) => (
          <li key={i} className="flex items-center justify-between text-[12.5px] text-ink-dim">
            <span className="truncate text-ink">{p.name || `Passenger ${i + 1}`}</span>
            <span>{TYPE_LABEL[p.type]}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-panel pt-2 font-[family-name:var(--font-inter)] text-[13px] tabular-nums">
        <span className="text-ink-dim">Paid</span>
        <span className="font-semibold text-ink">{fmtBdt(totalBdt)}</span>
      </div>
      <p className="mt-2 text-[11px] text-ink-dim">Sent to your WhatsApp and email as a PDF.</p>
    </div>
  );
}

export function FaqAnswer({ question, answer, source }: { question: string; answer: string; source: string }) {
  return (
    <div className="flex max-w-[85%] flex-col gap-2 rounded-tr-xl rounded-br-xl rounded-tl-sm border border-panel bg-footer px-3.5 py-2.5">
      <p className="text-[11.5px] font-medium text-ink-dim">{question}</p>
      <p className="text-[13.5px] leading-[1.45] text-ink">{answer}</p>
      <p className="flex items-center gap-1 text-[10.5px] text-ink-dim">
        <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M9 12.5 11 14.5 15 9.5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        Source: {source}
      </p>
    </div>
  );
}

export function HandoffCard({ queuePosition }: { queuePosition: number }) {
  return (
    <div className="card-hairline flex items-center gap-3 rounded-lg bg-footer p-3.5">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-coral opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] text-ink">Connecting you to a person — you&rsquo;re #{queuePosition} in line.</p>
        <p className="text-[11.5px] text-ink-dim">Everything above travels with you, so you won&rsquo;t repeat yourself.</p>
      </div>
    </div>
  );
}

export function SystemDivider({ text }: { text: string }) {
  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-panel px-3 py-1 text-[11px] text-ink-dim">{text}</span>
    </div>
  );
}
