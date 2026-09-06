import type { Metadata } from "next";
import ExceptionsPage from "@/components/admin/ExceptionsPage";

export const metadata: Metadata = {
  title: "Exceptions — Takeoff Travels",
  description: "Financial and channel exceptions with a real selector behind them.",
};

export default function Page() {
  return <ExceptionsPage />;
}
