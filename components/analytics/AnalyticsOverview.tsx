"use client";

import { useEffect, useMemo, useState } from "react";

type AnalyticsPayload = {
  totals: {
    generations30d: number;
    outputs30d: number;
    estimatedCost30d: number;
  };
  statusCounts: Record<string, number>;
  topModels: Array<{ modelId: string; count: number }>;
  last7Days: Array<{ day: string; count: number }>;
};

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/analytics/overview", { cache: "no-store" });
        const payload = (await response.json()) as AnalyticsPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Failed to load analytics");
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const maxDailyCount = useMemo(() => {
    if (!data?.last7Days.length) return 1;
    return Math.max(1, ...data.last7Days.map((entry) => entry.count));
  }, [data]);

  if (loading) return <p className="text-sm text-[var(--dawn-30)]">Loading analytics...</p>;
  if (error) return <p className="text-sm" style={{ color: "var(--status-error)" }} role="alert">{error}</p>;
  if (!data) return null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="generations (30d)" value={String(data.totals.generations30d)} />
        <MetricCard label="outputs (30d)" value={String(data.totals.outputs30d)} />
        <MetricCard label="estimated cost (30d)" value={`$${data.totals.estimatedCost30d.toFixed(4)}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-3">
          <h3 className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]" style={{ fontFamily: "var(--font-mono)" }}>
            status distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(data.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between border border-[var(--dawn-08)] px-2 py-1 text-xs">
                <span className="uppercase tracking-[0.08em] text-[var(--dawn-50)]">{status}</span>
                <span className="text-[var(--dawn)]">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-3">
          <h3 className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]" style={{ fontFamily: "var(--font-mono)" }}>
            top models
          </h3>
          <div className="space-y-2">
            {data.topModels.map((model) => (
              <div key={model.modelId} className="flex items-center justify-between border border-[var(--dawn-08)] px-2 py-1 text-xs">
                <span className="truncate text-[var(--dawn-50)]">{model.modelId}</span>
                <span className="text-[var(--dawn)]">{model.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="border border-[var(--gold)] bg-[var(--surface-0)] p-3">
        <h3 className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]" style={{ fontFamily: "var(--font-mono)" }}>
          last 7 days generation volume
        </h3>
        <div className="space-y-2">
          {data.last7Days.map((entry) => (
            <div key={entry.day} className="grid grid-cols-[80px_1fr_40px] items-center gap-2 text-xs">
              <span className="text-[var(--dawn-50)]">{entry.day.slice(5)}</span>
              <div className="h-2 border border-[var(--dawn-15)] bg-[var(--void)]">
                <div
                  className="h-full bg-[var(--gold)]"
                  style={{ width: `${Math.max(4, Math.round((entry.count / maxDailyCount) * 100))}%` }}
                />
              </div>
              <span className="text-right text-[var(--dawn)]">{entry.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="border border-[var(--dawn-08)] bg-[var(--surface-0)] p-3">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]" style={{ fontFamily: "var(--font-mono)" }}>
        {label}
      </div>
      <div className="mt-2 text-xl text-[var(--gold)]">{value}</div>
    </section>
  );
}
