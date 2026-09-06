/**
 * Turns the raw Figma exports in `assets-src/figma/` into the WebP files that
 * actually ship from `public/figma/`.
 *
 * The exports come straight out of the Figma REST API at whatever size the
 * design file happened to hold — `hero-dashboard.png` is a 4096px-wide PNG for
 * a slot that is never wider than 832 CSS px. Every entry below caps an asset
 * at 2x its largest rendered width, which is all a 2x display can use, and
 * re-encodes it as WebP. `next/image` still resizes and re-encodes per request
 * (to AVIF where the browser accepts it, see `images.formats` in
 * next.config.ts) — this pass just stops us shipping and rebuilding from
 * 34 MB of source PNGs.
 *
 * Run: npm run optimize:images [-- --force]
 *
 * Assets are listed explicitly rather than globbed, so a new export has to be
 * given a size on purpose and an asset that falls out of the code stops being
 * published.
 */
import { createRequire } from "node:module";
import { mkdir, readdir, copyFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("This script needs sharp:  npm i -D sharp");
  process.exit(1);
}

const SRC = "assets-src/figma";
const OUT = "public/figma";
const FORCE = process.argv.includes("--force");

/**
 * `maxWidth` is 2x the widest the asset is ever rendered at (see the component
 * named in the comment); sources narrower than that are left at native width
 * rather than upscaled.
 */
const RASTERS = {
  // CaseStudies — 538px slot
  "case-1.png": { maxWidth: 1076 },
  "case-2.png": { maxWidth: 1076 },
  "case-3.png": { maxWidth: 1076 },
  "case-4.png": { maxWidth: 1076 },
  // Features — 357px card
  "feature-1.png": { maxWidth: 714 },
  "feature-2.png": { maxWidth: 714 },
  "feature-3.png": { maxWidth: 714 },
  "feature-4.png": { maxWidth: 714 },
  "feature-5.png": { maxWidth: 714 },
  // Hero — 832px dashboard, 277px photos. TestimonialPanel renders the same
  // dashboard export at 662px, so it reuses this one file (the two PNGs were
  // byte-identical) rather than shipping a second copy.
  "hero-dashboard.png": { maxWidth: 1664 },
  "hero-photo-1.png": { maxWidth: 554 },
  "hero-photo-2.png": { maxWidth: 554 },
  "hero-photo-3.png": { maxWidth: 554 },
  "hero-photo-4.png": { maxWidth: 554 },
  // Solution — 404px card
  "solution-card.png": { maxWidth: 808 },
  // Steps — 400px illustrations
  "steps-ai.png": { maxWidth: 800 },
  "steps-social.png": { maxWidth: 800 },
  "steps-website.png": { maxWidth: 800 },
  // SignIn / SignUp — 24px social marks, 74px testimonial avatar
  "signin/google.png": { maxWidth: 96 },
  "signin/facebook.png": { maxWidth: 96 },
  "signin/avatar.png": { maxWidth: 222 },
  // Workspace headers — 38px agent avatar
  "ticket/agent.png": { maxWidth: 96 },
};

/** Vector assets ship as-is; there is nothing to re-encode. */
const VECTORS = [
  "payment-methods.svg",
  "trust-logos.svg",
  "signin/quote.svg",
];

/**
 * In `assets-src/` but deliberately not published, so they cost nothing to
 * keep around. Re-add to `RASTERS` if a component starts using one.
 *   - ecommerce-1..4: replaced by the code-drawn cards in `Ecommerce.tsx`.
 *   - signin/dashboard: byte-identical to `hero-dashboard`.
 *   - steps-orb: the orb is drawn in CSS; the export has a white background.
 *   - steps-arrow-*: the connectors are inline SVG in `Steps.tsx`.
 *   - ticket/*: superseded by `InitialsAvatar`.
 *   - logo-*: the brand mark is drawn in code by `Logo.tsx`.
 */
const UNUSED = [
  "logo-header.svg", "logo-footer.svg",
  "ecommerce-1.png", "ecommerce-2.png", "ecommerce-3.png", "ecommerce-4.png",
  "signin/dashboard.png", "steps-orb.png",
  "steps-arrow-diagonal.png", "steps-arrow-right.png",
  "ticket/contact-avatar.png", "ticket/product.png", "ticket/ticket-avatar.png",
];

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

/** Skip work when the output is already newer than its source. */
async function isStale(src, out) {
  if (FORCE) return true;
  try {
    return (await stat(src)).mtimeMs > (await stat(out)).mtimeMs;
  } catch {
    return true;
  }
}

const kb = (n) => (n / 1024).toFixed(0).padStart(5) + " KB";

/**
 * Photographs compress far better lossy; the flat-colour illustrations
 * (`steps-website` and friends) come out *larger* that way than lossless, so
 * both encodings are run and the smaller buffer wins.
 * `withoutEnlargement` keeps a source narrower than its slot at native size.
 */
async function encode(src, maxWidth) {
  const resized = () =>
    sharp(src).resize({ width: maxWidth, withoutEnlargement: true });
  const [lossy, lossless] = await Promise.all([
    resized().webp({ quality: 80, effort: 6, alphaQuality: 100 }).toBuffer(),
    resized().webp({ lossless: true, effort: 6 }).toBuffer(),
  ]);
  return lossless.byteLength < lossy.byteLength ? lossless : lossy;
}

const found = await walk(SRC);
const unknown = found.filter(
  (f) => !(f in RASTERS) && !VECTORS.includes(f) && !UNUSED.includes(f),
);

let before = 0;
let after = 0;
let written = 0;

for (const [name, { maxWidth }] of Object.entries(RASTERS)) {
  const src = path.join(SRC, name);
  const out = path.join(OUT, name.replace(/\.(png|jpe?g)$/i, ".webp"));
  await mkdir(path.dirname(out), { recursive: true });

  const srcBytes = (await stat(src)).size;
  before += srcBytes;

  if (await isStale(src, out)) {
    await writeFile(out, await encode(src, maxWidth));
    written++;
  }

  const outBytes = (await stat(out)).size;
  after += outBytes;
  console.log(`${name.padEnd(26)} ${kb(srcBytes)} -> ${kb(outBytes)}`);
}

for (const name of VECTORS) {
  const src = path.join(SRC, name);
  const out = path.join(OUT, name);
  await mkdir(path.dirname(out), { recursive: true });
  if (await isStale(src, out)) await copyFile(src, out);
  const bytes = (await stat(out)).size;
  before += bytes;
  after += bytes;
}

await writeFile(
  path.join(OUT, "README.md"),
  "# Generated\n\n" +
    "Everything in this directory is written by `npm run optimize:images`\n" +
    "from `assets-src/figma/`. Edit the source exports there, not these files.\n",
);

console.log(`\n${written} re-encoded, ${VECTORS.length} vectors copied`);
console.log(`public/figma: ${kb(before)} of source -> ${kb(after)} shipped`);
if (unknown.length) {
  console.log(`\nNot listed in this script (add a size or add to UNUSED):`);
  for (const f of unknown) console.log(`  ${f}`);
}
