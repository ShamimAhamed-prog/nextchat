import type { Metadata } from "next";
import ActiveWorkloadPage from "@/features/admin/supervisor/ActiveWorkloadPage";

export const metadata: Metadata = {
  title: "Active Workload — Nexchatgen",
  description: "Live queue control, capacity and SLA pressure at a glance.",
};

export default function Page() {
  return <ActiveWorkloadPage />;
}
