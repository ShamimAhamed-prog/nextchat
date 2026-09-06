"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Glow from "@/shared/ui/Glow";
import { Check } from "@/shared/ui/Check";

/** Step 2 of the onboarding wizard is active; step 1 (Customer info) is complete. */
const STEPS = [
  { label: "Customer info", active: false },
  { label: "Package", active: true },
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    who: "Single channel, single queue",
    features: [
      "Unified inbox — web widget or WhatsApp",
      "Bangla & English AI replies",
      "Agent workspace seats (up to 5)",
      "Basic KPI dashboard",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    who: "Multi-channel, full routing",
    features: [
      "Unified inbox — web widget + WhatsApp",
      "Bangla, English & Banglish AI replies",
      "Automated booking & payment (bKash, Nagad, Card)",
      "Agent workspace seats (up to 25)",
      "Supervisor KPI dashboard & QA sampling",
      "Messenger & Instagram channels",
    ],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    who: "Multi-tenant, dedicated SLA",
    features: [
      "All Growth features",
      "Multi-tenant workspace management",
      "Dedicated SLA & priority support",
      "Custom integrations & API access",
      "Advanced analytics & exports",
      "Dedicated onboarding & training",
    ],
  },
];

export default function PackageSelection() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("growth");

  return (
    <main className="relative flex min-h-screen justify-center overflow-hidden bg-page px-6 pb-20 pt-16 sm:pt-24 lg:pt-[157px]">
      <Glow
        color="#e23c64"
        size={822}
        opacity={0.28}
        className="left-1/2 top-[210px] -translate-x-1/2"
      />
      <Glow
        color="var(--color-amber)"
        size={1044}
        opacity={0.18}
        className="-right-[400px] -top-[600px]"
      />

      <div className="relative z-10 flex w-full max-w-[1100px] flex-col gap-6">
        <div className="flex flex-col gap-10 rounded-panel bg-footer p-8 sm:p-12">
          {/* Progress: step 1 complete, step 2 active */}
          <div className="flex gap-4">
            {STEPS.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm leading-[21px] text-white">{s.label}</span>
                  {s.active ? (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-coral" />
                  ) : null}
                </div>
                <span
                  className={`h-2 w-full rounded-full ${
                    s.active ? "bg-coral" : "bg-panel"
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-[32px] font-bold capitalize leading-[38px] text-white">
                Choose your package
              </h1>
              <p className="text-base leading-6 text-white">
                Select the plan that best fits your support needs.
              </p>
            </div>

            {/* Package cards */}
            <div className="grid gap-6 sm:grid-cols-3">
              {PLANS.map((plan) => {
                const isSelected = selected === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelected(plan.id)}
                    aria-label={`Select ${plan.name} plan`}
                    aria-pressed={isSelected}
                    className={`flex flex-col gap-4 rounded-[20px] border-2 p-6 text-left transition-all ${
                      isSelected
                        ? "border-coral bg-white/[0.06]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    } ${plan.featured ? "relative" : ""}`}
                  >
                    {plan.featured ? (
                      <span className="absolute -top-3 right-4 rounded-full bg-coral px-3 py-0.5 text-xs font-medium text-white">
                        Recommended
                      </span>
                    ) : null}
                    <div>
                      <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                      <p className="mt-1 text-sm text-white/60">{plan.who}</p>
                    </div>
                    <ul className="flex flex-col gap-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm leading-5 text-white/80">
                          <Check className="mt-0.5 text-coral" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/onboarding")}
            className="h-12 rounded-full border border-white/20 px-6 text-base font-medium text-white transition-colors hover:bg-white/10"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              // Persist selected plan and navigate to inbox
              localStorage.setItem("selectedPlan", selected);
              router.push("/inbox");
            }}
            className="h-12 w-[111px] rounded-full bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)] text-base font-medium text-white transition-opacity hover:opacity-90"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
