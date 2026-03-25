import type { CSSProperties } from "react";

const BASE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  flexShrink: 0,
  transitionDuration: "var(--duration-fast)",
};

/** Monospace “open →” used on route/project link cards (complements `CardArrowAction` on dense tiles). */
export function OpenRouteLinkAffordance({ color = "var(--dawn-70)" }: { color?: string }) {
  return (
    <span
      className="transition-colors group-hover:text-[var(--gold)]"
      style={{
        ...BASE,
        color,
      }}
    >
      open &rarr;
    </span>
  );
}
