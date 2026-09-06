// Next's runtime complaints do not fail a build and do not appear in the DOM:
// the image aspect-ratio warning, the `next/font` fallback notice, hydration
// mismatches, failed resource loads. They only surface to whoever happens to
// have a dev console open, which is exactly how the three aspect-ratio bugs on
// Solution, Steps and TrustBar were found — one at a time, by hand.
//
// This walks every surface and fails on anything the page logs at warning or
// error level, so the next one is caught here instead.
import { consoleSince, goto, ok, sleep, ws } from "../driver.mjs";

const surfaces = [
  "/",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/onboarding/package",
  "/inbox",
  "/dashboard",
  "/admin",
  "/performance",
  "/ai-performance",
  "/queues",
  "/alerts",
  "/exceptions",
  "/qa",
  "/governance",
];

// Noise that is not ours and cannot be fixed from this codebase.
const IGNORE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon\.ico/i,
];

for (const path of surfaces) {
  await goto(path, { width: 1600, height: 1000 });
  await sleep(700);

  const found = consoleSince(["error", "warning", "assert"]).filter(
    (m) => m.text && !IGNORE.some((re) => re.test(m.text)),
  );

  ok(
    `${path} logs nothing at warning or error level`,
    found.length === 0,
    found.length
      ? found
          .slice(0, 3)
          .map((m) => `${m.level}: ${m.text.replace(/\s+/g, " ").slice(0, 150)}`)
          .join(" ;; ")
      : "clean",
  );
}

ws.close();
