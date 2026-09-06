import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Written by `npm run verify`: a Chrome user-data-dir full of bundled
    // extension JS, and PNG screenshots. Both are gitignored, but flat config
    // does not read .gitignore, so they have to be named here or `npm run
    // lint` reports thousands of problems from Chrome's own source.
    ".verify-profile/**",
    ".verify-shots/**",
  ]),
]);

export default eslintConfig;
