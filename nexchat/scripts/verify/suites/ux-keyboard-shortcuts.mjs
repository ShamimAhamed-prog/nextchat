import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

const press = async (key) => {
  await evaluate(`
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true }))
  `);
  await sleep(450);
};

const selectedName = () =>
  evaluate(`
    (() => {
      const b = [...document.querySelectorAll('li > button')].find(b => b.getAttribute('aria-current') === 'true')
        || [...document.querySelectorAll('li > button')].find(b => /border-coral|ring/.test(b.className));
      const header = document.querySelector('section h2, section span.text-base');
      return header ? header.textContent.trim() : (b ? b.innerText.split(String.fromCharCode(10))[0].trim() : null);
    })()
  `);

const rows = () =>
  evaluate(`[...document.querySelectorAll('li > button')].map(b => b.innerText.split(String.fromCharCode(10))[0].trim())`);

await goto("/inbox", { width: 1600, height: 1000 });

// ---- Discoverable --------------------------------------------------------
let body = await evaluate(`document.body.innerText`);
ok("the workspace advertises the shortcuts", /Press \? for shortcuts/.test(body));

await press("?");
let dialog = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);
ok("? opens the shortcut list", /Keyboard shortcuts/.test(dialog), dialog.split(String.fromCharCode(10))[0]);
ok("it says they are ignored while typing", /ignored while you are typing/.test(dialog));
ok("it lists the core loop", /Next \/ previous/.test(dialog) && /Reply/.test(dialog) && /Resolve/.test(dialog));
await shot("ux-3-shortcuts");

await press("Escape");
ok("Escape closes it", (await evaluate(`document.querySelector('[role="dialog"]')`)) === null);

// ---- j / k walk the visible list ----------------------------------------
const order = await rows();
await press("j");
let name = await selectedName();
ok("j moves down the queue", name === order[1] || name === order[0], `${name} (order: ${order.join(", ")})`);

await press("k");
name = await selectedName();
ok("k moves back up", name === order[0], `${name}`);

// ---- Typing must not trigger them ---------------------------------------
await evaluate(`document.getElementById('agent-reply').focus()`);
const beforeTyping = await selectedName();
await evaluate(`
  (() => {
    const i = document.getElementById('agent-reply');
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
  })()
`);
await sleep(500);
ok("shortcuts do not fire while typing in the composer",
   (await selectedName()) === beforeTyping, `${beforeTyping} -> ${await selectedName()}`);

const stillReply = await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Reply');
    return b ? b.getAttribute('aria-pressed') : null;
  })()
`);
ok("typing 'n' did not flip the composer to note mode", stillReply === "true", String(stillReply));

// ---- r and n reach the composer -----------------------------------------
await evaluate(`document.getElementById('agent-reply').blur()`);
await press("n");
const noteOn = await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Internal note');
    return b ? b.getAttribute('aria-pressed') : null;
  })()
`);
ok("n switches to internal note", noteOn === "true", String(noteOn));

await evaluate(`document.activeElement.blur()`);
await press("r");
const focused = await evaluate(`document.activeElement.id`);
ok("r focuses the reply composer", focused === "agent-reply", focused);

// ---- / focuses search ----------------------------------------------------
await evaluate(`document.activeElement.blur()`);
await press("/");
ok("/ focuses the conversation search", (await evaluate(`document.activeElement.id`)) === "ticket-search",
   await evaluate(`document.activeElement.id`));

ws.close();
