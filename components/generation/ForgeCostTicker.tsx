"use client";

import { useEffect, useState } from "react";
import styles from "./ForgeCostTicker.module.css";

type AnalyticsOverview = {
  totals?: { estimatedCost30d?: number; generations30d?: number; outputs30d?: number };
  topModels?: Array<{ modelId: string; count: number }>;
};

export function ForgeCostTicker() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchCost() {
      try {
        const res = await fetch("/api/analytics/overview", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as AnalyticsOverview;
        setData(json);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    }
    void fetchCost();
    const interval = setInterval(fetchCost, 30000);
    return () => clearInterval(interval);
  }, []);

  const cost = data?.totals?.estimatedCost30d ?? 0;
  const formatted = typeof cost === "number" ? `$${cost.toFixed(2)}` : "$0.00";

  return (
    <div
      className={styles.ticker}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className={styles.main}>
        <span className={styles.label}>REPLICATE</span>
        <span className={styles.value}>
          {error ? "—" : formatted}
        </span>
      </div>
      {expanded && (
        <div className={styles.details} role="region" aria-label="Cost breakdown">
          {error && <div className={styles.error}>{error}</div>}
          {!error && data && (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Total (30d)</span>
                <span className={styles.detailValue}>{formatted}</span>
              </div>
              {data.totals?.generations30d != null && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Generations</span>
                  <span className={styles.detailValue}>{data.totals.generations30d}</span>
                </div>
              )}
              {Array.isArray(data.topModels) &&
                data.topModels.slice(0, 5).map(({ modelId, count }) => (
                  <div key={modelId} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{modelId}</span>
                    <span className={styles.detailValue}>{count}</span>
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
