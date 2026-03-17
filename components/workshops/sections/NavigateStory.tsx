"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SemanticBridgeMap } from "./SemanticBridgeMap";

const POPPINS_LIME = "#C4DD05";
const POPPINS_PINK = "#FEB3D2";
const POPPINS_ACCENT = "#FE6744";

const PRINCIPLE_CARDS = [
  { title: "Context \u203A templates", body: "Don\u2019t start with a form. Dump everything relevant. AI finds what it needs.", bg: "#f7f9e6" },
  { title: "Clear \u203A vague", body: "Be specific about what you want. \u201CAnalyze for CTR\u201D beats \u201Cimprove this.\u201D", bg: POPPINS_LIME },
  { title: "Iterate \u203A perfect", body: "First answer is a draft. Nudge it. Refine it. You\u2019re the navigator.", bg: POPPINS_PINK },
  { title: "Partner \u203A tool", body: "Ask it to think out loud. Disagree with it. You\u2019re both responsible for the output.", bg: POPPINS_ACCENT, dark: true },
];

const BRIDGE_OPTIONS = [
  "a pack of wolves protecting territory",
  "an archaeologist mapping lost civilizations",
  "a jazz musician improvising over chord changes",
  "a gardener cultivating an ecosystem",
  "a chess grandmaster evaluating positions",
  "a marine biologist studying coral reefs",
];

function formatBridgeLabel(perspective: string) {
  const lastWord = perspective.trim().split(" ").filter(Boolean).at(-1) ?? perspective;
  return lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
}

type PromptMode = "basic" | "dimensional" | "semantic";

const TOTAL_STAGES = 11;

type Props = { clientName: string; accentColor?: string; darkColor?: string };

