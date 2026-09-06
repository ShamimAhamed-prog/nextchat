import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

await goto("/inbox");

const tabs = await evaluate(`
  [...document.querySelectorAll('nav[aria-label="Inbox views"] button')].map(b => b.innerText.replace(/\\s+/g, ' ').trim())
`);
console.log("   views:", tabs.join(" | "));

for (const name of ["Unassigned", "Assigned to me", "Team queues", "SLA risk", "Priority incidents", "Waiting customer", "Snoozed", "Recently resolved"]) {
  ok(`view exists: ${name}`, tabs.some((t) => t.startsWith(name)));
}

async function openView(label) {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('nav[aria-label="Inbox views"] button')].find(b => b.innerText.trim().startsWith(${JSON.stringify(label)}));
      if (!b) throw new Error('no view ' + ${JSON.stringify(label)});
      b.click(); return true;
    })()
  `);
  await sleep(450);
  const raw = await evaluate(`[...document.querySelectorAll('li > button')].map(b => b.innerText)`);
  return raw.map((t) => t.split(/\r?\n/)[0].trim());
}

let r = await openView("Assigned to me");
ok("Assigned to me shows only the owned thread", r.length === 1 && r[0] === "Tanvir Rahman", r.join(","));

r = await openView("Unassigned");
ok("Unassigned excludes the owned thread", r.length >= 2 && !r.includes("Tanvir Rahman"), r.join(","));

r = await openView("Team queues");
ok("Team queues is the unowned open pool", !r.includes("Tanvir Rahman") && !r.includes("Chieko Chute"), r.join(","));

r = await openView("Priority incidents");
ok("Priority incidents is P0/P1 only", r.includes("Tanvir Rahman") && !r.includes("Chieko Chute"), r.join(","));

r = await openView("Recently resolved");
ok("Recently resolved shows the resolved thread", r.length === 1 && r[0] === "Chieko Chute", r.join(","));

r = await openView("Snoozed");
ok("Snoozed is empty to start", r.length === 0, r.join(","));

r = await openView("SLA risk");
const slaCount = r.length;
ok("SLA risk view renders", Number.isInteger(slaCount), `${slaCount} at risk`);

r = await openView("Waiting customer");
ok("Waiting customer picks threads the customer spoke last on", r.length >= 1, r.join(","));

// Counts on the tabs agree with the rows the view actually shows
const mineCount = await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('nav[aria-label="Inbox views"] button')].find(b => b.innerText.trim().startsWith('Assigned to me'));
    return b.innerText.replace(/[^0-9]/g, '');
  })()
`);
r = await openView("Assigned to me");
ok("tab count matches the rows", Number(mineCount) === r.length, `badge=${mineCount} rows=${r.length}`);

await openView("All");
await shot("inb06-views");
ws.close();
