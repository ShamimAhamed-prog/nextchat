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
const openMenu = async () => {
  await evaluate(`document.querySelector('button[aria-label="Conversation options"]').click()`);
  await sleep(350);
};
const clickMenu = async (label) => {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)});
      if (!b) throw new Error('no menu item ' + ${JSON.stringify(label)});
      b.click(); return true;
    })()
  `);
  await sleep(700);
};
const openView = async (label) => {
  await evaluate(`
    [...document.querySelectorAll('nav[aria-label="Inbox views"] button')].find(b => b.innerText.trim().startsWith(${JSON.stringify(label)})).click()
  `);
  await sleep(450);
};

await goto("/inbox", { width: 1600, height: 950 });

// 1. Put the P0 back in the queue. Its SLA is 5 minutes from a queuedSince
//    two minutes ago, so it is already inside the 15-minute breach forecast.
await selectRow("Tanvir Rahman");
await openMenu();
await clickMenu("Release to AI");
let body = await evaluate(`document.body.innerText`);
ok("the P0 is queued and near breach", /SLA due in|SLA breached/.test(body));

// 2. Wait for the scripted P1 offer, accept it, and resolve it so this agent
//    is its previous owner.
await sleep(7000);
await openView("All");
await selectRow("Nusrat Jahan");
await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Accept');
    if (b) b.click();
  })()
`);
await sleep(800);
await openMenu();
await clickMenu("Resolve…");
await evaluate(`
  (() => {
    const i = document.querySelector('[role="dialog"] input');
    if (i) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(i, 'TT-99002');
      i.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()
`);
await sleep(300);
await evaluate(`
  (() => {
    const btns = [...document.querySelectorAll('[role="dialog"] button')].filter(b => /Resolve/.test(b.textContent));
    btns[btns.length - 1].click();
  })()
`);
await sleep(900);

await openView("Recently resolved");
const resolved = await evaluate(`[...document.querySelectorAll('li > button')].map(b => b.innerText)`);
ok("the P1 is resolved and owned by this agent", resolved.some((t) => t.includes("Nusrat Jahan")),
   resolved.map((t) => t.split(/\r?\n/)[0]).join(","));

// 3. Reopening it must yield to the P0 still inside its breach window.
await selectRow("Nusrat Jahan");
await openMenu();
await clickMenu("Reopen");
body = await evaluate(`document.body.innerText`);

const line = body.split(/\r?\n/).find((l) => /Queued instead|Offered back to/.test(l)) || "no routing line";
ok("affinity yields to the higher-priority SLA", /Queued instead/.test(body), line);
ok("the reason names the conversation it yielded to", /Tanvir Rahman/.test(line), line);
await shot("rt05-4-yield");

ws.close();
