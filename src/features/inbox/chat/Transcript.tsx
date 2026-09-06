"use client";

/**
 * The conversation history: one row per message, the attachment, translation
 * and reaction affordances a row carries, and the AI draft card that sits
 * below the last message.
 *
 * All of it was inside `ChatPanel.tsx`, which had grown to 1,075 lines
 * holding three separable things — this, the composer, and the shell that
 * arranges them. Nothing here is used anywhere else and nothing is exported
 * beyond `Transcript`; these are private parts of one surface, co-located
 * with it, which is why this is one file rather than six.
 *
 * It owns the scroll position because it owns the scroll container: a new
 * message, a resolved AI draft, or the thinking indicator appearing all mean
 * "scroll to the bottom", and that is nobody else's business.
 */

import { useEffect, useRef, useState } from "react";
import { useInbox } from "../context/InboxContext";
import InitialsAvatar from "@/shared/ui/InitialsAvatar";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { confidenceBand, CONFIDENCE_BAND_LABEL } from "@/features/admin/engine/tenantConfigEngine";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import {
  MAX_SEND_ATTEMPTS,
  type Attachment,
  type Delivery,
  type Conversation,
  type TranscriptMsg,
} from "../engine/inboxEngine";

/**
 * INB-05: an image renders as an image and anything else as a file card with
 * its name and size, rather than every attachment collapsing into a line of
 * text. The file card is also the documented fallback for a type we cannot
 * preview.
 */
function AttachmentBubble({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "location") {
    return (
      <span className="flex items-center gap-2.5 rounded-xl border border-line bg-page px-3 py-2.5">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-coral" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <span className="flex flex-col">
          <span className="text-sm text-ink">{attachment.place ?? attachment.name}</span>
          <span className="text-xs text-ink-dim">Shared location</span>
        </span>
      </span>
    );
  }
  if (attachment.kind === "image") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element --
         a blob: object URL for a file the agent picked a moment ago; there is
         nothing for next/image to fetch, resize or cache. */
      <img
        src={attachment.url}
        alt={attachment.name}
        className="max-h-[220px] w-auto rounded-xl border border-line object-contain"
      />
    );
  }
  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className="flex items-center gap-3 rounded-xl border border-line bg-page px-3 py-2.5 transition-colors hover:border-ink-dim"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-dim" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M14 3v5h5" />
      </svg>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-ink">{attachment.name}</span>
        <span className="text-xs text-ink-dim">{attachment.sizeLabel}</span>
      </span>
    </a>
  );
}

/**
 * AG-04's translation, scoped honestly. The prototype has no translation
 * service, so this reveals a translation stored on the message rather than
 * generating one. Where none exists the control is absent — the alternative,
 * a machine translation invented client-side, would put words in a customer's
 * mouth in a transcript an agent then acts on.
 */
function TranslateToggle({ text }: { text: string }) {
  const { t } = useUiLocale();
  const [shown, setShown] = useState(false);

  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="text-xs font-medium text-ink-dim underline decoration-dotted underline-offset-2 transition-colors hover:text-coral"
      >
        {shown ? t("Hide translation") : t("Translate")}
      </button>
      {shown && (
        <span lang="en" className="rounded-md border border-line bg-page px-2.5 py-1.5 text-sm italic text-ink-muted">
          {text}
        </span>
      )}
    </span>
  );
}

/** INB-05: reactions the channel reported, shown as themselves. */
function Reactions({ msg }: { msg: TranscriptMsg }) {
  if (!msg.reactions?.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {msg.reactions.map((r, i) => (
        <span
          key={i}
          title={`${r.from} reacted ${r.emoji}`}
          className="rounded-full border border-line bg-page px-2 py-0.5 text-xs"
        >
          {r.emoji}
        </span>
      ))}
    </span>
  );
}

/** Tenant config names channels in lowercase ids; the inbox uses labels. */

