"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { GenerationItem } from "@/components/generation/types";
import { ForgeGenerationCard } from "@/components/generation/ForgeGenerationCard";
import styles from "./ForgeGallery.module.css";

const VIRTUAL_THRESHOLD = 20;

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
}: ForgeGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastSeenLastIdRef = useRef<string | null>(null);
  const lastSeenStatusRef = useRef<string | null>(null);
  const lastSeenOutputCountRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<number | null>(null);
  const scrollAnimRef = useRef(0);

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

  const animateScroll = useCallback(() => {
    const feed = feedRef.current;
    if (scrollTargetRef.current === null || !feed) {
      scrollAnimRef.current = 0;
      return;
    }

    const diff = scrollTargetRef.current - feed.scrollTop;

    if (Math.abs(diff) < 0.5) {
      feed.scrollTop = scrollTargetRef.current;
      scrollTargetRef.current = null;
      scrollAnimRef.current = 0;
      updateScrollBeam();
      return;
    }

    feed.scrollTop += diff * 0.12;
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
      lastSeenLastIdRef.current = null;
      lastSeenStatusRef.current = null;
      lastSeenOutputCountRef.current = 0;
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

      scrollTargetRef.current = null;
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = 0;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          feedRef.current?.scrollTo({
            top: feedRef.current.scrollHeight,
            behavior: isNewGen ? "smooth" : "auto",
          });
        });
      });
    }
  }, [generations]);

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
            <div key={generation.id} className={styles.generationRow}>
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
