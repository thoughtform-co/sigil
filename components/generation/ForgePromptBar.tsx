"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import type { GenerationType, ModelItem } from "@/components/generation/types";
import styles from "./ForgePromptBar.module.css";

const DEFAULT_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

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
  referenceImageUrl?: string;
  onReferenceImageUrlChange?: (value: string) => void;
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
};

export function ForgePromptBar({
  projectId,
  generationType,
  minimal = false,
  prompt = "",
  onPromptChange = () => {},
  referenceImageUrl = "",
  onReferenceImageUrlChange = () => {},
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
}: ForgePromptBarProps) {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    referenceImageUrl && (referenceImageUrl.startsWith("data:") || referenceImageUrl.startsWith("blob:"))
      ? referenceImageUrl
      : null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  const [inputHeight, setInputHeight] = useState(52);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(52);
  const currentHeightRef = useRef(52);
  const rafId = useRef<number | null>(null);

  useEffect(() => { currentHeightRef.current = inputHeight; }, [inputHeight]);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    resizeStartY.current = clientY;
    resizeStartHeight.current = currentHeightRef.current;
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const delta = resizeStartY.current - clientY;
    const newHeight = Math.min(Math.max(resizeStartHeight.current + delta, 48), 320);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      currentHeightRef.current = newHeight;
      setInputHeight(newHeight);
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);
    window.addEventListener("touchmove", handleResizeMove);
    window.addEventListener("touchend", handleResizeEnd);
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
      window.removeEventListener("touchmove", handleResizeMove);
      window.removeEventListener("touchend", handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

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
    const natural = Math.max(t.scrollHeight, 48);
    if (natural > inputHeight) {
      const h = Math.min(natural, 320);
      setInputHeight(h);
    }
  }, [prompt, isResizing, inputHeight]);

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

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      const img = new window.Image();
      img.onload = () => {
        const match = detectClosestAspectRatio(img.naturalWidth, img.naturalHeight, aspectRatios);
        if (match) onAspectRatioChange(match);
      };
      img.src = url;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onReferenceImageUrlChange(dataUrl);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onReferenceImageUrlChange, onAspectRatioChange, aspectRatios],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      const img = new window.Image();
      img.onload = () => {
        const match = detectClosestAspectRatio(img.naturalWidth, img.naturalHeight, aspectRatios);
        if (match) onAspectRatioChange(match);
      };
      img.src = url;
      const reader = new FileReader();
      reader.onload = () => {
        onReferenceImageUrlChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onReferenceImageUrlChange, onAspectRatioChange, aspectRatios],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const clearImage = useCallback(() => {
    setImagePreview(null);
    onReferenceImageUrlChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onReferenceImageUrlChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSubmit();
    }
  };

  const canSubmit = modelId && prompt.trim() && !busy;

  if (minimal) {
    return (
      <div className={styles.promptBarContainer}>
        <div className={styles.promptBarRow}>
          <div className={styles.sideStrip}>
            <div className={styles.modeBar}>
              <Link
                href={`/routes/${projectId}/image`}
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
                className={`${styles.modeButton} ${generationType === "video" ? styles.modeButtonActive : ""}`}
                title="Video mode"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Link>
              <Link
                href={`/routes/${projectId}/canvas`}
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
    <div className={styles.promptBarContainer}>
      <div className={styles.promptBarRow}>
        <div
          className={`${styles.unifiedPromptContainer} ${enhancing ? styles.enhancingGlow : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ position: "relative" }}
        >
          {/* Resize handle */}
          <div
            className={styles.resizeHandle}
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          >
            <div className={`${styles.resizeGrip} ${isResizing ? styles.resizeGripActive : ""}`}>
              <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
                <rect x="0" y="0" width="16" height="1" rx="0.5" opacity="0.6" />
                <rect x="0" y="3" width="16" height="1" rx="0.5" opacity="0.4" />
              </svg>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className={styles.fileInput}
          />

          <div className={styles.promptAndParams}>
            {/* Attachments row above prompt */}
            <div className={styles.attachRow}>
              <button
                type="button"
                className={styles.addImageBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Add reference image"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </button>
              {(imagePreview || referenceImageUrl) && (
                <div className={styles.attachThumb}>
                  <img
                    src={imagePreview || referenceImageUrl}
                    alt="Reference"
                    onError={() => setImagePreview(null)}
                  />
                  <button
                    type="button"
                    className={styles.attachRemove}
                    onClick={clearImage}
                  >
                    ×
                  </button>
                </div>
              )}
              {showUrlInput && (
                <input
                  type="url"
                  value={referenceImageUrl}
                  onChange={(e) => onReferenceImageUrlChange(e.target.value)}
                  className={styles.refInput}
                  placeholder="Paste image URL"
                  aria-label="Reference image URL"
                />
              )}
              {!showUrlInput && !imagePreview && !referenceImageUrl && (
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
              className={`${styles.modeButton} ${generationType === "video" ? styles.modeButtonActive : ""}`}
              title="Video mode"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Link>
            <Link
              href={`/routes/${projectId}/canvas`}
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
    </div>
  );
}
