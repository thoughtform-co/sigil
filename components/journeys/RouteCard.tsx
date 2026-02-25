"use client";

import Link from "next/link";
import { ImageDiskStack } from "./ImageDiskStack";

export type RouteCardItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  thumbnailUrl: string | null;
};

type RouteCardProps = {
  route: RouteCardItem;
};

export function RouteCard({ route }: RouteCardProps) {
  const thumbnails = route.thumbnailUrl
    ? [
        {
          id: route.id,
          fileUrl: route.thumbnailUrl,
          fileType: "image/png",
          width: null as number | null,
          height: null as number | null,
        },
      ]
    : [];

  return (
    <Link
      href={`/routes/${route.id}/image`}
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
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn)",
            }}
          >
            {route.name}
          </h2>
          <span
            className="transition-colors group-hover:text-[var(--gold)]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--dawn-30)",
              flexShrink: 0,
              transitionDuration: "var(--duration-fast)",
            }}
          >
            open &rarr;
          </span>
        </div>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            lineHeight: "1.6",
            color: "var(--dawn-50)",
            marginBottom: "16px",
          }}
        >
          {route.description ?? "No description"}
        </p>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--dawn-30)",
            borderTop: "1px solid var(--dawn-08)",
            paddingTop: "12px",
          }}
        >
          <span style={{ display: "block", marginBottom: "4px" }}>
            {route.waypointCount} waypoint{route.waypointCount !== 1 ? "s" : ""}
          </span>
          updated {new Date(route.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Right: image stack */}
      <ImageDiskStack images={thumbnails} size="md" />
    </Link>
  );
}
