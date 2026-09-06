/**
 * The shape of a header control, in one place.
 *
 * NextAdmin's application chrome puts its header actions on a hairline-bordered
 * rounded square sitting on the card surface, not a filled circle — a 36px
 * box, quiet at rest, tinting its background on hover. The theme toggle and
 * the notifications bell sit next to each other, so the class lives here
 * rather than being written twice and drifting: the two only read as one
 * cluster while they are identical.
 */
export const HEADER_CONTROL =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink-dim transition-colors hover:bg-raised hover:text-ink";
