import { consoleSince, evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";
import { AUDIT } from "../audit.mjs";

/**
 * The light theme, end to end.
 *
 * Three things are worth asserting mechanically and none of them are visible
 * in a screenshot review:
 *
 *  1. The palette actually holds AA. A light theme is where contrast quietly
 *     dies — pale status tints and a brand coral that measures 2.6:1 on white
 *     are both easy to ship and impossible to spot by eye.
 *  2. Nothing still names a dark literal. Every workspace colour goes through
 *     a token, so a component that kept `#ffffff` shows up as white text on a
 *     white card. The sweep below catches that as a contrast finding.
 *  3. The theme does not leak onto the marketing pages, which are dark-only,
 *     and the pre-paint script does not cause a hydration mismatch.
 */

// ---- The toggle is where it was asked for, next to notifications ---------
await goto("/inbox", { width: 1600, height: 950 });

const beside = await evaluate(`(() => {
  // Prefix match, not equality: the bell's accessible name carries the
  // unread count whenever there is one.
  const bell = [...document.querySelectorAll('button[aria-label]')]
    .find((b) => /^(Notifications|\\u09a8\\u09cb\\u099f\\u09bf\\u09ab\\u09bf\\u0995\\u09c7\\u09b6\\u09a8)/
      .test(b.getAttribute('aria-label')));
  const toggle = document.querySelector('[aria-label="Toggle light and dark theme"]');
  if (!bell || !toggle) return "missing:" + (!bell ? "bell " : "") + (!toggle ? "toggle" : "");
  return toggle.nextElementSibling === bell ? "adjacent" : "separated";
})()`);
ok("the theme toggle sits beside the notifications bell", beside === "adjacent", beside);

// ---- Switching, and remembering ------------------------------------------
await evaluate(`document.querySelector('[aria-label="Toggle light and dark theme"]').click()`);
await sleep(300);
ok("clicking it puts the document in the light theme",
   (await evaluate(`document.documentElement.dataset.theme`)) === "light");
ok("and the page background actually changes",
   (await evaluate(`getComputedStyle(document.body).backgroundColor`)) === "rgb(249, 250, 251)",
   await evaluate(`getComputedStyle(document.body).backgroundColor`));
ok("the choice is stored", (await evaluate(`localStorage.getItem("takeoff.theme")`)) === "light");

// ---- Applied before paint on the next load, without a hydration warning ---
await goto("/inbox", { width: 1600, height: 950 });
ok("a fresh load comes up light with no toggling needed",
   (await evaluate(`document.documentElement.dataset.theme`)) === "light");
const noisy = consoleSince(["error", "warning"]).filter((m) => !/Download the React DevTools/.test(m.text));
ok("the pre-paint script does not trip a hydration warning", noisy.length === 0,
   noisy.map((m) => m.level + ": " + m.text.slice(0, 90)).join(" ;; ") || "clean");

// ---- The palette holds AA on every gated surface --------------------------
for (const path of ["/inbox", "/dashboard", "/admin"]) {
  await goto(path, { width: 1600, height: 950 });
  await sleep(500);
  ok(`${path} is in the light theme`, (await evaluate(`document.documentElement.dataset.theme`)) === "light");
  const r = await evaluate(AUDIT);
  const total = Object.values(r).reduce((n, a) => n + a.length, 0);
  const detail = Object.entries(r)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k}(${v.length}): ${[...new Set(v)].slice(0, 4).join(" | ")}`)
    .join(" ;; ");
  ok(`${path} has no mechanical accessibility findings in light`, total === 0, detail || "clean");
  await shot("theme-light" + path.replace(/\//g, "-"));
}

/*
 * ---- The two surfaces the sweep structurally cannot reach ---------------
 *
 * `audit.mjs`'s `bgOf` returns null the moment it meets a
 * `background-image`, on purpose: walking past a gradient and blaming the
 * page behind it reports the white label on the brand button as 1.1:1, a
 * finding that is not real and that buries the ones that are. The cost is
 * that a tag chip — a `color-mix()` gradient with pale text on it — is
 * skipped rather than checked, and `DetailsPanel`'s booking-state text is
 * only ever seen in whichever state the selected conversation happens to
 * be in.
 *
 * So these are measured from the tokens instead, which is the one place
 * every case exists at once: mix each gradient stop 25% over the card the
 * way the chip does, and contrast that against the text token. No regexes
 * in the page expression — a `\s` written in a suite reaches the browser as
 * a bare `s`.
 */
const CONTRAST = `
  (() => {
    const cs = getComputedStyle(document.documentElement);
    const tok = (n) => cs.getPropertyValue(n).trim();
    const hex = (h) => {
      const v = h.charAt(0) === '#' ? h.slice(1) : h;
      const full = v.length === 3 ? v.charAt(0)+v.charAt(0)+v.charAt(1)+v.charAt(1)+v.charAt(2)+v.charAt(2) : v;
      return [0, 2, 4].map((i) => parseInt(full.substr(i, 2), 16));
    };
    const lum = (c) => {
      const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    const ratio = (f, b) => {
      const L1 = lum(f), L2 = lum(b);
      return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    };
    // The chip paints color-mix(in srgb, <stop> 25%, transparent) over the card.
    const mix = (stop, card, pct) => stop.map((v, i) => Math.round(v * pct + card[i] * (1 - pct)));

    const card = hex(tok('--color-card'));
    const out = [];
    for (const tag of ['vip', 'repeat', 'route', 'wallet']) {
      const text = hex(tok('--color-tag-' + tag + '-text'));
      for (const stop of ['from', 'to']) {
        const bg = mix(hex(tok('--color-tag-' + tag + '-' + stop)), card, 0.25);
        out.push({ what: 'tag ' + tag + ' text on its ' + stop + ' stop', ratio: ratio(text, bg) });
      }
    }
    for (const b of ['searching', 'paid']) {
      out.push({ what: 'booking ' + b + ' text on the card', ratio: ratio(hex(tok('--color-booking-' + b)), card) });
    }
    return out;
  })()
`;

await goto("/inbox", { width: 1600, height: 950 });
await sleep(400);
ok("still light for the token measurement", (await evaluate(`document.documentElement.dataset.theme`)) === "light");
for (const m of await evaluate(CONTRAST)) {
  // Small text throughout — the chips are 12px, the booking row 14px.
  ok(`  ${m.what} clears AA`, m.ratio >= 4.5, `${m.ratio.toFixed(2)}:1`);
}

/**
 * The transient surfaces, which the sweep above never sees because nothing on
 * a resting page renders them: the offer banner and disruption cohort (both
 * tinted gradients) and a dialog (a `bg-footer` card over the scrim). These
 * are exactly the panels whose colours were hand-picked for a dark ground.
 */
await goto("/inbox", { width: 1600, height: 1100 });
await evaluate(`[...document.querySelectorAll('button')].find(b => /Simulate disruption/i.test(b.getAttribute('aria-label') || ''))?.click()`);
await sleep(1200);
await evaluate(`document.querySelector('button[aria-label="Conversation options"]')?.click()`);
await sleep(200);
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Snooze…')?.click()`);
await sleep(600);
ok("the transient surfaces are up", (await evaluate(`!!document.querySelector('[role="dialog"]')`)) === true);
const t = await evaluate(AUDIT);
const tTotal = Object.values(t).reduce((n, a) => n + a.length, 0);
const tDetail = Object.entries(t)
  .filter(([, v]) => v.length)
  .map(([k, v]) => `${k}(${v.length}): ${[...new Set(v)].slice(0, 4).join(" | ")}`)
  .join(" ;; ");
ok("banner, cohort and dialog have no findings in light", tTotal === 0, tDetail || "clean");
await shot("theme-light-transient");

// ---- No leakage onto the dark-only marketing pages ------------------------
await goto("/", { width: 1600, height: 950 });
ok("the landing page stays dark", (await evaluate(`document.documentElement.dataset.theme`)) === undefined,
   String(await evaluate(`document.documentElement.dataset.theme`)));
ok("and keeps its dark background",
   (await evaluate(`getComputedStyle(document.body).backgroundColor`)) === "rgb(32, 32, 32)",
   await evaluate(`getComputedStyle(document.body).backgroundColor`));

// ---- And back to dark -----------------------------------------------------
await goto("/inbox", { width: 1600, height: 950 });
await evaluate(`document.querySelector('[aria-label="Toggle light and dark theme"]').click()`);
await sleep(300);
ok("toggling again returns to dark",
   (await evaluate(`document.documentElement.dataset.theme`)) === undefined,
   String(await evaluate(`document.documentElement.dataset.theme`)));
ok("with the original page colour",
   (await evaluate(`getComputedStyle(document.body).backgroundColor`)) === "rgb(32, 32, 32)",
   await evaluate(`getComputedStyle(document.body).backgroundColor`));

// The same measurement in dark. These hexes were picked against #1a1a1a and
// clear it by a wide margin — the point of asserting it is that they are now
// one half of a themed pair, and the half that was fine is the easier one to
// break while fixing the other.
for (const m of await evaluate(CONTRAST)) {
  ok(`  ${m.what} clears AA in dark too`, m.ratio >= 4.5, `${m.ratio.toFixed(2)}:1`);
}

await evaluate(`localStorage.removeItem("takeoff.theme")`);

ws.close();
