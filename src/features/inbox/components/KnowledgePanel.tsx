"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FAQ } from "@/features/widget/engine";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { useInbox } from "../context/InboxContext";
import { hasTranslation, getTranslation } from "@/shared/lib/translations";

/**
 * AG-04's "knowledge search with sources", and the answer to a gap that was
 * genuinely awkward: an agent taking over a conversation could not look up the
 * policy the bot had just quoted to the customer.
 *
 * It searches `FAQ` — the *same* array the widget answers from — rather than a
 * copy. That is the point rather than a convenience: two knowledge bases drift,
 * and the failure mode is an agent confidently contradicting the bot in the
 * same thread. Every result carries the source and version it came from
 * (`AI-03`), so what the agent quotes is attributable exactly like what the bot
 * quoted.
 *
 * Inserting puts text in the composer and never sends it — AG-04 is explicit
 * that suggestions are not human messages until the agent sends them.
 */
export default function KnowledgePanel({
  onInsert,
  onClose,
  canInsert,
}: {
  onInsert: (text: string) => void;
  onClose: () => void;
  /** False on a conversation this agent does not own — there is no composer
   *  to insert into, but the article is still theirs to read. */
  canInsert: boolean;
}) {
  const { state, dispatch } = useInbox();
  const { t } = useUiLocale();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The pinned article stays in inbox state rather than being copied into
  // local state on mount: clearing it there cleared it before it had been
  // used for anything, so opening a citation showed the whole knowledge base.
  // It is cleared when the agent takes over with a search, or on close.
  const requested = state.knowledgeRequest;

  useEffect(() => {
    if (!requested) inputRef.current?.focus();
  }, [requested]);

  function search(value: string) {
    setQuery(value);
    if (requested) dispatch({ type: "CLEAR_KNOWLEDGE_REQUEST" });
  }

  function close() {
    if (requested) dispatch({ type: "CLEAR_KNOWLEDGE_REQUEST" });
    onClose();
  }

  const results = useMemo(() => {
    // Opened against a specific article — show that one, not a search.
    if (requested) return FAQ.filter((f) => f.id === requested);
    const q = query.trim().toLowerCase();
    if (!q) return FAQ;
    return FAQ.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        // Keywords carry the Bangla terms too, so a Bangla query works.
        f.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [query, requested]) as unknown as { id: string; keywords: string[]; q: string; a: string; aBn: string; source: string }[];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-page p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="knowledge-search" className="text-sm font-medium text-ink">
          {t("Knowledge")}
        </label>
        <button
          type="button"
          onClick={close}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink-dim"
        >
          {t("Close")}
        </button>
      </div>

      <input
        id="knowledge-search"
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder={t("Search approved knowledge…")}
        className="h-9 rounded-lg border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
      />

      {requested && (
        <p className="rounded-md border border-line bg-footer px-3 py-2 text-xs text-ink-dim">
          {t("Showing the article the bot cited on this conversation. Search to see everything.")}
        </p>
      )}

      {results.length === 0 && (
        <p className="py-3 text-center text-sm text-ink-dim">
          {t("Nothing in approved knowledge matches that.")}
        </p>
      )}

      <ul className="flex max-h-[280px] flex-col gap-2 overflow-y-auto">
        {results.map((f) => (
          <li key={f.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <p className="text-sm font-medium text-ink">{f.q}</p>
            <p className="text-sm leading-relaxed text-ink-muted">{f.a}</p>
            <p className="text-xs text-ink-dim">{f.source}</p>
            <div className={`flex flex-wrap gap-2 ${canInsert ? "" : "hidden"}`}>
              <button
                type="button"
                onClick={() => onInsert(f.a)}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral"
              >
                {t("Insert")}
              </button>
              {/* AG-04: Show "Insert in Bangla" only when a translation exists
                  or the translation service can provide one. */}
              {(f.aBn || hasTranslation(f.a, "bn")) && (
                <button
                  type="button"
                  onClick={() => {
                    const translation = f.aBn || getTranslation(f.a, "bn")?.translatedText;
                    if (translation) onInsert(translation);
                  }}
                  lang="bn"
                  className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral"
                >
                  {t("Insert in Bangla")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-ink-dim">
        {t("Inserting puts the text in your composer. Nothing is sent until you send it.")}
      </p>
    </div>
  );
}
