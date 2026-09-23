import type { Metadata } from "next";
import CustomerInfo from "@/features/auth/components/CustomerInfo";
import ChatWidget, { ChatWidgetProvider } from "@/features/widget/components/ChatWidget";

export const metadata: Metadata = {
  title: "Tenant Setup — Nexchatgen",
  description: "Provide your details to set up Nexchatgen' workspace.",
};

export default function OnboardingPage() {
  return (
    <ChatWidgetProvider>
      <CustomerInfo />
      <ChatWidget />
    </ChatWidgetProvider>
  );
}
