"use client";

import { useEffect, useRef } from "react";

/**
 * Shared dialog shell: backdrop, Escape-to-close, a focus trap, and initial
 * focus on the first control. `TransferModal`, `ResolveModal` and
 * `SnoozeModal` all use this rather than each reimplementing the trap
 * `ChatWidget.tsx` already solved once for the chat panel.
 */
export default function Modal({
  titleId,
  onClose,
  wide,
  children,
}: {
  titleId: string;
  onClose: () => void;
  /** The mockup's `.modal.wide`. Its admin dialogs lay fields out two-across
   *  and several run to a dozen of them; at the default 420px those columns
   *  are ~180px each, which is narrower than the values they hold. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim/70 p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`card-hairline w-full rounded-2xl bg-footer p-6 ${wide ? "max-h-[calc(100vh-3rem)] max-w-[820px] overflow-y-auto" : "max-w-[420px]"}`}
      >
        {children}
      </div>
    </div>
  );
}
