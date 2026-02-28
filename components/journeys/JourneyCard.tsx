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

function ParticleArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="1" y="5" width="2" height="2" fill="currentColor" opacity="0.45" />
      <rect x="3" y="5" width="2" height="2" fill="currentColor" opacity="0.6" />
      <rect x="5" y="5" width="2" height="2" fill="currentColor" opacity="0.8" />
      <rect x="7" y="3" width="2" height="2" fill="currentColor" />
      <rect x="7" y="5" width="2" height="2" fill="currentColor" />
      <rect x="7" y="7" width="2" height="2" fill="currentColor" />
      <rect x="9" y="5" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

export function JourneyCard({ journey }: JourneyCardProps) {
  const category = journey.type === "learn" ? "learn" : "create";

  return (
    <Link
      href={`/journeys/${journey.id}`}
      className="group relative block overflow-hidden transition-all"
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--dawn-08)",
        padding: "12px 20px 20px",
        minHeight: 148,
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
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--dawn-40)",
            paddingRight: 24,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: category === "learn" ? "var(--gold)" : "var(--dawn-30)",
              transform: "rotate(45deg)",
              flexShrink: 0,
            }}
          />
          {category}
        </div>
        <div style={{ borderTop: "1px solid var(--dawn-08)", marginTop: "10px", paddingTop: "10px" }} />

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {journey.name}
          </h2>
          <span
            className="transition-colors group-hover:text-[var(--gold)]"
            style={{
              color: "var(--dawn-50)",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              transitionDuration: "var(--duration-fast)",
            }}
            aria-hidden="true"
          >
            <ParticleArrowIcon />
          </span>
        </div>

        {journey.description ? (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              lineHeight: "1.6",
              color: "var(--dawn-50)",
              marginBottom: "12px",
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
            marginTop: "auto",
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
