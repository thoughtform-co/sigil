"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

const HomeGlobeScene = dynamic(
  () => import("./HomeGlobeScene").then((m) => m.HomeGlobeScene),
  { ssr: false },
);

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--dawn-30)",
  marginBottom: 6,
};

const VALUE_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--dawn-50)",
  lineHeight: 1.6,
};

const GOLD_VALUE: React.CSSProperties = {
  ...VALUE_STYLE,
  color: "var(--gold)",
};

const DIVIDER: React.CSSProperties = {
  borderTop: "1px solid var(--dawn-08)",
  margin: "12px 0",
  width: "100%",
};

type HomeLandingProps = {
  isAdmin?: boolean;
};

export function HomeLanding({ isAdmin }: HomeLandingProps) {
  const { isAdmin: authIsAdmin } = useAuth();
  const admin = isAdmin ?? authIsAdmin;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "calc(100vh - 200px)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 0,
      }}
    >
      {/* Left panel — pinned to left rail edge, top-aligned like dashboard headers */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          alignSelf: "start",
          width: 160,
          flexShrink: 0,
        }}
      >
        <span style={LABEL_STYLE}>SYSTEM</span>
        <span style={VALUE_STYLE}>SIGIL</span>
        <span style={{ ...VALUE_STYLE, color: "var(--dawn-15)" }}>v0.1</span>

        <div style={DIVIDER} />

        <span style={LABEL_STYLE}>STATUS</span>
        <span style={GOLD_VALUE}>ONLINE</span>

        {admin && (
          <>
            <div style={DIVIDER} />
            <span style={LABEL_STYLE}>MODE</span>
            <span style={GOLD_VALUE}>ADMIN</span>
          </>
        )}
      </div>

      {/* Globe — centered in remaining space */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <HomeGlobeScene />
      </div>

      {/* Right panel — pinned to right rail edge, top-aligned like dashboard headers */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          textAlign: "right",
          alignSelf: "start",
          width: 160,
          flexShrink: 0,
        }}
      >
        <span style={LABEL_STYLE}>ORIGIN</span>
        <span style={VALUE_STYLE}>THOUGHTFORM</span>
        <span style={{ ...VALUE_STYLE, color: "var(--dawn-15)" }}>
          NAVIGATE INTELLIGENCE
        </span>

        <div style={DIVIDER} />

        <span style={LABEL_STYLE}>INTERFACE</span>
        <span style={VALUE_STYLE}>SIGIL</span>

        {admin && (
          <>
            <div style={DIVIDER} />
            <span style={LABEL_STYLE}>JOURNEYS</span>
            <span style={GOLD_VALUE}>ACTIVE</span>
          </>
        )}
      </div>
    </div>
  );
}
