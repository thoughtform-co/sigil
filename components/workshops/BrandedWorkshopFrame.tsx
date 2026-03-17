"use client";

import { ReactNode, useEffect, useRef } from "react";

const RAIL_WIDTH = 48;
const TICK_COUNT = 24;
const MAJOR_INDICES = new Set([6, 12, 18]);
const TICK_LABELS: Record<number, string> = {
  6: "2",
  12: "5",
  18: "7",
};

type BrandedWorkshopFrameProps = {
  children: ReactNode;
};

export function BrandedWorkshopFrame({ children }: BrandedWorkshopFrameProps) {
  const rightRailRef = useRef<HTMLElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Corner brackets */}
      <div className="hud-corner hud-corner-tl" />
      <div className="hud-corner hud-corner-tr" />
      <div className="hud-corner hud-corner-bl" />
      <div className="hud-corner hud-corner-br" />

      {/* Left rail */}
      <aside
        className="hud-rail-tick fixed z-30 pointer-events-none"
        style={{
          top: "calc(var(--hud-padding) + 24px)",
          bottom: "calc(var(--hud-padding) + 24px)",
          left: "var(--hud-padding)",
          width: RAIL_WIDTH,
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-[1px]"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, var(--dawn-30) 10%, var(--dawn-30) 90%, transparent 100%)",
          }}
        />
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between">
          {Array.from({ length: TICK_COUNT + 1 }).map((_, i) => {
            const isMajor = MAJOR_INDICES.has(i);
            return (
              <div key={i} className="relative">
                <div
                  style={{
                    height: 1,
                    width: isMajor ? 20 : 10,
                    background: isMajor ? "var(--gold)" : "var(--gold-30)",
                  }}
                />
                {TICK_LABELS[i] && (
                  <span
                    className="absolute text-[9px]"
                    style={{
                      top: -4,
                      left: 28,
                      color: "var(--dawn-30)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {TICK_LABELS[i]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right rail */}
      <aside
        ref={rightRailRef}
        data-hud-rail="right"
        className="hud-rail-tick fixed z-30 pointer-events-none"
        style={{
          top: "calc(var(--hud-padding) + 24px)",
          bottom: "calc(var(--hud-padding) + 24px)",
          right: "var(--hud-padding)",
          width: RAIL_WIDTH,
        }}
      >
        <div
          className="absolute right-0 top-0 bottom-0 w-[1px]"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, var(--dawn-30) 10%, var(--dawn-30) 90%, transparent 100%)",
          }}
        />
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between items-end">
          {Array.from({ length: TICK_COUNT + 1 }).map((_, i) => {
            const isMajor = MAJOR_INDICES.has(i);
            return (
              <div
                key={i}
                className={isMajor ? "rail-major-tick" : undefined}
                style={{
                  height: 1,
                  width: isMajor ? 20 : 10,
                  background: isMajor ? "var(--gold)" : "var(--gold-30)",
                  opacity: isMajor ? 0 : 1,
                  transition: isMajor ? "opacity 400ms ease" : undefined,
                }}
              />
            );
          })}
        </div>
      </aside>

      {children}
    </div>
  );
}

export { RAIL_WIDTH };
