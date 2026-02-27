"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  Chapter,
  Lesson,
  ContentBlock,
  JourneyContent,
} from "@/lib/learning/types";
import styles from "@/app/journeys/[id]/lessons/[lessonId]/LessonPage.module.css";

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

function setExplored(ids: Set<string>) {
  try {
    localStorage.setItem(EXPLORED_KEY, JSON.stringify([...ids]));
  } catch {
    // noop
  }
}

type LessonViewProps = {
  content: JourneyContent;
  chapter: Chapter;
  lesson: Lesson;
  journeyId: string;
  /** Render function for practice blocks — injected from page to enable embedded prompting */
  renderPractice?: (block: ContentBlock & { type: "practice" }, index: number) => React.ReactNode;
  /** Render function for particle scenes */
  renderParticleScene?: (block: ContentBlock & { type: "particle-scene" }) => React.ReactNode;
};

export function LessonView({
  content,
  chapter,
  lesson,
  journeyId,
  renderPractice,
  renderParticleScene,
}: LessonViewProps) {
  const [explored, setExploredState] = useState(false);
  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    setExploredState(getExplored().has(lesson.id));
  }, [lesson.id]);

  // IntersectionObserver for progressive reveal + active tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const els = sectionRefs.current;

    els.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => {
              if (prev.has(idx)) return prev;
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
          }
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            setActiveBlockIdx(idx);
          }
        },
        { threshold: [0.1, 0.3], rootMargin: "0px 0px -20% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [lesson.blocks.length]);

  const handleMarkExplored = useCallback(() => {
    const current = getExplored();
    if (current.has(lesson.id)) {
      current.delete(lesson.id);
    } else {
      current.add(lesson.id);
    }
    setExplored(current);
    setExploredState(current.has(lesson.id));
  }, [lesson.id]);

  const scrollToBlock = useCallback((idx: number) => {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Find prev/next lessons
  const allLessons = useMemo(
    () => content.chapters.flatMap((ch) => ch.lessons.map((l) => ({ lesson: l, chapter: ch }))),
    [content.chapters],
  );
  const currentIdx = allLessons.findIndex((x) => x.lesson.id === lesson.id);
  const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const next = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  // Chapter index for bearing label
  const chapterIdx = content.chapters.findIndex((ch) => ch.id === chapter.id);

  return (
    <div className={styles.layout}>
      {/* Main narrative column */}
      <div className={styles.narrative}>
        <div className={styles.lessonHeader}>
          <div className={styles.lessonChapter}>
            {String(chapterIdx + 1).padStart(2, "0")} — {chapter.title}
          </div>
          <h1 className={styles.lessonTitle}>{lesson.title}</h1>
          {lesson.subtitle && <p className={styles.lessonSubtitle}>{lesson.subtitle}</p>}
          <div className={styles.lessonDuration}>{lesson.estimatedMinutes} min</div>
        </div>

        {lesson.blocks.map((block, blockIdx) => (
          <div
            key={block.id}
            ref={(el) => { sectionRefs.current[blockIdx] = el; }}
            className={`${styles.section} ${visibleSections.has(blockIdx) ? styles.sectionVisible : ""}`}
            data-block-id={block.id}
          >
            {block.type === "narrative" && <NarrativeSection block={block} />}
            {block.type === "example" && <ExampleSection block={block} />}
            {block.type === "quiz" && <QuizSection block={block} />}
            {block.type === "practice" && (
              renderPractice ? (
                renderPractice(block, blockIdx)
              ) : (
                <PracticePlaceholder block={block} />
              )
            )}
            {block.type === "particle-scene" && (
              renderParticleScene ? (
                renderParticleScene(block)
              ) : (
                <ParticleScenePlaceholder block={block} />
              )
            )}
          </div>
        ))}

        {/* Lesson footer */}
        <div className={styles.lessonFooter}>
          {prev ? (
            <Link
              href={`/journeys/${journeyId}/lessons/${prev.lesson.id}`}
              className={styles.footerNav}
            >
              &larr; {prev.lesson.title}
            </Link>
          ) : (
            <Link href={`/journeys/${journeyId}`} className={styles.footerNav}>
              &larr; Back to journey
            </Link>
          )}
          <button
            type="button"
            className={`${styles.markExplored} ${explored ? styles.markExploredDone : ""}`}
            onClick={handleMarkExplored}
          >
            {explored ? "explored" : "mark as explored"}
          </button>
          {next ? (
            <Link
              href={`/journeys/${journeyId}/lessons/${next.lesson.id}`}
              className={styles.footerNav}
            >
              {next.lesson.title} &rarr;
            </Link>
          ) : (
            <Link href={`/journeys/${journeyId}`} className={styles.footerNav}>
              Back to journey &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Sticky progression sidebar */}
      <div className={styles.progressRail}>
        <div className={styles.progressLabel}>Sections</div>
        {lesson.blocks.map((block, idx) => {
          const label = blockLabel(block);
          const isActive = idx === activeBlockIdx;
          const isPassed = visibleSections.has(idx) && idx < activeBlockIdx;
          return (
            <button
              key={block.id}
              type="button"
              className={`${styles.progressItem} ${isActive ? styles.progressItemActive : ""}`}
              onClick={() => scrollToBlock(idx)}
            >
              <span
                className={`${styles.progressDiamond} ${
                  isActive
                    ? styles.progressDiamondActive
                    : isPassed
                      ? styles.progressDiamondPassed
                      : styles.progressDiamondDefault
                }`}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function blockLabel(block: ContentBlock): string {
  switch (block.type) {
    case "narrative":
      return block.heading ?? "Reading";
    case "example":
      return "Example";
    case "practice":
      return "Exercise";
    case "quiz":
      return "Checkpoint";
    case "particle-scene":
      return block.title;
  }
}

/* ── Block renderers ─────────────────────────────────────── */

function NarrativeSection({ block }: { block: ContentBlock & { type: "narrative" } }) {
  return (
    <div style={{ position: "relative" }}>
      {block.parallaxImageUrl && (
        <div className={styles.parallaxWrap}>
          <div
            className={styles.parallaxImage}
            style={{
              backgroundImage: `url(${block.parallaxImageUrl})`,
              opacity: block.parallaxOpacity ?? 0.12,
            }}
          />
          <div className={styles.parallaxMask} />
        </div>
      )}
      {block.heading && <h2 className={styles.narrativeHeading}>{block.heading}</h2>}
      <div className={styles.narrativeBody}>{block.body}</div>
    </div>
  );
}

function ExampleSection({ block }: { block: ContentBlock & { type: "example" } }) {
  return (
    <div
      className={`${styles.exampleBlock} ${block.layout === "full-bleed" ? styles.exampleFullBleed : ""}`}
    >
      <div
        className={styles.exampleImage}
        style={{
          backgroundImage: block.imageUrl ? `url(${block.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "var(--surface-0)",
        }}
      />
      <div className={styles.exampleCaption}>{block.caption}</div>
      {block.prompt && <div className={styles.examplePrompt}>{block.prompt}</div>}
    </div>
  );
}

function QuizSection({ block }: { block: ContentBlock & { type: "quiz" } }) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const isCorrect = block.correctOptionId ? selected === block.correctOptionId : true;

  return (
    <div className={styles.quizBlock}>
      <div className={styles.quizQuestion}>{block.question}</div>
      {block.options.map((opt) => {
        const isSelected = selected === opt.id;
        const showCorrect = answered && opt.id === block.correctOptionId;
        return (
          <button
            key={opt.id}
            type="button"
            className={`${styles.quizOption} ${
              isSelected ? styles.quizOptionSelected : ""
            } ${showCorrect ? styles.quizOptionCorrect : ""}`}
            onClick={() => !answered && setSelected(opt.id)}
            disabled={answered}
          >
            <span
              className={`${styles.quizDiamond} ${
                isSelected ? styles.quizDiamondSelected : ""
              }`}
            />
            {opt.label}
          </button>
        );
      })}
      {answered && block.explanation && (
        <div className={styles.quizExplanation}>{block.explanation}</div>
      )}
    </div>
  );
}

function PracticePlaceholder({ block }: { block: ContentBlock & { type: "practice" } }) {
  return (
    <div className={styles.practiceBlock}>
      <span className={styles.practiceCornerTL} />
      <span className={styles.practiceCornerBR} />
      <div className={styles.practiceLabel}>Exercise</div>
      <div className={styles.practiceInstruction}>{block.instruction}</div>
      {block.hint && <div className={styles.practiceHint}>{block.hint}</div>}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--dawn-30)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Prompt bar loading...
      </div>
    </div>
  );
}

function ParticleScenePlaceholder({ block }: { block: ContentBlock & { type: "particle-scene" } }) {
  return (
    <div className={styles.particleScene}>
      <div className={styles.particleSceneTitle}>{block.title}</div>
      <div className={styles.particleSceneDesc}>{block.description}</div>
    </div>
  );
}
