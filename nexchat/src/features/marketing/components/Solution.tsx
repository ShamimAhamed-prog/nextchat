"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Container from "./Container";
import SectionHeading from "./SectionHeading";

/**
 * The frame draws three carousel pips here but supplies copy for only the
 * first slide, so the pips were decorative. Slides 2 and 3 are written from
 * the product pillars the rest of the page already states — the unified queue
 * and the deterministic money path — rather than taken from the frame; see
 * README "Deviations from the frame" before treating them as approved copy.
 *
 * TODO: Slides 2 and 3 need product owner sign-off before treating as final copy.
 *       Slide 1 is from the frame. Slides 2-3 are from product pillars.
 */
const SLIDES = [
  {
    lines: ["Personal", "conversation,", "governed "],
    accent: "automation",
    body: "The AI resolves safe, well-grounded work around the clock; deterministic services own booking and money, always.",
  },
  {
    lines: ["One inbox,", "every channel,", "one "],
    accent: "history",
    body: "Web, WhatsApp, Messenger and Instagram arrive in the same queue — a traveller never repeats themselves, and an agent never switches tabs to find out what already happened.",
  },
  {
    lines: ["Money moves", "deterministically,", "never "],
    accent: "improvised",
    body: "Fare holds, idempotent ticketing and automatic reconciliation. A payment is never captured without a ticket to match it.",
  },
];

const AUTOPLAY_MS = 6000;

export default function Solution() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      AUTOPLAY_MS,
    );
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const slide = SLIDES[active];

  return (
    <section
      className="relative overflow-x-clip py-12"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Faint grid that sits behind the right half of the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.06] lg:block"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "140px 140px",
        }}
      />

      <Container className="relative z-10 flex flex-col gap-8">
        <SectionHeading
          eyebrow="Solutions"
          title={
            <>
              answers every traveller so your agents
              <br />
              can{" "}
            </>
          }
          accent="focus on who needs them"
        >
          One conversation core, channel-specific edges
        </SectionHeading>

        <div className="grid items-center gap-[145px] lg:grid-cols-[1fr_404px]">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s.accent}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show slide ${i + 1}`}
                  aria-current={i === active}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active
                      ? "w-[76px] bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))]"
                      : "w-8 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            {/* Reserved height keeps the pips and the card from jumping as the
                slides swap between two and three lines of copy. */}
            <div
              aria-live="polite"
              className="flex flex-col gap-6 lg:min-h-[268px]"
            >
              <h3 className="text-[32px] font-semibold leading-[48px] md:text-[40px]">
                {/* The last entry carries a trailing space and runs into the
                    coral accent on the same line, as the frame sets it. */}
                {slide.lines.map((line, i) => (
                  <span key={line}>
                    {line}
                    {i < slide.lines.length - 1 ? <br /> : null}
                  </span>
                ))}
                <span className="text-coral">{slide.accent}</span>
              </h3>

              <p className="max-w-[420px] text-xl leading-[30px] text-white">
                {slide.body}
              </p>
            </div>
          </div>

          <Image
            src="/figma/solution-card.webp"
            alt=""
            width={404}
            height={717}
            sizes="(min-width: 404px) 404px, 100vw"
            className="h-auto w-full max-w-[404px] justify-self-center rounded-[28px] lg:justify-self-end"
          />
        </div>
      </Container>
    </section>
  );
}