export function NavigateStory({ clientName, accentColor = POPPINS_ACCENT, darkColor = "#241D1B" }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const [cringe, setCringe] = useState(6);
  const [formality, setFormality] = useState(5);
  const [bridgePerspective, setBridgePerspective] = useState(BRIDGE_OPTIONS[0]);

  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<PromptMode>("basic");
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [outputStale, setOutputStale] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const samplePost = useMemo(
    () => `Most drills are used 13 minutes in their lifetime. ${clientName} lets you borrow one in your building instead of buying one.`,
    [clientName],
  );

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    function onScroll() {
      const rect = outer!.getBoundingClientRect();
      const viewH = window.innerHeight;
      const scrollRange = rect.height - viewH;
      if (scrollRange <= 0) { setProgress(0); return; }
      setProgress(Math.max(0, Math.min(1, -rect.top / scrollRange)));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const stage = Math.min(TOTAL_STAGES - 1, Math.floor(progress * TOTAL_STAGES));

  const principlesPhase = stage <= 5;
  const promptMode: PromptMode = stage >= 9 ? "semantic" : stage >= 7 ? "dimensional" : "basic";

  const callClaude = useCallback(
    async (mode: PromptMode, extraParams?: Record<string, unknown>) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setActiveMode(mode);
      setOutputStale(false);
      if (mode === "semantic") setBridgeConnected(true);
      try {
        const res = await fetch("/api/workshops/prompt-playground", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceText: samplePost, stage: mode, clientName, ...extraParams }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setOutput(data.output);
      } catch { /* aborted or network */ } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [samplePost, clientName],
  );

  const handleGenerate = useCallback(() => {
    if (promptMode === "basic") callClaude("basic");
    else if (promptMode === "dimensional") callClaude("dimensional", { dimensions: { cringe, formality } });
    else callClaude("semantic", { bridgePerspective });
  }, [promptMode, callClaude, cringe, formality, bridgePerspective]);

  useEffect(() => { setOutputStale(true); }, [cringe, formality]);
  useEffect(() => { setOutputStale(true); setBridgeConnected(false); }, [bridgePerspective]);

  const caveat: React.CSSProperties = { fontFamily: "'Caveat', cursive", fontWeight: 500, fontSize: "1.1em", fontStyle: "normal" };
  const mono: React.CSSProperties = { fontFamily: "var(--ws-mono, var(--font-mono))", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const };
  const sliderTrack: React.CSSProperties = { flex: 1, height: 3, appearance: "none", WebkitAppearance: "none", background: `linear-gradient(to right, ${darkColor}, ${accentColor})`, outline: "none", cursor: "pointer" };

  const ctaStyle: React.CSSProperties = {
    background: darkColor,
    color: "var(--ws-bg, #FCF3EC)",
    border: "none",
    padding: "10px 24px",
    fontFamily: "var(--ws-mono, var(--font-mono))",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    flexShrink: 0,
    opacity: loading ? 0.5 : 1,
    transition: "opacity 150ms",
  };

  const promptCardVisible = stage >= 6;
  const cardBg = promptMode === "semantic"
    ? "radial-gradient(circle at 14% 16%, rgba(255,255,255,0.2), transparent 24%), radial-gradient(circle at 84% 84%, rgba(255,255,255,0.14), transparent 28%), linear-gradient(180deg, rgba(254,179,210,0.97) 0%, rgba(254,179,210,0.94) 70%, rgba(254,179,210,0.82) 100%)"
    : promptMode === "dimensional"
      ? POPPINS_LIME
      : "rgba(255,255,255,0.85)";
  const cardBorder = promptMode === "basic" ? `1px solid color-mix(in srgb, ${darkColor} 8%, transparent)` : "none";
  const cardPadding = promptMode === "semantic" ? "36px 36px 24px" : "32px";
  const cardShadow = promptMode === "semantic"
    ? "0 24px 48px rgba(254,179,210,0.05), inset 0 -24px 36px rgba(255,255,255,0.05)"
    : "none";

  const promptText = promptMode === "semantic"
    ? `\u201CAnalyze ${clientName}\u2019s brand strategy from the perspective of ${bridgePerspective}.\u201D`
    : promptMode === "dimensional"
      ? `\u201CRate this ${clientName} social post: cringe ${cringe}/10, formality ${formality}/10. Then rewrite it to match those values.\u201D`
      : `\u201CRewrite this ${clientName} social post for clarity and brevity.\u201D`;

  const modeLabel = promptMode === "semantic" ? "Semantic navigation" : promptMode === "dimensional" ? "Dimensional navigation" : "Simple prompt";

  const showOutput = output && activeMode === promptMode && !outputStale;

  return (
    <div ref={outerRef} style={{ position: "relative", height: `${TOTAL_STAGES * 100}vh` }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 48px",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: 900, width: "100%", display: "grid" }}>
          {/* Phase 1: Principles -- fades out before prompt card enters */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: principlesPhase ? 1 : 0,
              transform: principlesPhase ? "translateY(0)" : "translateY(-24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: principlesPhase ? "auto" : "none",
            }}
          >
            <div style={{ ...mono, marginBottom: 14, color: accentColor, background: "rgba(196,221,5,0.1)", display: "inline-block", padding: "4px 12px" }}>
              Foundation
            </div>
            <h2 style={{ fontFamily: "var(--ws-font, var(--font-sans))", fontSize: "clamp(30px, 3.5vw, 46px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 0 }}>
              The Four <span style={caveat}>Principles</span>
            </h2>
            <p style={{ fontFamily: "var(--ws-font, var(--font-sans))", fontSize: 17, fontWeight: 400, color: `color-mix(in srgb, ${darkColor} 55%, transparent)`, lineHeight: 1.7, maxWidth: 540, margin: "8px 0 0" }}>
              How we work with AI in practice.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 40 }}>
              {PRINCIPLE_CARDS.map((card, i) => {
                const visible = stage >= i;
                return (
                  <div
                    key={card.title}
                    style={{
                      background: card.bg,
                      color: card.dark ? "#fff" : darkColor,
                      padding: 24,
                      opacity: visible ? 1 : 0,
                      transform: visible ? "translateY(0)" : "translateY(24px)",
                      transition: "opacity 500ms cubic-bezier(0.16,1,0.3,1), transform 500ms cubic-bezier(0.16,1,0.3,1)",
                      transitionDelay: `${i * 80}ms`,
                    }}
                  >
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{card.title}</h3>
                    <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.75 }}>{card.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase 2: Evolving prompt card -- enters after principles exit */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: promptCardVisible ? 1 : 0,
              transform: promptCardVisible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: promptCardVisible ? "auto" : "none",
            }}
          >
          {promptCardVisible && (
            <div
              style={{
                background: cardBg,
                border: cardBorder,
                color: darkColor,
                padding: cardPadding,
                boxShadow: cardShadow,
                transition: "background 400ms ease, border 400ms ease, box-shadow 400ms ease, padding 400ms ease",
              }}
            >
              <div style={{ ...mono, color: `color-mix(in srgb, ${darkColor} 45%, transparent)`, marginBottom: 16 }}>
                {modeLabel}
              </div>

              <p style={{ fontFamily: "var(--ws-font, var(--font-sans))", fontSize: "clamp(18px, 2vw, 24px)", fontWeight: 600, lineHeight: 1.5, marginBottom: 24 }}>
                {promptText}
              </p>

              {/* Dimensional controls + CTA row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: promptMode === "dimensional" ? "1fr" : "0fr",
                  transition: "grid-template-rows 400ms ease, opacity 300ms ease",
                  opacity: promptMode === "dimensional" ? 1 : 0,
                  overflow: "hidden",
                }}
              >
                <div style={{ minHeight: 0, paddingBottom: promptMode === "dimensional" ? 24 : 0 }}>
                  {[
                    { label: "Cringe", value: cringe, set: setCringe },
                    { label: "Formality", value: formality, set: setFormality },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <label style={{ ...mono, opacity: 0.5, flexShrink: 0, width: 90 }}>{s.label}</label>
                      <input type="range" min={0} max={10} value={s.value} onChange={(e) => s.set(Number(e.target.value))} style={sliderTrack} />
                      <span style={{ ...mono, fontWeight: 600, width: 24, textAlign: "center", opacity: 0.6 }}>{s.value}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button type="button" onClick={handleGenerate} disabled={loading} style={ctaStyle}>
                      {loading ? "Navigating\u2026" : "Navigate"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Semantic controls + CTA row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: promptMode === "semantic" ? "1fr" : "0fr",
                  transition: "grid-template-rows 400ms ease, opacity 300ms ease",
                  opacity: promptMode === "semantic" ? 1 : 0,
                  overflow: "hidden",
                }}
              >
                <div style={{ minHeight: 0, paddingBottom: promptMode === "semantic" ? 24 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ ...mono, opacity: 0.5, flexShrink: 0 }}>Perspective</span>
                    <select
                      value={bridgePerspective}
                      onChange={(e) => setBridgePerspective(e.target.value)}
                      style={{
                        flex: 1, padding: "8px 12px",
                        background: "rgba(255,255,255,0.7)",
                        border: `1px solid color-mix(in srgb, ${darkColor} 15%, transparent)`,
                        fontFamily: "var(--ws-font, var(--font-sans))", fontSize: 13,
                        color: darkColor, cursor: "pointer",
                      }}
                    >
                      {BRIDGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <button type="button" onClick={handleGenerate} disabled={loading} style={ctaStyle}>
                      {loading ? "Navigating\u2026" : "Navigate"}
                    </button>
                  </div>

                  {/* Isometric semantic bridge map */}
                  <div style={{ marginTop: 14, marginBottom: 10 }}>
                    <SemanticBridgeMap
                      leftLabel={`${clientName} Brand Strategy`}
                      rightLabel={formatBridgeLabel(bridgePerspective)}
                      accentColor={accentColor}
                      darkColor={darkColor}
                      connected={bridgeConnected}
                    />
                  </div>
                </div>
              </div>

              {/* Base mode CTA */}
              {promptMode === "basic" && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
                  <button type="button" onClick={handleGenerate} disabled={loading} style={ctaStyle}>
                    {loading ? "Navigating\u2026" : "Navigate"}
                  </button>
                </div>
              )}

              {/* Output area */}
              <div
                style={{
                  background: darkColor,
                  color: "var(--ws-bg, #FCF3EC)",
                  padding: "20px 24px",
                  minHeight: 72,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ ...mono, opacity: 0.4, marginBottom: 8, color: "var(--ws-bg, #FCF3EC)" }}>Output</div>
                {showOutput ? (
                  <div style={{ fontFamily: "var(--ws-font, var(--font-sans))", fontSize: 14, lineHeight: 1.7, opacity: loading ? 0.4 : 1, transition: "opacity 200ms" }}>
                    {output}
                  </div>
                ) : (
                  <div style={{ fontFamily: "var(--ws-mono, var(--font-mono))", fontSize: 11, opacity: 0.3, color: "var(--ws-bg, #FCF3EC)" }}>
                    {outputStale ? "Parameters changed \u2014 click Navigate to update" : "Click Navigate to generate"}
                  </div>
                )}
              </div>
            </div>
          )}

          </div>

          {/* Scroll hint */}
          {progress < 0.92 && (
            <div style={{ textAlign: "center", marginTop: 28, ...mono, opacity: 0.18, fontSize: 9, transition: "opacity 300ms" }}>
              keep scrolling to reveal more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
