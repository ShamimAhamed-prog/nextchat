import type { Metadata } from "next";
import QueueControlPage from "@/features/admin/supervisor/QueueControlPage";

export const metadata: Metadata = {
  title: "Queue Control — Nexchatgen",
  description: "Capacity per queue and the routing decision behind each case.",
};

export default function Page() {
  return <QueueControlPage />;
}
