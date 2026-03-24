/**
 * HUD Anchor component - Omkadering (Framing) icon
 * Bottom-left crosshair anchor for the Thoughtform HUD grid
 */

type HudAnchorProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function HudAnchor({ className, style }: HudAnchorProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        ...style,
      }}
      aria-label="Thoughtform navigation anchor"
    >
      {/* Omkadering icon: circled + crosshair */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
        aria-hidden="true"
      >
        {/* Circle */}
        <circle cx="8" cy="8" r="7" stroke="var(--gold)" strokeWidth="1" fill="none" />
        {/* Horizontal line */}
        <line x1="4" y1="8" x2="12" y2="8" stroke="var(--gold)" strokeWidth="1" />
        {/* Vertical line */}
        <line x1="8" y1="4" x2="8" y2="12" stroke="var(--gold)" strokeWidth="1" />
      </svg>
      {/* Horizontal dash */}
      <div
        style={{
          width: "12px",
          height: "1px",
          background: "var(--gold)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
