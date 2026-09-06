/**
 * The composer's imperative surface, declared once.
 *
 * `ChatPanel` deliberately does not lift the composer's state out of it —
 * draft mode, emoji and mention popovers and the textarea itself belong to
 * the composer. But three things outside it need to reach in: the `r` and
 * `n` keyboard shortcuts, the AI draft card's "edit" button, and the
 * knowledge panel's "insert". This is that reach, and nothing more.
 *
 * It was previously spelled out inline in three files — `TicketDashboard`,
 * `KeyboardShortcuts` and `ChatPanel` — which is two copies too many for a
 * contract whose whole job is to be agreed on.
 */
export type ComposerHandle = {
  /** Focus the composer and put it in reply mode. Bound to `r`. */
  focusReply: () => void;
  /** Switch between reply and internal note. Bound to `n`. */
  toggleNote: () => void;
  /**
   * Focus the composer, leaving its mode alone — for callers that have just
   * put text into the draft and want the cursor there, without deciding on
   * the agent's behalf whether that text is a reply or a note.
   */
  focus: () => void;
};
