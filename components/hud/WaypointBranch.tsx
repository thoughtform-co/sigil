"use client";

import { createPortal } from "react-dom";
import { useNavSpine } from "@/context/NavSpineContext";
import { NAV_SPINE_CARD_WIDTH } from "@/components/hud/NavigationFrame";
import type { SessionItem } from "@/components/generation/types";
import { useEffect, useState } from "react";

const THUMB = 64;
const INDENT = 40;
const TREE_GUTTER = 18;
const EXPANDED_W = NAV_SPINE_CARD_WIDTH - INDENT - TREE_GUTTER;

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
function toRoman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

type WaypointBranchProps = {
  sessions: SessionItem[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onSessionCreate: (type: "image" | "video") => void;
  onSessionDelete: (id: string) => void;
  mode: "image" | "video";
  sessionThumbnails?: Record<string, string>;
  busy: boolean;
};

export function WaypointBranch({
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  mode,
  sessionThumbnails,
  busy,
}: WaypointBranchProps) {
  const { portalRef } = useNavSpine();
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  if (!mounted || !portalRef.current) return null;

  const content = (
    <div style={{ marginTop: 12 }}>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxHeight: "50vh",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 2,
        }}
        className="waypoint-branch-scroll"
      >
        {sessions.length === 0 && (
          <li
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--dawn-30)",
              paddingLeft: TREE_GUTTER,
              animation: "spineTelemetryIn 300ms ease forwards",
            }}
          >
            [ NO TELEMETRY ]
          </li>
        )}

        {sessions.map((session, idx) => {
          const isActive = activeSessionId === session.id;
          const isHovered = hoveredId === session.id;
          const isLast = idx === sessions.length - 1 && sessions.length > 0;
          const thumbUrl = sessionThumbnails?.[session.id];
          const firstExtend = idx === 0 ? 14 : 0;
          const svgH = THUMB / 2 + 8 + firstExtend;
          return (
            <li
              key={session.id}
              style={{
                position: "relative",
                paddingLeft: TREE_GUTTER,
                opacity: 0,
                animation: `spineTelemetryIn 250ms ease ${idx * 60}ms forwards`,
              }}
            >
              <svg
                aria-hidden
                width={TREE_GUTTER}
                height={svgH}
                viewBox={`0 0 ${TREE_GUTTER} ${svgH}`}
                fill="none"
                style={{ position: "absolute", left: 2, top: -7 - firstExtend }}
              >
                <path
                  d={`M0 0V${svgH - 1}H${TREE_GUTTER - 1}`}
                  stroke="var(--dawn-15)"
                  strokeWidth="1"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {!isLast && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 2,
                    top: THUMB / 2,
                    bottom: -7,
                    width: 1,
                    background: "var(--dawn-15)",
                  }}
                />
              )}
              <WaypointThumb
                thumbUrl={thumbUrl}
                isActive={isActive}
                isHovered={isHovered}
                onSelect={() => onSessionSelect(session.id)}
                onDelete={() => onSessionDelete(session.id)}
                onHoverChange={(h) => setHoveredId(h ? session.id : null)}
                busy={busy}
                index={idx + 1}
              />
            </li>
          );
        })}

        {/* Create new waypoint */}
        <li
          style={{
            position: "relative",
            paddingLeft: TREE_GUTTER,
            opacity: 0,
            animation: `spineTelemetryIn 250ms ease ${sessions.length * 60}ms forwards`,
          }}
        >
          <svg
            aria-hidden
            width={TREE_GUTTER}
            height="30"
            viewBox={`0 0 ${TREE_GUTTER} 30`}
            fill="none"
            style={{ position: "absolute", left: 2, top: -7 }}
          >
            <path
              d={`M0 0V29H${TREE_GUTTER - 1}`}
              stroke="var(--dawn-15)"
              strokeWidth="1"
              strokeLinecap="square"
              strokeLinejoin="miter"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <button
            type="button"
            onClick={() => onSessionCreate(mode)}
            disabled={busy}
            style={{
              width: THUMB,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px dashed var(--dawn-15)",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.5 : 1,
              transition: "border-color 120ms ease, background 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.borderColor = "var(--gold)";
                e.currentTarget.style.borderStyle = "solid";
                e.currentTarget.style.background = "rgba(202, 165, 84, 0.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--dawn-15)";
              e.currentTarget.style.borderStyle = "dashed";
              e.currentTarget.style.background = "transparent";
            }}
            aria-label="New waypoint"
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "16px",
                color: "var(--dawn-40)",
                lineHeight: 1,
              }}
            >
              +
            </span>
          </button>
        </li>
      </ul>
    </div>
  );

  return createPortal(content, portalRef.current);
}

/* ── Single waypoint — expand-on-hover ─────────────────────── */

function WaypointThumb({
  thumbUrl,
  isActive,
  isHovered,
  onSelect,
  onDelete,
  onHoverChange,
  busy,
  index,
}: {
  thumbUrl?: string;
  isActive: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onHoverChange: (hovered: boolean) => void;
  busy: boolean;
  index: number;
}) {
  const label = `Waypoint ${toRoman(index)}`;
  const w = isHovered ? EXPANDED_W : THUMB;

  return (
    <div
      data-waypoint-active={isActive ? "true" : undefined}
      style={{
        position: "relative",
        width: w,
        height: THUMB,
        overflow: "hidden",
        border: isActive ? "1px solid var(--gold)" : "1px solid var(--dawn-08)",
        background: "var(--surface-0)",
        cursor: "pointer",
        transition: "width 300ms ease-out, border-color 120ms ease",
      }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={onSelect}
    >
      {isActive && (
        <>
          <div style={{ position: "absolute", top: -2, left: -2, width: 4, height: 4, borderTop: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)", zIndex: 10 }} />
          <div style={{ position: "absolute", top: -2, right: -2, width: 4, height: 4, borderTop: "1px solid var(--gold)", borderRight: "1px solid var(--gold)", zIndex: 10 }} />
          <div style={{ position: "absolute", bottom: -2, left: -2, width: 4, height: 4, borderBottom: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)", zIndex: 10 }} />
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 4, height: 4, borderBottom: "1px solid var(--gold)", borderRight: "1px solid var(--gold)", zIndex: 10 }} />
        </>
      )}

      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* Thumbnail region */}
        <div style={{ width: THUMB - 2, height: THUMB - 2, flexShrink: 0, overflow: "hidden" }}>
          {thumbUrl ? (
            thumbUrl.match(/\.(webm|mp4|mov)$/i) ? (
              <video
                src={thumbUrl}
                muted
                preload="metadata"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumbUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface-1)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "14px",
                  color: "var(--dawn-15)",
                }}
              >
                ◇
              </span>
            </div>
          )}
        </div>

        {/* Expanded content: name + delete */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            opacity: isHovered ? 1 : 0,
            transition: "opacity 200ms ease",
            pointerEvents: isHovered ? "auto" : "none",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dawn)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={busy}
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--dawn-15)",
              color: "var(--dawn-50)",
              cursor: "pointer",
              padding: 0,
              transition: "border-color 120ms ease, color 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(139, 90, 90, 0.6)";
              e.currentTarget.style.color = "var(--alert)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--dawn-15)";
              e.currentTarget.style.color = "var(--dawn-50)";
            }}
            aria-label={`Delete ${label}`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
