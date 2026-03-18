"use client";

import React, { useEffect, useRef, useState } from "react";
import { POPPINS_USE_CASES } from "@/lib/workshops/poppinsUseCases";

const TOTAL_STAGES = 6;

type Props = {
  accentColor?: string;
  darkColor?: string;
};

export function CoworkScene({
  accentColor = "#FE6744",
  darkColor = "#241D1B",
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    function onScroll() {
      const rect = outer!.getBoundingClientRect();
      const viewH = window.innerHeight;
      const scrollRange = rect.height - viewH;
      if (scrollRange <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.max(0, Math.min(1, -rect.top / scrollRange)));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const stage = Math.min(TOTAL_STAGES - 1, Math.floor(progress * TOTAL_STAGES));
  const showOverview = stage <= 2;
  const showExamples = stage >= 3;

  const mono: React.CSSProperties = {
    fontFamily: "var(--ws-mono, var(--font-mono))",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  };

  const caveat: React.CSSProperties = {
    fontFamily: "'Caveat', cursive",
    fontWeight: 500,
    fontSize: "1.1em",
    fontStyle: "normal",
  };

  const cardBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.7)",
    border: `1px solid color-mix(in srgb, ${darkColor} 8%, transparent)`,
    padding: 24,
  };

  const coworkExamples = POPPINS_USE_CASES
    .filter((uc) => uc.cowork.length > 0)
    .slice(0, 6)
    .map((uc) => ({
      name: uc.name,
      role: uc.role,
      idea: uc.cowork[0],
    }));

  return (
    <div
      ref={outerRef}
      style={{ position: "relative", height: `${TOTAL_STAGES * 100}vh` }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "var(--ws-slide-pad-y) var(--ws-slide-pad-x)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: "var(--ws-content-max)",
            width: "100%",
            marginLeft: "calc(var(--ws-content-left) - var(--ws-slide-pad-x))",
            marginRight: "calc(var(--ws-content-right) - var(--ws-slide-pad-x))",
            display: "grid",
          }}
        >
          {/* Phase 1: Cowork Overview */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: showOverview ? 1 : 0,
              transform: showOverview ? "translateY(0)" : "translateY(-24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: showOverview ? "auto" : "none",
            }}
          >
            <div
              style={{
                ...mono,
                marginBottom: 14,
                color: accentColor,
                background: "rgba(254,103,68,0.1)",
                display: "inline-block",
                padding: "4px 12px",
              }}
            >
              Still chat, more autonomous
            </div>
            <h2
              style={{
                fontFamily: "var(--ws-font, var(--font-sans))",
                fontSize: "clamp(30px, 3.5vw, 46px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: 0,
              }}
            >
              <span style={caveat}>Cowork</span>
            </h2>
            <p
              style={{
                fontFamily: "var(--ws-font, var(--font-sans))",
                fontSize: 19,
                fontWeight: 400,
                color: `color-mix(in srgb, ${darkColor} 55%, transparent)`,
                lineHeight: 1.7,
                maxWidth: 540,
                margin: "8px 0 32px",
              }}
            >
              Files in. Work out. Scheduled tasks. Connectors that travel.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                {
                  icon: "\uD83D\uDCC1",
                  title: "Files In / Work Out",
                  body: "Upload a spreadsheet. Get a report. Upload a sketch. Get a design system. Files move. Work gets done.",
                },
                {
                  icon: "\u23F0",
                  title: "Scheduled Tasks",
                  body: "\u201CEvery Monday, audit last week\u2019s metrics.\u201D \u201CDaily, monitor competitor pricing.\u201D Work that runs without you.",
                },
                {
                  icon: "\uD83D\uDD17",
                  title: "Connected Tools",
                  body: "Slack, Google Sheets, Linear, Notion. Claude reads them. Claude updates them. Your tools talk to each other.",
                },
              ].map((item, i, arr) => (
                <div
                  key={i}
                  style={{
                    padding: "24px 28px",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                    background: "rgba(255,255,255,0.4)",
                    borderBottom:
                      i < arr.length - 1
                        ? `1px solid color-mix(in srgb, ${darkColor} 8%, transparent)`
                        : undefined,
                    opacity: stage >= i ? 1 : 0.3,
                    transition: "opacity 400ms ease",
                  }}
                >
                  <div style={{ fontSize: 24, flexShrink: 0, width: 32 }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                      {item.title}
                    </h4>
                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.7,
                        color: `color-mix(in srgb, ${darkColor} 55%, transparent)`,
                      }}
                    >
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 2: Poppins Cowork Examples */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: showExamples ? 1 : 0,
              transform: showExamples ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: showExamples ? "auto" : "none",
            }}
          >
            <div
              style={{
                ...mono,
                marginBottom: 14,
                color: accentColor,
                background: "rgba(254,103,68,0.1)",
                display: "inline-block",
                padding: "4px 12px",
              }}
            >
              For Poppins
            </div>
            <h2
              style={{
                fontFamily: "var(--ws-font, var(--font-sans))",
                fontSize: "clamp(24px, 2.8vw, 36px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: 20,
              }}
            >
              Cowork <span style={caveat}>Ideas</span>
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: 14,
              }}
            >
              {coworkExamples.map((ex, i) => (
                <div
                  key={ex.name}
                  style={{
                    ...cardBase,
                    opacity: showExamples ? 1 : 0,
                    transform: showExamples ? "translateY(0)" : "translateY(12px)",
                    transition: `opacity 400ms ease ${i * 80}ms, transform 400ms ease ${i * 80}ms`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--ws-mono,var(--font-mono))",
                      fontSize: 10,
                      fontWeight: 600,
                      color: accentColor,
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {ex.name} \u2014 {ex.role}
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                    {ex.idea.title}
                  </h4>
                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: `color-mix(in srgb, ${darkColor} 55%, transparent)`,
                      margin: 0,
                    }}
                  >
                    {ex.idea.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
