import type { Metadata } from "next";
import SignUp from "@/features/auth/components/SignUp";
import ChatWidget, { ChatWidgetProvider } from "@/features/widget/components/ChatWidget";

export const metadata: Metadata = {
  title: "Sign Up — Nexchatgen",
  description: "Create your Nexchatgen workspace.",
};

export default function SignUpPage() {
  return (
    <ChatWidgetProvider>
      <SignUp />
      <ChatWidget />
    </ChatWidgetProvider>
  );
}
