import type { Metadata } from "next";
import TicketsPage from "@/features/admin/supervisor/TicketsPage";

export const metadata: Metadata = {
  title: "Tickets — Takeoff Travels",
  description: "Every conversation in the workspace, with a live summary of the set on screen.",
};

export default function Page() {
  return <TicketsPage />;
}
