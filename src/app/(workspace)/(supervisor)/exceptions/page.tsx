import type { Metadata } from "next";
import ExceptionsPage from "@/features/admin/supervisor/ExceptionsPage";

export const metadata: Metadata = {
  title: "Exceptions — Nexchatgen",
  description: "Financial and channel exceptions with a real selector behind them.",
};

export default function Page() {
  return <ExceptionsPage />;
}
