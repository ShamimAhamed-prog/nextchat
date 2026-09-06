import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Self-hosted rather than `next/font/google`.
 *
 * The Google loader fetches at build time, so a build without network access
 * to `fonts.googleapis.com` does not fail — it warns and silently substitutes
 * a system fallback. That is the bad failure mode: CI ships the wrong
 * typeface and nothing goes red. These are the same files the loader would
 * have downloaded (the `latin` subset, from Google's own CSS), committed to
 * `src/app/fonts/`, so every build produces identical output offline.
 *
 * `latin` only, exactly as `subsets: ["latin"]` was before: none of these
 * families ship Bengali glyphs, so the Bangla UI (`NFR-15`) falls through to
 * the system stack as it already did. Adding a Bengali face is a design
 * decision, not a side effect of this change.
 *
 * Inter and Outfit are variable fonts — one file covers the whole weight
 * range, hence `weight: "400 500"`. Poppins ships static instances, so each
 * weight is its own file.
 */
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  src: [
    { path: "./fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-700.woff2", weight: "700", style: "normal" },
  ],
});

const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [{ path: "./fonts/inter-variable.woff2", weight: "400 500", style: "normal" }],
});

const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  display: "swap",
  src: [{ path: "./fonts/space-grotesk-400.woff2", weight: "400", style: "normal" }],
});

const outfit = localFont({
  variable: "--font-outfit",
  display: "swap",
  src: [{ path: "./fonts/outfit-variable.woff2", weight: "400 500", style: "normal" }],
});

export const metadata: Metadata = {
  title: "Takeoff Travels — Omnichannel OTA Support Platform",
  description:
    "One inbox for web, WhatsApp, Messenger and Instagram. A governed AI agent searches, books and supports in Bangla, English and Banglish, and hands off to a human the moment it matters.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /*
     * `suppressHydrationWarning` is here for exactly one attribute:
     * `data-theme`, which `ThemeProvider`'s pre-paint script writes onto
     * `<html>` while the body is still parsing — before React hydrates and
     * necessarily after the server rendered this element without it. That is
     * the point of the script (a light-theme user would otherwise get a dark
     * flash on every entry into the workspace), so the mismatch is expected
     * rather than a bug to chase.
     *
     * It is not a blanket silencer: the prop suppresses mismatches on this
     * element's own attributes and text only, one level deep. Every component
     * inside the tree still reports its own mismatches, which is what
     * `ui-console-clean` and `theme-light` assert on.
     */
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${inter.variable} ${spaceGrotesk.variable} ${outfit.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
