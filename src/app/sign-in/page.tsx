import type { Metadata } from "next";
import SignIn from "@/features/auth/components/SignIn";
import ChatWidget, { ChatWidgetProvider } from "@/features/widget/components/ChatWidget";

export const metadata: Metadata = {
  title: "Sign In — Takeoff Travels",
  description: "Sign in to your Takeoff Travels workspace.",
};

export default function SignInPage() {
  return (
    <ChatWidgetProvider>
      <SignIn />
      <ChatWidget />
    </ChatWidgetProvider>
  );
}
