import type { Metadata } from "next";
import GovernancePage from "@/features/admin/supervisor/GovernancePage";

export const metadata: Metadata = {
  title: "KPI Governance — Nexchatgen",
  description: "Versioned metric definitions, the canonical KPI catalog and this tenant's permission posture.",
};

export default function Page() {
  return <GovernancePage />;
}
