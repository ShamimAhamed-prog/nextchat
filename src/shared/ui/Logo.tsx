import Link from "next/link";

/**
 * Code-drawn brand mark: the same paper-plane glyph used for "Send reply" in
 * the agent workspace, so the identity and the product share one icon
 * instead of needing a new logo asset exported from Figma. `markOnly` drops
 * the wordmark for the compact sidebars.
 */
export default function Logo({
  className = "",
  markOnly = false,
  compact = false,
  href = "/",
}: {
  className?: string;
  markOnly?: boolean;
  /** Smaller mark and wordmark for the navigation rail. */
  compact?: boolean;
  href?: string | null;
}) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-[10px] ${compact ? "h-8 w-8" : "h-10 w-10"}`}
        style={{ background: "linear-gradient(160deg,#ffd464 0%,#ff5e5e 100%)" }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#1a1a1a" aria-hidden>
          <path d="M3 11.5 21 3l-6 18-4-7-8-2.5Z" />
        </svg>
      </span>
      {!markOnly && (
        <span className={`whitespace-nowrap font-bold leading-none text-ink ${compact ? "text-base" : "text-xl"}`}>
          Nexchatgen
        </span>
      )}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} aria-label="Nexchatgen home">
      {content}
    </Link>
  );
}
