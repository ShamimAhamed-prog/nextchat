const CHANNELS = [
  {
    key: "whatsapp",
    title: "Connect WhatsApp",
    description: "Search, book, take payment and answer support on WhatsApp Business",
    buttonLabel: "Continue with WhatsApp",
    iconBg: "#25d366",
    connected: true,
    icon: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A8 8 0 1 1 12 20Z" />,
  },
  {
    key: "instagram",
    title: "Connect Instagram",
    description: "Manage Instagram DMs and story replies in the shared inbox",
    buttonLabel: "Continue with Instagram",
    iconBg: "#f00073",
    connected: false,
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    key: "facebook",
    title: "Connect Facebook page",
    description: "Manage Facebook Page messages and comments in the shared inbox",
    buttonLabel: "Continue with Facebook",
    iconBg: "#1877f2",
    connected: false,
    icon: <path d="M14 9h3V6h-3a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9Z" fill="#ffffff" stroke="none" />,
  },
];

const FEATURES = [
  "Receive & reply to messages",
  "Manage comments & mentions",
  "One-click setup",
  "Tenant-isolated credentials",
];

export default function ConnectChannelsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-channels-title"
      className="relative flex w-full max-w-[862px] flex-col gap-6 rounded-2xl bg-page p-10"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-6 top-6 flex h-6 w-6 items-center justify-center rounded-full text-ink/70 transition-colors hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
          <circle cx="12" cy="12" r="9.5" />
          <path d="m9.5 9.5 5 5m0-5-5 5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 id="connect-channels-title" className="text-[32px] font-bold leading-[38px] text-ink">
          Connect your social Channels
        </h2>
        <p className="max-w-[600px] text-base leading-6 text-ink">
          Connect your Facebook, Instagram, and WhatsApp accounts to manage all
          conversations in one place.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {CHANNELS.map((c) => (
          <div
            key={c.key}
            className="flex flex-col gap-6 rounded-xl border border-line-strong bg-panel p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink"
                  style={{ background: c.iconBg }}
                >
                  <svg viewBox="0 0 24 24" className="h-[23px] w-[23px]" fill="currentColor" aria-hidden>
                    {c.icon}
                  </svg>
                </span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-xl font-bold leading-6 text-ink">{c.title}</h3>
                  <p className="text-sm leading-[21px] text-ink-muted">{c.description}</p>
                </div>
              </div>

              <button
                type="button"
                className="h-10 w-full max-w-[440px] rounded-full bg-footer text-base font-medium text-ink transition-opacity hover:opacity-80"
              >
                {c.buttonLabel}
              </button>
            </div>

            <div className="hidden self-stretch border-l border-ink/[0.06] sm:block" />

            <div className="flex w-full flex-col gap-3 sm:w-[243px]">
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                  c.connected ? "border-ok-strong bg-ok-bg-alt text-ok-strong" : "border-line-strong bg-panel text-ink"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  {c.connected ? <path d="m6 12 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" /> : <circle cx="12" cy="12" r="9" />}
                  {!c.connected && <path d="m9 9 6 6m0-6-6 6" strokeLinecap="round" />}
                </svg>
                {c.connected ? "Connected" : "Not connected"}
              </span>

              <ul className="flex flex-col gap-3">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-ink">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ok-strong" fill="none" aria-hidden>
                      <path
                        d="M12 2 3 6v5c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4Z"
                        fill="currentColor"
                        stroke="none"
                      />
                      <path d="m8.5 12 2.3 2.3L15.5 9.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
