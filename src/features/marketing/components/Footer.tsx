"use client";

import Image from "next/image";
import Container from "@/shared/ui/Container";
import Logo from "@/shared/ui/Logo";

const SOCIALS = [
  {
    label: "Facebook",
    path: "M13.5 9H15V6.5h-1.75C11.5 6.5 11 7.6 11 8.75V10H9.5v2.5H11V18h2.5v-5.5h1.75L15.5 10H13.5V9.2c0-.13.09-.2.25-.2Z",
  },
  {
    label: "Twitter",
    path: "M18 7.6a5 5 0 0 1-1.4.4 2.5 2.5 0 0 0 1.1-1.4c-.5.3-1 .5-1.6.6a2.4 2.4 0 0 0-4.2 1.7c0 .2 0 .4.1.6a7 7 0 0 1-5-2.6 2.4 2.4 0 0 0 .8 3.2c-.4 0-.8-.1-1.1-.3a2.4 2.4 0 0 0 2 2.4c-.4.1-.8.1-1.2 0a2.4 2.4 0 0 0 2.2 1.7A4.9 4.9 0 0 1 6 15.9a6.9 6.9 0 0 0 10.7-6.2c.5-.4.9-.9 1.3-1.4Z",
  },
  {
    label: "LinkedIn",
    path: "M8.3 17V9.9H6V17h2.3ZM7.1 8.9a1.3 1.3 0 1 0 0-2.7 1.3 1.3 0 0 0 0 2.7ZM18 17v-4c0-2-1.1-3-2.6-3-1.2 0-1.7.7-2 1.1V9.9H11c0 .6 0 7.1 0 7.1h2.3v-4c0-.2 0-.4.1-.5.2-.4.5-.8 1.1-.8.8 0 1.1.6 1.1 1.5V17H18Z",
  },
  {
    label: "YouTube",
    path: "M18 9.2s-.2-1.1-.6-1.6c-.6-.6-1.2-.6-1.5-.6C13.8 6.8 12 6.8 12 6.8s-1.8 0-3.9.2c-.3 0-.9 0-1.5.6-.4.5-.6 1.6-.6 1.6S5.8 10.5 5.8 11.8v1.2c0 1.3.2 2.6.2 2.6s.2 1.1.6 1.6c.6.6 1.3.6 1.6.6 1.2.1 3.8.2 3.8.2s1.8 0 3.9-.2c.3 0 .9 0 1.5-.6.4-.5.6-1.6.6-1.6s.2-1.3.2-2.6v-1.2c0-1.3-.2-2.6-.2-2.6ZM10.9 14.3V9.9l4 2.2-4 2.2Z",
  },
  {
    label: "Instagram",
    path: "M12 7.6c1.4 0 1.6 0 2.2.1.5 0 .8.1 1 .2.3.1.4.2.6.4.2.2.3.4.4.6.1.2.2.5.2 1 0 .6.1.8.1 2.2s0 1.6-.1 2.2c0 .5-.1.8-.2 1a1.6 1.6 0 0 1-.4.6 1.6 1.6 0 0 1-.6.4c-.2.1-.5.2-1 .2-.6 0-.8.1-2.2.1s-1.6 0-2.2-.1c-.5 0-.8-.1-1-.2a1.6 1.6 0 0 1-.6-.4 1.6 1.6 0 0 1-.4-.6c-.1-.2-.2-.5-.2-1 0-.6-.1-.8-.1-2.2s0-1.6.1-2.2c0-.5.1-.8.2-1a1.6 1.6 0 0 1 .4-.6 1.6 1.6 0 0 1 .6-.4c.2-.1.5-.2 1-.2.6 0 .8-.1 2.2-.1Zm0 2.1a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Zm0 3.9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3.1-4a.6.6 0 1 1-1.1 0 .6.6 0 0 1 1.1 0Z",
  },
];

export default function Footer() {
  return (
    <footer>
      <div className="bg-footer py-12">
        <Container className="flex flex-col gap-[60px]">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-base font-medium leading-[22px]">Call us at</span>
              <a href="tel:+8801700000000" className="break-words text-2xl font-bold leading-[1.2] sm:text-[32px] sm:leading-[38px]">
                +880 1700 000000
              </a>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-base font-medium leading-[22px]">Message us at</span>
              <a href="mailto:support@nexchatgen.example" className="break-words text-2xl font-bold leading-[1.2] sm:text-[32px] sm:leading-[38px]">
                Support@Nexchatgen
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-base font-medium leading-[22px]">
                Subscribe to our Newsletter
              </span>
              <form className="flex items-center gap-2 rounded-full border border-white/25 p-1.5 pl-6">
                <label htmlFor="newsletter" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter"
                  type="email"
                  placeholder="Enter your email"
                  className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-outfit)] text-[18px] leading-[23px] text-white placeholder:text-white/70 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-coral px-5 py-2.5 font-[family-name:var(--font-outfit)] text-sm font-medium leading-[18px] text-white transition-opacity hover:opacity-90"
                >
                  Join Us
                </button>
              </form>
            </div>
          </div>

          <hr className="border-white/15" />

          <div className="flex flex-col gap-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <Logo href={null} />

              <ul className="flex items-center gap-3">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      aria-label={s.label}
                      aria-disabled="true"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2b2b2b] transition-opacity hover:opacity-80 opacity-60"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                        <path d={s.path} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <Image
              src="/figma/payment-methods.svg"
              alt="Mastercard, DBBL, VISA, Nagad, Upay, bKash and Diners Club accepted"
              width={1181}
              height={37}
              className="h-[37px] w-auto max-w-full object-contain object-left"
            />
          </div>
        </Container>
      </div>

      <div className="bg-panel py-6 text-center">
        <p className="font-[family-name:var(--font-inter)] text-[18px] leading-6">
          © 2026 Nexchatgen
        </p>
      </div>
    </footer>
  );
}
