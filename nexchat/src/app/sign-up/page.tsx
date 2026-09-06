import type { Metadata } from "next";
import SignUp from "@/features/auth/components/SignUp";
import ChatWidget, { ChatWidgetProvider } from "@/features/widget/components/ChatWidget";

export const metadata: Metadata = {
  title: "Sign Up — Takeoff Travels",
  description: "Create your Takeoff Travels workspace.",
};

export default function SignUpPage() {
  return (
    <ChatWidgetProvider>
      <SignUp />
      <ChatWidget />
    </ChatWidgetProvider>
  );
}
