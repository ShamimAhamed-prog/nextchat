import type { Metadata } from "next";
import TenantAdminConsole from "@/features/admin/components/TenantAdminConsole";

export const metadata: Metadata = {
  title: "Tenant Administration — Takeoff Travels",
  description: "Brand, channels, AI policy, SLAs, security and commercial controls — versioned, audited, and governed.",
};

export default function AdminConfigPage() {
  return <TenantAdminConsole />;
}