function DeliveryIndicator({
  delivery,
  onRetry,
}: {
  delivery: Delivery;
  onRetry: () => void;
}) {
  const { t } = useUiLocale();

  if (delivery.state === "failed") {
    const terminal = Boolean(delivery.terminalReason);
    return (
      <span className="flex flex-wrap items-center justify-end gap-2">
        <span className={terminal ? "text-danger-strong" : "text-amber"}>
          {terminal
            ? `${t("Not delivered")} · ${delivery.attempts}/${MAX_SEND_ATTEMPTS}`
            : `${t("Retrying")} ${delivery.attempts}/${MAX_SEND_ATTEMPTS}…`}
        </span>
        {terminal && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-danger-strong px-2.5 py-0.5 text-[11px] font-medium text-danger-strong transition-colors hover:bg-danger-strong/10"
          >
            {t("Retry")}
          </button>
        )}
      </span>
    );
  }

  const LABEL: Record<string, string> = {
    queued: t("Queued"),
    sent: t("Sent"),
    delivered: t("Delivered"),
    read: t("Read"),
  };

  return (
    <span className="flex items-center gap-1 text-ink-dim" title={LABEL[delivery.state]}>
      {delivery.state === "queued" ? (
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 14" className="h-3.5 w-5" fill="none" aria-hidden>
          <path
            d="m1 7 4 4L13 3"
            stroke={delivery.state === "read" ? "var(--color-ok-strong)" : "currentColor"}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* The second tick only appears once the channel reported delivery. */}
          {delivery.state !== "sent" && (
            <path
              d="m7 7 4 4L19 3"
              stroke={delivery.state === "read" ? "var(--color-ok-strong)" : "currentColor"}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
      <span className="text-[11px]">{LABEL[delivery.state]}</span>
    </span>
  );
}

function TranscriptRow({
  msg,
  customerName,
  convoId,
}: {
  msg: TranscriptMsg;
  customerName: string;
  convoId: string;
}) {
  const { dispatch } = useInbox();
  if (msg.from === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-panel px-3 py-1 text-xs text-ink-dim">{msg.text}</span>
      </div>
    );
  }
  if (msg.from === "note") {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[560px] rounded-xl border border-dashed border-amber/50 bg-amber/5 px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M5 4h11l3 3v13H5z" strokeLinejoin="round" />
              <path d="M8 10h8M8 14h5" strokeLinecap="round" />
            </svg>
            Internal note — not sent to the customer
          </p>
          <p className="text-sm leading-relaxed text-ink">{msg.text}</p>
          {msg.mentions?.length ? (
            <p className="mt-1.5 text-xs text-amber/80">Notified: {msg.mentions.join(", ")}</p>
          ) : null}
          <span className="mt-1 block text-xs text-ink-dim">{msg.time}</span>
        </div>
      </div>
    );
  }
  if (msg.from === "customer") {
    return (
      <div className="flex items-end gap-2">
        <InitialsAvatar name={customerName} size={28} />
        <div className="flex max-w-[420px] flex-col gap-1">
          {msg.attachment && <AttachmentBubble attachment={msg.attachment} />}
          {msg.text ? (
            <p className="rounded-tl-xl rounded-tr-xl rounded-br-xl border border-line bg-footer px-4 py-3 text-base font-medium text-ink">{msg.text}</p>
          ) : null}
          {msg.translation && <TranslateToggle text={msg.translation} />}
          <Reactions msg={msg} />
          <span className="text-sm text-ink">{msg.time}</span>
        </div>
      </div>
    );
  }
  if (msg.from === "bot") {
    return (
      <div className="flex items-end gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-bg-deep text-violet-strong" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M12 2 3 6v5c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4Z" />
          </svg>
        </span>
        <div className="flex max-w-[420px] flex-col gap-1">
          {msg.text ? (
            <p className="rounded-tl-xl rounded-tr-xl rounded-br-xl border border-violet-border bg-violet-bg px-4 py-3 text-base font-medium text-violet-text-bright">{msg.text}</p>
          ) : null}
          {msg.translation && <TranslateToggle text={msg.translation} />}
          <span className="text-sm text-ink">{msg.time} · AI</span>
        </div>
      </div>
    );
  }
  return (
    // `data-outbound` is a stable hook for the verification suites. They were
    // selecting on `div.flex.justify-end`, which quietly started matching a
    // right-aligned button row elsewhere in the workspace and made six
    // delivery assertions fail for a reason unrelated to delivery.
    <div className="flex justify-end" data-outbound>
      <div className="flex max-w-[460px] flex-col items-end gap-1">
        {msg.attachment && <AttachmentBubble attachment={msg.attachment} />}
        {msg.text ? (
          <p className="rounded-tl-xl rounded-tr-xl rounded-bl-xl bg-raised-hover px-4 py-3 text-base font-medium text-ink">{msg.text}</p>
        ) : null}
        <span className="flex flex-wrap items-center justify-end gap-1.5 text-sm text-ink">
          {msg.time}
          {msg.delivery && (
            <DeliveryIndicator
              delivery={msg.delivery}
              onRetry={() =>
                dispatch({ type: "RETRY_SEND", id: convoId, msgId: msg.id, manual: true })
              }
            />
          )}
        </span>
      </div>
    </div>
  );
}

