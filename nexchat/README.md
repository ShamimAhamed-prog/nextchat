# NexChat landing page

Implementation of seven **NexChat** Figma frames:

- [`16629-14658`](https://www.figma.com/design/Wy2BiR1zprzDZZMrwcLe4J/NexChat?node-id=16629-14658&m=dev) — the landing page (1920 × 10872, 1489 nodes, 12 sections), at `/`.
- [`16629-20418`](https://www.figma.com/design/Wy2BiR1zprzDZZMrwcLe4J/NexChat?node-id=16629-20418&m=dev) — the sign-in screen (1920 × 1150, 134 nodes), at `/sign-in`.
- [`16629-19353`](https://www.figma.com/design/Wy2BiR1zprzDZZMrwcLe4J/NexChat?node-id=16629-19353&m=dev) — the sign-up screen (1920 × 1150, 159 nodes), at `/sign-up`.
- [`16629-20996`](https://www.figma.com/design/Wy2BiR1zprzDZZMrwcLe4J/NexChat?node-id=16629-20996&m=dev) — onboarding step 1, "Customer information" (1920 × 1000, 149 nodes), at `/onboarding`.
- [`16862-9858`](https://www.figma.com/design/Wy2BiR1zprzDZZMrwcLe4J/NexChat?node-id=16862-9858&m=dev) — "A Shopping Page", the ticket inbox dashboard (1920 × 1460, 580 nodes), at `/inbox`. This is the app screen shown as a mockup inside the landing page and auth screens.
- [`16685-6041`](https://www.figma.com/design/Wy2BiR1zprzDZZMrwcLe4J/NexChat?node-id=16685-6041&m=dev) — "Connect your social Channels" modal (1920 × 1575 scrim, 862 × 935 card, 210 nodes). Not a route — wired into `/inbox` behind the "+" button in the Connected Channels card, since that's the only sensible home for a modal frame.
- [`16685-31870`](https://www.figma.com/design/Wy2BiR1zprzDZZMrwcLe4J/NexChat?node-id=16685-31870&m=dev) — "Admin Dashboard", an analytics overview (1920 × 1315, 456 nodes). Was at `/dashboard`; its charts were retired when the supervisor views became replications of the OTA design mockup (see "Supervisor views").

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Takeoff Travels adaptation

This started as a pixel-accurate build of seven generic-SaaS Figma frames
("NexChat," multi-industry e-commerce chatbot). It has since been adapted to
match the Takeoff Travels Omnichannel OTA Customer Support Platform PRD
(v2.0): copy, mock data, KPI labels and the booking/support scenarios shown
in the ticket inbox and supervisor dashboard now describe that product
instead of a generic e-commerce chatbot. The pixel geometry, component
structure and Tailwind tokens from the original Figma build are unchanged —
this was a content and brand pass, not a redesign.

In scope and done: the brand mark (a code-drawn logo replaces the
`Nexchatgen`-wordmark SVGs — see `Logo.tsx`), all marketing copy, the
pricing table (now illustrative "Custom / contact sales" tiers instead of
invented BDT figures, consistent with the PRD's own refusal to state
uncontracted rates), the FAQ, the sign-in/sign-up/onboarding copy, the
ticket inbox's mock conversation (now the PRD's own Dhaka→Cox's Bazar
WhatsApp example, PNR XKD4RP throughout), the ticket detail fields
(priority is now P0–P3, escalation reason replaces "service category"), and
the supervisor dashboard's KPI cards and chart labels (now First-Contact
Resolution / AI Containment / Handover Rate / Paid-not-ticketed instead of
e-commerce metrics). Several data bugs documented in earlier revisions of
this file (identical stat values, non-monotonic chart axes, repeated
"48% share," the "EIta" and "Sut" typos) were fixed in the same pass rather
than preserved, since new copy was being authored anyway — see "Copy" below
for the policy this changes.

**Not in scope, and not fixable without new assets:** every raster image
under `public/figma/` was exported from the original generic-SaaS frames and
several have the old brand or unrelated stock content baked into the pixels
— `hero-dashboard.png` is a screenshot of the old "A Shopping Page" mock and
`solution-card.png` is an unrelated influencer/webinar stock photo. These
cannot be edited from code, so they're left in place with neutral alt text
rather than deleted, but real Takeoff Travels screenshots and photography
are needed before this ships.

`Ecommerce.tsx` (the "in the wild" grid) was the one section this couldn't
stop at "leave a caveat" for: its four images rendered the literal text
"NexChat" and a fake "OneMart" store logo baked into the pixels, so the
section was pulled from the page rather than shipped contradicting itself.
Those images turned out to be gradient posters with a wordmark and a caption
on them and nothing else, so the cards are now drawn in code — CSS gradients,
the shared `Logo` (in its `mono` variant, since the two-tone wordmark loses
contrast on a warm card), and real selectable text. The brand can only come
from one place again, the copy is translatable, and the section costs no
image bytes; it is back in `src/app/page.tsx` in frame order.

The same defect is still live in `case-*.png`, though, and it is worth
knowing about: all four case-study images are generic 3D logo-mockup stock
showing invented brands (OneMart, Vapor World, Mati-ta, viora) beside copy
about Bangladeshi air travel. Being photographic, they have no code-drawn
substitute — they need real photography or a decision to drop them.

## Customer-facing chat widget

`src/components/widget/` — TODO.md's P0. Unlike the rest of this app, this
isn't an implementation of a Figma frame; it's a net-new, real, interactive
surface, because none of the seven original frames included one and the PRD
is fundamentally about this conversation existing. Opened from the Hero's
"Try It Live" button or its own launcher (bottom-right on every viewport).
Mounted on every customer-facing page — `/`, `/sign-in`, `/sign-up`,
`/onboarding` — each wrapping its own `ChatWidgetProvider` rather than
lifting one to the root layout, since `/inbox` and `/dashboard` are internal
tools a customer widget has no business appearing on.

- **`engine.ts`** — the conversation as a pure `useReducer` state machine.
  No message is ever produced by a side effect; a delayed "typing, then
  replies" beat is expressed as `state.pending` (a queued action + a delay),
  which `WidgetConversation.tsx` resolves with a single `setTimeout` effect.
  Every quick-reply option carries the exact `WidgetAction` it dispatches —
  an earlier draft tried to route generic string ids through a switch
  keyed on phase instead, and needed untyped escape hatches to make the
  ambiguous cases compile. Embedding the action in the option removed the
  ambiguity instead of working around it.
- **`bubbles.tsx`** — presentational message types: fare cards, the
  re-price confirmation, sequential passenger capture, a live hold
  countdown (own `setInterval`, calls back to expire independently of
  whatever the reducer's `phase` has moved on to), a mock payment panel
  that never renders a card/PIN field, a ticket card, a cited FAQ answer,
  a handoff card.
- **`WidgetConversation.tsx`** — owns the reducer, auto-scrolls
  (`prefers-reduced-motion`-aware), and renders each `ChatMsg` kind. Only
  the *last* message in the log is interactive — every earlier quick-reply
  row or fare list renders disabled once something newer has been added,
  so there's no way to re-select a fare or re-answer a prompt that's
  already been superseded.
- **`ChatWidget.tsx`** — the launcher/panel shell and `ChatWidgetProvider`
  context (`useChatWidget()` is how Hero's button opens it without prop
  drilling). The panel is always mounted, never conditionally rendered —
  toggling visibility with `inert` + `aria-hidden` + CSS instead of
  mount/unmount is what lets a conversation survive closing and reopening
  the widget. Escape closes; Tab/Shift+Tab is trapped inside the panel
  while open (a ten-line manual trap, not a library — the panel has few
  enough controls that one is worth writing).

**Verified in a real headless browser, not just read** — the full search →
select → re-price → passenger capture (including an actual infant-on-lap
case, DOB-derived) → hold → mock payment → ticket path, plus FAQ, PNR
lookup, and handoff, at both desktop and mobile viewport widths, with zero
console errors. The 75-second demo hold TTL (§B2's real 12 minutes would be
the wrong UX inside a live demo, so it's shortened and labelled as such
everywhere it's shown) was let run out for real once, to confirm the
expiry → rebook path actually skips re-collecting passengers who are
already on file rather than just looking like it does on paper. That run
caught a real bug — "Resend my ticket" left the customer with no way back
to the menu except typing — before it shipped; see `RESEND_TICKET` in
`engine.ts`.

**The "money held without inventory" branch** (§B2) is a genuine race, not
a simulated one: `HoldCountdown` stays mounted (and its own countdown keeps
ticking) for the lifetime of the conversation, not just while the hold is
the newest message, so a payment confirmed with only a second or two left
on the clock can have the hold expire while `SIMULATE_PAYMENT`'s 1100ms
confirmation delay is still in flight. `paymentInFlight` on `WidgetState`
lets `HOLD_EXPIRED` landing in that window suppress the plain "hold
expired" card and defer to the one outcome `RESOLVE_TICKETING` produces:
no ticket, a `payment-voided` card explaining the refund, and a fresh hold
on rebooking. Verified deterministically with Playwright's clock API
(`page.clock.install`/`runFor`) rather than relying on a real ~1-second
race window that would only sometimes reproduce.

**The bot replies in Bangla now**, not just detects it: every `bot()`-
authored line in `engine.ts` — slot-filling prompts, retry messages, the
four FAQ answers, PNR-lookup and resend-ticket confirmations — routes
through a `tx(locale, en, bn)` helper, and the FAQ intent-matcher's
`keywords` arrays got Bengali synonyms added (city/date parsing already had
them; the FAQ table hadn't been extended the same way, so a genuinely
Bangla-typed question could never reach a matched topic at all before).
Quick-reply chip labels and static card microcopy stay English by design —
the PRD gap was specifically the assistant's conversational replies, not
the UI chrome. **What it still doesn't do:** these Bangla strings are
AI-drafted for this demo and haven't had a native-speaker or professional
translator review pass — the wiring and routing are real and tested; the
linguistic review §E4 actually calls for is a separate, narrower gap that's
still open (see `tx()`'s doc comment in `engine.ts`). Real NLU is also still
out of scope — the Bangla/Banglish parser recognizes a small fixed
vocabulary of cities and date words matched against the PRD's own worked
example; anything else falls back to a clarifying quick-reply, which is
itself an honest demonstration of the PRD's "Clarify" confidence band
rather than a gap dressed up as one.

## Structure

`src/app/page.tsx` composes all twelve section components, in frame order:

| # | Component | Frame section |
|---|-----------|---------------|
| 0 | `Hero` (+ `Header`) | Banner |
| 1 | `TrustBar` | AI & Machine Learning |
| 2 | `Problem` | You are losing sales… |
| 3 | `Solution` | replies to all of your customers… |
| 4 | `Features` | What Next Chat Does |
| 5 | `Steps` | Start in 3-simple Steps |
| 6 | `CaseStudies` | Case Stadies |
| 7 | `Ecommerce` | How NexChat does charms in e-commerce |
| 8 | `CtaBand` | Discover why customers are loving us! |
| 9 | `Pricing` | Subscription Plans |
| 10 | `Faq` | Frequently Asked Question |
| 11 | `Footer` | Footer Container |

`/sign-in` (`SignIn`) and `/sign-up` (`SignUp`) share `TestimonialPanel` — the
frames use identical image refs, copy and geometry for the whole left panel —
and `AuthField` for the 48px bordered inputs. `SignIn` has email/password;
`SignUp` adds a Full Name field ahead of them. Both prefilled field values
("Alex Banks", "secret") and the Title Case on several headings and the
testimonial quote are copied straight from the frame's `textCase: TITLE` style
override, applied here with `capitalize`. Sign In and Sign Up cross-link to
each other's route.

The Sign Up frame's heading originally read "Sign In to your Account" verbatim
— only the subtitle said "sign up" — which was kept as a Figma-fidelity quirk
in the first build. It now reads "Create your Account" as part of the
Takeoff Travels content pass; see "Copy" below for why that policy changed.
Its "Keep me logged in" checkbox is still present in the frame at
`opacity: 0`, so only "Forgot Password?" shows — that part is unchanged.

`/onboarding` (`CustomerInfo`) is the first step of a two-step wizard — a
progress bar shows "Customer info" active in coral against "Package" pending
in grey, above a First/Last Name + Email/Phone form and a terms checkbox, with
a coral "Next" button below the card. Reuses `AuthField` and `Glow`. The
frame's own `Support text`/`Status` rows for a "Keep me logged in" checkbox and
inline field errors are present but hidden or zero-opacity here too, same
pattern as Sign In/Sign Up — only the visible terms checkbox is built. No
"Package" step (step 2) was provided, so it isn't built; the frame has no
back/skip link, so none was added.

`/inbox` (`TicketDashboard`, in `src/components/dashboard/`) is a three-pane
ticket inbox: `DashboardSidebar` (icon rail), `DashboardHeader`, then a row of
`TicketList`, `ChatPanel`, and `DetailsPanel`. Colors, gradients, and the tag
pills' ~20–25% fill opacity are read directly from the frame's fill data, not
eyeballed. Small glyphs (search, filters, socials, activity icons) are
hand-drawn inline SVGs rather than exported per-icon — the frame's own layer
names for tabs are internal ("Order Request", "Unrallied") and don't match
the displayed labels ("Open Tickets", "Assigned"); the displayed text is what
was built. The three-column row is `overflow-x-auto` rather than collapsing
to a mobile layout — the frame only defines a fixed 1920px desktop dashboard,
so no phone-width redesign was invented for it.

That's the shell. Everything underneath it is real state now, not five
hardcoded ticket cards pointing at one fixed transcript — see TODO.md's "P1
— Agent workspace" for the full account. In short: `inboxEngine.ts` is a
`useReducer` state machine for a list of conversations (offer/assignment,
transfer, resolve, snooze, AI-drafted replies, an audited activity log per
conversation), reached through `InboxContext.tsx`'s `useInbox()`. Every
component that used to render static Figma content —`TicketList`,
`TicketFilterBar`, `ChatPanel`, `DetailsPanel`, `DashboardHeader`'s agent-
state pill — now reads and writes through it, plus three new modals
(`TransferModal`, `ResolveModal`, `SnoozeModal`, sharing one focus-trapped
`Modal.tsx` rather than each reimplementing it) and an `OfferBanner` that
surfaces a new 30-second assignment offer the moment it arrives rather than
waiting for the agent to notice it in the list. `InitialsAvatar.tsx`
replaces the single stock avatar photo every customer previously shared,
the same way `Logo.tsx` replaced a wordmark image — code-drawn rather than
faking a photo of a specific person.

`TicketList` sorts through `queueSort` (priority band, then age — see
TODO.md "P1 — Routing & queue visibility" for why offered/queued/assigned
rank together rather than assigned work sitting in its own tier) and shows
a live SLA badge per conversation via the `slaBadge()` selector in
`inboxEngine.ts`. `canAcceptWork(agentState)` gates every Accept button in
the workspace and backs `NoEligibleAgentNotice`, now joined by a real
tenant-configured capacity ceiling — `totalMaxConcurrency()` sums each
queue's `maxConcurrency` from `/admin` into the one live agent's total
simultaneous-assignment cap, so being "full" disables Accept the same way
being Away/Offline does, with its own explanation rather than a reused,
misleading one. The same state transition that makes an agent eligible
again also re-offers the top of the queue automatically (`SET_AGENT_STATE`
in `inboxEngine.ts`). A "Simulate disruption" control in `DashboardHeader`
can open more than one concurrent `DisruptionCohort` card — a scripted
table of genuinely different scenarios (a cancelled DAC → CXB rotation, a
DAC → ZYL mechanical delay), each rendered as its own card rather than one
banner assumed to be the only kind of surge that can happen, and each
cohort row's SLA badge is visibly tagged "Surge ·" so it reads as distinct
from an everyday queued ticket's badge. Closing a record clears cohort
membership on its conversations rather than just the banner, so anyone
still needing a decision falls back into the normal queue instead of
becoming permanently invisible.

The "+" button in `DetailsPanel`'s Connected Channels card opens
`ConnectChannelsModal` (via the client-side `ConnectChannelsButton` wrapper) —
a scrim + centered card with one row per channel (icon, title, description,
"Continue with…" button, a Connected/Not connected status pill, and a 4-item
feature checklist). Closes on the X button, Escape, or a backdrop click, all
verified in a real browser, not just visually. The original frame's subtext
repeated "Manage Facebook Messenger converations" (typo and all) under all
three rows regardless of which channel it described; each row now has its
own correct description, and WhatsApp — the PRD's primary channel — is
listed first and shown as already connected instead of Facebook.

`/inbox` and `/dashboard` share one live conversation state. They didn't
originally — each was its own component tree with no connection to the
other, which meant a supervisor "live queue panel" could only ever be a
second, independent simulation pretending to reflect the same data. Fixed
with a route group, `src/app/(workspace)/`, whose `layout.tsx` mounts one
`InboxProvider` (plus `WorkspaceEffects`, a watchdog that enforces offer
and snooze deadlines regardless of which page is active — necessary once a
deadline can expire on a screen nobody's looking at, which is exactly what
"supervisor watching from `/dashboard`" means). Next.js keeps a layout
mounted across navigation between the routes under it, so this is real
state sharing, not a coincidence of both pages loading similar mock data.
`TicketDashboard` no longer wraps its own provider — see TODO.md "P2 —
Supervisor real-time controls" for the full account, including a
Strict-Mode timer bug this restructuring surfaced and how it was actually
caught (watching for an offer that never arrived, not by reading the effect
and assuming it was fine).

## Supervisor views

Nine screens are direct replications of the design mockup
(`Design/human-agent-operations-dashboard (3).html`), one page per view:

| Route | Mockup view |
|---|---|
| `/dashboard` | Human agent active workload |
| `/performance` | Human agent performance |
| `/ai-performance` | AI agent performance |
| `/queues` | Queue control and routing |
| `/alerts` | Alerts and thresholds |
| `/exceptions` | Exceptions and incident command |
| `/qa` | QA reviews and appeals |
| `/governance` | KPI governance and exports |
| `/admin` | Tenant configuration |

They live under `src/app/(workspace)/(supervisor)/`, sharing a shell
(`AdminSidebar` — a full labeled nav grouped Agent workspace / Supervisor /
Platform, a different and wider design than `/inbox`'s icon rail, plus
`AdminHeader`) and the mockup's dialog layer.

**These pages are the design, not the engine.** Their figures, tables and
charts are the mockup's own fixture content, and their filter rows and
buttons are wired to the dialogs rather than to state. That is deliberate:
they exist to render the specified design faithfully. Two consequences worth
knowing before editing them:

- Anything that looks like a metric here is the mockup's number. Do not read
  `/dashboard`'s "82 human-owned" as a count of anything in `InboxProvider`.
- The supervisor behaviour these views used to carry — live filtering,
  drill-through into `/inbox`, threshold alerts computed from real delivery
  failures, the supervisor override — was retired with them, along with the
  ~60 assertions that covered it. `git log` has the previous implementation.

`/admin` is the other exception, and the important one. It is
`preview (3).html`'s `#adminView` — page head, tenant scope bar, ten tabs
(Overview, Tenant & brand, Channels, Queues & routing, Team & access, SLA &
hours, AI & content, Integrations & commerce, Security & data, Changes &
audit), card grids, setting lists, readiness checklists, policy band,
kill-switch bar, config tables, role matrix, danger zone and every dialog —
drawn over the **real tenant config engine**. Every bound field edits a draft, goes through
`diffDraft`, the publish modal and the audit trail, and a sensitive one still
needs a second approver. A field the mockup shows but this app has no store for
is rendered as a value rather than a disabled input, because a box you can type
into that silently discards what you typed is worse than an honest one. What is
bound and what is fixed is stated in `AdminModals.tsx` and
`AdminDialogs.tsx`. The pane shapes live in `mockup/AdminShapes.tsx` and
`mockup/ConsoleShapes.tsx`.

Cutting `/admin` back to the mockup's seven panes removed the sections that
were not in it — see `TODO.md` for `ADM-05`, `ADM-06`, `ADM-08`, `SUP-07` and
`SUP-08`, all of which were real and are recoverable from `git log`.

The mockup's `#customerView` — its customer-facing booking journey and chat
widget — is deliberately **not** replicated here. It was dropped from the
dashboard along with its `/customer-preview` route and nav entry: it is not a
supervisor screen, and the app's real customer conversation already lives in
`src/components/widget/` on the marketing site as a working booking state
machine rather than a replication. `git log` has the removed replication.

`src/components/admin/mockup/` holds the shared pieces: `Primitives.tsx`
(the mockup's `.page-head`, `.filters`, `.kpi`, `.panel`, `.pill`, `.bar`,
`.feed`, table shell and histogram/funnel/reason-bar charts) and
`Modals.tsx` (all twelve dialogs, the agent drawer, and the commit toast).
A `<Btn modal="…">` opens a dialog the way `data-modal` does in the mockup;
committing closes it and raises the toast rather than mutating anything.

Colours are nexchat's dark palette throughout, not the mockup's light one —
see IMPLEMENTATION-GUIDE.md §1 for the mapping. One value needed adjusting
rather than porting: the offline agent's avatar (`#6f7c75`) gives white
initials 4.36:1, under the 4.5 floor `nfr11-axe-audit` enforces, so it is
darkened to `#5f6b65`. Every other mockup colour clears as-is.

`/inbox` and `/admin` are the exception — both stayed functional rather than
becoming replications. Two real supervisor features that lost their page
moved into Settings → Platform rather than being deleted:
`KpiDefinitionsPanel` (`SUP-07` definition versioning and labelled
backfills) and `ExportReportButton` (`SUP-08`'s asynchronous, genuinely
redacted CSV export).

Shared: `Container` (the 1320px column), `SectionHeading` (eyebrow + heading +
body), `GradientButton`, `Glow` (the oversized blurred ellipses), `TestimonialPanel`, `AuthField`.

## Tenant administration

`/admin` (`TenantAdminConsole`, in `src/components/admin/`) — TODO.md's
final P2 item, and the one screen in this app with no Figma frame behind
it at all: §E7 names six configuration domains and none of the seven
original frames included one. Reuses `AdminSidebar`/`AdminHeader` (both now
carry a "Settings" nav entry pointing here, alongside `DashboardSidebar`'s
matching entry from `/inbox`) rather than inventing a seventh chrome.

- **`tenantConfigEngine.ts`** — the state machine, and the one place in this
  app where "state machine" means more than "reducer over a list": a
  `TenantConfig` tree covering all six domains, held as `published` (what's
  live) and `draft` (what the form is showing) simultaneously, plus
  `version`, `history` (a full config snapshot per published version),
  `pendingApprovals`, and `audit`. Generic dot-path `get`/`set` helpers
  (`FieldPath`) mean every field in the console calls the same
  `edit(path, value)`, with two paths special-cased for array-by-id
  addressing (`brand.channels.<id>.enabled`,
  `commercial.paymentRails.<id>.enabled`) rather than the tree being
  strictly homogeneous.
- **Maker-checker, directionally.** `isSensitiveChange(path, before, after)`
  is the single source of truth for four rules, each gating only the
  risk-expanding direction of that field: refund ceiling *increasing* (a
  decrease is safe and direct), the AI kill switch turning *off*
  (re-enabling AI needs sign-off; disabling it doesn't), a retention window
  *decreasing*, and a payment rail being *enabled*. A sensitive change on
  `PUBLISH` opens a `PendingApproval` instead of writing straight to
  `published`; everything else in the same publish still applies
  immediately. `YOU = "Rifat Karim"` requests, `SECOND_APPROVER =
  "Nabila K."` approves — both names already existed elsewhere in the app
  (Nabila K. is a transfer destination and a below-sample agent over in
  `inboxEngine.ts`) rather than being invented fresh for this screen.
- **`TenantConfigContext.tsx`** — `TenantConfigProvider`/`useTenantConfig()`,
  mounted in the `(workspace)` route group's `layout.tsx` alongside
  `InboxProvider`, the same sharing pattern that makes `/dashboard`'s live
  queue panel real rather than a second simulation (see above). Five config
  values reach across that shared state into effects a user can actually
  see: the AI kill switch disables `/inbox`'s AI Reply button and shows a
  tenant-wide banner in `ChatPanel`; a channel kill switch disables and
  labels `(off)` that channel's tab in `TicketFilterBar`; the sum of each
  queue's max concurrency caps the one live agent's simultaneous
  assignments (`totalMaxConcurrency()`, gating Accept in `OfferBanner`,
  `ChatPanel`, and `NoEligibleAgentNotice`); the AI confidence bands name
  and colour every score in `DetailsPanel`'s intent trail and decide whether
  a draft keeps its "Send as-is" button (`confidenceBand()`, `AI-07` — a
  draft below the published **High** threshold has to be read before it can
  be sent, so raising the bar in Settings visibly removes the one-click
  path); and a role's `privileged` flag
  is the real gate on who can act as second approver
  (`canApproveSensitiveChanges()`, read by the Changes & audit pane). Base
  queue weight stays honestly unwired — editable, versioned, audited, but
  with a single real agent there's nothing to route *between*, labelled as
  such in the section hint rather than implied to do more.
- **`PublishReviewModal.tsx`** / the Changes & audit pane — the publish
  loop (`ADM-04`). The modal diffs `draft` against `published`, flags which
  changed fields are sensitive, blocks Publish outright on validation errors
  (e.g. a negative monthly budget), and requires a publish note. A batch
  with nothing sensitive in it can also be scheduled for a future time
  instead of applying immediately — `TenantConfigEffects.tsx` is the
  watchdog that actually applies it once the time arrives (and separately
  expires break-glass grants), the same "mounted once at the shared layout"
  fix `WorkspaceEffects` already uses for offer/snooze deadlines. The panel
  below covers approve/reject (with a required reason) on pending items, a
  "Scheduled Changes" list with a cancel button, a version history list
  with a "Roll back" button per prior version — rollback restores that
  version's full config snapshot as a *new* version rather than rewriting
  history — and a reverse-chronological audit log.
- **`RolesAndAccess.tsx`** — `ADM-02`'s role composition and `ADM-03`'s
  break-glass, both real. Three seeded roles, each with a `privileged` flag
  that's the actual approval gate above, not a label; add/remove/reassign
  roles for the app's known people. A break-glass grant temporarily
  overrides that same gate for 30/60/120 minutes with a required reason,
  fully audited, and auto-expires via the same watchdog rather than relying
  on anyone to remember to revoke it. Deliberately immediate + audited
  rather than routed through the draft/publish/approval lifecycle the other
  six domains use — the diff engine's fixed `DIFF_PATHS` list doesn't
  generalize to array insert/remove without a meaningfully larger rework.

**Verified end-to-end across five full Playwright runs**, not just read:
both directions of every sensitivity rule, including confirming `/inbox`
keeps showing "AI disabled" right up until an approval actually lands;
validation blocking Publish on bad input; reject correctly reverting the
draft's field while leaving other still-pending approvals visible; rollback
producing a correct new version with its own audit entry; a queue
concurrency cap disabling Accept app-wide once reached; a non-sensitive
batch scheduled and then auto-applied after fast-forwarding past its
effective time (Playwright's clock API); and unmarking an approver's role
as privileged disabling their Approve button, a break-glass grant
re-enabling it, and that grant auto-expiring on schedule. Zero console or
page errors across all five. Several real engine bugs were caught by
tracing the code carefully before testing ran, not by testing — missing
`sla.targets.*` diff paths, an off-by-one in their labels, duplicate
approval/schedule requests from double-clicking Publish, `APPROVE`/`REJECT`
dropping visibility of other pending items, and `DISCARD_DRAFT` reverting a
still-pending approval's or schedule's visible value even though the
underlying request would still fire later — see TODO.md's "P2 — Tenant
administration" for the full account of each.

## Governance, routing and data controls

The PRD's requirement IDs are traced row by row in `TODO.md` → "PRD
requirement coverage". The pieces most likely to surprise someone reading the
code cold:

**Protected data (`AG-06`).** Email, phone, address, passport/NID and the
payment reference are masked at render by `maskPii`, each keeping only what
the task needs — the last three digits of a phone, the email domain, the city
but not the street, the amount and rail of a payment but not its reference.
Revealing one asks for a reason when `security.piiRevealRequiresReason` is on
and writes an activity entry **either way**; the audit lives in the reducer,
not the modal, so the no-reason path cannot skip it. `ChatPanel`'s header
renders the same phone masked rather than growing a second reveal path to keep
audited. Exports go through the same `maskPii`, so an export can never become
the way around this.

**Booking actions (`AG-05`).** Retry ticketing, resend, rebook and refund, in
`DetailsPanel`. Which appear is *derived* from `bookingState` and the tenant's
published refund ceiling, so the list recomputes rather than being stored —
retrying a failed ticketing turns into "Resend ticket" the moment it succeeds.
Each confirms first, re-deriving the offer so a booking that moved on says so
instead of running stale, and each runs under an idempotency key the reducer
no-ops on replay. A refund above the ceiling is **offered and blocked**, not
hidden.

**Routing (`RT-01`, `RT-10`).** `routing.ts` applies queue, skill, language,
channel permission, availability and remaining concurrency **in that order**,
weighting last — weighting first and filtering after produces a confident
selection of someone who was never allowed to take the work. Selection is
deterministic (base weight scaled by remaining capacity, no random tie-break)
so a decision stays explainable afterwards. Every candidate is kept with the
reason it failed, and `DetailsPanel` renders the whole table, because the
question worth answering is "why didn't it go to Arif?".

**Internal notes (`INB-08`).** The requirement's hard clause is "internal
content must never be sent to the customer", so a note is its own kind of
transcript entry rather than an agent message with a flag: created by
`ADD_NOTE`, never `SEND_MESSAGE`, and carrying no `delivery`. The delivery
effect only looks at entries that have one, so a note has no path to a channel
even if the styling regresses later. The composer is one control in two modes,
retinted in note mode, because the failure that matters is an agent believing
they wrote a note and sending it. `@Name` matches the real roster, so an email
address in a note mentions nobody.

**Knowledge search (`AG-04`).** The workspace panel searches `FAQ` — the same
array the customer widget answers from, not a copy, because two knowledge
bases drift and the failure mode is an agent contradicting the bot in the same
thread. Results carry their source and version, conversations record what the
bot cited, and clicking a citation in the handoff summary opens that article.
Inserting fills the composer and sends nothing. Message translation reveals a
*stored* translation rather than generating one — where none exists no control
appears, because inventing one would put words in a customer's mouth in a
transcript an agent then acts on.

**Delivery state (`INB-09`).** Outbound messages carry a real state —
queued, sent, delivered, read, failed — and `CHANNEL_DELIVERY_STATES` is a
table per channel, because "where the channel supplies them" is load-bearing:
a web-widget session never reports a read, so a Website send stops at
delivered. Whether a send succeeds is a rule, not a coin flip — a message can
only be delivered on a channel the tenant has enabled — so the failure path is
deterministic: disable Messenger and Messenger sends fail. Retry is bounded at
three attempts, then terminal, visible to the operator with a Retry control
and recorded in the activity trail.

**Channel windows (`INB-12`).** `channelSendPolicy` encodes the real platform
rules: WhatsApp and Messenger open a 24-hour service window on each inbound
message and allow only approved templates once it shuts; a web widget can only
be answered while the session is open. Outside the window free typing is
disabled at the input *and* in `send()`, and an alternative channel is named
only when one genuinely exists.

**Sandbox (`ADM-06`).** `brand.sandboxMode` is tenant config, so it flows
through the normal validate → diff → approve → version → audit path. Turning
it **off** is what needs a second approver — that is the direction restoring
real customers and real money. It banners every surface it governs rather than
sitting in a settings page.

**Secrets (`ADM-05`).** Shown once, in a dialog whose state is the only thing
that ever holds the value; the list can only render a last-four preview.
Rotation is two steps — the old key stays accepted until you confirm the new
one is deployed — because a single "Rotate" button would misdescribe how key
rotation works.

**Export and deletion (`ADM-08`, `SUP-08`).** Scope is computed and shown
*before* execution — in scope, withheld under legal hold, retained under the
financial-ledger exception — and the confirm button carries the real number.
Report exports are asynchronous jobs with requester, filter, row count and a
24-hour expiry, recorded in the tenant audit trail.

**KPI definitions (`SUP-07`).** Publishing a definition and recomputing
history are deliberately decoupled: publishing advances the version and leaves
history alone, and the dashboard warns while the two differ that comparing
across the boundary compares definitions, not performance. History moves only
through a labelled, audited backfill.

## Working in the agent workspace

Every internal surface — `/inbox`, and the whole `(supervisor)` group behind
`AdminSidebar` — is an app shell rather than a page: the rail, header and (on
`/inbox`) the filters and view tabs stay put, and only the content column
scrolls. `/dashboard` and
`/admin` used to be full-page scrolls up to ~3,700px, so the nav and search
were gone by the time you were halfway down a settings page; each now scrolls
internally instead.

The rail and header were also reduced across every route — the `/inbox` rail
from 96px to 64px, the `/dashboard`/`/admin` rail from 80px (324px expanded) to
64px (240px expanded), both headers to roughly 56-64px — and page padding
tightened, widening the content column by several hundred pixels on a 1600px
screen. Below `xl` the details pane becomes an overlay; below `lg` the list
and conversation take turns.

**Drafts are per conversation and live in inbox state**, not in `ChatPanel`.
That component is deliberately remounted when the selection changes, which
used to mean clicking another conversation silently discarded whatever the
agent had typed. A conversation holding unsent text is marked in the list.

**The composer is a textarea.** Enter sends, Shift+Enter breaks the line — as
an `<input>` a two-paragraph reply was impossible to write. It has two modes,
Reply and Internal note, and note mode retints the whole composer because the
failure that matters is an agent believing they wrote a note and sending it.

**Keyboard shortcuts** cover the loop an agent repeats all day: `j`/`k` walk
the visible list, `/` searches, `r` replies, `n` starts a note, `a` accepts an
offer, `e` resolves, `?` lists them. They are ignored while the caret is in a
field and while a dialog is open — without that, typing "n" into a reply would
flip the composer to note mode mid-sentence.

## Accessibility and localisation

`NFR-11`/`AG-12` are PRD release gates. `/inbox`, `/dashboard` and `/admin`
report **zero findings** from the mechanical audit in
`scripts/verify/suites/nfr11-axe-audit.mjs` — accessible names, labels, alt
text, heading order, duplicate ids, positive tabindex and computed contrast —
and there is one `:focus-visible` ring for everything focusable, verified by
tabbing with real key events rather than `element.focus()`. Two contrast fixes
deviate from the frame on purpose: white on coral measured 2.99:1, so the
active view pill and unread badge take dark text.

**Not covered:** no screen-reader pass, and the marketing pages were not
audited.

`NFR-15`: an EN/বাংলা toggle in the workspace header translates the agent
workspace, which is the P0 workflow the PRD gates on. `/dashboard` and
`/admin` stay English until their strings are reviewed — a consistent English
screen beats a half-Bangla one. **Every Bangla string is AI-drafted and has
not been reviewed by a native speaker.**

`NFR-12`: the workspace collapses in two stages — below `xl` the details pane
becomes an overlay, below `lg` the list and conversation take turns — with no
horizontal overflow at 1600, 1280, 1024 or 768.

## Verifying it

```bash
npm test                        # pure functions, no browser
npm run build && npm run verify # the real app in a real browser
```

Two layers, deliberately uneven. Almost everything worth asserting here is
a *rendered consequence* of state — a masked field, a disabled composer, a
routing decision that yields to a tighter SLA — and a reducer unit test
would pass while the panel showing it was broken, so the browser suites are
the real coverage. `npm test` takes the handful of pure functions whose
input domains a browser run cannot practically walk (every `maskPii` field
shape, the whole `matchesQuery` grammar, each branch of the channel send
gate) and does it in 200ms instead of a page load each. It runs on
`node:test` with Node's own type stripping and no test-runner dependency;
`scripts/test/alias-hooks.mjs` explains the one piece of machinery.

Drives the real app in a real browser, and runs on every push via
`.github/workflows/ci.yml` alongside lint, typecheck and build. The runner
prints the suite and assertion totals as it goes, which is why they are not
quoted here — the two places that did quote a figure disagreed with each
other and with the tree. See `scripts/verify/README.md` for how it works, how to write a suite,
and three traps that cost real time while writing these.

## Tokens

Read straight from the frame and declared in `src/app/globals.css` under
`@theme`, so they are available as Tailwind utilities (`bg-page`, `text-coral`…).

| Token | Value | Use |
|-------|-------|-----|
| `page` | `#202020` | Page background |
| `hero` / `card` | `#1a1a1a` | Hero band, problem cards |
| `panel` | `#373737` | E-commerce panel, footer bottom bar |
| `footer` | `#2b2b2b` | Footer, Website Integration card |
| `coral` | `#ff5e5e` | H2 accent |
| `amber` | `#ffd464` | Eyebrows, H1 accent, featured price |
| `grad-from` → `grad-to` | `#de4559` → `#ff601c` | Pill buttons |
| `ink` / `ink-muted` / `ink-dim` | `#ffffff` / `#d8d8d8` / `#a3a3a3` | Text |

Type: Poppins throughout (H1 600 64/74, H2 600 40/48, eyebrow 500 16/22, body
400 16/24), with Inter, Space Grotesk and Outfit where the frame calls for them.
Cards are 16px radius with a `rgb(143 143 143 / 0.25)` hairline; buttons are
48px tall, fully rounded.

## Assets

`assets-src/figma/` holds the raw exports pulled from the file via the Figma
REST API — 29 PNGs and 4 SVGs, roughly 34 MB, at whatever size the design
file happened to store (`hero-dashboard.png` is 4096px wide for a slot that
is never wider than 832 CSS px). Nothing in there is served.

`public/figma/` is generated from it by `npm run optimize:images`, which caps
each asset at 2x its largest rendered width and re-encodes to WebP, lossless
or lossy per asset depending on which comes out smaller. That is **1.2 MB
shipped, down from 34 MB**; `next/image` still resizes per request and hands
back AVIF to browsers that accept it (`images.formats` in `next.config.ts`).

Assets are listed by name in the script rather than globbed, so a new export
has to be given a size deliberately, and one that falls out of the code stops
being published — eleven currently sit in `assets-src/` unpublished, listed
under `UNUSED` with the reason. Edit the sources in `assets-src/`, never the
generated files.

## This Next.js version

`node_modules/next/dist/docs/` ships version-matched docs and an `AGENTS.md`
notice that this Next release has breaking changes from training-data Next.
Checked against it: `Image`'s `priority` prop is deprecated as of v16 in favor
of `preload` (same "this is LCP, load it eager" intent) — used in `Header`,
`Hero` and `SignIn`. Re-check that file if `next dev`/`next build` regenerates
it with new notices before the next round of changes.

## Deviations from the frame

Deliberate, and worth reviewing:

- **Case-study stack.** In the frame the four cards overlap vertically (heights
  434/519/602/612 with negative gaps), which reads as a scroll-driven sticky
  stack. Built as one: from `lg` up each card is `position: sticky` at
  `96px + 24px * index`, so they gather into a deck as you scroll. Below `lg`
  a card is taller than most viewports and pinning reads as a bug, so the
  cards stay a plain list there. The heights are still uniform, not the
  frame's 434/519/602/612.
  <br>This is why `body` uses `overflow-x: clip` rather than `hidden`, and
  why `CaseStudies` and the other carousel sections do too: `overflow-x:
  hidden` makes the element a scroll container, which silently stops
  `position: sticky` from doing anything inside it.
- **Carousels.** The feature row (5 cards, the fifth sitting off-canvas at
  x=1824 in the frame) snaps, autoplays on a 5s timer, and has pips and
  prev/next arrows. Autoplay pauses on hover, on focus within the section and
  in a hidden tab, and never starts under `prefers-reduced-motion: reduce`;
  the pips follow the scroller, so a swipe updates them too. The Solution
  section's three progress pips were decorative in the frame and now drive
  three real slides — **but the frame only supplies copy for the first one**,
  so slides 2 and 3 are written from pillars stated elsewhere on the page and
  need sign-off like any other copy. The pricing table also scrolls
  horizontally and is deliberately left alone: it is a comparison table, and
  snapping a table by column would fight the row alignment.
- **Fonts.** The frame tags two Latin strings ("Trusted by 40,000+…", "Main
  features") as Noto Serif Thai and the footer wordmark as Keania One — Figma was
  falling back for these. Poppins is used instead, and the footer wordmark is the
  exported SVG, both matching how the frame actually renders.
- **Mobile navigation is invented.** The frame has no mobile design, so the
  desktop header is the source of truth: below `lg` the nav collapses behind a
  hamburger that opens a sheet under the bar, with the same links in the same
  order plus the CTA that hides below `sm`. Escape or a tap on the backdrop
  closes it, focus moves into the sheet on open and back to the toggle on
  Escape, and the page behind it is scroll-locked. Nothing beyond that
  affordance was designed in.
- **Two contrast fixes overrule the frame.** The frame sets white text on the
  coral pill and the unread badge; both measure 2.99:1, below the 4.5:1 AA
  floor for small text, so they take dark text instead. `--color-ink-dim` was
  lightened from `#a3a3a3` to `#ababab` for the same reason, and a separate
  `--color-coral-text` tint exists for small coral text — the brand coral is
  unchanged for large text and graphics, where 3:1 applies. `NFR-11` is a PRD
  release gate, so where the two conflict, contrast wins.
- **Steps orb** is drawn as a CSS gradient disc with an inline SVG star rather
  than the exported PNG, which ships with a white background.

## Navigation

The Figma frames were designed independently and none of them originally
linked to each other — every cross-page link below was added after the fact
to make the prototype click through as one flow, not something the frames
specify. All internal links use `next/link`'s `Link` (client-side navigation,
automatic prefetch), never a plain `<a>`.

- Landing page (`/`) → `/sign-up`: the header nav CTA, the hero's "Book A Live
  Demo", and the CTA band's "Book a demo" — three different buttons, one
  target, since sign-up is the only real conversion flow that exists here.
  Both sidebar logos and the header logo link back to `/`.
- The hero's other button, "Try It Live," doesn't navigate anywhere — it
  calls `useChatWidget().open()` to open the chat widget in place. See
  "Customer-facing chat widget" below.
- `/sign-in` ↔ `/sign-up` cross-link via their "Sign Up" / "Sign In" text links
  (done earlier, unchanged here).
- `AdminSidebar` (`/dashboard`) and `DashboardSidebar` (`/inbox`) are now
  client components (`"use client"` + `usePathname()`) so the active nav item
  reflects the real current route instead of a hardcoded `active: true` on
  one array entry. **Both sidebars' "Tickets" and "Inbox" items point at
  `/inbox`** — the frames show three/six distinct nav destinations, but only
  one ticket/conversation screen has actually been built, so two icons
  legitimately highlight together on that page. If a separate inbox view
  gets built later, split the `href`s in `AdminSidebar.tsx` /
  `DashboardSidebar.tsx`.

Left intentionally unwired, because there's no sensible target — inventing
one would be worse than leaving them inert:

- `CaseStudies`' "Read More" buttons (no per-case-study pages), `SignIn`'s
  "Forgot Password?" (no reset flow), the footer's newsletter "Join Us" and
  social icons, and `ConnectChannelsModal`'s "Continue with…" buttons (no
  real OAuth to connect to). Hero's "Watch Demo" used to be in this list —
  it's now "Try It Live" and opens the chat widget instead.
- `/onboarding`'s "Next" button: the frame is step 1 of a 2-step wizard and
  step 2 ("Package") was never provided as a frame, so there's nothing to
  route to yet.

## Copy

Two policies apply here, for two different reasons.

The **original Figma-fidelity build** transcribed frame text verbatim, typos
included, because the point of that pass was proving the implementation
matched the source frame exactly — "Persdonal", "Case Stadies", "3D
Visualiation", "unrea messages", "NextChat eplies," a pricing blurb about an
online pharmacy, "UI Wiki" branding, three unanswered FAQ items, and a
`/sign-up` heading that said "Sign In to your Account." That was the right
call for that task: silently "fixing" transcribed text would have hidden
whether the build actually matched the frame.

The **Takeoff Travels content pass** is deliberately-authored new copy, not a
transcription of anything — there is no frame to be unfaithful to, so the
verbatim policy doesn't apply. Every example above has been rewritten to
describe the Takeoff Travels PRD instead (see "Takeoff Travels adaptation").
What's left unfixed is listed there too: the raster images that bake old
branding or unrelated content into their pixels, which no copy change can
touch.
