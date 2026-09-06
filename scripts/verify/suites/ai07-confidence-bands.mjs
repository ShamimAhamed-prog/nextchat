// AI-07. The tenant's confidence bands were editable, versioned, approvable
// and completely inert: `DetailsPanel` hardcoded 0.85/0.45 — the same values
// as the shipped defaults, so publishing a new threshold changed nothing and
// looked like it had. This suite is the proof that it now does, end to end:
// edit the band in Settings, publish it, and watch the same conversation
// change how it reads and what an agent is allowed to do with the draft.
//
// Everything here navigates by clicking real links. `goto()` is a full
// browser navigation, which would drop the published config on the floor —
// both providers live in `(workspace)/layout.tsx` and only survive
// client-side transitions.
import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

const text = () => evaluate(`document.body.innerText`);
const clickText = async (label, exact = true) => {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(b =>
        ${exact} ? b.textContent.trim() === ${JSON.stringify(label)} : b.textContent.includes(${JSON.stringify(label)}));
      if (!b) throw new Error('no control ' + ${JSON.stringify(label)});
      b.click(); return true;
    })()
  `);
  await sleep(600);
};
const openConversation = async (name) => {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('li > button')].find(b => b.innerText.includes(${JSON.stringify(name)}));
      if (!b) throw new Error('no conversation ' + ${JSON.stringify(name)});
      b.click(); return true;
    })()
  `);
  await sleep(700);
};
// Ancestors of the card match this too, and they come first in document
// order — the last match is the card itself.
const draftCard = () =>
  evaluate(`
    (() => {
      const els = [...document.querySelectorAll('div')].filter(d => /AI suggested reply/.test(d.textContent) && d.querySelector('button'));
      return els.length ? els[els.length - 1].innerText : "";
    })()
  `);

// Tanvir Rahman is the one seeded conversation already assigned, so it is the
// one with a composer; its top intent is flight.book at 0.94, which sits
// above the default High band of 0.85 and below a raised one of 0.95.
await goto("/inbox", { width: 1600, height: 1200 });
await sleep(700);
await openConversation("Tanvir Rahman");

// ---- The intent trail reads through the published bands ------------------
let body = await text();
// The trail's band label is uppercased in CSS and `innerText` returns it
// transformed, so this matches case-insensitively — trap 1 in the harness
// README. The draft card's own label is not transformed and is matched as-is.
ok("the intent trail names a band, not just a number", /\bHIGH\b/i.test(body) && /94%/.test(body), body.match(/.{0,28}94%/)?.[0] ?? "no 94%");

// ---- A High-band draft keeps its one-click send --------------------------
await clickText("AI Reply");
await sleep(1400); // the draft resolves on a 1s timer
let card = await draftCard();
ok("requesting a draft produces one", /AI suggested reply/i.test(card), card.split(String.fromCharCode(10))[0] ?? "no card");
ok("the card states the band it was scored in", /High band/.test(card) && /94%/.test(card), card.replace(/\s+/g, " ").slice(0, 100));
ok("a High-band draft may be sent as-is", /Send as-is/.test(card));
await shot("ai07-1-high-band-draft");

// ---- Raise the bar in Settings and publish it ----------------------------
await evaluate(`document.querySelector('a[href="/admin"]').click()`);
await sleep(900);
await clickText("AI & content");
body = await text();
ok("the AI pane explains that the bands reach /inbox", /Send as-is/i.test(body) && /take effect on publish/i.test(body),
   body.includes("Published bands") ? "hint present, wording drifted" : "AI pane not rendered");

await evaluate(`
  (() => {
    const label = [...document.querySelectorAll('label')].find(l => l.textContent.trim().startsWith('High'));
    if (!label) throw new Error('no High field');
    const input = label.querySelector('input');
    if (!input) throw new Error('High field has no input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '0.95');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(500);
body = await text();
ok("raising the threshold registers as a draft change", /draft change/.test(body));

await clickText("Review & publish", false);
await sleep(700);
let dialog = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);
ok("the band change appears in the publish diff", /confidence/i.test(dialog), dialog.replace(/\s+/g, " ").slice(0, 120));
// Tightening a control never needs a second approver — `isSensitiveChange`
// is directional, and raising the bar for automation reduces risk.
ok("tightening the band needs no second approver", !/second approver/i.test(dialog));

await evaluate(`
  (() => {
    const i = document.querySelector('[role="dialog"] input, [role="dialog"] textarea');
    if (!i) throw new Error('no publish note field');
    const proto = i.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(i, 'Raise the direct-answer bar after calibration review');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(300);
await evaluate(`
  (() => {
    const btns = [...document.querySelectorAll('[role="dialog"] button')].filter(b => /publish/i.test(b.textContent));
    btns[btns.length - 1].click();
  })()
`);
await sleep(1000);

// ---- The same conversation now reads and behaves differently -------------
await evaluate(`document.querySelector('a[href="/inbox"]').click()`);
await sleep(900);
await openConversation("Tanvir Rahman");
body = await text();
ok("the unchanged 94% now reads as a lower band", /GUARDED/i.test(body), body.match(/.{0,28}94%/)?.[0] ?? "no 94%");

card = await draftCard();
ok("the draft survived the round trip", /AI suggested reply/i.test(card), card.split(String.fromCharCode(10))[0] ?? "no card");
ok("the same draft is no longer sendable as-is", !/Send as-is/.test(card), card.replace(/\s+/g, " ").slice(0, 110));
ok("it names the threshold that withheld it", /95%/.test(card), card.replace(/\s+/g, " ").slice(0, 140));
ok("the agent can still edit or discard it", /Edit before sending/.test(card) && /Discard/.test(card));
await shot("ai07-2-guarded-after-publish");

ws.close();