function DraftCard({ convo, onEdit }: { convo: Conversation; onEdit: (text: string) => void }) {
  const { dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  if (convo.aiThinking) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-violet-border bg-violet-bg px-4 py-3 text-sm text-violet-text-bright">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-strong" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
        Drafting a reply…
      </div>
    );
  }
  if (!convo.aiDraft) return null;
  // AI-07: the tenant's published bands decide whether a draft may go out
  // untouched. Only `high` does — below it the bot's own score says an agent
  // should look first, so the one-click path is withheld rather than merely
  // labelled. This is what makes the thresholds in Settings load-bearing:
  // lowering `high` past a conversation's score restores the button.
  const bands = tenantState.published.ai.confidence;
  const topConfidence = convo.intentTrail[0]?.confidence ?? 1;
  const band = confidenceBand(topConfidence, bands);
  const directSendAllowed = band === "high";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-violet-strong/60 bg-violet-bg px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-strong">AI suggested reply — not sent yet</span>
        <span className="text-[11px] text-ink-dim">
          {CONFIDENCE_BAND_LABEL[band]} band · {Math.round(topConfidence * 100)}% on {convo.intentTrail[0]?.intent ?? "this intent"}
        </span>
      </div>
      <p className="text-sm text-violet-text-bright">{convo.aiDraft}</p>
      {!directSendAllowed && (
        <p className="text-[11px] leading-relaxed text-warn-strong">
          Below the tenant&rsquo;s High threshold of {Math.round(bands.high * 100)}% — an agent has to read this before it goes out.
        </p>
      )}
      <div className="flex gap-2 pt-1">
        {directSendAllowed && (
          <button
            type="button"
            onClick={() => dispatch({ type: "SEND_MESSAGE", id: convo.id, text: convo.aiDraft! })}
            className="h-8 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-3 text-xs font-medium text-on-accent hover:opacity-90"
          >
            Send as-is
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onEdit(convo.aiDraft ?? "");
            dispatch({ type: "EDIT_AI_DRAFT", id: convo.id });
          }}
          className="h-8 rounded-full border border-line px-3 text-xs font-medium text-ink hover:border-ink-dim"
        >
          Edit before sending
        </button>
        <button type="button" onClick={() => dispatch({ type: "DISCARD_AI_DRAFT", id: convo.id })} className="h-8 rounded-full border border-line px-3 text-xs font-medium text-ink-dim hover:border-ink-dim">
          Discard
        </button>
      </div>
    </div>
  );
}

export default function Transcript({
  convo,
  onEditDraft,
}: {
  convo: Conversation;
  /** Hand the AI's draft to the composer for editing. */
  onEditDraft: (text: string) => void;
}) {
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight });
  }, [convo.transcript.length, convo.aiDraft, convo.aiThinking]);

  return (
    <div ref={historyRef} className="flex flex-1 flex-col gap-6 overflow-y-auto rounded-lg bg-footer px-4 py-6">
      {convo.transcript.map((m) => (
        <TranscriptRow key={m.id} msg={m} customerName={convo.customerName} convoId={convo.id} />
      ))}
      <DraftCard convo={convo} onEdit={onEditDraft} />
    </div>
  );
}
