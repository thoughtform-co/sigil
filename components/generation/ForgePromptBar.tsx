"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import type { GenerationType, ModelItem } from "@/components/generation/types";
import { ImageBrowseModal } from "@/components/generation/ImageBrowseModal";
import styles from "./ForgePromptBar.module.css";

const DEFAULT_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const PROMPT_MIN_HEIGHT = 52;
const PROMPT_MAX_HEIGHT = 300;

/** Matches [`app/api/upload/reference-image/route.ts`](app/api/upload/reference-image/route.ts) MAX_FILE_SIZE */
const MAX_END_FRAME_FILE_BYTES = 25 * 1024 * 1024;

function detectClosestAspectRatio(
  width: number,
  height: number,
  supported: string[],
): string | null {
  if (width <= 0 || height <= 0 || supported.length === 0) return null;
  const ratio = width / height;
  let closest = supported[0];
  let minDiff = Infinity;
  for (const label of supported) {
    const [w, h] = label.split(":").map(Number);
    if (!w || !h) continue;
    const diff = Math.abs(ratio - w / h);
    if (diff < minDiff) {
      minDiff = diff;
      closest = label;
    }
  }
  return closest;
}

type ForgePromptBarProps = {
  projectId: string;
  generationType: GenerationType;
  /** When true, only the mode strip (Image/Video/Canvas/Brainstorm) is shown; used in canvas mode */
  minimal?: boolean;
  prompt?: string;
  onPromptChange?: (value: string) => void;
  referenceImages?: string[];
  onReferenceImagesChange?: (value: string[]) => void;
  modelId?: string;
  onModelChange?: (value: string) => void;
  models?: ModelItem[];
  aspectRatio?: string;
  onAspectRatioChange?: (value: string) => void;
  resolution?: string;
  onResolutionChange?: (value: string) => void;
  numOutputs?: string;
  onNumOutputsChange?: (value: string) => void;
  duration?: string;
  onDurationChange?: (value: string) => void;
  activeSessionName?: string | null;
  hasSession?: boolean;
  onSubmit?: () => void;
  onEnhance?: () => void;
  busy?: boolean;
  enhancing?: boolean;
  message?: string | null;
  brainstormOpen?: boolean;
  onBrainstormToggle?: () => void;
  endFrameUrl?: string;
  /** Second arg is storage path when known (for signed URL refresh). */
  onEndFrameChange?: (url: string, path?: string) => void;
  supportsEndFrame?: boolean;
  /** Fired when a file-based end frame upload starts or finishes. */
  onEndFrameUploadingChange?: (uploading: boolean) => void;
  /** User-visible error (e.g. oversized file or upload failure). */
  onEndFrameUploadError?: (message: string) => void;
};

