"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { GenerationItem } from "@/components/generation/types";
import { ForgeGenerationCard } from "@/components/generation/ForgeGenerationCard";
import styles from "./ForgeGallery.module.css";

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
}: ForgeGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastSeenLastIdRef = useRef<string | null>(null);
  const lastSeenStatusRef = useRef<string | null>(null);
  const lastSeenOutputCountRef = useRef<number>(0);

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

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const handleWheelAnywhere = (event: WheelEvent) => {
      if (lightboxUrl) return;
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

      const scrollable = feed.scrollHeight - feed.clientHeight;
      if (scrollable <= 0) return;

      // Prevent browser/page scrollbar and route wheel motion to the feed.
      event.preventDefault();
      feed.scrollTop += event.deltaY;
      updateScrollBeam();
    };

    window.addEventListener("wheel", handleWheelAnywhere, { passive: false });
    return () => window.removeEventListener("wheel", handleWheelAnywhere);
  }, [lightboxUrl, updateScrollBeam]);

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

  return (
    <div className={styles.gallery}>
      <div ref={feedRef} className={styles.feed}>
        {generations.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No generations yet</p>
            <p className={styles.emptyBody}>
              Select a session and use the prompt bar below to create your first generation.
            </p>
          </div>
        ) : (
          generations.map((generation) => (
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
          ))
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
