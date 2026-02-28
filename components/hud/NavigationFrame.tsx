"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { NavSpineProvider, useNavSpine } from "@/context/NavSpineContext";
import { SigilParticleLogo } from "./SigilParticleLogo";

const THEME_KEY = "sigil-theme";
const GRID = 3;
const ICON_SIZE = 18;

export type BreadcrumbSegment = { label: string; href?: string };

type NavigationFrameProps = {
  children: ReactNode;
  title?: string;
  modeLabel?: string;
  /** When true, main uses hud-shell--workspace (full height, own scroll). */
  workspaceLayout?: boolean;
  /** Override auto-detected breadcrumb with explicit segments. First segment becomes the back link. */
  breadcrumbOverride?: BreadcrumbSegment[];
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

const LEFT_NAV = [
  { href: "/journeys", label: "journeys" },
  { href: "/analytics", label: "analytics" },
];
const RIGHT_NAV = [
  { href: "/bookmarks", label: "bookmarks" },
  { href: "/documentation", label: "documentation" },
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

export function NavigationFrame(props: NavigationFrameProps) {
  return (
    <NavSpineProvider>
      <NavigationFrameInner {...props} />
    </NavSpineProvider>
  );
}

function NavigationFrameInner({
  children,
  workspaceLayout = false,
  breadcrumbOverride,
}: NavigationFrameProps) {
  const { portalRef } = useNavSpine();
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [isLight, setIsLight] = useState(false);

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

  const settingsPx = useMemo(() => settingsPixels(), []);
  const themePx = useMemo(() => themePixels(isLight), [isLight]);

  const isSettingsActive = pathname === "/admin" || pathname.startsWith("/admin/");

  const isNavActive = (href: string) => {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  };

  const navLinkStyle = (href: string) => {
    const isActive = isNavActive(href);
    return {
      display: "inline-flex",
      flexDirection: "column" as const,
      alignItems: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      color: isActive ? "var(--gold)" : "var(--dawn-40)",
      textDecoration: "none" as const,
      padding: "6px 12px 4px",
      position: "relative" as const,
      transition: "color var(--duration-fast)",
    };
  };

  const breadcrumb = useMemo((): { backHref: string | null; segments: BreadcrumbSegment[] } | null => {
    if (breadcrumbOverride && breadcrumbOverride.length > 0) {
      const first = breadcrumbOverride[0];
      return { backHref: first.href ?? null, segments: breadcrumbOverride };
    }

    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return null;

    if (parts[0] === "routes" && parts.length >= 3) {
      const mode = parts[2];
      return {
        backHref: null,
        segments: [{ label: "route" }, { label: mode }],
      };
    }

    if (parts[0] === "journeys" && parts.length >= 2) {
      if (parts.length >= 4 && parts[2] === "lessons") {
        return {
          backHref: `/journeys/${parts[1]}`,
          segments: [
            { label: "journey", href: `/journeys/${parts[1]}` },
            { label: "lesson" },
          ],
        };
      }
      return {
        backHref: "/journeys",
        segments: [{ label: "journeys", href: "/journeys" }],
      };
    }

    return null;
  }, [pathname, breadcrumbOverride]);

  const handleBack = useCallback(() => {
    if (breadcrumb?.backHref) {
      router.push(breadcrumb.backHref);
    } else {
      router.back();
    }
  }, [breadcrumb?.backHref, router]);

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

      {/* Centered top bar: left nav | logo | right nav — above the HUD rails */}
      <nav
        className="fixed z-50 pointer-events-auto left-0 right-0 flex items-center justify-center"
        style={{ top: 8, height: "48px" }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {LEFT_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={navLinkStyle(item.href)}
                onMouseEnter={(e) => {
                  const style = e.currentTarget.style;
                  if (style.color !== "var(--gold)") style.color = "var(--dawn-70)";
                }}
                onMouseLeave={(e) => {
                  const isActive = isNavActive(item.href);
                  e.currentTarget.style.color = isActive ? "var(--gold)" : "var(--dawn-40)";
                }}
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 2,
                    marginTop: 4,
                    background: isNavActive(item.href) ? "var(--gold)" : "transparent",
                    transition: "background-color var(--duration-fast)",
                  }}
                />
              </Link>
            ))}
          </div>
          <SigilParticleLogo />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {RIGHT_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={navLinkStyle(item.href)}
                onMouseEnter={(e) => {
                  const style = e.currentTarget.style;
                  if (style.color !== "var(--gold)") style.color = "var(--dawn-70)";
                }}
                onMouseLeave={(e) => {
                  const isActive = isNavActive(item.href);
                  e.currentTarget.style.color = isActive ? "var(--gold)" : "var(--dawn-40)";
                }}
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 16,
                    height: 2,
                    marginTop: 4,
                    background: isNavActive(item.href) ? "var(--gold)" : "transparent",
                    transition: "background-color var(--duration-fast)",
                  }}
                />
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Top-right: theme toggle + admin settings — aligned with nav bar */}
      <div
        className="fixed z-50 pointer-events-auto flex flex-row items-center gap-3"
        style={{
          top: 8,
          right: "var(--hud-padding)",
          height: 48,
        }}
      >
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
        {isAdmin && (
          <Link
            href="/admin"
            style={{ textDecoration: "none", opacity: isSettingsActive ? 1 : 0.7 }}
            className="transition-opacity hover:opacity-100"
            title="Settings"
          >
            <ParticleIcon pixels={settingsPx} active={isSettingsActive} light={isLight} />
          </Link>
        )}
      </div>

      {/* Breadcrumb tree — aligned with top of left rail */}
      {breadcrumb && (
        <nav
          aria-label="Breadcrumb"
          className="nav-spine fixed z-40 pointer-events-auto animate-fade-in-up"
          style={{
            top: "calc(var(--hud-padding) + 32px)",
            left: `calc(var(--hud-padding) + ${RAIL_WIDTH - 2}px)`,
          }}
        >
          {breadcrumb.segments[0].href ? (
            <Link
              href={breadcrumb.segments[0].href}
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: breadcrumb.segments.length > 1 ? "var(--dawn-30)" : "var(--dawn-50)",
                textDecoration: "none",
                transition: "color 100ms ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  breadcrumb!.segments.length > 1 ? "var(--dawn-30)" : "var(--dawn-50)";
              }}
            >
              {breadcrumb.segments[0].label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--dawn-30)",
                textDecoration: "none",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 100ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--dawn-30)";
              }}
            >
              {breadcrumb.segments[0].label}
            </button>
          )}

          {breadcrumb.segments.length > 1 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {breadcrumb.segments.slice(1).map((seg, i) => {
                const isCurrent = i === breadcrumb.segments.length - 2; // last segment since we sliced 1
                return (
                  <li
                    key={i}
                    style={{
                      position: "relative",
                      paddingLeft: 12,
                      marginTop: 3,
                    }}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    <svg
                      aria-hidden
                      width="8"
                      height="12"
                      viewBox="0 0 8 12"
                      fill="none"
                      style={{
                        position: "absolute",
                        left: 2,
                        top: -3,
                      }}
                    >
                      <path
                        d="M0 0V11H7"
                        stroke="var(--dawn-15)"
                        strokeWidth="1"
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    {seg.href ? (
                      <Link
                        href={seg.href}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--dawn-30)",
                          textDecoration: "none",
                          transition: "color 100ms ease",
                          display: "block",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--dawn-50)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--dawn-30)";
                        }}
                      >
                        {seg.label}
                      </Link>
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--dawn-50)",
                          display: "block",
                        }}
                      >
                        {seg.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Portal target for page-specific tree extensions (e.g. waypoints) */}
          <div ref={portalRef} />
        </nav>
      )}

      <main
        className={`hud-shell ${workspaceLayout ? "hud-shell--workspace" : ""}`}
        style={{
          paddingLeft: `calc(var(--hud-padding) + ${RAIL_WIDTH}px + 8px)`,
          paddingRight: `calc(var(--hud-padding) + 20px)`,
          paddingTop: "calc(var(--hud-padding) + 56px)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
