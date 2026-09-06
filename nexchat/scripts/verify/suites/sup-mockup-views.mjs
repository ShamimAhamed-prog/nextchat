// The eight replicated views are direct ports of the design mockup
// (`Design/human-agent-operations-dashboard (3).html`). None of them hold
// live state, so there is no behaviour to assert — what can regress is
// the rendering, and it has: a panel stretching to fill the viewport, a tab
// strip crushed to a sliver, a table column clipped out of reach. This
// suite checks each view actually draws its sections, and that the dialog
// layer opens, closes and is reachable from the buttons that own it.
import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

const text = () => evaluate(`document.body.innerText`);
const clickBtn = async (label) => {
  const found = await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)});
      if (!b) return false;
      b.click(); return true;
    })()
  `);
  await sleep(400);
  return found;
};
const dialogTitle = () =>
  evaluate(`document.querySelector('[role="dialog"] h2')?.textContent?.trim() ?? ""`);

// Each view: route, the mockup's own h1, and sections that must be present.
const VIEWS = [
  {
    path: "/dashboard",
    title: "Human agent active workload",
    sections: ["Agent capacity board", "SLA pressure heatmap", "Queue balance", "Routing activity"],
  },
  {
    path: "/performance",
    title: "Human agent performance",
    sections: ["Service quality trend", "Performance data coverage", "Agent scorecards", "SLA breach reasons", "Human response-time distribution"],
  },
  {
    path: "/ai-performance",
    title: "AI agent performance",
    sections: ["Automation and escalation trend", "Decision path and outcome", "Confidence-to-action distribution", "Channel performance", "Intent performance"],
  },
  {
    path: "/queues",
    title: "Queue control and routing",
    sections: ["Assignment lifecycle", "Waiting and offered conversations", "Routing explanation", "Reassignment history"],
  },
  {
    path: "/alerts",
    title: "Alerts and thresholds",
    sections: ["Alert rules", "No eligible agent", "SLA breach forecast"],
  },
  {
    path: "/exceptions",
    title: "Exceptions and incident command",
    sections: ["Paid but not ticketed", "Recovery case", "Allowed recovery actions", "Reconciliation"],
  },
  {
    path: "/qa",
    title: "QA reviews and appeals",
    sections: ["Review queue", "Appeals", "My scorecard"],
  },
  {
    path: "/governance",
    title: "KPI governance and exports",
    sections: ["Canonical KPI catalog", "Export jobs", "Version and backfill history", "Permission and audit posture"],
  },
];

for (const view of VIEWS) {
  await goto(view.path, { width: 1600, height: 1100 });
  await sleep(500);
  const body = await text();

  ok(`${view.path} renders the mockup's title`, body.includes(view.title), body.split(String.fromCharCode(10)).slice(0, 4).join(" / "));

  const missing = view.sections.filter((s) => !body.includes(s));
  ok(`${view.path} renders every section`, missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${view.sections.length} present`);

  // A panel that stretches leaves a tall empty card; catching that as a
  // number is what a screenshot review kept missing.
  const overflow = await evaluate(`({ scrollW: document.documentElement.scrollWidth, winW: window.innerWidth })`);
  ok(`${view.path} does not scroll sideways`, overflow.scrollW <= overflow.winW + 1, `${overflow.scrollW} vs ${overflow.winW}`);
}

// ---- The dialog layer ----------------------------------------------------
await goto("/dashboard", { width: 1600, height: 1100 });
await sleep(600);

ok("a page-head button opens its dialog", (await clickBtn("Rebalance queue")) === true);
ok("the dialog is the one the mockup names", (await dialogTitle()) === "Supervisor intervention", await dialogTitle());
await shot("mockup-1-intervention");

const reasonField = await evaluate(`Boolean(document.querySelector('[role="dialog"] textarea'))`);
ok("it carries the mockup's required-reason field", reasonField);

await evaluate(`document.querySelector('[aria-label="Close dialog"]').click()`);
await sleep(300);
ok("closing dismisses it", (await dialogTitle()) === "");

// Committing raises the mockup's toast rather than mutating anything.
await clickBtn("Rebalance queue");
await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Confirm intervention').click()`);
await sleep(300);
const toast = await evaluate(`document.querySelector('[role="status"]')?.textContent?.trim() ?? ""`);
ok("committing closes the dialog and confirms", (await dialogTitle()) === "" && /audit event created/i.test(toast), toast || "no toast");

// Escape is wired, not just the close button.
await clickBtn("Export snapshot");
ok("a second dialog opens from its own button", (await dialogTitle()) === "Create redacted export", await dialogTitle());
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await sleep(300);
ok("Escape closes it", (await dialogTitle()) === "");

// ---- The agent drawer ----------------------------------------------------
await evaluate(`
  (() => {
    const row = [...document.querySelectorAll('tr')].find(r => /Ayesha Rahman/.test(r.textContent));
    if (!row) throw new Error('no agent row');
    row.click();
  })()
`);
await sleep(400);
const drawer = await evaluate(`document.querySelector('aside[aria-label$="details"]')?.innerText ?? ""`);
ok("a capacity-board row opens the agent drawer", /Ayesha Rahman/.test(drawer), drawer.split(String.fromCharCode(10))[0] ?? "none");
// Case-insensitive: the drawer's section titles are uppercased in CSS, and
// `innerText` returns them transformed — trap 1 in the harness README.
ok("the drawer carries its workload explanation", /weighted load/i.test(drawer) && /routing eligibility/i.test(drawer),
   drawer.replace(/\s+/g, " ").slice(0, 90));
await shot("mockup-2-agent-drawer");

ws.close();
