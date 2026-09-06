// Nothing should scroll sideways. Every one of these was a real regression
// caught by hand at least once; this keeps them caught automatically.
import { evaluate, goto, ok, ws } from "../driver.mjs";

const surfaces = ["/", "/sign-in", "/sign-up", "/onboarding", "/inbox", "/dashboard", "/admin"];

for (const width of [390, 768, 1440]) {
  for (const path of surfaces) {
    await goto(path, { width, height: 900 });
    const m = await evaluate(`({
      scrollW: document.documentElement.scrollWidth,
      winW: window.innerWidth
    })`);
    ok(`${path} does not scroll sideways at ${width}px`, m.scrollW <= m.winW + 1,
       `scrollWidth ${m.scrollW} vs ${m.winW}`);
  }
}

// The toggle knob has to stay inside its track in both states — it used to
// overflow by 14px when on and collide with its own label.
await goto("/admin", { width: 1600, height: 1200 });
// The toggles live inside panes, and /admin opens on Overview, which has
// none — without this the check ran over an empty list and passed saying
// nothing. Security & data carries three of them.
await evaluate(`[...document.querySelectorAll('[role="tab"]')].find(b => b.textContent.trim() === 'Security & data').click()`);
await new Promise((r) => setTimeout(r, 500));
const knobs = await evaluate(`
  (() => {
    return [...document.querySelectorAll('[role="switch"]')].slice(0, 4).map(b => {
      const track = b.querySelector('span');
      const knob = track.querySelector('span');
      const t = track.getBoundingClientRect();
      const k = knob.getBoundingClientRect();
      return { checked: b.getAttribute('aria-checked'), overflow: Math.round(k.right - t.right) };
    });
  })()
`);
ok("the admin toggles are on screen to measure", knobs.length >= 3, `${knobs.length} switches`);
ok("toggle knobs stay inside their track", knobs.length > 0 && knobs.every((k) => k.overflow <= 0),
   JSON.stringify(knobs));

ws.close();
