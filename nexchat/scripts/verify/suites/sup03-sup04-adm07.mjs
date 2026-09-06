// ADM-07: the audit entry carries every required field.
//
// SUP-03's drill-downs and SUP-04's threshold alerts were retired when the
// supervisor views became direct replications of the design mockup — those
// pages no longer compute anything from live state. Tenant administration
// stayed functional, so the audit trail below is still real.
//
// Why this publishes something instead of just reading `/admin`:
//
// ADM-07 wants "actor, role, tenant, IP/session and effective time" on an
// entry a *user* created. A freshly loaded `/admin` has exactly one entry —
// the seed — and by construction it carries neither of the two fields that
// are interesting: `SETUP_SESSION` ("setup") instead of a `sess-` id, and
// "at setup" instead of a timestamp. That is deliberate and load-bearing,
// not laziness: `SESSION_ID` is random per session, so rendering it in the
// SSR pass mismatches the client and fails hydration with React #418 — an
// error that breaks no build and shows nothing on screen. See the comment
// on `SESSION_ID` in `tenantConfigEngine.ts`.
//
// So the seed entry can only ever be checked for what it does carry, and
// this suite used to assert `/session sess-/` against it and fail every
// run. Loosening that regex to accept "setup" would have gone green while
// asserting nothing about the requirement — the fix is to make an entry the
// requirement actually describes, by publishing a change, and check that.
import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

const clickBtn = async (label, nth = 0) => {
  await evaluate(`
    (() => {
      const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === ${JSON.stringify(label)});
      if (!bs[${nth}]) throw new Error('no button ' + ${JSON.stringify(label)});
      bs[${nth}].click();
    })()
  `);
  await sleep(450);
};

const tab = async (label) => {
  await evaluate(`
    (() => {
      const t = [...document.querySelectorAll('[role="tab"]')].find(b => b.textContent.trim() === ${JSON.stringify(label)});
      if (!t) throw new Error('no ' + ${JSON.stringify(label)} + ' tab');
      t.click();
    })()
  `);
  await sleep(450);
};

/*
 * The append-only log lives in the Changes & audit pane's own table, newest
 * first. Rows come back as arrays of cells, so each ADM-07 field is checked
 * against the column that carries it rather than against one flattened line.
 *
 * Selecting and normalising deliberately use string methods only. An
 * expression handed to `evaluate` crosses a template literal on its way to
 * the browser, so a `\s` written here arrives as a bare `s` and a
 * whitespace-collapsing regex silently becomes an s-deleting one — which is
 * exactly what it did, turning "System" into "Sy tem" and every assertion
 * below into a puzzle. Regexes stay on this side of the boundary.
 */
const auditRows = async () => {
  await tab("Changes & audit");
  return evaluate(`
    (() => {
      const t = [...document.querySelectorAll('table')].find(tb =>
        // innerText applies text-transform and the header is uppercased —
        // harness README, trap 1.
        [...tb.querySelectorAll('thead th')].some(th => th.innerText.trim().toUpperCase() === 'SESSION / SOURCE'));
      if (!t) return [];
      const line = (el) => el.innerText
        .split(String.fromCharCode(10))
        .map(s => s.trim())
        .filter(Boolean)
        .join(' · ');
      return [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(line));
    })()
  `);
};

/** Column order: event, actor, area, change, approver, session, effective, action. */
const ACTOR = 1;
const SESSION = 5;
const EFFECTIVE = 6;

await goto("/admin", { width: 1600, height: 1300 });
await sleep(1600);

// ---- The seed entry: every field that can be deterministic, is -----------
const seeded = await auditRows();
const seed = seeded[0] ?? [];
ok("the log renders with the seed entry", seeded.length === 1, `${seeded.length} entr(ies): ${seed.join(" | ")}`);
ok("audit records the actor's role", (seed[ACTOR] ?? "").split(" · ").length === 2, seed[ACTOR] ?? "no actor cell");
ok("audit records the tenant", (seed[SESSION] ?? "").includes("tenant takeoff-travels"), seed[SESSION] ?? "no session cell");
// Asserted as the SSR-stable value on purpose — see the header. If this ever
// becomes a `sess-` id, hydration on /admin is broken.
ok(
  "the seed entry uses the SSR-stable session",
  (seed[SESSION] ?? "").includes("session setup") && (seed[EFFECTIVE] ?? "") === "effective at setup",
  `${seed[SESSION] ?? "?"} / ${seed[EFFECTIVE] ?? "?"}`,
);

// ---- Publish a real change, and check the entry it appends ---------------
// `queues.surgeRosterEnabled` is not in `isSensitiveChange`, so it publishes
// without the maker-checker gate and the entry lands immediately.
await tab("Queues & routing");

const toggled = await evaluate(`
  (() => {
    const sw = [...document.querySelectorAll('[role="switch"]')].find(s => /Surge roster active/.test(s.textContent));
    if (!sw) throw new Error('no surge roster switch');
    const before = sw.getAttribute('aria-checked');
    sw.click();
    return before;
  })()
`);
await sleep(350);

// The badge is a `Pill`, which renders a decorative dot as an element
// child — so "no element children" does not identify it. Take the tightest
// wrapper whose text mentions the change count instead.
const pending = await evaluate(`
  (() => {
    const hits = [...document.querySelectorAll('span, div')]
      .filter(e => e.textContent.includes('draft change'))
      .sort((a, b) => a.textContent.length - b.textContent.length);
    return hits.length ? hits[0].textContent.trim() : "";
  })()
`);
ok("editing the draft registers a draft change", /^1 draft change$/.test(pending), `switch was ${toggled}; badge: ${pending || "none"}`);

await clickBtn("Review & publish");
await evaluate(`
  (() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) throw new Error('publish review did not open');
    const ta = d.querySelector('textarea');
    if (!ta) throw new Error('no publish note field');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      .call(ta, 'Verification run: surge roster toggled to exercise the audit trail.');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(300);
await shot("s34-5-publish-review");
await clickBtn("Publish");
await sleep(700);

const after = await auditRows();
const latest = after[0] ?? [];
ok("publishing appends an entry", after.length === seeded.length + 1, `${seeded.length} → ${after.length}`);
ok(
  "the log is append-only",
  (after[after.length - 1] ?? []).join(" | ") === seed.join(" | "),
  (after[after.length - 1] ?? []).join(" | ") || "seed entry gone",
);

// The four ADM-07 fields, on an entry a user actually created.
ok("audit records the actor and role", (latest[ACTOR] ?? "").split(" · ").length === 2, latest[ACTOR] ?? "no actor cell");
ok("audit records the tenant", (latest[SESSION] ?? "").includes("tenant takeoff-travels"), latest[SESSION] ?? "no session cell");
ok("audit records the session", /session sess-[a-z0-9]+/.test(latest[SESSION] ?? ""), latest[SESSION] ?? "no session cell");
ok("audit records an effective time", /effective \d/.test(latest[EFFECTIVE] ?? ""), latest[EFFECTIVE] ?? "no effective cell");
await shot("s34-5-audit-fields");

ws.close();
