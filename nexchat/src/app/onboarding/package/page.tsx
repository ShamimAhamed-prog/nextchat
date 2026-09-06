import type { Metadata } from "next";
import PackageSelection from "@/features/auth/components/PackageSelection";
import ChatWidget, { ChatWidgetProvider } from "@/features/widget/components/ChatWidget";

export const metadata: Metadata = {
  title: "Choose Package — Takeoff Travels",
  description: "Select the plan that best fits your support needs.",
};

export default function OnboardingPackagePage() {
  return (
    <ChatWidgetProvider>
      <PackageSelection />
      <ChatWidget />
    </ChatWidgetProvider>
  );
}
