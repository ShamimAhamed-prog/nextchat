import Image from "next/image";
import Container from "@/shared/ui/Container";

/** Logo strip; the SVG already holds two copies of the six logos, so it loops seamlessly. */
export default function TrustBar() {
  return (
    <section className="py-16">
      <Container className="flex flex-col items-center gap-6">
        <p className="text-base font-bold text-white">
          Built for the platforms Bangladeshi travellers already use — including US-Bangla Airlines
        </p>

        <div className="relative w-full overflow-hidden">
          <Image
            src="/figma/trust-logos.svg"
            alt="trip, Dhaka, foodi, US-Bangla Airlines and cartup"
            width={1320}
            height={88}
            /* `h-auto`, not `h-[88px]`: the strip is 1320×88, so pinning the
               height while the width tracks the container makes the rendered
               ratio drift from the intrinsic one at every width but 1320 —
               which is what Next's aspect-ratio warning was reporting.
               `object-contain` kept it from distorting, at the cost of dead
               vertical space on narrow screens; scaling height with width
               removes both problems. */
            className="h-auto w-full object-contain"
          />
          {/* Feathered edges, as in the frame */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[181px] bg-gradient-to-r from-page to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[181px] bg-gradient-to-l from-page to-transparent" />
        </div>
      </Container>
    </section>
  );
}
