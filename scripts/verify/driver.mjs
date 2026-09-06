/**
 * Browser driver for the verification suites.
 *
 * Deliberately dependency-free: it speaks the Chrome DevTools Protocol over
 * Node's built-in `WebSocket` and drives whatever Chrome or Edge is already
 * on the machine. That is why `npm run verify` works on a clean checkout with
 * no `npm install` beyond the app's own dependencies and no browser download
 * — the alternative, adding Playwright, is a ~300 MB install and a second
 * toolchain to keep current for a suite that only needs click, type, read and
 * screenshot.
 *
 * Each suite is a plain `.mjs` file run as its own process by `run.mjs`, so a
 * suite that hangs or throws cannot take the others down with it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3111";
const CDP = process.env.VERIFY_CDP ?? "http://127.0.0.1:9222";
const SHOT_DIR = process.env.VERIFY_SHOT_DIR ?? ".verify-shots";

let failures = 0;

/**
 * One assertion. `label` is what the run log shows, `extra` is the observed
 * value — always pass it: a failing assertion that does not say what it saw
 * costs more time than it saves.
 */
export function ok(label, condition, extra = "") {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`);
}

// A suite fails the run rather than merely printing FAIL lines.
process.on("exit", (code) => {
  if (failures > 0 && code === 0) process.exitCode = 1;
});

const targets = await (await fetch(`${CDP}/json/list`)).json();
const page = targets.find((t) => t.type === "page");
if (!page) {
  console.error("No browser page target found — is the run harness up?");
  process.exit(2);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let id = 0;
const pending = new Map();

/**
 * Everything the page has written to the console since the last `goto`.
 *
 * `Runtime.enable` was already on, so these events were arriving and being
 * dropped. Collecting them is what lets a suite assert on Next's runtime
 * warnings — the image aspect-ratio one, the `next/font` fallback, hydration
 * mismatches — none of which fail a build or show up in the DOM, so they
 * previously only surfaced by someone reading a dev console by hand.
 */
const consoleMessages = [];

const argText = (a) => (a.value !== undefined ? String(a.value) : (a.description ?? a.unserializableValue ?? ""));

ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    consoleMessages.push({
      level: msg.params.type,
      text: (msg.params.args ?? []).map(argText).join(" ").trim(),
    });
  } else if (msg.method === "Log.entryAdded") {
    const e = msg.params.entry;
    // The URL is the whole value of a "Failed to load resource" entry.
    consoleMessages.push({ level: e.level, text: [e.text, e.url].filter(Boolean).join(" ") });
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    consoleMessages.push({ level: "error", text: d.exception?.description ?? d.text ?? "uncaught exception" });
  }
};

function send(method, params = {}) {
  return new Promise((resolve) => {
    const n = ++id;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");

/**
 * Evaluate an expression in the page and return it by value. Throws with the
 * page-side message rather than returning undefined, so a typo in a selector
 * fails loudly instead of quietly asserting against `undefined`.
 *
 * Note: the expression is a string sent to the browser, so a regex literal
 * inside it has to survive this file's own escaping. `String.fromCharCode(10)`
 * is the reliable way to split on newlines in page-side code.
 */
export async function evaluate(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.result?.exceptionDetails) {
    const detail =
      r.result.exceptionDetails.exception?.description ??
      JSON.stringify(r.result.exceptionDetails);
    throw new Error("page evaluate failed: " + detail);
  }
  return r.result?.result?.value;
}

export async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  await mkdir(SHOT_DIR, { recursive: true });
  await writeFile(path.join(SHOT_DIR, `${name}.png`), Buffer.from(r.result.data, "base64"));
}

export async function goto(pathname, { width = 1600, height = 1000 } = {}) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  consoleMessages.length = 0;
  await send("Page.navigate", { url: BASE + pathname });
  // Fixed settle rather than a load event: these pages hydrate and then run
  // timers (offers, tickers), and the suites assert on post-hydration state.
  await sleep(2600);
}

/**
 * Real key events. `element.focus()` does not reliably set `:focus-visible`,
 * so focus-indicator checks must go through the input domain to mean anything.
 */
export async function pressKey(key, code = key, windowsVirtualKeyCode = 0) {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
}

/** What the page has logged since the last `goto`. `levels` filters by type. */
export function consoleSince(levels = ["error", "warning", "assert"]) {
  return consoleMessages.filter((m) => levels.includes(m.level));
}

export { ws };
