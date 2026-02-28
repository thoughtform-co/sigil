import type { ReactNode, CSSProperties, ElementType } from "react";

type CardFrameProps = {
  as?: ElementType;
  href?: string;
  onClick?: () => void;
  chamfer?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const CORNER_STYLE: CSSProperties = {
  position: "absolute",
  width: 14,
  height: 14,
  pointerEvents: "none",
  opacity: 0,
  transitionProperty: "opacity",
  transitionDuration: "var(--duration-base)",
};

const CHAMFER_CLIP =
  "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)";

export function CardFrame({
  as: Tag = "div",
  href,
  onClick,
  chamfer = false,
  children,
  className,
  style,
}: CardFrameProps) {
  const baseStyle: CSSProperties = {
    position: "relative",
    display: "block",
    overflow: "hidden",
    background: "var(--surface-0)",
    border: "1px solid var(--dawn-08)",
    padding: "12px 20px 20px",
    transitionProperty: "border-color, background",
    transitionDuration: "var(--duration-base)",
    transitionTimingFunction: "var(--ease-out)",
    ...(chamfer ? { clipPath: CHAMFER_CLIP } : {}),
    ...style,
  };

  const props: Record<string, unknown> = {
    className: `group ${className ?? ""}`.trim(),
    style: baseStyle,
    ...(href ? { href } : {}),
    ...(onClick ? { onClick } : {}),
  };

  return (
    <Tag {...props}>
      <span
        className="pointer-events-none absolute opacity-0 transition-opacity group-hover:opacity-100"
        style={{ ...CORNER_STYLE, top: -1, left: -1, borderTop: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)" }}
      />
      <span
        className="pointer-events-none absolute opacity-0 transition-opacity group-hover:opacity-100"
        style={{ ...CORNER_STYLE, top: -1, right: -1, borderTop: "1px solid var(--gold)", borderRight: "1px solid var(--gold)" }}
      />
      <span
        className="pointer-events-none absolute opacity-0 transition-opacity group-hover:opacity-100"
        style={{ ...CORNER_STYLE, bottom: -1, left: -1, borderBottom: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)" }}
      />
      <span
        className="pointer-events-none absolute opacity-0 transition-opacity group-hover:opacity-100"
        style={{ ...CORNER_STYLE, bottom: -1, right: -1, borderBottom: "1px solid var(--gold)", borderRight: "1px solid var(--gold)" }}
      />
      {children}
    </Tag>
  );
}
