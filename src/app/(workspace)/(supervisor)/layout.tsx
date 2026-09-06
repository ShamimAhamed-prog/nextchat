"use client";

import AdminSidebar from "@/features/admin/components/AdminSidebar";
import AdminHeader from "@/features/admin/components/AdminHeader";
import SandboxBanner from "@/features/admin/components/SandboxBanner";
import { ModalProvider } from "@/features/admin/mockup/ModalContext";
import MockupModals from "@/features/admin/mockup/Modals";

/**
 * Shared shell for every supervisor-facing page (`/dashboard`, `/performance`,
 * `/ai-performance`, `/queues`, `/alerts`, `/exceptions`, `/qa`,
 * `/governance`). These pages replicate the mockup's views directly, so the
 * shell carries the mockup's dialog layer (`MockupModals`) rather than the
 * live conversation modals — every dialog is reachable from the button that
 * opens it in the design.
 */
export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <SupervisorShell>{children}</SupervisorShell>
    </ModalProvider>
  );
}

function SupervisorShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-screen gap-3 overflow-hidden bg-page p-3 sm:gap-4 sm:p-4">
      <AdminSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <AdminHeader />
        <SandboxBanner />

        {/* Filters live inside each view in the mockup, not in the shell, so
            each page renders its own filter row. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">{children}</div>
      </div>

      <MockupModals />
    </main>
  );
}
