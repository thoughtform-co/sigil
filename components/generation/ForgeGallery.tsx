"use client";

import { useState, useEffect, useCallback } from "react";
import type { GenerationItem } from "@/components/generation/types";
import { ForgeGenerationCard } from "@/components/generation/ForgeGenerationCard";
import styles from "./ForgeGallery.module.css";

type ForgeGalleryProps = {
  generations: GenerationItem[];
  onRetry: (generationId: string) => void;
  onReuse: (generation: GenerationItem) => void;
  onRerun?: (generationId: string) => void;
  onConvertToVideo?: (imageUrl: string) => void;
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

  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeLightbox]);

  return (
    <div className={styles.gallery}>
      <div className={styles.feed}>
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
