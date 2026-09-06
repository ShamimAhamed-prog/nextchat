"use client";

import { useState } from "react";
import Modal from "../dashboard/Modal";
import { useTenantConfig } from "./TenantConfigContext";
import type { TenantConfig } from "./tenantConfigEngine";

type Channel = TenantConfig["brand"]["channels"][number];

/**
 * The mockup's `channelModal`, as a real editor rather than a static form.
 *
 * Only Status edits anything: it writes `brand.channels.<id>.enabled` into the
 * draft on save, so the change flows through `diffDraft`, the publish modal
 * and the audit trail like every other config edit, and a disabled channel
 * disappears from `/inbox`'s filter tabs once published. The rest are the
 * platform facts for that channel and are read-only here, which is why they
 * are rendered as values rather than as inputs an admin can type into and have
 * silently discarded.
 *
 * `Modal` gives it the same backdrop, Escape handling and focus trap the other
 * real dialogs use (`nfr11-dialogs-keyboard` covers it).
 */

/** Mirrors `CHANNEL_WINDOW_MS` in `inboxEngine.ts`, which is not exported.
 *  Worth collapsing into one exported constant — see the note in README. */
const MESSAGING_WINDOW: Record<string, string> = {
  whatsapp: "24 hours from the customer's last message",
  messenger: "24 hours from the customer's last message",
  instagram: "24 hours from the customer's last message",
  web: "30 minutes from the customer's last message",
  email: "No window — email threads stay open",
};

/** Which server-side credential backs each channel. */
const CREDENTIAL: Record<string, string> = {
  whatsapp: "WhatsApp Business API",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">{label}</span>
      {children}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-line bg-footer px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none";

function Txt({ value, onChange, readOnly }: { value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      className={`${inputCls} ${readOnly ? "text-ink-dim" : ""}`}
    />
  );
}

export default function ChannelConfigModal({ channel, title, onClose }: { channel: Channel; title?: string; onClose: () => void }) {
  const name = title ?? channel.label;
  const { dispatch } = useTenantConfig();
  const [enabled, setEnabled] = useState(channel.enabled);
  const [webhook, setWebhook] = useState(`https://api.takeoff.example/channels/${channel.id}/webhook`);
  const [window, setWindow] = useState(MESSAGING_WINDOW[channel.id] ?? "Platform default");
  const [retry, setRetry] = useState("3 attempts · exponential backoff");
  const dirty = enabled !== channel.enabled;

  function save() {
    if (dirty) dispatch({ type: "EDIT_DRAFT", path: `brand.channels.${channel.id}.enabled`, value: enabled });
    // Only Status is stored. The transport settings have no config behind
    // them, so what was typed goes on the audit entry rather than nowhere.
    dispatch({
      type: "RECORD_AUDIT",
      actor: "You",
      action: `Channel configuration saved — ${name}`,
      detail: `status ${enabled ? "enabled" : "disabled"} · webhook ${webhook} · window ${window} · retry ${retry}`,
    });
    onClose();
  }

  return (
    <Modal titleId="channel-config-title" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <h2 id="channel-config-title" className="text-lg font-bold text-ink">
          Channel configuration
        </h2>
      </div>
      <p className="mt-1 text-sm text-ink-dim">{name}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Row label="Channel">
          <Txt value={name} readOnly />
        </Row>
        <Row label="Status">
          <select
            value={enabled ? "enabled" : "disabled"}
            onChange={(e) => setEnabled(e.target.value === "enabled")}
            aria-label="Channel status"
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-ink focus:border-coral focus:outline-none"
          >
            <option value="enabled" className="bg-footer">
              Enabled
            </option>
            <option value="disabled" className="bg-footer">
              Disabled
            </option>
          </select>
        </Row>

        <div className="sm:col-span-2">
          <Row label="Signed webhook URL">
            <Txt value={webhook} onChange={setWebhook} />
          </Row>
        </div>

        <Row label="Messaging window">
          <Txt value={window} onChange={setWindow} />
        </Row>
        <Row label="Retry policy">
          <Txt value={retry} onChange={setRetry} />
        </Row>

        <div className="sm:col-span-2">
          <Row label="Credential">
            <Txt value={CREDENTIAL[channel.id] ? `•••••••••••• — ${CREDENTIAL[channel.id]}` : "No credential configured for this channel yet"} readOnly />
          </Row>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-line bg-footer p-3 text-[11px] leading-relaxed text-ink-dim">
        Secrets are write-only after entry, which is why Credential is the one field here you cannot type into. Webhooks require
        signature verification, deduplication and asynchronous processing. Status is the field that changes behaviour: it goes into
        the draft and reaches /inbox&rsquo;s channel tabs when you publish. The transport settings have no store behind them yet, so
        they are recorded on the audit entry instead.
      </p>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-ink-dim"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="h-10 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
        >
          Test and save
        </button>
      </div>
    </Modal>
  );
}
