"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { GenerationItem } from "@/components/generation/types";
import { ForgeGenerationCard } from "@/components/generation/ForgeGenerationCard";
import styles from "./ForgeGallery.module.css";

const VIRTUAL_THRESHOLD = 4;
const INITIAL_ANCHOR_STABLE_FRAMES = 8;

function FeedSeparator() {
  return (
    <div className={styles.feedSeparator} aria-hidden>
      <svg
        className={styles.separatorVector}
        viewBox="0 0 176 176"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M163.569 90.0186H107.114V83.8456H101.935V79.8677H98.2913V74.0075H92.0107V18.46H83.9799V74.0075H77.6895V79.8677H74.0343V83.8456H68.8651V90.0186H12.4229V98.0494H68.8651V104.222H74.0343V107.77H77.6895V114.061H83.9799V169.606H92.0107V114.061H98.2913V107.77H101.935V104.222H107.114V98.0494H163.569V90.0186Z" />
      </svg>
    </div>
  );
}

type ForgeGalleryProps = {
  generations: GenerationItem[];
  onRetry: (generationId: string) => void;
  onReuse: (generation: GenerationItem) => void;
  onRerun?: (generationId: string) => void;
  onConvertToVideo?: (outputId: string, imageUrl: string, genMeta?: { generationId: string; modelId: string; createdAt: string; status: string }) => void;
  onUseAsReference?: (imageUrl: string) => void;
  onDismiss?: (generationId: string) => void;
  onApprove: (outputId: string, isApproved: boolean) => void;
  busy: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isLoading?: boolean;
  onLoadOlder?: () => void;
  hasOlder?: boolean;
  isLoadingOlder?: boolean;
};

