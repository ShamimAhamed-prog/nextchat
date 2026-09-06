"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthField from "./AuthField";
import TestimonialPanel from "./TestimonialPanel";
import Logo from "@/shared/ui/Logo";
import { getCsrfToken } from "@/shared/lib/csrf";

const SOCIALS = [
  { name: "Google", src: "/figma/signin/google.webp" },
  { name: "Facebook", src: "/figma/signin/facebook.webp" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUp() {
  const router = useRouter();
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const next: typeof errors = {};

    if (!fullName) next.fullName = "Full name is required";
    else if (fullName.length < 2) next.fullName = "Name must be at least 2 characters";

    if (!email) next.email = "Email is required";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address";

    if (!password) next.password = "Password is required";
    else if (password.length < 6) next.password = "Password must be at least 6 characters";

    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    // TODO: wire to real auth API
    setTimeout(() => {
      setLoading(false);
      router.push("/inbox");
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-20">
      <div className="w-full max-w-[1320px] rounded-card bg-footer p-6">
        <div className="grid overflow-hidden lg:h-[942px] lg:grid-cols-[736px_minmax(0,1fr)]">
          <TestimonialPanel />

          {/* Form panel */}
          <section className="flex flex-col items-center justify-center bg-panel px-6 py-16 sm:px-12">
            <div className="flex w-full max-w-[440px] flex-col gap-8">
              <Logo href={null} className="mx-auto" />

              <div className="flex flex-col gap-3 text-center">
                <h1 className="text-[32px] font-bold capitalize leading-[38px] text-white">
                  Create your Account
                </h1>
                <p className="text-base font-medium leading-[22px] text-white">
                  Enter your details to sign up
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
                <input type="hidden" name="_csrf" value={getCsrfToken()} />
                <div className="flex flex-col gap-2">
                  <AuthField
                    id="fullName"
                    label="Full Name"
                    type="text"
                    autoComplete="name"
                    defaultValue="Rifat Karim"
                    aria-invalid={!!errors.fullName}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-[#f53a1d]" role="alert">{errors.fullName}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <AuthField
                    id="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    defaultValue="rifat.karim@takeofftravels.example"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className="text-sm text-[#f53a1d]" role="alert">{errors.email}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <AuthField
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    defaultValue="secret"
                    aria-invalid={!!errors.password}
                  />
                  {errors.password && (
                    <p className="text-sm text-[#f53a1d]" role="alert">{errors.password}</p>
                  )}
                  {/* The frame hides the "Keep me logged in" checkbox here (opacity 0) — only this link shows */}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    aria-disabled="true"
                    className="self-end text-sm leading-[21px] text-coral underline opacity-60"
                  >
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-full bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)] text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Creating account…" : "Sign Up"}
                </button>
              </form>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#e0e5eb]" />
                  <span className="whitespace-nowrap text-sm font-medium leading-5 text-white">
                    Or Sign Up option
                  </span>
                  <span className="h-px flex-1 bg-[#e0e5eb]" />
                </div>

                <div className="flex justify-center gap-3">
                  {SOCIALS.map((s) => (
                    <a
                      key={s.name}
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      aria-label={"Sign up with " + s.name}
                      aria-disabled="true"
                      className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full bg-footer transition-opacity hover:opacity-80 opacity-60"
                    >
                      <Image
                        src={s.src}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6"
                      />
                    </a>
                  ))}

                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    aria-label="Sign up with Apple"
                    aria-disabled="true"
                    className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-full bg-footer transition-opacity hover:opacity-80 opacity-60"
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
                      <path d="M16.4 12.8c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.6 2.1-1.5 2.7-.4 6.6 1.1 8.8.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4s-2.2-.9-2.2-3.5ZM14.3 6.2c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2Z" />
                    </svg>
                  </a>
                </div>
              </div>

              <p className="text-center text-sm font-medium leading-5 text-white">
                Have an account?{" "}
                <a href="/sign-in" className="text-coral underline">
                  Sign In
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
