"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const THEME_KEY = "sigil-theme";
const NAV_COLLAPSED_KEY = "sigil-nav-collapsed";
const GRID = 3;
const ICON_SIZE = 18;

type NavigationFrameProps = {
  children: ReactNode;
  title?: string;
  modeLabel?: string;
  showNavPanel?: boolean;
};

const RAIL_WIDTH = 48;
const TICK_COUNT = 20;
const TICK_LABELS: Record<number, string> = {
  0: "0",
  5: "2",
  10: "5",
  15: "7",
  20: "10",
};

const NAV_PANEL_WIDTH = 180;
const SIDEBAR_ITEMS: { href: string; label: string; separator?: boolean }[] = [
  { href: "/projects", label: "projects" },
  { href: "/briefings", label: "briefings" },
  { href: "/analytics", label: "analytics", separator: true },
  { href: "/bookmarks", label: "bookmarks" },
  { href: "/admin", label: "settings" },
];

type Pixel = { x: number; y: number; alpha: number };

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

function bookmarkPixels(): Pixel[] {
  const c = ICON_SIZE / 2;
  const r = 5;
  const pts: Pixel[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r), y: snap(c + Math.sin(a) * r), alpha: 0.9 });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    pts.push({ x: snap(c + Math.cos(a) * r * 0.5), y: snap(c + Math.sin(a) * r * 0.5), alpha: 0.65 });
  }
  pts.push({ x: snap(c), y: snap(c), alpha: 1 });
  return pts;
}

function settingsPixels(): Pixel[] {
  const c = ICON_SIZE / 2;
  const r = 5;
  const pts: Pixel[] = [];
  for (let d = -r; d <= r; d += GRID) {
    if (d !== 0) {
      pts.push({ x: snap(c + d), y: snap(c), alpha: 0.85 });
      pts.push({ x: snap(c), y: snap(c + d), alpha: 0.85 });
    }
  }
  pts.push({ x: snap(c - r), y: snap(c - r), alpha: 0.7 });
  pts.push({ x: snap(c + r), y: snap(c - r), alpha: 0.7 });
  pts.push({ x: snap(c - r), y: snap(c + r), alpha: 0.7 });
  pts.push({ x: snap(c + r), y: snap(c + r), alpha: 0.7 });
  pts.push({ x: snap(c), y: snap(c), alpha: 1 });
  return pts;
}

function themePixels(isLight: boolean): Pixel[] {
  const c = ICON_SIZE / 2;
  const pts: Pixel[] = [];
  if (isLight) {
    const r = 4;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: snap(c + Math.cos(a) * r), y: snap(c + Math.sin(a) * r), alpha: 0.8 });
    }
    pts.push({ x: snap(c), y: snap(c), alpha: 0.5 });
  } else {
    const r = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: snap(c + Math.cos(a) * r), y: snap(c + Math.sin(a) * r), alpha: 0.85 });
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      pts.push({ x: snap(c + Math.cos(a) * (r + GRID)), y: snap(c + Math.sin(a) * (r + GRID)), alpha: 0.5 });
    }
    pts.push({ x: snap(c), y: snap(c), alpha: 1 });
  }
  return pts;
}

const DAWN_DARK = "236, 227, 214";
const DAWN_LIGHT = "17, 15, 9";
const GOLD_DARK = "202, 165, 84";
const GOLD_LIGHT = "154, 122, 46";

function ParticleIcon({ pixels, active = false, light = false }: { pixels: Pixel[]; active?: boolean; light?: boolean }) {
  const rgb = active ? (light ? GOLD_LIGHT : GOLD_DARK) : (light ? DAWN_LIGHT : DAWN_DARK);
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
      aria-hidden="true"
      style={{ display: "block", imageRendering: "pixelated" }}
    >
      {pixels.map((px, i) => (
        <rect
          key={`${px.x}-${px.y}-${i}`}
          x={px.x}
          y={px.y}
          width={GRID - 1}
          height={GRID - 1}
          fill={`rgba(${rgb}, ${px.alpha})`}
        />
      ))}
    </svg>
  );
}

