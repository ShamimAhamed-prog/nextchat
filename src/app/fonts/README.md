# Self-hosted typefaces

These are the exact files `next/font/google` would have downloaded — the
`latin` subset of each family, taken from Google's own `css2` stylesheet and
committed here so builds are deterministic and work without network access.

| File | Family | Weights | Notes |
|---|---|---|---|
| `poppins-400/500/600/700.woff2` | Poppins | 400, 500, 600, 700 | Static instances; the UI's primary face |
| `inter-variable.woff2` | Inter | 400–500 | Variable; used for tabular numbers |
| `space-grotesk-400.woff2` | Space Grotesk | 400 | One paragraph in `Pricing.tsx` |
| `outfit-variable.woff2` | Outfit | 400–500 | Variable; the footer newsletter field |

**Why not `next/font/google`.** Its failure mode is silent: a build that
cannot reach `fonts.googleapis.com` emits one warning and then ships a system
fallback, so CI goes green with the wrong typeface. `ui-fonts.mjs` asserts
these faces actually resolve and load, which is the thing that was at risk.

**Latin only**, matching the previous `subsets: ["latin"]`. None of these
families ship Bengali glyphs, so the Bangla UI (`NFR-15`) falls through to the
system stack exactly as it did before. Adding a Bengali face is a design
decision, not a side effect of self-hosting.

**Licence.** All four are under the SIL Open Font License 1.1, which permits
redistribution and bundling: Poppins (Indian Type Foundry, Jonny Pinhorn),
Inter (Rasmus Andersson), Space Grotesk (Florian Karsten), Outfit (Smartsheet,
On Brand Investments). Refreshing them means re-fetching the same `latin`
blocks from `https://fonts.googleapis.com/css2?family=…` with a browser
user-agent, which is what returns `woff2` rather than `ttf`.
