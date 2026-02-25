"use client";

import Link from "next/link";

export type HudBreadcrumbSegment = {
  label: string;
  href?: string;
};

type HudBreadcrumbProps = {
  segments: HudBreadcrumbSegment[];
};

function Diamond() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 5,
        height: 5,
        background: "var(--dawn-15)",
        transform: "rotate(45deg)",
        flexShrink: 0,
        margin: "0 6px",
      }}
      aria-hidden
    />
  );
}

export function HudBreadcrumb({ segments }: HudBreadcrumbProps) {
  if (segments.length === 0) return null;

  const baseStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
      {segments.map((seg, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
          {i > 0 && <Diamond />}
          {seg.href != null ? (
            <Link
              href={seg.href}
              style={{
                ...baseStyle,
                color: "var(--dawn-30)",
                textDecoration: "none",
                transition: "color 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--dawn-50)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--dawn-30)";
              }}
            >
              {seg.label}
            </Link>
          ) : (
            <span style={{ ...baseStyle, color: "var(--dawn-50)" }}>{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
