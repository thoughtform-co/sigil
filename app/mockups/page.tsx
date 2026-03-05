"use client";

import { useState } from "react";
import { CardFrame } from "@/components/ui/CardFrame";
import { CardTitle, CardDivider, CardStats, CardArrowAction } from "@/components/ui/card";
import { ParticleIcon } from "@/components/ui/ParticleIcon";

const SAMPLE = {
  journeyName: "Thoughtform Arcs",
  journeyType: "create",
  routeCount: 3,
  routes: [
    { name: "Vulpia", waypoints: 4 },
    { name: "Meridian", waypoints: 2 },
    { name: "Helix", waypoints: 0 },
  ],
  activeRoute: "Vulpia",
  activeWaypoints: 4,
  activeMode: "image" as const,
  modes: ["image", "video", "canvas"] as const,
};

const COL_W = 340;
const TITLE_SIZE = "12px";
const ROUTE_SIZE = "10px";
const STAT_SIZE = "10px";

function Mono({ size = ROUTE_SIZE, color = "var(--dawn-50)", children, style }: {
  size?: string; color?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: size, letterSpacing: "0.08em",
      textTransform: "uppercase", color, ...style,
    }}>
      {children}
    </span>
  );
}

function RouteList({ routes, activeRoute, onSelect }: {
  routes: typeof SAMPLE.routes; activeRoute: string; onSelect?: (name: string) => void;
}) {
  return (
    <div style={{ marginTop: 6 }}>
      {routes.map((r) => {
        const active = r.name === activeRoute;
        return (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: onSelect ? "pointer" : undefined }}
            onClick={() => onSelect?.(r.name)}>
            <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M0 0V6H11" stroke={active ? "var(--gold-30)" : "var(--dawn-15)"} strokeWidth="1" />
            </svg>
            <Mono size={ROUTE_SIZE} color={active ? "var(--gold)" : "var(--dawn-50)"}>{r.name}</Mono>
          </div>
        );
      })}
    </div>
  );
}

function TreeBranch({ children, stroke = "var(--dawn-15)" }: { children: React.ReactNode; stroke?: string }) {
  return (
    <div style={{ paddingLeft: 16, paddingTop: 8, position: "relative" }}>
      <svg aria-hidden width="12" height="16" viewBox="0 0 12 16" fill="none"
        style={{ position: "absolute", left: 0, top: 1 }}>
        <path d="M0 0V8H11" stroke={stroke} strokeWidth="1" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
      </svg>
      {children}
    </div>
  );
}

function ModeRow({ modes, activeMode }: { modes: readonly string[]; activeMode: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {modes.map((m) => {
        const isActive = m === activeMode;
        return (
          <button key={m} type="button" style={{
            fontFamily: "var(--font-mono)", fontSize: STAT_SIZE, letterSpacing: "0.1em",
            textTransform: "uppercase", color: isActive ? "var(--gold)" : "var(--dawn-30)",
            background: "none", border: "none", padding: "4px 0", cursor: "pointer",
            borderBottom: isActive ? "1px solid var(--gold-30)" : "1px solid transparent",
            transition: "color 120ms ease, border-color 120ms ease",
          }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--dawn-50)"; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--dawn-30)"; }}
          >{m}</button>
        );
      })}
    </div>
  );
}

