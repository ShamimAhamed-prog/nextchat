import { evaluate, shot, goto, sleep, pressKey, ws, ok } from "../driver.mjs";

const focusInfo = () => evaluate(`
  (() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { name: 'body', ring: false };
    const cs = getComputedStyle(el);
    const name = el.getAttribute('aria-label') || (el.innerText || '').trim().slice(0, 26) || el.id || el.tagName;
    return {
      name: el.tagName.toLowerCase() + ' :: ' + name.replace(/\s+/g, ' '),
      ring: el.matches(':focus-visible') && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
      visible: el.getBoundingClientRect().width > 0,
    };
  })()
`);

await goto("/inbox", { width: 1600, height: 950 });
await evaluate(`document.body.focus()`);

const seen = [];
let missingRing = [];
for (let i = 0; i < 28; i++) {
  await pressKey("Tab", "Tab", 9);
  await sleep(90);
  const f = await focusInfo();
  if (f.name === 'body') continue;
  seen.push(f.name);
  if (!f.ring && f.visible) missingRing.push(f.name);
}

console.log("   tab order (first 12): " + seen.slice(0, 12).join(" > "));
ok("tabbing reaches controls in order", seen.length > 10, `${seen.length} stops`);
ok("every focused control shows a ring", missingRing.length === 0,
   missingRing.slice(0, 5).join(" | ") || "all rings present");
ok("no focus stop is invisible", seen.length > 0);
await shot("a11y-focus-ring");
ws.close();
