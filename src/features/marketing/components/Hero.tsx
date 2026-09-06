"use client";

import Image from "next/image";
import Container from "@/shared/ui/Container";
import GradientButton from "@/shared/ui/GradientButton";
import Glow from "@/shared/ui/Glow";
import Header from "./Header";
import { useChatWidget } from "@/features/widget/components/ChatWidget";

/**
 * The hero collage is a 1249x473 stage. Four photos sit behind a taller
 * dashboard shot; nothing is rotated. Percentages keep the arrangement intact
 * as the stage scales down.
 */
/**
 * The stage is `min(1249px, 92vw)` wide and every slot is a percentage of it,
 * so the browser can only pick a sensible srcset entry if `sizes` is written
 * in those same terms.
 */
const stageSizes = (widthPct: string) => {
  const fraction = parseFloat(widthPct) / 100;
  return `min(${Math.round(1249 * fraction)}px, ${(92 * fraction).toFixed(1)}vw)`;
};

const PHOTOS = [
  { src: "/figma/hero-photo-3.webp", left: "0%", top: "16.28%", width: "20.10%", height: "67.02%" },
  { src: "/figma/hero-photo-4.webp", left: "8.17%", top: "9.30%", width: "22.18%", height: "83.72%" },
  { src: "/figma/hero-photo-1.webp", left: "70.62%", top: "9.30%", width: "22.18%", height: "83.72%" },
  { src: "/figma/hero-photo-2.webp", left: "79.90%", top: "14.80%", width: "20.10%", height: "67.02%" },
];

export default function Hero() {
  const { open } = useChatWidget();

  return (
    <section className="relative overflow-hidden bg-hero">
      <Glow
        color="var(--color-glow-rose)"
        size={2084}
        opacity={0.22}
        className="left-1/2 top-[860px] -translate-x-1/2"
      />

      <Header />

      <Container className="relative z-10 flex flex-col items-center pt-[52px]">
        {/* 1056px is the text box in the frame; it puts "human when it matters" on line two */}
        <h1 className="max-w-[1056px] text-center text-[40px] font-semibold leading-tight md:text-[56px] xl:text-[64px] xl:leading-[74px]">
          One inbox. AI first,{" "}
          <span className="text-amber">human when it matters.</span>
        </h1>

        <p className="mt-8 max-w-[760px] text-center text-base leading-6 text-ink-muted">
          Takeoff Travels unifies web, WhatsApp, Messenger and Instagram into
          one conversation. A governed AI agent searches, books and supports
          in Bangla, English and Banglish — and hands off to a human the
          moment it matters.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <GradientButton variant="outline" onClick={open}>
            Try It Live
          </GradientButton>
          <GradientButton href="/sign-up">Book A Live Demo</GradientButton>
        </div>
      </Container>

      {/* Stage is clipped at the section edge, exactly as the frame does */}
      <div className="relative z-10 mx-auto mt-14 h-[calc(min(1249px,92vw)*0.337)] w-[min(1249px,92vw)] overflow-hidden">
        <div className="relative aspect-[1249/473] w-full">
          {PHOTOS.map((p) => (
            <Image
              key={p.src}
              src={p.src}
              alt=""
              width={277}
              height={396}
              sizes={stageSizes(p.width)}
              className="absolute rounded-[21px] object-cover"
              style={{ left: p.left, top: p.top, width: p.width, height: p.height }}
            />
          ))}

          <Image
            src="/figma/hero-dashboard.webp"
            alt="Illustrative unified inbox mockup — the shipped Takeoff Travels dashboard is shown at /inbox"
            width={832}
            height={473}
            sizes={stageSizes("66.61%")}
            preload
            className="absolute rounded-[21px] shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
            style={{ left: "18.49%", top: 0, width: "66.61%", height: "100%" }}
          />
        </div>
      </div>
    </section>
  );
}
