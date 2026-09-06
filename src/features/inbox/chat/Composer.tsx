"use client";

/**
 * Everything below the transcript: the reply/note composer, the send-window
 * notice explaining why it is restricted, the knowledge panel that inserts
 * into the draft, and — when this agent does not own the conversation — the
 * control that says what to do about that instead.
 *
 * One component because they are one region with one subject. The knowledge
 * panel sits here rather than in the shell because its only effect is on the
 * draft; `StatusAction` sits here because it is what occupies this space
 * when there is no composer to show.
 *
 * Composer state stays inside: mode, the popovers, the textarea. The three
 * things outside that need to reach in do so through `ComposerHandle` and
 * nothing else — see its doc comment.
 */

import { useEffect, useRef, useState } from "react";
import { useInbox } from "../context/InboxContext";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import { useUiLocale } from "@/shared/providers/UiLocale";
import { useCountdown, useNow } from "../engine/useCountdown";
import KnowledgePanel from "../components/KnowledgePanel";
import { ALL_PEOPLE } from "@/shared/lib/people";
import { totalMaxConcurrency } from "@/features/admin/engine/tenantConfigEngine";
import {
  APPROVED_TEMPLATES,
  canAcceptWork,
  channelSendPolicy,
  draftFor,
  SAVED_REPLIES,
  type Channel,
  type Conversation,
} from "../engine/inboxEngine";
import type { ComposerHandle } from "./composerHandle";

const CONFIG_TO_CHANNEL: Record<string, Channel | undefined> = {
  web: "Website",
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: undefined, // no Instagram conversations are modelled yet
};

/**
 * INB-12 in the composer: when the channel's reply window has closed, say so
 * in the agent's terms, offer the approved templates if the channel still
 * allows them, and name a channel that can still reach this customer.
 */
function SendWindowNotice({ convo }: { convo: Conversation }) {
  const { dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const now = useNow();
  const enabled = tenantState.published.brand.channels
    .filter((c) => c.enabled)
    .map((c) => CONFIG_TO_CHANNEL[c.id])
    .filter((c): c is Channel => Boolean(c));
  const policy = channelSendPolicy(convo, now, enabled);

  if (policy.canFreeType) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warn-border-soft bg-warn-bg-soft p-3">
      <p className="text-sm leading-relaxed text-amber">{policy.reason}</p>

      {policy.canTemplate ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-amber/80">Approved templates</p>
          <div className="flex flex-wrap gap-2">
            {APPROVED_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.body}
                onClick={() => dispatch({ type: "SEND_MESSAGE", id: convo.id, text: t.body, sandbox: tenantState.published.brand.sandboxMode })}
                className="rounded-full border border-amber/50 px-3 py-1.5 text-xs font-medium text-amber transition-colors hover:bg-amber/10"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {policy.alternative ? (
        <p className="text-xs leading-relaxed text-amber/80">
          {policy.alternative} is enabled for this tenant and can still reach
          them — start there instead.
        </p>
      ) : null}
    </div>
  );
}

/**
 * INB-09. This replaces a double-tick that was drawn on every outbound
 * message regardless of channel or outcome — a read receipt asserted where
 * nothing had reported one, which is a worse thing to show than nothing.
 * Each state now says only what the channel actually reported.
 */

function StatusAction({ convo }: { convo: Conversation }) {
  const { state, dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const offerRemaining = useCountdown(convo.status === "offered" ? convo.offerExpiresAt : undefined, () => dispatch({ type: "OFFER_TIMEOUT", id: convo.id }));
  const snoozeRemaining = useCountdown(convo.status === "snoozed" ? convo.snoozeUntil : undefined, () => dispatch({ type: "SNOOZE_WOKE", id: convo.id }));
  const assignedCount = state.conversations.filter((c) => c.status === "assigned").length;
  const cap = totalMaxConcurrency(tenantState.published);
  const atCapacity = assignedCount >= cap;
  const eligible = canAcceptWork(state.agentState) && !atCapacity;
  const ineligibleReason = atCapacity
    ? `At your ${cap}-conversation concurrency cap — resolve or release one first.`
    : "You’re not marked as eligible for work — change your status to accept.";

  if (convo.status === "offered") {
    const mm = String(Math.floor(offerRemaining / 60)).padStart(2, "0");
    const ss = String(offerRemaining % 60).padStart(2, "0");
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-footer p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">
            New assignment — accept within{" "}
            <span className="font-[family-name:var(--font-inter)] font-semibold tabular-nums text-coral">
              {mm}:{ss}
            </span>
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => dispatch({ type: "DECLINE", id: convo.id })} className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-ink-dim">
              Decline
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "ACCEPT", id: convo.id })}
              disabled={!eligible}
              className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-40"
            >
              Accept
            </button>
          </div>
        </div>
        {!eligible && <span className="text-xs text-amber">{ineligibleReason}</span>}
      </div>
    );
  }
  if (convo.status === "queued") {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-footer p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink">Unassigned — pick this up to reply.</span>
          <button
            type="button"
            onClick={() => dispatch({ type: "ACCEPT", id: convo.id })}
            disabled={!eligible}
            className="h-9 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-40"
          >
            Accept
          </button>
        </div>
        {!eligible && <span className="text-xs text-amber">{ineligibleReason}</span>}
      </div>
    );
  }
  if (convo.status === "snoozed") {
    const mins = Math.max(1, Math.ceil(snoozeRemaining / 60));
    return (
      <div className="rounded-lg bg-footer p-4 text-sm text-ink">
        Snoozed — {convo.snoozeReason}. Wakes back to you in <span className="font-[family-name:var(--font-inter)] tabular-nums text-amber">{mins}m</span>.
      </div>
    );
  }
  return <div className="rounded-lg bg-footer p-4 text-sm text-ink-dim">Resolved{convo.resolution ? ` — ${convo.resolution.category}` : ""}. Nothing more to do here.</div>;
}

