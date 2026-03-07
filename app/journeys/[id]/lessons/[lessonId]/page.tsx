"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { LessonView } from "@/components/learning/LessonView";
import { EmbeddedPractice } from "@/components/learning/EmbeddedPractice";
import { LatentSpaceScene } from "@/components/learning/LatentSpaceScene";
import { getJourneyContentByWorkspaceId, findLesson } from "@/lib/learning";
import type { ContentBlock } from "@/lib/learning";

type JourneyApiData = { journey: { name: string } };
async function journeyFetcher(url: string): Promise<JourneyApiData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load journey");
  return res.json() as Promise<JourneyApiData>;
}

export default function LessonPage() {
  const params = useParams();
  const journeyId = params.id as string;
  const lessonId = params.lessonId as string;

  const content = getJourneyContentByWorkspaceId(journeyId);
  const found = content ? findLesson(content, lessonId) : null;

  const { data: journeyData } = useSWR(
    `/api/journeys/${journeyId}`,
    journeyFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (!content || !found) {
    return (
      <RequireAuth>
        <NavigationFrame title="SIGIL" modeLabel="lesson">
          <div
            style={{
              paddingTop: "var(--space-2xl)",
              maxWidth: "var(--layout-content-sm, 960px)",
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
  const journeyName = journeyData?.journey.name || content.profile.name;

  return (
    <RequireAuth>
      <NavigationFrame
        title="SIGIL"
        modeLabel="lesson"
        journeyName={journeyName}
        journeyId={journeyId}
        lessonName={lesson.title}
      >
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
