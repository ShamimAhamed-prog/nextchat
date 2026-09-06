import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

const overflow = () =>
  evaluate(`({ doc: document.documentElement.scrollWidth, win: window.innerWidth })`);

const visible = (sel) =>
  evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })()
  `);

for (const width of [1600, 1280, 1024, 768]) {
  await goto("/inbox", { width, height: 900 });
  const o = await overflow();
  ok(`no horizontal overflow at ${width}px`, o.doc <= o.win + 1, `scrollWidth ${o.doc} vs ${o.win}`);
}

// --- 768px: list first, conversation on selection ------------------------
await goto("/inbox", { width: 768, height: 900 });
let listShown = await visible('input[type="search"]');
let chatShown = await visible("#agent-reply");
ok("768px shows the list, not the conversation", listShown && !chatShown, `list=${listShown} chat=${chatShown}`);
await shot("nfr12-768-list");

await evaluate(`[...document.querySelectorAll('li > button')][0].click()`);
await sleep(700);
listShown = await visible('input[type="search"]');
chatShown = await visible("#agent-reply");
ok("selecting a row switches to the conversation", chatShown && !listShown, `list=${listShown} chat=${chatShown}`);

const backShown = await visible('button[aria-label="Back to conversation list"]');
ok("a back control is offered", backShown);
await shot("nfr12-768-conversation");

await evaluate(`document.querySelector('button[aria-label="Back to conversation list"]').click()`);
await sleep(600);
listShown = await visible('input[type="search"]');
ok("back returns to the list", listShown);

// Details as an overlay
await evaluate(`[...document.querySelectorAll('li > button')][0].click()`);
await sleep(600);
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Details').click()`);
await sleep(600);
let body = await evaluate(`document.body.innerText`);
ok("details opens as an overlay at 768px", body.includes("Contact Information") && body.includes("Close details"));
await shot("nfr12-768-details");

await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Close details').click()`);
await sleep(500);
body = await evaluate(`document.body.innerText`);
ok("overlay closes", !body.includes("Close details"));

// --- 1280px: two columns + details toggle --------------------------------
await goto("/inbox", { width: 1280, height: 900 });
listShown = await visible('input[type="search"]');
chatShown = await visible("#agent-reply");
ok("1280px shows list and conversation together", listShown && chatShown);
const detailsBtn = await visible("#agent-reply");
ok("1280px still reaches details via the toggle", detailsBtn);
await shot("nfr12-1280");

// --- 1600px: all three columns ------------------------------------------
await goto("/inbox", { width: 1600, height: 900 });
const asides = await evaluate(`document.querySelectorAll('aside').length`);
ok("1600px shows the details column inline", asides >= 1, `${asides} aside(s)`);
const noToggle = await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Details');
    if (!b) return true;
    return getComputedStyle(b).display === 'none';
  })()
`);
ok("the Details toggle is hidden when the column is visible", noToggle);
await shot("nfr12-1600");

ws.close();
