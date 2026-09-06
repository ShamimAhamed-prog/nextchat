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

const menuItems = () =>
  evaluate(`[...document.querySelectorAll('button')].filter(b => b.closest('[class*="absolute"]')).map(b => b.textContent.trim())`);

const view = async (label) => {
  await evaluate(`
    [...document.querySelectorAll('nav[aria-label="Inbox views"] button')].find(b => b.innerText.trim().startsWith(${JSON.stringify(label)})).click()
  `);
  await sleep(450);
  const raw = await evaluate(`[...document.querySelectorAll('li > button')].map(b => b.innerText)`);
  return raw.map((t) => t.split(/\r?\n/)[0].trim());
};

await goto("/inbox", { width: 1600, height: 950 });

// Chieko Chute is seeded resolved 20h ago; the tenant window is 72h.
await view("Recently resolved");
await selectRow("Chieko Chute");
await openMenu();
let items = await menuItems();
ok("a resolved case inside the window offers Reopen", items.includes("Reopen"), items.join(" | "));
ok("resolve/snooze are not offered on a resolved case", !items.includes("Resolve…") && !items.includes("Snooze…"));
await shot("rt05-1-menu");

// It has no lastAgent (seeded, never held), so it queues rather than
// returning to anyone — and says so.
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Reopen').click()`);
await sleep(800);
let body = await evaluate(`document.body.innerText`);
ok("reopen is audited", body.includes("Reopened"), (body.split(/\r?\n/).find((l) => l.includes("Reopened")) || ""));
ok("routing reason is recorded", /No previous owner on record/.test(body) || /Offered back to/.test(body),
   (body.split(/\r?\n/).find((l) => /previous owner|Offered back/.test(l)) || ""));
await shot("rt05-2-reopened-no-owner");

// Now the affinity path: resolve a case this agent owns, then reopen it.
await goto("/inbox", { width: 1600, height: 950 });
await selectRow("Tanvir Rahman");
await openMenu();
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Resolve…').click()`);
await sleep(600);
await evaluate(`
  (() => {
    const i = document.querySelector('[role="dialog"] input');
    if (i) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(i, 'TT-99001');
      i.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()
`);
await sleep(300);
await evaluate(`
  [...document.querySelectorAll('[role="dialog"] button')].find(b => /Resolve/.test(b.textContent) && b.type === 'submit')?.click()
  ?? [...document.querySelectorAll('[role="dialog"] button')].filter(b => /Resolve/.test(b.textContent)).pop().click()
`);
await sleep(800);

let rows = await view("Recently resolved");
ok("the owned case resolved", rows.includes("Tanvir Rahman"), rows.join(","));

await selectRow("Tanvir Rahman");
await openMenu();
items = await menuItems();
ok("Reopen offered on the just-resolved case", items.includes("Reopen"), items.join(" | "));

await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Reopen').click()`);
await sleep(900);
body = await evaluate(`document.body.innerText`);
ok("reopen returns it to the previous agent", /Offered back to Rifat Karim/.test(body),
   (body.split(/\r?\n/).find((l) => /Offered back|Queued instead/.test(l)) || "no routing line"));
ok("it comes back as an offer, not a silent assignment", body.includes("New assignment") || body.includes("Offered"));
await shot("rt05-3-affinity");

ws.close();
