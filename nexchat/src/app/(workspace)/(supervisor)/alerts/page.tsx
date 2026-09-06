import type { Metadata } from "next";
import AlertsPage from "@/components/admin/AlertsPage";

export const metadata: Metadata = {
  title: "Alerts — Takeoff Travels",
  description: "SLA, staffing, surge, escalation and channel-health alerts against configured thresholds.",
};

export default function Page() {
  return <AlertsPage />;
}
