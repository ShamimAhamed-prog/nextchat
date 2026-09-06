// Registers the resolver in `alias-hooks.mjs` for the test process.
// Used via `node --import ./scripts/test/register.mjs` (see `npm test`).
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
