/*
 * Money, in the two shapes this app already renders it.
 *
 * They differ on purpose, and the difference is not cosmetic: the customer
 * widget prices a fare in the symbol a Bangladeshi customer reads on every
 * other site (`৳`), while the agent workspace writes the ISO code in prose
 * that also names a policy ceiling — "৳80,000 is above this tenant's
 * ৳50,000 refund ceiling" reads as decoration where "BDT 80,000" reads as
 * a figure. Unifying them is a copy decision, not a refactor.
 *
 * What was wrong was having two `fmtBdt` functions — one here, one private
 * to `inboxEngine.ts` — with the same name, the same signature and
 * different output. Both formats now live here, named for what they
 * produce, so the next caller has to choose rather than guess.
 */

/** `৳1,234` — the customer-facing form, used by the chat widget. */
export function fmtBdt(n: number): string {
  return `৳${n.toLocaleString("en-US")}`;
}

/** `BDT 1,234` — the operational form, used in agent-facing prose. */
export function fmtBdtCode(n: number): string {
  return `BDT ${n.toLocaleString("en-US")}`;
}
