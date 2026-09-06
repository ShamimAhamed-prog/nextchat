import type { Metadata } from "next";
import PackageSelection from "@/components/PackageSelection";
import ChatWidget, { ChatWidgetProvider } from "@/components/widget/ChatWidget";

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
