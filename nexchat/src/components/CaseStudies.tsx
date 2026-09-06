import { type CSSProperties } from "react";
import Image from "next/image";
import Container from "./Container";
import SectionHeading from "./SectionHeading";
import GradientButton from "./GradientButton";
import Glow from "./Glow";

// TODO: Replace all case study images with licensed stock photography
// depicting Bangladeshi airports/aircraft (Option B decision).
// Current images show invented brands (OneMart, Vapor World, Mati-ta, viora).
const CASES = [
  {
    tag: "Domestic Leisure",
    img: "/figma/case-1.webp",
    body: "Tanvir wants to be at the beach by Friday morning. Four fares priced in one message, the fare held while he pays on bKash, and a ticket that arrives in the same thread he booked in.",
    stat1: { k: "First-contact resolution", v: ">70%" },
    stat2: { k: "Booking window", v: "<4min" },
  },
  {
    tag: "Corporate & Expat",
    img: "/figma/case-2.webp",
    body: "Rahat types Bangla script from Kuala Lumpur and switches to English mid-sentence to spell a passport number. The bot holds context across the switch and knows when the answer is above its pay grade.",
    stat1: { k: "Handover rate", v: "<25%" },
    stat2: { k: "Languages held per session", v: "3" },
  },
  {
    tag: "Group & Tour Operators",
    img: "/figma/case-3.webp",
    body: "Multi-passenger bookings route straight to a human agent with full context attached — adult, child and infant-on-lap fares confirmed before anyone reaches the airport.",
    stat1: { k: "Eligible-agent assignment", v: "<3s p95" },
    stat2: { k: "Passenger types priced correctly", v: "100%" },
  },
  {
    tag: "Disruption Response",
    img: "/figma/case-4.webp",
    body: "A cancelled Cox's Bazar rotation in fog season notifies every affected passenger proactively, in their own language, before they have to ask.",
    stat1: { k: "Paid-not-ticketed resolved", v: "100%" },
    stat2: { k: "First contact", v: "Ours" },
  },
];

export default function CaseStudies() {
  return (
    // `overflow-x-clip` rather than `overflow-hidden`: hidden would make this
    // section a scroll container and stop the cards below from sticking.
    <section className="relative overflow-x-clip pb-12 pt-24">
      <Glow color="var(--color-amber)" size={522} opacity={0.14} className="-left-40 bottom-0" />

      <Container className="relative z-10 flex flex-col gap-8">
        <SectionHeading eyebrow="Who It Serves" title="Case " accent="Studies" bodyWidth={755}>
          Four traveller journeys the platform is designed against, not four
          hypothetical personas.
        </SectionHeading>

        {/* Scroll-driven stack: each card pins 24px below the one before it,
            so they gather into a deck as you scroll instead of scrolling past.
            Below `lg` a card is taller than most viewports, where pinning
            reads as a bug, so the stack only engages from `lg` up and the
            cards stay a plain list on phones. */}
        <div className="flex flex-col gap-6 lg:pb-[120px]">
          {CASES.map((c, i) => (
            <article
              key={c.tag}
              style={{ "--stack-top": `${96 + i * 24}px` } as CSSProperties}
              className="card-hairline grid items-center gap-8 overflow-hidden rounded-[24px] bg-page p-4 lg:sticky lg:top-[var(--stack-top)] lg:grid-cols-[1fr_538px] lg:shadow-[0_-18px_40px_rgba(0,0,0,0.55)]"
            >
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold leading-6">{c.tag}</h3>
                <p className="max-w-[576px] text-xl leading-[30px] text-ink-muted">
                  {c.body}
                </p>

                <dl className="mt-4 flex gap-16">
                  <div>
                    <dt className="text-base font-medium leading-[22px]">
                      {c.stat1.k}
                    </dt>
                    <dd className="text-5xl font-bold leading-[53px]">{c.stat1.v}</dd>
                  </div>
                  <div>
                    <dt className="text-base font-medium leading-[22px]">
                      {c.stat2.k}
                    </dt>
                    <dd className="text-5xl font-bold leading-[53px]">{c.stat2.v}</dd>
                  </div>
                </dl>

                <GradientButton className="mt-4 w-[135px] self-start px-0">
                  Read More
                </GradientButton>
              </div>

              <Image
                src={c.img}
                alt=""
                width={538}
                height={402}
                sizes="(min-width: 1024px) 538px, 100vw"
                className="h-[402px] w-full rounded-[16px] object-cover"
              />
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
