import { InboxProvider } from "@/features/inbox/context/InboxContext";
import WorkspaceEffects from "@/features/inbox/components/WorkspaceEffects";
import { TenantConfigProvider } from "@/features/admin/context/TenantConfigContext";
import { UiLocaleProvider } from "@/shared/providers/UiLocale";
import { ThemeProvider } from "@/shared/providers/ThemeContext";
import TenantConfigEffects from "@/features/admin/context/TenantConfigEffects";
import ErrorBoundary from "@/shared/ErrorBoundary";

/**
 * `/inbox`, `/dashboard` and `/admin` share state — a supervisor's "live
 * queue" is meaningless if it's a second, independent fake simulation
 * instead of the same data the agent view is working, and a tenant admin's
 * kill switches need to actually reach the screens they're meant to
 * govern. Next.js layouts persist across navigation between sibling routes
 * under them, so mounting both providers here — not inside any one page —
 * is what makes that state actually survive going from one route to
 * another, rather than resetting on every navigation.
 *
 * `ThemeProvider` is here for the narrower reason that this is the boundary
 * the light theme applies to — the marketing pages are dark-only, and the
 * provider removes `data-theme` on unmount so navigating out of the
 * workspace hands them back the palette they were designed for.
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UiLocaleProvider>
          <InboxProvider>
            <TenantConfigProvider>
              <WorkspaceEffects />
              <TenantConfigEffects />
              {children}
            </TenantConfigProvider>
          </InboxProvider>
        </UiLocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
