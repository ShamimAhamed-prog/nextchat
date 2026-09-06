import type { Metadata } from "next";
import QaCoachingPage from "@/components/admin/QaCoachingPage";

export const metadata: Metadata = {
  title: "QA & Coaching — Takeoff Travels",
  description: "Sampling, review queue and agent scorecards.",
};

export default function Page() {
  return <QaCoachingPage />;
}
