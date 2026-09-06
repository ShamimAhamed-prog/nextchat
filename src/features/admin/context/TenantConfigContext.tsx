"use client";

import { createContext, useContext, useReducer } from "react";
import { tenantConfigReducer, initialTenantConfigState, type ConfigAction, type TenantConfigState } from "../engine/tenantConfigEngine";

type Ctx = { state: TenantConfigState; dispatch: React.Dispatch<ConfigAction> };
const TenantConfigContext = createContext<Ctx | null>(null);

export function TenantConfigProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tenantConfigReducer, undefined, initialTenantConfigState);
  return <TenantConfigContext.Provider value={{ state, dispatch }}>{children}</TenantConfigContext.Provider>;
}

export function useTenantConfig(): Ctx {
  const ctx = useContext(TenantConfigContext);
  if (!ctx) throw new Error("useTenantConfig must be used within a TenantConfigProvider");
  return ctx;
}
