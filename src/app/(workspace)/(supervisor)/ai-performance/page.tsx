import type { Metadata } from "next";
import AiPerformancePage from "@/features/admin/supervisor/AiPerformancePage";

export const metadata: Metadata = {
  title: "AI Performance — Nexchatgen",
  description: "Automation quality, confidence calibration and grounded-answer rate.",
};

export default function Page() {
  return <AiPerformancePage />;
}
