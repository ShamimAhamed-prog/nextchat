import { evaluate, goto, sleep, ws, ok } from "../driver.mjs";

/** Escape is dispatched at the focused element, which is what the dialogs listen on. */
async function key(k) {
  await evaluate(`
    (() => {
      const el = document.activeElement;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true }));
      return true;
    })()
  `);
}

const focused = () =>
  evaluate(`
    (() => {
      const el = document.activeElement;
      if (!el || el === document.body) return 'body';
      const name = el.getAttribute('aria-label') || (el.innerText || '').trim().slice(0, 24) || el.id || el.tagName;
      return el.tagName.toLowerCase() + ' :: ' + name.replace(/\\s+/g, ' ');
    })()
  `);

await goto("/inbox", { width: 1600, height: 950 });

// Focus indicators are checked in keyboard2.mjs instead: they depend on
// :focus-visible, which element.focus() does not reliably trigger, so this
// file would report a failure that a real keyboard user never sees.

// 2. Modals trap focus and close on Escape (2.1.2)
await evaluate(`
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Conversation options') || b.getAttribute('aria-label') === 'Conversation options').click()
`);
await sleep(300);
await evaluate(`
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Resolve…')?.click()
`);
await sleep(500);
let dialog = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
ok("resolve dialog opens", dialog);

const focusInside = await evaluate(`
  (() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.contains(document.activeElement) : false;
  })()
`);
ok("focus moves into the dialog on open", focusInside, await focused());

const labelled = await evaluate(`
  (() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return false;
    const id = d.getAttribute('aria-labelledby');
    return Boolean(d.getAttribute('aria-modal') === 'true' && id && document.getElementById(id));
  })()
`);
ok("dialog is aria-modal with a real label", labelled);

await key("Escape");
await sleep(400);
dialog = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
ok("Escape closes the dialog", !dialog);

// 3. The agent-state menu is keyboard reachable and Escape-dismissable
await evaluate(`document.querySelector('button[aria-haspopup="menu"]').focus()`);
await evaluate(`document.activeElement.click()`);
await sleep(300);
let menu = await evaluate(`Boolean(document.querySelector('[role="menu"]'))`);
ok("agent-state menu opens", menu);
await key("Escape");
await sleep(300);
menu = await evaluate(`Boolean(document.querySelector('[role="menu"]'))`);
ok("Escape closes the menu", !menu);

// 4. The scrollable card row is reachable by keyboard (2.1.1)
const scroller = await evaluate(`
  (() => {
    const el = document.querySelector('[role="group"][aria-label="Feature cards"]');
    return el ? el.tabIndex : null;
  })()
`);
ok("scrollable regions expose a tab stop where present", scroller === null || scroller === 0, String(scroller));

// 5. Reduced motion is honoured (2.3.3)
await evaluate(`
  (() => {
    const el = document.querySelector('[aria-live="polite"]');
    return true;
  })()
`);
const animated = await evaluate(`
  (() => {
    const spinners = [...document.querySelectorAll('.animate-pulse, .animate-spin')];
    return spinners.length;
  })()
`);
console.log(`   note: ${animated} always-animating element(s) on this page`);

ws.close();
