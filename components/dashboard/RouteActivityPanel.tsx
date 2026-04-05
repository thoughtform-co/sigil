"use client";

import useSWR from "swr";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Diamond } from "@/components/ui/Diamond";

type ActivityItem = {
  id: string;
  prompt: string;
  status: string;
  modelId: string;
  createdAt: string;
  source: string | null;
  sessionName: string;
  sessionType: string;
  outputCount: number;
};

type ActivityData = {
  activity: ActivityItem[];
};

async function activityFetcher(url: string): Promise<ActivityData> {
  const res = await fetch(url);
  if (!res.ok) return { activity: [] };
  return res.json() as Promise<ActivityData>;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${mo}/${day} ${h}:${m}`;
}

function statusMeta(status: string): { text: string; color: string; diamondColor: "gold" | "inactive" | "alert" } {
  switch (status) {
    case "completed":
      return { text: "DONE", color: "var(--gold)", diamondColor: "gold" };
    case "processing":
    case "processing_locked":
      return { text: "PROC", color: "var(--dawn-50)", diamondColor: "inactive" };
    case "failed":
      return { text: "FAIL", color: "var(--alert)", diamondColor: "alert" };
    case "pending":
      return { text: "WAIT", color: "var(--dawn-30)", diamondColor: "inactive" };
    default:
      return { text: status.toUpperCase().slice(0, 4), color: "var(--dawn-30)", diamondColor: "inactive" };
  }
}

const READOUT: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

type RouteActivityPanelProps = {
  routeId: string | null;
};

export function RouteActivityPanel({ routeId }: RouteActivityPanelProps) {
  const { data, isLoading } = useSWR(
    routeId ? `/api/projects/${routeId}/activity` : null,
    activityFetcher,
    { revalidateOnFocus: false, dedupingInterval: 15_000 },
  );

  const activity = data?.activity ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "clip",
        paddingLeft: "var(--space-sm)",
      }}
    >
      <SectionHeader label="ACTIVITY" />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
        className="waypoint-branch-scroll"
      >
        {!routeId ? (
          <p
            style={{
              ...READOUT,
              fontSize: "10px",
              color: "var(--dawn-30)",
              padding: "var(--space-lg) 0",
            }}
          >
            Select a route to view activity
          </p>
        ) : isLoading && activity.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "var(--space-lg) 0",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                background: "var(--gold)",
                animation: "glowPulse 1.5s ease-in-out infinite",
              }}
            />
            <span style={{ ...READOUT, fontSize: "10px", color: "var(--dawn-30)" }}>
              Loading...
            </span>
          </div>
        ) : activity.length === 0 ? (
          <p
            style={{
              ...READOUT,
              fontSize: "10px",
              color: "var(--dawn-30)",
              padding: "var(--space-lg) 0",
            }}
          >
            No activity yet
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {activity.map((item, idx) => {
              const meta = statusMeta(item.status);
              return (
                <div
                  key={item.id}
                  style={{
                    borderTop: idx === 0 ? "1px solid var(--dawn-08)" : undefined,
                    borderBottom: "1px solid var(--dawn-08)",
                    padding: "10px 0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Diamond size="sm" color={meta.diamondColor} />
                    <span style={{ ...READOUT, color: meta.color }}>{meta.text}</span>
                    <span style={{ ...READOUT, color: "var(--dawn-30)", marginLeft: "auto" }}>
                      {formatTimestamp(item.createdAt)}
                    </span>
                  </div>

                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "11px",
                      lineHeight: 1.4,
                      color: "var(--dawn-50)",
                      marginTop: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.prompt}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                      ...READOUT,
                      color: "var(--dawn-30)",
                    }}
                  >
                    <span>{item.sessionName}</span>
                    <span style={{ color: "var(--dawn-15)" }}>&middot;</span>
                    <span>{item.sessionType}</span>
                    {item.outputCount > 0 && (
                      <>
                        <span style={{ color: "var(--dawn-15)" }}>&middot;</span>
                        <span>{item.outputCount}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
