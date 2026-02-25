"use client";

export type RoutePanelItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  generationCount: number;
  thumbnails: { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[];
};

type RoutePanelProps = {
  routes: RoutePanelItem[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
};

function SectionHeader({ bearing, label }: { bearing: string; label: string }) {
  return (
    <div
      style={{
        paddingBottom: "var(--space-sm)",
        borderBottom: "1px solid var(--dawn-08)",
        marginBottom: "var(--space-md)",
      }}
    >
      <h2 className="sigil-section-label">
        <span style={{ color: "var(--dawn-30)", marginRight: "var(--space-xs)" }}>{bearing}</span>
        {label}
      </h2>
    </div>
  );
}

export function RoutePanel({ routes, selectedRouteId, onSelectRoute }: RoutePanelProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <SectionHeader bearing="02" label="ROUTES" />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {routes.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--dawn-30)",
              textAlign: "center",
              padding: "var(--space-xl)",
            }}
          >
            No routes in this journey
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {routes.map((route) => {
              const isSelected = selectedRouteId === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => onSelectRoute(route.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 2,
                    width: "100%",
                    padding: "var(--space-sm) var(--space-md)",
                    background: isSelected ? "var(--gold-10)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--dawn-04)",
                    borderLeft: "2px solid " + (isSelected ? "var(--gold)" : "transparent"),
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background 80ms, border-color 80ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "var(--dawn-04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--dawn)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {route.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--space-sm)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--dawn-30)",
                      }}
                    >
                      {route.waypointCount} wp · {route.generationCount} gen
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        color: "var(--dawn-30)",
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      {new Date(route.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
