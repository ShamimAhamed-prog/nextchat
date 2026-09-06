// Multi-line replies, and drafts that survive switching conversation.
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

const type = async (value) => {
  await evaluate(`
    (() => {
      const i = document.getElementById('agent-reply');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(i, ${JSON.stringify(value)});
      i.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
  await sleep(300);
};

const composer = () => evaluate(`document.getElementById('agent-reply')?.value ?? null`);
const outbound = () => evaluate(`document.querySelectorAll('[data-outbound]').length`);

await goto("/inbox", { width: 1600, height: 1000 });

// ---- Multi-line replies --------------------------------------------------
const tag = await evaluate(`document.getElementById('agent-reply').tagName`);
ok("the composer is a textarea, so a reply can have paragraphs", tag === "TEXTAREA", tag);

await type("First line.\nSecond line.");
ok("it holds a newline", (await composer()).includes("\n"), JSON.stringify(await composer()));

// Enter sends; Shift+Enter must not.
const before = await outbound();
await evaluate(`
  (() => {
    const i = document.getElementById('agent-reply');
    i.focus();
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
  })()
`);
await sleep(500);
ok("Shift+Enter does not send", (await outbound()) === before, `${before} before, ${await outbound()} after`);

await evaluate(`
  (() => {
    const i = document.getElementById('agent-reply');
    i.focus();
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  })()
`);
await sleep(700);
ok("Enter sends", (await outbound()) === before + 1, `${before} before, ${await outbound()} after`);
ok("sending clears the composer", (await composer()) === "", JSON.stringify(await composer()));
await shot("ux-1-multiline");

// ---- Drafts survive switching conversation -------------------------------
await type("Half-written reply the agent has not sent yet");
const draft = await composer();

let rows = await evaluate(`[...document.querySelectorAll('li > button')].map(b => b.innerText)`);
ok("the list marks a conversation that has an unsent draft",
   rows.some((r) => /Draft/.test(r) && /Tanvir Rahman/.test(r)),
   rows.find((r) => /Draft/.test(r))?.split(String.fromCharCode(10))[0] ?? "no draft marker");

await selectRow("Rahat Islam");
const otherComposer = await composer();
ok("the draft does not leak into another conversation", otherComposer === "" || otherComposer === null,
   JSON.stringify(otherComposer));

await selectRow("Tanvir Rahman");
ok("switching back restores the draft", (await composer()) === draft, JSON.stringify(await composer()));
await shot("ux-2-draft-restored");

ws.close();
