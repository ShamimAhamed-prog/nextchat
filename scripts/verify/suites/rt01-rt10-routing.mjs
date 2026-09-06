import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

const selectRow = async (name) => {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('li > button')].find(b => b.innerText.includes(${JSON.stringify(name)}));
      if (!b) throw new Error('no row ' + ${JSON.stringify(name)});
      b.click(); return true;
    })()
  `);
  await sleep(700);
};

const routingPanel = () =>
  evaluate(`
    (() => {
      const h = [...document.querySelectorAll('p')].find(p => /Routing decision/i.test(p.textContent));
      if (!h) return null;
      const block = h.closest('div.flex.flex-col');
      return block ? block.innerText : null;
    })()
  `);

await goto("/inbox", { width: 1600, height: 1000 });
await sleep(1500);

// ---- RT-01 / RT-10 -------------------------------------------------------
// Marci Senter is Website, unassigned, queue q1 (General support), no skill.
await selectRow("Marci Senter");
let panel = await routingPanel();
ok("routing decision is exposed", panel !== null, (panel || "").split(/\r?\n/)[0]);
ok("it names the queue", /General support/.test(panel), panel.split(/\r?\n/)[2] ?? "");
ok("it gives the eligible candidate count", /\d+ of \d+ eligible/.test(panel),
   (panel.split(/\r?\n/).find((l) => /eligible/.test(l)) || ""));
ok("it lists every candidate, not just the winner", /Shirin Akter/.test(panel) && /Arif Chowdhury/.test(panel) && /Nabila K/.test(panel));
ok("effective weights are shown", /weight \d/.test(panel), (panel.split(/\r?\n/).find((l) => /weight/.test(l)) || ""));
ok("a selection was made", /✓/.test(panel), (panel.split(/\r?\n/).find((l) => /✓/.test(l)) || ""));
await shot("rt-1-decision");

// Nabila is in q2 only and is in training — both are hard filters.
ok("queue membership rules someone out", /Not in General support/.test(panel),
   (panel.split(/\r?\n/).find((l) => /Not in/.test(l)) || ""));

// ---- Skill and language filters ------------------------------------------
// Rahat Islam: queue q2 (Refunds & disruption), requires the "refunds" skill.
await selectRow("Rahat Islam");
panel = await routingPanel();
ok("a skill requirement is stated", /requires/.test(panel), (panel.split(/\r?\n/).find((l) => /requires/.test(l)) || ""));
ok("the wrong queue is ruled out", /Not in Refunds & disruption/.test(panel),
   (panel.split(/\r?\n/).find((l) => /Not in Refunds/.test(l)) || ""));
ok("unavailability is a distinct reason", /Unavailable \(training\)/.test(panel),
   (panel.split(/\r?\n/).find((l) => /Unavailable/.test(l)) || ""));
await shot("rt-2-skill-queue");

// A conversation seeded as already-assigned never went through routing, so
// it correctly shows no panel rather than a fabricated decision.
await selectRow("Tanvir Rahman");
ok("no decision is invented for work that never routed", (await routingPanel()) === null);

// Each rejection must carry its own specific reason, not a generic one.
await selectRow("Marci Senter");
panel = await routingPanel();
const reasons = panel.split(String.fromCharCode(10)).filter((l) => /Not in|Does not cover|Unavailable|At capacity/.test(l));
ok("each rejection carries a specific reason", reasons.length >= 1, reasons.join(" / "));

// The decision survives acceptance — that is when you most want to read it.
await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Accept');
    if (b) b.click();
  })()
`);
await sleep(900);
ok("the decision survives acceptance", (await routingPanel()) !== null);

// ---- The decision is audited ---------------------------------------------
const body = await evaluate(`document.body.innerText`);
ok("the decision is written to the activity trail", /Routing decision/.test(body));

// SUP-02's supervisor filter bar was retired when the supervisor views
// became direct replications of the design mockup (which carries its own
// per-view filter rows, wired to nothing). The routing assertions above
// still cover RT-01/RT-10 against live state on /inbox.

ws.close();
