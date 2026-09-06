import { ReactNode } from "react";
import Link from "next/link";

type Props = {
  children: ReactNode;
  variant?: "gradient" | "outline";
  className?: string;
  href?: string;
  onClick?: () => void;
};

/**
 * Pill button, 48px tall. Gradient #de4559 → #ff601c, or a 1px white
 * outline. Renders a `<button>` when `onClick` is passed (no `href`
 * needed), a `<Link>` otherwise — same look either way.
 */
export default function GradientButton({
  children,
  variant = "gradient",
  className = "",
  href,
  onClick,
}: Props) {
  const base =
    "inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-medium transition-opacity hover:opacity-90 whitespace-nowrap";

  const styles =
    variant === "gradient"
      ? "text-white bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)]"
      : "text-white border border-white";

  if (onClick && !href) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${styles} ${className}`}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}
