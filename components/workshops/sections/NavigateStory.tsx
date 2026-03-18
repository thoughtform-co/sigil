"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PromptPlayground,
  type PromptMode,
  type AttributeOption,
  type PerspectiveOption,
} from "./PromptPlayground";

const POPPINS_LIME = "#C4DD05";
const POPPINS_PINK = "#FEB3D2";
const POPPINS_ACCENT = "#FE6744";

const PRINCIPLE_CARDS = [
  {
    title: "Context \u203A templates",
    body: "Don\u2019t start with a form. Dump everything relevant. AI finds what it needs.",
    bg: "#f7f9e6",
  },
  {
    title: "Clear \u203A vague",
    body: "Be specific about what you want. \u201CAnalyze for CTR\u201D beats \u201Cimprove this.\u201D",
    bg: POPPINS_LIME,
  },
  {
    title: "Iterate \u203A perfect",
    body: "First answer is a draft. Nudge it. Refine it. You\u2019re the navigator.",
    bg: POPPINS_PINK,
  },
  {
    title: "Partner \u203A tool",
    body: "Ask it to think out loud. Disagree with it. You\u2019re both responsible for the output.",
    bg: POPPINS_ACCENT,
    dark: true,
  },
];

const ATTRIBUTE_OPTIONS: AttributeOption[] = [
  { value: "clarity", label: "clarity" },
  { value: "brevity", label: "brevity" },
  { value: "engagement", label: "engagement" },
  { value: "warmth", label: "warmth" },
  { value: "authority", label: "authority" },
  { value: "humor", label: "humor" },
];

const PERSPECTIVE_OPTIONS: PerspectiveOption[] = [
  {
    value: "a pack of wolves protecting territory",
    label: "a pack of wolves protecting territory",
    mapLabel: "Territory",
    destPoint: { x: 80, y: 34 },
  },
  {
    value: "an archaeologist mapping lost civilizations",
    label: "an archaeologist mapping lost civilizations",
    mapLabel: "Civilizations",
    destPoint: { x: 72, y: 28 },
  },
  {
    value: "a jazz musician improvising over chord changes",
    label: "a jazz musician improvising over chord changes",
    mapLabel: "Changes",
    destPoint: { x: 85, y: 40 },
  },
  {
    value: "a gardener cultivating an ecosystem",
    label: "a gardener cultivating an ecosystem",
    mapLabel: "Ecosystem",
    destPoint: { x: 68, y: 32 },
  },
  {
    value: "a chess grandmaster evaluating positions",
    label: "a chess grandmaster evaluating positions",
    mapLabel: "Positions",
    destPoint: { x: 78, y: 26 },
  },
  {
    value: "a marine biologist studying coral reefs",
    label: "a marine biologist studying coral reefs",
    mapLabel: "Reefs",
    destPoint: { x: 75, y: 38 },
  },
];

const TOTAL_STAGES = 11;

type Props = { clientName: string; accentColor?: string; darkColor?: string };

