"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  POPPINS_PROFILES,
  POPPINS_ROLES,
} from "@/lib/workshops/poppinsTeamProfiles";
import s from "./PromptPlayground.module.css";

type Props = {
  clientName: string;
  accentColor?: string;
  darkColor?: string;
};

export function SystemPromptStudio({
  clientName,
  accentColor = "#FE6744",
  darkColor = "#241D1B",
}: Props) {
  const [selectedName, setSelectedName] = useState(POPPINS_PROFILES[3].name);
  const [selectedRole, setSelectedRole] = useState(POPPINS_PROFILES[3].role);
  const [contextText, setContextText] = useState(POPPINS_PROFILES[3].context);
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outputStale, setOutputStale] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleNameChange = useCallback(
    (name: string) => {
      setSelectedName(name);
      const profile = POPPINS_PROFILES.find((p) => p.name === name);
      if (profile) {
        setSelectedRole(profile.role);
        setContextText(profile.context);
      }
      setOutputStale(true);
    },
    [],
  );

  const handleRoleChange = useCallback((role: string) => {
    setSelectedRole(role);
    setOutputStale(true);
  }, []);

  useEffect(() => {
    setOutputStale(true);
  }, [contextText]);

  const generate = useCallback(async () => {
    if (!contextText.trim()) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setOutputStale(false);
    try {
      const res = await fetch("/api/workshops/system-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedName,
          role: selectedRole,
          context: contextText,
          clientName,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (controller.signal.aborted) return;
      setOutput(data.systemPrompt);
    } catch {
      /* aborted or network */
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [selectedName, selectedRole, contextText, clientName]);

  const canGenerate = !loading && contextText.trim().length > 0;
  const ctaLabel = loading ? "Navigating\u2026" : "Navigate";
  const showOutput = output !== null && !outputStale;

  return (
    <div
      className={s.card}
      style={{
        background: "rgba(255,255,255,0.85)",
        border: `1px solid color-mix(in srgb, ${darkColor} 8%, transparent)`,
        padding: 32,
      }}
    >
      <div className={s.modeLabel}>System Prompt Drafter</div>

      <div className={s.promptRow} style={{ fontSize: "clamp(16px, 1.8vw, 22px)" }}>
        <span>{"\u201CI\u2019m"}</span>
        <select
          className={s.select}
          value={selectedName}
          onChange={(e) => handleNameChange(e.target.value)}
        >
          {POPPINS_PROFILES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <span>, working as</span>
        <select
          className={s.select}
          value={selectedRole}
          onChange={(e) => handleRoleChange(e.target.value)}
        >
          {POPPINS_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span>at {clientName}.{"\u201D"}</span>
      </div>

      <div className={s.sourceRow}>
        <label className={s.sourceLabel}>Background &amp; context</label>
        <div className={s.sourceWithCta}>
          <textarea
            className={s.sourceInput}
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="Your role context, recurring tasks, what AI should always know\u2026"
            rows={3}
            style={{ minHeight: 72 }}
          />
          <button
            type="button"
            className={s.cta}
            style={{
              background: darkColor,
              color: "var(--ws-bg, #FCF3EC)",
              opacity: loading ? 0.5 : 1,
              alignSelf: "flex-end",
            }}
            onClick={generate}
            disabled={!canGenerate}
          >
            {ctaLabel}
          </button>
        </div>
      </div>

      <div
        className={s.output}
        style={{ background: "#FEB3D2", color: darkColor }}
      >
        <div
          className={s.outputLabel}
          style={{ color: darkColor }}
        >
          Generated System Prompt
        </div>
        {showOutput ? (
          <div
            className={s.outputText}
            style={{ opacity: loading ? 0.4 : 1, whiteSpace: "pre-wrap" }}
          >
            {output}
          </div>
        ) : (
          <div
            className={s.outputPlaceholder}
            style={{ color: `color-mix(in srgb, ${darkColor} 50%, transparent)` }}
          >
            {outputStale
              ? "Parameters changed \u2014 click Navigate to update"
              : "Click Navigate to generate a system prompt"}
          </div>
        )}
      </div>
    </div>
  );
}
