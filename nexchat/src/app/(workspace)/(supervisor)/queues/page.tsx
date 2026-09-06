import type { Metadata } from "next";
import QueueControlPage from "@/components/admin/QueueControlPage";

export const metadata: Metadata = {
  title: "Queue Control — Takeoff Travels",
  description: "Capacity per queue and the routing decision behind each case.",
};

export default function Page() {
  return <QueueControlPage />;
}
