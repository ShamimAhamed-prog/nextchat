"use client";

import { useEffect } from "react";
import { useTenantConfig } from "./TenantConfigContext";

/**
 * Two deadlines need someone to notice regardless of which page is open —
 * the same problem `WorkspaceEffects` solves for offer/snooze timers, and
 * the same fix: a watchdog mounted once at the shared layout rather than a
 * timer owned by whichever component happens to be showing the config
 * screen at the moment. ADM-04's scheduled activation applies a batch of
 * changes once its time arrives; break-glass access (ADM-03) expires a
 * temporary elevation once its grant window ends.
 */
export default function TenantConfigEffects() {
  const { state, dispatch } = useTenantConfig();

  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      for (const s of state.scheduled) {
        if (s.effectiveAt <= now) dispatch({ type: "APPLY_SCHEDULED", id: s.id });
      }
      if (state.breakGlass && state.breakGlass.expiresAt <= now) {
        dispatch({ type: "EXPIRE_BREAK_GLASS", id: state.breakGlass.id });
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, [state.scheduled, state.breakGlass, dispatch]);

  return null;
}
