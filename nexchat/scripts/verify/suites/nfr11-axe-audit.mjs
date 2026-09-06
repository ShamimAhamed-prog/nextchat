import { evaluate, goto, sleep, ws, ok } from "../driver.mjs";
import { AUDIT } from "../audit.mjs";

/**
 * WCAG 2.2 AA checks that can be made mechanically, run against the real
 * rendered page: accessible names on controls, labels on inputs, alt text,
 * heading order, duplicate ids, positive tabindex, and text contrast.
 *
 * Dark theme. `theme-light.mjs` runs the same sweep over the light palette.
 */

// The three internal surfaces the PRD gates on. Pass paths as arguments to
// audit others: `node suites/nfr11-axe-audit.mjs /sign-in`
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["/inbox", "/dashboard", "/admin"];

for (const path of pages) {
  await goto(path, { width: 1600, height: 950 });
  await sleep(500);
  const r = await evaluate(AUDIT);
  const total = Object.values(r).reduce((n, a) => n + a.length, 0);
  // The detail string, not `console.log`: the runner only surfaces a failing
  // assertion's detail, so logging the findings separately meant every failure
  // here read "3 finding(s)" and needed a second, hand-written suite to see
  // what the three actually were.
  const detail = Object.entries(r)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k}(${v.length}): ${[...new Set(v)].slice(0, 4).join(" | ")}`)
    .join(" ;; ");
  ok(`${path} has no mechanical accessibility findings`, total === 0, detail || "clean");
}

ws.close();
