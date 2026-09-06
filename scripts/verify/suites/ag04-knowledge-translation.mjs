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

const composerValue = () => evaluate(`document.getElementById('agent-reply')?.value ?? null`);
const panelText = () =>
  evaluate(`
    (() => {
      const i = document.getElementById('knowledge-search');
      return i ? i.closest('div').innerText : null;
    })()
  `);

await goto("/inbox", { width: 1600, height: 1000 });

// ---- Knowledge search ----------------------------------------------------
await evaluate(`document.querySelector('button[aria-label="Knowledge"]').click()`);
await sleep(600);
let panel = await panelText();
ok("knowledge panel opens from the composer", panel !== null, (panel || "").split(/\r?\n/)[0]);
ok("results carry their source and version", /Fare Rules v3/.test(panel), (panel || "").split(/\r?\n/).find((l) => /v\d/.test(l)) || "");
ok("it says nothing is sent by inserting", /Nothing is sent until you send it/.test(panel));
await shot("ag04-1-knowledge");

// Searching narrows, including on Bangla keywords the bot indexes.
await evaluate(`
  (() => {
    const i = document.getElementById('knowledge-search');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, 'baggage');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(450);
panel = await panelText();
// "Sky Star" legitimately mentions a baggage allowance, so full-text search
// returning it is correct behaviour. Assert narrowing, not exclusion.
const questionCount = (p) => (p || "").split(String.fromCharCode(10)).filter((l) => l.trim().endsWith("?")).length;
ok("search narrows the results", questionCount(panel) < 4 && /baggage/i.test(panel), String(questionCount(panel)) + " of 4 articles");

await evaluate(`
  (() => {
    const i = document.getElementById('knowledge-search');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, 'ব্যাগেজ');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(450);
panel = await panelText();
ok("a Bangla query finds the same article", /baggage/i.test(panel),
   (panel || "").split(/\r?\n/).filter((l) => /\?$/.test(l)).join(" | "));

// ---- Insert, and never send ---------------------------------------------
const before = await evaluate(`
  [...document.querySelectorAll('div.flex.justify-end')].length
`);
await clickByText("Insert");
let composer = await composerValue();
ok("inserting fills the composer", /20kg checked baggage/.test(composer ?? ""), (composer ?? "").slice(0, 50));

const after = await evaluate(`
  [...document.querySelectorAll('div.flex.justify-end')].length
`);
ok("inserting does not send", after === before, `${before} outbound before, ${after} after`);
await shot("ag04-2-inserted");

// The Bangla insert is the reviewed answer the bot already sends, not a
// generated translation.
await evaluate(`document.querySelector('button[aria-label="Knowledge"]').click()`);
await sleep(500);
await clickByText("Insert in Bangla");
composer = await composerValue();
ok("Bangla insert uses the approved Bangla answer", /ইকোনমি সেভার/.test(composer ?? ""),
   (composer ?? "").slice(-40));

// ---- Translation of what the customer actually wrote ---------------------
await goto("/inbox", { width: 1600, height: 1000 });
await selectRow("Tanvir Rahman");
const hasToggle = await evaluate(`
  Boolean([...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Translate'))
`);
ok("a non-English message offers a translation", hasToggle);

await clickByText("Translate");
let body = await evaluate(`document.body.innerText`);
ok("the translation reads correctly", /money has been taken but the ticket/i.test(body),
   (body.split(/\r?\n/).find((l) => /money has been taken/i.test(l)) || ""));
await shot("ag04-3-translation");

await clickByText("Hide translation");
body = await evaluate(`document.body.innerText`);
ok("it hides again", !/money has been taken but the ticket/i.test(body));

// ---- The policy the bot actually cited -----------------------------------
await selectRow("Rahat Islam");
body = await evaluate(`document.body.innerText`);
ok("the handoff summary lists what the bot cited", /Bot cited/i.test(body));
ok("it names the source and version", /Payments Policy v2/.test(body),
   (body.split(/\r?\n/).find((l) => /Payments Policy/.test(l)) || ""));

await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => /Payments Policy v2/.test(b.textContent));
    b.click();
  })()
`);
await sleep(700);
panel = await panelText();
ok("clicking a citation opens that exact article", panel !== null && /refunds take/i.test(panel),
   (panel || "").split(/\r?\n/).filter((l) => /\?$/.test(l)).join(" | "));
ok("it opens only that article, not the whole base", !/Sky Star tiers/.test(panel ?? ""));
await shot("ag04-4-cited-article");

ws.close();
