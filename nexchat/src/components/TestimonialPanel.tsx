import Image from "next/image";

/**
 * Left panel shared by /sign-in and /sign-up — identical in both frames
 * (same image refs, same copy, same geometry). Four testimonials; the third
 * is the one showing.
 */
const SEGMENTS = [false, false, true, false];

export default function TestimonialPanel() {
  return (
    <section className="relative isolate hidden overflow-hidden bg-[linear-gradient(180deg,#222126_0%,#111116_100%)] px-[37px] py-[37px] lg:block">
      {/* Two coral blooms low in the panel */}
      <span
        aria-hidden
        className="glow left-[69px] top-[803px] h-[232px] w-[232px]"
        style={{ background: "var(--color-coral)", opacity: 0.35 }}
      />
      <span
        aria-hidden
        className="glow left-[336px] top-[803px] h-[232px] w-[232px]"
        style={{ background: "var(--color-coral)", opacity: 0.35 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-12">
        {/* Which testimonial is showing */}
        <div className="flex gap-[22px]" role="presentation">
          {SEGMENTS.map((active, i) => (
            <span
              key={i}
              className={`h-[11px] flex-1 rounded-full ${
                active ? "bg-amber" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <figure className="flex flex-col gap-6">
          <Image
            src="/figma/signin/quote.svg"
            alt=""
            width={74}
            height={74}
            className="h-[74px] w-[74px]"
          />

          {/* The frame sets Title Case on this text */}
          <blockquote className="text-2xl font-medium capitalize leading-9 text-white">
            The Handover Package Told Me Everything In Five Seconds — What
            The Customer Wanted, What The Bot Already Did, And Whether Money
            Had Moved. That&rsquo;s The Whole Job Made Possible.
          </blockquote>

          <figcaption className="flex items-center justify-between">
            <div className="flex items-center gap-[22px]">
              <Image
                src="/figma/signin/avatar.webp"
                alt=""
                width={74}
                height={74}
                className="h-[74px] w-[74px] rounded-full border border-[#3d3d3d] bg-[#313035] object-cover"
              />
              <div className="flex flex-col gap-[7px]">
                <span className="text-[18px] font-medium leading-[25px] text-white">
                  Shirin Akter
                </span>
                <span className="text-base leading-6 text-white">
                  Support Agent, Takeoff Travels
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex h-[30px] w-[29px] items-center justify-center rounded-[9px] bg-white/20 text-sm font-bold text-coral">
                T
              </span>
              <span className="text-[18px] font-medium leading-[25px] text-white/20">
                Takeoff Travels
              </span>
            </div>
          </figcaption>
        </figure>

        <Image
          src="/figma/hero-dashboard.webp"
          alt=""
          width={662}
          height={543}
          sizes="(min-width: 1024px) 662px, 100vw"
          className="h-auto w-full shrink-0 rounded-xl border border-[#8f8f8f] object-cover"
        />
      </div>
    </section>
  );
}
