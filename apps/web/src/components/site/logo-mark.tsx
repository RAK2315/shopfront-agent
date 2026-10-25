import { cn } from "@/lib/cn";

/**
 * The Shopfront mark: a three-panel awning over an S (drawn by hand on a 100-unit grid; the same paths as
 * video/public/brand/logo-mark.svg). The thin outline that separates the panels takes the colour of whatever sits
 * behind the mark, so pass `bg` when it isn't the page canvas.
 */
export function LogoMark({ className, bg = "var(--color-canvas)" }: { className?: string; bg?: string }) {
  return (
    <svg viewBox="22 21 56 52" aria-hidden className={cn("shrink-0", className)}>
      <path
        fill="var(--color-ink)"
        d="M25 42 H40 V45 Q40 47.5 43.6 47.5 H62.6 A12.35 12.35 0 0 1 62.6 72.2 H35.6 A10.2 10.2 0 0 1 25.4 62 H60.4 A2.25 2.25 0 0 0 60.4 57.5 H35 A10 10 0 0 1 25 47.5 Z"
      />
      <g fill="var(--color-clay)" stroke={bg} strokeWidth="2.4" strokeLinejoin="round" paintOrder="stroke">
        <path d="M33.2 22.6 H43.2 L40.9 37.6 A8.75 8.75 0 0 1 23.4 37.6 L30.4 24.1 Q31.1 22.6 33.2 22.6 Z" />
        <path d="M45.6 22.6 H54.4 L57.8 37.6 A7.8 7.8 0 0 1 42.2 37.6 Z" />
        <path d="M56.8 22.6 H66.8 Q68.9 22.6 69.6 24.1 L76.6 37.6 A8.75 8.75 0 0 1 59.1 37.6 Z" />
      </g>
    </svg>
  );
}
