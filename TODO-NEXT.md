# Frontend Implementation — Next Pass

Source of truth: `us-bangla-ota-chatbot-overview_v2.html` (PRD v2.0), `TODO.md` (completed work), codebase audit.

---

## P0 — Restore Live Supervisor Dashboard (`/dashboard`)

The real-time supervisor controls were replaced with static mockup replications. The `InboxProvider` + `WorkspaceEffects` architecture exists and is live — `/dashboard` just needs to consume it again.

- [ ] **Live queue panel** — waiting/offered/assigned counts by priority, oldest wait, breach forecast (`SUP-01`)
- [ ] **Manual assign / reassign / priority change** with mandatory reason (`RT-08`, `SUP-04` override modal)
- [ ] **QA sampling & scorecard UI** — resolved conversations awaiting review, 5-criterion rubric, appeal simulation (`SUP-05`, `SUP-09`)
- [ ] **Minimum-sample suppression** — "Insufficient sample" below 30 conversations (`SUP-06`, `SUP-10`)
- [ ] **KPI drill-down to real conversations** — Paid-Not-Ticketed alarm, channel drill-down (`SUP-03`)
- [ ] **Filter bar** — 6 live dimensions (channel, priority, language, intent, resolution, date range) (`SUP-02`)
- [ ] **Threshold alerts** — SLA breach, no-eligible-agent, surge, escalation spike, channel failure (`SUP-04`)
- [ ] **Async redacted export** — job with requester, filters, row count, 24h expiry, audit record (`SUP-08`)
- [ ] **KPI versioning** — definitions panel, labelled backfill, audit trail (`SUP-07`)

> **Architecture**: Mount `InboxProvider` at `(workspace)` layout (already done). `/dashboard` reads live selectors from shared state — no second simulation.

---

## P0 — Wire Sandbox Mode Toggle (ADM-06)

Plumbing is intact: `brand.sandboxMode` in config, `SandboxBanner` renders on all governed surfaces, agent replies audited as "(sandbox — not delivered)", booking actions carry sandbox notices. **Missing: a control to turn it on.**

- [ ] Add sandbox toggle to **Brand & Channels** card in `/admin` (or new "Platform" section if design allows)
- [ ] Toggle flows through validate → diff → approve → version → audit (already wired)
- [ ] Turning **off** requires second approver (risk-expanding direction) — already enforced by `isSensitiveChange`
- [ ] Verify banner appears on `/inbox`, `/dashboard`, `/admin` across client-side navigation

---

## P0 — Bangla Localization for `/dashboard` + `/admin` (NFR-15)

- [ ] Extend `UiLocaleProvider` strings to cover all `/dashboard` and `/admin` chrome
- [ ] Use same `tx(key, en, bn)` helper pattern as widget/engine
- [ ] **Scope**: agent workspace (`/inbox`) is done; supervisor + admin remain English
- [ ] **Caveat**: All Bangla strings are AI-drafted, unreviewed — flag for native-speaker review (§E4)

---

## P1 — Screen-Reader Accessibility Pass (NFR-11, AG-12)

Mechanical audit (axe) clean on `/inbox`, `/dashboard`, `/admin`. Keyboard pass verified with real CDP key events. **No NVDA/JAWS/VoiceOver testing.**

- [ ] Test P0 agent workflow (accept → read → reply → transfer → resolve) with NVDA + Chrome
- [ ] Test supervisor queue control + drill-down with VoiceOver + Safari
- [ ] Test admin config publish + approval flow with JAWS + Edge
- [ ] Document gaps; fix labels, live regions, ARIA roles as needed

---

## P1 — AI Multi-Intent Parser (AI-01)

Current: fixed-vocabulary parser resolves **one intent at a time**, falls back to clarify chips. `intentTrail` modelled but unused for multi-intent.

- [ ] Extend parser to detect and retain multiple intents per message
- [ ] Preserve unresolved intents in `intentTrail` (already modelled)
- [ ] Surface unresolved intents in handoff package (`AI-05`)
- [ ] Update FAQ/clarify chip logic to handle multi-intent residue

---

## P1 — Real Translation Service for Agent Workspace (AG-04)

Current: "Insert in Bangla" reveals **stored translation only**; no control appears where none exists. Needs a translation service.

- [ ] Integrate translation API (or mock service for prototype)
- [ ] Cache reviewed translations per FAQ/article + version
- [ ] Show "Translate to Bangla" button only when translation exists or service responds
- [ ] Never generate client-side — "reveals stored translation" is the requirement

---

## P2 — Case-Study & Marketing Imagery Decision

All 4 `case-*.png`, `feature-*`, `hero-dashboard`, `solution-card` show invented brands (OneMart, Vapor World, Mati-ta, viora) beside Bangladeshi air travel copy.

- [ ] **Option A**: Commission real photography of Bangladeshi air travel
- [ ] **Option B**: License stock photography depicting Bangladeshi airports/aircraft
- [ ] **Option C**: Drop images, redesign sections around typography + `Logo` component
- [ ] Update `README.md` "Takeoff Travels adaptation" with decision

---

## P2 — Onboarding Step 2 (Package Selection)

No "Package" frame was provided in design assets.

- [ ] Request/design Package selection frame
- [ ] Build `/onboarding/package` page with tier comparison
- [ ] Wire into onboarding flow after `/onboarding` (step 1)

---

## P2 — Solution Carousel Slides 2–3 Copy Sign-Off

Slides 2–3 copy written from pillars (unified queue, deterministic money path), not from design frame.

- [ ] Review with product owner
- [ ] Get sign-off before treating as final marketing copy

---

## P2 — Clean Up Inert Composer Controls

- [ ] **Attach file / Attach image** — wire to genuine file pickers + `Attachment` in transcript (`INB-05`)
- [ ] **Emoji** — wire 12-emoji picker (insert at composer, return focus)
- [ ] **AdminHeader search** — hand query to `INB-07` search + navigate to `/inbox` (reuse `channelFilterIntent` pattern)
- [ ] Verify "Current Month" selector fully removed from historical dashboard

---

## P2 — Confidence Calibration Per Intent/Language/Channel (AI-07)

Current: one global triple (High/Guarded/Clarify). Needs per-intent/language/channel bands + drift review.

- [ ] Extend `confidenceBand()` in `tenantConfigEngine.ts` to key by intent × language × channel
- [ ] Add calibration UI in `/admin` → AI & Knowledge (reviewed-outcome table)
- [ ] Hook drift detection to unanswered-question log (`D2` observability)

---

## P2 — Restore Admin Features (If Platform Tab Returns)

- [ ] **ADM-05** Integration Secrets — last-four preview, show-once reveal, two-step rotation, audit without values
- [ ] **ADM-08** Tenant Export/Deletion — scope computation with legal-hold/ledger exceptions, async execution, audit
- [ ] Both implementations exist in `git log`; need a home in `/admin` navigation

---

## Verification Checklist (Per Pass)

- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Playwright: desktop + mobile, keyboard-only, 75s hold-expiry, Bangla/Banglish flows
- [ ] axe-core: zero findings on `/inbox`, `/dashboard`, `/admin`
- [ ] Real-key keyboard pass (CDP) on all three surfaces
- [ ] Clock-skew tests: offer expiry, snooze wake, scheduled config, break-glass expiry

---

## Notes

- **No backend integration required** — all mock/local state, consistent with existing codebase
- **Priority order is deliberate**: P0 items undercut PRD claims if left undone
- **Partial items** (AI-01, AI-07, AG-04 translation) are partial for stated reasons, not neglect
- **Assets blocked**: Case-study photography needs design/brand decision, not code