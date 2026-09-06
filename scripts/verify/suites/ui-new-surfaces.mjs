// The surfaces added in the pass that landed `src/lib/` — the 404 page, the
// onboarding package step — plus a guard for the defect class that pass
// shipped.
//
// Not covered here, deliberately: `app/error.tsx` and `ErrorBoundary`'s
// fallback. Both render only when a descendant throws, and nothing in this
// app can be made to throw from outside it — there is no `JSON.parse` in
// `src/`, and every storage read is a plain string comparison. Forcing one
// would mean shipping a throw-on-demand route, which is a worse trade than
// leaving these two to a unit render. What *is* covered is the reason they
// were broken: a Tailwind class naming a token that does not exist.
import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

/* ---- The bug that shipped: a colour class with no rule behind it --------
 *
 * `ErrorBoundary` asked for `bg-surface`. There is no `--color-surface`, so
 * Tailwind emitted no rule and the panel rendered on whatever sat behind
 * it — no build error, no lint error, nothing on screen to notice. A
 * typo'd token is indistinguishable from a correct one by reading, so this
 * asks the browser instead: apply the class over a sentinel and see whether
 * anything actually changed.
 */
const CLASSES = [
  // Every class the two error surfaces and the 404 page paint with.
  ["bg-card", "background"],
  ["bg-page", "background"],
  ["bg-footer", "background"],
  ["text-ink", "color"],
  ["text-ink-dim", "color"],
  ["text-coral", "color"],
  ["text-on-accent", "color"],
];

/*
 * Only classes that appear in `src/` can be probed this way, and that is
 * the technique's boundary rather than a gap in it. Tailwind v4 emits a
 * utility only for a class its source scan finds, so a class named here and
 * nowhere in the app has no rule for reasons that say nothing about its
 * token — `text-tag-vip-text` reads as broken under this probe even though
 * `--color-tag-vip-text` is fine, because the tag chips consume it as a
 * `var()` in an inline style and never as a utility.
 *
 * The defect being guarded is the opposite case and is caught: `bg-surface`
 * was in the source, so Tailwind scanned it, found no `--color-surface`
 * behind it, and emitted nothing.
 */

await goto("/inbox", { width: 1400, height: 1000 });
await sleep(400);

for (const [cls, prop] of CLASSES) {
  const result = await evaluate(`
    (() => {
      const host = document.createElement('div');
      // Sentinels no token uses, so "unchanged" is unambiguous.
      host.style.background = 'rgb(1, 2, 3)';
      host.style.color = 'rgb(1, 2, 3)';
      const probe = document.createElement('span');
      probe.className = ${JSON.stringify(cls)};
      probe.textContent = 'probe';
      host.appendChild(probe);
      document.body.appendChild(host);
      const cs = getComputedStyle(probe);
      const value = ${JSON.stringify(prop)} === 'color' ? cs.color : cs.backgroundColor;
      host.remove();
      return value;
    })()
  `);
  const unchanged = result === "rgb(1, 2, 3)";
  const absent = result === "rgba(0, 0, 0, 0)" || result === "transparent" || result === "";
  ok(`${cls} resolves to a real ${prop}`, !unchanged && !absent, `${prop} = ${result || "empty"}`);
}

/* ---- The 404 route ------------------------------------------------------ */
await goto("/this-route-does-not-exist", { width: 1280, height: 900 });
const nf = await evaluate(`document.body.innerText`);
ok("an unknown path renders the 404 page", nf.includes("404") && /Page Not Found/i.test(nf), nf.split("\n").slice(0, 3).join(" / "));
const homeHref = await evaluate(`
  (() => {
    const a = [...document.querySelectorAll('a')].find(x => x.textContent.trim() === 'Back to Home');
    return a ? new URL(a.href).pathname : "";
  })()
`);
ok("  and offers a way back to the landing page", homeHref === "/", homeHref || "no Back to Home link");
await shot("new-surfaces-404");

/* ---- Onboarding step 2: package selection ------------------------------ */
await goto("/onboarding/package", { width: 1400, height: 1100 });

const cards = () =>
  evaluate(`
    [...document.querySelectorAll('button[aria-pressed]')].map(b => ({
      label: b.getAttribute('aria-label'),
      pressed: b.getAttribute('aria-pressed') === 'true',
    }))
  `);

const initial = await cards();
ok("all three plans render as selectable cards", initial.length === 3, initial.map((c) => c.label).join(", ") || "none");
ok("  exactly one is selected on arrival", initial.filter((c) => c.pressed).length === 1, `${initial.filter((c) => c.pressed).length} pressed`);
ok("  and it is the recommended plan", initial.find((c) => c.pressed)?.label === "Select Growth plan", initial.find((c) => c.pressed)?.label ?? "none");

const step = await evaluate(`
  (() => {
    const el = [...document.querySelectorAll('span')].find(s => s.textContent.trim() === 'Package');
    return el ? el.parentElement.parentElement.innerText.replace(/\s+/g, ' ').trim() : "";
  })()
`);
ok("  the wizard marks Package as the active step", step.includes("Package"), step || "no step label");

// Selection is the one piece of state this screen owns, so it is the one
// thing worth driving rather than reading.
await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button[aria-pressed]')].find(x => x.getAttribute('aria-label') === 'Select Starter plan');
    if (!b) throw new Error('no Starter card');
    b.click();
  })()
`);
await sleep(300);
const after = await cards();
ok("choosing another plan moves the selection", after.find((c) => c.label === "Select Starter plan")?.pressed === true, JSON.stringify(after.map((c) => [c.label, c.pressed])));
ok("  and never leaves two selected", after.filter((c) => c.pressed).length === 1, `${after.filter((c) => c.pressed).length} pressed`);
await shot("new-surfaces-package");

// Next persists the choice and moves on. Asserted together because the
// persistence is only meaningful if the navigation it precedes happens.
await evaluate(`
  (() => {
    try { localStorage.removeItem('selectedPlan'); } catch (e) {}
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Next');
    if (!b) throw new Error('no Next button');
    b.click();
  })()
`);
await sleep(1800);
const landed = await evaluate(`
  (() => {
    let stored = null;
    try { stored = localStorage.getItem('selectedPlan'); } catch (e) {}
    return { path: location.pathname, stored };
  })()
`);
ok("Next records the chosen plan", landed.stored === "starter", `stored = ${landed.stored ?? "null"}`);
ok("  and continues into the workspace", landed.path === "/inbox", landed.path);

ws.close();
