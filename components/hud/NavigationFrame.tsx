"use client";

import { ReactNode } from "react";
import Link from "next/link";

type NavigationFrameProps = {
  children: ReactNode;
  title?: string;
  modeLabel?: string;
};

export function NavigationFrame({
  children,
  title = "SIGIL",
  modeLabel = "generation platform",
}: NavigationFrameProps) {
  return (
    <div className="relative min-h-screen bg-void text-dawn">
      <div className="hud-corner hud-corner-tl" />
      <div className="hud-corner hud-corner-tr" />
      <div className="hud-corner hud-corner-bl" />
      <div className="hud-corner hud-corner-br" />

      <div className="hud-rail hud-rail-left" />
      <div className="hud-rail hud-rail-right" />

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
            <Link href="/projects" style={{ color: "var(--dawn-40)" }}>
              projects
            </Link>
            <Link href="/analytics" style={{ color: "var(--dawn-40)" }}>
              analytics
            </Link>
            <Link href="/admin" style={{ color: "var(--dawn-40)" }}>
              admin
            </Link>
            <span style={{ color: "var(--dawn-30)" }}>{modeLabel}</span>
          </div>
        </div>
      </header>

      <main className="hud-shell">{children}</main>
    </div>
  );
}
