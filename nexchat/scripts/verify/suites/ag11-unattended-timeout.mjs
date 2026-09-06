import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

const setState = async (label) => {
  await evaluate(`
    (() => {
      const t = document.querySelector('button[aria-haspopup="menu"]');
      if (t.getAttribute('aria-expanded') !== 'true') t.click();
      return true;
    })()
  `);
  await sleep(350);
  await evaluate(`
    [...document.querySelectorAll('[role="menuitemradio"]')].find(b => b.innerText.trim().startsWith(${JSON.stringify(label)})).click()
  `);
  await sleep(500);
};

await goto("/inbox");

// Step away but KEEP the held conversation — the path the timeout governs.
await setState("On break");
await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Keep them')).click()`);
await sleep(600);

let body = await evaluate(`document.body.innerText`);
ok("conversation still held after 'Keep them'", !body.includes("Reassigned — unattended"));
ok("agent is on break", /break/i.test(await evaluate(`document.querySelector('header').innerText`)));

// Push the page clock past the tenant's 10-minute unattended window. The
// effect reads Date.now() on each 2s tick, so this is what a real 10-minute
// wait would look like to it.
await evaluate(`
  (() => {
    const real = Date.now.bind(Date);
    const skew = 11 * 60 * 1000;
    Date.now = () => real() + skew;
    return true;
  })()
`);
await sleep(4000);

body = await evaluate(`document.body.innerText`);
ok("unattended conversation was reassigned", body.includes("Reassigned — unattended"),
   (body.split(/\r?\n/).find((l) => l.includes("Reassigned")) || ""));

const views = await evaluate(`
  [...document.querySelectorAll('nav[aria-label="Inbox views"] button')].map(b => b.innerText.replace(/\\s+/g,' ').trim())
`);
const mine = views.find((v) => v.startsWith("Assigned to me"));
ok("it left 'Assigned to me'", /\b0*0$/.test(mine.replace(/\D/g, "")), mine);
await shot("ag11-3-unattended");

ws.close();
