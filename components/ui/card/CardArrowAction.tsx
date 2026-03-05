import type { CSSProperties, MouseEvent } from "react";
import { ParticleIcon } from "../ParticleIcon";

type CardArrowActionProps = {
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  href?: string;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function CardArrowAction({
  onClick,
  active = false,
  className,
  style,
}: CardArrowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/arrow ${className ?? ""}`.trim()}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
        opacity: active ? 1 : 0.6,
        transition: "opacity 120ms ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = active ? "1" : "0.6";
      }}
    >
      <ParticleIcon glyph="arrow" size="sm" active={active} />
    </button>
  );
}
