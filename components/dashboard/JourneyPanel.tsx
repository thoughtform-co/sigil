"use client";

import { AdminStatsPanel } from "@/components/dashboard/AdminStatsPanel";

export type JourneyPanelRoute = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  generationCount: number;
  thumbnails: { id: string; fileUrl: string; fileType: string; width: number | null; height: number | null }[];
};

export type JourneyPanelItem = {
  id: string;
  name: string;
  description: string | null;
  routeCount: number;
  generationCount: number;
  routes: JourneyPanelRoute[];
};

type AdminStatRow = {
  displayName: string;
  imageCount: number;
  videoCount: number;
};

type JourneyPanelProps = {
  journeys: JourneyPanelItem[];
  selectedJourneyId: string | null;
  onSelectJourney: (id: string) => void;
  adminStats?: AdminStatRow[] | null;
  isAdmin?: boolean;
};

function Diamond({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        background: active ? "var(--gold)" : "var(--dawn-30)",
        transform: "rotate(45deg)",
        flexShrink: 0,
      }}
    />
  );
}

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

export function JourneyPanel({
  journeys,
  selectedJourneyId,
  onSelectJourney,
  adminStats,
  isAdmin,
}: JourneyPanelProps) {
  const totalGenerations = journeys.reduce((sum, j) => sum + j.generationCount, 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        paddingLeft: "var(--space-md)",
        paddingRight: "var(--space-md)",
      }}
    >
      <SectionHeader bearing="01" label="JOURNEYS" />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {journeys.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--dawn-30)",
            }}
          >
            No journeys assigned
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {journeys.map((journey) => {
              const isSelected = selectedJourneyId === journey.id;
              return (
                <button
                  key={journey.id}
                  type="button"
                  onClick={() => onSelectJourney(journey.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "var(--space-sm) var(--space-md)",
                    background: isSelected ? "var(--gold-10)" : "transparent",
                    border: "none",
                    borderLeft: "2px solid " + (isSelected ? "var(--gold)" : "transparent"),
                    color: isSelected ? "var(--gold)" : "var(--dawn-50)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "color 100ms, background 100ms, border-color 100ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "var(--dawn-04)";
                      e.currentTarget.style.color = "var(--dawn)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--dawn-50)";
                    }
                  }}
                >
                  <Diamond active={isSelected} />
                  <span
                    style={{
                      flex: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {journey.name}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--dawn-30)",
                      flexShrink: 0,
                    }}
                  >
                    {journey.routeCount} routes
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* StatusBar footer */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--dawn-08)",
          paddingTop: "var(--space-sm)",
          paddingLeft: "var(--space-md)",
          paddingRight: "var(--space-md)",
          paddingBottom: "var(--space-md)",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.06em",
          color: "var(--dawn-30)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-sm)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{journeys.length} journeys</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{totalGenerations} generations</span>
        </div>
        {isAdmin && adminStats && adminStats.length > 0 && (
          <div style={{ marginTop: "var(--space-xs)" }}>
            <AdminStatsPanel stats={adminStats} />
          </div>
        )}
      </div>
    </div>
  );
}
