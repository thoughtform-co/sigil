"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import type { DashboardRouteItem } from "./DashboardView";

type RouteCardProps = {
  route: DashboardRouteItem;
  isActive: boolean;
  onSelect: () => void;
  onNavigate: () => void;
};

const CHAMFER = 14;
const CLIP = `polygon(0 0, calc(100% - ${CHAMFER}px) 0, 100% ${CHAMFER}px, 100% 100%, ${CHAMFER}px 100%, 0 calc(100% - ${CHAMFER}px))`;

const pad = (n: number, len = 3) => String(n).padStart(len, "0");

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export function RouteCard({ route, isActive, onSelect, onNavigate }: RouteCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  const thumb = route.thumbnails[0];
  const isVideo = thumb?.fileType?.startsWith("video");
  const cardWidth = isActive ? 400 : 280;

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
        flexShrink: 0,
        cursor: "pointer",
        transition: "all 400ms cubic-bezier(0.19, 1, 0.22, 1)",
        opacity: isActive ? 1 : hovered ? 0.75 : 0.5,
      }}
      onClick={handleClick}
      onDoubleClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
                    sizes={`${cardWidth}px`}
                  />
                )}

                {/* Gradient fade into data panel */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "linear-gradient(to bottom, rgba(5,4,3,0.05) 0%, transparent 25%, transparent 55%, rgba(10,9,8,0.6) 85%, rgba(10,9,8,0.95) 100%)",
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

            {/* Diamond sockets — active only */}
            {isActive && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  gap: "5px",
                  fontSize: "9px",
                  lineHeight: 1,
                }}
              >
                {Array.from({ length: Math.min(Math.max(route.waypointCount, 1), 6) }).map((_, i) => (
                  <span
                    key={i}
                    style={{ color: i < route.thumbnails.length ? "var(--gold-30)" : "var(--dawn-15)" }}
                  >
                    ◇
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </article>
  );
}