export function ForgePromptBar({
  projectId,
  generationType,
  minimal = false,
  prompt = "",
  onPromptChange = () => {},
  referenceImages = [],
  onReferenceImagesChange = () => {},
  modelId = "",
  onModelChange = () => {},
  models = [],
  aspectRatio = "1:1",
  onAspectRatioChange = () => {},
  resolution = "4096",
  onResolutionChange = () => {},
  numOutputs = "1",
  onNumOutputsChange = () => {},
  duration = "5",
  onDurationChange = () => {},
  activeSessionName,
  hasSession = false,
  onSubmit = () => {},
  onEnhance = () => {},
  busy = false,
  enhancing = false,
  message = null,
  brainstormOpen,
  onBrainstormToggle,
  endFrameUrl = "",
  onEndFrameChange = () => {},
  supportsEndFrame = false,
  onEndFrameUploadingChange,
  onEndFrameUploadError,
}: ForgePromptBarProps) {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [browseModalOpen, setBrowseModalOpen] = useState(false);
  const [referencePreviewOpen, setReferencePreviewOpen] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const endFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameMenuRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const [showEndFrameMenu, setShowEndFrameMenu] = useState(false);
  const [browseTarget, setBrowseTarget] = useState<"reference" | "endFrame">("reference");
  /** Blob URL for thumb while multipart upload is in flight (parent endFrameUrl is empty until done). */
  const [endFrameLocalPreview, setEndFrameLocalPreview] = useState<string | null>(null);
  const endFrameLocalPreviewRef = useRef<string | null>(null);
  const [endFrameUploading, setEndFrameUploading] = useState(false);

  const replaceEndFrameLocalPreview = useCallback((next: string | null) => {
    const prev = endFrameLocalPreviewRef.current;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    endFrameLocalPreviewRef.current = next;
    setEndFrameLocalPreview(next);
  }, []);

  useEffect(() => {
    return () => {
      const p = endFrameLocalPreviewRef.current;
      if (p?.startsWith("blob:")) URL.revokeObjectURL(p);
      endFrameLocalPreviewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!supportsEndFrame) {
      replaceEndFrameLocalPreview(null);
      setEndFrameUploading(false);
      onEndFrameUploadingChange?.(false);
    }
  }, [supportsEndFrame, replaceEndFrameLocalPreview, onEndFrameUploadingChange]);

  /** Parent cleared the URL (e.g. no start frame); drop orphan blob preview unless an upload is in flight. */
  useEffect(() => {
    if (!endFrameUrl && !endFrameUploading && endFrameLocalPreviewRef.current) {
      replaceEndFrameLocalPreview(null);
    }
  }, [endFrameUrl, endFrameUploading, replaceEndFrameLocalPreview]);

  const setUploading = useCallback(
    (v: boolean) => {
      setEndFrameUploading(v);
      onEndFrameUploadingChange?.(v);
    },
    [onEndFrameUploadingChange],
  );

  const [inputHeight, setInputHeight] = useState(PROMPT_MIN_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(PROMPT_MIN_HEIGHT);
  const resizePointerId = useRef<number | null>(null);
  const currentHeightRef = useRef(PROMPT_MIN_HEIGHT);
  const rafId = useRef<number | null>(null);

  useEffect(() => { currentHeightRef.current = inputHeight; }, [inputHeight]);

  const handleResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizePointerId.current = e.pointerId;
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = currentHeightRef.current;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: PointerEvent) => {
    if (resizePointerId.current !== null && e.pointerId !== resizePointerId.current) return;
    e.preventDefault();
    const delta = resizeStartY.current - e.clientY;
    const newHeight = Math.min(
      Math.max(resizeStartHeight.current + delta, PROMPT_MIN_HEIGHT),
      PROMPT_MAX_HEIGHT,
    );
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      currentHeightRef.current = newHeight;
      setInputHeight(newHeight);
    });
  }, []);

  const handleResizeEnd = useCallback((e?: PointerEvent) => {
    if (resizePointerId.current !== null && e && e.pointerId !== resizePointerId.current) return;
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    const handleEl = resizeHandleRef.current;
    if (handleEl && resizePointerId.current !== null) {
      try {
        handleEl.releasePointerCapture?.(resizePointerId.current);
      } catch {
        // Ignore stale pointer capture during cleanup.
      }
    }
    resizePointerId.current = null;
    setIsResizing(false);
  }, []);

  const handleResizeCancel = useCallback(() => {
    handleResizeEnd();
  }, [handleResizeEnd]);

  useEffect(() => {
    if (!isResizing) return;
    window.addEventListener("pointermove", handleResizeMove, { passive: false });
    window.addEventListener("pointerup", handleResizeEnd);
    window.addEventListener("pointercancel", handleResizeEnd);
    window.addEventListener("blur", handleResizeCancel);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
    return () => {
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeEnd);
      window.removeEventListener("pointercancel", handleResizeEnd);
      window.removeEventListener("blur", handleResizeCancel);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, handleResizeMove, handleResizeEnd, handleResizeCancel]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
      document.documentElement.style.setProperty("--prompt-bar-height", `${h}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--prompt-bar-height");
    };
  }, []);

  const selectedModel = models.find((m) => m.id === modelId);
  const displayModelName = selectedModel ? selectedModel.name : modelId || "Model";
  const aspectRatios = selectedModel?.supportedAspectRatios?.length
    ? selectedModel.supportedAspectRatios
    : DEFAULT_ASPECT_RATIOS;

  useEffect(() => {
    if (isResizing) return;
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    const natural = Math.max(t.scrollHeight, PROMPT_MIN_HEIGHT);
    if (natural > currentHeightRef.current) {
      const h = Math.min(natural, PROMPT_MAX_HEIGHT);
      currentHeightRef.current = h;
      setInputHeight(h);
    }
  }, [prompt]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    if (showModelPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showModelPicker]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAttachMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (endFrameMenuRef.current && !endFrameMenuRef.current.contains(e.target as Node)) {
        setShowEndFrameMenu(false);
      }
    };
    if (showEndFrameMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEndFrameMenu]);

  useEffect(() => {
    if (!referencePreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReferencePreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [referencePreviewOpen]);

  const appendReferences = useCallback(
    (items: string[]) => {
      const cleaned = items.map((item) => item.trim()).filter(Boolean);
      if (cleaned.length === 0) return;
      const merged = [...referenceImages];
      for (const item of cleaned) {
        if (!merged.includes(item)) merged.push(item);
      }
      onReferenceImagesChange(merged);
    },
    [referenceImages, onReferenceImagesChange],
  );

  const handleBrowseSelect = useCallback(
    (url: string) => {
      if (browseTarget === "endFrame") {
        replaceEndFrameLocalPreview(null);
        onEndFrameChange(url);
      } else {
        const hadRefs = referenceImages.length > 0;
        appendReferences([url]);
        if (!hadRefs) {
          const img = new window.Image();
          img.onload = () => {
            const match = detectClosestAspectRatio(img.naturalWidth, img.naturalHeight, aspectRatios);
            if (match) onAspectRatioChange(match);
          };
          img.src = url;
        }
      }
    },
    [browseTarget, appendReferences, onEndFrameChange, replaceEndFrameLocalPreview, aspectRatios, onAspectRatioChange, referenceImages.length],
  );

  const handleEndFrameImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (endFrameInputRef.current) endFrameInputRef.current.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      if (file.size > MAX_END_FRAME_FILE_BYTES) {
        onEndFrameUploadError?.(`Image must be ${MAX_END_FRAME_FILE_BYTES / (1024 * 1024)}MB or smaller.`);
        return;
      }
      onEndFrameChange("");
      replaceEndFrameLocalPreview(URL.createObjectURL(file));
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        const res = await fetch("/api/upload/reference-image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Upload failed (${res.status}): ${text.slice(0, 120)}`);
        }
        const data = (await res.json()) as {
          url?: string;
          referenceImageUrl?: string;
          path?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "End frame upload failed");
        const uploadedUrl = data.referenceImageUrl ?? data.url;
        if (!uploadedUrl) throw new Error("Upload returned no URL");
        replaceEndFrameLocalPreview(null);
        onEndFrameChange(uploadedUrl, data.path);
      } catch (err) {
        replaceEndFrameLocalPreview(null);
        onEndFrameChange("");
        onEndFrameUploadError?.(err instanceof Error ? err.message : "End frame upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onEndFrameChange, onEndFrameUploadError, projectId, replaceEndFrameLocalPreview, setUploading],
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) return;
      const hadRefs = referenceImages.length > 0;
      const objectUrls = files.map((file) => URL.createObjectURL(file));
      if (!hadRefs) {
        const firstObjectUrl = objectUrls[0];
        const img = new window.Image();
        img.onload = () => {
          const match = detectClosestAspectRatio(img.naturalWidth, img.naturalHeight, aspectRatios);
          if (match) onAspectRatioChange(match);
        };
        img.src = firstObjectUrl;
      }
      appendReferences(objectUrls);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [appendReferences, onAspectRatioChange, aspectRatios, referenceImages.length],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files ?? []).filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) return;
      const hadRefs = referenceImages.length > 0;
      const objectUrls = files.map((file) => URL.createObjectURL(file));
      if (!hadRefs) {
        const url = objectUrls[0];
        const img = new window.Image();
        img.onload = () => {
          const match = detectClosestAspectRatio(img.naturalWidth, img.naturalHeight, aspectRatios);
          if (match) onAspectRatioChange(match);
        };
        img.src = url;
      }
      appendReferences(objectUrls);
    },
    [appendReferences, onAspectRatioChange, aspectRatios, referenceImages.length],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeReferenceAt = useCallback(
    (index: number) => {
      onReferenceImagesChange(referenceImages.filter((_, idx) => idx !== index));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onReferenceImagesChange, referenceImages],
  );

  const addReferenceFromUrl = useCallback(() => {
    const url = urlInputValue.trim();
    if (!url) return;
    appendReferences([url]);
    setUrlInputValue("");
  }, [appendReferences, urlInputValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSubmit();
    }
  };

  const endFrameDisplaySrc =
    endFrameUrl.trim() && endFrameUrl.startsWith("http")
      ? endFrameUrl
      : endFrameLocalPreview ?? "";
  const hasEndFrameThumb = Boolean(endFrameDisplaySrc);
  const canSubmit =
    modelId &&
    prompt.trim() &&
    !busy &&
    !(generationType === "video" && endFrameUploading);

  if (minimal) {
    return (
      <div ref={containerRef} className={styles.promptBarContainer}>
        <div className={styles.promptBarRow}>
          <div className={styles.sideStrip}>
            <div className={styles.modeBar}>
              <Link
                href={`/routes/${projectId}/image`}
                prefetch={false}
                className={`${styles.modeButton} ${generationType === "image" ? styles.modeButtonActive : ""}`}
                title="Image mode"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </Link>
              <Link
                href={`/routes/${projectId}/video`}
                prefetch={false}
                className={`${styles.modeButton} ${generationType === "video" ? styles.modeButtonActive : ""}`}
                title="Video mode"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Link>
              <Link
                href={`/routes/${projectId}/canvas`}
                prefetch={false}
                className={`${styles.modeButton} ${generationType === "canvas" ? styles.modeButtonActive : ""}`}
                title="Canvas workflow"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="2.5" />
                  <circle cx="16" cy="16" r="2.5" />
                  <path d="M10.5 8l3 3M14 10.5l3 3" />
                </svg>
              </Link>
            </div>
            {onBrainstormToggle && (
              <button
                type="button"
                className={`${styles.brainstormButton} ${brainstormOpen ? styles.brainstormButtonActive : ""}`}
                onClick={onBrainstormToggle}
                title={brainstormOpen ? "Close brainstorm" : "Open brainstorm"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.promptBarContainer}>
      <div className={styles.promptBarRow}>
        <div
          className={`${styles.unifiedPromptContainer} ${enhancing ? styles.enhancingGlow : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ position: "relative" }}
        >
          {/* Resize handle */}
          <div
            ref={resizeHandleRef}
            className={styles.resizeHandle}
            onPointerDown={handleResizeStart}
            onDragStart={(e) => e.preventDefault()}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize prompt bar"
            title="Drag upward to expand the prompt bar"
          >
            <div className={`${styles.resizeGrip} ${isResizing ? styles.resizeGripActive : ""}`}>
              <svg width="20" height="6" viewBox="0 0 20 6" fill="currentColor" aria-hidden="true">
                <rect x="0" y="0" width="20" height="1" opacity="0.8" />
                <rect x="0" y="3" width="20" height="1" opacity="0.55" />
                <rect x="0" y="5" width="20" height="1" opacity="0.35" />
              </svg>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className={styles.fileInput}
          />
          <input
            ref={endFrameInputRef}
            type="file"
            accept="image/*"
            onChange={handleEndFrameImageSelect}
            className={styles.fileInput}
          />

          <div className={styles.promptAndParams}>
            {/* Attachments row above prompt */}
            <div className={styles.attachRow}>
              <div className={styles.attachMenuContainer} ref={attachMenuRef}>
                <button
                  type="button"
                  className={styles.addImageBtn}
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  title="Add reference image"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
                {showAttachMenu && (
                  <div className={styles.attachDropdown}>
                    <button
                      type="button"
                      className={styles.attachOption}
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      Upload
                    </button>
                    <button
                      type="button"
                      className={styles.attachOption}
                      onClick={() => {
                        setShowAttachMenu(false);
                        setBrowseTarget("reference");
                        setBrowseModalOpen(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                      Browse
                    </button>
                  </div>
                )}
              </div>
              {referenceImages.map((ref, index) => (
                <div key={`${ref}-${index}`} className={styles.attachThumb}>
                  {generationType === "video" && index === 0 && (
                    <span className={styles.frameTag}>START</span>
                  )}
                  <img
                    src={ref}
                    alt={generationType === "video" && index === 0 ? "Start frame" : "Reference"}
                    role="button"
                    tabIndex={0}
                    title="Open full preview"
                    onClick={() => {
                      setPreviewImageUrl(ref);
                      setReferencePreviewOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPreviewImageUrl(ref);
                        setReferencePreviewOpen(true);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.attachRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeReferenceAt(index);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {generationType === "video" && supportsEndFrame && referenceImages.length > 0 && (
                hasEndFrameThumb ? (
                  <div className={styles.attachThumb} aria-busy={endFrameUploading}>
                    <span className={styles.frameTag}>END</span>
                    <img
                      src={endFrameDisplaySrc}
                      alt="End frame"
                      role="button"
                      tabIndex={0}
                      title={endFrameUploading ? "Uploading end frame…" : "Open full preview"}
                      onClick={() => {
                        setPreviewImageUrl(endFrameDisplaySrc);
                        setReferencePreviewOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPreviewImageUrl(endFrameDisplaySrc);
                          setReferencePreviewOpen(true);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.attachRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        replaceEndFrameLocalPreview(null);
                        setUploading(false);
                        onEndFrameChange("");
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className={styles.attachMenuContainer} ref={endFrameMenuRef}>
                    <button
                      type="button"
                      className={styles.addImageBtn}
                      onClick={() => setShowEndFrameMenu(!showEndFrameMenu)}
                      title="Add end frame"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    {showEndFrameMenu && (
                      <div className={styles.attachDropdown}>
                        <button
                          type="button"
                          className={styles.attachOption}
                          onClick={() => {
                            setShowEndFrameMenu(false);
                            endFrameInputRef.current?.click();
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                          </svg>
                          Upload
                        </button>
                        <button
                          type="button"
                          className={styles.attachOption}
                          onClick={() => {
                            setShowEndFrameMenu(false);
                            setBrowseTarget("endFrame");
                            setBrowseModalOpen(true);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                          </svg>
                          Browse
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
              {showUrlInput && (
                <input
                  type="url"
                  value={urlInputValue}
                  onChange={(e) => setUrlInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addReferenceFromUrl();
                    }
                  }}
                  onBlur={addReferenceFromUrl}
                  className={styles.refInput}
                  placeholder="Paste image URL"
                  aria-label="Reference image URL"
                />
              )}
              {!showUrlInput && referenceImages.length === 0 && (
                <button
                  type="button"
                  className={styles.urlToggle}
                  onClick={() => setShowUrlInput(true)}
                >
                  or paste URL
                </button>
              )}
            </div>

            {/* Prompt textarea */}
            <div className={styles.promptTextArea}>
              <textarea
                ref={textareaRef}
                id="forge-prompt-bar-prompt"
                className={`${styles.promptInput} ${enhancing ? styles.promptEnhancing : ""}`}
                style={{ height: `${inputHeight}px`, transition: isResizing ? "none" : undefined }}
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to generate… (Enter to generate)"
                rows={1}
                disabled={busy}
              />
            </div>

            <div className={styles.paramsRow}>
              <div className={styles.modelPickerContainer} ref={modelPickerRef}>
                <button
                  type="button"
                  className={styles.modelPickerButton}
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  disabled={busy}
                >
                  <span className={styles.modelPickerLabel}>{displayModelName}</span>
                  <span className={styles.modelPickerChevron}>▼</span>
                </button>
                {showModelPicker && (
                  <div className={styles.modelDropdown}>
                    {models.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        className={`${styles.modelOption} ${modelId === model.id ? styles.modelOptionActive : ""}`}
                        onClick={() => {
                          onModelChange(model.id);
                          setShowModelPicker(false);
                        }}
                      >
                        {model.name}
                        {model.provider ? ` (${model.provider})` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={aspectRatio}
                onChange={(e) => onAspectRatioChange(e.target.value)}
                className={styles.paramSelect}
                aria-label="Aspect ratio"
                disabled={busy}
              >
                {aspectRatios.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                value={resolution}
                onChange={(e) => onResolutionChange(e.target.value)}
                className={styles.paramSelect}
                aria-label="Resolution"
                disabled={busy}
              >
                <option value="1024">1K</option>
                <option value="2048">2K</option>
                <option value="4096">4K</option>
              </select>
              <select
                value={numOutputs}
                onChange={(e) => onNumOutputsChange(e.target.value)}
                className={styles.paramSelect}
                aria-label="Outputs"
                disabled={busy}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              {generationType === "video" && (
                <div className={styles.durationToggle} role="group" aria-label="Duration">
                  <button
                    type="button"
                    className={`${styles.durationBtn} ${duration === "5" ? styles.durationActive : ""}`}
                    onClick={() => onDurationChange("5")}
                    disabled={busy}
                  >
                    5s
                  </button>
                  <button
                    type="button"
                    className={`${styles.durationBtn} ${duration === "10" ? styles.durationActive : ""}`}
                    onClick={() => onDurationChange("10")}
                    disabled={busy}
                  >
                    10s
                  </button>
                </div>
              )}
              <button
                type="button"
                className={`${styles.paramButton} ${enhancing ? styles.enhanceActive : ""}`}
                disabled={enhancing || !prompt.trim() || !modelId || busy}
                onClick={() => void onEnhance()}
              >
                {enhancing ? (
                  <span className={styles.enhanceSpinner}>
                    <span className={styles.enhanceDot} />
                    <span className={styles.enhanceDot} />
                    <span className={styles.enhanceDot} />
                  </span>
                ) : "Enhance"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.generateButton}
            onClick={() => void onSubmit()}
            disabled={!canSubmit}
            title="Generate"
          >
            {busy ? (
              <span className={styles.generating}>
                <span className={styles.spinner} />
              </span>
            ) : (
              <span className={styles.generateIcon}>▶</span>
            )}
          </button>
        </div>

        {/* Right-side strip: image/video nav + brainstorm toggle */}
        <div className={styles.sideStrip}>
          <div className={styles.modeBar}>
            <Link
              href={`/routes/${projectId}/image`}
              prefetch={false}
              className={`${styles.modeButton} ${generationType === "image" ? styles.modeButtonActive : ""}`}
              title="Image mode"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </Link>
            <Link
              href={`/routes/${projectId}/video`}
              prefetch={false}
              className={`${styles.modeButton} ${generationType === "video" ? styles.modeButtonActive : ""}`}
              title="Video mode"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Link>
            <Link
              href={`/routes/${projectId}/canvas`}
              prefetch={false}
              className={`${styles.modeButton} ${generationType === "canvas" ? styles.modeButtonActive : ""}`}
              title="Canvas workflow"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="2.5" />
                <circle cx="16" cy="16" r="2.5" />
                <path d="M10.5 8l3 3M14 10.5l3 3" />
              </svg>
            </Link>
          </div>
          {onBrainstormToggle && (
            <button
              type="button"
              className={`${styles.brainstormButton} ${brainstormOpen ? styles.brainstormButtonActive : ""}`}
              onClick={onBrainstormToggle}
              title={brainstormOpen ? "Close brainstorm" : "Open brainstorm"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {message && <p className={styles.message} role="status">{message}</p>}
      <ImageBrowseModal
        open={browseModalOpen}
        onClose={() => setBrowseModalOpen(false)}
        onSelectImage={handleBrowseSelect}
        projectId={projectId}
      />
      {referencePreviewOpen && previewImageUrl && (
        <div
          className={styles.refPreviewBackdrop}
          onClick={() => setReferencePreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Reference image preview"
        >
          <button
            type="button"
            className={styles.refPreviewClose}
            onClick={() => setReferencePreviewOpen(false)}
          >
            Close (Esc)
          </button>
          <img
            src={previewImageUrl}
            alt="Reference full preview"
            className={styles.refPreviewImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
