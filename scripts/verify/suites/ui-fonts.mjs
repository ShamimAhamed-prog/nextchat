// The typefaces are self-hosted from `src/app/fonts/` rather than fetched by
// `next/font/google`, because the Google loader's failure mode is silent: a
// build that cannot reach fonts.googleapis.com warns once and then ships a
// system fallback, and nothing goes red. The absence of that warning is not
// evidence the fonts loaded, so this asserts the faces are actually resolved
// and applied — which is the thing that was at risk.
import { evaluate, goto, ok, sleep, ws } from "../driver.mjs";

await goto("/", { width: 1280, height: 900 });
await sleep(600);

const faces = await evaluate(`
  document.fonts.ready.then(() => {
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight);
    return { loaded, count: document.fonts.size };
  })
`);
ok("the self-hosted faces load", faces.loaded.length > 0, faces.loaded.join(" | ") || `none of ${faces.count}`);

// Every family a component asks for by CSS variable must resolve to a real
// face, not to the generic fallback the loader would have left behind.
for (const v of ["--font-poppins", "--font-inter", "--font-space-grotesk", "--font-outfit"]) {
  const resolved = await evaluate(`getComputedStyle(document.body).getPropertyValue(${JSON.stringify(v)}).trim()`);
  ok(`${v} resolves to a real family`, resolved.length > 0 && !/^(sans-serif|serif|monospace)$/.test(resolved), resolved || "empty");
  /*
   * Check the *first* family in the stack, not the stack.
   *
   * `next/font/local` sets each variable to a pair — `"poppins", "poppins
   * Fallback"` — where the second is a synthetic face carrying the real
   * one's metrics, to hold layout steady before it arrives.
   * `document.fonts.check()` is true only when *every* family it is given
   * is available, and that metric face stays `unloaded` unless something
   * on the page actually falls back to it. So checking the whole stack
   * asked "did the fallback get exercised?" and answered a question about
   * the real face with it: this assertion passed or failed on which text
   * happened to be painted, and it duly flipped when the landing page's
   * markup changed, having nothing to do with whether a font loaded.
   *
   * The real faces are what matters and they resolve on their own — every
   * one reports `loaded` in `document.fonts` (asserted above).
   */
  const family = await evaluate(`getComputedStyle(document.body).getPropertyValue(${JSON.stringify(v)}).split(',')[0].trim()`);
  const usable = await evaluate(`document.fonts.check(${JSON.stringify(`16px ${family}`)})`);
  ok(`  and the browser can actually use ${family}`, usable === true, `check('16px ${family}') = ${usable}`);
}

// The body renders in Poppins, so a fallback would show up here first.
const bodyFamily = await evaluate(`getComputedStyle(document.body).fontFamily`);
ok("body is set in the self-hosted stack", /poppins|__/i.test(bodyFamily), bodyFamily.slice(0, 90));

ws.close();
