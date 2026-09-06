import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

const setState = async (label) => {
  await evaluate(`
    (() => {
      const t = document.querySelector('button[aria-haspopup="menu"]');
      if (!t) throw new Error('no state trigger');
      if (t.getAttribute('aria-expanded') !== 'true') t.click();
      return true;
    })()
  `);
  await sleep(350);
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('[role="menuitemradio"]')].find(b => b.innerText.trim().startsWith(${JSON.stringify(label)}));
      if (!b) throw new Error('no state ' + ${JSON.stringify(label)});
      b.click(); return true;
    })()
  `);
  await sleep(500);
};

const dialogText = () => evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);

await goto("/inbox");

// Agent holds c1 (assigned + lease). Stepping away must warn.
await setState("On break");
let d = await dialogText();
ok("stepping away with held work warns", d.includes("Go On break"), d.split("\n")[0]);
ok("warning names the held conversation", d.includes("Tanvir Rahman"));
ok("warning states the unattended timeout", /unattended after 10 minute/.test(d) || /after 10 minute/.test(d), d.split("\n").find(l => /minute/.test(l)) || "");
ok("offers all three choices", ["Stay Available", "Keep them", "Release to queue"].every(t => d.includes(t)));
await shot("ag11-1-warning");

// Cancel keeps the old state
await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Stay ')).click()`);
await sleep(400);
let header = await evaluate(`document.querySelector('header').innerText`);
ok("cancel keeps the previous state", header.includes("Available"), header.split("\n").filter(l=>/Available|break/.test(l)).join("/"));

// Release hands the conversation back
await setState("On break");
await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Release to queue')).click()`);
await sleep(700);
header = await evaluate(`document.querySelector('header').innerText`);
ok("state changed after confirming", /break/i.test(header), header.split("\n").pop());
const body = await evaluate(`document.body.innerText`);
ok("release is audited", body.includes("Released to queue"), (body.split("\n").find(l=>l.includes("Released to queue"))||""));
ok("no dialog left open", (await dialogText()) === "");
await shot("ag11-2-released");

// Going back to a working state does not warn
await setState("Available");
ok("returning to Available does not warn", (await dialogText()) === "");

// Nothing held -> no warning
await setState("Offline");
d = await dialogText();
ok("no warning when nothing is held", d === "", d.split("\n")[0] || "");

ws.close();
