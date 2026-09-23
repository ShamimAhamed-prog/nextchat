"use client";

import { useRouter } from "next/navigation";
import Glow from "@/shared/ui/Glow";
import AuthField from "./AuthField";

/** Step 1 of the onboarding wizard is active; "Package" (step 2) is pending. */
const STEPS = [
  { label: "Customer info", active: true },
  { label: "Package", active: false },
];

export default function CustomerInfo() {
  const router = useRouter();

  return (
    <main className="relative flex min-h-screen justify-center overflow-hidden bg-page px-6 pb-20 pt-16 sm:pt-24 lg:pt-[157px]">
      {/* Toned down from 0.5/0.45. Every other page puts these behind dense
          content, where they read as atmosphere; here they sit on a mostly
          empty background, and amber over rose at that strength mixed into a
          muddy olive-to-maroon wash rather than a glow. */}
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

      <div className="relative z-10 flex w-full max-w-[961px] flex-col gap-6">
        <div className="flex flex-col gap-10 rounded-panel bg-footer p-8 sm:p-12">
          {/* Progress: two steps, first active in coral, second pending in grey */}
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
                Tenant administrator information
              </h1>
              <p className="text-base leading-6 text-white">
                Please provide your details to set up Nexchatgen&rsquo;
                workspace.
              </p>
            </div>

            <form id="customer-info-form" className="flex flex-col gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <AuthField
                  id="firstName"
                  label="First Name"
                  type="text"
                  autoComplete="given-name"
                  defaultValue="Rifat"
                />
                <AuthField
                  id="lastName"
                  label="Last Name"
                  type="text"
                  autoComplete="family-name"
                  defaultValue="Karim"
                />
                <AuthField
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  defaultValue="rifat.karim@nexchatgen.example"
                />
                <AuthField
                  id="phone"
                  label="Phone No"
                  type="tel"
                  autoComplete="tel"
                  defaultValue="01729244578"
                />
              </div>

              {/* The text is one flex item, not five. As a bare flex row each
                  text fragment and link became its own item, so on a narrow
                  screen the sentence broke into a ragged column. */}
              <label className="flex items-start gap-2.5 text-sm font-medium leading-5 text-white">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 h-[19px] w-[19px] shrink-0 rounded border-[#d8d8d8] bg-transparent accent-coral"
                />
                <span>
                  I accept the{" "}
                  <a href="#" onClick={(e) => e.preventDefault()} aria-disabled="true" className="underline opacity-60">
                    privacy policy
                  </a>{" "}
                  and{" "}
                  <a href="#" onClick={(e) => e.preventDefault()} aria-disabled="true" className="underline opacity-60">
                    terms of service
                  </a>
                </span>
              </label>
            </form>
          </div>
        </div>

        <button
          type="submit"
          form="customer-info-form"
          onClick={(e) => {
            e.preventDefault();
            router.push("/onboarding/package");
          }}
          className="h-12 w-[111px] self-end rounded-full bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)] text-base font-medium text-white transition-opacity hover:opacity-90"
        >
          Next
        </button>
      </div>
    </main>
  );
}
