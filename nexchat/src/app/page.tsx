import Hero from "@/features/marketing/components/Hero";
import TrustBar from "@/features/marketing/components/TrustBar";
import Problem from "@/features/marketing/components/Problem";
import Solution from "@/features/marketing/components/Solution";
import Features from "@/features/marketing/components/Features";
import Steps from "@/features/marketing/components/Steps";
import CaseStudies from "@/features/marketing/components/CaseStudies";
import Ecommerce from "@/features/marketing/components/Ecommerce";
import CtaBand from "@/features/marketing/components/CtaBand";
import Pricing from "@/features/marketing/components/Pricing";
import Faq from "@/features/marketing/components/Faq";
import Footer from "@/features/marketing/components/Footer";
import ChatWidget, { ChatWidgetProvider } from "@/features/widget/components/ChatWidget";

export default function Home() {
  return (
    <ChatWidgetProvider>
      <main>
        <Hero />
        <TrustBar />
        <Problem />
        <Solution />
        <Features />
        <Steps />
        <CaseStudies />
        <Ecommerce />
        <CtaBand />
        <Pricing />
        <Faq />
        <Footer />
      </main>
      <ChatWidget />
    </ChatWidgetProvider>
  );
}
