"use client";

import { useState } from "react";
import { CardFrame } from "@/components/ui/CardFrame";
import { CardTitle, CardDivider, CardStats, CardArrowAction } from "@/components/ui/card";
import { ParticleIcon } from "@/components/ui/ParticleIcon";
import { JourneyCardCompact } from "@/components/ui/JourneyCardCompact";

const SAMPLE = {
  journeyName: "Thoughtform Arcs",
  journeyType: "create",
  routeName: "Vulpia",
  routeCount: 3,
  siblingRoutes: ["Vulpia", "Meridian", "Helix"],
  waypointCount: 4,
  activeMode: "image" as const,
  modes: ["image", "video", "canvas"] as const,
};

const SPINE_WIDTH = 280;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--dawn-30)",
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: "1px solid var(--dawn-08)",
      }}
    >
      {children}
    </div>
  );
}

function OptionLabel({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--gold)",
          marginBottom: 4,
        }}
      >
        {id}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--dawn)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
          color: "var(--dawn-50)",
          lineHeight: 1.5,
          maxWidth: 320,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function TreeConnector({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingLeft: 16, paddingTop: 8, position: "relative" }}>
      <svg
        aria-hidden
        width="12"
        height="16"
        viewBox="0 0 12 16"
        fill="none"
        style={{ position: "absolute", left: 0, top: 1 }}
      >
        <path
          d="M0 0V8H11"
          stroke="var(--dawn-15)"
          strokeWidth="1"
          strokeLinecap="square"
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {children}
    </div>
  );
}

function RouteNameLabel({ name, active }: { name: string; active?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: active ? "var(--gold)" : "var(--dawn-50)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "block",
      }}
    >
      {name}
    </span>
  );
}

