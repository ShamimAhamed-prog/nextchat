"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useInbox } from "../context/InboxContext";
import { useUiLocale } from "@/shared/providers/UiLocale";

/**
 * Keyboard shortcuts for the loop an agent repeats all day: move down the
 * queue, take the offer, reply, resolve.
 *
 * Two rules make this safe rather than infuriating:
 *
 *  - Nothing fires while the caret is in a field. Without that, typing "n"
 *    into a reply would flip the composer to note mode mid-sentence — the
 *    classic way single-key shortcuts ruin a text-heavy tool.
 *  - Nothing fires while a dialog is open, so a shortcut cannot act on the
 *    conversation behind the modal you are reading.
 *
 * They are discoverable: `?` opens the list, and the workspace shows a hint.
 * A shortcut nobody can find is dead weight.
 */
export type ShortcutActions = {
  next: () => void;
  previous: () => void;
  focusSearch: () => void;
  focusReply: () => void;
  toggleNote: () => void;
};

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "j / k", label: "Next / previous conversation" },
  { keys: "/", label: "Search conversations" },
  { keys: "r", label: "Reply" },
  { keys: "n", label: "Internal note" },
  { keys: "a", label: "Accept the offered conversation" },
  { keys: "e", label: "Resolve the open conversation" },
  { keys: "?", label: "Show this list" },
  { keys: "Esc", label: "Close a dialog" },
];

export default function KeyboardShortcuts({ actions }: { actions: ShortcutActions }) {
  const { state, dispatch } = useInbox();
  const { t } = useUiLocale();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }
      if (isTyping()) return;
      if (document.querySelector('[role="dialog"]') && e.key !== "?") return;

      const selected = state.conversations.find((c) => c.id === state.selectedId);

      switch (e.key) {
        case "j":
          e.preventDefault();
          actions.next();
          break;
        case "k":
          e.preventDefault();
          actions.previous();
          break;
        case "/":
          e.preventDefault();
          actions.focusSearch();
          break;
        case "r":
          e.preventDefault();
          actions.focusReply();
          break;
        case "n":
          e.preventDefault();
          actions.toggleNote();
          break;
        case "a":
          if (selected?.status === "offered") {
            e.preventDefault();
            dispatch({ type: "ACCEPT", id: selected.id });
          }
          break;
        case "e":
          if (selected?.status === "assigned") {
            e.preventDefault();
            dispatch({ type: "OPEN_RESOLVE", id: selected.id });
          }
          break;
        case "?":
          e.preventDefault();
          setHelpOpen(true);
          break;
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.conversations, state.selectedId, actions, dispatch]);

  return (
    <>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-4 right-4 z-40 hidden rounded-full border border-line bg-footer px-3 py-1.5 text-xs text-ink-dim transition-colors hover:border-coral hover:text-coral xl:block"
      >
        {t("Press ? for shortcuts")}
      </button>

      {helpOpen && (
        <Modal titleId="shortcuts-title" onClose={() => setHelpOpen(false)}>
          <h2 id="shortcuts-title" className="text-lg font-bold text-ink">
            {t("Keyboard shortcuts")}
          </h2>
          <p className="mt-1 text-sm text-ink-dim">
            {t("They are ignored while you are typing in a field.")}
          </p>
          <dl className="mt-4 flex flex-col gap-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between gap-4">
                <dt>
                  <kbd className="rounded border border-line bg-page px-2 py-0.5 font-[family-name:var(--font-inter)] text-xs text-ink">
                    {s.keys}
                  </kbd>
                </dt>
                <dd className="text-sm text-ink-muted">{t(s.label)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
            >
              {t("Close")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
