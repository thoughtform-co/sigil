"use client";

import { useState, useEffect, useCallback } from "react";

export type OutputItem = {
  id: string;
  fileUrl: string;
  fileType: string;
  isApproved?: boolean;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

export type GenerationItem = {
  id: string;
  prompt: string;
  negativePrompt?: string | null;
  parameters?: Record<string, unknown>;
  status: string;
  modelId: string;
  createdAt: string;
  outputs: OutputItem[];
};

type GenerationGalleryProps = {
  generations: GenerationItem[];
  onRetry: (generationId: string) => void;
  onReuse: (generation: GenerationItem) => void;
  onApprove: (outputId: string, isApproved: boolean) => void;
  onDeleteOutput: (outputId: string) => void;
  busy: boolean;
};

const labelStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--dawn-50)",
};

function statusDisplay(status: string): string {
  return status === "processing_locked" ? "processing" : status;
}

export function GenerationGallery({
  generations,
  onRetry,
  onReuse,
  onApprove,
  onDeleteOutput,
  busy,
}: GenerationGalleryProps) {
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
    <div className="sigil-gallery border border-[var(--dawn-08)] bg-[var(--surface-0)] p-4 flex flex-col min-h-0">
      <h2 style={labelStyle} className="shrink-0">
        generation gallery
      </h2>
      <div className="mt-3 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto min-h-0 flex-1 content-start">
        {generations.length === 0 ? (
          <div className="hud-panel-empty col-span-full border border-dashed border-[var(--dawn-15)]">
            <p className="hud-panel-empty-title">No generations yet</p>
            <p className="hud-panel-empty-body">
              Select a session and use the prompt bar below to create your first generation.
            </p>
          </div>
        ) : (
          generations.map((generation) => (
            <div key={generation.id} className="sigil-gen-card border border-[var(--dawn-08)] p-3">
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-[var(--dawn-50)]">
                <span className="sigil-status-badge">
                  {statusDisplay(generation.status)} — {generation.modelId}
                </span>
                {generation.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => void onRetry(generation.id)}
                    disabled={busy}
                    className="sigil-btn-secondary text-[10px] py-1 px-2 disabled:opacity-50"
                  >
                    retry
                  </button>
                ) : null}
              </div>
              <div className="mb-2 text-sm text-[var(--dawn)] line-clamp-2">{generation.prompt}</div>
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => onReuse(generation)}
                  className="sigil-btn-ghost text-[10px] py-1 px-2"
                >
                  reuse params
                </button>
              </div>
              <div className="space-y-2">
                {generation.outputs.map((output) => (
                  <div key={output.id} className="border border-[var(--dawn-08)] p-2">
                    {output.fileType === "video" ? (
                      <video
                        className="h-44 w-full object-cover"
                        controls
                        src={output.fileUrl}
                        preload="metadata"
                      />
                    ) : (
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => setLightboxUrl(output.fileUrl)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="h-44 w-full object-cover"
                          src={output.fileUrl}
                          alt="Generated output"
                        />
                      </button>
                    )}
                    <a
                      href={output.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-xs text-[var(--gold)] underline-offset-2 hover:underline"
                    >
                      open source
                    </a>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void onApprove(output.id, !output.isApproved)}
                        className={`sigil-btn-ghost text-[10px] py-1 px-2 ${
                          output.isApproved ? "!border-[var(--status-success)] !text-[var(--status-success)]" : ""
                        }`}
                      >
                        {output.isApproved ? "approved" : "approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteOutput(output.id)}
                        className="sigil-btn-ghost text-[10px] py-1 px-2 text-[var(--status-error)] hover:!border-[var(--status-error)]"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Simple lightbox */}
      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image full size"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-sm uppercase tracking-wider"
            onClick={closeLightbox}
          >
            Close (Esc)
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
