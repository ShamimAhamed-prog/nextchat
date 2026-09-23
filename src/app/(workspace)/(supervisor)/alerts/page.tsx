import type { Metadata } from "next";
import AlertsPage from "@/features/admin/supervisor/AlertsPage";

export const metadata: Metadata = {
  title: "Alerts — Nexchatgen",
  description: "SLA, staffing, surge, escalation and channel-health alerts against configured thresholds.",
};

export default function Page() {
  return <AlertsPage />;
}
