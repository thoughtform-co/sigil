"use client";

import { ReactNode, useEffect, useRef } from "react";
import { TICK_MARKS } from "./grid-constants";

type HudFrameProps = {
  children: ReactNode;
  /** Chapter label displayed in top-right (e.g. "CHAPTER 01") */
  chapterLabel?: string;
  /** Pagination number displayed in bottom-right (e.g. "01") */
  paginationLabel?: string;
  /** Show the left and right rails */
  showRails?: boolean;
  /** Enable scroll-reveal behavior on right rail major ticks */
  enableScrollReveal?: boolean;
};

const railAsideStyle = {
  top: "var(--hud-rail-top)",
  bottom: "var(--hud-rail-bottom)",
  width: "var(--hud-rail-width)",
} as const;

const guideLineStyle = {
  position: "absolute" as const,
  top: "var(--hud-corner-zone)",
  bottom: "var(--hud-corner-zone)",
  width: 1,
  background:
    "linear-gradient(to bottom, transparent 0%, var(--dawn-30) 8%, var(--dawn-30) 92%, transparent 100%)",
};

export function HudFrame({
  children,
  chapterLabel,
  paginationLabel,
  showRails = true,
  enableScrollReveal = false,
}: HudFrameProps) {
  const rightRailRef = useRef<HTMLElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enableScrollReveal) return;

    function onScroll() {
      rightRailRef.current?.classList.add("rail-scrolling");
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        rightRailRef.current?.classList.remove("rail-scrolling");
      }, 800);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [enableScrollReveal]);

  return (
    <div className="relative min-h-screen">
      {/* Corner brackets */}
      <div className="hud-corner hud-corner-tl" />
      <div className="hud-corner hud-corner-tr" />
      <div className="hud-corner hud-corner-bl" />
      <div className="hud-corner hud-corner-br" />

      {/* Left rail */}
      {showRails && (
        <aside
          className="hud-rail-tick fixed z-30 pointer-events-none"
          style={{
            ...railAsideStyle,
            left: "var(--hud-margin)",
          }}
        >
          <div
            style={{
              ...guideLineStyle,
              left: "var(--hud-rail-guide-inset)",
            }}
          />
          {/* Tick container is offset by --hud-corner-zone so yPct references the guide zone */}
          <div
            className="absolute left-0 right-0"
            style={{ top: "var(--hud-corner-zone)", bottom: "var(--hud-corner-zone)" }}
          >
            {TICK_MARKS.map((tick, i) => {
              const w = tick.widthPx;
              return (
                <div
                  key={`L-${i}`}
                  className="absolute left-0 w-full"
                  style={{
                    top: `${tick.yPct}%`,
                    transform: "translateY(-50%)",
                    height: 1,
                  }}
                >
                  <div
                    style={{
                      height: 1,
                      width: w,
                      background: "var(--dawn-30)",
                      position: "absolute",
                      left: `calc(var(--hud-rail-guide-inset) - ${w}px)`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Right rail */}
      {showRails && (
        <aside
          ref={rightRailRef}
          data-hud-rail="right"
          className="hud-rail-tick fixed z-30 pointer-events-none"
          style={{
            ...railAsideStyle,
            right: "var(--hud-margin)",
          }}
        >
          <div
            style={{
              ...guideLineStyle,
              right: "var(--hud-rail-guide-inset)",
            }}
          />
          {/* Tick container offset matches guide zone */}
          <div
            className="absolute left-0 right-0"
            style={{ top: "var(--hud-corner-zone)", bottom: "var(--hud-corner-zone)" }}
          >
            {TICK_MARKS.map((tick, i) => {
              const w = tick.widthPx;
              const isMajor = tick.major;
              return (
                <div
                  key={`R-${i}`}
                  className="absolute right-0 w-full"
                  style={{
                    top: `${tick.yPct}%`,
                    transform: "translateY(-50%)",
                    height: 1,
                  }}
                >
                  <div
                    className={isMajor ? "rail-major-tick" : undefined}
                    style={{
                      height: 1,
                      width: w,
                      background: "var(--dawn-30)",
                      position: "absolute",
                      right: `calc(var(--hud-rail-guide-inset) - ${w}px)`,
                      opacity: isMajor ? 0 : 1,
                      transition: isMajor ? "opacity 400ms ease" : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Top-right chapter label */}
      {chapterLabel && (
        <div className="hud-chapter-label">
          <div className="hud-chapter-label__tick" />
          <div className="hud-chapter-label__text">{chapterLabel}</div>
        </div>
      )}

      {/* Bottom-right pagination */}
      {paginationLabel && (
        <div className="hud-pagination">{paginationLabel}</div>
      )}

      {children}
    </div>
  );
}
