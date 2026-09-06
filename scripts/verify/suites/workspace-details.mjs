// AG-01 identity status, AG-09 named snooze owner, INB-11 presence,
// INB-05 location and reactions.
import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

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

await goto("/inbox", { width: 1600, height: 1050 });

// ---- AG-01: identity status ---------------------------------------------
let body = await evaluate(`document.body.innerText`);
ok("identity status is shown on open", /Identity/.test(body));
ok("an unverified identity says so", /Not verified/.test(body),
   (body.split(/\r?\n/).find((l) => /Not verified/.test(l)) || ""));
await shot("wd-1-identity");

await evaluate(`
  (() => {
    const sel = document.querySelector('select[aria-label="Set identity status"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'verified');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()
`);
await sleep(600);
body = await evaluate(`document.body.innerText`);
ok("changing it is audited", /Identity status changed/.test(body),
   (body.split(/\r?\n/).find((l) => /Identity status changed/.test(l)) || ""));
ok("the audit records the transition", /unverified . verified/.test(body.replace(/→/g, "-")),
   (body.split(/\r?\n/).find((l) => /unverified/.test(l)) || ""));

// ---- INB-05: location and reactions -------------------------------------
ok("a shared location renders as a place", /Hazrat Shahjalal International Airport/.test(body));
ok("it is labelled a location, not a file", /Shared location/.test(body));

await selectRow("Rahat Islam");
const reaction = await evaluate(`
  (() => {
    const el = [...document.querySelectorAll('span[title]')].find(s => /reacted/.test(s.title));
    return el ? el.title : null;
  })()
`);
ok("a channel reaction is shown with who sent it", reaction !== null && /👍/.test(reaction), reaction ?? "none");
await shot("wd-2-reaction");

// ---- INB-11: presence ----------------------------------------------------
await selectRow("Marci Senter");
body = await evaluate(`document.body.innerText`);
ok("presence shows a colleague is on the thread", /Shirin Akter is viewing/.test(body),
   (body.split(/\r?\n/).find((l) => /is viewing/.test(l)) || ""));

await selectRow("Tanvir Rahman");
body = await evaluate(`document.body.innerText`);
ok("presence is per conversation, not global", !/is viewing this conversation/.test(body));

// ---- AG-09: a snooze has a named owner ----------------------------------
await evaluate(`document.querySelector('button[aria-label="Conversation options"]').click()`);
await sleep(350);
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Snooze…').click()`);
await sleep(600);
let dialog = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);
ok("the snooze dialog asks who it wakes to", /Wakes to/.test(dialog), dialog.split(/\r?\n/)[1] ?? "");

const owners = await evaluate(`
  [...document.querySelectorAll('[role="dialog"] select option')].map(o => o.textContent)
`);
ok("it can wake to someone else", owners.length > 1 && owners.includes("Shirin Akter"), owners.join(", "));

await evaluate(`
  (() => {
    const sel = document.querySelector('[role="dialog"] select');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'Shirin Akter');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const i = document.querySelector('[role="dialog"] input[type="text"]');
    const isetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    isetter.call(i, 'Waiting on finance to confirm the refund');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(300);
await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Snooze').click()`);
await sleep(700);
body = await evaluate(`document.body.innerText`);
ok("the snooze records its owner", /Shirin Akter/.test(body) && /Waiting on finance/.test(body),
   (body.split(/\r?\n/).find((l) => /Waiting on finance/.test(l)) || ""));
await shot("wd-3-snooze-owner");

// RT-08's supervisor pinning ran from the supervisor case table, which was
// retired when those views became direct replications of the design mockup.
// The agent-side behaviour above still runs against live state.

ws.close();
