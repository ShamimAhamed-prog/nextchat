import Container from "@/shared/ui/Container";
import SectionHeading from "@/shared/ui/SectionHeading";
import GradientButton from "@/shared/ui/GradientButton";
import Glow from "@/shared/ui/Glow";
import { Check } from "@/shared/ui/Check";

const FEATURES = [
  "Unified inbox — web widget + WhatsApp",
  "Bangla, English & Banglish AI replies",
  "Automated booking & payment (bKash, Nagad, Card)",
  "Agent workspace seats",
  "Supervisor KPI dashboard & QA sampling",
  "Messenger & Instagram channels",
  "Dedicated onboarding & SLA support",
];

const PLANS = [
  { name: "Starter", who: "Single channel, single queue", price: "Custom", featured: false },
  { name: "Growth", who: "Multi-channel, full routing", price: "Custom", featured: true },
  { name: "Enterprise", who: "Multi-tenant, dedicated SLA", price: "Custom", featured: false },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden py-12">
      <Glow color="var(--color-amber)" size={530} opacity={0.12} className="-right-60 top-16" />
      <Glow color="var(--color-coral)" size={522} opacity={0.12} className="-left-[403px] top-20" />

      <Container className="relative z-10 flex flex-col gap-8">
        <SectionHeading eyebrow="Pricing" title="Subscription " accent="Plans" bodyWidth={964}>
          Priced against measured traffic, tokens and agent time — not a
          flat &ldquo;per chat&rdquo; guess. Talk to sales for contracted
          rates against your expected volume.
        </SectionHeading>

        {/* Feature column + three plan columns; the middle one is raised on a panel */}
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid min-w-[1000px] grid-cols-[265px_repeat(3,minmax(0,1fr))]">
            {/* Header row */}
            <div />
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col items-center gap-2 rounded-t-[24px] px-6 pb-8 pt-10 ${
                  p.featured ? "bg-white/[0.04]" : ""
                }`}
              >
                <h3 className="text-xl font-medium leading-7">{p.name}</h3>
                <p className="font-[family-name:var(--font-space-grotesk)] text-sm leading-6 text-white">
                  {p.who}
                </p>
                <p
                  className={`mt-4 text-[56px] font-bold leading-[62px] ${
                    p.featured ? "text-amber" : "text-white"
                  }`}
                >
                  {p.price}
                </p>
                <p
                  className={`font-[family-name:var(--font-inter)] text-base font-medium leading-4 ${
                    p.featured ? "text-amber" : "text-white"
                  }`}
                >
                  contact sales
                </p>
              </div>
            ))}

            {/* "Main features" label sits on the first body row */}
            <div className="flex items-end pb-6 pl-1">
              <h4 className="text-xl font-bold leading-[26px]">Main features</h4>
            </div>
            {PLANS.map((p) => (
              <div key={p.name} className={p.featured ? "bg-white/[0.04]" : ""} />
            ))}

            {/* Feature rows */}
            {FEATURES.map((f) => (
              <FeatureRow key={f} label={f} />
            ))}

            {/* CTA row */}
            <div />
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`flex justify-center rounded-b-[24px] px-6 pb-10 pt-8 ${
                  p.featured ? "bg-white/[0.04]" : ""
                }`}
              >
                {p.featured ? (
                  <GradientButton>Select This plan</GradientButton>
                ) : (
                  <GradientButton variant="outline">Select This plan</GradientButton>
                )}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <>
      <div className="mr-12 border-b border-white/10 py-5 pl-1">
        <span className="font-[family-name:var(--font-inter)] text-base leading-6 text-white">
          {label}
        </span>
      </div>
      {PLANS.map((p) => (
        <div
          key={p.name}
          className={`flex items-center justify-center border-b border-white/10 py-5 ${
            p.featured ? "bg-white/[0.04]" : ""
          }`}
        >
          <Check className="text-white" />
        </div>
      ))}
    </>
  );
}
