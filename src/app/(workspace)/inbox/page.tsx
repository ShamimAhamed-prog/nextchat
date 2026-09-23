import type { Metadata } from "next";
import TicketDashboard from "@/features/inbox/components/TicketDashboard";

export const metadata: Metadata = {
  title: "Support Inbox — Nexchatgen",
  description: "Unified ticket inbox across the web widget, WhatsApp and Messenger.",
};

export default function InboxPage() {
  return <TicketDashboard />;
}