export function NavigateStory({
  clientName,
  accentColor = POPPINS_ACCENT,
  darkColor = "#241D1B",
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const [sourceText, setSourceText] = useState(
    () =>
      `Most drills are used 13 minutes in their lifetime. ${clientName} lets you borrow one in your building instead of buying one.`,
  );
  const [selectedAttribute, setSelectedAttribute] = useState(
    ATTRIBUTE_OPTIONS[0].value,
  );
  const [dimensionValue, setDimensionValue] = useState(6);
  const [bridgePerspective, setBridgePerspective] = useState(
    PERSPECTIVE_OPTIONS[0].value,
  );

  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<PromptMode>("basic");
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [outputStale, setOutputStale] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  /* ── Scroll tracking ── */

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
  const principlesPhase = stage <= 5;
  const promptMode: PromptMode =
    stage >= 9 ? "semantic" : stage >= 7 ? "dimensional" : "basic";

  /* ── Generation ── */

  const callClaude = useCallback(
    async (mode: PromptMode) => {
      if (!sourceText.trim()) return;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setActiveMode(mode);
      setOutputStale(false);
      if (mode === "semantic") setBridgeConnected(true);
      try {
        const params: Record<string, unknown> = {
          sourceText,
          stage: mode,
          clientName,
        };
        if (mode === "basic") {
          params.attribute = selectedAttribute;
        } else if (mode === "dimensional") {
          params.attribute = selectedAttribute;
          params.dimensionValue = dimensionValue;
        } else {
          params.bridgePerspective = bridgePerspective;
        }

        const res = await fetch("/api/workshops/prompt-playground", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setOutput(data.output);
      } catch {
        /* aborted or network */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [sourceText, clientName, selectedAttribute, dimensionValue, bridgePerspective],
  );

  const handleGenerate = useCallback(() => {
    callClaude(promptMode);
  }, [promptMode, callClaude]);

  /* ── Stale-output tracking ── */

  useEffect(() => {
    setOutputStale(true);
  }, [sourceText, selectedAttribute, dimensionValue]);

  useEffect(() => {
    setOutputStale(true);
    setBridgeConnected(false);
  }, [bridgePerspective]);

  /* ── Derived styles ── */

  const caveat: React.CSSProperties = {
    fontFamily: "'Caveat', cursive",
    fontWeight: 500,
    fontSize: "1.1em",
    fontStyle: "normal",
  };
  const mono: React.CSSProperties = {
    fontFamily: "var(--ws-mono, var(--font-mono))",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  };

  const promptCardVisible = stage >= 6;

  const cardBg =
    promptMode === "semantic"
      ? "radial-gradient(circle at 14% 16%, rgba(255,255,255,0.2), transparent 24%), radial-gradient(circle at 84% 84%, rgba(255,255,255,0.14), transparent 28%), linear-gradient(180deg, rgba(254,179,210,0.97) 0%, rgba(254,179,210,0.94) 70%, rgba(254,179,210,0.82) 100%)"
      : promptMode === "dimensional"
        ? POPPINS_LIME
        : "rgba(255,255,255,0.85)";
  const cardBorder =
    promptMode === "basic"
      ? `1px solid color-mix(in srgb, ${darkColor} 8%, transparent)`
      : "none";
  const cardPadding =
    promptMode === "semantic" ? "36px 36px 24px" : "32px";
  const cardShadow =
    promptMode === "semantic"
      ? "0 24px 48px rgba(254,179,210,0.05), inset 0 -24px 36px rgba(255,255,255,0.05)"
      : "none";

  const modeLabelText =
    promptMode === "semantic"
      ? "Semantic navigation"
      : promptMode === "dimensional"
        ? "Dimensional navigation"
        : "Simple prompt";

  const showOutput =
    output !== null && activeMode === promptMode && !outputStale;

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
          padding: "60px 48px",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: 900, width: "100%", display: "grid" }}>
          {/* Phase 1: Principles */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: principlesPhase ? 1 : 0,
              transform: principlesPhase ? "translateY(0)" : "translateY(-24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: principlesPhase ? "auto" : "none",
            }}
          >
            <div
              style={{
                ...mono,
                marginBottom: 14,
                color: accentColor,
                background: "rgba(196,221,5,0.1)",
                display: "inline-block",
                padding: "4px 12px",
              }}
            >
              Foundation
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
              The Four <span style={caveat}>Principles</span>
            </h2>
            <p
              style={{
                fontFamily: "var(--ws-font, var(--font-sans))",
                fontSize: 17,
                fontWeight: 400,
                color: `color-mix(in srgb, ${darkColor} 55%, transparent)`,
                lineHeight: 1.7,
                maxWidth: 540,
                margin: "8px 0 0",
              }}
            >
              How we work with AI in practice.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14,
                marginTop: 40,
              }}
            >
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
                      transform: visible
                        ? "translateY(0)"
                        : "translateY(24px)",
                      transition:
                        "opacity 500ms cubic-bezier(0.16,1,0.3,1), transform 500ms cubic-bezier(0.16,1,0.3,1)",
                      transitionDelay: `${i * 80}ms`,
                    }}
                  >
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                      {card.title}
                    </h3>
                    <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.75 }}>
                      {card.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase 2: Prompt playground */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: promptCardVisible ? 1 : 0,
              transform: promptCardVisible
                ? "translateY(0)"
                : "translateY(24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: promptCardVisible ? "auto" : "none",
            }}
          >
            {promptCardVisible && (
              <PromptPlayground
                mode={promptMode}
                modeLabel={modeLabelText}
                clientName={clientName}
                sourceText={sourceText}
                onSourceChange={setSourceText}
                sourceLabel="Your content"
                attributeOptions={ATTRIBUTE_OPTIONS}
                selectedAttribute={selectedAttribute}
                onAttributeChange={setSelectedAttribute}
                dimensionValue={dimensionValue}
                onDimensionChange={setDimensionValue}
                perspectiveOptions={PERSPECTIVE_OPTIONS}
                selectedPerspective={bridgePerspective}
                onPerspectiveChange={setBridgePerspective}
                onGenerate={handleGenerate}
                loading={loading}
                output={output}
                outputStale={outputStale}
                showOutput={showOutput}
                bridgeConnected={bridgeConnected}
                accentColor={accentColor}
                darkColor={darkColor}
                cardStyle={{
                  background: cardBg,
                  border: cardBorder,
                  padding: cardPadding,
                  boxShadow: cardShadow,
                  color: darkColor,
                }}
              />
            )}
          </div>

          {/* Scroll hint */}
          {progress < 0.92 && (
            <div
              style={{
                textAlign: "center",
                marginTop: 28,
                ...mono,
                opacity: 0.18,
                fontSize: 9,
                transition: "opacity 300ms",
              }}
            >
              keep scrolling to reveal more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
