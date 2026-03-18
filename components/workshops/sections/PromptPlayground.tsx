"use client";

import React from "react";
import { SemanticBridgeMap } from "./SemanticBridgeMap";
import s from "./PromptPlayground.module.css";

export type PromptMode = "basic" | "dimensional" | "semantic";
export type AttributeOption = { value: string; label: string };
export type PerspectiveOption = {
  value: string;
  label: string;
  mapLabel: string;
  destPoint: { x: number; y: number };
};

export type PromptPlaygroundProps = {
  mode: PromptMode;
  modeLabel: string;
  clientName: string;

  sourceText: string;
  onSourceChange: (v: string) => void;
  sourceLabel?: string;

  attributeOptions: AttributeOption[];
  selectedAttribute: string;
  onAttributeChange: (v: string) => void;

  dimensionValue: number;
  onDimensionChange: (v: number) => void;

  perspectiveOptions: PerspectiveOption[];
  selectedPerspective: string;
  onPerspectiveChange: (v: string) => void;

  onGenerate: () => void;
  loading: boolean;
  output: string | null;
  outputStale: boolean;
  showOutput: boolean;

  bridgeConnected: boolean;

  accentColor?: string;
  darkColor?: string;

  cardStyle?: React.CSSProperties;
};

export function PromptPlayground({
  mode,
  modeLabel,
  clientName,
  sourceText,
  onSourceChange,
  sourceLabel = "Your content",
  attributeOptions,
  selectedAttribute,
  onAttributeChange,
  dimensionValue,
  onDimensionChange,
  perspectiveOptions,
  selectedPerspective,
  onPerspectiveChange,
  onGenerate,
  loading,
  output,
  outputStale,
  showOutput,
  bridgeConnected,
  accentColor = "#FE6744",
  darkColor = "#241D1B",
  cardStyle,
}: PromptPlaygroundProps) {
  const perspectiveData = perspectiveOptions.find(
    (p) => p.value === selectedPerspective,
  );
  const ctaLabel = loading ? "Navigating\u2026" : "Navigate";
  const canGenerate = !loading && sourceText.trim().length > 0;

  const ctaColors: React.CSSProperties = {
    background: darkColor,
    color: "var(--ws-bg, #FCF3EC)",
    opacity: loading ? 0.5 : 1,
  };

  return (
    <div className={s.card} style={cardStyle}>
      {/* Mode label */}
      <div className={s.modeLabel}>{modeLabel}</div>

      {/* Prompt row: sentence + inline select */}
      <div className={s.promptRow}>
        {mode === "semantic" ? (
          <>
            <span>
              {`\u201CAnalyze ${clientName}\u2019s brand strategy from the perspective of`}
            </span>
            <select
              className={s.select}
              value={selectedPerspective}
              onChange={(e) => onPerspectiveChange(e.target.value)}
            >
              {perspectiveOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <span>
              {`\u201CRewrite this ${clientName} social post for`}
            </span>
            <select
              className={s.select}
              value={selectedAttribute}
              onChange={(e) => onAttributeChange(e.target.value)}
            >
              {attributeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        )}
        <span>{".\u201D"}</span>
      </div>

      {/* Shared context/content input */}
      <div className={s.sourceRow}>
        <label className={s.sourceLabel}>{sourceLabel}</label>
        <textarea
          className={s.sourceInput}
          value={sourceText}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="Paste your content here\u2026"
          rows={1}
        />
      </div>

      {/* Dimensional: expanding slider row */}
      <div
        className={s.expandSection}
        style={{
          gridTemplateRows: mode === "dimensional" ? "1fr" : "0fr",
          opacity: mode === "dimensional" ? 1 : 0,
        }}
      >
        <div
          className={s.expandInner}
          style={{ paddingBottom: mode === "dimensional" ? 12 : 0 }}
        >
          <div className={s.sliderRow}>
            <label className={s.sliderLabel}>{selectedAttribute}</label>
            <input
              type="range"
              className={s.slider}
              min={0}
              max={10}
              value={dimensionValue}
              onChange={(e) => onDimensionChange(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, ${darkColor}, ${accentColor})`,
              }}
            />
            <span className={s.sliderValue}>{dimensionValue}</span>
          </div>
        </div>
      </div>

      {/* Semantic: expanding bridge map */}
      <div
        className={s.expandSection}
        style={{
          gridTemplateRows: mode === "semantic" ? "1fr" : "0fr",
          opacity: mode === "semantic" ? 1 : 0,
        }}
      >
        <div
          className={s.expandInner}
          style={{ paddingBottom: mode === "semantic" ? 10 : 0 }}
        >
          <SemanticBridgeMap
            leftLabel={`${clientName} Brand Strategy`}
            rightLabel={perspectiveData?.mapLabel ?? ""}
            accentColor={accentColor}
            darkColor={darkColor}
            connected={bridgeConnected}
            destPoint={perspectiveData?.destPoint}
          />
        </div>
      </div>

      {/* Unified action row */}
      <div className={s.actionRow}>
        <button
          type="button"
          className={s.cta}
          style={ctaColors}
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Output area */}
      <div
        className={s.output}
        style={{ background: darkColor, color: "var(--ws-bg, #FCF3EC)" }}
      >
        <div
          className={s.outputLabel}
          style={{ color: "var(--ws-bg, #FCF3EC)" }}
        >
          Output
        </div>
        {showOutput ? (
          <div
            className={s.outputText}
            style={{ opacity: loading ? 0.4 : 1 }}
          >
            {output}
          </div>
        ) : (
          <div
            className={s.outputPlaceholder}
            style={{ color: "var(--ws-bg, #FCF3EC)" }}
          >
            {outputStale
              ? "Parameters changed \u2014 click Navigate to update"
              : "Click Navigate to generate"}
          </div>
        )}
      </div>
    </div>
  );
}
