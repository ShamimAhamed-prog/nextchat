import Container from "./Container";
import GradientButton from "./GradientButton";

export default function CtaBand() {
  return (
    <section className="py-12">
      <div className="relative overflow-hidden py-24">
        {/* The soft vertical wash behind the band */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          }}
        />

        <Container className="relative z-10 flex flex-col items-center gap-6 text-center">
          <span className="flex items-center gap-2 text-base font-medium text-amber">
            <span aria-hidden className="h-px w-4 bg-amber/60" />
            See It In Action
            <span aria-hidden className="h-px w-4 bg-amber/60" />
          </span>

          <h2 className="max-w-[720px] text-[32px] font-semibold leading-tight md:text-[40px] md:leading-[48px]">
            Turn every conversation
            <br />
            into a <span className="text-coral">completed booking.</span>
          </h2>

          <p className="text-xl leading-[30px] text-white">
            Bring your channels, your policy, and your team into one place.
          </p>

          <GradientButton href="/sign-up">Book a demo</GradientButton>
        </Container>
      </div>
    </section>
  );
}
