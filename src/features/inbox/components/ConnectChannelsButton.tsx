"use client";

import { useEffect, useState } from "react";
import ConnectChannelsModal from "./ConnectChannelsModal";

/**
 * The "+" trigger in the Connected Channels card. Opens the "Connect your
 * social Channels" modal (Figma frame 16685-6041) — a separate frame whose
 * only sensible home is behind the button it was clearly designed to sit
 * behind.
 */
export default function ConnectChannelsButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Connect another channel"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scrim-soft/60 p-6"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[862px]">
            <ConnectChannelsModal onClose={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
