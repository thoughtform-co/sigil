"use client";

import React, { useEffect, useRef, useState } from "react";
import { SystemPromptStudio } from "./SystemPromptStudio";

const TOTAL_STAGES = 6;

type Props = {
  clientName: string;
  accentColor?: string;
  darkColor?: string;
};

export function EncodeSystemScene({
  clientName,
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
  const showIntro = stage <= 2;
  const showStudio = stage >= 3;

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
          {/* Phase 1: Explanation */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: showIntro ? 1 : 0,
              transform: showIntro ? "translateY(0)" : "translateY(-24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: showIntro ? "auto" : "none",
            }}
          >
            <div
              style={{
                ...mono,
                marginBottom: 14,
                color: accentColor,
                background: "rgba(254,179,210,0.2)",
                display: "inline-block",
                padding: "4px 12px",
              }}
            >
              First layer
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
              System <span style={caveat}>Prompts</span>
            </h2>
            <p
              style={{
                fontFamily: "var(--ws-font, var(--font-sans))",
                fontSize: 17,
                fontWeight: 400,
                color: `color-mix(in srgb, ${darkColor} 55%, transparent)`,
                lineHeight: 1.7,
                maxWidth: 540,
                margin: "8px 0 32px",
                textAlign: "center",
              }}
            >
              The simplest form of encoding. Your baseline. The instruction set
              that travels with every conversation.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                overflow: "hidden",
              }}
            >
              {[
                {
                  title: "What is it?",
                  body: "A persistent instruction that defines how AI should behave in conversations with you. It\u2019s the foundation for everything that follows.",
                },
                {
                  title: "Build one for your role",
                  body: "Don\u2019t overthink it. What do you need AI to understand before every conversation? Write that down. Start there.",
                },
                {
                  title: "It travels with you",
                  body: "In Claude Projects, your system prompt stays active across conversations. Consistency without repetition.",
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
                  <div
                    style={{
                      fontFamily: "var(--ws-mono,var(--font-mono))",
                      fontSize: 10,
                      opacity: 0.4,
                      paddingTop: 2,
                      flexShrink: 0,
                      width: 20,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                      {item.title}
                    </h4>
                    <p
                      style={{
                        fontSize: 13,
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

          {/* Phase 2: System Prompt Studio */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: showStudio ? 1 : 0,
              transform: showStudio ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: showStudio ? "auto" : "none",
            }}
          >
            <div
              style={{
                ...mono,
                marginBottom: 14,
                color: accentColor,
                background: "rgba(254,179,210,0.2)",
                display: "inline-block",
                padding: "4px 12px",
              }}
            >
              Draft yours
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
              Draft Your System <span style={caveat}>Prompt</span>
            </h2>

            <SystemPromptStudio
              clientName={clientName}
              accentColor={accentColor}
              darkColor={darkColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
