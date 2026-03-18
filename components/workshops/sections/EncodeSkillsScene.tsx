"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  POPPINS_PROFILES,
} from "@/lib/workshops/poppinsTeamProfiles";
import {
  POPPINS_USE_CASES,
  getUseCaseByName,
} from "@/lib/workshops/poppinsUseCases";
import s from "./PromptPlayground.module.css";

const TOTAL_STAGES = 8;

type Props = {
  clientName: string;
  accentColor?: string;
  darkColor?: string;
};

export function EncodeSkillsScene({
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
  const showOverview = stage <= 3;
  const showGenerator = stage >= 4;

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
          {/* Phase 1: Skills Overview */}
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
                background: "rgba(254,179,210,0.2)",
                display: "inline-block",
                padding: "4px 12px",
              }}
            >
              Reusable patterns
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
              <span style={caveat}>Skills</span>
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
              Different from Projects. Projects = context. Skills = process.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                {
                  title: "What it is",
                  body: "A reusable workflow saved as a SKILL.md file. Think of it as a template for a repeated task. Build once, use everywhere.",
                },
                {
                  title: "Open standard",
                  body: "Not locked to Claude. agentskills.io is an open format. Your skill works in other tools too.",
                },
                {
                  title: "The secret weapon",
                  body: "Embed a \u201cnever say\u201d list. Define the tone. Set constraints. Your process, automated.",
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

          {/* Phase 2: Skill Generator */}
          <div
            style={{
              gridArea: "1 / 1",
              opacity: showGenerator ? 1 : 0,
              transform: showGenerator ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: showGenerator ? "auto" : "none",
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
              Build yours
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
              Skill <span style={caveat}>Generator</span>
            </h2>

            <SkillGeneratorPanel
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

/* ── Skill Generator Panel ── */

function SkillGeneratorPanel({
  clientName,
  accentColor = "#FE6744",
  darkColor = "#241D1B",
}: Props) {
  const [selectedName, setSelectedName] = useState(POPPINS_PROFILES[3].name);
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outputStale, setOutputStale] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const useCase = getUseCaseByName(selectedName);
  const profile = POPPINS_PROFILES.find((p) => p.name === selectedName);
  const selectedSkill = useCase?.skills[0];

  const handleNameChange = useCallback((name: string) => {
    setSelectedName(name);
    setOutputStale(true);
    setOutput(null);
  }, []);

  const generate = useCallback(async () => {
    if (!useCase || !selectedSkill) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setOutputStale(false);
    try {
      const res = await fetch("/api/workshops/skill-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedName,
          role: useCase.role,
          background: useCase.background,
          skillSlug: selectedSkill.slug,
          skillDescription: selectedSkill.description,
          clientName,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (controller.signal.aborted) return;
      setOutput(data.skill);
    } catch {
      /* aborted or network */
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [selectedName, useCase, selectedSkill, clientName]);

  const canGenerate = !loading && !!selectedSkill;
  const ctaLabel = loading ? "Generating\u2026" : "Generate Skill";

  const copySkill = useCallback(() => {
    if (output) navigator.clipboard.writeText(output);
  }, [output]);

  const downloadSkill = useCallback(() => {
    if (!output || !selectedSkill) return;
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSkill.slug}.skill`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output, selectedSkill]);

  const truncatedPreview = output
    ? output.length > 1200
      ? output.slice(0, 1200) + "\n\n\u2026 (truncated)"
      : output
    : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20,
      }}
      className={s.skillGrid}
    >
      {/* Left panel: person selector + skill details */}
      <div
        className={s.card}
        style={{
          background: "rgba(255,255,255,0.85)",
          border: `1px solid color-mix(in srgb, ${darkColor} 8%, transparent)`,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div className={s.modeLabel}>Skill Builder</div>

        <div>
          <label className={s.sourceLabel}>Team member</label>
          <select
            className={s.select}
            value={selectedName}
            onChange={(e) => handleNameChange(e.target.value)}
            style={{ width: "100%", fontSize: 14 }}
          >
            {POPPINS_USE_CASES.map((uc) => (
              <option key={uc.name} value={uc.name}>
                {uc.name} — {uc.role}
              </option>
            ))}
          </select>
        </div>

        {useCase && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className={s.sourceLabel}>Background</label>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: `color-mix(in srgb, ${darkColor} 60%, transparent)`,
                  margin: 0,
                }}
              >
                {useCase.background}
              </p>
            </div>

            <div>
              <label className={s.sourceLabel}>Skill ideas</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {useCase.skills.map((sk) => (
                  <div
                    key={sk.slug}
                    style={{
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.5)",
                      border: `1px solid color-mix(in srgb, ${darkColor} 8%, transparent)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--ws-mono,var(--font-mono))",
                        fontSize: 11,
                        fontWeight: 600,
                        marginBottom: 4,
                        color: accentColor,
                      }}
                    >
                      {sk.slug}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: `color-mix(in srgb, ${darkColor} 55%, transparent)`,
                        margin: 0,
                      }}
                    >
                      {sk.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={s.cta}
              style={{
                background: "#FEB3D2",
                color: darkColor,
                fontWeight: 700,
                opacity: loading ? 0.5 : 1,
                width: "100%",
              }}
              onClick={generate}
              disabled={!canGenerate}
            >
              {ctaLabel}
            </button>
          </div>
        )}
      </div>

      {/* Right panel: skill preview */}
      <div
        className={s.card}
        style={{
          background: "#FEB3D2",
          color: darkColor,
          padding: 28,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className={s.outputLabel}
          style={{ color: darkColor }}
        >
          Generated Skill
        </div>

        {truncatedPreview ? (
          <>
            <pre
              style={{
                flex: 1,
                fontSize: 12,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "var(--ws-mono, var(--font-mono))",
                opacity: loading ? 0.4 : 1,
                overflow: "auto",
                maxHeight: "50vh",
                margin: "8px 0 16px",
              }}
            >
              {truncatedPreview}
            </pre>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={s.cta}
                style={{
                  background: darkColor,
                  color: "#FEB3D2",
                  flex: 1,
                }}
                onClick={copySkill}
              >
                Copy
              </button>
              <button
                type="button"
                className={s.cta}
                style={{
                  background: `color-mix(in srgb, ${darkColor} 15%, transparent)`,
                  color: darkColor,
                  flex: 1,
                }}
                onClick={downloadSkill}
              >
                Download .skill
              </button>
            </div>
          </>
        ) : (
          <div
            className={s.outputPlaceholder}
            style={{
              color: darkColor,
              flex: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            {outputStale
              ? "Person changed \u2014 click Generate to create a skill"
              : loading
                ? "Generating skill\u2026"
                : "Select a team member and click Generate Skill"}
          </div>
        )}
      </div>
    </div>
  );
}
