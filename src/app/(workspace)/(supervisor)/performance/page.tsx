import type { Metadata } from "next";
import HumanPerformancePage from "@/features/admin/supervisor/HumanPerformancePage";

export const metadata: Metadata = {
  title: "Human Performance — Takeoff Travels",
  description: "Historical quality, resolution and service-speed scorecards.",
};

export default function Page() {
  return <HumanPerformancePage />;
}
