import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

await goto("/inbox", { width: 1600, height: 950 });

// Default is English
ok("defaults to English", (await evaluate(`document.documentElement.lang`)) === "en");
let body = await evaluate(`document.body.innerText`);
ok("English chrome renders", body.includes("Support Inbox") && body.includes("Assigned to me"));

const toggle = await evaluate(`
  Boolean([...document.querySelectorAll('[role="group"]')].find(g => g.getAttribute('aria-label') === 'Interface language'))
`);
ok("a language toggle exists", toggle);
await shot("nfr15-1-english");

// Switch to Bangla
await evaluate(`
  (() => {
    const g = [...document.querySelectorAll('[role="group"]')].find(g => g.getAttribute('aria-label') === 'Interface language');
    [...g.querySelectorAll('button')].find(b => b.getAttribute('lang') === 'bn').click();
  })()
`);
await sleep(700);

ok("document language switches", (await evaluate(`document.documentElement.lang`)) === "bn");
body = await evaluate(`document.body.innerText`);
ok("header is translated", body.includes("সাপোর্ট ইনবক্স"));
ok("inbox views are translated", body.includes("আমার দায়িত্বে") && body.includes("এসএলএ ঝুঁকি"));
ok("details panel is translated", body.includes("যোগাযোগের তথ্য") && body.includes("টিকিট বিবরণ"));
ok("booking actions heading is translated", body.includes("বুকিং কার্যক্রম"));
ok("agent state is translated", body.includes("উপলব্ধ"));
ok("English chrome is gone", !body.includes("Support Inbox") && !body.includes("Contact Information"));
await shot("nfr15-2-bangla");

// Placeholder and aria labels
const ph = await evaluate(`document.querySelector('input[type="search"]').placeholder`);
ok("search placeholder is translated", ph.includes("পিএনআর"), ph);
const back = await evaluate(`
  (() => {
    const b = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').includes('কথোপকথন'));
    return b ? b.getAttribute('aria-label') : null;
  })()
`);
ok("aria-labels are translated too", back !== null, back ?? "none found");

// Untranslated surfaces fall back to English rather than showing keys
await evaluate(`document.querySelector('a[href="/admin"]').click()`);
await sleep(1800);
const admin = await evaluate(`document.body.innerText`);
ok("admin console falls back to readable English", admin.includes("Tenant configuration") || admin.includes("Channels"),
   admin.split(/\r?\n/).slice(0, 3).join(" / "));
ok("no raw keys leak anywhere", !admin.includes("undefined"));

// Preference survives a reload
await goto("/inbox", { width: 1600, height: 950 });
ok("choice persists across a reload", (await evaluate(`document.documentElement.lang`)) === "bn");

// Reset for later runs
await evaluate(`
  (() => {
    const g = [...document.querySelectorAll('[role="group"]')].find(g => g.getAttribute('aria-label') === 'Interface language');
    [...g.querySelectorAll('button')].find(b => b.getAttribute('lang') === 'en').click();
  })()
`);
await sleep(400);
ok("switching back works", (await evaluate(`document.documentElement.lang`)) === "en");

ws.close();