export function NavigationFrame({
  children,
  title = "SIGIL",
  showNavPanel = true,
}: NavigationFrameProps) {
  const pathname = usePathname();
  const [isLight, setIsLight] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const isWorkspace = !showNavPanel;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      const wantLight = saved === "light";
      setIsLight(wantLight);
      if (wantLight) document.documentElement.classList.add("light");
      else document.documentElement.classList.remove("light");
    } catch {
      // ignore
    }
    try {
      const collapsed = localStorage.getItem(NAV_COLLAPSED_KEY);
      if (collapsed === "true") setNavCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleTheme() {
    try {
      const next = !isLight;
      setIsLight(next);
      if (next) {
        document.documentElement.classList.add("light");
        localStorage.setItem(THEME_KEY, "light");
      } else {
        document.documentElement.classList.remove("light");
        localStorage.setItem(THEME_KEY, "dark");
      }
    } catch {
      // ignore
    }
  }

  function toggleNav() {
    const next = !navCollapsed;
    setNavCollapsed(next);
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, String(next));
    } catch {
      // ignore
    }
  }

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setIsScrolling(false), 800);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, [handleScroll]);

  const bookmarkPx = useMemo(() => bookmarkPixels(), []);
  const settingsPx = useMemo(() => settingsPixels(), []);
  const themePx = useMemo(() => themePixels(isLight), [isLight]);

  const isBookmarksActive = pathname === "/bookmarks" || pathname.startsWith("/bookmarks/");
  const isSettingsActive = pathname === "/admin" || pathname.startsWith("/admin/");

  const panelVisible = !navCollapsed;

  return (
    <div className="relative min-h-screen bg-void text-dawn dot-grid-bg">
      <div className="hud-corner hud-corner-tl" />
      <div className="hud-corner hud-corner-tr" />
      <div className="hud-corner hud-corner-bl" />
      <div className="hud-corner hud-corner-br" />

      {/* Left rail */}
      <aside
        className="hud-rail-tick fixed z-30 pointer-events-none"
        style={{
          top: "calc(var(--hud-padding) + 32px)",
          bottom: "calc(var(--hud-padding) + 32px)",
          left: "var(--hud-padding)",
          width: RAIL_WIDTH,
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-[1px]"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, var(--dawn-30) 10%, var(--dawn-30) 90%, transparent 100%)",
          }}
        />
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between">
          {Array.from({ length: TICK_COUNT + 1 }).map((_, i) => {
            const isCorner = i === 0 || i === TICK_COUNT;
            const isMajor = i % 5 === 0 && !isCorner;
            return (
              <div key={i} className="relative">
                <div
                  style={{
                    height: 1,
                    width: isMajor ? 20 : 10,
                    background: isMajor ? "var(--gold)" : "var(--gold-30)",
                  }}
                />
                {TICK_LABELS[i] && !isCorner && (
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
        data-hud-rail="right"
        className="hud-rail-tick fixed z-30 pointer-events-none"
        style={{
          top: "calc(var(--hud-padding) + 32px)",
          bottom: "calc(var(--hud-padding) + 32px)",
          right: "var(--hud-padding)",
          width: RAIL_WIDTH,
        }}
      >
        <div
          className="absolute right-0 top-0 bottom-0 w-[1px]"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, var(--dawn-30) 10%, var(--dawn-30) 90%, transparent 100%)",
          }}
        />
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between items-end">
          {Array.from({ length: TICK_COUNT + 1 }).map((_, i) => {
            const isCorner = i === 0 || i === TICK_COUNT;
            const isMajor = i % 5 === 0 && !isCorner;
            return (
              <div
                key={i}
                style={{
                  height: 1,
                  width: isMajor ? 20 : 10,
                  background: isMajor ? "var(--gold)" : "var(--gold-30)",
                  opacity: isMajor ? (isScrolling ? 1 : 0) : 1,
                  transition: isMajor ? "opacity 400ms ease" : undefined,
                }}
              />
            );
          })}
        </div>
      </aside>

      {/* Unified left nav panel -- SIGIL badge always visible, items collapse vertically */}
      <nav
        className="sigil-nav-panel fixed z-30 pointer-events-auto"
        style={{
          top: "var(--hud-padding)",
          left: `calc(var(--hud-padding) + ${RAIL_WIDTH}px + 4px)`,
          width: NAV_PANEL_WIDTH,
          display: "flex",
          flexDirection: "column",
          background: "transparent",
        }}
      >
        {/* SIGIL badge — always visible, links to /projects, toggle on right */}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <Link
            href="/projects"
            style={{
              flex: 1,
              background: "var(--gold)",
              color: "var(--void)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "8px 12px",
              textDecoration: "none",
              clipPath: "polygon(0% 0%, calc(100% - 12px) 0%, 100% 12px, 100% 100%, 0% 100%)",
            }}
          >
            {title}
          </Link>
          <button
            type="button"
            onClick={toggleNav}
            style={{
              width: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: "var(--dawn-30)",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              padding: 0,
              transition: "color 100ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gold)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--dawn-30)"; }}
            title={panelVisible ? "Collapse nav" : "Expand nav"}
            aria-label={panelVisible ? "Collapse navigation" : "Expand navigation"}
          >
            {panelVisible ? "▴" : "▾"}
          </button>
        </div>

        {/* Collapsible nav items — vertical slide */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: panelVisible ? "600px" : "0px",
            opacity: panelVisible ? 1 : 0,
            transition: "max-height 120ms cubic-bezier(0.16, 1, 0.3, 1), opacity 100ms ease",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              paddingTop: "24px",
            }}
          >
            {SIDEBAR_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-all"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "11px 12px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: isActive ? "var(--gold)" : "var(--dawn-40)",
                      textDecoration: "none",
                      position: "relative",
                      transitionDuration: "var(--duration-fast)",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--dawn-70)";
                        e.currentTarget.style.background = "var(--dawn-04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--dawn-40)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          left: -1,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 2,
                          height: 16,
                          background: "var(--gold)",
                        }}
                      />
                    )}
                    {item.label}
                  </Link>
                  {item.separator && (
                    <div style={{ height: 1, background: "var(--dawn-12)", margin: "6px 0" }} />
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </nav>

      {/* Top-right utility icons — bookmarks, settings, theme */}
      <nav
        className="fixed z-40 pointer-events-auto"
        style={{
          top: "var(--hud-padding)",
          right: `calc(var(--hud-padding) + ${RAIL_WIDTH}px + 4px)`,
          display: "flex",
          gap: "12px",
          alignItems: "center",
          height: "33px",
        }}
      >
        <Link
          href="/bookmarks"
          style={{ textDecoration: "none", opacity: isBookmarksActive ? 1 : 0.7 }}
          className="transition-opacity hover:opacity-100"
          title="Bookmarks"
        >
          <ParticleIcon pixels={bookmarkPx} active={isBookmarksActive} light={isLight} />
        </Link>

        <Link
          href="/admin"
          style={{ textDecoration: "none", opacity: isSettingsActive ? 1 : 0.7 }}
          className="transition-opacity hover:opacity-100"
          title="Settings"
        >
          <ParticleIcon pixels={settingsPx} active={isSettingsActive} light={isLight} />
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="transition-opacity hover:opacity-100"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            opacity: 0.7,
          }}
          title={isLight ? "Switch to dark" : "Switch to light"}
        >
          <ParticleIcon pixels={themePx} light={isLight} />
        </button>
      </nav>

      <main
        className={`hud-shell ${isWorkspace ? "hud-shell--workspace" : ""}`}
        style={{
          paddingLeft: isWorkspace
            ? `calc(var(--hud-padding) + ${RAIL_WIDTH}px + 8px)`
            : `calc(var(--hud-padding) + ${RAIL_WIDTH}px + ${NAV_PANEL_WIDTH}px + 8px)`,
          paddingRight: `calc(var(--hud-padding) + 20px)`,
          ...(isWorkspace ? { paddingTop: 0 } : {}),
        }}
      >
        {children}
      </main>
    </div>
  );
}
