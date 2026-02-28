"use client";

import { createPortal } from "react-dom";
import { useNavSpine } from "@/context/NavSpineContext";
import type { SessionItem } from "@/components/generation/types";
import { useEffect, useState } from "react";

const THUMB = 48;
const INDENT = 24;

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
  useEffect(() => setMounted(true), []);

  if (!mounted || !portalRef.current) return null;

  const content = (
    <div style={{ paddingLeft: INDENT, marginTop: 4 }}>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 5,
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
              paddingLeft: 14,
              animation: "spineTelemetryIn 300ms ease forwards",
            }}
          >
            [ NO TELEMETRY ]
          </li>
        )}

        {sessions.map((session, idx) => {
          const isActive = activeSessionId === session.id;
          const isLast = idx === sessions.length - 1 && sessions.length > 0;
          const thumbUrl = sessionThumbnails?.[session.id];
          return (
            <li
              key={session.id}
              style={{
                position: "relative",
                paddingLeft: 14,
                opacity: 0,
                animation: `spineTelemetryIn 250ms ease ${idx * 60}ms forwards`,
              }}
            >
              {/* Tree connector (L-shape) */}
              <svg
                aria-hidden
                width="14"
                height={THUMB / 2 + 6}
                viewBox={`0 0 14 ${THUMB / 2 + 6}`}
                fill="none"
                style={{
                  position: "absolute",
                  left: 2,
                  top: -5,
                }}
              >
                <path
                  d={`M0 0V${THUMB / 2 + 5}H13`}
                  stroke="var(--dawn-15)"
                  strokeWidth="1"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {/* Continuation line for non-last items */}
              {!isLast && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 2,
                    top: THUMB / 2,
                    bottom: -5,
                    width: 1,
                    background: "var(--dawn-15)",
                  }}
                />
              )}

              <WaypointThumb
                session={session}
                thumbUrl={thumbUrl}
                isActive={isActive}
                onSelect={() => onSessionSelect(session.id)}
                onDelete={() => onSessionDelete(session.id)}
                busy={busy}
              />
            </li>
          );
        })}

        {/* Create new waypoint */}
        <li
          style={{
            position: "relative",
            paddingLeft: 14,
            opacity: 0,
            animation: `spineTelemetryIn 250ms ease ${sessions.length * 60}ms forwards`,
          }}
        >
          <svg
            aria-hidden
            width="14"
            height="26"
            viewBox="0 0 14 26"
            fill="none"
            style={{
              position: "absolute",
              left: 2,
              top: -5,
            }}
          >
            <path
              d="M0 0V25H13"
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

/* ── Single waypoint thumbnail ──────────────────────────────── */

function WaypointThumb({
  session,
  thumbUrl,
  isActive,
  onSelect,
  onDelete,
  busy,
}: {
  session: SessionItem;
  thumbUrl?: string;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <div
      style={{ position: "relative", width: THUMB, height: THUMB }}
      className="group"
    >
      {/* Active state HUD brackets */}
      {isActive && (
        <>
          <div style={{ position: "absolute", top: -2, left: -2, width: 4, height: 4, borderTop: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)", zIndex: 10 }} />
          <div style={{ position: "absolute", top: -2, right: -2, width: 4, height: 4, borderTop: "1px solid var(--gold)", borderRight: "1px solid var(--gold)", zIndex: 10 }} />
          <div style={{ position: "absolute", bottom: -2, left: -2, width: 4, height: 4, borderBottom: "1px solid var(--gold)", borderLeft: "1px solid var(--gold)", zIndex: 10 }} />
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 4, height: 4, borderBottom: "1px solid var(--gold)", borderRight: "1px solid var(--gold)", zIndex: 10 }} />
        </>
      )}

      <button
        type="button"
        onClick={onSelect}
        style={{
          width: THUMB,
          height: THUMB,
          padding: 0,
          background: "transparent",
          border: isActive ? "1px solid var(--gold)" : "1px solid var(--dawn-08)",
          cursor: "pointer",
          overflow: "hidden",
          display: "block",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.borderColor = "var(--dawn-30)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.borderColor = "var(--dawn-08)";
        }}
        aria-label={session.name}
      >
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
      </button>

      {/* Delete overlay on hover */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          transition: "opacity 120ms ease",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--overlay-bg)",
        }}
        className="group-hover:opacity-100 group-hover:pointer-events-auto"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={busy}
          style={{
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-0)",
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
          aria-label={`Delete ${session.name}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Name tooltip on hover */}
      <div
        style={{
          position: "absolute",
          left: THUMB + 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "var(--surface-0)",
          border: "1px solid var(--dawn-15)",
          padding: "6px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 120ms ease",
          whiteSpace: "nowrap",
          zIndex: 20,
        }}
        className="group-hover:opacity-100"
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dawn)",
          }}
        >
          {session.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            color: "var(--dawn-30)",
          }}
        >
          {session.type}
        </span>
      </div>
    </div>
  );
}