function ModeIndicator({ modes, activeMode }: { modes: readonly string[]; activeMode: string }) {
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
      {modes.map((m) => {
        const isActive = m === activeMode;
        return (
          <button
            key={m}
            type="button"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: isActive ? "var(--gold)" : "var(--dawn-30)",
              background: "none",
              border: "none",
              padding: "4px 0",
              cursor: "pointer",
              borderBottom: isActive ? "1px solid var(--gold-30)" : "1px solid transparent",
              transition: "color 120ms ease, border-color 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--dawn-50)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = "var(--dawn-30)";
            }}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}

function FakeWaypointTree() {
  const waypoints = [
    { label: "Waypoint I", hasThumb: true },
    { label: "Waypoint II", hasThumb: true },
    { label: "Waypoint III", hasThumb: false },
  ];

  return (
    <div style={{ paddingLeft: 40, marginTop: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {waypoints.map((wp, idx) => (
          <div key={idx} style={{ position: "relative", paddingLeft: 18 }}>
            <svg
              aria-hidden
              width="18"
              height="40"
              viewBox="0 0 18 40"
              fill="none"
              style={{ position: "absolute", left: 2, top: -7 }}
            >
              <path
                d={`M0 0V39H17`}
                stroke="var(--dawn-15)"
                strokeWidth="1"
                strokeLinecap="square"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div
              style={{
                width: 48,
                height: 48,
                border: idx === 0 ? "1px solid var(--gold)" : "1px solid var(--dawn-08)",
                background: wp.hasThumb ? "var(--surface-1)" : "var(--surface-0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {wp.hasThumb ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, var(--dawn-08), var(--dawn-04))",
                  }}
                />
              ) : (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--dawn-15)" }}>
                  ◇
                </span>
              )}
            </div>
          </div>
        ))}
        <div style={{ position: "relative", paddingLeft: 18 }}>
          <svg
            aria-hidden
            width="18"
            height="30"
            viewBox="0 0 18 30"
            fill="none"
            style={{ position: "absolute", left: 2, top: -7 }}
          >
            <path
              d="M0 0V29H17"
              stroke="var(--dawn-15)"
              strokeWidth="1"
              strokeLinecap="square"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            style={{
              width: 48,
              height: 32,
              border: "1px dashed var(--dawn-15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--dawn-30)" }}>+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Current state: what's live today ─── */

function CurrentDashboard() {
  const [expanded, setExpanded] = useState(true);

  const routeTree = expanded ? (
    <div data-route-tree style={{ marginTop: 6 }}>
      {SAMPLE.siblingRoutes.map((r, i) => (
        <div
          key={r}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 0",
          }}
        >
          <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M0 0V6H11" stroke="var(--dawn-15)" strokeWidth="1" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: i === 0 ? "var(--gold)" : "var(--dawn-50)",
              cursor: "pointer",
            }}
          >
            {r}
          </span>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div style={{ width: SPINE_WIDTH + 60 }}>
      <JourneyCardCompact
        name={SAMPLE.journeyName}
        type={SAMPLE.journeyType}
        routeCount={SAMPLE.routeCount}
        state="selected"
        action={<CardArrowAction active size="md" />}
        routeTree={routeTree}
        onClick={() => setExpanded((p) => !p)}
        style={{ width: SPINE_WIDTH + 60 }}
      />
    </div>
  );
}

function CurrentRoutePage() {
  return (
    <div style={{ width: SPINE_WIDTH }}>
      <CardFrame
        presentation="ghost"
        style={{ width: SPINE_WIDTH, padding: "10px 14px" }}
      >
        <div>
          <CardTitle fontSize="12px" color="var(--gold)" action={<CardArrowAction active />}>
            {SAMPLE.journeyName}
          </CardTitle>
          <div style={{ borderBottom: "1px solid var(--dawn-08)", marginTop: 8 }} />
        </div>
        <TreeConnector>
          <RouteNameLabel name={SAMPLE.routeName} />
        </TreeConnector>
      </CardFrame>
      <FakeWaypointTree />
    </div>
  );
}

/* ─── Option A: Route-Centric Spine ─── */

function OptionA() {
  return (
    <div style={{ width: SPINE_WIDTH }}>
      {/* Journey = ambient text breadcrumb, no card */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <CardArrowAction active size="sm" />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--gold-50, var(--gold))",
          }}
        >
          {SAMPLE.journeyName}
        </span>
      </div>

      {/* Route gets the ghost card */}
      <CardFrame
        presentation="ghost"
        style={{ width: SPINE_WIDTH, padding: "10px 14px" }}
      >
        <CardTitle fontSize="13px" color="var(--dawn)">
          {SAMPLE.routeName}
        </CardTitle>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--dawn-30)",
            marginTop: 6,
          }}
        >
          {SAMPLE.activeMode}
        </div>
      </CardFrame>

      <FakeWaypointTree />
    </div>
  );
}

/* ─── Option B: Contextual Switcher ─── */

function OptionB() {
  const [activeRoute, setActiveRoute] = useState(SAMPLE.routeName);

  return (
    <div style={{ width: SPINE_WIDTH }}>
      <CardFrame
        presentation="ghost"
        style={{ width: SPINE_WIDTH, padding: "10px 14px" }}
      >
        <CardTitle fontSize="12px" color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <div style={{ borderBottom: "1px solid var(--dawn-08)", marginTop: 8 }} />

        <div style={{ marginTop: 8 }}>
          {SAMPLE.siblingRoutes.map((r) => {
            const isCurrent = r === activeRoute;
            return (
              <div
                key={r}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 0",
                  cursor: "pointer",
                }}
                onClick={() => setActiveRoute(r)}
              >
                <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M0 0V6H11" stroke={isCurrent ? "var(--gold-30)" : "var(--dawn-15)"} strokeWidth="1" />
                </svg>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: isCurrent ? "var(--gold)" : "var(--dawn-40)",
                    transition: "color 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.color = "var(--dawn-70)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.color = "var(--dawn-40)";
                  }}
                >
                  {r}
                </span>
                {isCurrent && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "8px",
                      color: "var(--gold-30)",
                      marginLeft: "auto",
                    }}
                  >
                    ◈
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardFrame>

      <FakeWaypointTree />
    </div>
  );
}

