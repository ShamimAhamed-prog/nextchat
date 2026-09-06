"use client";

import { useEffect, useRef, useState } from "react";
import Container from "./Container";
import GradientButton from "./GradientButton";
import Logo from "./Logo";

const NAV = [
  { label: "Platform", href: "#platform" },
  { label: "Channels", href: "#channels" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/**
 * The frame has no mobile design, so the desktop header is the source of
 * truth and everything below `lg` collapses into a sheet that drops from
 * under the bar: same nav order, same CTA, nothing invented beyond the
 * affordance itself.
 */
export default function Header() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // The sheet overlays the page, so the page behind it must not scroll.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Move focus into the sheet so a keyboard user lands on the nav, not
    // back at the top of the document.
    panelRef.current?.querySelector("a")?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header className="relative z-30 h-[104px]">
      <Container className="flex h-full items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[18px] font-medium leading-[25px] text-white transition-opacity hover:opacity-70"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Wrapper does the hiding: the button's own `inline-flex` would beat `hidden` */}
          <div className="hidden sm:block">
            <GradientButton href="/sign-up">Book A Live Demo</GradientButton>
          </div>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            {/* Three bars that fold into an X — the middle one fades out */}
            <span aria-hidden className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                  open ? "top-[7px] rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                  open ? "top-[7px] -rotate-45" : "top-[14px]"
                }`}
              />
            </span>
          </button>
        </div>
      </Container>

      {open ? (
        <>
          {/* Dismiss on any tap outside the sheet */}
          <div
            className="fixed inset-0 top-[104px] z-10 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            id="mobile-nav"
            ref={panelRef}
            className="absolute inset-x-0 top-[104px] z-20 border-t border-white/10 bg-hero shadow-[0_24px_60px_rgba(0,0,0,0.6)] lg:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {NAV.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[12px] px-3 py-3 text-[18px] font-medium leading-[25px] text-white transition-colors hover:bg-white/10"
                >
                  {item.label}
                </a>
              ))}

              {/* The header CTA hides below `sm`; the sheet is where it comes back */}
              <div className="mt-3 sm:hidden">
                <GradientButton
                  href="/sign-up"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Book A Live Demo
                </GradientButton>
              </div>
            </Container>
          </div>
        </>
      ) : null}
    </header>
  );
}
