// The nav rail and header were reduced to give the content column more
// room, and /dashboard and /admin were made static app shells like /inbox
// already was. This guards both: the chrome stays small, and it stays put.
import { evaluate, goto, ok, ws } from "../driver.mjs";

await goto("/inbox", { width: 1600, height: 900 });
let railW = await evaluate(`Math.round(document.querySelector('aside').getBoundingClientRect().width)`);
ok("the /inbox rail is compact", railW <= 72, `${railW}px`);

for (const path of ["/dashboard", "/admin"]) {
  await goto(path, { width: 1600, height: 900 });

  railW = await evaluate(`Math.round(document.querySelector('aside').getBoundingClientRect().width)`);
  ok(`${path} rail is compact`, railW <= 250, `${railW}px`);

  const headerH = await evaluate(`Math.round(document.querySelector('header').getBoundingClientRect().height)`);
  ok(`${path} header is compact`, headerH <= 72, `${headerH}px`);

  // Scroll the inner content column and confirm the chrome does not move.
  const before = await evaluate(`
    (() => {
      const h = document.querySelector('header').getBoundingClientRect();
      const a = document.querySelector('aside').getBoundingClientRect();
      return { headerTop: Math.round(h.top), asideTop: Math.round(a.top) };
    })()
  `);
  const scrolled = await evaluate(`
    (() => {
      const sc = [...document.querySelectorAll('div')].find(
        d => d.className.includes('overflow-y-auto') && d.scrollHeight > d.clientHeight + 50
      );
      if (!sc) return false;
      sc.scrollTop = sc.scrollHeight;
      return true;
    })()
  `);
  ok(`${path} has an internal scroll region`, scrolled === true);

  const pageScrolls = await evaluate(`document.documentElement.scrollHeight > window.innerHeight + 1`);
  ok(`${path} page itself does not scroll`, pageScrolls === false);

  const after = await evaluate(`
    (() => {
      const h = document.querySelector('header').getBoundingClientRect();
      const a = document.querySelector('aside').getBoundingClientRect();
      return { headerTop: Math.round(h.top), asideTop: Math.round(a.top) };
    })()
  `);
  ok(`${path} nav does not move when content scrolls`,
     after.headerTop === before.headerTop && after.asideTop === before.asideTop,
     `header ${before.headerTop}->${after.headerTop}, aside ${before.asideTop}->${after.asideTop}`);
}

// The brand wordmark in the expanded rail must render whole, not truncated
// mid-word — it collided with the collapse chevron once already.
await goto("/admin", { width: 1600, height: 900 });
const brand = await evaluate(`
  (() => {
    const btn = document.querySelector('button[aria-label="Collapse sidebar"]');
    const wrap = btn.parentElement.querySelector('span.min-w-0');
    const inner = wrap.firstElementChild.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return { text: wrap.innerText.trim(), clipped: Math.round(inner.width - w.width) };
  })()
`);
ok("the rail wordmark renders whole", brand.text === "Takeoff Travels" && brand.clipped <= 0,
   `"${brand.text}" clipped by ${brand.clipped}px`);

ws.close();
