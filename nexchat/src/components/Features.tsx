"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Container from "./Container";
import SectionHeading from "./SectionHeading";
import Glow from "./Glow";

// TODO: Replace all feature images with licensed stock photography
// depicting Bangladeshi airports/aircraft (Option B decision).
// Current images show invented brands (OneMart, Vapor World, Mati-ta, viora).
const CARDS = [
  {
    img: "/figma/feature-1.webp",
    title: "Search & Book",
    body: "Origin, destination, dates and passengers collected in one thread, priced against live inventory, held and paid without leaving the chat.",
  },
  {
    img: "/figma/feature-2.webp",
    title: "Multi Lingual",
    body: "Takeoff Travels replies naturally in the language your customers use. That can be Bangla, English, or Banglish.",
  },
  {
    img: "/figma/feature-4.webp",
    title: "Governed Handoff",
    body: "The AI never improvises on money or identity. When a case is risky or uncertain, it hands off decisively — with full context attached.",
  },
  {
    img: "/figma/feature-3.webp",
    title: "All In One Inbox",
    body: "Every web, WhatsApp, Messenger and Instagram message lands in a single dashboard, organized with filters.",
  },
  {
    img: "/figma/feature-5.webp",
    title: "Safe Money Path",
    body: "Fare holds, idempotent ticketing and automatic reconciliation mean a payment can never be captured without a ticket left unresolved.",
  },
];

const AUTOPLAY_MS = 5000;

export default function Features() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  /**
   * The cards are laid out by the browser — staggered, and with a left pad
   * that tracks the viewport — so the scroll offset of card `i` is read off
   * the DOM rather than computed from a fixed card width.
   */
  const scrollToCard = useCallback((i: number, smooth = true) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = scroller.querySelectorAll<HTMLElement>("[data-card]");
    const target = cards[i];
    if (!target || !cards[0]) return;
    scroller.scrollTo({
      left: target.offsetLeft - cards[0].offsetLeft,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Follow the scroller rather than assuming our own clicks are the only
  // thing moving it: a swipe or a trackpad flick has to update the pips too.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onScroll = () => {
      const cards = scroller.querySelectorAll<HTMLElement>("[data-card]");
      if (!cards.length) return;
      const origin = cards[0].offsetLeft;
      let nearest = 0;
      let best = Infinity;
      cards.forEach((card, i) => {
        const distance = Math.abs(card.offsetLeft - origin - scroller.scrollLeft);
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });
      setActive(nearest);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (paused) return;
    // Motion nobody asked for is what this query exists to suppress.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setActive((i) => {
        const next = (i + 1) % CARDS.length;
        scrollToCard(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, scrollToCard]);

  // Autoplay left running in a background tab just lands mid-scroll when the
  // user comes back to it.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const step = (delta: number) => {
    const next = (active + delta + CARDS.length) % CARDS.length;
    setActive(next);
    scrollToCard(next);
  };

  return (
    <section
      id="platform"
      className="relative overflow-x-clip pb-24 pt-12"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Glow
        color="var(--color-glow-green)"
        size={401}
        opacity={0.55}
        className="-left-[133px] top-3"
      />

      <Container className="relative z-10 flex flex-col gap-8">
        <SectionHeading
          eyebrow="Feature"
          title="What Takeoff Travels "
          accent="Does"
        >
          Every capability below traces back to an approved requirement — not
          a demo trick. Search, book, support and hand off, in the language
          your traveller actually types.
        </SectionHeading>
      </Container>

      {/* Cards overflow the container and scroll horizontally, staggered 67px */}
      <div
        ref={scrollerRef}
        role="group"
        aria-label="Feature cards"
        tabIndex={0}
        className="relative z-10 mt-8 snap-x snap-mandatory scroll-pl-6 overflow-x-auto pb-4 [scrollbar-width:none] xl:scroll-pl-[max(24px,calc((100vw-1320px)/2))] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max gap-6 px-6 xl:pl-[max(24px,calc((100vw-1320px)/2))]">
          {CARDS.map((c, i) => (
            <article
              key={c.title}
              data-card
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${CARDS.length}: ${c.title}`}
              className={`flex w-[357px] shrink-0 snap-start flex-col gap-7 ${
                i % 2 === 1 ? "mt-[67px]" : ""
              }`}
            >
              {/* #3d3d3d panel with a rose bloom behind the mockup, per the frame */}
              <div className="relative h-[438px] w-[357px] overflow-hidden rounded-card bg-[#3d3d3d]">
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
                  style={{ background: "#e23c64", opacity: 0.55 }}
                />
                <Image
                  src={c.img}
                  alt={c.title}
                  width={357}
                  height={438}
                  className="relative h-full w-full object-fill"
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold leading-6">{c.title}</h3>
                <p className="text-base leading-6 text-white">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Container className="relative z-10 mt-6 flex items-center justify-between gap-6">
        {/* Same pip treatment the Solution section uses, wired to this scroller */}
        <div className="flex items-center gap-2">
          {CARDS.map((c, i) => (
            <button
              key={c.title}
              type="button"
              onClick={() => {
                setActive(i);
                scrollToCard(i);
              }}
              aria-label={`Show ${c.title}`}
              aria-current={i === active}
              className={`h-1.5 rounded-full transition-all ${
                i === active
                  ? "w-[76px] bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))]"
                  : "w-8 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <CarouselArrow label="Previous feature" onClick={() => step(-1)} />
          <CarouselArrow label="Next feature" forward onClick={() => step(1)} />
        </div>
      </Container>
    </section>
  );
}

function CarouselArrow({
  label,
  onClick,
  forward = false,
}: {
  label: string;
  onClick: () => void;
  forward?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d={forward ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
