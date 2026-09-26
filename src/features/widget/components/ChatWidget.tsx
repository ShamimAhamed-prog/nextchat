"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Logo from "@/shared/ui/Logo";
import WidgetConversation from "./WidgetConversation";

type WidgetContextValue = { isOpen: boolean; open: () => void; close: () => void; toggle: () => void };
const WidgetContext = createContext<WidgetContextValue | null>(null);

export function ChatWidgetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  return <WidgetContext.Provider value={{ isOpen, open, close, toggle }}>{children}</WidgetContext.Provider>;
}

/** Opens/closes the chat widget from anywhere inside `ChatWidgetProvider` — e.g. Hero's "Watch Demo". */
export function useChatWidget(): WidgetContextValue {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error("useChatWidget must be used within a ChatWidgetProvider");
  return ctx;
}

export default function ChatWidget() {
  const { isOpen, close, toggle } = useChatWidget();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes; Tab/Shift+Tab stays trapped inside the panel while open —
  // a minimal focus trap, not a library, since the panel has few controls.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.querySelector<HTMLElement>("#widget-composer")?.focus();
    } else {
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Nexchatgen assistant"
        aria-hidden={!isOpen}
        id="chat-widget-panel"
        inert={!isOpen}
        className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-panel shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-[opacity,transform] duration-200 motion-reduce:transition-none sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:max-h-[calc(100vh-120px)] sm:w-[380px] sm:rounded-2xl sm:border sm:border-panel ${
          isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0 sm:translate-y-0"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-panel bg-footer px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Logo markOnly href={null} />
            <div className="flex flex-col">
              <span className="text-[13.5px] font-semibold leading-tight text-white">Nexchatgen</span>
              <span className="flex items-center gap-1.5 text-[11px] leading-tight text-ink-dim">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#11c340]" />
                Online
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close chat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-panel hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <WidgetConversation />
      </div>

      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls="chat-widget-panel"
        aria-label={isOpen ? "Close chat" : "Chat with Nexchatgen"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-grad-from),var(--color-grad-to))] text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 motion-reduce:transition-none"
      >
        {!isOpen && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-coral/50 motion-safe:animate-ping"
            style={{ animationDuration: "2.4s" }}
          />
        )}
        <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {isOpen ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <>
              <path d="M4 4h16v12H8l-4 4V4Z" />
              <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
              <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
            </>
          )}
        </svg>
      </button>
    </>
  );
}
