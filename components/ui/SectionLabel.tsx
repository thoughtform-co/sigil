import type { ReactNode } from "react";

type SectionLabelProps = {
  bearing?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function SectionLabel({
  bearing,
  children,
  className,
  style,
}: SectionLabelProps) {
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
      {children}
    </span>
  );
}
