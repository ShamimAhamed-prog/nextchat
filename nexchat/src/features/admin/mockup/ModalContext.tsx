"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ModalId =
  | "intervention"
  | "export"
  | "drilldown"
  | "alert"
  | "qa"
  | "surge"
  | "backfill"
  | "aiReview"
  | "recovery"
  | "channelRecovery"
  | "identity"
  | "killSwitch"
  | "agentDrawer";

type Ctx = {
  active: ModalId | null;
  /** Extra context the opener wants the dialog to show — e.g. an agent name. */
  subject: string | null;
  open: (id: ModalId, subject?: string) => void;
  close: () => void;
  toast: string | null;
  commit: (message: string) => void;
};

const ModalCtx = createContext<Ctx | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ModalId | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const open = useCallback((id: ModalId, s?: string) => {
    setActive(id);
    setSubject(s ?? null);
  }, []);
  const close = useCallback(() => setActive(null), []);
  const commit = useCallback((message: string) => {
    setActive(null);
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo(() => ({ active, subject, open, close, toast, commit }), [active, subject, open, close, toast, commit]);
  return <ModalCtx.Provider value={value}>{children}</ModalCtx.Provider>;
}

/** Returns null outside a provider so primitives stay usable in isolation. */
export function useModal(): Ctx | null {
  return useContext(ModalCtx);
}
