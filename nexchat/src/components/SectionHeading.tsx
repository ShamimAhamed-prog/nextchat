import { ReactNode } from "react";

/**
 * Amber eyebrow flanked by rules, a 40/48 heading whose trailing words are
 * coral, then an optional centred paragraph. Widths mirror the text boxes in
 * the frame: headings run the full 1320 column, paragraphs are set per section.
 */
export default function SectionHeading({
  eyebrow,
  title,
  accent,
  children,
  bodyWidth = 760,
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  accent?: string;
  children?: ReactNode;
  bodyWidth?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-4 text-center ${className}`}>
      <span className="flex items-center gap-2 text-base font-medium text-amber">
        <span aria-hidden className="h-px w-4 bg-amber/60" />
        {eyebrow}
        <span aria-hidden className="h-px w-4 bg-amber/60" />
      </span>

      <h2 className="max-w-[1320px] text-[32px] font-semibold leading-tight md:text-[40px] md:leading-[48px]">
        {title}
        {accent ? <span className="text-coral">{accent}</span> : null}
      </h2>

      {children ? (
        <p
          className="text-base leading-6 text-white"
          style={{ maxWidth: bodyWidth }}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}
