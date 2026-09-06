# Frontend implementation guide: v3 platform mockup → nexchat

Source: `Design/human-agent-operations-dashboard (3).html` — the static "Takeoff Support OS — Omnichannel OTA Platform" mockup. It covers eleven screens: customer journey, omnichannel inbox, active workload, human performance, AI performance, queue control, alerts, administration, exceptions, QA & coaching, and KPI governance.

Nine of those eleven screens are now replicated directly from this mockup, section for section, in nexchat's dark palette: every supervisor view, plus administration. The omnichannel inbox exists as the working application instead, and the customer journey was replicated and then dropped — see §2. This guide is how the replication is organised and how to extend it: §1 is the colour mapping (the one rule that never changes — reuse nexchat's tokens, never the mockup's), §2 is where each view and its shared primitives live, §3–§4 are what stayed functional and what was retired to get here.

Read `AGENTS.md` and `README.md` first if you haven't. The split those establish and this guide depends on: `/inbox` is the working application and is held to the old ground rules (no fabricated drill-throughs, decorative data labelled as such); the nine supervisor and customer views are pure design, and their figures are the mockup's. `/admin` is the one screen that is both — the mockup's layout over the real config engine — and §3 is the rule it follows.

---

## 1. Design tokens — reuse nexchat's, never the mockup's

nexchat is **dark by default, and themed** — `:root` fixes `color-scheme: dark`, and `:root[data-theme="light"]` in `globals.css` re-tints every token for a light palette. `data-theme` is set only inside the `(workspace)` layout (see `ThemeContext.tsx`), so the marketing pages, which are designed dark-only, never pick it up; anything under `features/inbox/` or `features/admin/` renders in both and cannot assume either. That is why the rule below is *reuse the token, never the hex*: a literal is a colour that only works in one theme. The mockup ships its own light theme with a `[data-theme="dark"]` override — neither of its palettes should be copied literally. Every color below is one nexchat already has, already passes `nfr11-axe-audit.mjs`'s WCAG AA contrast check, and is already used somewhere in the codebase. If a mapping below says "no direct match," that's deliberate — don't invent a new hex value to fill it.

### 1.1 Surface & text — `@theme` tokens in `src/app/globals.css`

