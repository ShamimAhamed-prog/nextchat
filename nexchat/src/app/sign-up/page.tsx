import type { Metadata } from "next";
import SignUp from "@/components/SignUp";
import ChatWidget, { ChatWidgetProvider } from "@/components/widget/ChatWidget";

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
