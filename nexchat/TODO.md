# Frontend implementation TODO

Source of truth: `us-bangla-ota-chatbot-overview_v2.html` (Takeoff Travels
Omnichannel OTA Customer Support Platform PRD, v2.0). Requirement IDs below
(`INB-01`, `AI-04`, `RT-03`, `AG-05`, `SUP-06`, `ADM-03`, `NFR-11`…) refer to
that document's own tables, so a requirement can always be traced back to
its exact source line.

## Where this picks up from

The previous pass rebranded and re-populated what already existed —
marketing site, `/inbox` (agent workspace), `/dashboard` (supervisor KPIs),
auth/onboarding — with Takeoff Travels copy and PRD-consistent mock data.
Nothing in that pass added a screen, a flow, or a piece of state that wasn't
already there; it made the existing mockup say the right things. What
follows is the gap between that mockup and the product the PRD actually
specifies: real interaction, missing surfaces, and states that only exist as
a screenshot today. Everything stays frontend-only — mock/local state, no
backend — matching how the rest of this codebase already works.

Priority order below is deliberate: **P0 first**, because it's the one
surface the entire PRD is about and the app currently has *none* of it — no
amount of polish on the internal tools matters if the product the customer
actually talks to doesn't exist yet.

---

## P0 — Customer-facing chat: search, book, pay, support

**Built.** `src/components/widget/` — a floating launcher + panel (`Try It
Live` in the Hero opens it, or the launcher itself), backed by a typed
`useReducer` state machine (`engine.ts`) that stays pure: every delayed
"bot is typing, then replies" beat is expressed as `pending` and resolved
by a timer in `WidgetConversation.tsx`, not by side effects inside the
reducer. Verified end-to-end in a real browser (Playwright), not just
read — desktop and mobile-width, keyboard-only, and a full 75-second live
hold-expiry run, with zero console errors.

- [x] **Chat widget shell.** Launcher + panel, `role="dialog"`, focus
      trapped and moved to the composer on open, Escape closes and returns
      focus to the launcher, `inert` + `aria-hidden` while closed so the
      always-mounted (state-preserving) panel is truly non-interactive,
      `motion-reduce:` respected. Full-screen sheet under `sm:`, floating
      380×640 card above it.
- [x] **UC-01 Search.** One free-text message extracts multiple slots at
      once (the PRD's own "Dhaka theke Cox's Bazar kal shokale" example
      parses origin+destination+date in a single turn, matching AI-01's
      multi-slot principle) with quick-reply chips filling whatever's left.
      Up to 3 fare cards returned; any route pair works via a deterministic
      generator, not just the one PRD example.
- [x] **Re-price confirmation.** Selecting the Economy Flexible fare always
      demonstrates the "price moved, please reconfirm" branch (§B2
      `OFFER_SELECTED`) on demand, rather than leaving it unreachable
      in a demo; Saver fares confirm at the quoted price.
- [x] **UC-02 Book & pay.** Sequential passenger capture (name → DOB → NID),
      type derived from DOB against the travel date and shown for
      confirmation — verified against an actual infant-on-lap case, not
      just adults. Live countdown (shortened to 75s and labelled as a
      demo value — the PRD's real 12 minutes is the wrong UX inside a
      live demo). Mock checkout panel with bKash/Nagad/Card tabs and an
      explicit "never sees your PIN or card number" line; no card/PIN
      field is rendered anywhere, even for the demo. Ticket bubble shows
      PNR, passengers and total, "sent to WhatsApp and email" — no fake
      download button pretending to produce a real PDF.
- [x] **Hold-expiry and rebook.** A hold that reaches zero releases the
      seats and offers one-tap rebook; rebooking with passengers already
      on file skips straight back to re-pricing instead of re-asking for
      names — confirmed with a real 75-second wait, not a mocked timer.
- [x] **Language indicator.** Input is script-detected (Bengali Unicode,
      or a Banglish keyword list) and shown as a small badge above the
      composer the moment it's detected — verified with both an actual
      Bangla-script message and a Banglish one.
