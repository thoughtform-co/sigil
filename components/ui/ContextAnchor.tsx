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
  bearing?: string;
  subtitle?: string;
  subtitleBearing?: string;
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

  const { label, bearing, subtitle, subtitleBearing, href, onNavigate, width } = props;

  const BEARING_STYLE: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--dawn-30)",
    display: "block",
    marginBottom: 4,
  };

  return (
    <div style={{ width }}>
      {bearing && <span style={BEARING_STYLE}>{bearing}</span>}

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
        <>
          {subtitleBearing && (
            <span style={{ ...BEARING_STYLE, marginTop: 12, marginBottom: 4 }}>
              {subtitleBearing}
            </span>
          )}
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
              marginTop: subtitleBearing ? 0 : 14,
            }}
          >
            {subtitle}
          </span>
        </>
      )}
    </div>
  );
}
