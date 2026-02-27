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
  const clientName = profile?.clientName;
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

      {/* Header (shared) */}
      <div className={styles.header}>
        <div className={styles.clientLabel}>
          {clientName ?? journeyName}
          <span className={`${styles.modeBadge} ${isLearn ? styles.modeBadgeLearn : ""}`}>
            {isLearn ? "learn" : "create"}
          </span>
        </div>
        <h1 className={styles.journeyTitle}>{profile?.name ?? journeyName}</h1>
        {subtitle && <p className={styles.journeySubtitle}>{subtitle}</p>}
      </div>

      {/* Tab bar (shared skeleton, mode-conditional tabs) */}
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

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewContent
          isLearn={isLearn}
          journeyId={journeyId}
          journeyName={journeyName}
          journeyDescription={journeyDescription}
          learningContent={learningContent}
          routes={routes}
          chapters={chapters}
          explored={explored}
          totalLessons={totalLessons}
          exploredCount={exploredCount}
          onCreateRoute={onCreateRoute}
          onUpgradeToLearn={onUpgradeToLearn}
          isAdmin={isAdmin}
        />
      )}
      {tab === "curriculum" && isLearn && (
        <CurriculumContent
          learningContent={learningContent}
          journeyId={journeyId}
          journeyName={journeyName}
          explored={explored}
        />
      )}
      {tab === "resources" && isLearn && (
        <ResourcesContent resources={resources} />
      )}
      {tab === "artifacts" && (
        <ArtifactsContent routes={routes} onCreateRoute={onCreateRoute} />
      )}
    </div>
  );
}

/* ── Overview ──────────────────────────────────────────────── */

function OverviewContent({
  isLearn,
  journeyId,
  journeyName,
  journeyDescription,
  learningContent,
  routes,
  chapters,
  explored,
  totalLessons,
  exploredCount,
  onCreateRoute,
  onUpgradeToLearn,
  isAdmin,
}: {
  isLearn: boolean;
  journeyId: string;
  journeyName: string;
  journeyDescription: string | null;
  learningContent: JourneyContent | null;
  routes: RouteItem[];
  chapters: JourneyContent["chapters"];
  explored: Set<string>;
  totalLessons: number;
  exploredCount: number;
  onCreateRoute: () => void;
  onUpgradeToLearn?: () => void;
  isAdmin: boolean;
}) {
  const profile = learningContent?.profile;
  const description = profile?.description ?? journeyDescription;

  if (isLearn && learningContent) {
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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--dawn-50)", letterSpacing: "0.06em" }}>
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
            <div className={styles.sectionLabel}>About this {isLearn ? "journey" : "project"}</div>
            <p className={styles.descriptionText}>{description}</p>
          </div>
        )}

        {/* Route grid inline for create mode */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-md)" }}>
            <div className={styles.sectionLabel} style={{ marginBottom: 0 }}>
              Routes ({routes.length})
            </div>
            <button type="button" className="sigil-btn-secondary" onClick={onCreateRoute}>
              + create route
            </button>
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

        {/* Upgrade CTA for admin on create-mode journeys */}
        {!isLearn && isAdmin && onUpgradeToLearn && (
          <button type="button" className={styles.upgradeCta} onClick={onUpgradeToLearn}>
            <span className={styles.upgradeCtaDiamond} />
            <span className={styles.upgradeCtaText}>Add curriculum to this journey</span>
          </button>
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
            {ch.subtitle && <span style={{ color: "var(--dawn-15)", fontWeight: 400 }}> — {ch.subtitle}</span>}
          </div>
          {ch.lessons.map((les) => (
            <Link key={les.id} href={`/journeys/${journeyId}/lessons/${les.id}`} className={styles.lessonItem}>
              <span className={`${styles.lessonDiamond} ${explored.has(les.id) ? styles.lessonDiamondExplored : styles.lessonDiamondPending}`} />
              <div className={styles.lessonMeta}>
                <div className={styles.lessonTitle}>{les.title}</div>
                {les.subtitle && <div style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--dawn-40)", marginTop: "2px" }}>{les.subtitle}</div>}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-lg)" }}>
        <div>
          <div className={styles.sectionLabel}>Route workspaces</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--dawn-50)", lineHeight: 1.6, margin: 0 }}>
            Your generated images and videos are stored in route workspaces.
          </p>
        </div>
        <button type="button" className="sigil-btn-secondary" onClick={onCreateRoute}>+ create route</button>
      </div>
      {routes.length > 0 ? (
        <div className={styles.routeGrid}>
          {routes.map((route) => (
            <Link key={route.id} href={`/routes/${route.id}/image`} className={styles.routeLink}>
              <span className={`${styles.routeLinkCorner} ${styles.routeLinkCornerTL}`} />
              <span className={`${styles.routeLinkCorner} ${styles.routeLinkCornerBR}`} />
              <div className={styles.routeLinkName}>{route.name}</div>
              <div className={styles.routeLinkMeta}>{route.waypointCount} waypoint{route.waypointCount !== 1 ? "s" : ""}</div>
              <div className={styles.routeLinkMeta}>updated {new Date(route.updatedAt).toLocaleDateString()}</div>
              <span className={styles.openWorkspace}>open workspace &rarr;</span>
            </Link>
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
