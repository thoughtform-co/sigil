"use client";

import { useEffect, useState } from "react";

type HealthData = {
  stats?: { projects: number; sessions: number; generations: number; outputs: number };
  env?: Record<string, boolean>;
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
    return (
      <div className="admin-section" style={{ borderColor: "var(--status-error)" }}>
        <div className="admin-section-body" style={{ color: "var(--status-error)" }}>{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-section">
        <div className="admin-section-body" style={{ color: "var(--dawn-30)" }}>Loading health data…</div>
      </div>
    );
  }

  const statsRows = data.stats ?? { projects: 0, sessions: 0, generations: 0, outputs: 0 };
  const stats = [
    { label: "Routes", value: statsRows.projects },
    { label: "Waypoints", value: statsRows.sessions },
    { label: "Generations", value: statsRows.generations },
    { label: "Outputs", value: statsRows.outputs },
  ];
  const envEntries = Object.entries(data.env ?? {});

  return (
    <div className="grid gap-0 md:grid-cols-2">
      {/* Platform stats */}
      <div className="admin-section" style={{ borderRight: "none" }}>
        <div className="admin-section-title">Platform Stats</div>
        <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="admin-stat-label">{s.label}</span>
              <span className="admin-stat-value">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Provider readiness */}
      <div className="admin-section">
        <div className="admin-section-title">Provider Readiness</div>
        <div className="admin-section-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {envEntries.length === 0 ? (
            <div className="admin-stat-label" style={{ color: "var(--dawn-30)" }}>
              Provider readiness not available for this build.
            </div>
          ) : (
            envEntries.map(([key, enabled]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="admin-stat-label">{key}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: enabled ? "var(--atreides-light)" : "var(--dawn-30)",
                  }}
                >
                  {enabled ? "ready" : "missing"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
