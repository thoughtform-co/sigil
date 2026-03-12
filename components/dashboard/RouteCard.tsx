"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import type { DashboardRouteItem } from "./DashboardView";
import { ParticleIcon } from "@/components/ui/ParticleIcon";

type RouteCardProps = {
  route: DashboardRouteItem;
  isActive: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onRename?: () => void;
  onDelete?: () => void;
};

const CHAMFER = 14;
const CLIP = `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, ${CHAMFER}px 100%, 0 calc(100% - ${CHAMFER}px))`;

const pad = (n: number, len = 3) => String(n).padStart(len, "0");

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7 3L9 5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 3H10M4.5 3V2C4.5 1.45 4.95 1 5.5 1H6.5C7.05 1 7.5 1.45 7.5 2V3M3 3L3.5 10C3.5 10.55 3.95 11 4.5 11H7.5C8.05 11 8.5 10.55 8.5 10L9 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RouteCard({ route, isActive, onSelect, onNavigate, onRename, onDelete }: RouteCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);
  const [topHovered, setTopHovered] = useState(false);

  const thumb = route.thumbnails[0];
  const isVideo = thumb?.fileType?.startsWith("video");
  const cardWidthPx = isActive ? 400 : 280;
  const cardWidth = isActive ? "min(100%, 400px)" : "min(100%, 280px)";

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive]);

  const handleClick = () => {
    if (isActive) onNavigate();
    else onSelect();
  };

  const borderFilter = isActive
    ? "drop-shadow(0 0 0.5px rgba(236,227,214,0.35)) drop-shadow(0 0 14px rgba(202,165,84,0.1))"
    : hovered
      ? "drop-shadow(0 0 0.5px rgba(236,227,214,0.2))"
      : "drop-shadow(0 0 0.5px rgba(236,227,214,0.08))";

  const separatorColor = isActive
    ? "rgba(202, 165, 84, 0.3)"
    : hovered
      ? "rgba(236, 227, 214, 0.12)"
      : "rgba(236, 227, 214, 0.08)";

  return (
    <article
      style={{
        position: "relative",
        width: cardWidth,
        maxWidth: "100%",
        flexShrink: 0,
        cursor: "pointer",
        transition: "all 400ms cubic-bezier(0.19, 1, 0.22, 1)",
        opacity: isActive ? 1 : hovered ? 0.75 : 0.5,
      }}
      onClick={handleClick}
      onDoubleClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        setTopHovered(y <= 42);
      }}
      onMouseLeave={() => {
        setHovered(false);
        setTopHovered(false);
      }}
    >
      {/* Drop-shadow border that follows the clip-path */}
      <div style={{ filter: borderFilter, transition: "filter 300ms ease" }}>
        <div
          style={{
            clipPath: CLIP,
            background: "var(--surface-0)",
            aspectRatio: "3/4",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── Image area ── */}
          <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
            {thumb ? (
              <>
                {isVideo ? (
                  <video
                    ref={videoRef}
                    src={thumb.fileUrl}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 500ms cubic-bezier(0.19, 1, 0.22, 1)",
                      transform: hovered || isActive ? "scale(1.03)" : "scale(1)",
                    }}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <Image
                    src={thumb.fileUrl}
                    alt={route.name}
                    fill
                    style={{
                      objectFit: "cover",
                      transition: "transform 500ms cubic-bezier(0.19, 1, 0.22, 1)",
                      transform: hovered || isActive ? "scale(1.03)" : "scale(1)",
                    }}
                    sizes={`${cardWidthPx}px`}
                  />
                )}

                {/* Gradient fade into data panel */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "linear-gradient(to bottom, var(--dawn-04) 0%, transparent 25%, transparent 55%, var(--overlay-bg) 85%, var(--surface-0) 100%)",
                  }}
                />

                {/* Dither / grain noise overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundImage: NOISE_SVG,
                    backgroundSize: "256px 256px",
                    opacity: 0.06,
                    mixBlendMode: "overlay",
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(180deg, var(--surface-1) 0%, var(--surface-0) 100%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "3rem",
                  color: "var(--dawn-08)",
                }}
              >
                {route.name[0]?.toUpperCase()}
              </div>
            )}

            {/* Scanlines */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
                opacity: isActive ? 1 : hovered ? 0.5 : 0,
                transition: "opacity 300ms ease",
              }}
            />

            {/* Telemetry rails — left edge, active only */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "10%",
                bottom: "20%",
                width: "3px",
                background:
                  "repeating-linear-gradient(to bottom, transparent 0px, transparent 5px, rgba(236,227,214,0.12) 5px, rgba(236,227,214,0.12) 6px)",
                opacity: isActive ? 1 : 0,
                transition: "opacity 300ms ease",
              }}
            />
          </div>

          {/* ── Data panel ── */}
          <div
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${separatorColor}`,
              padding: isActive ? "12px 14px 14px" : "10px 12px 12px",
              background: "var(--surface-0)",
              transition: "padding 300ms cubic-bezier(0.19, 1, 0.22, 1), border-color 300ms ease",
            }}
          >
            {/* Route name */}
            <h3
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: isActive ? "12px" : "10px",
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isActive ? "var(--dawn)" : "var(--dawn-70)",
                lineHeight: 1.35,
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "font-size 300ms ease, color 300ms ease",
              }}
            >
              {route.name}
            </h3>

            {/* Description — all cards, truncated */}
            {route.description && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  color: "var(--dawn-50)",
                  lineHeight: 1.4,
                  marginTop: "5px",
                  marginBottom: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: isActive ? 2 : 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  transition: "color 300ms ease",
                }}
              >
                {route.description}
              </p>
            )}

            {/* Telemetry readouts — all cards */}
            <div
              style={{
                marginTop: isActive ? "10px" : "8px",
                paddingTop: isActive ? "8px" : "6px",
                borderTop: "1px solid rgba(236, 227, 214, 0.06)",
                display: "flex",
                gap: isActive ? "16px" : "12px",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                transition: "all 300ms ease",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "7px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--dawn-30)",
                  }}
                >
                  WPT
                </div>
                <div
                  style={{
                    fontSize: isActive ? "12px" : "10px",
                    color: "var(--dawn-70)",
                    letterSpacing: "0.04em",
                    transition: "font-size 300ms ease",
                  }}
                >
                  {pad(route.waypointCount)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "7px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--dawn-30)",
                  }}
                >
                  GEN
                </div>
                <div
                  style={{
                    fontSize: isActive ? "12px" : "10px",
                    color: "var(--dawn-70)",
                    letterSpacing: "0.04em",
                    transition: "font-size 300ms ease",
                  }}
                >
                  {pad(route.generationCount)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "7px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--dawn-30)",
                  }}
                >
                  UPDT
                </div>
                <div
                  style={{
                    fontSize: isActive ? "12px" : "10px",
                    color: "var(--dawn-70)",
                    letterSpacing: "0.04em",
                    transition: "font-size 300ms ease",
                  }}
                >
                  {formatDate(route.updatedAt)}
                </div>
              </div>
            </div>

            {/* Navigate arrow — active only */}
            {isActive && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ParticleIcon glyph="arrow" size="sm" active />
                {Array.from({ length: Math.min(Math.max(route.waypointCount, 1), 6) }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 4,
                      height: 4,
                      background: i < route.thumbnails.length ? "var(--gold-30)" : "var(--dawn-15)",
                      transform: "rotate(45deg)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(onRename || onDelete) && topHovered && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            gap: 2,
            zIndex: 4,
          }}
        >
          {onRename && (
            <button
              type="button"
              title="Rename route"
              onClick={(e) => { e.stopPropagation(); onRename(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                padding: 0,
                background: "var(--void)",
                border: "1px solid var(--dawn-15)",
                color: "var(--dawn-40)",
                cursor: "pointer",
                transition: "color 80ms ease, border-color 80ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--dawn)";
                e.currentTarget.style.borderColor = "var(--dawn-30)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--dawn-40)";
                e.currentTarget.style.borderColor = "var(--dawn-15)";
              }}
            >
              <PencilIcon />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="Delete route"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                padding: 0,
                background: "var(--void)",
                border: "1px solid var(--dawn-15)",
                color: "var(--dawn-40)",
                cursor: "pointer",
                transition: "color 80ms ease, border-color 80ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--status-error, #c17f59)";
                e.currentTarget.style.borderColor = "var(--dawn-30)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--dawn-40)";
                e.currentTarget.style.borderColor = "var(--dawn-15)";
              }}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
