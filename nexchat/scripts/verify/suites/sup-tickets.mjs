// `/tickets` — `#ticketsView` from `preview (2).html`, over live state.
//
// The layout is the mockup's. What is behind it is `InboxProvider`, the same
// conversations `/inbox` works, so the assertions worth making are the ones a
// drawn view could not pass: that the tabs, KPIs and result count agree with
// the rows on screen, that every filter actually filters, and that a row
// drills through to the conversation it names.
import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";
import { AUDIT } from "../audit.mjs";

const rowCount = () => evaluate(`document.querySelectorAll('tbody tr').length`);

const cells = (name) =>
  evaluate(`
    (() => {
      const heads = [...document.querySelectorAll('th')].map(t => t.textContent.trim().toUpperCase());
      const i = heads.findIndex(h => h.startsWith(${JSON.stringify(name.toUpperCase())}));
      if (i < 0) return ["no such column"];
      return [...document.querySelectorAll('tbody tr')].map(r => r.children[i].innerText.trim());
    })()
  `);

/*
 * The KPI card is <div><span>label</span><pill>delta</pill></div>, then the
 * value, then the note — so the value is the article's second element child.
 * Read it, rather than parsing innerText: the delta lands before the figure
 * there, and `parseInt("Live…")` is NaN, which CDP cannot serialise and which
 * therefore arrives as `undefined` instead of as a number that fails a
 * comparison.
 */
const kpi = (label) =>
  evaluate(`
    (() => {
      const el = [...document.querySelectorAll('article span')].find(s => s.textContent.trim().toUpperCase() === ${JSON.stringify(label.toUpperCase())});
      if (!el) return -1;
      const value = el.closest('article').children[1];
      return value ? Number(value.textContent.trim()) : -1;
    })()
  `);

const tab = async (label) => {
  await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('[role="group"] button')].find(x => x.textContent.trim().startsWith(${JSON.stringify(label)}));
      if (!b) throw new Error('no such tab');
      b.click();
    })()
  `);
  await sleep(300);
};

const setFilter = async (id, value) => {
  await evaluate(`
    (() => {
      const sel = document.getElementById(${JSON.stringify(id)});
      if (!sel) throw new Error('no such filter');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, ${JSON.stringify(value)});
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()
  `);
  await sleep(300);
};

await goto("/tickets", { width: 1800, height: 1300 });
await sleep(800);

// ---- The mockup's sections are all present ------------------------------
const present = await evaluate(`
  (() => ({
    views: document.querySelectorAll('[aria-label="Saved ticket views"] button').length,
    filters: document.querySelectorAll('select[id^="ticket-filter-"]').length,
    kpis: document.querySelectorAll('article').length,
    cols: document.querySelectorAll('thead th').length,
    pager: !!document.querySelector('[aria-label="Ticket pagination"]'),
    showing: document.body.innerText.includes('Showing 1'),
  }))()
`);
ok("the saved-view tabs render", present.views >= 7, `${present.views} tabs`);
ok("all eight filters render and are bound", present.filters === 8, `${present.filters} selects`);
ok("the five-KPI strip renders", present.kpis === 5, `${present.kpis} cards`);
ok("the table has the mockup's eleven columns", present.cols === 11, `${present.cols} columns`);
ok("the footer carries a result count and pagination", present.pager && present.showing, JSON.stringify(present));

// ---- Live, not drawn ----------------------------------------------------
const total = await rowCount();
ok("every conversation has a row", total > 0, `${total} rows`);

const statuses = await cells("Lifecycle");
const open = statuses.filter((s) => /Queued|Offered|Assigned/i.test(s)).length;
const waiting = statuses.filter((s) => /Queued|Offered/i.test(s)).length;
const owned = statuses.filter((s) => /Assigned/i.test(s)).length;
const resolved = statuses.filter((s) => /Resolved/i.test(s)).length;
ok("Open conversations counts the open rows", (await kpi("Open conversations")) === open, `${await kpi("Open conversations")} vs ${open}`);
ok("Waiting for human counts the unowned rows", (await kpi("Waiting for human")) === waiting, `${await kpi("Waiting for human")} vs ${waiting}`);
ok("Human owned counts the assigned rows", (await kpi("Human owned")) === owned, `${await kpi("Human owned")} vs ${owned}`);
ok("Resolved counts the resolved rows", (await kpi("Resolved")) === resolved, `${await kpi("Resolved")} vs ${resolved}`);

// The SLA cell has to agree with the engine: a pickup clock only runs while
// the conversation is still waiting for someone to take it.
const slaCells = await cells("Priority / SLA");
const mismatched = statuses
  .map((s, i) => [s, slaCells[i]])
  .filter(([s, sla]) => /Assigned/i.test(s) && !/Picked up/i.test(sla));
ok("an assigned row reports its clock stopped, not a countdown", mismatched.length === 0, JSON.stringify(mismatched));

// ---- The tabs and filters actually narrow -------------------------------
await tab("Unassigned");
const unowned = await cells("Queue / owner");
ok("the Unassigned view shows only unowned rows", unowned.every((c) => /Unassigned/.test(c)), JSON.stringify(unowned));
await tab("All");

await setFilter("ticket-filter-channel", "WhatsApp");
const chans = await cells("Channel");
ok("the Channel filter narrows to one channel", chans.length > 0 && chans.every((c) => /WhatsApp/.test(c)), JSON.stringify(chans));

await setFilter("ticket-filter-channel", "Instagram");
ok("a filter matching nothing shows the mockup's empty state",
   (await evaluate(`document.body.innerText.includes('No tickets match these filters.')`)) === true);

await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Clear filters').click()`);
await sleep(350);
ok("Clear filters restores every row", (await rowCount()) === total, `${await rowCount()} vs ${total}`);

