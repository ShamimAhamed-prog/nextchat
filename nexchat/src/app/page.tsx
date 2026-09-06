import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import Problem from "@/components/Problem";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import Steps from "@/components/Steps";
import CaseStudies from "@/components/CaseStudies";
import Ecommerce from "@/components/Ecommerce";
import CtaBand from "@/components/CtaBand";
import Pricing from "@/components/Pricing";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import ChatWidget, { ChatWidgetProvider } from "@/components/widget/ChatWidget";

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
