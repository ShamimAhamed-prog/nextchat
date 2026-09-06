const PALETTE = [
  "linear-gradient(135deg,#de4559,#ff601c)",
  "linear-gradient(135deg,#8e51ff,#e12afb)",
  "linear-gradient(135deg,#00bcff,#2b7fff)",
  "linear-gradient(135deg,#00d492,#00bba7)",
  "linear-gradient(135deg,#ffb900,#ff6900)",
  "linear-gradient(135deg,#f00073,#8e51ff)",
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Code-drawn avatar (initials on a deterministic gradient, keyed by name) —
 * used wherever a distinct per-person identity is needed but there's no
 * real photo. Same rationale as `Logo.tsx`: draw it rather than fake a
 * stock photo that would misrepresent a specific person.
 */
export default function InitialsAvatar({ name, size = 32, className = "" }: { name: string; size?: number; className?: string }) {
  const gradient = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-on-accent ${className}`}
      style={{ width: size, height: size, background: gradient, fontSize: Math.max(9, size * 0.38) }}
    >
      {initialsOf(name)}
    </span>
  );
}
