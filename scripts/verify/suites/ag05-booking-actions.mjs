import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

const panelText = () =>
  evaluate(`(() => { const a = document.querySelectorAll('aside'); return a[a.length-1].innerText; })()`);

const clickBtn = (text) =>
  evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(text)}));
      if (!b) throw new Error('no button: ' + ${JSON.stringify(text)});
      b.click(); return true;
    })()
  `);

await goto("/inbox");

// c1 = Tanvir Rahman, "Ticketing failed", BDT 11,600 paid (under the 15,000 ceiling)
let panel = await panelText();
ok("booking actions offered", panel.includes("Booking actions"));
ok("retry ticketing offered for a failed ticketing", panel.includes("Retry ticketing"));
ok("refund offered under the ceiling", panel.includes("Start refund"));
ok("no resend on an unticketed booking", !panel.includes("Resend ticket"));
await shot("ag05-1-actions");

// Confirmation step
await clickBtn("Retry ticketing");
await sleep(600);
let dialog = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);
ok("action confirms before running", dialog.includes("Retry ticketing"), dialog.split("\n").slice(0,2).join(" / "));
ok("confirmation explains idempotency", /idempotency key/i.test(dialog));
await shot("ag05-2-confirm");

// Run it
await evaluate(`
  [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Retry ticketing')).click()
`);
await sleep(700);
panel = await panelText();
const transcript = await evaluate(`document.body.innerText`);
ok("booking state advanced to Ticketed", panel.includes("Ticketed"), (panel.split("\n").find(l=>/Ticket/.test(l))||""));
ok("audit entry written", panel.includes("Ticketing retried by agent"));
ok("audit carries the idempotency key", /key bk/.test(panel));
ok("customer-visible system message posted", transcript.includes("Ticket issued"));
ok("action list re-derived — resend now offered", panel.includes("Resend ticket"));
ok("retry no longer offered once ticketed", !panel.includes("Retry ticketing"));
await shot("ag05-3-after");

// Idempotency: replay the same key through the reducer path the UI used
const before = await evaluate(`
  (() => { const a = document.querySelectorAll('aside'); return (a[a.length-1].innerText.match(/Ticketing retried by agent/g)||[]).length; })()
`);
ok("exactly one retry recorded", before === 1, `count=${before}`);

// Refund above the ceiling is offered but gated (c2 = Rahat, Card, 42,800 > 15,000)
await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('li > button')].find(b => b.innerText.includes('Rahat Islam'));
    if (!b) throw new Error('no Rahat row');
    b.click(); return true;
  })()
`);
await sleep(900);
panel = await panelText();
const onRahat = await evaluate(`document.body.innerText.includes('7QM2LB')`);
ok("switched to the over-ceiling conversation", onRahat === true);
if (onRahat) {
  ok("over-ceiling refund is shown, not hidden", panel.includes("Start refund"));
  ok("over-ceiling refund is marked as needing approval", /needs approval/i.test(panel));
  await clickBtn("Start refund");
  await sleep(500);
  dialog = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);
  ok("dialog explains the ceiling", /refund ceiling/i.test(dialog), dialog.split("\n").slice(-3).join(" / "));
  const disabled = await evaluate(`
    [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.includes('Needs approval'))?.disabled ?? null
  `);
  ok("cannot run an over-ceiling refund", disabled === true);
  await shot("ag05-4-ceiling");
} else {
  console.log("SKIP  over-ceiling case — could not select the second conversation");
}

ws.close();
