"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "../Logo";

type NavItem = { label: string; href: string; icon: React.ReactNode };

/**
 * The mockup's sidebar groups and labels (Agent workspace / Supervisor /
 * Platform), each mapping to a real route — the design's destinations, minus
 * the omnichannel inbox's own duplicate entry and the customer preview, which
 * was dropped from the dashboard.
 */
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Agent workspace",
    items: [
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
    ],
  },
  {
    label: "Supervisor",
    items: [
      {
        label: "Active workload",
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
        label: "Human performance",
        href: "/performance",
        icon: <path d="M4 19V9m5 10V5m5 14v-7m5 7V3" />,
      },
      {
        label: "AI performance",
        href: "/ai-performance",
        icon: (
          <>
            <rect x="5" y="5" width="14" height="14" rx="3" />
            <path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m14 0h3M2 15h3m14 0h3" />
            <path d="M9 10h.01M15 10h.01M9 15h6" />
          </>
        ),
      },
      {
        label: "Queue control",
        href: "/queues",
        icon: <path d="M4 7h16M4 12h16M4 17h10" />,
      },
      {
        label: "Alerts",
        href: "/alerts",
        icon: <path d="M12 4 3 20h18L12 4Zm0 5v5m0 3v1" />,
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        label: "Administration",
        href: "/admin",
        icon: (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </>
        ),
      },
      {
        label: "Exceptions",
        href: "/exceptions",
        icon: <path d="M12 3 2 21h20L12 3Zm0 6v5m0 3v1" />,
      },
      {
        label: "QA & coaching",
        href: "/qa",
        icon: <path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h4" />,
      },
      {
        label: "KPI & exports",
        href: "/governance",
        icon: <path d="M12 3v18M3 12h18" />,
      },
    ],
  },
];

/**
 * The Figma frame's own 324px sidebar has no mobile counterpart, and its
 * "Collapse sidebar" chevron was decorative — clicking it did nothing. Both
 * are fixed here together: below `lg` the sidebar now defaults to the same
 * icon-only width `DashboardSidebar` already uses on `/inbox` (so a laptop
 * or a phone never has to fit a 324px rail next to real content), and the
 * chevron is wired to a real `collapsed` state that forces that same
 * icon-only width even on a wide screen, for anyone who wants the room.
 *
 * `overflow-y-auto` on the nav: nine destinations plus three group labels
 * runs past a short viewport's height, and this rail has no page scroll of
 * its own to fall back on otherwise.
 *
 * TODO: Add navigation entries for ADM-05 (Integration Secrets) and
 *       ADM-08 (Tenant Export/Deletion) when Platform tab returns.
 *       Both implementations exist in git log; need a home here.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex shrink-0 flex-col gap-3 rounded-3xl bg-footer transition-[width] ${collapsed ? "w-14" : "w-14 lg:w-[240px]"}`}>
      {/* `gap-2` and `min-w-0` on the wordmark: at the narrower rail width the
          brand ran straight into the collapse chevron with nothing between
          them. The mark now truncates rather than colliding. */}
      <div className={`flex items-center gap-2 border-b border-line p-2.5 ${collapsed ? "justify-center" : "justify-center lg:justify-between lg:p-3"}`}>
        <span className={collapsed ? "" : "lg:hidden"}>
          <Logo href={null} markOnly />
        </span>
        <span className={`min-w-0 ${collapsed ? "hidden" : "hidden lg:inline-flex"}`}>
          <Logo href={null} compact />
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className={`hidden h-6 w-6 shrink-0 items-center justify-center rounded border border-ink/40 text-ink lg:flex`}
        >
          <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-1.5 pb-2">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className={`px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-dim ${collapsed ? "hidden" : "hidden lg:block"}`}>
              {group.label}
            </span>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active || undefined}
                  title={collapsed ? item.label : undefined}
                  className={`flex h-9 items-center gap-3 rounded-lg border text-xs font-medium transition-colors ${collapsed ? "justify-center px-0" : "justify-center px-0 lg:justify-start lg:px-2.5"} ${
                    active ? "border-coral bg-panel text-coral-text" : "border-transparent text-ink hover:bg-panel/60"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {item.icon}
                  </svg>
                  <span className={collapsed ? "hidden" : "hidden lg:inline"}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={`m-3 mt-auto flex-col gap-3 rounded-xl bg-panel p-4 ${collapsed ? "hidden" : "hidden lg:flex"}`}>
        <p className="text-xs leading-5 text-ink">
          Upgrade to Growth to unlock Messenger and Instagram.
        </p>
        <button
          type="button"
          className="h-9 w-full rounded-full bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)] text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
        >
          Upgrade Plan
        </button>
      </div>
    </aside>
  );
}