/* ─── Option C: Workspace Context Panel ─── */

function OptionC() {
  return (
    <div style={{ width: SPINE_WIDTH }}>
      <CardFrame
        presentation="ghost"
        style={{ width: SPINE_WIDTH, padding: "10px 14px" }}
      >
        {/* Journey = ambient top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CardArrowAction active size="sm" />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gold-50, var(--gold))",
            }}
          >
            {SAMPLE.journeyName}
          </span>
        </div>

        <CardDivider marginTop={8} marginBottom={8} />

        {/* Route = prominent anchor */}
        <CardTitle fontSize="13px" color="var(--dawn)">
          {SAMPLE.routeName}
        </CardTitle>

        {/* Mode tabs */}
        <ModeIndicator modes={SAMPLE.modes} activeMode={SAMPLE.activeMode} />
      </CardFrame>

      <FakeWaypointTree />
    </div>
  );
}

/* ─── Page layout ─── */

export default function MockupsPage() {
  const [isLight, setIsLight] = useState(false);

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    if (next) document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }

  return (
    <div
      className="bg-void text-dawn dot-grid-bg"
      style={{
        minHeight: "100vh",
        padding: "48px 56px",
      }}
    >
      <div style={{ marginBottom: 48, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "15px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: 0,
            }}
          >
            Route Page Spine — Card Options
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "var(--dawn-50)",
              marginTop: 8,
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            Side-by-side comparison of different information architectures for the Route page
            left-spine card. The Dashboard card is shown for reference. All rendered with production components.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--dawn-50)",
            background: "none",
            border: "1px solid var(--dawn-15)",
            padding: "6px 14px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "border-color 120ms ease, color 120ms ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--gold-30)";
            e.currentTarget.style.color = "var(--gold)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--dawn-15)";
            e.currentTarget.style.color = "var(--dawn-50)";
          }}
        >
          {isLight ? "Dark Mode" : "Light Mode"}
        </button>
      </div>

      {/* Current state */}
      <div style={{ marginBottom: 64 }}>
        <SectionLabel>Current Implementation</SectionLabel>
        <div style={{ display: "flex", gap: 80, alignItems: "flex-start" }}>
          <div>
            <OptionLabel
              id="Dashboard"
              title="Journey Card (filled)"
              subtitle="Browsing context — shows route count, expandable tree, full card with fill."
            />
            <CurrentDashboard />
          </div>
          <div>
            <OptionLabel
              id="Route Page"
              title="Ghost Card (current)"
              subtitle="Working context — stripped-down journey card with route name. Feels like subtraction."
            />
            <CurrentRoutePage />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: "1px solid var(--dawn-08)",
          marginBottom: 48,
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: -7,
            left: 0,
            background: "var(--void)",
            padding: "0 12px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--gold-30)",
          }}
        >
          Proposed Options
        </span>
      </div>

      {/* Options */}
      <div style={{ display: "flex", gap: 80, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <OptionLabel
            id="Option A"
            title="Route-Centric Spine"
            subtitle="Journey becomes a text breadcrumb. The Route gets the ghost card — prominent name, mode indicator. Matches the user's actual focus."
          />
          <OptionA />
        </div>

        <div>
          <OptionLabel
            id="Option B"
            title="Contextual Switcher"
            subtitle="Ghost card becomes a navigation tool. Shows all sibling routes for switching without going back to Dashboard. Requires data layer change."
          />
          <OptionB />
        </div>

        <div>
          <OptionLabel
            id="Option C"
            title="Workspace Context Panel"
            subtitle="Single ghost card reframed as a workspace briefing: journey (ambient) → route (anchor) → mode (tool). Each layer serves a purpose."
          />
          <OptionC />
        </div>
      </div>
    </div>
  );
}
