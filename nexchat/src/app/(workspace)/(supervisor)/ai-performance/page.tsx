import type { Metadata } from "next";
import AiPerformancePage from "@/components/admin/AiPerformancePage";

export const metadata: Metadata = {
  title: "AI Performance — Takeoff Travels",
  description: "Automation quality, confidence calibration and grounded-answer rate.",
};

export default function Page() {
  return <AiPerformancePage />;
}
