"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { NavSpineProvider, useNavSpine } from "@/context/NavSpineContext";
import { ContextAnchor } from "@/components/ui/ContextAnchor";
import { HudFrame } from "./HudFrame";
import { JOURNEY_LEFT_RAIL_INSET, NAV_SPINE_CARD_WIDTH } from "./grid-constants";

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
  /** Route workspace context — used to enrich the breadcrumb with journey/route names. */
  journeyName?: string;
  journeyId?: string;
  routeName?: string;
  /** Lesson context — used to show lesson title in the spine on curriculum pages. */
  lessonName?: string;
};

export { NAV_SPINE_CARD_WIDTH };

const LEFT_NAV = [
  { href: "/journeys", label: "journeys" },
];
const RIGHT_NAV = [
  { href: "/analytics", label: "analytics" },
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

function JourneyConnector() {
  const pathRef = useRef<SVGPathElement>(null);
  const diamondRef = useRef<SVGRectElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let rafId: number;
    let currentY = 0;
    let initialized = false;
    let hudMargin = 40;
    let railEndX = 96;
    let lastTime = 0;
    const TRACK_SPEED_PX_PER_SEC = 450;

    function readRailEnd() {
      const st = getComputedStyle(document.documentElement);
      const m = parseFloat(st.getPropertyValue("--hud-margin")) || 54;
      const gi = parseFloat(st.getPropertyValue("--hud-rail-guide-inset")) || 9;
      hudMargin = m;
      railEndX = m + gi;
    }

    readRailEnd();
    window.addEventListener("resize", readRailEnd);

    const update = (time: number) => {
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      lastTime = time;

      const el =
        document.querySelector("[data-waypoint-active='true']") ??
        document.querySelector("[data-journey-selected]");
      const path = pathRef.current;
      const diamond = diamondRef.current;
      const svg = svgRef.current;

      if (!el || !path || !diamond || !svg) {
        if (svg) svg.style.opacity = "0";
        rafId = requestAnimationFrame(update);
        return;
      }

      const rect = el.getBoundingClientRect();
      const targetY = rect.top + rect.height / 2;
      const endX = railEndX;

      if (!initialized) {
        currentY = targetY;
        initialized = true;
      } else {
        const delta = targetY - currentY;
        const maxStep = TRACK_SPEED_PX_PER_SEC * dt;
        if (Math.abs(delta) <= maxStep) {
          currentY = targetY;
        } else {
          currentY += Math.sign(delta) * maxStep;
        }
      }

      const settled = Math.abs(currentY - targetY) < 0.3;
      if (!settled || !svg.style.opacity || svg.style.opacity === "0") {
        path.setAttribute("d", `M ${hudMargin} ${currentY} L ${endX} ${currentY}`);
        diamond.setAttribute("x", String(hudMargin - 3));
        diamond.setAttribute("y", String(currentY - 3));
      }

      svg.style.opacity = "1";
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", readRailEnd);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="journey-connector"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 35,
        opacity: 0,
        transition: "opacity 150ms ease-out",
      }}
    >
      <path
        ref={pathRef}
        fill="none"
        stroke="var(--dawn-30)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        ref={diamondRef}
        width="6"
        height="6"
        fill="var(--dawn-30)"
        style={{
          transformOrigin: "center",
          transformBox: "fill-box",
          transform: "rotate(45deg)",
        }}
      />
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
  journeyName,
  journeyId,
  routeName,
  lessonName,
}: NavigationFrameProps) {
  const { portalRef } = useNavSpine();
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isWorkshopLocked, lockedWorkspaceProjectId } = useAuth();
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
      const segments: BreadcrumbSegment[] = [];
      if (journeyName) {
        segments.push({
          label: journeyName,
          href: journeyId ? `/journeys/${journeyId}` : undefined,
        });
      }
      segments.push({ label: mode });
      const backHref = journeyId ? `/journeys/${journeyId}` : null;
      return { backHref, segments };
    }

    if (parts[0] === "journeys" && parts.length >= 2) {
      if (parts.length >= 4 && parts[2] === "lessons") {
        const jId = parts[1];
        const jName = journeyName ?? "journey";
        return {
          backHref: `/journeys/${jId}`,
          segments: [
            { label: jName, href: `/journeys/${jId}` },
            { label: lessonName ?? "lesson" },
          ],
        };
      }
      const journeysHub =
        isWorkshopLocked && lockedWorkspaceProjectId
          ? `/journeys/${lockedWorkspaceProjectId}`
          : "/journeys";
      return {
        backHref: journeysHub,
        segments: [{ label: "journeys", href: journeysHub }],
      };
    }

    return null;
  }, [
    pathname,
    breadcrumbOverride,
    journeyName,
    journeyId,
    routeName,
    lessonName,
    isWorkshopLocked,
    lockedWorkspaceProjectId,
  ]);

  const handleBack = useCallback(() => {
    if (breadcrumb?.backHref) {
      router.push(breadcrumb.backHref);
    } else {
      router.back();
    }
  }, [breadcrumb?.backHref, router]);

  // Determine chapter label from context
  const chapterLabel = useMemo(() => {
    // Journey / route workspace passes `journeyName` — suppress decorative chapter label there.
    if (journeyName) {
      return undefined;
    }
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      const section = parts[0].toUpperCase();
      return `CHAPTER ${section}`;
    }
    return undefined;
  }, [journeyName, pathname]);

  // Determine pagination from pathname depth
  const paginationLabel = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      return String(parts.length).padStart(2, "0");
    }
    return "01";
  }, [pathname]);

  return (
    <HudFrame
      chapterLabel={chapterLabel}
      paginationLabel={paginationLabel}
      showRails={true}

      enableScrollReveal={true}
    >
      <div className="bg-void text-dawn dot-grid-bg">
        <JourneyConnector />

        {/* Top bar: left nav | home link | right nav — above the HUD rails */}
        <nav
          className="fixed z-50 pointer-events-auto left-0 right-0 flex items-center justify-center"
          style={{ top: "var(--hud-nav-offset-top)", height: "var(--hud-nav-height)" }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "24px" }}>
            {isWorkshopLocked && lockedWorkspaceProjectId ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link
                  href={`/journeys/${lockedWorkspaceProjectId}`}
                  style={navLinkStyle(`/journeys/${lockedWorkspaceProjectId}`)}
                  onMouseEnter={(e) => {
                    const style = e.currentTarget.style;
                    if (style.color !== "var(--gold)") style.color = "var(--dawn-70)";
                  }}
                  onMouseLeave={(e) => {
                    const isActive = isNavActive(`/journeys/${lockedWorkspaceProjectId}`);
                    e.currentTarget.style.color = isActive ? "var(--gold)" : "var(--dawn-40)";
                  }}
                >
                  <span>workshop</span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 2,
                      marginTop: 4,
                      background: isNavActive(`/journeys/${lockedWorkspaceProjectId}`)
                        ? "var(--gold)"
                        : "transparent",
                      transition: "background-color var(--duration-fast)",
                    }}
                  />
                </Link>
              </div>
            ) : (
              <>
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
                <Link
                  href="/"
                  style={{
                    textDecoration: "none",
                    color: "var(--dawn-40)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    transition: "color var(--duration-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--gold)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--dawn-40)";
                  }}
                >
                  SIGIL
                </Link>
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
              </>
            )}
          </div>
        </nav>

        {/* Top-right: theme toggle + admin settings — aligned with nav bar */}
        <div
          className="fixed z-50 pointer-events-auto flex flex-row items-center gap-3"
          style={{
            top: "var(--hud-nav-offset-top)",
            right: "var(--hud-margin)",
            height: "var(--hud-nav-height)",
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

        {/* Breadcrumb tree — aligned with first tick of left rail */}
        {breadcrumb && (
          <nav
            aria-label="Breadcrumb"
            className="nav-spine fixed z-40 pointer-events-auto animate-fade-in-up"
            style={{
              // Nudge below rail top so spine "JOURNEY" bearing clears the top-left corner bracket.
              top: journeyName
                ? "calc(var(--hud-rail-top) + 10px)"
                : "var(--hud-rail-top)",
              left: journeyName
                ? `calc(var(--hud-margin) + var(--hud-rail-guide-inset) + var(--hud-content-rail-gap) + ${JOURNEY_LEFT_RAIL_INSET}px)`
                : "calc(var(--hud-margin) + var(--hud-rail-guide-inset) + var(--hud-content-rail-gap))",
            }}
          >
          {journeyName ? (
            <ContextAnchor
              mode="spine"
              bearing="JOURNEY"
              label={journeyName}
              subtitleBearing={routeName ? "ROUTE" : lessonName ? "LESSON" : undefined}
              subtitle={routeName ?? lessonName}
              href={breadcrumb.segments[0].href}
              onNavigate={() => {
                if (breadcrumb.segments[0].href) router.push(breadcrumb.segments[0].href);
              }}
              width={NAV_SPINE_CARD_WIDTH}
            />
          ) : (
            <ContextAnchor
              mode="inline"
              label={breadcrumb.segments[0].label}
              style={{
                fontSize: "13px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
              }}
            />
          )}

          {/* Portal target for page-specific tree extensions (e.g. waypoints) */}
          <div ref={portalRef} />
        </nav>
      )}

        <main
          className={`hud-shell ${workspaceLayout ? "hud-shell--workspace" : ""}`}
          style={
            journeyName
              ? ({
                  "--hud-inner-offset": `calc(24px + var(--hud-content-rail-gap) + ${NAV_SPINE_CARD_WIDTH + 16 + JOURNEY_LEFT_RAIL_INSET}px)`,
                } as React.CSSProperties)
              : undefined
          }
        >
          {children}
        </main>
      </div>
    </HudFrame>
  );
}
