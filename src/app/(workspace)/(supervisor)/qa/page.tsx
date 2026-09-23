import type { Metadata } from "next";
import QaCoachingPage from "@/features/admin/supervisor/QaCoachingPage";

export const metadata: Metadata = {
  title: "QA & Coaching — Nexchatgen",
  description: "Sampling, review queue and agent scorecards.",
};

export default function Page() {
  return <QaCoachingPage />;
}
