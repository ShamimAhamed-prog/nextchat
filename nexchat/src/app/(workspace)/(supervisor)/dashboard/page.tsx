import type { Metadata } from "next";
import ActiveWorkloadPage from "@/components/admin/ActiveWorkloadPage";

export const metadata: Metadata = {
  title: "Active Workload — Takeoff Travels",
  description: "Live queue control, capacity and SLA pressure at a glance.",
};

export default function Page() {
  return <ActiveWorkloadPage />;
}
