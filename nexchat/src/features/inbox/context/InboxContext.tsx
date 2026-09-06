"use client";

import { createContext, useContext, useReducer } from "react";
import { inboxReducer, initialInboxState, type InboxAction, type InboxState } from "./inboxEngine";

type InboxContextValue = { state: InboxState; dispatch: React.Dispatch<InboxAction> };
const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(inboxReducer, undefined, initialInboxState);
  return <InboxContext.Provider value={{ state, dispatch }}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used within an InboxProvider");
  return ctx;
}