export function ForgeGallery({
  generations,
  onRetry,
  onReuse,
  onRerun,
  onConvertToVideo,
  onUseAsReference,
  onDismiss,
  onApprove,
  busy,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isLoading,
  onLoadOlder,
  hasOlder,
  isLoadingOlder,
}: ForgeGalleryProps) {
  const pathname = usePathname();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastSeenLastIdRef = useRef<string | null>(null);
  const lastSeenStatusRef = useRef<string | null>(null);
  const lastSeenOutputCountRef = useRef<number>(0);
  const initialScrollDoneRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const olderSentinelRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<number | null>(null);
  const scrollAnimRef = useRef(0);
  const initialAnchorFrameRef = useRef(0);
  const initialAnchorLastMaxScrollRef = useRef(-1);
  const initialAnchorStableFramesRef = useRef(0);
  const hasSeenScrollableContentRef = useRef(false);
  const resolvedEmptyStateRef = useRef(false);
  const prependAnchorRef = useRef<{
    prevScrollTop: number;
    prevScrollHeight: number;
    expectedMinCount: number;
  } | null>(null);

  const perfMarked = useRef(false);
  useEffect(() => {
    if (!perfMarked.current && generations.length > 0) {
      perfMarked.current = true;
      performance.mark("sigil:gallery-first-render");
      if (performance.getEntriesByName("sigil:route-open").length > 0) {
        performance.measure("sigil:route-to-gallery", "sigil:route-open", "sigil:gallery-first-render");
      }
    }
  }, [generations.length]);

  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeLightbox]);

  const updateScrollBeam = useCallback(() => {
    const feed = feedRef.current;
    const rail = document.querySelector<HTMLElement>('[data-hud-rail="right"]');
    if (!feed || !rail) return;

    const scrollable = Math.max(feed.scrollHeight - feed.clientHeight, 0);
    if (scrollable > 0) {
      const pct = feed.scrollTop / scrollable;
      const railH = rail.offsetHeight;
      const beamH = 120;
      const maxPos = ((railH - beamH) / railH) * 100;
      rail.style.setProperty("--scroll-beam-position", `${pct * maxPos}%`);
      rail.classList.add("has-scroll");
    } else {
      rail.classList.remove("has-scroll");
      rail.style.setProperty("--scroll-beam-position", "0%");
    }
  }, []);

  const stopInitialBottomLock = useCallback(() => {
    if (initialAnchorFrameRef.current) {
      cancelAnimationFrame(initialAnchorFrameRef.current);
      initialAnchorFrameRef.current = 0;
    }
  }, []);

  const runInitialBottomLock = useCallback(() => {
    stopInitialBottomLock();
    initialAnchorLastMaxScrollRef.current = -1;
    initialAnchorStableFramesRef.current = 0;
    hasSeenScrollableContentRef.current = false;

    const syncToBottom = () => {
      const feed = feedRef.current;
      if (!feed) {
        initialAnchorFrameRef.current = 0;
        return;
      }

      const maxScroll = Math.max(feed.scrollHeight - feed.clientHeight, 0);
      feed.scrollTop = maxScroll;
      updateScrollBeam();

      if (maxScroll > 0) {
        hasSeenScrollableContentRef.current = true;
      }

      if (!hasSeenScrollableContentRef.current) {
        initialAnchorFrameRef.current = requestAnimationFrame(syncToBottom);
        return;
      }

      if (Math.abs(maxScroll - initialAnchorLastMaxScrollRef.current) < 1) {
        initialAnchorStableFramesRef.current += 1;
      } else {
        initialAnchorStableFramesRef.current = 0;
        initialAnchorLastMaxScrollRef.current = maxScroll;
      }

      if (initialAnchorStableFramesRef.current >= INITIAL_ANCHOR_STABLE_FRAMES) {
        initialAnchorFrameRef.current = 0;
        return;
      }

      initialAnchorFrameRef.current = requestAnimationFrame(syncToBottom);
    };

    initialAnchorFrameRef.current = requestAnimationFrame(syncToBottom);
  }, [stopInitialBottomLock, updateScrollBeam]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    updateScrollBeam();
    feed.addEventListener("scroll", updateScrollBeam, { passive: true });
    window.addEventListener("resize", updateScrollBeam);
    const ro = new ResizeObserver(updateScrollBeam);
    ro.observe(feed);

    return () => {
      feed.removeEventListener("scroll", updateScrollBeam);
      window.removeEventListener("resize", updateScrollBeam);
      ro.disconnect();
      const rail = document.querySelector<HTMLElement>('[data-hud-rail="right"]');
      rail?.classList.remove("has-scroll");
    };
  }, [updateScrollBeam]);

  useEffect(() => stopInitialBottomLock, [stopInitialBottomLock]);

  useEffect(() => {
    if (!pathname?.startsWith("/routes/")) return;
    stopInitialBottomLock();
    lastSeenLastIdRef.current = null;
    lastSeenStatusRef.current = null;
    lastSeenOutputCountRef.current = 0;
    initialScrollDoneRef.current = false;
    resolvedEmptyStateRef.current = false;
    prependAnchorRef.current = null;
  }, [pathname, stopInitialBottomLock]);

  const animateScroll = useCallback(() => {
    const feed = feedRef.current;
    if (scrollTargetRef.current === null || !feed) {
      scrollAnimRef.current = 0;
      return;
    }

    const diff = scrollTargetRef.current - feed.scrollTop;

    if (Math.abs(diff) < 1) {
      feed.scrollTop = scrollTargetRef.current;
      scrollTargetRef.current = null;
      scrollAnimRef.current = 0;
      updateScrollBeam();
      return;
    }

    feed.scrollTop += diff * 0.22;
    updateScrollBeam();
    scrollAnimRef.current = requestAnimationFrame(animateScroll);
  }, [updateScrollBeam]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const handleWheelAnywhere = (event: WheelEvent) => {
      if (lightboxUrl) return;
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

      const scrollable = feed.scrollHeight - feed.clientHeight;
      if (scrollable <= 0) return;

      let el = event.target as HTMLElement | null;
      while (el && el !== feed) {
        if (el.scrollHeight > el.clientHeight + 1) {
          const atTop = el.scrollTop <= 0 && event.deltaY < 0;
          const atBottom =
            el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && event.deltaY > 0;
          if (!atTop && !atBottom) return;
        }
        el = el.parentElement;
      }

      event.preventDefault();

      const base = scrollTargetRef.current ?? feed.scrollTop;
      scrollTargetRef.current = Math.max(
        0,
        Math.min(scrollable, base + event.deltaY),
      );

      if (!scrollAnimRef.current) {
        scrollAnimRef.current = requestAnimationFrame(animateScroll);
      }
    };

    window.addEventListener("wheel", handleWheelAnywhere, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheelAnywhere);
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = 0;
      }
      scrollTargetRef.current = null;
    };
  }, [lightboxUrl, animateScroll]);

  useEffect(() => {
    if (generations.length === 0) {
      if (!isLoading) {
        resolvedEmptyStateRef.current = true;
      }
      lastSeenLastIdRef.current = null;
      lastSeenStatusRef.current = null;
      lastSeenOutputCountRef.current = 0;
      initialScrollDoneRef.current = false;
      return;
    }

    const lastGen = generations[generations.length - 1];
    const lastId = lastGen.id;
    const status = lastGen.status;
    const outputCount = lastGen.outputs?.length ?? 0;

    const isNewGen = lastId !== lastSeenLastIdRef.current;
    const statusChanged = status !== lastSeenStatusRef.current;
    const outputsAdded = outputCount > lastSeenOutputCountRef.current;

    if (isNewGen || statusChanged || outputsAdded) {
      lastSeenLastIdRef.current = lastId;
      lastSeenStatusRef.current = status;
      lastSeenOutputCountRef.current = outputCount;

      if (!initialScrollDoneRef.current) {
        initialScrollDoneRef.current = true;
        if (!resolvedEmptyStateRef.current && feedRef.current) {
          runInitialBottomLock();
        }
        return;
      }
    }
  }, [generations, isLoading, runInitialBottomLock]);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { root: feedRef.current, rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  const prevOlderCountRef = useRef(0);
  useEffect(() => {
    if (!onLoadOlder || !hasOlder || !initialScrollDoneRef.current) return;
    const el = olderSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const feed = feedRef.current;
        if (feed && !isLoadingOlder) {
          prependAnchorRef.current = {
            prevScrollTop: feed.scrollTop,
            prevScrollHeight: feed.scrollHeight,
            expectedMinCount: generations.length + 1,
          };
        }
        onLoadOlder();
      },
      { root: feedRef.current, rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadOlder, hasOlder, isLoadingOlder, generations.length]);

  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const anchor = prependAnchorRef.current;
    if (
      anchor &&
      generations.length >= anchor.expectedMinCount &&
      feed.scrollHeight >= anchor.prevScrollHeight
    ) {
      const deltaHeight = feed.scrollHeight - anchor.prevScrollHeight;
      feed.scrollTop = anchor.prevScrollTop + deltaHeight;
      updateScrollBeam();
      prependAnchorRef.current = null;
    }
    if (generations.length === 0) {
      prevOlderCountRef.current = 0;
      return;
    }
    const olderCount = generations.length - (prevOlderCountRef.current || generations.length);
    prevOlderCountRef.current = generations.length;
    if (olderCount <= 0) return;
  }, [generations.length, updateScrollBeam]);

  const useVirtual = generations.length >= VIRTUAL_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: generations.length,
    getScrollElement: () => feedRef.current,
    estimateSize: (index: number) => (index === 0 ? 400 : 464),
    overscan: 3,
    gap: 0,
  });

  const renderCard = useCallback(
    (generation: GenerationItem) => (
      <ForgeGenerationCard
        key={generation.id}
        generation={generation}
        onRetry={onRetry}
        onReuse={onReuse}
        onRerun={onRerun}
        onDismiss={onDismiss}
        onConvertToVideo={onConvertToVideo}
        onUseAsReference={onUseAsReference}
        onApprove={onApprove}
        onLightboxOpen={setLightboxUrl}
        busy={busy}
      />
    ),
    [onRetry, onReuse, onRerun, onDismiss, onConvertToVideo, onUseAsReference, onApprove, busy],
  );

  return (
    <div className={styles.gallery}>
      <div ref={feedRef} className={styles.feed}>
        <div className={styles.feedInner}>
        {hasOlder && generations.length > 0 && (
          <div ref={olderSentinelRef} className={styles.sentinel}>
            {isLoadingOlder && (
              <span className={styles.loadingMore}>Loading older…</span>
            )}
          </div>
        )}
        {isLoading && generations.length === 0 ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`skel-${i}`} className={styles.skeleton}>
                <div className={styles.skeletonPrompt} />
                <div className={styles.skeletonMedia} />
              </div>
            ))}
          </>
        ) : generations.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No generations yet</p>
            <p className={styles.emptyBody}>
              Select a session and use the prompt bar below to create your first generation.
            </p>
          </div>
        ) : useVirtual ? (
          <div
            className={styles.virtualContainer}
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const generation = generations[virtualRow.index];
              return (
                <div
                  key={generation.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={styles.virtualRow}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className={styles.generationRow}>
                    {virtualRow.index > 0 && <FeedSeparator />}
                    {renderCard(generation)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          generations.map((generation, index) => (
            <div
              key={generation.id}
              className={styles.generationRow}
            >
              {index > 0 && <FeedSeparator />}
              {renderCard(generation)}
            </div>
          ))
        )}
        {hasMore && (
          <div ref={sentinelRef} className={styles.sentinel}>
            {isLoadingMore && (
              <span className={styles.loadingMore}>Loading more…</span>
            )}
          </div>
        )}
        </div>
      </div>

      {lightboxUrl && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image full size"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={closeLightbox}
          >
            Close (Esc)
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
