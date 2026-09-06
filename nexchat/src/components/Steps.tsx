import Image from "next/image";
import Container from "./Container";
import SectionHeading from "./SectionHeading";
import Glow from "./Glow";

const CARDS = [
  {
    title: "Connect Your Channels",
    body: "WhatsApp Business first, then the web widget. Messenger and Instagram join in the next release — every message lands in one inbox.",
    img: "/figma/steps-social.webp",
    surface: "bg-coral",
    titleClass: "text-white",
    bodyClass: "text-ink-muted",
  },
  {
    title: "Load Your Policy",
    body: "Fare families, baggage allowance, change fees and Sky Star tiers — the AI only ever answers from an approved, cited document.",
    img: "/figma/steps-website.webp",
    surface: "bg-[#2b2b2b]",
    titleClass: "text-white",
    bodyClass: "text-ink-dim font-[family-name:var(--font-inter)]",
  },
  {
    title: "Set Its Authority",
    body: "Choose what the AI may resolve on its own and what always routes to a person. Booking and payment stay deterministic either way.",
    img: "/figma/steps-ai.webp",
    surface: "bg-amber",
    titleClass: "text-ink-invert",
    bodyClass: "text-ink-invert-muted font-[family-name:var(--font-inter)]",
  },
];

export default function Steps() {
  return (
    <section className="relative overflow-hidden py-12">
      <Glow color="var(--color-amber)" size={522} opacity={0.18} className="-right-40 top-64" />

      <Container className="relative z-10 flex flex-col gap-8">
        <SectionHeading
          eyebrow="Getting Started"
          title="Start in 3-"
          accent="simple Steps"
          bodyWidth={964}
        >
          The same sequence the delivery plan follows: connect channels
          safely first, teach it what&rsquo;s true, then decide what it&rsquo;s
          allowed to do alone.
        </SectionHeading>

        {/* Orb + the bracket that fans out to the three cards */}
        <div className="relative mt-6 flex flex-col items-center">
          <div className="relative h-[200px] w-[200px]">
            {/* Gradient disc with a white four-point star, per the frame */}
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full blur-[60px]"
              style={{ background: "linear-gradient(180deg,#ffd464,#fd5602)", opacity: 0.6 }}
            />
            <div
              className="flex h-full w-full items-center justify-center rounded-full"
              style={{ background: "linear-gradient(160deg,#ffd464 0%,#fd5602 100%)" }}
            >
              <svg viewBox="0 0 100 100" className="h-[64%] w-[64%]" aria-hidden>
                <path
                  d="M50 0 C54 30 70 46 100 50 C70 54 54 70 50 100 C46 70 30 54 0 50 C30 46 46 30 50 0 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
          </div>

          <svg
            aria-hidden
            viewBox="0 0 1320 200"
            preserveAspectRatio="none"
            className="hidden h-[200px] w-full lg:block"
          >
            <path
              d="M660 0 V40 Q660 56 644 56 H228 Q212 56 212 72 V200 M660 40 V200 M660 0 V40 Q660 56 676 56 H1092 Q1108 56 1108 72 V200"
              fill="none"
              stroke="rgb(255 255 255 / 0.18)"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div className="-mt-4 grid gap-6 lg:grid-cols-3">
          {CARDS.map((c) => (
            <article
              key={c.title}
              className={`relative flex h-[380px] flex-col overflow-hidden rounded-[32px] ${c.surface}`}
            >
              <div className="flex flex-col gap-2 p-6">
                <h3 className={`text-2xl font-bold leading-[29px] ${c.titleClass}`}>
                  {c.title}
                </h3>
                <p className={`text-sm leading-[21px] ${c.bodyClass}`}>{c.body}</p>
              </div>

              <Image
                src={c.img}
                alt=""
                width={400}
                height={279}
                className="mt-auto h-auto w-full translate-y-6 px-6 object-contain"
              />
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
