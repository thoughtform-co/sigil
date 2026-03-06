import type { ReactNode, CSSProperties, ElementType } from "react";

export type CardState = "default" | "selected" | "active" | "dim";
export type CardPresentation = "filled" | "line" | "ghost";

type CardFrameProps = {
  as?: ElementType;
  href?: string;
  onClick?: () => void;
  chamfer?: boolean;
  state?: CardState;
  presentation?: CardPresentation;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  prefetch?: boolean;
};

const CORNER_STYLE: CSSProperties = {
  position: "absolute",
  width: 10,
  height: 10,
  pointerEvents: "none",
  transitionProperty: "opacity",
  transitionDuration: "var(--duration-base)",
};

const CHAMFER_CLIP =
  "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)";


const STATE_STYLES: Record<CardState, CSSProperties> = {
  default: {
    background: "var(--surface-0)",
    borderColor: "var(--dawn-15)",
  },
  selected: {
    background: "var(--gold-surface)",
    borderColor: "var(--gold-30, rgba(202,165,84,0.3))",
  },
  active: {
    background: "var(--gold-surface-strong)",
    borderColor: "var(--gold)",
  },
  dim: {
    background: "var(--surface-0)",
    borderColor: "var(--dawn-04, rgba(236,227,214,0.04))",
  },
};

const CORNERS_ALWAYS_VISIBLE: Set<CardState> = new Set(["selected", "active"]);

export function CardFrame({
  as: Tag = "div",
  href,
  onClick,
  chamfer = false,
  state = "default",
  presentation = "filled",
  children,
  className,
  style,
  prefetch,
}: CardFrameProps) {
  const stateStyle = STATE_STYLES[state];
  const cornersAlwaysOn = CORNERS_ALWAYS_VISIBLE.has(state);
  const isLine = presentation === "line";
  const isGhost = presentation === "ghost";

  let baseStyle: CSSProperties;
  if (isLine) {
    baseStyle = {
      position: "relative",
      display: "block",
      background: "transparent",
      border: "none",
      padding: "0",
      transitionProperty: "color",
      transitionDuration: "var(--duration-base)",
      transitionTimingFunction: "var(--ease-out)",
      ...style,
    };
  } else if (isGhost) {
    baseStyle = {
      position: "relative",
      display: "block",
      overflow: "visible",
      background: "transparent",
      border: "1px solid transparent",
      borderColor: stateStyle.borderColor,
      padding: "12px 20px 20px",
      transitionProperty: "border-color",
      transitionDuration: "var(--duration-base)",
      transitionTimingFunction: "var(--ease-out)",
      ...(chamfer ? { clipPath: CHAMFER_CLIP } : {}),
      ...style,
    };
  } else {
    baseStyle = {
      position: "relative",
      display: "block",
      overflow: "hidden",
      background: stateStyle.background,
      border: "1px solid transparent",
      borderColor: stateStyle.borderColor,
      padding: "12px 20px 20px",
      transitionProperty: "border-color, background",
      transitionDuration: "var(--duration-base)",
      transitionTimingFunction: "var(--ease-out)",
      ...(chamfer ? { clipPath: CHAMFER_CLIP } : {}),
      ...style,
    };
  }

  const ghostCornersAlwaysOn = isGhost;
  const cornerVisibility = (cornersAlwaysOn || ghostCornersAlwaysOn)
    ? "pointer-events-none absolute opacity-100 transition-opacity"
    : "pointer-events-none absolute opacity-0 transition-opacity group-hover:opacity-100";

  const props: Record<string, unknown> = {
    className: `group ${className ?? ""}`.trim(),
    style: baseStyle,
    ...(href ? { href } : {}),
    ...(onClick ? { onClick } : {}),
    ...(prefetch !== undefined ? { prefetch } : {}),
  };

  if (isLine) {
    return (
      <Tag {...props}>
        {children}
        <div
          style={{
            borderBottom: `1px solid ${state === "selected" || state === "active" ? "var(--gold-30)" : "var(--dawn-08)"}`,
            marginTop: 6,
            transition: "border-color var(--duration-base)",
          }}
        />
      </Tag>
    );
  }

  return (
    <Tag {...props}>
      <span
        className={cornerVisibility}
        style={{ ...CORNER_STYLE, top: -1, left: -1, borderTop: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)" }}
      />
      <span
        className={cornerVisibility}
        style={{ ...CORNER_STYLE, top: -1, right: -1, borderTop: "1px solid var(--gold)", borderRight: "1px solid var(--gold)" }}
      />
      <span
        className={cornerVisibility}
        style={{ ...CORNER_STYLE, bottom: -1, left: -1, borderBottom: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)" }}
      />
      <span
        className={cornerVisibility}
        style={{ ...CORNER_STYLE, bottom: -1, right: -1, borderBottom: "1px solid var(--gold)", borderRight: "1px solid var(--gold)" }}
      />
      {children}
    </Tag>
  );
}