function FakeWaypoints({ count = 2 }: { count?: number }) {
  return (
    <div style={{ paddingLeft: 40, marginTop: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ position: "relative", paddingLeft: 18 }}>
            <svg aria-hidden width="18" height="36" viewBox="0 0 18 36" fill="none"
              style={{ position: "absolute", left: 2, top: -5 }}>
              <path d="M0 0V35H17" stroke="var(--dawn-15)" strokeWidth="1" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{
              width: 40, height: 40,
              border: i === 0 ? "1px solid var(--gold)" : "1px solid var(--dawn-08)",
              background: i < count - 1 ? "linear-gradient(135deg, var(--dawn-08), var(--dawn-04))" : "var(--surface-0)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {i >= count - 1 && <Mono size="10px" color="var(--dawn-15)">◇</Mono>}
            </div>
          </div>
        ))}
        <div style={{ position: "relative", paddingLeft: 18 }}>
          <svg aria-hidden width="18" height="24" viewBox="0 0 18 24" fill="none"
            style={{ position: "absolute", left: 2, top: -5 }}>
            <path d="M0 0V23H17" stroke="var(--dawn-15)" strokeWidth="1" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
          </svg>
          <div style={{
            width: 40, height: 28, border: "1px dashed var(--dawn-15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mono size="12px" color="var(--dawn-30)">+</Mono>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Row wrapper ── */

function VariationRow({ id, title, description, dashboard, routePage }: {
  id: string; title: string; description: string;
  dashboard: React.ReactNode; routePage: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 72 }}>
      <div style={{ marginBottom: 20 }}>
        <Mono size="11px" color="var(--gold)">{id}</Mono>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--dawn)", marginTop: 4,
        }}>{title}</div>
        <div style={{
          fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--dawn-40)",
          lineHeight: 1.5, maxWidth: 760, marginTop: 4,
        }}>{description}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `${COL_W}px ${COL_W}px`, gap: 80 }}>
        <div>{dashboard}</div>
        <div>{routePage}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   The shared dashboard card used across all variations.
   Structure:
     Journey name + arrow          ← title layer
     ─────────────────             ← divider
     3 routes                      ← stats layer (the "block")
     └ Vulpia                      ← route tree
     └ Meridian
     └ Helix
   ══════════════════════════════════════════════════════════════ */

