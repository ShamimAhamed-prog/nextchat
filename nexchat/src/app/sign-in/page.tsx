import type { Metadata } from "next";
import SignIn from "@/components/SignIn";
import ChatWidget, { ChatWidgetProvider } from "@/components/widget/ChatWidget";

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
