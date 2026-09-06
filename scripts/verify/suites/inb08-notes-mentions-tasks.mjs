import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

const clickByText = async (text) => {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)});
      if (!b) throw new Error('no control ' + ${JSON.stringify(text)});
      b.click(); return true;
    })()
  `);
  await sleep(500);
};

/** For controls whose label is followed by preview text in the same button. */
const clickContaining = async (text) => {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(text)}));
      if (!b) throw new Error('no control containing ' + ${JSON.stringify(text)});
      b.click(); return true;
    })()
  `);
  await sleep(500);
};

const type = async (value) => {
  await evaluate(`
    (() => {
      const i = document.getElementById('agent-reply');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(i, ${JSON.stringify(value)});
      i.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
  await sleep(250);
};

const outboundCount = () =>
  evaluate(`[...document.querySelectorAll('[data-outbound]')].length`);

await goto("/inbox", { width: 1600, height: 1050 });

// ---- Internal notes ------------------------------------------------------
ok("composer offers both modes", await evaluate(`
  Boolean([...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Internal note'))
`));

const beforeOutbound = await outboundCount();
await clickByText("Internal note");
const placeholder = await evaluate(`document.getElementById('agent-reply').placeholder`);
ok("note mode says what it is", /Internal note/i.test(placeholder), placeholder);

const sendLabel = await evaluate(`
  document.querySelector('button[aria-label="Add internal note"]') ? 'Add internal note' : 'unchanged'
`);
ok("the send control becomes an add-note control", sendLabel === "Add internal note", sendLabel);

await type("Finance says the reissue cleared. @Shirin can you confirm on your side?");
await evaluate(`document.querySelector('button[aria-label="Add internal note"]').click()`);
await sleep(700);

let body = await evaluate(`document.body.innerText`);
ok("the note appears in the thread", /Finance says the reissue cleared/.test(body));
ok("it is labelled as not sent to the customer", /not sent to the customer/i.test(body),
   (body.split(/\r?\n/).find((l) => /not sent to the customer/i.test(l)) || ""));

const afterOutbound = await outboundCount();
ok("a note is NOT an outbound message", afterOutbound === beforeOutbound,
   `${beforeOutbound} outbound before, ${afterOutbound} after`);

// Scoped to the note card itself — an ancestor would contain other
// messages' delivery states and make this pass or fail for the wrong reason.
const hasDelivery = await evaluate(`
  (() => {
    const card = document.querySelector('div.border-dashed');
    if (!card) return 'no note card found';
    return /Queued|Sent|Delivered|Read/.test(card.innerText);
  })()
`);
ok("a note carries no delivery state at all", hasDelivery === false, String(hasDelivery));
await shot("inb08-1-note");

// ---- @mentions -----------------------------------------------------------
ok("the mention is recognised", /Notified: Shirin Akter/.test(body),
   (body.split(/\r?\n/).find((l) => /Notified/.test(l)) || ""));
ok("the mention is audited", /Shirin Akter mentioned/.test(body),
   (body.split(/\r?\n/).find((l) => /mentioned/.test(l)) || ""));

// The picker inserts a handle rather than making the agent spell it.
await evaluate(`document.querySelector('button[aria-label="Mention a colleague"]').click()`);
await sleep(400);
await clickByText("Arif Chowdhury");
let composer = await evaluate(`document.getElementById('agent-reply').value`);
ok("the mention picker inserts a handle", /@Arif/.test(composer), composer);
await type("");

// ---- Saved replies -------------------------------------------------------
const savedDisabledInNote = await evaluate(`
  document.querySelector('button[aria-label="Saved replies"]').disabled
`);
ok("saved replies are unavailable while writing a note", savedDisabledInNote === true);

await clickByText("Reply");
await evaluate(`document.querySelector('button[aria-label="Saved replies"]').click()`);
await sleep(400);
await clickContaining("Refund timing");
composer = await evaluate(`document.getElementById('agent-reply').value`);
ok("a saved reply fills the composer", /3 business days/.test(composer), composer.slice(0, 50));

const stillNotSent = await outboundCount();
ok("a saved reply is not sent by picking it", stillNotSent === beforeOutbound,
   `${stillNotSent} outbound`);
await shot("inb08-2-saved-reply");
await type("");

// ---- Follow-up tasks -----------------------------------------------------
body = await evaluate(`document.body.innerText`);
ok("follow-ups section exists", /Follow-ups/.test(body));

// Follow-ups is collapsed by default now, and a closed <details> keeps its
// content out of innerText — so open the section before driving it.
await evaluate(`
  (() => {
    const summary = [...document.querySelectorAll('summary')].find(s => /Follow-ups/.test(s.innerText));
    const details = summary && summary.parentElement;
    if (details && !details.open) details.open = true;
    return true;
  })()
`);
await sleep(400);
await evaluate(`document.querySelector('button[aria-label="Add follow-up"]').click()`);
await sleep(500);
await evaluate(`
  (() => {
    const i = [...document.querySelectorAll('input')].find(i => /Confirm the reissue/.test(i.placeholder || ''));
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, 'Chase finance on the reissue');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(300);
await evaluate(`document.querySelector('button[aria-label="Save follow-up"]').click()`);
await sleep(600);

body = await evaluate(`document.body.innerText`);
ok("the follow-up is listed", /Chase finance on the reissue/.test(body));
ok("it carries an owner and a due time", /Rifat Karim ·/.test(body),
   (body.split(/\r?\n/).find((l) => /Rifat Karim ·/.test(l)) || ""));
ok("raising it is audited", /Follow-up raised/.test(body));
await shot("inb08-3-followup");

await evaluate(`
  (() => {
    const cb = [...document.querySelectorAll('input[type="checkbox"]')].find(c => /Chase finance/.test(c.closest('label').innerText));
    cb.click();
  })()
`);
await sleep(600);
body = await evaluate(`document.body.innerText`);
ok("completing it is audited", /Follow-up completed/.test(body));

ws.close();
