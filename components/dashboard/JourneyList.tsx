"use client";

import { useState } from "react";
import Link from "next/link";

type RouteItem = {
  id: string;
  name: string;
  updatedAt: string;
  waypointCount: number;
};

type JourneyItem = {
  id: string;
  name: string;
  description: string | null;
  routeCount: number;
  generationCount: number;
  routes: RouteItem[];
};

type JourneyListProps = {
  journeys: JourneyItem[];
};

function Diamond() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        background: "var(--gold)",
        transform: "rotate(45deg)",
        flexShrink: 0,
      }}
    />
  );
}

function DiamondMuted() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 5,
        height: 5,
        background: "var(--dawn-30)",
        transform: "rotate(45deg)",
        flexShrink: 0,
      }}
    />
  );
}

export function JourneyList({ journeys }: JourneyListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (journeys.length === 0) {
    return (
      <div>
        <h2 className="sigil-section-label" style={{ marginBottom: "var(--space-sm)" }}>
          journeys
        </h2>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--dawn-30)",
          }}
        >
          No journeys assigned
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="sigil-section-label" style={{ marginBottom: "var(--space-sm)", textAlign: "left" }}>
        journeys
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {journeys.map((journey) => {
          const isExpanded = expandedId === journey.id;
          return (
            <div
              key={journey.id}
              style={{
                borderBottom: "1px solid var(--dawn-04)",
              }}
            >
              <Link
                href={`/journeys/${journey.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 0",
                  textDecoration: "none",
                  transition: "background 80ms ease, color 80ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--dawn-04)";
                  e.currentTarget.style.color = "var(--dawn)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "";
                }}
              >
                <Diamond />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--dawn-70)",
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
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "var(--dawn-30)",
                    flexShrink: 0,
                  }}
                >
                  {journey.routeCount} routes
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpandedId(isExpanded ? null : journey.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--dawn-30)",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    flexShrink: 0,
                  }}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? "−" : "+"}
                </button>
              </Link>
              {isExpanded && journey.routes.length > 0 && (
                <div
                  style={{
                    paddingLeft: "var(--space-sm)",
                    paddingBottom: "10px",
                  }}
                >
                  {journey.routes.map((route) => (
                    <Link
                      key={route.id}
                      href={`/routes/${route.id}/image`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 0",
                        textDecoration: "none",
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "var(--dawn-50)",
                        transition: "color 80ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--dawn-70)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--dawn-50)";
                      }}
                    >
                      <DiamondMuted />
                      <span style={{ flex: 1 }}>{route.name}</span>
                      <span
                        style={{
                          fontSize: "9px",
                          color: "var(--dawn-30)",
                          flexShrink: 0,
                        }}
                      >
                        {new Date(route.updatedAt).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