function DashboardCard() {
  const [expanded, setExpanded] = useState(true);
  return (
    <CardFrame state="selected" style={{ width: COL_W, padding: "10px 14px", cursor: "pointer" }}
      onClick={() => setExpanded((p) => !p)}>
      <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active size="md" />}>
        {SAMPLE.journeyName}
      </CardTitle>
      <CardDivider marginTop={8} marginBottom={6} />
      <CardStats entries={[{ value: SAMPLE.routeCount, label: "routes" }]}
        fontSize={STAT_SIZE} color="var(--gold-50, var(--gold))" />
      {expanded && <RouteList routes={SAMPLE.routes} activeRoute={SAMPLE.activeRoute} />}
    </CardFrame>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROUTE PAGE VARIATIONS
   
   The question: what fills the "stats row" structural role
   when we're inside a single route? The journey title and
   divider stay. The route tree collapses to one name.
   Something needs to sit in between so the card doesn't
   feel like a building with a floor removed.
   ══════════════════════════════════════════════════════════════ */

/*
   V1: Current baseline
   Stats row removed entirely. Route name hangs off a tree
   branch directly after the divider. The "missing block."
*/
function V1Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <div style={{ borderBottom: "1px solid var(--dawn-08)", marginTop: 8 }} />
        <TreeBranch>
          <Mono size={ROUTE_SIZE} color="var(--dawn-50)">{SAMPLE.activeRoute}</Mono>
        </TreeBranch>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V2: "ROUTE" label as the middle layer
   Dashboard says "3 ROUTES". Route page says "ROUTE" —
   same font, same position, just singular and no count.
   The block stays. The route name follows below.
*/
function V2Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={6} />
        <CardStats entries={[{ value: "route" }]}
          fontSize={STAT_SIZE} color="var(--dawn-40)" />
        <TreeBranch>
          <Mono size={ROUTE_SIZE} color="var(--dawn-50)">{SAMPLE.activeRoute}</Mono>
        </TreeBranch>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V3: Mode as the middle layer
   The "3 routes" stat is replaced with the active mode
   (IMAGE). Same structural position, same font size.
   The route name follows below with the tree branch.
*/
function V3Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={6} />
        <Mono size={STAT_SIZE} color="var(--dawn-40)">{SAMPLE.activeMode}</Mono>
        <TreeBranch>
          <Mono size={ROUTE_SIZE} color="var(--dawn-50)">{SAMPLE.activeRoute}</Mono>
        </TreeBranch>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V3: Route name IS the middle layer
   Instead of the route name hanging off a tree branch
   at the bottom, it moves UP into the stats position.
   Same size as the stat row. The card reads:
   Journey → divider → route name. Clean three-layer stack.
*/
function V4Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={6} />
        <Mono size={STAT_SIZE} color="var(--dawn-50)">{SAMPLE.activeRoute}</Mono>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V4: Route + mode as middle layer
   Route name and mode sit together in the stats position.
   Reads as: Journey → divider → "Vulpia · Image".
   Two pieces of context replace the one stat.
*/
function V5Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={6} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mono size={STAT_SIZE} color="var(--dawn-50)">{SAMPLE.activeRoute}</Mono>
          <Mono size={STAT_SIZE} color="var(--dawn-20)">·</Mono>
          <Mono size={STAT_SIZE} color="var(--dawn-30)">{SAMPLE.activeMode}</Mono>
        </div>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V5: Route + waypoint count as middle layer
   Same idea but with waypoint count instead of mode.
   Mirrors the dashboard's "3 routes" with "4 waypoints"
   — same structural role, different scope.
*/
function V6Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={6} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mono size={STAT_SIZE} color="var(--dawn-50)">{SAMPLE.activeRoute}</Mono>
          <Mono size={STAT_SIZE} color="var(--dawn-20)">·</Mono>
          <Mono size={STAT_SIZE} color="var(--dawn-30)">{SAMPLE.activeWaypoints} waypoints</Mono>
        </div>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V6: Mode tabs as the middle layer
   The stats position becomes interactive mode tabs.
   Fills the structural gap with utility — you can
   switch modes from the card. Route name hangs below.
*/
function V7Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={6} />
        <ModeRow modes={SAMPLE.modes} activeMode={SAMPLE.activeMode} />
        <TreeBranch>
          <Mono size={ROUTE_SIZE} color="var(--dawn-50)">{SAMPLE.activeRoute}</Mono>
        </TreeBranch>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V7: Route name promoted to title size, mode below
   Route name moves up and gets the same font size as
   the journey title. Reads as two equal headings
   separated by the divider, with mode as the stat.
*/
function V8Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={6} />
        <CardTitle fontSize={TITLE_SIZE} color="var(--dawn)">
          {SAMPLE.activeRoute}
        </CardTitle>
        <Mono size={STAT_SIZE} color="var(--dawn-30)" style={{ display: "block", marginTop: 4 }}>{SAMPLE.activeMode}</Mono>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/*
   V8: Route as inner frame
   A nested frame inside the ghost card holds the route
   name and mode. The inner frame acts as the "block"
   — it's visually present even though the stats row
   is gone. Card-in-card provides the structural weight.
*/
function V9Route() {
  return (
    <div>
      <CardFrame presentation="ghost" style={{ width: COL_W, padding: "10px 14px" }}>
        <CardTitle fontSize={TITLE_SIZE} color="var(--gold)" action={<CardArrowAction active />}>
          {SAMPLE.journeyName}
        </CardTitle>
        <CardDivider marginTop={8} marginBottom={8} />
        <div style={{
          padding: "8px 12px",
          border: "1px solid var(--dawn-08)",
        }}>
          <Mono size={ROUTE_SIZE} color="var(--dawn)">{SAMPLE.activeRoute}</Mono>
          <Mono size={STAT_SIZE} color="var(--dawn-30)" style={{ display: "block", marginTop: 4 }}>{SAMPLE.activeMode}</Mono>
        </div>
      </CardFrame>
      <FakeWaypoints />
    </div>
  );
}

/* ── Page ── */

export default function MockupsPage() {
  const [isLight, setIsLight] = useState(false);

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    if (next) document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }

  return (
    <div className="bg-void text-dawn dot-grid-bg" style={{ minHeight: "100vh", padding: "48px 56px" }}>
      <div style={{ marginBottom: 48, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-mono)", fontSize: "15px", letterSpacing: "0.12em",
            textTransform: "uppercase", color: "var(--gold)", margin: 0,
          }}>
            The Missing Block
          </h1>
          <p style={{
            fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--dawn-50)",
            marginTop: 8, maxWidth: 700, lineHeight: 1.6,
          }}>
            On the Dashboard, the card has three layers: journey title, stats row (3 routes), route
            names. On the Route page the stats row disappears and routes collapse to one name — the
            architecture loses a floor. Each variation explores what fills that structural gap.
            Font sizes are kept consistent across both columns.
          </p>
        </div>
        <button type="button" onClick={toggleTheme} style={{
          fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--dawn-50)", background: "none",
          border: "1px solid var(--dawn-15)", padding: "6px 14px", cursor: "pointer",
          whiteSpace: "nowrap", transition: "border-color 120ms ease, color 120ms ease", flexShrink: 0,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold-30)"; e.currentTarget.style.color = "var(--gold)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--dawn-15)"; e.currentTarget.style.color = "var(--dawn-50)"; }}
        >
          {isLight ? "Dark Mode" : "Light Mode"}
        </button>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: `${COL_W}px ${COL_W}px`, gap: 80,
        marginBottom: 32, paddingBottom: 12, borderBottom: "1px solid var(--dawn-08)",
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--void)", paddingTop: 8,
      }}>
        <Mono size="9px" color="var(--dawn-30)">Dashboard — browsing</Mono>
        <Mono size="9px" color="var(--dawn-30)">Route page — working</Mono>
      </div>

      <VariationRow
        id="V1 — Baseline"
        title="No middle layer (current)"
        description="Stats row removed, route name on a tree branch after the divider. This is what's live. The gap where '3 routes' used to be is felt — the card reads title → divider → nothing → route."
        dashboard={<DashboardCard />}
        routePage={<V1Route />}
      />

      <VariationRow
        id="V2 — Singular label"
        title={`"ROUTE" keeps the block`}
        description={`Dashboard says "3 ROUTES". Route page says "ROUTE" — same font, same position, singular, no count. The architectural block stays in place. Route name follows below with tree branch. Minimal change, maximum structural integrity.`}
        dashboard={<DashboardCard />}
        routePage={<V2Route />}
      />

      <VariationRow
        id="V3 — Mode replaces stats"
        title="Active mode as the middle layer"
        description="The mode label (IMAGE) occupies the same position and size as '3 routes' on the Dashboard. Structurally identical: title → divider → context label → route. The block is filled with working context."
        dashboard={<DashboardCard />}
        routePage={<V3Route />}
      />

      <VariationRow
        id="V4 — Route name promoted"
        title="Route name IS the middle layer"
        description="The route name moves up from the tree branch into the stats position. The card becomes a clean three-layer stack: title → divider → route. No tree branch needed. Compact."
        dashboard={<DashboardCard />}
        routePage={<V4Route />}
      />

      <VariationRow
        id="V5 — Route + mode inline"
        title="Route and mode share the middle layer"
        description="Route name and mode sit side by side in the stats position, separated by a dot. Reads as 'Vulpia · Image'. Two context pieces fill the block that one stat used to occupy."
        dashboard={<DashboardCard />}
        routePage={<V5Route />}
      />

      <VariationRow
        id="V6 — Route + waypoints"
        title="Route and waypoint count as middle layer"
        description="Mirrors the Dashboard's '3 routes' with '4 waypoints' — same structural role, scoped to the route. The stat changes meaning depending on context but keeps the same weight."
        dashboard={<DashboardCard />}
        routePage={<V6Route />}
      />

      <VariationRow
        id="V7 — Mode tabs"
        title="Interactive mode tabs as middle layer"
        description="The stats position becomes clickable mode tabs (IMAGE / VIDEO / CANVAS). Fills the structural gap with utility. Route name below via tree branch. The block is now a tool."
        dashboard={<DashboardCard />}
        routePage={<V7Route />}
      />

      <VariationRow
        id="V8 — Equal headings"
        title="Route name at title size"
        description="Route name moves up and gets the same 12px mono as the journey title. The card reads as two equal headings separated by the divider, with mode as the stat row below. Both names carry equal weight."
        dashboard={<DashboardCard />}
        routePage={<V8Route />}
      />

      <VariationRow
        id="V9 — Inner frame"
        title="Route as nested frame"
        description="A bordered inner frame holds the route name and mode. The frame itself provides structural weight where the stats row was — visual mass without a stat. Card-in-card hierarchy."
        dashboard={<DashboardCard />}
        routePage={<V9Route />}
      />
    </div>
  );
}
