"use client";

import { ImageDiskStack, type ImageDiskStackImage } from "@/components/journeys/ImageDiskStack";

type SigilPanelProps = {
  routeName: string;
  description: string | null;
  thumbnails: ImageDiskStackImage[];
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

export function SigilPanel({ routeName, description, thumbnails }: SigilPanelProps) {
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
      <SectionHeader bearing="03" label="SIGILS" />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Perspective-tilted stack */}
        <div
          style={{
            perspective: 900,
            display: "flex",
            justifyContent: "center",
            paddingTop: "var(--space-2xl)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              transform: "rotateX(8deg)",
              transformOrigin: "center bottom",
            }}
          >
            <ImageDiskStack
              images={thumbnails}
              size="md"
              perspective
            />
          </div>
        </div>

        {routeName && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--dawn-30)",
              marginTop: "var(--space-md)",
              paddingLeft: "var(--space-sm)",
              paddingRight: "var(--space-sm)",
            }}
          >
            {routeName}
          </div>
        )}

        {description && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "var(--dawn-70)",
              lineHeight: 1.5,
              marginTop: "var(--space-sm)",
              paddingLeft: "var(--space-md)",
              paddingRight: "var(--space-md)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
