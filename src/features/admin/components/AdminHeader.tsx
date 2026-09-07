"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useInbox } from "@/features/inbox/context/InboxContext";
import { ThemeToggle } from "@/shared/providers/ThemeContext";
import NotificationsBell from "@/features/inbox/components/NotificationsBell";
import { clearCsrfToken } from "@/shared/lib/csrf";

/**
 * The search box used to be decoration. It now hands its query to the one
 * search that exists (`INB-07`, in `TicketList`) and follows it to `/inbox`,
 * using the same one-shot intent handover `channelFilterIntent` already used
 * for the supervisor's channel drill-down — rather than growing a second,
 * differently-behaved search over the same conversations.
 */
export default function AdminHeader() {
  const { dispatch } = useInbox();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    dispatch({ type: "REQUEST_SEARCH", query: query.trim() });
    router.push("/inbox");
  }

  function handleLogout() {
    clearCsrfToken();
    sessionStorage.clear();
    localStorage.removeItem("theme");
    localStorage.removeItem("locale");
    router.push("/sign-in");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 rounded-2xl bg-footer px-3 sm:gap-5 sm:px-4">
      <form onSubmit={submit} className="flex h-10 min-w-0 flex-1 max-w-[602px] items-center gap-2.5 rounded-xl border border-line bg-card px-3 transition-colors focus-within:border-ink-dim">
        <label className="sr-only" htmlFor="admin-search">
          Search conversations
        </label>
        <button
          type="submit"
          aria-label="Search conversations"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-dim transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
        </button>
        <input
          id="admin-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations — name, PNR, phone, payment ref…"
          className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-dim focus:outline-none"
        />
      </form>

      {/* `relative` anchors the notifications panel, which is a sibling of
          its trigger button rather than a wrapping element — see
          `NotificationsBell.tsx`. */}
      <div className="relative flex shrink-0 items-center gap-2.5">
        <ThemeToggle />

        <NotificationsBell />

        <button
          onClick={handleLogout}
          className="hidden h-8 items-center rounded-full bg-card px-3 text-xs font-medium text-ink-dim transition-colors hover:bg-line hover:text-ink sm:inline-flex"
        >
          Logout
        </button>

        <Image
          src="/figma/ticket/agent.webp"
          alt="Your profile"
          width={32}
          height={32}
          className="h-8 w-8 rounded-full object-cover"
        />
      </div>
    </header>
  );
}
