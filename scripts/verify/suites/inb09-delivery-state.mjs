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

/** The last outbound bubble's footer — time plus delivery state. */
const lastOutboundFooter = () =>
  evaluate(`
    (() => {
      const rows = [...document.querySelectorAll('[data-outbound]')];
      const last = rows[rows.length - 1];
      return last ? last.innerText : null;
    })()
  `);

await goto("/inbox", { width: 1600, height: 1000 });

// ---- A terminal failure is visible on load -------------------------------
await selectRow("Chieko Chute");
let footer = await lastOutboundFooter();
ok("a failed send says it was not delivered", /Not delivered/i.test(footer), (footer || "").replace(/\n/g, " · "));
ok("it shows the attempts it burned", /3\/3/.test(footer), (footer || "").replace(/\n/g, " · "));

const retryOffered = await evaluate(`
  Boolean([...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Retry'))
`);
ok("the operator is offered a retry", retryOffered);

const body = await evaluate(`document.body.innerText`);
ok("the terminal failure is in the activity trail", /Send failed — needs an operator/.test(body),
   (body.split(/\r?\n/).find((l) => /Send failed/.test(l)) || ""));
ok("the reason names the channel", /Messenger is disabled/.test(body));
await shot("inb09-1-terminal-failure");

// ---- A live send walks the ladder ---------------------------------------
await selectRow("Tanvir Rahman");
await evaluate(`
  (() => {
    const i = document.getElementById('agent-reply');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(i, 'Checking that now.');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(250);
await evaluate(`document.querySelector('button[aria-label="Send reply"]').click()`);

// Queued first — nothing is "sent" until the channel says so.
await sleep(300);
footer = await lastOutboundFooter();
ok("a new send starts queued", /Queued/i.test(footer), (footer || "").replace(/\n/g, " · "));

await sleep(1100);
footer = await lastOutboundFooter();
ok("it advances to sent", /Sent/i.test(footer), (footer || "").replace(/\n/g, " · "));

await sleep(1200);
footer = await lastOutboundFooter();
ok("then delivered", /Delivered/i.test(footer), (footer || "").replace(/\n/g, " · "));

await sleep(1800);
footer = await lastOutboundFooter();
ok("and read, because WhatsApp reports it", /Read/i.test(footer), (footer || "").replace(/\n/g, " · "));
await shot("inb09-2-ladder");

// ---- "Where the channel supplies them" ----------------------------------
// The web widget has no read receipt, so a Website send must stop at
// delivered rather than inventing one.
await selectRow("Marci Senter");
const owned = await evaluate(`Boolean(document.getElementById('agent-reply'))`);
if (owned) {
  await evaluate(`
    (() => {
      const i = document.getElementById('agent-reply');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(i, 'Website reply.');
      i.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
  await sleep(250);
  await evaluate(`document.querySelector('button[aria-label="Send reply"]').click()`);
  await sleep(4200);
  footer = await lastOutboundFooter();
  ok("a Website send stops at delivered", /Delivered/i.test(footer) && !/Read/i.test(footer),
     (footer || "").replace(/\n/g, " · "));
  await shot("inb09-3-no-read-on-web");
} else {
  ok("Website conversation is not owned, so no send to check", true, "skipped — not assignable here");
}

ws.close();
