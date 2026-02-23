"use client";

import { useEffect, useState } from "react";

type HealthData = {
  stats: { projects: number; sessions: number; generations: number; outputs: number };
  env: Record<string, boolean>;
};

export function AdminHealthPanel() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/health", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Failed to load admin health");
        return;
      }
      setData(payload as HealthData);
    }
    void load();
  }, []);

  if (error) {
    return <div className="border border-red-400/40 bg-[var(--surface-0)] p-4 text-red-300">{error}</div>;
  }

  if (!data) {
    return <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4 text-[var(--dawn-50)]">Loading health...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
        <h2 className="sigil-section-label" style={{ fontSize: "10px", letterSpacing: "0.08em", marginBottom: "var(--space-sm)" }}>
          platform stats
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--dawn)]">
          <li>Projects: {data.stats.projects}</li>
          <li>Sessions: {data.stats.sessions}</li>
          <li>Generations: {data.stats.generations}</li>
          <li>Outputs: {data.stats.outputs}</li>
        </ul>
      </div>
      <div className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4">
        <h2 className="sigil-section-label" style={{ fontSize: "10px", letterSpacing: "0.08em", marginBottom: "var(--space-sm)" }}>
          provider readiness
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--dawn)]">
          {Object.entries(data.env).map(([key, enabled]) => (
            <li key={key} className="flex items-center justify-between">
              <span>{key}</span>
              <span className={enabled ? "text-emerald-300" : "text-[var(--dawn-30)]"}>{enabled ? "ready" : "missing"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
