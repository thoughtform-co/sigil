"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { RouteCard } from "@/components/journeys/RouteCard";
import type { JourneyContent, Resource } from "@/lib/learning/types";
import type { JourneyMode } from "@/lib/terminology";
import styles from "@/app/journeys/[id]/JourneyShell.module.css";

type RouteItem = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  waypointCount: number;
  thumbnailUrl: string | null;
};

type Tab = "overview" | "curriculum" | "resources" | "artifacts";

type TabDef = { id: Tab; label: string };

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

type JourneyShellProps = {
  journeyId: string;
  journeyName: string;
  journeyDescription: string | null;
  journeyType: JourneyMode;
  routes: RouteItem[];
  learningContent: JourneyContent | null;
  onCreateRoute: () => void;
  onUpgradeToLearn?: () => void;
};

export function JourneyShell({
  journeyId,
  journeyName,
  journeyDescription,
  journeyType,
  routes,
  learningContent,
  onCreateRoute,
  onUpgradeToLearn,
}: JourneyShellProps) {
  const { isAdmin } = useAuth();
  const isLearn = journeyType === "learn";

  const tabs = useMemo<TabDef[]>(() => {
    if (isLearn) {
      return [
        { id: "overview", label: "Overview" },
        { id: "curriculum", label: "Curriculum" },
        { id: "resources", label: "Resources" },
        { id: "artifacts", label: "Artifacts" },
      ];
    }
    return [
      { id: "overview", label: "Overview" },
      { id: "artifacts", label: "Artifacts" },
    ];
  }, [isLearn]);

  const [tab, setTab] = useState<Tab>("overview");
  const explored = useMemo(() => getExplored(), []);

  const profile = learningContent?.profile;
  const chapters = learningContent?.chapters ?? [];
  const resources = learningContent?.resources ?? [];

  const totalLessons = chapters.reduce((s, ch) => s + ch.lessons.length, 0);
  const exploredCount = chapters.reduce(
    (s, ch) => s + ch.lessons.filter((l) => explored.has(l.id)).length,
    0,
  );

  const themeVars = useMemo(() => {
    const vars: Record<string, string> = {};
    if (profile?.theme.accentColor) {
      vars["--journey-accent"] = profile.theme.accentColor;
    }
    return vars;
  }, [profile?.theme.accentColor]);

  const heroGradient = useMemo(() => {
    const dir = profile?.theme.gradientDirection ?? "bottom";
    return `linear-gradient(to ${dir}, transparent 0%, var(--void) 70%), radial-gradient(ellipse at center top, transparent 30%, var(--void) 80%)`;
  }, [profile?.theme.gradientDirection]);

  const heroUrl = profile?.theme.heroImageUrl;
  const subtitle = profile?.subtitle ?? journeyDescription;

  return (
    <div className={styles.shell} style={themeVars}>
      {/* Hero background (shared) */}
      {heroUrl && (
        <div className={styles.heroWrap}>
          <div className={styles.heroImage} style={{ backgroundImage: `url(${heroUrl})` }} />
          <div className={styles.heroGradient} style={{ background: heroGradient }} />
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)" }}>
          <h1 className={styles.journeyTitle}>{profile?.name ?? journeyName}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexShrink: 0 }}>
            {!isLearn && isAdmin && onUpgradeToLearn && (
              <button
                type="button"
                onClick={onUpgradeToLearn}
                title="Add curriculum to this journey"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid var(--dawn-08)",
                  color: "var(--dawn-40)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "color 120ms, border-color 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--gold)";
                  e.currentTarget.style.borderColor = "var(--gold-15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--dawn-40)";
                  e.currentTarget.style.borderColor = "var(--dawn-08)";
                }}
              >
                <span style={{ width: 5, height: 5, background: "var(--gold)", transform: "rotate(45deg)", flexShrink: 0 }} />
                + curriculum
              </button>
            )}
            <button
              type="button"
              className="sigil-btn-secondary"
              onClick={onCreateRoute}
            >
              + create route
            </button>
          </div>
        </div>
        {subtitle && <p className={styles.journeySubtitle}>{subtitle}</p>}
      </div>

      {isLearn ? (
        <>
          {/* Tab bar for learn-mode */}
          <div className={styles.tabBar}>
            {tabs.map((t) => (
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

          <div className={styles.tabPanel}>
            {tab === "overview" && (
              <OverviewContent
                journeyId={journeyId}
                journeyDescription={journeyDescription}
                learningContent={learningContent}
                chapters={chapters}
                explored={explored}
                totalLessons={totalLessons}
                exploredCount={exploredCount}
              />
            )}
            {tab === "curriculum" && (
              <CurriculumContent
                learningContent={learningContent}
                journeyId={journeyId}
                journeyName={journeyName}
                explored={explored}
              />
            )}
            {tab === "resources" && (
              <ResourcesContent resources={resources} />
            )}
            {tab === "artifacts" && (
              <ArtifactsContent routes={routes} onCreateRoute={onCreateRoute} />
            )}
          </div>
        </>
      ) : (
        /* Create-mode: single unified view, no tabs */
        <div className={styles.tabPanel}>
          <CreateModeContent
            journeyDescription={journeyDescription}
            routes={routes}
            onCreateRoute={onCreateRoute}
          />
        </div>
      )}
    </div>
  );
}

/* ── Create-mode unified view (no tabs) ───────────────────── */

function CreateModeContent({
  journeyDescription,
  routes,
  onCreateRoute,
}: {
  journeyDescription: string | null;
  routes: RouteItem[];
  onCreateRoute: () => void;
}) {
  return (
    <div className={`${styles.content} ${styles.contentSingle}`}>
      <div className={styles.overviewPanel}>
        {journeyDescription && (
          <div>
            <div className={styles.sectionLabel}>About</div>
            <p className={styles.descriptionText}>{journeyDescription}</p>
          </div>
        )}

        <div>
          <div className={styles.sectionLabel} style={{ marginBottom: "var(--space-md)" }}>
            Routes ({routes.length})
          </div>
          {routes.length > 0 ? (
            <div className={`${styles.routeGrid} ${styles.routeGridWide}`}>
              {routes.map((route, index) => (
                <div key={route.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.06}s` }}>
                  <RouteCard route={route} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyRoutes}>
              <div className={styles.emptyRoutesLabel}>No routes yet</div>
              <div className={styles.emptyRoutesBody}>Create a route to start generating images and videos.</div>
              <button type="button" className="sigil-btn-primary" onClick={onCreateRoute}>+ create first route</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Learn-mode Overview ──────────────────────────────────── */

function OverviewContent({
  journeyId,
  journeyDescription,
  learningContent,
  chapters,
  explored,
  totalLessons,
  exploredCount,
}: {
  journeyId: string;
  journeyDescription: string | null;
  learningContent: JourneyContent | null;
  chapters: JourneyContent["chapters"];
  explored: Set<string>;
  totalLessons: number;
  exploredCount: number;
}) {
  const profile = learningContent?.profile;
  const description = profile?.description ?? journeyDescription;

  if (learningContent) {
    return (
      <div className={styles.content}>
        <div className={styles.overviewPanel}>
          <div>
            <div className={styles.sectionLabel}>About this journey</div>
            <p className={styles.descriptionText}>{description}</p>
          </div>
          <div>
            <div className={styles.sectionLabel}>What you will learn</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {chapters.map((ch, i) => (
                <div key={ch.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--gold)", letterSpacing: "0.1em", minWidth: "16px" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--dawn)", fontWeight: 500 }}>{ch.title}</span>
                    {ch.subtitle && <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--dawn-50)", marginLeft: "8px" }}>{ch.subtitle}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {profile?.facilitatorName && (
            <div>
              <div className={styles.sectionLabel}>Facilitator</div>
              <div className={styles.facilitatorBadge}>
                <span className={styles.facilitatorDiamond} />
                {profile.facilitatorName}
              </div>
            </div>
          )}
          <div>
            <div className={styles.sectionLabel}>Progress</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--dawn-70)", letterSpacing: "0.06em" }}>
              {exploredCount} / {totalLessons} lessons explored
            </div>
            <div style={{ marginTop: "8px", height: "2px", background: "var(--dawn-08)", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: totalLessons > 0 ? `${(exploredCount / totalLessons) * 100}%` : "0%", background: "var(--gold)", transition: "width 300ms var(--ease-out)" }} />
            </div>
          </div>
        </div>
        <CurriculumRail chapters={chapters} journeyId={journeyId} explored={explored} />
      </div>
    );
  }

  return (
    <div className={`${styles.content} ${styles.contentSingle}`}>
      <div className={styles.overviewPanel}>
        {description && (
          <div>
            <div className={styles.sectionLabel}>About this journey</div>
            <p className={styles.descriptionText}>{description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Curriculum tab ────────────────────────────────────────── */

function CurriculumContent({
  learningContent,
  journeyId,
  journeyName,
  explored,
}: {
  learningContent: JourneyContent | null;
  journeyId: string;
  journeyName: string;
  explored: Set<string>;
}) {
  if (!learningContent) {
    return (
      <div className={styles.curriculumEmpty}>
        <div className={styles.curriculumEmptyDiamond} />
        <div className={styles.curriculumEmptyTitle}>Curriculum coming soon</div>
        <div className={styles.curriculumEmptyBody}>
          The learning content for {journeyName} is being prepared.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {learningContent.chapters.map((ch, chIdx) => (
        <div key={ch.id} className={styles.chapterGroup}>
          <div className={styles.chapterTitle}>
            <span className={styles.chapterBearing}>{String(chIdx + 1).padStart(2, "0")}</span>
            {ch.title}
            {ch.subtitle && <span style={{ color: "var(--dawn)", fontWeight: 400 }}> — {ch.subtitle}</span>}
          </div>
          {ch.lessons.map((les) => (
            <Link key={les.id} href={`/journeys/${journeyId}/lessons/${les.id}`} className={styles.lessonItem}>
              <span className={`${styles.lessonDiamond} ${explored.has(les.id) ? styles.lessonDiamondExplored : styles.lessonDiamondPending}`} />
              <div className={styles.lessonMeta}>
                <div className={styles.lessonTitle}>{les.title}</div>
                {les.subtitle && <div style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--dawn)", marginTop: "2px" }}>{les.subtitle}</div>}
                <div className={styles.lessonDuration}>{les.estimatedMinutes} min</div>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Curriculum rail sidebar ──────────────────────────────── */

function CurriculumRail({ chapters, journeyId, explored }: { chapters: JourneyContent["chapters"]; journeyId: string; explored: Set<string> }) {
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
            <Link key={les.id} href={`/journeys/${journeyId}/lessons/${les.id}`} className={styles.lessonItem}>
              <span className={`${styles.lessonDiamond} ${explored.has(les.id) ? styles.lessonDiamondExplored : styles.lessonDiamondPending}`} />
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

/* ── Resources tab ─────────────────────────────────────────── */

function ResourcesContent({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return (
      <div className={styles.curriculumEmpty}>
        <div className={styles.curriculumEmptyDiamond} />
        <div className={styles.curriculumEmptyTitle}>Resources coming soon</div>
        <div className={styles.curriculumEmptyBody}>
          Documentation and reference materials will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className={styles.sectionLabel}>Documents &amp; links</div>
      <div className={styles.resourcesList}>
        {resources.map((r) => {
          const href = r.externalUrl ?? r.fileUrl;
          const isExternal = Boolean(href && /^https?:\/\//i.test(href));
          const content = (
            <>
              <span className={styles.resourceIcon} />
              <div>
                <div className={styles.resourceTitle}>{r.title}</div>
                {r.description && <div className={styles.resourceDesc}>{r.description}</div>}
                <div className={styles.resourceType}>{r.fileType ?? "document"}</div>
              </div>
            </>
          );

          if (href) {
            return (
              <a
                key={r.id}
                href={href}
                className={`${styles.resourceItem} ${styles.resourceItemLink}`}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {content}
              </a>
            );
          }

          return (
            <div key={r.id} className={styles.resourceItem}>
              {content}
            </div>
          );
        })}
      </div>
      <div className={styles.uploadZone}>
        <span className={styles.uploadLabel}>Upload documentation</span>
        <span className={styles.uploadHint}>Drag and drop files here, or click to browse</span>
      </div>
    </div>
  );
}

/* ── Artifacts tab ─────────────────────────────────────────── */

function ArtifactsContent({ routes, onCreateRoute }: { routes: RouteItem[]; onCreateRoute: () => void }) {
  return (
    <div>
      <div className={styles.sectionLabel} style={{ marginBottom: "var(--space-md)" }}>
        Routes ({routes.length})
      </div>
      {routes.length > 0 ? (
        <div className={`${styles.routeGrid} ${styles.routeGridWide}`}>
          {routes.map((route, index) => (
            <div key={route.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.06}s` }}>
              <RouteCard route={route} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyRoutes}>
          <div className={styles.emptyRoutesLabel}>No routes yet</div>
          <div className={styles.emptyRoutesBody}>Create a route or complete exercises to generate artifacts.</div>
          <button type="button" className="sigil-btn-primary" onClick={onCreateRoute}>+ create first route</button>
        </div>
      )}
    </div>
  );
}
