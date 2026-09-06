import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

await goto("/inbox");

// --- composer controls are live -----------------------------------------
const wired = await evaluate(`
  (() => {
    const labels = ['Attach file', 'Attach image', 'Insert emoji'];
    return labels.map(l => {
      const b = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === l);
      return { label: l, present: Boolean(b), disabled: b ? b.disabled : null };
    });
  })()
`);
ok("all three composer controls exist and are enabled",
   wired.every(w => w.present && w.disabled === false),
   wired.map(w => w.label + (w.disabled ? ":disabled" : ":ok")).join(", "));

const fileInputs = await evaluate(`document.querySelectorAll('input[type="file"]').length`);
ok("real file inputs are mounted", fileInputs === 2, String(fileInputs));

// Emoji picker opens and inserts
await evaluate(`[...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Insert emoji').click()`);
await sleep(400);
const emojiCount = await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Insert emoji');
    return b.getAttribute('aria-expanded') === 'true'
      ? b.parentElement.querySelector('div.card-hairline').querySelectorAll('button').length : 0;
  })()
`);
ok("emoji picker opens", emojiCount > 0, `${emojiCount} emoji`);
await shot("inert-1-emoji");

await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Insert emoji');
    b.parentElement.querySelector('div.card-hairline').querySelectorAll('button')[0].click();
  })()
`);
await sleep(400);
const val = await evaluate(`document.getElementById('agent-reply').value`);
ok("emoji is inserted into the composer", val.length > 0, JSON.stringify(val));

// Attaching a file sends an attachment bubble
await evaluate(`
  (() => {
    const input = document.querySelectorAll('input[type="file"]')[0];
    const file = new File(['boarding pass placeholder'], 'boarding-pass.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()
`);
await sleep(700);
const body = await evaluate(`document.body.innerText`);
ok("attachment renders as a file card", body.includes("boarding-pass.pdf"));
ok("attachment is audited", body.includes("Agent sent file"),
   (body.split(/\r?\n/).find((l) => l.includes("Agent sent")) || ""));
await shot("inert-2-attachment");

// --- admin header search routes into the workspace search ----------------
await goto("/dashboard");
await evaluate(`
  (() => {
    const i = document.getElementById('admin-search');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, 'XKD4RP');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(300);
await evaluate(`[...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Search conversations').click()`);
await sleep(2200);

const url = await evaluate(`location.pathname`);
ok("search navigates to the workspace", url === "/inbox", url);
const applied = await evaluate(`document.querySelector('input[type="search"]')?.value ?? ""`);
ok("the query is carried across", applied === "XKD4RP", applied);
const rowsRaw = await evaluate(`[...document.querySelectorAll("li > button")].map(b => b.innerText)`);
const rows = rowsRaw.map((t) => t.split(String.fromCharCode(10))[0].trim());
ok("results are already filtered on arrival", rows.length === 1 && rows[0] === "Tanvir Rahman", rows.join(","));
await shot("inert-3-search-handover");

ws.close();
