/**
 * Runs every verification suite against a production build.
 *
 *   npm run verify              — all suites
 *   npm run verify -- ag06 sup  — only suites whose name contains these
 *
 * Starts `next start` and a headless browser, runs each suite in its own
 * process, tears both down, and exits non-zero if any assertion failed.
 *
 * These are end-to-end checks against the real rendered app, not unit tests.
 * That is a deliberate choice for this codebase: almost everything worth
 * asserting here is a *rendered consequence* of state — a masked field, a
 * disabled composer, a routing decision that yields to a tighter SLA — and a
 * unit test of the reducer would pass while the panel showing it was broken.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SUITES = path.join(HERE, "suites");
const PORT = Number(process.env.VERIFY_PORT ?? 3111);
const CDP_PORT = Number(process.env.VERIFY_CDP_PORT ?? 9222);
const BASE = `http://localhost:${PORT}`;
const CDP = `http://127.0.0.1:${CDP_PORT}`;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    console.error(
      "No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser executable.",
    );
    process.exit(2);
  }
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, label, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await sleep(500);
    }
  }
  console.error(`Timed out waiting for ${label} at ${url}`);
  process.exit(2);
}

/** Windows leaves orphans behind unless the whole tree goes. */
function killTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

/**
 * `--dev` runs the suites against `next dev` instead of `next start`.
 *
 * Production is the right default — it is what ships — but React only emits
 * the detailed hydration-mismatch warning in development, so a suite that
 * asserts on hydration (`theme-light`, `ui-console-clean`) genuinely cannot
 * fail against a production build. That is a hole, not a preference: the
 * `data-theme` pre-paint script tripped exactly that warning and every
 * production run stayed green. Dev is also slower and compiles on demand, so
 * it is opt-in rather than the default.
 *
 * If a dev server is already listening on the app port, the run attaches to
 * it rather than spawning one. Next refuses to start a second `next dev` for
 * the same directory at all, so a developer with `npm run dev` up otherwise
 * has no way to run these — point `VERIFY_PORT` at their server instead.
 */
const argv = process.argv.slice(2);
const dev = argv.includes("--dev");
const filters = argv.filter((a) => a !== "--dev");
const all = (await readdir(SUITES)).filter((f) => f.endsWith(".mjs")).sort();
const suites = filters.length
  ? all.filter((f) => filters.some((needle) => f.includes(needle)))
  : all;

if (suites.length === 0) {
  console.error(`No suites matched ${filters.join(", ")}. Available:\n  ${all.join("\n  ")}`);
  process.exit(2);
}

if (!dev && !existsSync(path.join(HERE, "..", "..", ".next"))) {
  console.error("No .next build found — run `npm run build` first.");
  process.exit(2);
}

/**
 * If something is already listening, our own server fails silently and
 * every suite then runs against whatever is there — usually a stale build
 * from an earlier session. That produces confident, wrong results, so refuse
 * to start rather than test the wrong thing.
 */
async function isListening(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function refuseIfPortBusy(url, label, hint) {
  try {
    await fetch(url);
  } catch {
    return; // nothing there, which is what we want
  }
  console.error(
    `Something is already listening on ${url} (${label}).
` +
      `These suites would run against it rather than a fresh build.
${hint}`,
  );
  process.exit(2);
}

let server;
let browser;
let profileDir;

function shutdown() {
  killTree(server);
  killTree(browser);
}
process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

const attached = dev && (await isListening(BASE));
if (attached) {
  console.log(`Attaching to the dev server already on ${BASE}.`);
} else {
  await refuseIfPortBusy(
    BASE,
    "the app port",
    process.platform === "win32"
      ? `Free it with:  powershell -Command "Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
      : `Free it with:  lsof -ti tcp:${PORT} | xargs kill -9`,
  );
}
await refuseIfPortBusy(`${CDP}/json/list`, "the debug port", `Close the browser using port ${CDP_PORT}.`);

try {
  // Node's own binary against Next's JS entry point, rather than the `.bin`
  // shim: `shell: true` with an argument array is a command-injection footgun
  // that Node now deprecates, and Windows refuses to spawn a `.cmd` without
  // one. Going straight to the script sidesteps both.
  if (!attached) {
    const nextEntry = path.join(HERE, "..", "..", "node_modules", "next", "dist", "bin", "next");
    server = spawn(process.execPath, [nextEntry, dev ? "dev" : "start", "-p", String(PORT)], {
      cwd: path.join(HERE, "..", ".."),
      stdio: "ignore",
      detached: process.platform !== "win32",
    });
  }

  // A fresh profile directory per run, not a fixed `.verify-profile`. Chrome
  // leaves a SingletonLock (and, on Windows, a pile of LevelDB LOCK files)
  // behind whenever it is killed rather than exiting cleanly — which a run
  // stopped mid-way (Ctrl-C, a prior crash, this file's own past bugs) does
  // every time. A fixed directory then means the *next* run's browser can
  // start against a still-locked profile, fail or crash partway through, and
  // produce confusing partial results with no error pointing at the cause —
  // exactly what happened once here. A disposable directory has nothing to
  // collide with.
  profileDir = path.join(HERE, "..", "..", `.verify-profile-${randomUUID()}`);
  browser = spawn(
    findChrome(),
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      // CI runners have no usable sandbox; locally the sandbox stays on.
      ...(process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : []),
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: "ignore", detached: process.platform !== "win32" },
  );

  await waitFor(BASE, "the app");
  await waitFor(`${CDP}/json/list`, "the browser");

  // `next dev` compiles a route the first time it is requested, which can
  // outrun a suite's first navigation into it. Warm every route the suites
  // reach before any of them start, so a cold compile never reads as a
  // failing assertion.
  if (dev) {
    for (const route of ["/", "/inbox", "/dashboard", "/admin", "/performance", "/ai-performance",
                         "/queues", "/alerts", "/exceptions", "/qa", "/governance", "/onboarding",
                         "/sign-in", "/sign-up"]) {
      await fetch(BASE + route).catch(() => {});
    }
  }

  let pass = 0;
  let fail = 0;
  const failed = [];

  for (const suite of suites) {
    const name = suite.replace(/\.mjs$/, "");
    const run = spawnSync(process.execPath, [path.join(SUITES, suite)], {
      encoding: "utf8",
      env: { ...process.env, VERIFY_BASE_URL: BASE, VERIFY_CDP: CDP },
    });
    const out = (run.stdout ?? "") + (run.stderr ?? "");
    const p = (out.match(/^PASS/gm) ?? []).length;
    const f = (out.match(/^FAIL/gm) ?? []).length;
    pass += p;
    fail += f;

    const crashed = run.status !== 0 && f === 0;
    if (f > 0 || crashed) {
      failed.push(name);
      console.log(`\n${name} — ${p} pass, ${f} fail${crashed ? " (crashed)" : ""}`);
      for (const line of out.split(/\r?\n/)) {
        if (line.startsWith("FAIL") || (crashed && /Error|error:/.test(line))) {
          console.log(`  ${line}`);
        }
      }
    } else {
      console.log(`${name.padEnd(14)} ${String(p).padStart(3)} pass`);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed, across ${suites.length} suite(s)`);
  if (failed.length) {
    console.log(`Failing: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
} finally {
  shutdown();
  // Best-effort: Chrome needs a moment to release its files after the kill
  // above, so a failed cleanup here is not worth failing the run over.
  await new Promise((r) => setTimeout(r, 500));
  if (profileDir) await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
