# Verification suites

End-to-end checks that drive the real app in a real browser.

```bash
npm run build      # the suites run against a production build
npm run verify     # all suites
npm run verify -- ag06 sup07    # only suites whose filename contains these
```

`run.mjs` starts `next start`, launches headless Chrome, runs each suite in
its own process, tears both down, and exits non-zero if any assertion failed.

## Why this and not a test framework

The harness is dependency-free — it speaks the Chrome DevTools Protocol over
Node's built-in `WebSocket` and drives whatever Chrome or Edge is already
installed. A clean checkout runs `npm run verify` with no extra install and no
browser download. Playwright would be a ~300 MB install and a second toolchain
to keep current, for a suite that only needs click, type, read and screenshot.

They are end-to-end rather than unit tests on purpose. Nearly everything worth
asserting in this codebase is a *rendered consequence* of state — a masked
field, a disabled composer, a routing decision that yields to a tighter SLA —
and a unit test of the reducer would happily pass while the panel showing it
was broken.

## In CI

`.github/workflows/ci.yml` runs lint, typecheck, build and this suite on every
push. No browser is installed there — the harness uses the Chrome that
`ubuntu-latest` already ships, which is the practical payoff of not depending
on Playwright. `--no-sandbox` is added only when `CI` is set; locally the
sandbox stays on. Screenshots upload as an artifact on failure, since that is
how a CI failure gets diagnosed without reproducing it locally.

## Layout

- `driver.mjs` — CDP connection plus `ok`, `evaluate`, `goto`, `shot`,
  `pressKey`, `sleep`. Imported by every suite.
- `run.mjs` — orchestrator.
- `suites/*.mjs` — one file per requirement or group, named for the PRD IDs it
  covers.

Screenshots go to `.verify-shots/` (gitignored). They are for reading after a
failure, not asserted against — no pixel baselines to churn.

## Writing a suite

```js
import { evaluate, goto, ok, sleep } from "../driver.mjs";

await goto("/inbox");
const text = await evaluate(`document.body.innerText`);
ok("the thing is present", text.includes("Thing"), text.slice(0, 60));
```

Always pass the third argument. A failing assertion that does not say what it
actually saw costs more time than it saves — most of the defects these suites
caught were diagnosed straight from that value.

## Three traps worth knowing

These each cost real time while the suites were being written:

1. **`innerText` applies `text-transform`.** A label styled `uppercase` reads
   back as `NEEDS APPROVAL`, so `includes("Needs approval")` fails against
   markup that is perfectly correct. Match case-insensitively.
2. **Regex literals inside `evaluate()` strings.** The expression is a string
   that survives this file's escaping before the browser parses it, and `\n`
   arrives as a real newline mid-literal. Use `String.fromCharCode(10)` to
   split page-side text.
3. **`element.focus()` does not reliably set `:focus-visible`.** Focus-ring
   checks must use `pressKey("Tab", "Tab", 9)`, which is why `pressKey` exists.

## Running alongside other sessions in the same repo

`run.mjs` defaults to ports 3111 (the app) and 9222 (Chrome's debug port). If
another Claude Code session — or anything else — is running the harness
against the same checkout at the same time, both invocations collide on those
ports and produce confusing, contradictory results rather than a clean error.
Set `VERIFY_PORT` and `VERIFY_CDP_PORT` to run in isolation:

```bash
VERIFY_PORT=3411 VERIFY_CDP_PORT=9422 npm run verify
```

Each run also gets its own Chrome profile directory (a fresh
`.verify-profile-<uuid>`, cleaned up on exit) rather than a fixed
`.verify-profile`. Windows does not kill a spawned child when its parent is
force-killed from outside, so a `run.mjs` invocation stopped by an external
`Stop-Process -Force` — another session cleaning up, a crashed terminal —
used to leave its Chrome tree alive holding a lock on the shared profile
directory. The *next* run's browser would then start against an
already-locked profile and could crash or behave unpredictably partway
through, with nothing pointing at the actual cause. A disposable directory
per run has nothing left over to collide with.

## The stale-server guard

`run.mjs` refuses to start if anything is already listening on the app port.
That is not defensiveness for its own sake: without it, its own `next start`
fails silently, every suite runs against whatever is already there — usually a
stale build from an earlier session — and the run reports confident, wrong
results. It cost real time three times before the guard existed.

## A caution the suites earned

`sup02-sup08-filters-export` once passed while reporting "4 of 4 unassigned"
and "0 of 4" for a named agent — mechanically correct, factually wrong,
because no conversation had an `assignee` at all. Assert the *number you
expect*, not merely that a number rendered.
