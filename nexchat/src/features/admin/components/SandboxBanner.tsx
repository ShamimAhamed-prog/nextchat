"use client";

import { useTenantConfig } from "./TenantConfigContext";

/**
 * ADM-06. A test mode nobody can see is worse than none: the failure it
 * invites is doing real work in it, or believing you are in it when you are
 * not. So it announces itself on every surface it governs.
 */
export default function SandboxBanner() {
  const { state } = useTenantConfig();
  if (!state.published.brand.sandboxMode) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-violet-border bg-violet-bg px-4 py-3 text-sm text-violet-text"
    >
      <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-fill text-on-accent">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
        </svg>
      </span>
      <span>
        <strong>Sandbox mode.</strong> Messages are simulated rather than
        delivered and booking actions do not move money. Nothing here reaches a
        real customer.
      </span>
    </div>
  );
}
