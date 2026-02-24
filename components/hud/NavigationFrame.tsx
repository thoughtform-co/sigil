"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const THEME_KEY = "sigil-theme";

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

type NavigationFrameProps = {
  children: ReactNode;
  title?: string;
  modeLabel?: string;
  /** Show the left nav panel (true for dashboard pages, false for project workspace) */
  showNavPanel?: boolean;
};

const RAIL_WIDTH = 48;
const NAV_PANEL_WIDTH = 180;
const TICK_COUNT = 20;
const TICK_LABELS: Record<number, string> = {
  0: "0",
  5: "2",
  10: "5",
  15: "7",
  20: "10",
};

const NAV_ITEMS: { href: string; label: string; separator?: boolean }[] = [
  { href: "/", label: "dashboard" },
  { href: "/analytics", label: "analytics", separator: true },
  { href: "/briefings", label: "briefings" },
  { href: "/projects", label: "projects" },
  { href: "/review", label: "review", separator: true },
  { href: "/bookmarks", label: "bookmarks" },
];

export function NavigationFrame({
  children,
  title = "SIGIL",
  modeLabel = "generation platform",
  showNavPanel = true,
}: NavigationFrameProps) {
  const pathname = usePathname();
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

  return (
    <div className="relative min-h-screen bg-void text-dawn dot-grid-bg">
      <div className="hud-corner hud-corner-tl" />
      <div className="hud-corner hud-corner-tr" />
      <div className="hud-corner hud-corner-bl" />
      <div className="hud-corner hud-corner-br" />

      {/* Left rail with tick marks */}
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
          {Array.from({ length: TICK_COUNT + 1 }).map((_, i) => (
            <div key={i} className="relative">
              <div
                style={{
                  height: 1,
                  width: i % 5 === 0 ? 20 : 10,
                  background: i % 5 === 0 ? "var(--gold)" : "var(--gold-30)",
                }}
              />
              {TICK_LABELS[i] && (
                <span
                  className="absolute font-mono text-[9px]"
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
          ))}
        </div>
      </aside>

      {/* Right rail with tick marks */}
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
          {Array.from({ length: TICK_COUNT + 1 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 1,
                width: i % 5 === 0 ? 20 : 10,
                background: i % 5 === 0 ? "var(--gold)" : "var(--gold-30)",
              }}
            />
          ))}
        </div>
      </aside>

      {/* Left nav panel (Astrogation-style, dashboard pages only) */}
      {showNavPanel && (
        <nav
          className="sigil-nav-panel fixed z-30"
          style={{
            top: "calc(var(--hud-padding) + 32px)",
            bottom: "calc(var(--hud-padding) + 32px)",
            left: `calc(var(--hud-padding) + ${RAIL_WIDTH}px + 4px)`,
            width: NAV_PANEL_WIDTH,
            display: "flex",
            flexDirection: "column",
            background: "transparent",
          }}
        >
          {/* Gold title bar -- aligned with tick 0 of the left rail */}
          <div
            style={{
              background: "var(--gold)",
              color: "var(--void)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "8px 12px",
              clipPath: "polygon(0% 0%, calc(100% - 12px) 0%, 100% 12px, 100% 100%, 0% 100%)",
            }}
          >
            {title}
          </div>

          {/* Nav links -- pushed down toward vertical center */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              paddingTop: "40px",
              borderLeft: "none",
              borderBottom: "none",
              flex: 1,
            }}
          >
            {NAV_ITEMS.map((item) => {
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
                    {/* Active indicator tick */}
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
                  {/* Section separator after this item */}
                  {item.separator && (
                    <div style={{ height: 1, background: "var(--dawn-12)", margin: "6px 0" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Theme toggle — bottom of nav panel */}
          <div
            style={{
              padding: "12px 12px 16px",
              borderTop: "1px solid var(--dawn-08)",
              marginTop: "auto",
            }}
          >
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 transition-all w-full"
              style={{
                padding: "8px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--dawn-40)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                transitionDuration: "var(--duration-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--dawn-70)";
                e.currentTarget.style.background = "var(--dawn-04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--dawn-40)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {isLight ? <MoonIcon /> : <SunIcon />}
              {isLight ? "dark" : "light"}
            </button>
          </div>
        </nav>
      )}

      {/* Header -- only shown when nav panel is hidden (project workspace pages) */}
      {!showNavPanel && (
        <header className="fixed left-0 right-0 top-0 z-40 px-[clamp(48px,8vw,120px)] pt-5 pointer-events-none">
          <div
            className="flex items-center justify-between"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--dawn-50)",
            }}
          >
            <span>{title}</span>
            <div className="pointer-events-auto flex items-center gap-3">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ color: "var(--dawn-40)" }}
                >
                  {item.label}
                </Link>
              ))}
              <span style={{ color: "var(--dawn-30)" }}>{modeLabel}</span>
            </div>
          </div>
        </header>
      )}

      <main className={`hud-shell ${showNavPanel ? "hud-shell--with-panel" : "hud-shell--workspace"}`}>
        {children}
      </main>
    </div>
  );
}