const EMOJI = ["👍", "🙏", "✅", "✈️", "🎫", "⏱️", "😊", "🙌", "📄", "❤️", "🔁", "⚠️"];

function IconButton({
  label,
  children,
  onClick,
  disabled = false,
  expanded,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className="flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

export default function Composer({
  convo,
  owned,
  handleRef,
  externalRef,
}: {
  convo: Conversation;
  /** Whether this agent holds the conversation; decides what this region is. */
  owned: boolean;
  /** The shell's own handle, so the draft card and knowledge panel can focus. */
  handleRef: React.RefObject<ComposerHandle | null>;
  /** The keyboard shortcuts' handle, passed down from the workspace. */
  externalRef?: React.RefObject<ComposerHandle | null>;
}) {
  const { state, dispatch } = useInbox();
  const { state: tenantState } = useTenantConfig();
  const { t } = useUiLocale();
  const aiDisabledTenantWide = tenantState.published.ai.killSwitch;

  const reply = state.drafts[convo.id] ?? "";
  const setReply = (next: string | ((prev: string) => string)) => {
    const text = typeof next === "function" ? next(state.drafts[convo.id] ?? "") : next;
    dispatch({ type: "SET_DRAFT", id: convo.id, text });
  };

  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  // INB-08: the composer is either replying to the customer or writing an
  // internal note. Two modes on one control, because the thing that must
  // never happen is an agent believing they wrote a note and sending it.
  const [noteMode, setNoteMode] = useState(false);
  // INB-12: the reply window closes on a clock, so this has to tick.
  const now = useNow();
  const enabledChannels = tenantState.published.brand.channels
    .filter((c) => c.enabled)
    .map((c) => CONFIG_TO_CHANNEL[c.id])
    .filter((c): c is Channel => Boolean(c));

  /*
   * One handle, published to two refs. The external one is the workspace's,
   * for `r` and `n`; the shell's own is how the draft card and knowledge
   * panel focus this textarea after writing to the draft. Both are the same
   * object, so there is no second definition of what "focus the composer"
   * means.
   */
  useEffect(() => {
    const handle: ComposerHandle = {
      focusReply: () => {
        setNoteMode(false);
        replyInputRef.current?.focus();
      },
      toggleNote: () => {
        setNoteMode((v) => !v);
        replyInputRef.current?.focus();
      },
      focus: () => replyInputRef.current?.focus(),
    };
    handleRef.current = handle;
    if (externalRef) externalRef.current = handle;
  }, [handleRef, externalRef]);

  /*
   * There is deliberately no `URL.revokeObjectURL` here, and the absence is
   * the fix rather than an oversight.
   *
   * An earlier version tracked every URL `attach` created and revoked them
   * all when this component unmounted, to avoid leaking them. But the URL
   * does not belong to this component: `attach` dispatches it into the
   * transcript, and inbox state outlives any conversation pane. `ChatPanel`
   * is mounted as `key={state.selectedId}`, so switching conversation
   * unmounts this subtree and remounts it — meaning the cleanup ran on every
   * switch and revoked URLs the transcript was still pointing at. Attach an
   * image, look at another conversation, come back, and the preview is a
   * broken image.
   *
   * You cannot free something still referenced, so there was nothing to
   * reclaim; what the cleanup actually reclaimed was the picture. The blobs
   * now live as long as the document, which the browser frees on unload, and
   * they are bounded by the attachments one agent makes in one session.
   *
   * The real fix is upstream of this file: a backend would upload the file
   * and put a durable URL in the transcript, at which point the blob can be
   * revoked the moment the upload completes and never has to outlive the
   * send.
   */

  const policy = channelSendPolicy(convo, now, enabledChannels);
  // Another surface (a cited-source link in `DetailsPanel`) can ask for an
  // article. Adjusting state during render is React's documented pattern for
  // this and is cheaper than an effect — it re-renders immediately rather
  // than painting the wrong thing first. Guarded, so it cannot loop.
  if (state.knowledgeRequest && !knowledgeOpen) setKnowledgeOpen(true);

  function submit() {
    if (!reply.trim() || !owned) return;
    if (noteMode) {
      // Deliberately a different action: a note has no path to a channel.
      dispatch({ type: "ADD_NOTE", id: convo.id, text: reply.trim() });
      setReply("");
      return;
    }
    send();
  }

  function send() {
    if (!reply.trim() || !owned || !policy.canFreeType) return;
    dispatch({ type: "SEND_MESSAGE", id: convo.id, text: reply.trim(), sandbox: tenantState.published.brand.sandboxMode });
    setReply("");
  }

  function attach(file: File | undefined, kind: "image" | "file") {
    if (!file || !policy.canFreeType) return;
    const url = URL.createObjectURL(file);
    dispatch({
      type: "SEND_MESSAGE",
      id: convo.id,
      text: reply.trim(),
      sandbox: tenantState.published.brand.sandboxMode,
      attachment: {
        kind,
        name: file.name,
        url,
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      },
    });
    setReply("");
  }

  function requestDraft() {
    dispatch({ type: "REQUEST_AI_DRAFT", id: convo.id });
    window.setTimeout(() => dispatch({ type: "RESOLVE_AI_DRAFT", id: convo.id, text: draftFor(convo) }), 1000);
  }

  return (
    <>
      {knowledgeOpen && (
        <KnowledgePanel
          canInsert={owned}
          onClose={() => setKnowledgeOpen(false)}
          onInsert={(text) => {
            // Never sent — AG-04 is explicit that a suggestion is not a human
            // message until the agent sends it.
            setReply((r) => (r ? `${r} ${text}` : text));
            setKnowledgeOpen(false);
            requestAnimationFrame(() => replyInputRef.current?.focus());
          }}
        />
      )}


      {owned ? (
        <div className={`flex flex-col gap-3 rounded-lg p-4 ${noteMode ? "border border-amber/40 bg-amber/5" : "bg-footer"}`}>
          <div className="flex items-center gap-1 self-start rounded-full bg-page p-0.5" role="group" aria-label={t("Composer mode")}>
            {[
              { id: false, label: t("Reply") },
              { id: true, label: t("Internal note") },
            ].map((m) => (
              <button
                key={String(m.id)}
                type="button"
                onClick={() => setNoteMode(m.id)}
                aria-pressed={noteMode === m.id}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  noteMode === m.id
                    ? m.id
                      ? "bg-amber text-ink-invert"
                      : "bg-panel text-ink"
                    : "text-ink-dim hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {!noteMode && <SendWindowNotice convo={convo} />}

          <label className="sr-only" htmlFor="agent-reply">
            Reply to {convo.customerName}
          </label>
          <textarea
            id="agent-reply"
            ref={replyInputRef}
            rows={2}
            value={reply}
            disabled={!noteMode && !policy.canFreeType}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line. Before this the
              // composer was an <input>, so a two-paragraph reply was
              // impossible to write at all.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              noteMode
                ? t("Internal note — @mention a colleague to notify them")
                : policy.canFreeType
                  ? `Type a reply to ${convo.customerName.split(" ")[0]}...`
                  : t("Free replies are closed on this channel")
            }
            className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink focus:outline-none disabled:cursor-not-allowed disabled:placeholder:text-ink-dim"
          />
          <div className="flex items-center justify-between">
            <div className="relative flex items-center gap-1">
              {/* The pickers are the real thing — these three used to be
                  decoration, which reads as broken the first time an agent
                  clicks one. Disabled together with free typing, since an
                  attachment is a free-form send (INB-12). */}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  attach(e.target.files?.[0], "file");
                  e.target.value = "";
                }}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  attach(e.target.files?.[0], "image");
                  e.target.value = "";
                }}
              />

              <IconButton label={t("Attach file")} disabled={!policy.canFreeType} onClick={() => fileInputRef.current?.click()}>
                <path d="M8 12.5 15 5a3 3 0 0 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7-7l7.8-7.8" />
              </IconButton>
              <IconButton label={t("Attach image")} disabled={!policy.canFreeType} onClick={() => imageInputRef.current?.click()}>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
                <path d="m5 17 5-5 4 4 3-3 3 3" />
              </IconButton>
              {/* Saved replies are customer-facing, so they are disabled in
                  note mode and while the channel window is shut — unlike
                  knowledge, which is only ever read. */}
              <IconButton
                label={t("Saved replies")}
                expanded={savedOpen}
                disabled={noteMode || !policy.canFreeType}
                onClick={() => setSavedOpen((v) => !v)}
              >
                <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
              </IconButton>
              <IconButton
                label={t("Mention a colleague")}
                expanded={mentionOpen}
                disabled={!noteMode}
                onClick={() => setMentionOpen((v) => !v)}
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3.2" />
                <path d="M15.2 12v1.6a2 2 0 0 0 3.8-.9V12" strokeLinecap="round" />
              </IconButton>
              <IconButton
                label={t("Knowledge")}
                expanded={knowledgeOpen}
                onClick={() => setKnowledgeOpen((v) => !v)}
              >
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
                <path d="M8 8h7M8 11.5h5" />
              </IconButton>
              <IconButton
                label={t("Insert emoji")}
                disabled={!policy.canFreeType}
                expanded={emojiOpen}
                onClick={() => setEmojiOpen((v) => !v)}
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 14s1.2 2 3.5 2 3.5-2 3.5-2" />
                <circle cx="9" cy="9.5" r="0.8" fill="currentColor" stroke="none" />
                <circle cx="15" cy="9.5" r="0.8" fill="currentColor" stroke="none" />
              </IconButton>

              {savedOpen && (
                <div className="card-hairline absolute bottom-10 left-0 z-20 flex w-80 flex-col gap-1 rounded-lg bg-page p-2 shadow-pop">
                  {SAVED_REPLIES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      title={r.body}
                      onClick={() => {
                        setReply((v) => (v ? `${v} ${r.body}` : r.body));
                        setSavedOpen(false);
                        replyInputRef.current?.focus();
                      }}
                      className="rounded-md px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-panel"
                    >
                      <span className="block font-medium">{r.label}</span>
                      <span className="block truncate text-xs text-ink-dim">{r.body}</span>
                    </button>
                  ))}
                </div>
              )}

              {mentionOpen && (
                <div className="card-hairline absolute bottom-10 left-0 z-20 flex w-56 flex-col gap-0.5 rounded-lg bg-page p-1.5 shadow-pop">
                  {ALL_PEOPLE.map((person) => (
                    <button
                      key={person}
                      type="button"
                      onClick={() => {
                        const handle = `@${person.split(" ")[0]}`;
                        setReply((v) => (v ? `${v} ${handle} ` : `${handle} `));
                        setMentionOpen(false);
                        replyInputRef.current?.focus();
                      }}
                      className="rounded-md px-3 py-1.5 text-left text-sm text-ink transition-colors hover:bg-panel"
                    >
                      {person}
                    </button>
                  ))}
                </div>
              )}

              {emojiOpen && (
                <div className="card-hairline absolute bottom-10 left-0 z-20 flex w-56 flex-wrap gap-1 rounded-lg bg-page p-2 shadow-pop">
                  {EMOJI.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        setReply((r) => r + e);
                        setEmojiOpen(false);
                        replyInputRef.current?.focus();
                      }}
                      className="h-8 w-8 rounded-md text-lg transition-colors hover:bg-panel"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={requestDraft}
                disabled={convo.aiThinking || Boolean(convo.aiDraft) || aiDisabledTenantWide}
                title={aiDisabledTenantWide ? "AI is disabled tenant-wide — see Settings" : undefined}
                className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-violet-strong" fill="none" aria-hidden>
                  <path d="M12 3v2M12 19v2M4 12H2m20 0h-2M6 6 4.6 4.6M19.4 19.4 18 18M6 18l-1.4 1.4M19.4 4.6 18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {t("AI Reply")}
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={!reply.trim() || (!noteMode && !policy.canFreeType)}
                aria-label={noteMode ? t("Add internal note") : t("Send reply")}
                className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#8e51ff_0%,#e12afb_50%,#de4559_100%)] text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M3 11.5 21 3l-6 18-4-7-8-2.5Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <StatusAction convo={convo} />
      )}
    </>
  );
}