// ---- Selection ----------------------------------------------------------
await evaluate(`document.querySelector('tbody input[type="checkbox"]').click()`);
await sleep(300);
ok("selecting a row opens the bulk bar",
   (await evaluate(`document.body.innerText.includes('1 ticket selected')`)) === true);
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Clear').click()`);
await sleep(250);
ok("  and clearing it closes the bar",
   (await evaluate(`document.body.innerText.includes('ticket selected')`)) === false);

// ---- Sorting ------------------------------------------------------------
const sortState = () =>
  evaluate(`
    (() => {
      const th = [...document.querySelectorAll('th')].find(t => t.textContent.trim().toUpperCase().startsWith('PRIORITY'));
      return th ? th.getAttribute('aria-sort') : "missing";
    })()
  `);
const clickPriority = async () => {
  await evaluate(`[...document.querySelectorAll('th')].find(t => t.textContent.trim().toUpperCase().startsWith('PRIORITY')).querySelector('button').click()`);
  await sleep(250);
};
ok("columns start in queue order", (await sortState()) === "none", String(await sortState()));
await clickPriority();
ok("sorting by priority puts the highest band first",
   (await cells("Priority / SLA"))[0].startsWith("P0"), (await cells("Priority / SLA")).join(" | "));
ok("  and reports it to a screen reader", (await sortState()) === "ascending", String(await sortState()));
await clickPriority();
ok("a second click reverses it", (await sortState()) === "descending", String(await sortState()));
await clickPriority();
ok("a third click returns to queue order", (await sortState()) === "none", String(await sortState()));

// ---- A row drills through -----------------------------------------------
const firstCustomer = (await cells("Customer"))[0].split("\n")[0];
await evaluate(`document.querySelector('tbody tr td button').click()`);
await sleep(1700);
ok("opening a ticket goes to the inbox", (await evaluate(`location.pathname`)) === "/inbox", await evaluate(`location.pathname`));
ok("  with that conversation selected",
   (await evaluate(`document.body.innerText`)).includes(firstCustomer), firstCustomer);

// ---- Accessibility and layout -------------------------------------------
await goto("/tickets", { width: 1800, height: 1300 });
await sleep(700);
const a = await evaluate(AUDIT);
ok("no mechanical accessibility findings", Object.values(a).reduce((n, v) => n + v.length, 0) === 0, JSON.stringify(a));
await shot("sup-tickets");
for (const w of [1280, 1024, 768]) {
  await goto("/tickets", { width: w, height: 1000 });
  await sleep(400);
  const over = await evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  ok(`the wide table scrolls itself, not the page, at ${w}`, over <= 0, `${over}px`);
}

// ---- Reachable from both rails ------------------------------------------
await goto("/tickets", { width: 1600, height: 1000 });
await sleep(400);
ok("the supervisor rail links to it and marks it current",
   (await evaluate(`!!document.querySelector('a[href="/tickets"][aria-current]')`)) === true);
await goto("/inbox", { width: 1600, height: 1000 });
await sleep(600);
ok("the agent workspace rail links to it too",
   (await evaluate(`!!document.querySelector('a[href="/tickets"]')`)) === true);

ws.close();
