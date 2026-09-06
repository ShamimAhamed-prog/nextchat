# `inbox/` — what came out of `inboxEngine.ts`

The engine was 2,044 lines holding four unrelated kinds of thing: the
`Conversation` shape, a dozen pure functions answering questions about a
conversation, 250 lines of seed data, and the state machine. Nothing was
wrong with any of it — the problem was finding it.

The cut is by **requirement**, which is how this codebase is traced
everywhere else (`TODO.md`, the verify suites, the PRD ids in the
comments), so a file answers the question "where does AG-06 live?" rather
than "where do the helpers live?".

| file | requirement | holds |
|---|---|---|
| `types.ts` | — | The `Conversation` shape and every union it is built from, plus the handful of rules inseparable from a type: delivery-state progression, retry bounds, `canAcceptWork`. |
| `queue.ts` | §C1/§E3, SUP-01, RT-08 | SLA windows, queue ordering, the queue snapshot, SLA badges, and who currently holds what. |
| `pii.ts` | AG-06 | Field labels and `maskPii`. |
| `channels.ts` | INB-12 | Per-channel reply windows, approved templates, and the send gate. |
| `reopen.ts` | RT-05, AG-10 | The reopen window, and whether affinity yields to a tighter SLA. |
| `views.ts` | INB-06 | The nine inbox views, computed rather than stored. |
| `search.ts` | INB-07 | The `field:value` grammar and free-text matching. |
| `bookingActions.ts` | AG-05 | Which booking actions a state allows, what blocks them, and what each leaves behind. |
| `seed.ts` | — | The conversations the prototype opens with. |
| `helpers.ts` | — | Id and activity-entry construction, shared by `seed.ts` and the reducer. |
| `state.ts` | — | `InboxState`, `InboxAction`, and the initial state. Separate from the reducer so a domain reducer can name what it operates on without importing `inboxEngine.ts`, which imports it. |
| `reducers/` | — | The state machine, one file per domain. See below. |

## Two rules that keep this from decaying

**Nothing here imports `inboxEngine.ts`.** The dependency graph is a DAG:
`types` at the bottom, `queue` above it, everything else above that. A pure
module reaching back into the state machine would make the split cosmetic,
and is why `canAcceptWork` moved into `types.ts` — `reopen.ts` needs it,
and it is a predicate over a union, not a piece of state.

**`inboxEngine.ts` re-exports all of it.** Twenty-odd components import
from the engine and none of them changed. A component should not have to
know which file a pure function landed in, and if it did, moving one again
would be a twenty-file diff instead of a one-line one.

## `reducers/` — the state machine, by domain

`inboxReducer` was a single 637-line `switch` over 63 action types. It is
now a routing table in `inboxEngine.ts` that dispatches to one of eleven
domain reducers, each a `switch` over its own slice of `InboxAction`:

| file | domain |
|---|---|
| `agentState.ts` | AG-11 availability, the held-conversation guard, unattended timeout |
| `offers.ts` | Accept, decline, timeout, incoming offers, the recorded routing decision |
| `lifecycle.ts` | Release, transfer, resolve, reopen, snooze |
| `messaging.ts` | Sending, AI drafts, delivery state and bounded retry |
| `notes.ts` | INB-08 internal notes, mentions, follow-up tasks |
| `booking.ts` | AG-05 booking actions, and their idempotency keys |
| `pii.ts` | AG-06 reveal gate and its audit trail |
| `supervisor.ts` | Manual assign, QA review, appeals |
| `disruption.ts` | The disruption cohort, and the scenarios it is built from |
| `conversation.ts` | Identity, pin, tags |
| `intents.ts` | One-shot hand-offs between surfaces, and the selected id |
| `shared.ts` | `mapConvo`, `mapMessage`, `nowLabel`, `parseMentions`, `draftFor` |

**The action types are listed twice — in the router and in the domain's own
`Extract<>` union — and that is not duplication that can drift.** Both ends
end in `const x: never = action`, so an action routed to the wrong domain,
or added to a union without a case, or added to `InboxAction` and routed
nowhere, is a compile error. The single switch could not offer that: its
`default` returned `state`, so an unhandled action was a silent no-op.

Splitting a switch is only safe if the groups are disjoint, and they are —
every action type appears in exactly one domain, which is what the two
`never` checks together prove.
