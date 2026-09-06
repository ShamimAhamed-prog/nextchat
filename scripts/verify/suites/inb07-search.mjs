import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

await goto("/inbox");

async function search(q) {
  await evaluate(`
    (() => {
      const i = document.querySelector('input[type="search"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(i, ${JSON.stringify(q)});
      i.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
  await sleep(450);
  const raw = await evaluate(`[...document.querySelectorAll('li > button')].map(b => b.innerText)`);
  // First line of each row is the customer name.
  return raw.map((t) => t.split(/\r?\n/)[0].trim());
}

ok("hint lists the prefixes", (await evaluate(`document.getElementById('ticket-search-hint').innerText`)).includes("pnr:"));

let r = await search("XKD4RP");
ok("finds by PNR", r.length === 1 && r[0] === "Tanvir Rahman", r.join(","));

r = await search("988803");
ok("finds by phone digits", r.length === 1 && r[0] === "Tanvir Rahman", r.join(","));

r = await search("rahat.islam@example.com");
ok("finds by email", r.length === 1 && r[0] === "Rahat Islam", r.join(","));

r = await search("BK7729X");
ok("finds by payment reference", r.length === 1 && r[0] === "Tanvir Rahman", r.join(","));

r = await search("c1");
ok("finds by conversation id", r.includes("Tanvir Rahman"), r.join(","));

r = await search("tag:vip");
ok("finds by tag", r.length === 1 && r[0] === "Tanvir Rahman", r.join(","));

r = await search("assignee:me");
ok("finds by assignee", r.length === 1 && r[0] === "Tanvir Rahman", r.join(","));

r = await search("assignee:unassigned");
ok("finds unassigned", r.length >= 2 && !r.includes("Tanvir Rahman"), r.join(","));

r = await search("since:30m");
ok("date range: recent only", r.length >= 1 && !r.includes("Chieko Chute"), r.join(","));

r = await search("until:1h");
ok("date range: older only", r.includes("Chieko Chute") && !r.includes("Tanvir Rahman"), r.join(","));

r = await search("channel:whatsapp tag:vip");
ok("terms combine (AND)", r.length === 1 && r[0] === "Tanvir Rahman", r.join(","));

r = await search("nonsense:value");
ok("unknown prefix narrows, not widens", r.length === 0, r.join(","));

r = await search("zzzz");
const empty = await evaluate(`document.querySelector('ul li').innerText`);
ok("empty state names the query", empty.includes("zzzz"), empty);

const count = await evaluate(`document.getElementById('ticket-search-hint').innerText`);
ok("shows match count while searching", /0 \/ \d+ in this view/.test(count), count);
await shot("inb07-search");

ws.close();
