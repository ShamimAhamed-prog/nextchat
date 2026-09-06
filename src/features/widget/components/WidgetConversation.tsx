"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  initialState,
  widgetReducer,
  type ChatMsg,
  type QuickOption,
  type WidgetAction,
} from "../engine";
import {
  BotText,
  UserText,
  TypingIndicator,
  QuickReplies,
  FareResults,
  RepriceCard,
  PassengerSummary,
  HoldCountdown,
  HoldExpiredCard,
  PaymentVoidedCard,
  PaymentPanel,
  TicketCard,
  FaqAnswer,
  HandoffCard,
  SystemDivider,
} from "./bubbles";

const LOCALE_LABEL: Record<string, string> = { bn: "বাংলা detected", banglish: "Banglish detected" };

function placeholderFor(phase: string, field: string): string {
  if (phase === "collect-passenger") {
    if (field === "dob") return "YYYY-MM-DD";
    if (field === "nid") return "NID or passport number";
    return "Full name, as on your NID or passport";
  }
  if (phase === "manage-pnr") return "Enter your PNR";
  if (phase === "collect-origin" || phase === "collect-dest") return "Type a city, or tap one below";
  return "Type Bangla, English or Banglish…";
}

export default function WidgetConversation() {
  const [state, dispatch] = useReducer(widgetReducer, undefined, initialState);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Resolve a queued "bot is typing, then replies" turn.
  useEffect(() => {
    if (!state.pending) return;
    const t = window.setTimeout(() => dispatch(state.pending!.action), state.pending.delayMs);
    return () => window.clearTimeout(t);
  }, [state.pending]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [state.messages.length]);

  const busy = Boolean(state.pending);

  function send(text: string) {
    if (!text.trim() || busy) return;
    dispatch({ type: "USER_TEXT", text });
    setDraft("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.phase === "manage-pnr" && draft.trim()) {
      dispatch({ type: "LOOKUP_PNR", pnr: draft.trim() });
      setDraft("");
      return;
    }
    send(draft);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-3.5">
        {state.messages.map((m, i) => (
          <MessageRow key={m.id} msg={m} active={i === state.messages.length - 1} dispatch={dispatch} />
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t border-panel px-3 py-2.5">
        {state.locale !== "en" && (
          <span className="self-start rounded-full bg-panel px-2.5 py-0.5 text-[10.5px] text-amber">{LOCALE_LABEL[state.locale]}</span>
        )}
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="widget-composer">
            Message
          </label>
          <input
            id="widget-composer"
            type="text"
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholderFor(state.phase, state.passengerField)}
            className="h-9 min-w-0 flex-1 rounded-full border border-panel bg-page px-3.5 text-[13px] text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-grad-from),var(--color-grad-to))] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M3 11.5 21 3l-6 18-4-7-8-2.5Z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageRow({ msg, active, dispatch }: { msg: ChatMsg; active: boolean; dispatch: React.Dispatch<WidgetAction> }) {
  switch (msg.kind) {
    case "bot-text":
      return <BotText text={msg.text} />;
    case "user-text":
      return <UserText text={msg.text} />;
    case "typing":
      return <TypingIndicator />;
    case "quick-replies":
      return (
        <QuickReplies
          options={msg.options as QuickOption[]}
          active={active}
          onPick={(o) => dispatch(o.action)}
        />
      );
    case "fare-results":
      return <FareResults offers={msg.offers} active={active} onSelect={(offerId) => dispatch({ type: "SELECT_OFFER", offerId })} />;
    case "reprice":
      return (
        <RepriceCard
          original={msg.original}
          updated={msg.updated}
          changed={msg.changed}
          active={active}
          onAccept={() => dispatch({ type: "ACCEPT_REPRICE" })}
          onDecline={() => dispatch({ type: "DECLINE_REPRICE" })}
        />
      );
    case "passenger-summary":
      return (
        <PassengerSummary
          passengers={msg.passengers}
          totalBdt={msg.totalBdt}
          active={active}
          onConfirm={() => dispatch({ type: "CONFIRM_PASSENGERS" })}
        />
      );
    case "hold":
      return (
        <HoldCountdown
          pnr={msg.pnr}
          totalBdt={msg.totalBdt}
          expiresAt={msg.expiresAt}
          active={active}
          onExpire={() => dispatch({ type: "HOLD_EXPIRED" })}
          onPay={() => dispatch({ type: "START_PAYMENT" })}
        />
      );
    case "hold-expired":
      return <HoldExpiredCard active={active} onRebook={() => dispatch({ type: "REBOOK_SAME_FARE" })} />;
    case "payment-voided":
      return (
        <PaymentVoidedCard
          pnr={msg.pnr}
          totalBdt={msg.totalBdt}
          active={active}
          onRebook={() => dispatch({ type: "REBOOK_SAME_FARE" })}
        />
      );
    case "payment-panel":
      return <PaymentPanel totalBdt={msg.totalBdt} active={active} onSimulate={() => dispatch({ type: "SIMULATE_PAYMENT" })} />;
    case "ticket":
      return (
        <TicketCard
          pnr={msg.pnr}
          originName={msg.origin.name}
          destName={msg.dest.name}
          passengers={msg.passengers}
          totalBdt={msg.totalBdt}
        />
      );
    case "faq-answer":
      return <FaqAnswer question={msg.question} answer={msg.answer} source={msg.source} />;
    case "handoff":
      return <HandoffCard queuePosition={msg.queuePosition} />;
    case "system":
      return <SystemDivider text={msg.text} />;
    default:
      return null;
  }
}
