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

const NAV_LEFT: { href: string; label: string }[] = [
  { href: "/projects", label: "projects" },
  { href: "/briefings", label: "briefings" },
  { href: "/review", label: "review" },
];

const NAV_RIGHT: { href: string; label: string }[] = [
  { href: "/bookmarks", label: "bookmarks" },
  { href: "/admin", label: "settings" },
];

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className="transition-all"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: isActive ? "var(--gold)" : "var(--dawn-40)",
        textDecoration: "none",
        transitionDuration: "var(--duration-fast)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = "var(--dawn-70)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = "var(--dawn-40)";
        }
      }}
    >
      {label}
    </Link>
  );
}

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
          ))}
        </div>
      </aside>

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

      {/* Single centered top nav bar: [projects briefings review] [symbol] [bookmarks settings] */}
      <header
        className="fixed left-0 right-0 top-0 z-40 pointer-events-none"
        style={{
          paddingLeft: "calc(var(--hud-padding) + 48px + 8px)",
          paddingRight: "calc(var(--hud-padding) + 48px + 8px)",
          paddingTop: "var(--hud-padding)",
          paddingBottom: "12px",
        }}
      >
        <div
          className="pointer-events-auto flex items-center justify-center gap-8"
          style={{ minHeight: "36px" }}
        >
          <div className="flex items-center gap-6">
            {NAV_LEFT.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={
                  pathname === item.href || pathname.startsWith(item.href + "/")
                }
              />
            ))}
          </div>

          <div
            className="flex items-center justify-center"
            style={{ width: "40px", flexShrink: 0 }}
          >
            <Link
              href="/projects"
              className="block transition-opacity hover:opacity-90"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "24px",
                color: "var(--gold)",
                textDecoration: "none",
              }}
              aria-label="Home"
            >
              ᛭
            </Link>
          </div>

          <div className="flex items-center gap-6">
            {NAV_RIGHT.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={
                  pathname === item.href || pathname.startsWith(item.href + "/")
                }
              />
            ))}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 transition-all"
              style={{
                padding: "4px 0",
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--dawn-40)",
                background: "none",
                border: "none",
                cursor: "pointer",
                transitionDuration: "var(--duration-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--dawn-70)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--dawn-40)";
              }}
            >
              {isLight ? <MoonIcon /> : <SunIcon />}
              {isLight ? "dark" : "light"}
            </button>
          </div>
        </div>
      </header>

      <main
        className="hud-shell hud-shell--workspace"
        style={{
          paddingTop: "calc(var(--hud-padding) + 36px + 12px + 24px)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
