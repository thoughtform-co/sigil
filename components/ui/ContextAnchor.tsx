"use client";

import type { CSSProperties } from "react";
import { CardTitle, CardArrowAction } from "@/components/ui/card";

type ContextAnchorInlineProps = {
  mode: "inline";
  label: string;
  bearing?: string;
  className?: string;
  style?: CSSProperties;
};

type ContextAnchorSpineProps = {
  mode: "spine";
  label: string;
  subtitle?: string;
  href?: string;
  onNavigate?: () => void;
  width?: number;
};

export type ContextAnchorProps =
  | ContextAnchorInlineProps
  | ContextAnchorSpineProps;

export function ContextAnchor(props: ContextAnchorProps) {
  if (props.mode === "inline") {
    const { label, bearing, className, style } = props;
    return (
      <span
        className={`sigil-section-label ${className ?? ""}`}
        style={style}
      >
        {bearing && (
          <span style={{ color: "var(--dawn-50)", marginRight: "var(--space-xs)" }}>
            {bearing}
          </span>
        )}
        {label}
      </span>
    );
  }

  const { label, subtitle, href, onNavigate, width } = props;

  return (
    <div style={{ width }}>
      <div style={{ display: "inline-flex", flexDirection: "column" }}>
        <div
          data-journey-selected
          onClick={() => {
            if (href && onNavigate) onNavigate();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            background: "var(--surface-0)",
            border: "1px solid var(--dawn-08)",
            cursor: href ? "pointer" : undefined,
            transition: "border-color 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--gold-30)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--dawn-08)";
          }}
        >
          <CardTitle
            fontSize="12px"
            color="var(--gold)"
            action={href ? <CardArrowAction active /> : undefined}
          >
            {label}
          </CardTitle>
        </div>
        <div style={{ borderBottom: "1px solid var(--dawn-08)", marginTop: 10 }} />
      </div>

      {subtitle && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "17px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--gold)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "block",
            marginTop: 14,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
