/**
 * Module resolution for `node --test`, so the pure functions under
 * `src/components/dashboard/` can be imported without a bundler.
 *
 * Two gaps between what TypeScript accepts and what Node resolves:
 *
 *  1. `@/lib/people` — a `tsconfig.json` path alias Node knows nothing
 *     about. Mapped here to `<repo>/src/...`.
 *  2. No file extension. `moduleResolution: "bundler"` lets a source file
 *     write `./routing`; Node's ESM resolver requires `./routing.ts`. Most
 *     of those are `import type` and vanish under type stripping before
 *     resolution ever sees them, but the mapping is here so a future value
 *     import does not turn into a puzzle.
 *
 * Deliberately not a dependency. `node:test` plus Node's own type stripping
 * covers this, and a test runner is a large thing to add to a repo whose
 * real coverage is the browser harness in `scripts/verify/`.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "src");
const EXTS = [".mts", ".ts", ".tsx", ".mjs", ".js"];

export async function resolve(specifier, context, next) {
  let spec = specifier;

  if (spec.startsWith("@/")) {
    const base = path.join(SRC, spec.slice(2));
    const hit = existsSync(base) ? base : EXTS.map((e) => base + e).find(existsSync);
    if (!hit) throw new Error(`alias-hooks: nothing at ${base} for ${specifier}`);
    return next(pathToFileURL(hit).href, context);
  }

  try {
    return await next(spec, context);
  } catch (err) {
    // Retry with each extension before giving up, so the original error is
    // what surfaces when the specifier is simply wrong.
    for (const ext of EXTS) {
      try {
        return await next(spec + ext, context);
      } catch {
        /* keep trying */
      }
    }
    throw err;
  }
}
