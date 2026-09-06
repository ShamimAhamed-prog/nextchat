/**
 * The oversized, heavily blurred ellipses Figma uses behind most sections.
 * Sizes come straight from the frame; they overflow their section on purpose.
 */
export default function Glow({
  color,
  size,
  className = "",
  opacity = 0.5,
}: {
  color: string;
  size: number;
  className?: string;
  opacity?: number;
}) {
  return (
    <span
      aria-hidden
      className={`glow ${className}`}
      style={{
        background: color,
        width: size,
        height: size,
        opacity,
      }}
    />
  );
}
