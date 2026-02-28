"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { NavigationFrame, type BreadcrumbSegment } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { LessonView } from "@/components/learning/LessonView";
import { EmbeddedPractice } from "@/components/learning/EmbeddedPractice";
import { LatentSpaceScene } from "@/components/learning/LatentSpaceScene";
import { getJourneyContentByWorkspaceId, findLesson } from "@/lib/learning";
import type { ContentBlock } from "@/lib/learning";

export default function LessonPage() {
  const params = useParams();
  const journeyId = params.id as string;
  const lessonId = params.lessonId as string;

  const content = getJourneyContentByWorkspaceId(journeyId);
  const found = content ? findLesson(content, lessonId) : null;

  const breadcrumb = useMemo((): BreadcrumbSegment[] | undefined => {
    if (!content || !found) return undefined;
    return [
      { label: content.profile.name, href: `/journeys/${journeyId}` },
      { label: found.lesson.title },
    ];
  }, [content, found, journeyId]);

  if (!content || !found) {
    return (
      <RequireAuth>
        <NavigationFrame title="SIGIL" modeLabel="lesson">
          <div
            style={{
              paddingTop: "var(--space-2xl)",
              maxWidth: 960,
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--dawn-30)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Lesson not found
          </div>
        </NavigationFrame>
      </RequireAuth>
    );
  }

  const { chapter, lesson } = found;

  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="lesson" breadcrumbOverride={breadcrumb}>
        <section
          className="w-full animate-fade-in-up"
          style={{ paddingTop: "var(--space-xl)" }}
        >
          <LessonView
            content={content}
            chapter={chapter}
            lesson={lesson}
            journeyId={journeyId}
            renderPractice={(block: ContentBlock & { type: "practice" }, _index: number) => (
              <EmbeddedPractice
                key={block.id}
                block={block}
                journeyId={journeyId}
              />
            )}
            renderParticleScene={(block: ContentBlock & { type: "particle-scene" }) => (
              <LatentSpaceScene key={block.id} block={block} />
            )}
          />
        </section>
      </NavigationFrame>
    </RequireAuth>
  );
}