- [x] **Bot replies in Bangla** (§B3/§E4). Every `bot()`-authored line in
      `engine.ts` — every slot-filling prompt, error/retry message, the
      four FAQ answers, the PNR-lookup and resend-ticket confirmations —
      now routes through a small `tx(locale, en, bn)` helper instead of a
      hardcoded English string, so once `detectLocale` pins the customer's
      language, the assistant's own text switches too, not just the badge
      announcing it. Banglish gets the same Bangla-script reply as `bn`
      rather than a third, romanized translation — the PRD's own "one
      canonical language with a reviewed translation" (§E4) implies one
      alternate, not a transliterated one. Fixing this exposed one more
      real gap in the same feature: the FAQ intent-matcher's `keywords`
      arrays were English/Banglish only, so a customer who typed an actual
      Bangla-script question could never reach a matched FAQ topic at all,
      Bangla answer or not — city and date parsing already had Bengali
      terms (`CITY_ALIASES`, `findDate`'s "কাল"/"আজ"), the FAQ table just
      hadn't been extended the same way. Added Bengali keyword synonyms to
      all four FAQ entries so the path is actually reachable via typed
      Bangla, not only by clicking an English-labelled FAQ chip after some
      unrelated Bangla message had already set the locale. Quick-reply chip
      labels and static card microcopy (hold/payment/ticket card text,
      "Confirm and hold the fare," etc.) stay English by design — the gap
      named in the PRD was specifically the assistant's own conversational
      replies, not the UI chrome, so that's what this closes.
      <br>Verified end-to-end in a real browser: a genuine Bangla-script
      multi-slot search (the PRD's own "Dhaka theke Cox's Bazar" example,
      but typed in Bengali script) gets a Bangla follow-up prompt for
      whichever slot is still missing, then Bangla-typed FAQ questions
      correctly route to and display the matching Bangla answer, while an
      English-typed question still gets the English answer — no regression.
      <br>**Honest caveat, not fixed by this pass:** the Bangla strings
      themselves are AI-drafted for this demo and have not been reviewed by
      a native speaker or a professional translator. That's a different,
      narrower gap than "doesn't exist at all" — the wiring, detection, and
      routing are real and tested; the linguistic review §E4 actually calls
      for is still outstanding, and is called out in `engine.ts`'s `tx()`
      doc comment so it isn't lost.
- [x] **UC-03 Manage.** PNR lookup (try `XKD4RP`, or the PNR from a booking
      made in the same session) returns status + baggage + a working
      "Resend my ticket" that re-offers the main menu afterward rather
      than dead-ending — a real bug an actual Playwright run caught before
      this shipped.
- [x] **UC-04 Support.** FAQ answers each carry a visible "Source: ..."
      citation pill (`AI-03`); an unrecognised question routes to handoff
      rather than guessing.
- [x] **Handoff moment.** "Connecting you to a person" with a queue-position
      indicator fires on explicit request, on a 4+ passenger group, or on
      an unanswerable FAQ — the bot does not keep offering menu options
      afterward, matching AI-06's "go silent once handed off."
- [x] **"Money held without inventory" branch** (§B2). The hold's own
      countdown keeps ticking in the background even once the payment panel
      is open (`HoldCountdown` in `bubbles.tsx` stays mounted for the
      lifetime of the conversation, not just while its message is the
      newest one), so a customer who hits "Simulate successful payment"
      with only a second or two left on the clock can have the hold expire
      *while the payment is still resolving* — a real race, not a
      simulated one. `engine.ts` now tracks `paymentInFlight` so
      `HOLD_EXPIRED` landing in that window suppresses the plain
      "hold expired" card and lets `RESOLVE_TICKETING` land the one
      authoritative outcome instead: no ticket is issued, a
      `payment-voided` card explains the seats were released and the
      charge will be refunded automatically, and "Rebook the same fare"
      re-holds with a fresh countdown. Verified with Playwright's clock API
      (`page.clock.install`/`runFor`) to land `HOLD_EXPIRED` deterministically
      one tick ahead of `RESOLVE_TICKETING`, rather than relying on a real
      75-second race that would only sometimes reproduce — confirmed no
      ticket is issued, the voided card shows the right PNR and amount, and
      rebook produces a genuinely new hold afterward.

## P1 — Agent workspace (`/inbox`)

**Built.** The three-pane layout was already there; what it sat on top of
wasn't — `TicketList` was five hardcoded cards, `ChatPanel` showed the same
fixed transcript regardless of which one was "selected," `DetailsPanel`
never reflected the selection, and the filter tabs were cosmetic. All of
that had to become real before any of the checklist below could mean
anything, so this pass added `src/components/dashboard/inboxEngine.ts` (a
`useReducer` state machine for a list of conversations, same discipline as
`widget/engine.ts`) behind an `InboxProvider`/`useInbox()` context, and
every existing component now reads and writes through it. Verified
end-to-end in a real browser — including letting a real 30-second offer
countdown expire on its own rather than only testing the accept/decline
paths.

- [x] **Assignment offer countdown.** A 30s accept/decline window
      (`RT-04`), shown two places at once on purpose: a dismissable
      `OfferBanner` at the top of the workspace (so a new offer is
      *noticed*, not just discoverable by clicking around) and inline in
      `ChatPanel` if the agent opens it directly. Declining or letting it
      run out both return the conversation to the queue with an audited
      activity entry ("Assignment declined" / "Offer timed out") — verified
      by actually letting the 30-second timer expire, not just triggering
      `DECLINE` by hand.
- [x] **Ownership lease + AI-silence indicator.** A green "You're in
      control — AI is silent on this thread" banner while
      `ownerLeaseActive`, and a "Release to AI" action in the conversation's
      options menu that hands it back — sets the conversation back to
      `queued` and the banner disappears (`AG-02`, `AG-03`).
- [x] **AI-assisted draft panel.** "AI Reply" shows a brief "Drafting a
      reply…" state, then a visually distinct dashed-border card labelled
      "AI suggested reply — not sent yet" with three real actions: **Send
      as-is** (sends immediately), **Edit before sending** (moves the text
      into the composer, focused, for the agent to change), and **Discard**.
      The suggestion is never appended to the transcript until one of those
      fires (`AG-04`). Caught one real bug here before it shipped: the first
      version of "Edit before sending" cleared the draft from state but
      never actually put its text in the composer — fixed once the browser
      test showed an empty input where the draft text should have been.
- [x] **Transfer flow.** A modal (destination + required reason) that
      returns the conversation to `queued` under the new owner, with the
      reason recorded in the activity log and original context intact
      (`AG-07`).
- [x] **Resolve flow.** A modal requiring a resolution category, with a
      domain reference required specifically for Booking & Payment / Refund
      / Complaint categories (not General Inquiry) — matching AG-08's
      "where applicable," not a blanket requirement.
- [x] **Snooze flow.** A modal requiring a named wake condition and a wake
      time (15m/1h/4h/tomorrow); wakes back to the same owner as `assigned`,
      not into the general queue (`AG-09`).
- [x] **Confidence trail in `DetailsPanel`.** A new "AI handoff summary"
      card — booking state, payment summary, PNR/route, language, and the
      last-intents-with-confidence list — modeled directly on the PRD's own
      "What Shirin actually opens" mock (§B5), which the previous
      `DetailsPanel` didn't have at all, only a generic status/priority
      form.
- [x] **Full agent state set.** All six states from the E5 table
      (Available/Busy/Wrap-up/Away/Break/Training/Offline) in a real
      dropdown — and switching away from Available/Busy actually stops new
      offers from being simulated, it's not just a cosmetic label change.
- [x] **Keyboard-only pass.** Verified by driving the workspace with `Tab`
      alone from a cold page load through to reaching and using the reply
      composer, plus `Escape` closing an open options menu — real
      interaction, not a static audit of `tabindex` values.

**Fixed along the way, not part of the original checklist:** the "Ticket
Details" status/priority fields were a `<select>` that looked editable but
changing it did nothing — replaced with a read-only display, since the real
way to change status is through Resolve/Transfer/Snooze, and a dropdown
that silently ignores your selection is worse than no dropdown. The
`TicketFilterBar` tabs were non-functional decoration; they now actually
filter, with live counts. Every customer avatar was the same stock photo
(`ticket-avatar.png`/`contact-avatar.png` reused everywhere); replaced with
`InitialsAvatar`, a code-drawn per-name avatar (same rationale as `Logo.tsx`
— don't fake a photo of a specific person).

- [x] **Mask customer PII, and audit every reveal (`AG-06`, `NFR-08`).**
      Five protected fields — email, phone, address, passport/NID (new on
      `Conversation`) and the payment reference — are masked at render by
      `maskPii`, each keeping only what the task needs: last three digits of
      a phone, the email domain, the city but not the street, and the
      amount/rail/time of a payment but not its reference, which is the part
      that could be replayed against a gateway. Revealing one asks for a
      reason when `security.piiRevealRequiresReason` is on (it now reads
      that field instead of ignoring it) and writes a "Phone revealed —
      *agent* — *reason*" entry into the conversation's activity history
      either way; the audit is in the reducer, not the modal, so the
      no-reason path cannot skip it. Hide re-masks; nothing is persisted, so
      closing the workspace re-masks everything.
      <br>Verified in a browser end to end: masked on load, dialog refuses
      to submit without a reason, reveal opens exactly one field and leaves
      the others masked, and the audit entry survives the re-hide. The
      reveal control lives only in `DetailsPanel` — `ChatPanel`'s header
      renders the same phone masked rather than growing a second reveal
      path to keep audited.
      <br>`CustomerInfo` was in this item's original scope by mistake: it is
      the tenant admin's own onboarding form, not customer data an agent
      views, so `AG-06` does not apply to it.
- [x] **Booking actions in the workspace (`AG-05`).** Four actions —
      retry ticketing, resend ticket, rebook at the current fare, start
      refund — in a "Booking actions" block in `DetailsPanel`. Which ones
      appear is *derived* from `bookingState` and the tenant's published
      `commercial.refundCeilingBdt` by `availableBookingActions`, the same
      way the bot's own flow is driven by its `Phase`, so an agent is never
      offered something this booking cannot do. Retrying a failed ticketing
      turns into "Resend ticket" the moment it succeeds, because the list is
      recomputed rather than stored.
      <br>Each action confirms first, and the confirmation re-derives the
      offer instead of trusting the button that opened it — a booking that
      moved on in the meantime says so rather than running stale. Each runs
      under an idempotency key minted when the dialog opens, and the reducer
      no-ops on a replayed key, which is as much of `NFR-04`'s exactly-once
      visible effect as a frontend can honestly hold. Each writes both a
      system message into the transcript and an activity entry carrying the
      agent, the PNR and the key.
      <br>A refund above the ceiling is **offered and blocked, not hidden** —
      the dialog names the amount and the ceiling and the button reads "Needs
      approval", which is the hand-off point to `ADM-03`'s existing
      maker-checker. Verified in a browser: the whole retry→resend
      transition, the audit trail, and the over-ceiling refund on a BDT
      42,800 booking against the BDT 15,000 default ceiling.
      <br>**Still open:** the blocked refund names the approver requirement
      but does not yet *raise* the approval request into
      `ApprovalsAndHistory` — that wiring is the remaining half of this.
- [x] **Search the inbox by more than customer name (`INB-07`).** Bare
      words now match across name, phone, email, PNR, route, conversation
      ID, payment reference, resolution reference, escalation reason and
      tags at once; the dimensions that need precision are `field:value`
      prefixes — `pnr:`, `tag:`, `assignee:`, `channel:`, `status:`, and
      `since:`/`until:`, which take `2d`/`36h`/`90m` or an ISO date and
      cover the PRD's date range without a second piece of chrome. Terms
      combine with AND. An unrecognised prefix narrows to nothing rather
      than being ignored — a typo should not quietly widen the result set.
      <br>Search matches the *unmasked* phone and email on purpose: an agent
      searching a number they were read on a call is not a disclosure,
      because results still render masked (`AG-06`), so finding a
      conversation never shows the value. The hint line under the box lists
      the prefixes when idle and switches to "N of M in this view" while
      searching. All fifteen cases verified in a browser.
- [x] **The inbox views the PRD actually names (`INB-06`).** The five
      status tabs are replaced by the eight views the PRD lists, plus All:
      Unassigned, Assigned to me, Team queues, SLA risk, Priority incidents,
      Waiting customer, Snoozed, Recently resolved. Each is a predicate in
      `matchesView`, computed from the conversation rather than stored on
      it, so a thread joins and leaves a view the moment it qualifies or
      stops — no membership to keep in sync.
      <br>Two needed a judgement call: "team queues" is everything open this
      agent does not personally own, which is what it means with one team;
      "waiting customer" is an open thread whose *last* transcript message
      came from the customer, which is the queue that actually costs a
      reply, as distinct from merely being assigned. "Recently resolved"
      needed a real `resolvedAt` on the conversation (24h window) rather
      than reusing queue age.
      <br>Counts tick off `useNow`, since SLA risk and recency move with the
      clock and not only on dispatch — visible in testing when an incoming
      offer arrived and five badges updated at once. Nine tabs scroll rather
      than wrap, so the fixed three-pane layout keeps its height.
- [x] **Guard logout and break while work is held (`AG-11`).** Choosing a
      state that stops new work while conversations are still held parks the
      change behind a confirmation that names each one, and offers three
      honest choices: stay as you are, keep them, or release them to the
      queue (audited as "Released to queue — *agent* going *state*"). The
      agent is warned, never blocked — refusing to let someone go on break
      is not software's call. States that still take work fall straight
      through with no dialog.
      <br>The rule behind the advice is the other half: `sla.unattendedMinutes`
      is new tenant config (default 10, validated, editable in the console
      and flowing through the existing approve/version/audit path), and
      `WorkspaceEffects` releases anything still held past that window with a
      "Reassigned — unattended" entry, whichever screen is open. Verified in
      a browser including the timeout itself, by skewing the page clock past
      the window rather than waiting ten minutes for it.
- [x] **Gate the composer by channel (`INB-12`).** `channelSendPolicy`
      encodes the real platform rules rather than invented ones: WhatsApp
      and Messenger each open a 24-hour customer-service window on every
      inbound message and allow only approved templates once it shuts; a web
      widget can only be answered while the session is actually open (30
      minutes). Conversations carry a real `lastCustomerAt` for this — the
      transcript only had display times — plus a `channelOptIn` flag, and a
      customer who has not opted in gets nothing sent outside the window, not
      even a template.
      <br>Inside the window the composer is untouched. Outside it, free
      typing is disabled at the input *and* in `send()` — not just the
      button — and an amber panel says which window closed, offers the three
      approved templates (which do send, and land in the transcript), and
      names an alternative enabled channel. It names one only when one
      genuinely exists: with Messenger disabled tenant-wide the panel
      correctly stays quiet rather than suggesting a channel that cannot
      deliver. The gate lives in the engine, not the composer, because the
      answer is the same wherever a send is attempted.
      <br>Verified by skewing the page clock 25 hours forward on a live
      WhatsApp thread and watching the composer close on the next `useNow`
      tick.

- [x] **Real send states, bounded retry, visible failure (`INB-09`).** The
      double-tick in `ChatPanel` was drawn on every outbound message
      regardless of channel or outcome — a read receipt asserted where
      nothing had reported one, which is worse to show than nothing. Messages
      now carry a real `delivery` state and each one says only what the
      channel actually reported.
      <br>`CHANNEL_DELIVERY_STATES` is a table rather than one shared ladder,
      because the requirement's "where the channel supplies them" clause is
      load-bearing: WhatsApp and Messenger report read, a web-widget session
      never does, so a Website send stops at delivered instead of inventing a
      read.
      <br>Whether a send succeeds is a **real rule, not a coin flip** — a
      message can only be delivered on a channel the tenant has enabled. That
      makes the failure path deterministic and demonstrable (disable Messenger
      and Messenger sends fail; enable it and they go through) and ties this
      to the channel model `INB-12` already uses rather than inventing a
      second notion of "sendable". Retry is bounded at three attempts, after
      which the failure is terminal, stops retrying and surfaces to the
      operator with a Retry control — a silent infinite loop is how a customer
      waits forever for a message nobody knows was never sent. A manual retry
      is a fresh human decision, so it gets the full allowance again rather
      than inheriting the budget the automatic attempts spent.
      <br>**Caught by testing, not by reading the code:** the seeded terminal
      failure had no matching activity entry, because seeding the state
      directly skipped the reducer that writes one. A terminal failure with no
      audit trail is precisely the invisibility this requirement exists to
      prevent. Seed and reducer now agree.

- [x] **Knowledge search, cited sources, and translation (`AG-04`).** An
      agent taking over a thread could not look up the policy the bot had just
      quoted to the customer. Now they can.
      <br>The panel searches `FAQ` — the **same array the widget answers
      from**, not a copy. That is the point rather than a convenience: two
      knowledge bases drift, and the failure mode is an agent confidently
      contradicting the bot in the same thread. Every result carries its
      source and version (`AI-03`), so what the agent quotes is attributable
      exactly like what the bot quoted, and a Bangla query finds the same
      article because the keyword lists already carry Bangla terms.
      Conversations record what the bot cited, and clicking a source in the
      handoff summary opens *that* article rather than dumping the base.
      <br>Inserting fills the composer and sends nothing — `AG-04` is explicit
      that a suggestion is not a human message until sent, and the suite
      asserts the outbound count is unchanged. "Insert in Bangla" uses the
      reviewed `aBn` answer the bot already sends, so it is a real translation
      of approved copy rather than a generated one.
      <br>**Two things testing forced, both real:** clearing the pinned
      article on mount cleared it before it had been used, so a citation
      opened the whole knowledge base — the request now lives in inbox state
      until a search or a close supersedes it. And the panel was inside the
      owned-conversation block, so a citation on an *unassigned* thread could
      not open at all. Looking a policy up is not sending one, so it no longer
      requires the ownership lease; only the insert buttons do.
      <br>**Still partial, deliberately:** message translation *reveals a
      stored translation*, it does not generate one. Where none exists no
      control appears. The alternative — inventing a client-side translation —
      would put words in a customer's mouth in a transcript an agent then acts
      on, which is worse than an absent button. A production build needs a
      translation service here.

- [x] **Internal notes, mentions, saved replies and follow-ups (`INB-08`).**
      All eight of the requirement's items exist now: tags, internal notes,
      @mentions, attachments, saved replies, resolution codes, snooze-until
      and follow-up tasks.
      <br>The load-bearing clause is "internal content must never be sent to
      the customer", so a note is **its own kind of transcript entry**, not an
      agent message with a flag. It is created by `ADD_NOTE`, never by
      `SEND_MESSAGE`, and carries no `delivery` — and since the delivery
      effect only looks at entries that have one, a note has no path to a
      channel even if the styling later regresses. The suite asserts the
      outbound count is unchanged after adding one, and that the note card
      shows no delivery state. It renders as a dashed amber card saying
      "Internal note — not sent to the customer" rather than relying on colour
      alone.
      <br>The composer is one control in two modes, because the thing that
      must never happen is an agent believing they wrote a note and sending
      it: note mode retints the whole composer, relabels the send control to
      "Add internal note", and hides the channel-window notice, since a note
      is never delivered and `INB-12`'s window does not apply to it. Saved
      replies are customer-facing, so they are disabled in note mode.
      <br>`@Name` is matched against the real roster rather than any word
      after an `@`, so an email address in a note mentions nobody — checked
      against six cases including `shirin@example.com` and the near-miss
      `@Shirina`. Mentions are recorded on the note and named in the audit.
      Follow-ups carry an owner and a due time, for the same reason `AG-09`
      wants a named owner on a snooze: "someone should chase this" with
      neither is how a follow-up stops happening.
      <br>**Caught while writing it:** a bare `` inside a template literal
      is a backspace character, not a word boundary, so mention matching
      silently matched nothing. And Tags and Follow-ups both rendered a button
      whose only accessible name was "Add" — ambiguous to anyone navigating by
      control name, so both now carry distinct `aria-label`s.

- [x] **Identity status, pinning, presence, snooze owner, location and
      reactions (`AG-01`, `RT-08`, `INB-11`, `AG-09`, `INB-05`).** Five small
      gaps that each left an agent guessing, closed together.
      <br>**`AG-01`** — the workspace showed passport/NID (masked) but never
      whether it had been *checked*, which is the part that gates a refund or
      a name change. Identity is now a state on the conversation, changeable
      by an agent and audited on every transition. All four values are
      reachable in the seed, including `mismatch`, which is what the
      name-correction thread actually was.
      <br>**`RT-08`** — pinning shared the supervisor override modal's
      mandatory reason rather than getting a quicker path that skips it,
      because the same PRD sentence requires a reason for all four
      supervisor actions. A pin outranked priority *within* the open group
      but did not cross groups. *(Retired with the supervisor views — the
      queue-sort behaviour remains in `queueSort`, the override UI does not.)*
      <br>**`INB-11`** — the ownership lease already stopped two agents
      replying at once; presence is what lets one see it coming. Shown per
      conversation, not globally.
      <br>**`AG-09`** — a snooze now wakes to a named owner, defaulting to
      whoever snoozed it but assignable to someone else, and the wake names
      them. Same reasoning as `INB-08`'s follow-ups: "someone should look at
      this later" with nobody named is how a case gets lost.
      <br>**`INB-05`** — a shared location renders as a place rather than a
      file with coordinates in it, and channel reactions render as themselves
      with who sent them. That completes the requirement's list.
      <br>**Two silent no-ops caught by testing:** two of my edits to the seed
      data matched nothing and I had not asserted on them, so a feature looked
      implemented while its data was absent. The presence banner was correct
      the whole time — the conversation it was supposed to be on simply never
      got it. Both are now asserted at the point of edit.

**Genuinely still open:** `TicketList`'s filters are status/channel only —
no saved views or additional filter dimensions. WCAG 2.2 AA is verified for
the one keyboard path above, not audited across every control.

## P1 — Routing & queue visibility

**Built.** All three items, plus the pieces of `inboxEngine.ts` they needed
that weren't there before: a real `queuedSince`/`slaDeadline` per
conversation (the "age preserved" activity-log messages from the previous
pass were asserted but not actually backed by a timestamp until this one),
a `queueSort` comparator, a `canAcceptWork(agentState)` eligibility check,
and a `disruption` record on `InboxState`.

- [x] **Priority queue view.** `TicketList` now sorts by `queueSort` —
      priority band first, then age within a band, per §C1/§E3 — instead of
      insertion order. Live SLA badges ("SLA due in 4h" → amber under 5
      minutes → red "SLA breached") using P0's real 5-minute figure from
      the §D2 critical-alarm threshold for P0 and illustrative-but-ordered
      values for P1–P3, since the PRD's own table doesn't give the other
      three a number.
      <br>**Caught by actually looking at the rendered list, not just
      testing the logic in isolation:** the first version scoped priority
      ordering to the unclaimed queue only and put `assigned` conversations
      in a separate tier below it — a defensible reading of §C1/§E3 on
      paper, but it meant a near-SLA-breach P0 already assigned to the
      agent rendered *underneath* two lower-priority unclaimed P2 tickets.
      Fixed by ranking offered/queued/assigned together; snoozed and
      resolved still sort last.
- [x] **"No eligible agent" state.** Two halves, both real: `canAcceptWork`
      disables every Accept button (`OfferBanner`, and both the offered and
      queued branches of `ChatPanel`'s `StatusAction`) whenever the agent's
      own state isn't Available/Busy, with an inline explanation rather
      than a silently-dead button; and `NoEligibleAgentNotice` surfaces the
      count and oldest-wait time. The "retry on agent-state change" half of
      `RT-07` is real too, not just described — `SET_AGENT_STATE` in the
      engine re-offers the top of the queue (by the same `queueSort` the
      list uses) the moment the agent becomes eligible again, verified by
      switching Away → Available and watching the offer banner reappear
      unprompted.
- [x] **Disruption/surge cohort view.** A "Simulate disruption" control
      (`DashboardHeader`) opens a disruption record and its affected
      passengers at once — `DisruptionCohort` renders each open record as
      its own card, cohort ordered by urgency (airport now → soonest
      departure) within it, completely separate from the everyday
      `TicketList` rather than mixed into it, matching §B5's "a disruption
      is a surge, not a queue" explicitly. Each cohort's "resolved
      informational" passengers are auto-resolved immediately with a
      rebooking/refund offer straight from the disruption record — §B5's
      "only those who need a decision are queued" is a real code branch
      (`disruptionPassenger`'s `kind` parameter), not just true for the
      ones that happen to need one.
- [x] **Surge-tagged SLA badges.** A disruption-cohort conversation gets a
      `slaDeadline` exactly like any other queued ticket, so it needs the
      same badge, not a silently-absent one — `slaBadge()` moved from
      `TicketList` into `inboxEngine.ts` as one shared selector both
      `TicketList` and `DisruptionCohort` read from, returning a `surge`
      flag so `DisruptionCohort` can render it as "Surge · SLA due in Xm"
      instead of an identical, context-free badge indistinguishable from an
      everyday queue SLA.
- [x] **Multiple concurrent disruptions.** `SIMULATE_DISRUPTION` used to
      no-op once one record was open; `state.disruption` is now
      `state.disruptions: DisruptionRecord[]`, and a small
      `DISRUPTION_SCENARIOS` table (a cancelled DAC → CXB rotation, and a
      DAC → ZYL mechanical delay with its own cohort, wording, and offer —
      not a duplicate of the first) lets a second, genuinely different
      surge open while the first is still active, each rendered as its own
      `DisruptionCard`. Capped at the two scripted scenarios — honest about
      being a demo fixture, not a claim this scales to arbitrarily many
      concurrent events; the button disables and relabels once both are
      open.
      <br>**Fixed along the way, found by tracing rather than by testing:**
      closing a disruption record only ever cleared the record itself —
      any cohort passenger still `disruptionId`-tagged stayed permanently
      excluded from `TicketList` (which filters out anything with a
      `disruptionId`, unconditionally) even after its banner disappeared.
      A passenger who still needed a human decision when the record was
      closed would have become invisible everywhere, with no queue, no
      banner, and no way for anyone to find them again. `CLOSE_DISRUPTION`
      now clears `disruptionId` on that record's conversations when it
      closes, so anyone still outstanding falls back into the normal queue
      instead of disappearing — verified by closing a disruption with
      passengers still needing a decision and confirming they reappear in
      `TicketList`.
      <br>Verified end-to-end: two distinct disruptions open concurrently
      with visibly different routes/reasons, surge SLA badges present on
      each cohort's queued rows, the control disabling once both scripted
      scenarios are open, and the close-and-recover path above — zero
      console errors.

- [x] **Real routing eligibility and a readable decision (`RT-01`, `RT-10`,
      and `SUP-02`'s last two dimensions).** One data-model extension closed
      three rows, which is why they were done together: `Conversation` gained
      `queueId`, `requiredSkill` and `assignee`, and the agent roster — which
      previously held nothing but QA scorecard numbers — gained the six
      attributes routing actually needs: queues, skills, languages, channel
      permission, load and availability.
      <br>`routeConversation` applies RT-01's filters **in RT-01's order**,
      with weighting last. That ordering is the point: weighting first and
      filtering after produces a confident selection of someone who was never
      allowed to take the work. Selection is deterministic — base weight
      scaled by remaining capacity, no random tie-break — so a decision can
      still be explained after the fact.
      <br>For `RT-10`, every candidate is retained with the reason it failed
      rather than being dropped, and `DetailsPanel` renders the whole table:
      queue, required skill, eligible-of-total, effective weights, and the
      selected agent. The question this answers is "why didn't it go to
      Arif?", which a list of winners cannot. The one-line reason also lands
      in the activity trail. The roster is seeded so each filter actually
      bites somewhere — Arif lacks the refunds skill, Nabila covers English
      only and is in training — rather than every agent passing everything.
      <br>The decision is computed in `WorkspaceEffects`, which has the
      tenant config the reducer deliberately does not, and cleared by every
      path that returns work to the pool so a re-queue is routed afresh
      instead of inheriting a decision that already picked someone who said
      no. A conversation that never routed shows no panel rather than a
      fabricated one.
      <br>**Caught by testing, not by reading the code:** the agent filter
      passed while returning "4 of 4 unassigned" and "0 of 4" for a named
      agent — mechanically correct, factually wrong, because `assignee` was
      only ever set on accept and the seeded assigned conversation had none.
      A supervisor filter can look like it works while the data underneath it
      is empty. Fixed at the source (seed and `RT-08`'s manual assign) and
      the assertions tightened from "a count rendered" to the real counts,
      3 and 1.

- [x] **Prefer the previous agent on reopen (`RT-05`, and the rest of
      `AG-10`).** Resolving now records `lastAgent`, and a resolved case
      inside `sla.reopenWindowHours` (which finally has a reader) offers
      "Reopen" in the conversation menu. `routeReopen` decides where it
      goes and returns the reason with it, so the audit entry says which way
      it went — that is `RT-10`'s "expose assignment reason" for this path.
      <br>Three outcomes, all verified in a browser: with a previous owner
      who can take work it comes back to them **as an offer, not a silent
      assignment** ("Offered back to Rifat Karim, who resolved it"); with no
      previous owner on record it queues normally; and when a higher-priority
      conversation is already inside its breach window the affinity **yields**
      — "Queued instead — Tanvir Rahman's P0 is inside its SLA breach
      window". That last case is the half of `RT-05` that is easy to skip, so
      it was constructed deliberately: release the P0 back to the queue near
      its deadline, own and resolve a P1, then reopen it.
      <br>A reopened case restarts its SLA clock, since it is new work, but
      keeps its original resolution on the record.

## P2 — Supervisor real-time controls (`/dashboard`)

**Built.** §E6 splits supervisor needs into two products — real-time
control and historical scorecards — and only the second existed before this
pass. Doing the first one honestly required a real architecture change
first: `/inbox` and `/dashboard` were completely separate component trees
with no shared state, so a "live queue panel" would otherwise have had to
either fake a second independent simulation or not really be live at all.
Fixed by moving both routes into a route group — `src/app/(workspace)/` —
with one `InboxProvider` mounted at its `layout.tsx`, which Next.js keeps
alive across navigation between sibling routes under it rather than
remounting. A supervisor on `/dashboard` now watches the exact conversations
`/inbox` is working, not a lookalike.

That sharing exposed a real gap the single-page version had been hiding:
offer/snooze expiry was enforced by a `useCountdown` hook inside whichever
component happened to be on screen (`OfferBanner`, `ChatPanel`) — fine when
that component was always mounted, not fine once a supervisor can watch the
queue from a page where it isn't. Fixed with `WorkspaceEffects.tsx`, a
watchdog mounted once at the layout that enforces both deadlines
regardless of which page is active — verified by opening an offer, switching
to `/dashboard`, and confirming the count actually reaches zero without ever
touching `/inbox` again, not just reading the timer code and assuming it
would.

> **Superseded.** Everything checked off in this section was later replaced
> when the supervisor views became direct replications of the design mockup
> (see README.md "Supervisor views"). The entries below are kept as the
> record of what was built and why; the code is in `git log`. `SUP-07` and
> `SUP-08` survive, re-homed into Settings → Platform.

- [x] **Live queue control panel.** `LiveQueuePanel` — waiting/offered/
      assigned counts, by-priority breakdown, oldest wait, and a breach
      forecast (`SUP-01`), computed by a pure `queueSnapshot` selector over
      live conversations, not stored/duplicated state. Each waiting
      conversation has a "Manage" button straight into the override modal
      below — confirmed end-to-end: overriding from `/dashboard` and
      navigating to `/inbox` shows the changed priority and ownership
      there, not just on the dashboard that made the change.
- [x] **Manual assign / reassign / priority-change** (`RT-08`) via
      `ManualAssignModal`, always requiring a reason. Scoped honestly to
      what a single-real-agent demo can actually show: priority override
      always works; "assign" means force-assigning to the one real agent,
      since reassigning *to* a different agent would need a simulated
      second inbox this app doesn't have — documented in the component
      rather than implied to do more than it does.
- [x] **QA sampling & scorecard UI** (`SUP-05`, `SUP-09`) —
      `QaSamplingPanel` lists resolved conversations awaiting review,
      `QaReviewModal` scores the same five rubric criteria §E6 names
      (accuracy, policy, communication, ownership, security) and computes
      an overall live as the sliders move. SUP-09 is written from the
      agent's side ("allow agents to... submit an appeal"), which this app
      has no dedicated agent-scorecard screen for — rather than skip the
      appeal flow, "Simulate agent appeal (demo)" stands in for that
      missing screen the same way "Simulate disruption" already stood in
      for a real disruption event, so the supervisor-side resolution
      (uphold/overturn) is still real and tested, not just the trigger.
- [x] **Minimum-sample suppression** (`SUP-06`/`SUP-10`, `AC-14`) —
      `AgentScorecards` shows "Insufficient sample" below 30 eligible
      conversations, never a rank. `YOU`'s row uses the *real* resolved-
      conversation count from live state rather than a static illustrative
      number — in a fresh session that's genuinely below the floor, so
      "Insufficient sample" showing for the one real agent isn't a
      placeholder standing in for a number, it's the actually-correct
      answer today.
- [x] **KPI drill-down** (`SUP-03`) — done for the two cards that have a
      genuine live equivalent, left alone for the ones that don't.
      `ConversationVolumeChart`'s line, `ChannelMixChart`'s arcs, and
      `HourlyActivityChart`'s bars are still exactly the decorative,
      Figma-fidelity numbers they always were (see README) — there is no
      real mapping from one point on that line to a specific conversation,
      so a "drill to real data" link on top of it would still be
      fabricated, not fixed. Two places actually do have a real conversation
      behind the number, so those got wired instead:
      <br>· **`StatsRow`'s "Paid, Not Ticketed (open)"** card was a static
      `"0"` — factually wrong, since Tanvir Rahman's seeded P0 conversation
      is exactly that scenario (`escalationReason: "Paid, not ticketed"`,
      the same §D2 alarm `SLA_MINUTES` already cites). It now reads a real
      `paidNotTicketedOpen()` selector, and a "View {name}'s ticket" link
      appears only when the count is actually above zero — selecting the
      conversation in the shared `InboxContext` before navigating so
      `/inbox` opens with it already selected, not just scrolled-to.
      <br>· **`ChannelPerformance`** rows keep their illustrative
      share/revenue/chats figures (real per-channel history this app
      doesn't have) but each row's dead `href="#"` "Details" is replaced
      with a real "View N open on {channel} →" link, N being an actual live
      count over `state.conversations`. Clicking it sets a one-shot
      `channelFilterIntent` in the shared inbox state and navigates;
      `/inbox` consumes it via a lazy `useState` initializer on mount (no
      `setState`-in-effect) and immediately clears it so a later, unrelated
      visit — e.g. the sidebar's plain "Inbox" link — isn't silently stuck
      on a stale filter.
      <br>Verified end-to-end: the live count matches the one seeded alarm
      conversation, its link lands on `/inbox` with that exact ticket
      selected; a channel drill-down lands with that channel's tab already
      active; and a normal sidebar visit to `/inbox` afterward correctly
      shows "All Conversations" again rather than inheriting the last
      drill-down's filter.

- [x] **Filter the dashboards (`SUP-02`).** A `SupervisorFilterProvider`
      holds one filter for the whole page and every panel that derives from
      conversations reads the filtered set from it — Live Queue counts and
      waiting list, QA sampling, and the Paid-Not-Ticketed alarm. Six of the
      PRD's nine dimensions are real: channel, priority, language, intent,
      resolution and a relative date range. Options are built from the data
      present, so the bar never offers a value that returns nothing.
      <br>**Team/queue and agent are deliberately absent, not forgotten.**
      Conversations do not carry a queue (queues exist in tenant config with
      weights and concurrency, but nothing assigns a conversation to one),
      and there is one agent in the prototype. Both need the conversation
      model extended first; the reasoning is in `SupervisorFilters.tsx`.
      <br>The four Historical Performance charts are fixed geometry read off
      the design frame, not aggregates, so they *cannot* respond to a
      filter. Rather than show unfiltered numbers beside filtered ones as if
      both were live, the illustrative stat cards swap their trend line for
      "Illustrative — not filtered" and the chart section carries a notice —
      the misleading version would have been the easier one to build.
      <br>Lint caught a real bug here: `Date.now()` inside the provider's
      `useMemo` is an impure render call, so the relative date range now
      ticks off the shared `useNow`.
- [x] **Export reports (`SUP-08`).** "Export report" replaces the inert
      "Current Month" control. Requesting one does **not** download on click:
      it creates a job that spends time preparing and only then becomes
      downloadable, because an export of any real size is a job and a UI
      that pretends otherwise teaches the wrong expectation. Each job shows
      requester, the filter it was taken under, row count and a 24-hour
      expiry, and writes into the existing tenant audit trail via a new
      `RECORD_AUDIT` action rather than starting a second one (`ADM-07`).
      <br>The CSV is genuinely redacted — email, phone and payment reference
      all go through the same `maskPii` the workspace uses, so an export can
      never become the way around `AG-06`. It downloads as a real Blob.
      <br>PDF is offered and recorded but not rendered: producing one is
      server-side work, and the button says so rather than silently
      producing a CSV with a different extension. Verified end to end,
      including that the audit record survives client-side navigation to
      `/admin` — a full page load resets the shared provider, which is a
      property of the prototype's in-memory state, not of the export.

- [x] **Version KPI definitions (`SUP-07`).** A "KPI Definitions" panel on
      `/dashboard` holds the four metric definitions as editable text under a
      version number, and the Historical Performance heading states which
      version its figures were computed under.
      <br>The requirement is really about one failure mode: someone changes
      how a number is computed, every historical figure silently shifts, and
      nobody can tell whether last quarter got better or the formula did. So
      publishing and backfilling are deliberately decoupled — publishing
      advances `current` and **does not touch history**, and the publish
      dialog says so before you commit. While `historyComputedUnder` trails
      `current` the panel carries an amber warning that comparing across that
      boundary compares definitions, not performance. History moves only when
      a backfill runs, and a backfill will not start without a label.
      <br>Both actions write into the tenant audit trail (`ADM-07`) with the
      note or label attached. The backfill is asynchronous, and testing
      caught that its running state was only visible inside a collapsed
      disclosure — it now announces itself in the panel body, where someone
      would actually see it while figures are mid-restatement. All twenty
      checks pass, including that history stays on v1 across a v2 publish and
      moves only once the backfill completes.

- [x] **Threshold alerts and drill-down (`SUP-04`, `SUP-03`).** An Alerts
      panel computes five signals from live state: SLA breach and near-breach,
      no eligible agent for waiting work, queue surge, escalation spike, and
      **channel failure** — the last of which only became computable once
      `INB-09` gave messages a real terminal failure to count. It is derived,
      not simulated.
      <br>Thresholds live in tenant config (`alerts.*`), because the PRD says
      "crosses its configured threshold" and a number baked into the dashboard
      is not one. They flow through the same validate → diff → approve →
      version → audit path as everything else, and each alert states the
      threshold it crossed.
      <br>For `SUP-03`, every alert and every Live Queue stat links to the
      conversations behind it, using the same one-shot view handover the
      channel drill-down already used. An alert you cannot act on is a
      notification. The drill-down is now real for six stats and five alerts
      rather than the single card it covered before.
      <br>Verified by pushing the queue over the surge threshold rather than
      asserting against whatever the seed happened to be — a threshold test
      that passes without crossing the threshold proves nothing.

- [x] **Complete the admin audit record (`ADM-07`).** Entries carried actor,
      action, detail and time; the requirement asks for role, tenant,
      before/after, reason, approver, IP/session and effective time. Role is
      resolved from the config *at the time of the action* rather than
      whatever the person holds later, approver is recorded on the
      maker-checker entries that actually had one, and a scheduled change
      records the time it takes effect, which is not the time it was
      requested. `SESSION_ID` stands in for the IP/session pair a server
      would hold — the closest a client can honestly get, and enough to tell
      two sessions apart.
      <br>The seeded "Initialized" entry rendered as `System (—)`, which is
      exactly the incompleteness this requirement is about; it now carries a
      role like every other entry.

**Caught by testing, not by reading the code:** `WorkspaceEffects`'s
one-time incoming-offer timer originally had a `useRef` guard meant to stop
it re-arming every time `/inbox` remounted. It actively broke the timer
instead — React Strict Mode's dev-time double-invoke sets the guard `true`
on the discarded first pass, so the real pass that stays mounted sees the
guard already tripped and never schedules anything. The offer simply never
arrived. The guard wasn't needed at all once the timer lived at the
layout level (which only mounts once per session already) — removed
rather than patched.

## P2 — Tenant administration (net-new surface)

**Built.** Nothing under `/inbox` or `/dashboard` let anyone configure the
tenant before this pass — `/onboarding` only ever captured the admin's own
name/contact. §E7 describes six configuration domains plus a publish flow;
all six now have a real screen at `/admin`, backed by
`src/components/admin/tenantConfigEngine.ts` — the same `useReducer`
discipline as `widget/engine.ts` and `inboxEngine.ts`, extended with a
draft/published/version/approval lifecycle those two didn't need. Generic
dot-path `get`/`set` helpers (`FieldPath`) read and write the whole config
tree from one `edit(path, value)` call per field, with two synthetic paths
(`brand.channels.<id>.enabled`, `commercial.paymentRails.<id>.enabled`)
special-cased for array-by-id addressing. `TenantConfigProvider` mounts
alongside `InboxProvider` in the `(workspace)` route group's shared layout,
so — like the P2 supervisor work above — `/admin` isn't a simulation of its
own; it's reading and writing the same state `/inbox` and `/dashboard` see.

- [x] **Brand & channels.** Brand name, business hours, and a per-channel
      (Website/WhatsApp/Messenger) kill switch. Real, not decorative: turning
      a channel off here disables and labels `(off)` that channel's tab in
      `/inbox`'s `TicketFilterBar` — confirmed by toggling WhatsApp off on
      `/admin`, publishing, then navigating to `/inbox` via an actual
      `<Link>` click and reading the disabled tab there.
- [x] **Queues & people.** Base weight and max concurrency are real, editable,
      versioned/audited fields per queue (`queues.queues.<id>.baseWeight`/
      `.maxConcurrency`, synthetic array-by-id paths matching the channel/
      payment-rail pattern), plus the surge-roster toggle. Max concurrency is
      the one wired to a real constraint: `totalMaxConcurrency()` sums it
      across queues into the one live agent's total simultaneous-assignment
      cap, enforced in `OfferBanner`, `ChatPanel`'s `StatusAction`, and
      `NoEligibleAgentNotice` — the same "no eligible agent" banner RT-07
      already uses for an ineligible agent state now also fires when the
      agent is Available/Busy but simply full, with its own explanation
      rather than a reused, misleading one. Base weight stays honestly
      unwired: it's meant to prioritize one queue over another when routing,
      and there's nothing to route *between* with a single real agent, so
      editing it is real but has no second effect to point to, same
      rationale as the SLA targets below.
      <br>Verified live: lowering both queues to the minimum valid total
      cap (validation now rejects a max concurrency below 1) and then
      accepting conversations up to that cap correctly disables further
      Accept buttons app-wide with a cap-specific message, not the generic
      agent-state one.
- [x] **AI & knowledge.** Confidence-band thresholds (High/Guarded/Clarify),
      a knowledge-corpus version string, and the AI kill switch — the one
      that actually matters. Turning it on reaches `/inbox`'s `ChatPanel`
      two ways: a tenant-wide coral banner, and the AI Reply button itself
      going `disabled`, verified live rather than assumed from the wiring.
- [x] **SLA & priority.** First-response and resolution-time targets per
      P0–P3 band, plus a reopen window. Deliberately **not** wired to
      `/inbox`'s live SLA badges (`RT-04`'s real 5-minute P0 figure is
      hardcoded there, per the P1 section above) — labelled in the section
      hint rather than implied to be live, since faking that connection
      would be worse than leaving it inert.
- [x] **Security & retention.** MFA-required and PII-reveal-requires-reason
      toggles, a data-residency selector, and per-data-class retention days
      (transcripts / identity docs / payment refs) — the last of these is
      where the maker-checker "decreasing retention needs approval" rule
      lives (shortening a retention window is the risk-expanding direction,
      since it's the one a bad actor benefits from).
- [x] **Commercial controls.** Per-rail (bKash/Nagad/Card) payment toggles,
      a refund ceiling, and a monthly AI/ops budget. This is the domain
      §E7 flags hardest for sign-off, so it carries two of the four
      sensitivity rules: enabling a new payment rail, and *raising* the
      refund ceiling (lowering it is safe/direct — it's more conservative).
- [x] **Publish flow** (`ADM-04`). `PublishReviewModal` — a diff list against
      the currently published config, a "Needs approval" badge per sensitive
      field, inline validation errors (e.g. a negative monthly budget) that
      disable Publish outright, and a required publish note. Any change that
      isn't itself sensitive still applies immediately and bumps the version;
      a sensitive change opens a `PendingApproval` instead and the button
      relabels to "Publish & request approval." `ApprovalsAndHistory` covers
      the rest of the loop: approve (as a second, named approver) or reject
      with a required reason, a version history list with a "Roll back"
      button per prior version (rollback is its own new version, not a
      silent rewrite of history), and a reverse-chronological audit log.
      **Scoped down from the full `ADM-04` wording:** "preview affected
      queues/channels" is covered by the diff list itself (every changed
      field names what it affects), not a separate simulated-impact view.
- [x] **Scheduled activation** (`ADM-04`). A batch of changes with nothing
      sensitive in it can be scheduled for a future time instead of applying
      immediately — `PublishReviewModal` gets a "Now" / "Schedule for later"
      choice (disabled to "Now" only, with an explanation, whenever the
      batch includes a sensitive field, so scheduling and maker-checker
      never have to be reasoned about together) and a datetime picker.
      `TenantConfigEffects.tsx` is the watchdog that actually applies it —
      the same fix as `WorkspaceEffects` for offer/snooze deadlines,
      mounted once at the shared layout so it fires regardless of which
      page is open, checking every 2s rather than depending on the config
      screen happening to be mounted at the right moment. A new "Scheduled
      Changes" panel in `ApprovalsAndHistory` lists what's pending with a
      "Cancel" button, and the diff engine tags an already-scheduled field
      distinctly (`scheduledFor`, mirroring how `alreadyPending` already
      prevented duplicate approval requests) so re-opening the publish
      review shows "Scheduled for {time}" instead of treating it as a new,
      re-publishable diff, and the header's "N unsaved changes" count
      excludes it — it's a committed request waiting to happen, not an
      in-progress edit.
      <br>**Fixed along the way:** `DISCARD_DRAFT` previously reset the
      draft straight to `published`, which would have silently reverted a
      still-pending approval *or* a still-pending schedule's visible target
      value in the form the moment the admin discarded an unrelated edit,
      even though the underlying request would still fire later — the
      display and the eventual reality would have disagreed. Generalized
      the existing `published_with_pending` helper into `projectedDraft`,
      layering both pending approvals and pending schedules onto
      `published`, and used it everywhere the draft gets rebuilt (discard,
      publish, approve, reject), not just where scheduling needed it.
      <br>Verified end-to-end with Playwright's clock API: scheduling a
      non-sensitive change removes it from the "unsaved changes" count and
      lists it under Scheduled Changes; a batch containing a sensitive
      field can't be scheduled (the option is visibly disabled); and
      fast-forwarding past the scheduled time applies it automatically,
      clears it from the panel, bumps the version, and appends both a
      "Scheduled" and a "Scheduled change applied" audit entry — confirmed
      by reading the rendered Version History and Audit log, not just
      dispatching the action.

**Maker-checker, without inventing real multi-user auth.** Two named
personas already established elsewhere in the app carry the requester/
approver split: `YOU = "Rifat Karim"` requests, `SECOND_APPROVER =
"Nabila K."` approves — the same Nabila K. already used as a transfer
destination and a below-sample agent in the P1 work, rather than a new name
invented just for this screen. `isSensitiveChange(path, before, after)` is
the single source of truth for which of the four rules apply, and it's
directional in every case — only the risk-expanding edge of a change is
gated (refund ceiling *up*, AI kill-switch turning *off* re-enabling AI,
retention days *decreasing*, a payment rail being *enabled*); the safe
direction of the same field always publishes immediately.

**Caught by tracing the engine carefully before any test ran, not by
testing:**
- `sla.targets.*`'s eight sub-paths (`P0`–`P3` × first-response/resolution)
  were missing from the diff engine's tracked path list — editing them would
  have silently never appeared in a diff or published, a broken field that
  looked like it worked.
- `labelFor()` had an off-by-one index into those same `sla.targets.*`
  paths, so any diff/approval/audit entry touching an SLA target would have
  displayed the wrong label.
- Clicking Publish twice in a row while a sensitive change was already
  pending created a second, duplicate approval request for the same field —
  fixed by filtering out paths that already have a pending approval before
  building the new batch.
- `APPROVE`/`REJECT` originally reset the working draft straight back to
  the newly-published config, which silently dropped visibility of any
  *other* still-pending approval on a different field — fixed by rebuilding
  the draft from the published config plus whatever's still actually
  pending, instead of assuming the draft and the published config are the
  same thing the moment one approval resolves.

- [x] **Integration secrets (`ADM-05`).** An "Integrations & Secrets"
      section lists the four credentials with a last-four preview only.
      <br>**Shown once** means shown once: a generated value lives in the
      reveal dialog's own state and is dropped when it closes — no store, no
      prop, nothing retains it, which is why the list can only ever render
      `••••••••9f2c`. Verified by capturing the 40-character value from the
      dialog and asserting it appears nowhere on the page afterwards.
      <br>**Rotation is two steps, not one.** Issuing a new key leaves the
      old one accepted so in-flight requests signed with it keep working; the
      old key is revoked only when the operator confirms the new one is
      deployed. A single "Rotate" button would be a small lie about how key
      rotation works.
      <br>**Never in exports or logs** — the audit records that a rotation
      happened and by whom, never the value, and the CSV export has a fixed
      column list with no credential field. Asserted directly: the secret is
      not in the audit trail.
- [x] **Sandbox / test mode (`ADM-06`).** `brand.sandboxMode` is real tenant
      config, so it flows through the existing validate → diff → approve →
      version → audit path like anything else. Turning it **off** is the
      change that needs a second approver, not turning it on — that is the
      direction that restores real customers and real money; entering sandbox
      only ever shrinks the blast radius.
      <br>A test mode nobody can see is worse than none, so it reaches every
      surface it governs rather than sitting in a settings page: a banner on
      `/inbox`, `/dashboard` and `/admin`; agent replies audited as "(sandbox
      — not delivered)"; booking actions carrying "No ticket is issued and no
      money moves" in the confirmation and "(sandbox — simulated)" in the
      transcript. All thirteen checks pass, including that the banner follows
      across client-side navigation.
- [x] **Tenant export and deletion (`ADM-08`).** Pick a data class —
      transcripts, identity documents or payment references — and the scope is
      computed and displayed *first*: in scope, withheld under legal hold,
      retained under the financial-ledger exception. "Before execution" is the
      whole requirement: a tool that reports afterwards which records it could
      not touch has already told the requester the wrong thing, and one that
      silently skips them leaves an operator believing data is gone when it is
      not. The confirm button carries the real number — "Delete 1 record(s)",
      not "Delete".
      <br>Both exceptions are modelled from the PRD's own list and both are
      reachable, not theoretical: a seeded conversation now carries a
      "Dispute" tag so it is genuinely under legal hold, and payment
      references collide with the ledger while transcripts do not — verified
      by switching scope and watching 3/1/0 become 1/1/2 with the total
      preserved. Requests run asynchronously and are audited with the same
      three numbers.

**Verified end-to-end** across two full Playwright runs covering both
directions of every sensitivity rule (including confirming `/inbox` still
shows AI-disabled *before* an approval lands and stops showing it only
*after*), validation blocking publish on a negative budget, a full
reject-reverts-the-draft round trip, and a rollback that restores an old
version's full config and appends its own audit/version entry rather than
rewriting history — zero console or page errors across both.

- [x] **Roles &amp; access** (`ADM-02`, plus `ADM-03`'s break-glass). A real
      role editor lives in the Security & Retention card (`RolesAndAccess.tsx`)
      — three seeded roles (Tenant Admin, Supervisor, Agent), each with a
      `privileged` flag that's the actual gate on `ApprovalsAndHistory`'s
      "Approve as {name}" button (`canApproveSensitiveChanges`), not a label
      with nothing behind it. Custom role composition is real: add a role,
      mark/unmark it privileged, remove one (blocked while anyone still
      holds it), and reassign any of the app's known people
      (`YOU`/`AGENT_ROSTER`) to a different role. Break-glass access is a
      genuine, time-limited override in the same panel — grant a person
      temporary privileged status for 30/60/120 minutes with a required
      reason, fully audited, auto-expiring via `TenantConfigEffects.tsx`
      (the same watchdog pattern as scheduled activation, now covering two
      deadlines instead of one) rather than needing anyone to remember to
      revoke it.
      <br>**Deliberately scoped down, not silently faked:** role and
      break-glass changes are immediate and audited, not routed through the
      draft/version/publish/approval lifecycle every other config domain
      here uses — the diff engine's `DIFF_PATHS` is a fixed list of known
      scalar paths and doesn't generalize to array insert/remove (adding or
      removing a whole role) without a meaningfully larger rework, which
      felt like more machinery than this gap warranted. A real system would
      very plausibly want role changes maker-checker-gated too; this one
      doesn't. "MFA required for privileged roles" still can't be enforced
      for real — there's no login flow in this app for MFA to gate — but it
      no longer refers to a roles concept that doesn't exist.
      <br>Verified end-to-end: unmarking the current approver's role as
      privileged correctly disables their "Approve" button; granting them
      break-glass access re-enables it with a live countdown; approving a
      real sensitive change (a refund-ceiling increase) under that grant
      succeeds; and fast-forwarding past the grant's expiry (Playwright's
      clock API) auto-revokes it and appends an audit entry, without
      anyone clicking Revoke.

## Cross-cutting, do alongside the above rather than as a separate pass

- [x] **Shared mock-data layer.** The trigger condition had been reached, so
      `src/lib/people.ts` now owns the identities: `YOU` was declared twice
      (`inboxEngine` *and* `tenantConfigEngine`), and "Nabila K." existed
      three times — second approver, roster row, and a hand-typed transfer
      destination. `RolesAndAccess` was already importing the same people
      from two different modules to build one list, which is where two
      copies stop being harmless. Both engines import and re-export, so the
      twenty-odd existing call sites are unchanged.
      <br>Scoped to what had actually started to drift. Conversations,
      tenant config and chart geometry stay where they are: each already
      lives in exactly one module, and sweeping them into a shared bag would
      trade a real boundary for a junk drawer. The one remaining literal
      "Rifat Karim" is `SignUp`'s form pre-fill, left alone deliberately —
      "what a new user types" is not the same concept as "the signed-in
      agent", and coupling them would be wrong rather than tidy.
- [x] **Accessibility (`NFR-11`, `AG-12`).** Audited mechanically against
      the rendered pages rather than by reading the code — accessible names,
      input labels, alt text, heading order, duplicate ids, positive
      tabindex, and computed text contrast — then fixed until `/inbox`,
      `/dashboard` and `/admin` all report **zero findings**. Names, alt
      text, ids and tabindex were already clean; everything found was
      contrast, headings or labels.
      <br>**Contrast (1.4.3).** `--color-ink-dim` was 4.38:1 on the panel —
      just under the 4.5:1 floor — so it moved to `#ababab`, and the three
      places still hard-coding the old `#8f8f8f` now use the token. P0/P1
      status colours were lightened for small text. Two spots needed the
      *background* rethought rather than the text: white on coral measured
      2.99:1, so the active view pill and the unread badge take dark text
      instead — a deliberate deviation from the frame, which sets white
      there. The agent-state pill sits on white while its menu sits on dark,
      and no single hue passes on both, so each state carries two colours.
      A new `--color-coral-text` tint exists for small coral text; the brand
      coral stays as-is for large text and graphics, where 3:1 applies.
      <br>**Headings (1.3.1).** `/dashboard` and `/admin` jumped h1 → h3;
      the section headings are h2 now.
      <br>**Labels (3.3.2).** Ten inputs had none — the eight SLA-target
      cells laid out bare in a grid, plus two in Roles & Access.
      <br>**Focus (2.4.7 / 2.4.11).** Several controls set
      `focus:outline-none` and leaned on a border tint. There is now one
      `:focus-visible` ring for everything focusable, at zero specificity via
      `:where()` so components can still override it. Verified by tabbing
      through `/inbox` with **real key events** over CDP, not
      `element.focus()`: 28 stops, all in a sensible order, every one showing
      a ring. Dialogs were separately confirmed to take focus on open, carry
      `aria-modal` with a real label, and close on Escape.
      <br>**Not covered:** no screen-reader pass (NVDA/JAWS/VoiceOver), and
      the marketing pages were not audited — only the three internal
      surfaces the PRD gates on.
- [x] **Make the workspace usable at 768px (`NFR-12`).** The three panes
      are fluid now instead of `w-[412px]`/`w-[828px]`/`w-[392px]` all
      `shrink-0`, and the layout collapses in two stages rather than one:
      below `xl` the details pane becomes an overlay reached by a "Details"
      button; below `lg` the list and the conversation take turns, with row
      selection opening the conversation and a back control returning to the
      list. Above `xl` nothing changes — all three columns, and both
      affordances hidden.
      <br>Verified at 1600 / 1280 / 1024 / 768: no horizontal overflow at any
      of them (`scrollWidth` equals `innerWidth` exactly), the list→conversation
      →back cycle works at 768, the details overlay opens and closes, and the
      "Details" toggle is correctly hidden once the column itself is visible.
- [x] **Bangla application chrome (`NFR-15`).** `UiLocale.tsx` adds an
      EN/বাংলা toggle in the workspace header, sets `document.lang`, and
      remembers the choice. English strings are the dictionary keys, so a
      string with no Bangla yet renders in English rather than as an
      identifier — an untranslated screen degrades instead of breaking.
      <br>**Scope, deliberately:** the agent workspace (`/inbox`) is
      translated, because that is the P0 workflow the PRD gates on.
      `/dashboard` and `/admin` stay English until their strings are
      reviewed — a consistent English screen beats a half-Bangla one. The
      first pass left exactly that half-and-half state inside `/inbox`
      itself (ticket-row statuses, the lease banner, booking-action labels
      and SLA badges still English beside translated headings), so those
      were finished too. What remains English there is *data*, not chrome:
      customer names, PNRs, seeded summaries and booking states.
      <br>Two things fell out of doing this properly. `slaBadge` used to
      return a finished English sentence; it now returns `{kind, amount,
      unit}` and the wording lives in one shared `formatSlaBadge`, so the
      engine is language-free and the two consumers cannot drift. And the
      locale is read through `useSyncExternalStore` rather than copied out
      of `localStorage` by a mount effect — lint correctly flagged that as a
      cascading render, and the external-store form also keeps SSR and the
      first client render in agreement.
      <br>**Every Bangla string is AI-drafted and unreviewed**, the same
      standing caveat the widget's Bangla carries. This is a working i18n
      layer with draft content in it, not finished copy — it still needs a
      native speaker.
- [x] **Wire or remove the inert controls.** All four are now real.
      <br>**Attach file / attach image** open genuine file pickers and send an
      attachment, which also moves `INB-05` along: `TranscriptMsg` carries an
      optional `Attachment`, an image renders as an image and anything else
      as a file card with name and size — that card doubling as the
      documented fallback for a type we cannot preview. Sending one writes
      "Agent sent file — *name*" to the activity history, and both buttons
      disable with free typing when the channel window is shut (`INB-12`),
      since an attachment is a free-form send.
      <br>**Emoji** opens a twelve-emoji picker that inserts at the composer
      and returns focus there.
      <br>**`AdminHeader`'s search** hands its query to the one search that
      exists (`INB-07`) and follows it to `/inbox`, reusing the same one-shot
      intent handover `channelFilterIntent` already used for the supervisor's
      channel drill-down — rather than growing a second, differently-behaved
      search over the same conversations. Verified: typing a PNR in the
      supervisor header lands on `/inbox` with the box pre-filled and the
      list already narrowed to one row.
      <br>**"Current Month"** is gone, replaced by the real export flow above.
- [ ] **Remaining branded assets.** *Blocked on assets, not on code — this
      is the one item on this list that cannot be implemented here.* Real
      screenshots/photography are still needed for `hero-dashboard`,
      `solution-card`, the five `feature-*` mockups, and all four `case-*`
      images, which show invented store brands (OneMart, Vapor World,
      Mati-ta, viora) next to copy about Bangladeshi air travel. Already
      tracked in `README.md` → "Takeoff Travels adaptation".
      <br>The `Ecommerce` cards came off this list by being redrawn in code,
      but that worked only because they were flat gradient posters. These are
      photographic: the options are real photography, licensed stock that
      actually depicts Bangladeshi air travel, or dropping the images and
      redesigning those sections around type — a decision to make, not a
      change to write.
- [x] **Widget reach.** `<ChatWidget />` is now mounted on `/`, `/sign-in`,
      `/sign-up` and `/onboarding` (each wrapped in its own
      `ChatWidgetProvider` — no lifting to the root layout, since `/inbox`
      and `/dashboard` are internal tools a customer widget has no business
      appearing on). The floating launcher alone turned out to be a
      sufficient entry point — no contextual "open chat" button was needed
      on the auth/onboarding pages, matching how every real chat-widget
      product actually works. Verified per-route: launcher present on all
      four customer-facing pages, absent on both internal ones, and a full
      FAQ round-trip (with its citation) works from `/sign-up` and
      `/onboarding`, not just `/`.
      <br>Same pass fixed a real, unrelated bug found while touching these
      files: every route's own `metadata` export still overrode the root
      layout with a stale "— NexChat"/"— NextChat" browser-tab title,
      including on `/inbox` and `/dashboard`, which had never been touched
      by the earlier rebrand pass. All five are now correct.

---

Everything above is a frontend surface or interaction state, not a backend
integration — no item here requires a real aggregator, payment gateway, or
model call to implement meaningfully with mock data, consistent with how
`/inbox` and `/dashboard` are already built.

---

## Known gaps / deviations

Carried over as a standing list so it survives between sessions. Status is as
of the pass that converted the raster assets, built the mobile nav, made the
case-study stack and carousels real, and replaced the ecommerce images.

| Area | Status |
|------|--------|
| Raster assets | **Done.** Originals moved to `assets-src/figma/`; `npm run optimize:images` writes the shipped WebP into `public/figma/` (34 MB → 1.2 MB). `next/image` serves AVIF where accepted (`images.formats` in `next.config.ts`). |
| Ecommerce section | **Done.** The four PNGs baked in "NexChat"/"OneMart"; the cards are drawn in code now (CSS gradients + the shared `Logo`), and the section is back in `src/app/page.tsx`. |
| Mobile nav | **Done.** Hamburger below `lg` opening a sheet under the header — nav links, the CTA that hides below `sm`, Escape/backdrop dismiss, scroll lock. Invented, not from a frame. |
| Case study stack | **Done.** Cards pin 24px apart from `lg` up (plain list below, where a card is taller than the viewport). Needed `overflow-x: clip` instead of `hidden` on `body` and on the section — `hidden` makes a scroll container and silently kills `position: sticky`. |
| Carousels | **Done for the two that are carousels.** `Features` snaps, autoplays (5s, pauses on hover/focus/hidden tab, off under `prefers-reduced-motion`) and has pips + arrows; `Solution`'s pips now drive three real slides. `Pricing` is left alone — it is a comparison table that scrolls, not a carousel. |
| **Case-study imagery** | **Open, and the same defect the ecommerce images had.** All four `case-*.png` are generic 3D logo-mockup stock showing invented brands — OneMart, Vapor World, Mati-ta, viora — sitting directly beside copy about Bangladeshi air travel. `feature-*`, `hero-dashboard` and `solution-card` likewise still show "NextChat"/"NectChat" UI and unrelated stock. Unlike the ecommerce cards these are photographic, so there is no code-drawn substitute — they need real photography or a decision to drop them. |
| Bangla translations | Open. AI-drafted, no native-speaker review (§E4). |
| Real NLU | Open. Fixed vocabulary parser only; falls back to clarify chips. |
| Onboarding step 2 | Open. Not built — no "Package" frame was provided. |
| Solution slides 2–3 | New. Copy for the second and third carousel slides is written from pillars stated elsewhere on the page (unified queue, deterministic money path), not taken from the frame. Needs the same sign-off as any other marketing copy. |

---

## PRD requirement coverage (frontend)

Every numbered requirement in `us-bangla-ota-chatbot-overview_v2.html` (77 IDs
across INB/AI/RT/AG/SUP/ADM/NFR), audited against the code on 31 Aug 2026.
This is a traceability record, not a plan — the items worth acting on are
listed at the end and belong in the sections above.

Status is about **this frontend**, so a requirement is judged only on the part
of it a browser can honour:

- **Built** — the behaviour exists and is driven by state, not mocked chrome.
- **Partial** — some of the requirement is real; the gap is named in the row.
- **Not built** — no UI surface exists for it.
- **Backend** — nothing to build here. Webhook acceptance, idempotency,
  encryption, event delivery and recovery targets are platform properties a
  prototype cannot demonstrate or fake honestly.

**20 Backend · 22 Built · 24 Partial · 11 Not built** — that is 22 of the 57
requirements with a real frontend surface fully met.

**Updated after the implementation passes below: 20 Backend · 49 Built ·
8 Partial · 0 Not built** — 49 of 57, up from 22. **Nothing with a frontend
surface is unbuilt any more.** The 21 that remain partial are partial for
stated reasons, not for want of attention: most need either a backend
(`AI-01`'s real multi-intent parsing, `AI-07`'s calibration), a data-model
extension (`SUP-02`'s team/queue and agent filters, `RT-10`'s candidate
count and effective weights), or a human (`NFR-15`'s Bangla review,
`NFR-11`/`AG-12`'s screen-reader pass). Each row says which.

### Unified inbox and conversation lifecycle (INB)

| ID | Requirement | Status |
|----|-------------|--------|
| INB-01 | Signed inbound webhooks, async processing | **Backend** |
| INB-02 | One normalised message envelope | **Backend.** The transcript models `from`/`text`/`time` only — no delivery state, media type or reply reference to render. |
| INB-03 | Deduplicate webhook retries, idempotent effects | **Backend** |
| INB-04 | Preserve per-channel order, flag late events | **Backend.** No late/out-of-order marker in the transcript either. |
| INB-05 | Render text, choices, files, images, ticket PDFs, locations, reactions | **Built.** Text, structured choices, images, files (the file card doubling as the fallback for un-previewable types), shared locations and channel reactions. |
| INB-06 | Inbox views: unassigned, mine, team queues, SLA risk, priority incidents, waiting customer, snoozed, recently resolved | **Built.** The eight views the PRD names plus All, each a predicate in `matchesView`, with live counts. |
| INB-07 | Search by handle, phone/email, PNR, ticket no., payment ref, conversation ID, tag, assignee, date range | **Built.** Free-text across name/phone/email/PNR/route/id/payment ref/tags, plus `pnr: tag: assignee: channel: status: since: until:` prefixes for the rest, including the date range. |
| INB-08 | Tags, internal notes, @mentions, attachments, saved replies, resolution codes, snooze-until, follow-up tasks | **Built.** All eight items present. A note is its own entry kind with no `delivery`, so internal content has no path to a channel; mentions match the real roster; follow-ups carry an owner and a due time. |
| INB-09 | Send states queued/sent/delivered/read/failed, bounded retry, visible terminal failure | **Built.** Per-channel delivery ladder, a real success rule tied to channel enablement, retry bounded at three attempts, and a terminal failure that is visible to the operator and in the audit trail. |
| INB-10 | Immutable event history for every material change | **Built.** Every reducer action appends an `ActivityEntry`; rendered in `DetailsPanel.tsx`. |
| INB-11 | Ownership lease prevents concurrent replies; typing/presence; audited supervisor override | **Built.** Ownership lease, audited supervisor override, and per-conversation presence showing who else is on a thread. |
| INB-12 | Apply channel messaging window, opt-in and template rules before send; offer an approved alternative channel | **Built.** `channelSendPolicy` gates the composer on each channel’s reply window, opt-in and template rules, and names an alternative channel when one is genuinely available. |

### Governed AI agent (AI)

| ID | Requirement | Status |
|----|-------------|--------|
| AI-01 | Detect multi-intent, preserve unresolved intents | **Partial.** `intentTrail` is modelled and displayed per conversation, but the widget parser resolves one intent at a time and falls back to clarify chips. |
| AI-02 | Reply in the customer's readable form, keep canonical English for airline APIs | **Built.** `detectLocale` (en / bn / banglish) drives replies; city codes stay canonical. |
| AI-03 | Retrieve only from approved, effective-dated knowledge; attach source ID/version | **Built.** Every FAQ answer carries and displays its source, e.g. "Fare Rules v3 · reviewed 12 Aug 2026". |
| AI-04 | Typed tool schemas, allowlists, server-side policy checks | **Backend** |
| AI-05 | Structured state summary after each material turn, regenerated before handoff | **Built.** The handoff package is assembled in `groupHandoff` and surfaces as `summary` + `escalationReason`. |
| AI-06 | Stop AI outbound while a human lease is active | **Built.** AI goes silent on accept and resumes only on explicit "Release to AI". |
| AI-07 | Calibrate confidence per intent/language/channel; review after drift | **Partial.** The bands are now load-bearing: `confidenceBand()` in `tenantConfigEngine.ts` is the single definition, `DetailsPanel` names and colours every intent score through the published thresholds, and only a draft in the **High** band keeps its "Send as-is" button — publish a higher bar and the same conversation loses it (`ai07-confidence-bands`). What is still missing is the calibration itself: bands are one global triple, not per intent/language/channel, and there is no drift review, because that needs reviewed-outcome data the prototype has no source for. |
| AI-08 | Log model/version, prompts, sources, tool calls, decision band | **Backend** |
| AI-09 | Global and tenant-level kill switch | **Partial.** `ai.killSwitch` is a real, approvable config field, and flipping it does reach `/inbox`: a banner appears on every conversation and AI Reply is disabled with the reason in its tooltip. It does not *reroute* anything, and that is architectural rather than unfinished — `routing.ts` has no AI branch to divert (it selects among humans on queue, skill, language, channel, availability and capacity), and the bot itself lives in the marketing widget, outside `TenantConfigProvider`. Rerouting would mean giving routing an AI-eligibility step and lifting the provider to the root layout. |
| AI-10 | Evaluate releases against held-out and production samples | **Backend** |

### Escalation, queues and routing (RT)

| ID | Requirement | Status |
|----|-------------|--------|
| RT-01 | Route by tenant, queue, skill, language, channel permission, availability, concurrency, then weights | **Built.** `routeConversation` applies queue, skill, language, channel permission, availability and remaining concurrency in that order, then weights — deterministically, by base weight scaled by remaining capacity. |
| RT-02 | Atomic assignment lock and idempotency key | **Backend** |
| RT-03 | Configured base weight and max concurrency per agent, versioned and audited | **Built.** Queue base weight and max concurrency are editable, versioned and audited — and now actually consumed by `routeConversation` rather than only stored. |
| RT-04 | 30-second offer; reject/timeout/disconnect returns to queue without resetting SLA age | **Built.** `OFFER_SECONDS = 30`, with `queuedSince` deliberately preserved across decline, timeout, transfer and release. |
| RT-05 | Prefer the previous eligible agent on reopen or same active PNR | **Built.** `routeReopen` prefers the previous owner, yields when a higher-priority conversation is inside its breach window, and records which way it went. |
| RT-06 | Age queued work continuously; priority upgrades audit and keep arrival time | **Built.** |
| RT-07 | No eligible agent: tell the customer, hold their place, alert the supervisor, retry on agent-state change | **Built.** `NoEligibleAgentNotice.tsx`, with the retry firing on agent-state change. |
| RT-08 | Supervisors may assign, reassign, reprioritise or pin, with a reason | **Built.** Assign, reassign, reprioritise and pin, all behind the same mandatory reason. A pin outranks priority within the open group without crossing groups. |
| RT-09 | Bulk disruptions create a cohort and decision queues | **Built.** `DisruptionCohort.tsx`, driven by `SIMULATE_DISRUPTION`. |
| RT-10 | Expose assignment reason, candidate count, effective weights, selected agent, reassignment history | **Built.** Every candidate is retained with the reason it failed; `DetailsPanel` shows queue, required skill, eligible-of-total, effective weights and the selected agent, and the summary goes to the activity trail. |

### Human agent workspace (AG)

| ID | Requirement | Status |
|----|-------------|--------|
| AG-01 | Open with transcript, summary, handoff reason, SLA, identity status, booking/payment state and unresolved work | **Built.** Transcript, summary, handoff reason, SLA, booking/payment state — and identity verification status, changeable by an agent and audited on every transition. |
| AG-02 | Acceptance before the lease; record offered/accepted/rejected/timed-out | **Built.** `OfferBanner.tsx` plus the accept/decline/timeout actions. |
| AG-03 | Silence AI during human ownership; AI may draft, agent controls send | **Built.** |
| AG-04 | AI summary, suggested reply, translation, knowledge search with sources; editable, not counted until sent | **Partial.** Summary, suggested reply with edit/reject, and knowledge search with sources over the same base the bot uses — all built, and nothing is a human message until sent. Translation reveals a stored translation rather than generating one; that half needs a translation service. |
| AG-05 | Execute booking-domain actions through the same validated services as the bot | **Built.** Retry ticketing, resend, rebook and refund, derived from booking state and the tenant refund ceiling, each confirmed and idempotency-keyed. Raising the over-ceiling refund into `ApprovalsAndHistory` is the remaining half. |
| AG-06 | Mask passport/NID, phone, email and payment references by role; audit every reveal | **Built.** Five protected fields masked by `maskPii`, revealed one at a time behind the configured reason prompt, every reveal audited. |
| AG-07 | Transfer with reason and note; SLA age and context follow | **Built.** |
| AG-08 | Resolve only after a category and outcome, with a domain reference | **Built.** |
| AG-09 | Snooze with a named owner and wake condition; expiry returns to queue and alerts | **Built.** Wake condition, due time, return-to-queue wake, and a named owner who is alerted by name. |
| AG-10 | Configurable reopen window, preferring the previous agent | **Built.** `sla.reopenWindowHours` now has a reader: a resolved case inside the window offers Reopen, which restarts the SLA clock and keeps the original resolution on record. |
| AG-11 | Warn before logout or break with active work; apply unattended timeout | **Built.** Confirmation before stepping away with work held, plus `sla.unattendedMinutes` releasing anything still unattended. |
| AG-12 | Keyboard, screen-reader, focus, contrast and responsive layout for the whole P0 workflow | **Partial.** Mechanical audit clean and a real-key keyboard pass done; no screen-reader pass. |

### Supervisor controls and agent KPI (SUP)

| ID | Requirement | Status |
|----|-------------|--------|
| SUP-01 | Refresh queue and agent state within 5s | **Retired.** Was built on live selectors; the supervisor views are now replications of the design mockup and show its fixture content. `git log` has the implementation. |
| SUP-02 | Filter every dashboard by team, queue, agent, channel, language, priority, intent, resolution, date | **Retired.** The mockup carries its own per-view filter rows, wired to nothing. The live filter bar and its nine dimensions are in `git log`. |
| SUP-03 | Drill from an aggregate metric to source conversations and the events behind it | **Retired.** Replaced by the mockup's drill-down dialog, which shows the design's own event trace rather than navigating to real conversations. |
| SUP-04 | Alert before SLA breach, and on no-eligible-agent, escalation spike, channel failure, queue surge | **Retired.** `/alerts` shows the mockup's four alert cards. The thresholds remain real and editable in Settings → SLA & alerts; nothing evaluates them now. |
| SUP-05 | QA sampling by random, risk-based and targeted rules; rubric version and calibration history | **Retired.** `/qa` replicates the mockup's review queue and its QA dialog. |
| SUP-06 | Minimum 30 conversations / 5 surveys; show insufficient sample instead of a rank | **Retired as behaviour, kept as design.** The scorecard table on `/performance` still shows the mockup's suppressed row; `MIN_QA_SAMPLE` no longer gates anything. |
| SUP-07 | Version KPI definitions; recompute only via labelled backfill | **Removed.** `KpiDefinitionsPanel` was re-homed into Settings → Platform when the supervisor views became replications, then deleted with that tab when `/admin` was cut back to the mockup's seven panes. The implementation — versioned definitions, labelled audited backfill — is in `git log` and would need a home before it comes back. |
| SUP-08 | Async redacted CSV/PDF export with requester, filters, row count, expiry and audit | **Removed.** `ExportReportButton` followed `SUP-07` into Settings → Platform and out again with it. It was real — asynchronous job, requester, row count, 24h expiry, audit record, genuinely redacted CSV — and is recoverable from `git log`. |
| SUP-09 | Agents see their own scorecard and can appeal | **Retired.** `/qa` shows the mockup's appeals panel and its "own data only" scorecard placeholder. |
| SUP-10 | Never a single composite rank; show component weights and coverage | **Held as design.** The mockup's scorecard table shows per-dimension columns and sample coverage, with no composite rank. |

### Tenant administration and governance (ADM)

| ID | Requirement | Status |
|----|-------------|--------|
| ADM-01 | Enforce tenant isolation across queries, caches, indexes, analytics, jobs | **Backend** |
| ADM-02 | Least-privilege roles, custom composition, MFA for privileged administration | **Built.** The mockup's `roleModal` edits `privileged` and the PII-reveal rule with a required reason; `RolesAndAccess.tsx` keeps role CRUD, assignment and break-glass behind the break-glass row's Request button. The `privileged` flag is what `canApproveSensitiveChanges` actually checks. |
| ADM-03 | Second approver for refund authority, payment routing, AI scope, retention reduction, break-glass, role escalation | **Built.** Maker-checker in `ApprovalsAndHistory.tsx`, with a real break-glass grant that expires. |
| ADM-04 | Validate before publish, show affected queues/channels, scheduled activation, one-click rollback | **Built.** `PublishReviewModal` + `validateConfig` + `ScheduledChange` + version rollback. |
| ADM-05 | Managed secret store, show-once, rotate without downtime, never in exports or logs | **Removed.** The mockup's admin view has no secret store — its "Booking and payment" card opens an inspect dialog instead — so `IntegrationSecrets` went when `/admin` was cut back to the mockup's sections. It was real (last-four previews, show-once reveal, two-step rotation with an overlap window, audit entries that never carry the value) and is in `git log`. |
| ADM-06 | Sandbox/test mode for channels, routing, templates, AI policy and booking tools | **Partial.** `brand.sandboxMode` is still in the config and `SandboxBanner` still renders on every governed surface when it is on, but nothing can turn it on any more: its editor lived on the Platform tab, which is not a mockup pane. The plumbing is intact; it needs a control. |
| ADM-07 | Append-only admin audit: actor, role, tenant, before/after, reason, approver, IP/session, effective time | **Built.** Actor, role held at the time, tenant, action, detail, before/after diffs, approver where there was one, session, and effective time. |
| ADM-08 | Tenant-scoped export and deletion workflows with legal-hold and ledger exceptions | **Removed.** `DataExportDeletion` lived on the Platform tab and went with it. Legal-hold and financial-ledger exceptions were computed and shown before execution, then audited; the code is in `git log`. |

### Non-functional (NFR)

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-01 | Availability 99.9% | **Backend** |
| NFR-02 | Latency budgets | **Backend** |
| NFR-03 | Scale and disruption burst | **Backend** |
| NFR-04 | At-least-once delivery, exactly-once visible effect | **Backend** |
| NFR-05 | Retry, circuit breaker, DLQ, replay per adapter | **Backend** |
| NFR-06 | RPO ≤5min / RTO ≤30min | **Backend** |
| NFR-07 | TLS, encryption at rest, vault, MFA, pen test | **Backend** |
| NFR-08 | Privacy: minimisation, field-level masking, retention, deletion/export; never collect PAN/PIN/CVV/OTP in chat | **Partial.** Every frontend slice is now built — the PAN/PIN/CVV/OTP prohibition holds, field-level masking exists (`AG-06`) and the deletion/export workflow does too (`ADM-08`). What remains is backend: encryption at rest, purpose-limited access and processing jurisdictions. |
| NFR-09 | Zero cross-tenant reads/writes | **Backend** |
| NFR-10 | 100% audit correlation | **Backend** |
| NFR-11 | WCAG 2.2 AA for agent and supervisor P0 workflows | **Partial.** Zero mechanical findings on all three audited surfaces (`/inbox`, `/dashboard`, `/admin`) and a verified keyboard pass; no screen-reader pass. |
| NFR-12 | Latest two versions of Chrome/Edge/Firefox/Safari; responsive at 1280px+, usable at 768px | **Built.** Fluid three-pane layout collapsing in two stages; no horizontal overflow at 1600/1280/1024/768. |
| NFR-13 | Structured logs, metrics, traces with named alert owners | **Backend** |
| NFR-14 | Versioned APIs/events, adapters, feature flags, no hard-coded tenant policy | **Backend** |
| NFR-15 | Unicode end to end; **Bangla and English UI**; tenant time zone and currency | **Partial.** EN/বাংলা toggle with the agent workspace translated; `/dashboard` and `/admin` remain English, and every Bangla string is AI-drafted and unreviewed. |

### What to close first

Ordered by how much each one undercuts a claim the PRD makes elsewhere:

1. **AG-06 masking**, with **NFR-08**. Customer PII renders in clear and the
   config toggle that should govern it is inert. The PRD treats this as a
   release gate, not a feature.
2. **AG-05 agent booking actions.** The whole handover story is "the human
   picks up with everything attached" — and then that human cannot reissue,
   refund or reprice anything.
3. **NFR-11 / AG-12 accessibility.** Also a release gate, also unaudited.
4. **INB-07 search** and **INB-06 views.** An inbox that can only find a
   conversation by customer name does not survive real volume.
5. **SUP-02 / SUP-08.** A supervisor dashboard with no filters and no export
   is a screenshot, not a tool.
6. **AG-11**, **INB-12**, **NFR-12**, **NFR-15** — each small on its own.

Also inert, and worth either wiring or removing so they stop reading as built:
the attach-file, attach-image and emoji buttons in the reply composer
(`ChatPanel.tsx`), the search field in `AdminHeader.tsx`, and the
"Current Month" selector on the historical dashboard.
