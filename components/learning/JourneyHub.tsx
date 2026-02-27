"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import type { JourneyContent, Resource } from "@/lib/learning/types";
import styles from "@/app/journeys/[id]/JourneyHub.module.css";

type RouteItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  thumbnailUrl: string | null;
};

type Tab = "overview" | "curriculum" | "resources" | "artifacts";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "curriculum", label: "Curriculum" },
  { id: "resources", label: "Resources" },
  { id: "artifacts", label: "Artifacts" },
];

const EXPLORED_KEY = "sigil:lesson-explored";

function getExplored(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(EXPLORED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function JourneyHub({
  content,
  journeyId,
  routes,
}: {
  content: JourneyContent;
  journeyId: string;
  routes: RouteItem[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const explored = useMemo(() => getExplored(), []);
  const { profile, chapters, resources } = content;

  const themeVars = useMemo(() => {
    const vars: Record<string, string> = {};
    if (profile.theme.accentColor) {
      vars["--journey-accent"] = profile.theme.accentColor;
    }
    return vars;
  }, [profile.theme.accentColor]);

  const heroGradient = useMemo(() => {
    const dir = profile.theme.gradientDirection ?? "bottom";
    return `linear-gradient(to ${dir}, transparent 0%, var(--void) 70%), radial-gradient(ellipse at center top, transparent 30%, var(--void) 80%)`;
  }, [profile.theme.gradientDirection]);

  const totalLessons = chapters.reduce((s, ch) => s + ch.lessons.length, 0);
  const exploredCount = chapters.reduce(
    (s, ch) => s + ch.lessons.filter((l) => explored.has(l.id)).length,
    0,
  );

  return (
    <div className={styles.hub} style={themeVars}>
      {/* Hero background */}
      {profile.theme.heroImageUrl && (
        <div className={styles.heroWrap}>
          <div
            className={styles.heroImage}
            style={{ backgroundImage: `url(${profile.theme.heroImageUrl})` }}
          />
          <div className={styles.heroGradient} style={{ background: heroGradient }} />
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.clientLabel}>{profile.clientName}</div>
        <h1 className={styles.journeyTitle}>{profile.name}</h1>
        {profile.subtitle && <p className={styles.journeySubtitle}>{profile.subtitle}</p>}
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          content={content}
          totalLessons={totalLessons}
          exploredCount={exploredCount}
          journeyId={journeyId}
        />
      )}
      {tab === "curriculum" && (
        <CurriculumTab content={content} journeyId={journeyId} explored={explored} />
      )}
      {tab === "resources" && <ResourcesTab resources={resources} />}
      {tab === "artifacts" && <ArtifactsTab routes={routes} />}
    </div>
  );
}

/* ── Overview ──────────────────────────────────────────────── */

function OverviewTab({
  content,
  totalLessons,
  exploredCount,
  journeyId,
}: {
  content: JourneyContent;
  totalLessons: number;
  exploredCount: number;
  journeyId: string;
}) {
  const { profile, chapters } = content;

  return (
    <div className={styles.content}>
      <div className={styles.overviewPanel}>
        <div>
          <div className={styles.sectionLabel}>About this journey</div>
          <p className={styles.descriptionText}>{profile.description}</p>
        </div>

        <div>
          <div className={styles.sectionLabel}>What you will learn</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {chapters.map((ch, i) => (
              <div key={ch.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "var(--gold)",
                    letterSpacing: "0.1em",
                    minWidth: "16px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "13px",
                      color: "var(--dawn)",
                      fontWeight: 500,
                    }}
                  >
                    {ch.title}
                  </span>
                  {ch.subtitle && (
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "12px",
                        color: "var(--dawn-50)",
                        marginLeft: "8px",
                      }}
                    >
                      {ch.subtitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>Facilitator</div>
          <div className={styles.facilitatorBadge}>
            <span className={styles.facilitatorDiamond} />
            {profile.facilitatorName}
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>Progress</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--dawn-50)",
              letterSpacing: "0.06em",
            }}
          >
            {exploredCount} / {totalLessons} lessons explored
          </div>
          <div
            style={{
              marginTop: "8px",
              height: "2px",
              background: "var(--dawn-08)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: totalLessons > 0 ? `${(exploredCount / totalLessons) * 100}%` : "0%",
                background: "var(--gold)",
                transition: "width 300ms var(--ease-out)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: curriculum rail preview */}
      <CurriculumRail chapters={chapters} journeyId={journeyId} explored={new Set()} />
    </div>
  );
}

/* ── Curriculum (full view) ────────────────────────────────── */

function CurriculumTab({
  content,
  journeyId,
  explored,
}: {
  content: JourneyContent;
  journeyId: string;
  explored: Set<string>;
}) {
  return (
    <div style={{ maxWidth: 600 }}>
      {content.chapters.map((ch, chIdx) => (
        <div key={ch.id} className={styles.chapterGroup}>
          <div className={styles.chapterTitle}>
            <span className={styles.chapterBearing}>{String(chIdx + 1).padStart(2, "0")}</span>
            {ch.title}
            {ch.subtitle && (
              <span style={{ color: "var(--dawn-15)", fontWeight: 400 }}> — {ch.subtitle}</span>
            )}
          </div>
          {ch.lessons.map((les) => (
            <Link
              key={les.id}
              href={`/journeys/${journeyId}/lessons/${les.id}`}
              className={styles.lessonItem}
            >
              <span
                className={`${styles.lessonDiamond} ${
                  explored.has(les.id) ? styles.lessonDiamondExplored : styles.lessonDiamondPending
                }`}
              />
              <div className={styles.lessonMeta}>
                <div className={styles.lessonTitle}>{les.title}</div>
                {les.subtitle && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "11px",
                      color: "var(--dawn-40)",
                      marginTop: "2px",
                    }}
                  >
                    {les.subtitle}
                  </div>
                )}
                <div className={styles.lessonDuration}>{les.estimatedMinutes} min</div>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Curriculum rail (sidebar, used in Overview) ──────────── */

function CurriculumRail({
  chapters,
  journeyId,
  explored,
}: {
  chapters: JourneyContent["chapters"];
  journeyId: string;
  explored: Set<string>;
}) {
  return (
    <div className={styles.curriculumRail}>
      <div className={styles.sectionLabel}>Curriculum</div>
      {chapters.map((ch, chIdx) => (
        <div key={ch.id} className={styles.chapterGroup}>
          <div className={styles.chapterTitle}>
            <span className={styles.chapterBearing}>{String(chIdx + 1).padStart(2, "0")}</span>
            {ch.title}
          </div>
          {ch.lessons.map((les) => (
            <Link
              key={les.id}
              href={`/journeys/${journeyId}/lessons/${les.id}`}
              className={styles.lessonItem}
            >
              <span
                className={`${styles.lessonDiamond} ${
                  explored.has(les.id) ? styles.lessonDiamondExplored : styles.lessonDiamondPending
                }`}
              />
              <div className={styles.lessonMeta}>
                <div className={styles.lessonTitle}>{les.title}</div>
                <div className={styles.lessonDuration}>{les.estimatedMinutes} min</div>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Resources ─────────────────────────────────────────────── */

function ResourcesTab({ resources }: { resources: Resource[] }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div className={styles.sectionLabel}>Documents &amp; links</div>
      <div className={styles.resourcesList}>
        {resources.map((r) => (
          <div key={r.id} className={styles.resourceItem}>
            <span className={styles.resourceIcon} />
            <div>
              <div className={styles.resourceTitle}>{r.title}</div>
              {r.description && <div className={styles.resourceDesc}>{r.description}</div>}
              <div className={styles.resourceType}>{r.fileType ?? "document"}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload placeholder */}
      <div className={styles.uploadZone}>
        <span className={styles.uploadLabel}>Upload documentation</span>
        <span className={styles.uploadHint}>Drag and drop files here, or click to browse</span>
      </div>
    </div>
  );
}

/* ── Artifacts ─────────────────────────────────────────────── */

function ArtifactsTab({ routes }: { routes: RouteItem[] }) {
  if (routes.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-xl)",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--dawn-30)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        No routes created yet. Complete exercises to generate artifacts.
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionLabel}>Route workspaces</div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "12px",
          color: "var(--dawn-50)",
          marginBottom: "var(--space-lg)",
          lineHeight: 1.6,
        }}
      >
        Your generated images and videos are stored in route workspaces. Open any route to view,
        organize, and continue creating.
      </p>
      <div className={styles.artifactsGrid}>
        {routes.map((route) => (
          <Link key={route.id} href={`/routes/${route.id}/image`} className={styles.routeLink}>
            <span className={`${styles.routeLinkCorner} ${styles.routeLinkCornerTL}`} />
            <span className={`${styles.routeLinkCorner} ${styles.routeLinkCornerBR}`} />
            <div className={styles.routeLinkName}>{route.name}</div>
            <div className={styles.routeLinkMeta}>
              {route.waypointCount} waypoint{route.waypointCount !== 1 ? "s" : ""}
            </div>
            <div className={styles.routeLinkMeta}>
              updated {new Date(route.updatedAt).toLocaleDateString()}
            </div>
            <span className={styles.openWorkspace}>open workspace &rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
