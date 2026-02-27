"use client";

import Link from "next/link";
import { ImageDiskStack, type ImageDiskStackImage } from "./ImageDiskStack";

export type JourneyCardItem = {
  id: string;
  name: string;
  description: string | null;
  type?: string;
  routeCount: number;
  generationCount: number;
  routes: { id: string; name: string; updatedAt: string; waypointCount: number }[];
  thumbnails: ImageDiskStackImage[];
};

type JourneyCardProps = {
  journey: JourneyCardItem;
};

export function JourneyCard({ journey }: JourneyCardProps) {
  return (
    <Link
      href={`/journeys/${journey.id}`}
      className="group relative block overflow-hidden transition-all"
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--dawn-08)",
        padding: "20px",
        transitionDuration: "var(--duration-base)",
        transitionTimingFunction: "var(--ease-out)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "var(--space-md)",
        alignItems: "start",
      }}
    >
      {/* Corner accents — visible on hover */}
      <span
        className="pointer-events-none absolute -left-px -top-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderTop: "1px solid var(--gold)",
          borderLeft: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />
      <span
        className="pointer-events-none absolute -right-px -top-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderTop: "1px solid var(--gold)",
          borderRight: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />
      <span
        className="pointer-events-none absolute -bottom-px -left-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderBottom: "1px solid var(--gold)",
          borderLeft: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />
      <span
        className="pointer-events-none absolute -bottom-px -right-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          width: "14px",
          height: "14px",
          borderBottom: "1px solid var(--gold)",
          borderRight: "1px solid var(--gold)",
          transitionDuration: "var(--duration-base)",
        }}
      />

      {/* Left: metadata */}
      <div style={{ minWidth: 0 }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--dawn)",
              }}
            >
              {journey.name}
            </h2>
            {journey.type === "learn" && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "8px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  border: "1px solid var(--gold-15)",
                  padding: "1px 4px",
                  flexShrink: 0,
                }}
              >
                learn
              </span>
            )}
          </div>
          <span
            className="transition-colors group-hover:text-[var(--gold)]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--dawn-70)",
              flexShrink: 0,
              transitionDuration: "var(--duration-fast)",
            }}
          >
            open &rarr;
          </span>
        </div>

        {journey.description ? (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              lineHeight: "1.6",
              color: "var(--dawn-50)",
              marginBottom: "16px",
            }}
          >
            {journey.description}
          </p>
        ) : null}

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--dawn-70)",
            borderTop: "1px solid var(--dawn-08)",
            paddingTop: "12px",
          }}
        >
          <span style={{ display: "block", marginBottom: "4px" }}>
            {journey.routeCount} route{journey.routeCount !== 1 ? "s" : ""}
          </span>
          <span style={{ display: "block" }}>
            {journey.generationCount} generation{journey.generationCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Right: image stack */}
      <ImageDiskStack images={journey.thumbnails} size="sm" />
    </Link>
  );
}
