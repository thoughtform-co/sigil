"use client";

type AdminStatRow = {
  displayName: string;
  imageCount: number;
  videoCount: number;
};

type AdminStatsPanelProps = {
  stats: AdminStatRow[];
};

export function AdminStatsPanel({ stats }: AdminStatsPanelProps) {
  if (stats.length === 0) {
    return (
      <div style={{ marginTop: "var(--space-md)" }}>
        <h2 className="sigil-section-label" style={{ marginBottom: "var(--space-sm)" }}>
          user activity
        </h2>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--dawn-30)",
          }}
        >
          No activity yet
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "var(--space-md)" }}>
      <div
        style={{
          height: 1,
          background: "var(--dawn-08)",
          margin: "var(--space-md) 0",
        }}
      />
      <h2 className="sigil-section-label" style={{ marginBottom: "var(--space-sm)", textAlign: "left" }}>
        user activity
      </h2>
      <div
        style={{
          maxHeight: 320,
          overflowY: "auto",
        }}
      >
        {stats.map((row, i) => (
          <div
            key={`${row.displayName}-${i}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--space-xs)",
              padding: "8px 0",
              borderBottom: "1px solid var(--dawn-08)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.06em",
                color: "var(--dawn)",
                background: "var(--gold-10)",
                padding: "3px 6px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {row.displayName}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.04em",
                color: "var(--dawn-70)",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {row.imageCount} img / {row.videoCount} vid
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
