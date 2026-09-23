"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiLocale } from "@/shared/providers/UiLocale";

const NAV = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </>
    ),
  },
  {
    label: "Inbox",
    href: "/inbox",
    icon: (
      <>
        <path d="M3 12h4l2 3h6l2-3h4" strokeLinejoin="round" />
        <rect x="3" y="6" width="18" height="13" rx="2" />
      </>
    ),
  },
  {
    label: "Tickets",
    href: "/tickets",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M9 9v11" />
      </>
    ),
  },
  {
    label: "Settings",
    href: "/admin",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),
  },
];

/** The 56px icon rail on the left of the ticket dashboard: mark, then
 *  grid/inbox/tickets/settings. */
export default function DashboardSidebar() {
  const { t } = useUiLocale();
  const pathname = usePathname();

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-4 rounded-2xl bg-footer px-1.5 py-3">
      <Link
        href="/"
        aria-label="Nexchatgen home"
        title="Nexchatgen home"
        className="flex h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ background: "linear-gradient(160deg,#ffd464 0%,#ff5e5e 100%)" }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#1a1a1a" aria-hidden>
          <path d="M3 11.5 21 3l-6 18-4-7-8-2.5Z" />
        </svg>
      </Link>

      <nav className="flex flex-col gap-1.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={t(item.label)}
              title={t(item.label)}
              aria-current={active || undefined}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                active ? "bg-panel text-coral-text" : "text-ink hover:bg-panel/60"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                {item.icon}
              </svg>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