| nexchat token | Hex | Tailwind class | Use for | Nearest mockup var |
|---|---|---|---|---|
| `--color-page` | `#202020` | `bg-page` | The base surface every panel/card sits on | `--paper` |
| `--color-panel` | `#373737` | `border-panel` (as a border, not a fill) | Card borders, row dividers, chip borders | `--rule` |
| `--color-footer` | `#2b2b2b` | `bg-footer` | A nested surface *inside* a card (AI-assist bubble, appeal note, export-job row) | `--panel-3` |
| `--color-ink` | `#ffffff` | `text-white` | Primary text | `--ink` |
| `--color-ink-muted` | `#d8d8d8` | `text-ink-muted` | Secondary text (rare) | `--ink-2` |
| `--color-ink-dim` | `#ababab` | `text-ink-dim` | Captions, meta, sample counts — AA-checked at small size | `--ink-3` |
| `--color-coral` | `#ff5e5e` | `text-coral` / `border-coral` | Brand accent: hover states, active-filter borders, focus affordance | *(mockup uses `--green` for this role — don't borrow it)* |
| `--color-coral-text` | `#ff8f8f` | inline style only | Coral at **small text size** — the base coral fails the 4.5:1 floor there | n/a |
| `--color-amber` | `#ffd464` | `:focus-visible` ring only | Not a general warning color — see §1.2 for that | `--amber` (unrelated hex) |
| `--color-grad-from` / `--color-grad-to` | `#de4559` → `#ff601c` | `bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))]` | Primary CTA buttons | `--green` (mockup's primary button color) |

### 1.2 Semantic status colors — the de facto palette, formalize don't reinvent

This set is **not** in `@theme` — it's the same handful of hex values repeated as inline `style={{color:...}}` across the workspace files (`DashboardHeader`, `TicketList`, `ChatPanel`, `DetailsPanel`...). Treat this table as the one source of truth for new work. Do **not** reach for the mockup's own `--green/--amber/--red/--steel/--violet` — those are a different, coincidentally-overlapping set of hex values already doing an unrelated job in nexchat (see §1.4).

| Meaning | Hex | Already used in | Mockup's equivalent concept |
|---|---|---|---|
| Available / success / healthy | `#11c340` | `DashboardHeader` (state dot), `/inbox` badges | `--green` (dark: `#3fc194`) |
| Busy / P1 urgency / warn | `#ffab4d` | `DashboardHeader`, `TicketList` | `--amber` (dark: `#efd79b`) |
| P2 / caution-yellow | `#ffcc00` | `DashboardHeader` (busy state) | close to mockup's amber |
| Training / info-blue | `#2b7fff` | `DashboardHeader`, `ChatPanel` (Website channel) | `--steel` (dark: `#b9d0dc`) |
| Wrap-up / AI-violet | `#a684ff` | `DashboardHeader`, `ChatPanel` (Messenger channel) | `--violet` (dark: `#c7bde2`) |
| Critical / danger / offline / P0 / breached | `#ff6b6b` | `DashboardHeader` offline, `TicketList` P0 | `--red` (dark: `#f2b9b3`) |
| Neutral / away / P3 | `#ababab` (= `ink-dim`) | `DashboardHeader` away/break, captions everywhere | — |

**A note worth acting on:** these seven hex values are copy-pasted, not shared. If you're touching one of these files anyway, consider promoting this table into `@theme` as `--color-status-success` etc. — but that's a refactor, not a prerequisite for building any of the screens below.

### 1.3 Channel colors

| Channel | nexchat hex | Defined in | Mockup |
|---|---|---|---|
| WhatsApp | `#25d366` (WhatsApp's real brand green) | `ChatPanel.CHANNEL_COLOR` | `#178c5b` — **don't switch to this**, nexchat's is the correct brand color |
| Website | `#2b7fff` | `ChatPanel.CHANNEL_COLOR` | `--steel` |
| Messenger | `#a684ff` | `ChatPanel.CHANNEL_COLOR` | `#596bd7` |
| Instagram | — not modeled | `Channel` type has no Instagram member yet | `#a34883` |
| Email | — not modeled | `Channel` type has no Email member yet | `#6f7c75` |

Adding Instagram/Email (the mockup's inbox and customer-journey views assume both) is a **data-model change first**: extend `Channel` in `inboxEngine.ts` (currently `"WhatsApp" | "Website" | "Messenger"`), then add each a color in `CHANNEL_COLOR` and an icon, following the existing pattern — don't add UI for a channel the type system doesn't know about.

### 1.4 Avatar palette — already borrowed from the mockup on purpose

The named seed agents' avatar background colors (in `ActiveWorkloadPage`'s capacity board and `Modals.tsx`) are literally the mockup's **light-mode** `--steel/--violet/--amber/--green/--red` swatches, reused purely as decoration — Ayesha=`#2f5f7c` (steel), Tanvir=`#584593` (violet), Nusrat=`#00694b` (green), Rakib=`#96690a` (amber), Farhana=`#bc3126` (red). This is intentional and fine — it's a decorative identity color, not a status color, so it doesn't collide with §1.2. Keep drawing new *named* seed agents from this same five-color set; anyone else gets `InitialsAvatar`'s own deterministic gradient (hashed from name).

### 1.5 Typography, radius, spacing

- Font: Poppins (`--font-poppins`), not the mockup's Inter. Don't change this.
- Radius: nexchat defines `--radius-card:16px` / `--radius-panel:24px` but in practice most components just use Tailwind's scale directly — `rounded-xl` (cards), `rounded-lg` (rows/chips), `rounded-full` (pills/buttons/avatars/status dots). Keep doing that; don't wire the CSS vars in.
- Micro-text: nexchat already goes as small as `text-[9px]`/`text-[10px]` for captions and sample counts, same instinct as the mockup's own "readability floor" comment (which pins a 10px minimum). **Don't go below 10px for anything that has to clear WCAG 1.4.3** — `nfr11-axe-audit.mjs` will catch it. It has caught this twice: a training-blue status label at 11px measuring 4.33:1, and the mockup's own `#6f7c75` avatar giving white initials 4.36:1 (now `#5f6b65`, see `ActiveWorkloadPage.tsx`). Colour on a decorative `aria-hidden` dot is safe; the same colour on the label text next to it usually is not.

---

## 2. Where the replication lives

The replicated views are one file per view, under `src/features/admin/supervisor/`:

| Mockup view | Component | Route |
|---|---|---|
| `#workloadView` | `ActiveWorkloadPage.tsx` | `/dashboard` |
| `#performanceView` | `HumanPerformancePage.tsx` | `/performance` |
| `#aiPerformanceView` | `AiPerformancePage.tsx` | `/ai-performance` |
| `#queuesView` | `QueueControlPage.tsx` | `/queues` |
| `#alertsView` | `AlertsPage.tsx` | `/alerts` |
| `#exceptionsView` | `ExceptionsPage.tsx` | `/exceptions` |
| `#qaView` | `QaCoachingPage.tsx` | `/qa` |
| `#governanceView` | `GovernancePage.tsx` | `/governance` |
| `#adminView` | `TenantAdminConsole.tsx` | `/admin` |

Shared pieces are in `src/features/admin/mockup/`:

- **`Primitives.tsx`** — the mockup's repeated building blocks, ported to the
  dark palette: `PageHead` (`.page-head`), `Filters` (`.filters`), `Kpi`
  (`.kpi`), `Panel` (`.panel` + `.panel-head`), `Pill`, `Bar`, `Feed`,
  `Table`/`Td`, `Avatar`, `Funnel`, `ReasonBars`, `Histogram`, `Seg`,
  `AuditNote`, `EmptyState`, `Switch`, `Btn`.
- **`ModalContext.tsx`** — `ModalProvider` / `useModal()`, holding the open
  dialog, its subject, and the commit toast.
- **`Modals.tsx`** — all twelve dialogs, the agent drawer and the toast.

To add a page section, reach for a primitive first; the mockup reuses the
same handful of shapes everywhere, and matching them is what keeps the
supervisor views looking like one product.

The mockup's `#customerView` has no row above: it was a booking site and a
chat widget rather than an operations console, used none of these primitives,
and has been dropped from the dashboard along with its `/customer-preview`
route and nav entry. The app's real customer conversation is
`src/features/widget/` on the marketing site.

### Wiring a button to a dialog

`<Btn modal="surge">Surge mode</Btn>` — the equivalent of the mockup's
`data-modal="surgeModal"`. `ModalId` in `ModalContext.tsx` is the list.
Passing `subject` gives the dialog something to name (the agent drawer uses
it). Committing closes the dialog and raises the toast; nothing mutates,
because these views are the design rather than the engine.

### Two traps worth knowing

Both of these were live defects, caught after the fact rather than by
reading the code:

1. **`Panel` must not be `flex-1`.** As a full-width child of the page's
   scrolling flex column it stretches to fill the viewport, leaving a tall
   empty card. Grid and flex-row parents stretch their children anyway.
2. **A flex child in that column can be crushed below its content height.**
   The admin tab strip rendered as a sliver until it got `shrink-0`.

## 3. What stayed functional

`/inbox` is not a replication — it is the working application, and the
acceptance suites still cover it.

`/admin` is both. It replicates `#adminView` exactly — seven panes, the
mockup's rows and dialogs — but every control on it edits the real tenant
config draft. Its own shapes live in `mockup/AdminShapes.tsx`, its dialogs in
`AdminModals.tsx`, and the rule it follows is: **bound when there is real
config behind the field, a plain value when there is not.** Never a disabled
input; a control that looks live and discards your typing is worse than an
honest value.

Cutting it back to the mockup's panes deleted the sections that were not in
the mockup. `SUP-07`, `SUP-08`, `ADM-05` and `ADM-08` went with them and
`ADM-06` lost its control; `TODO.md` names each, and `git log` has the code.

## 4. What was retired

Live supervisor behaviour went with the replaced pages: filtering across
dashboards, drill-through into `/inbox`, alerts computed from real delivery
failures and tenant thresholds, the supervisor override, and the QA review
flow over real resolved conversations. Test coverage went from 380 to 321
assertions for the same reason — `sup02-sup08-filters-export` and
`sup07-kpi-versioning` were removed, and `rt01-rt10-routing`,
`sup03-sup04-adm07` and `workspace-details` were trimmed to the parts that
still run. The implementations are in `git log` if any of it is wanted back.
