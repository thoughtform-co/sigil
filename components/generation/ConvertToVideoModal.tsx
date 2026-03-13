"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { SessionItem } from "@/components/generation/types";
import type { ModelItem } from "@/components/generation/types";
import { useVideoIterations } from "@/hooks/useVideoIterations";
import { ImageBrowseModal } from "@/components/generation/ImageBrowseModal";
import styles from "./ConvertToVideoModal.module.css";

type VideoModelSpec = {
  aspectRatios: string[];
  resolutions: { value: string; label: string }[];
  durations: string[];
  supportsEndFrame?: boolean;
};

const VIDEO_MODEL_SPECS: Record<string, VideoModelSpec> = {
  "gemini-veo-3.1": {
    aspectRatios: ["16:9", "9:16"],
    resolutions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
      { value: "4k", label: "4K" },
    ],
    durations: ["4", "6", "8"],
    supportsEndFrame: true,
  },
  "veo-3.1": {
    aspectRatios: ["16:9", "9:16"],
    resolutions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
      { value: "4k", label: "4K" },
    ],
    durations: ["4", "6", "8"],
    supportsEndFrame: true,
  },
  "kling-2.6": {
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: [{ value: "1080p", label: "1080p" }],
    durations: ["5", "10"],
    supportsEndFrame: false,
  },
  "kling-official": {
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: [{ value: "1080p", label: "1080p" }],
    durations: ["5", "10"],
    supportsEndFrame: true,
  },
  "replicate-kling-2.6": {
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: [{ value: "1080p", label: "1080p" }],
    durations: ["5", "10"],
    supportsEndFrame: false,
  },
};

const DEFAULT_SPEC: VideoModelSpec = {
  aspectRatios: ["16:9", "9:16", "1:1"],
  resolutions: [{ value: "720p", label: "720p" }],
  durations: ["5", "10"],
};

type ConvertToVideoModalProps = {
  projectId: string;
  outputId: string;
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  sourceGenerationId?: string;
  sourceModelId?: string;
  sourceCreatedAt?: string;
  sourceStatus?: string;
};

function iterationStatusLabel(status: string): string {
  switch (status) {
    case "processing":
    case "processing_locked":
      return "Processing…";
    case "completed":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function ConvertToVideoModal({
  projectId,
  outputId,
  imageUrl,
  open,
  onClose,
  sourceGenerationId,
  sourceModelId,
  sourceCreatedAt,
  sourceStatus,
}: ConvertToVideoModalProps) {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState("5");
  const [sessionMode, setSessionMode] = useState<"existing" | "new">("existing");
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionName, setSessionName] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [endFrameUrl, setEndFrameUrl] = useState<string | null>(null);
  const [endFrameFile, setEndFrameFile] = useState<File | null>(null);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<string | null>(null);
  const [sourceOrientation, setSourceOrientation] = useState<"landscape" | "portrait" | "square">("landscape");
  const [showEndFrameMenu, setShowEndFrameMenu] = useState(false);
  const [endFrameBrowseOpen, setEndFrameBrowseOpen] = useState(false);
  const endFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameMenuRef = useRef<HTMLDivElement>(null);

  const spec = useMemo(() => VIDEO_MODEL_SPECS[modelId] ?? DEFAULT_SPEC, [modelId]);

  useEffect(() => {
    if (!spec.aspectRatios.includes(aspectRatio)) setAspectRatio(spec.aspectRatios[0]);
    if (!spec.resolutions.some((r) => r.value === resolution)) setResolution(spec.resolutions[0].value);
    if (!spec.durations.includes(duration)) setDuration(spec.durations[0]);
  }, [spec, aspectRatio, resolution, duration]);

  useEffect(() => {
    if (!spec.supportsEndFrame) setEndFrameUrl(null);
  }, [spec.supportsEndFrame]);

  const { iterations, loading: iterationsLoading, refetch } = useVideoIterations(open ? outputId : null);

  useEffect(() => {
    if (!open || !projectId) return;
    setSessionsLoading(true);
    fetch(`/api/sessions?projectId=${projectId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { sessions?: SessionItem[] }) => {
        const list = data.sessions ?? [];
        const videoSessions = list.filter((s) => s.type === "video");
        setSessions(videoSessions);
        if (videoSessions.length > 0) {
          setSessionMode("existing");
          setSessionId((prev) => prev || videoSessions[0].id);
        } else {
          setSessionMode("new");
          setSessionId("");
        }
      })
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    setModelsLoading(true);
    fetch("/api/models?type=video", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { models?: ModelItem[] }) => {
        const list = data.models ?? [];
        setModels(list);
        setModelId((prev) => {
          if (!prev) return list[0]?.id ?? "";
          return list.some((m) => m.id === prev) ? prev : list[0]?.id ?? "";
        });
      })
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !imageUrl) return;
    const img = new window.Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      setSourceOrientation(ratio < 0.95 ? "portrait" : ratio > 1.05 ? "landscape" : "square");

      if (!modelId.includes("kling")) {
        setDetectedAspectRatio(null);
        return;
      }
      const known = [
        { label: "16:9", value: 16 / 9 },
        { label: "9:16", value: 9 / 16 },
        { label: "1:1", value: 1 },
        { label: "4:3", value: 4 / 3 },
        { label: "3:4", value: 3 / 4 },
      ];
      let closest = known[0];
      let minDiff = Math.abs(ratio - closest.value);
      for (const r of known) {
        const diff = Math.abs(ratio - r.value);
        if (diff < minDiff) {
          closest = r;
          minDiff = diff;
        }
      }
      setDetectedAspectRatio(closest.label);
    };
    img.onerror = () => {
      setDetectedAspectRatio(null);
      setSourceOrientation("landscape");
    };
    img.src = imageUrl;
  }, [open, modelId, imageUrl]);

  const handleEndFrameUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      setEndFrameUrl(blobUrl);
      setEndFrameFile(file);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (projectId) formData.append("projectId", projectId);
        const res = await fetch("/api/upload/reference-image", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as { referenceImageUrl?: string; url?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        const stableUrl = data.referenceImageUrl ?? data.url;
        if (stableUrl) {
          URL.revokeObjectURL(blobUrl);
          setEndFrameUrl(stableUrl);
          setEndFrameFile(null);
        }
      } catch {
        setMessage("End frame upload failed; will send as data when generating.");
      }
      if (e.target) e.target.value = "";
    },
    [projectId]
  );

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

  const handleEndFrameBrowseSelect = useCallback((url: string) => {
    setEndFrameUrl(url);
    setEndFrameFile(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !modelId) {
      setMessage("Prompt and model are required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      let targetSessionId = sessionId;
      if (sessionMode === "new") {
        const name = sessionName.trim() || `Video Session ${sessions.length + 1}`;
        const sessionRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, name, type: "video" }),
        });
        const sessionData = (await sessionRes.json()) as { session?: SessionItem; error?: string };
        if (!sessionRes.ok) throw new Error(sessionData.error ?? "Failed to create session");
        targetSessionId = sessionData.session!.id;
      } else if (!targetSessionId) {
        throw new Error("Please select a target video session.");
      }

      const parameters: Record<string, unknown> = {
        aspectRatio,
        resolution,
        duration: Number(duration),
        referenceImageUrl: imageUrl,
        sourceOutputId: outputId,
        referenceImageId: outputId,
      };

      if (endFrameUrl && endFrameUrl.startsWith("http")) {
        parameters.endFrameImageUrl = endFrameUrl;
      } else if (endFrameFile) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read end frame"));
          reader.readAsDataURL(endFrameFile);
        });
        parameters.endFrameImageUrl = dataUrl;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: targetSessionId,
          modelId,
          prompt: prompt.trim(),
          parameters,
        }),
      });
      const data = (await res.json()) as { generation?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit generation");
      setMessage("Generation queued.");
      await refetch();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }, [
    prompt,
    modelId,
    sessionId,
    sessionName,
    sessions.length,
    aspectRatio,
    resolution,
    duration,
    imageUrl,
    outputId,
    projectId,
    sessionMode,
    endFrameUrl,
    endFrameFile,
    refetch,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const panel = (
    <div
      className={styles.backdrop}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-modal-title"
        data-source-orientation={sourceOrientation}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Telemetry bar */}
        <header className={styles.telemetryBar} id="convert-modal-title">
          <div className={styles.telemetryMeta}>
            <span className={styles.telemetryBrand}>SIGIL FORGE</span>
            <span className={styles.telemetryLabel}>
              MODE: <span className={styles.telemetryValue}>IMG→VID</span>
            </span>
            {sourceGenerationId && (
              <span className={styles.telemetryLabel}>
                ID: <span className={styles.telemetryValue}>{sourceGenerationId.slice(0, 8).toUpperCase()}</span>
              </span>
            )}
            {sourceModelId && (
              <span className={styles.telemetryLabel}>
                SRC: <span className={styles.telemetryValue}>{sourceModelId.toUpperCase()}</span>
              </span>
            )}
            {sourceCreatedAt && (
              <span className={styles.telemetryLabel}>
                DATE: <span className={styles.telemetryValue}>
                  {new Date(sourceCreatedAt).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }).toUpperCase()}
                </span>
              </span>
            )}
            {sourceStatus && (
              <span className={styles.telemetryLabel}>
                SIG: <span className={styles.telemetryValue}>{sourceStatus.toUpperCase()}</span>
              </span>
            )}
          </div>
          <div className={styles.closeSlot}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {/* Left: start + end frames side-by-side, then session, prompt, params */}
          <div className={styles.formSection}>
            {/* Start and End frames — equal side-by-side */}
            <div className={styles.framesRow}>
              <div className={styles.frameCard}>
                <span className={styles.frameLabel}>START FRAME</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Start frame" className={styles.frameImg} />
              </div>
              {spec.supportsEndFrame && (
                !endFrameUrl ? (
                  <div className={`${styles.endFrameCard} ${styles.endFrameCardEmpty}`} ref={endFrameMenuRef}>
                    <button
                      type="button"
                      className={styles.endFrameAddBtn}
                      onClick={() => setShowEndFrameMenu(!showEndFrameMenu)}
                      disabled={busy}
                    >
                      + End frame
                    </button>
                    {showEndFrameMenu && (
                      <div className={styles.endFrameMenu}>
                        <button
                          type="button"
                          className={styles.endFrameMenuOption}
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
                          className={styles.endFrameMenuOption}
                          onClick={() => {
                            setShowEndFrameMenu(false);
                            setEndFrameBrowseOpen(true);
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
                ) : (
                  <div className={styles.endFrameCard}>
                    <span className={styles.endFrameLabel}>END FRAME</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={endFrameUrl} alt="End frame" className={styles.endFrameThumb} />
                    <button
                      type="button"
                      className={styles.endFrameRemove}
                      onClick={() => {
                        setEndFrameUrl(null);
                        setEndFrameFile(null);
                      }}
                      aria-label="Remove end frame"
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
            <input
              ref={endFrameInputRef}
              type="file"
              accept="image/*"
              onChange={handleEndFrameUpload}
              style={{ display: "none" }}
            />

            {/* Session — before prompt, like Vesper (label + toggle inline) */}
            <div className={styles.sessionHeader}>
              <label className={styles.label}>Target video session</label>
              <div className={styles.sessionModeRow}>
                <button
                  type="button"
                  className={`${styles.sessionModeBtn} ${sessionMode === "existing" ? styles.sessionModeActive : ""}`}
                  onClick={() => setSessionMode("existing")}
                  disabled={sessions.length === 0}
                >
                  Existing
                </button>
                <button
                  type="button"
                  className={`${styles.sessionModeBtn} ${sessionMode === "new" ? styles.sessionModeActive : ""}`}
                  onClick={() => setSessionMode("new")}
                >
                  + New
                </button>
              </div>
            </div>
            <div className={styles.sessionRow}>
              {sessionMode === "existing" ? (
                <select
                  className="sigil-select"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  disabled={busy || sessionsLoading || sessions.length === 0}
                  aria-label="Session"
                >
                  {sessions.length === 0 ? (
                    <option value="">No video sessions</option>
                  ) : (
                    sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <input
                  type="text"
                  className="sigil-input"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="New session name"
                  disabled={busy}
                  aria-label="New session name"
                />
              )}
            </div>

            {/* Generation settings label */}
            <label className={styles.label}>Generation settings</label>

            {/* Prompt + generate button row */}
            <div className={styles.promptRow}>
              <textarea
                className="sigil-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the motion…"
                rows={2}
                disabled={busy}
              />
              <button
                type="button"
                className={styles.generateBtn}
                onClick={() => void handleSubmit()}
                disabled={busy || !prompt.trim() || !modelId}
              >
                {busy ? "…" : "Generate"}
              </button>
            </div>

            {/* Model + aspect + duration — single compact row */}
            <div className={styles.paramsRow}>
              <select
                className={styles.paramSelect}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={busy || modelsLoading}
                aria-label="Model"
              >
                {models.length === 0 ? (
                  <option value="">No video models</option>
                ) : (
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.provider ? `(${m.provider})` : ""}
                    </option>
                  ))
                )}
              </select>
              {modelId.includes("kling") && detectedAspectRatio ? (
                <div className={styles.paramBadge} title="Kling follows the start frame aspect ratio">
                  Auto ({detectedAspectRatio})
                </div>
              ) : (
                <select
                  className={styles.paramSelect}
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  disabled={busy}
                  aria-label="Aspect ratio"
                >
                  {spec.aspectRatios.map((ar) => (
                    <option key={ar} value={ar}>{ar}</option>
                  ))}
                </select>
              )}
              {spec.resolutions.length > 1 && (
                <select
                  className={styles.paramSelect}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={busy}
                  aria-label="Resolution"
                >
                  {spec.resolutions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              )}
              <div className={styles.durationGroup} role="group" aria-label="Duration">
                {spec.durations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.durationBtn} ${duration === d ? styles.durationActive : ""}`}
                    onClick={() => setDuration(d)}
                    disabled={busy}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            {message && (
              <p className={styles.message} role="status">
                {message}
              </p>
            )}
          </div>

          {/* Right: iterations */}
          <div className={styles.iterationsSection}>
            <h3 className={styles.iterationsTitle}>
              Iterations
              {iterations.length > 0 && (
                <span className={styles.iterationsCount}>{iterations.length}</span>
              )}
            </h3>
            {iterationsLoading ? (
              <p className={styles.iterationsEmpty}>Loading…</p>
            ) : iterations.length === 0 ? (
              <div className={styles.iterationsEmptyState}>
                <div className={styles.iterationsEmptyIcon} aria-hidden>◈</div>
                <p className={styles.iterationsEmptyTitle}>No iterations yet</p>
                <p className={styles.iterationsEmpty}>
                  Enter a prompt and generate to create the first video iteration.
                </p>
              </div>
            ) : (
              <ul className={styles.iterationsList}>
                {iterations.map((it) => (
                  <li key={it.id} className={styles.iterationItem}>
                    <div className={styles.iterationMeta}>
                      <span className={styles.iterationStatus} data-status={it.status}>
                        {iterationStatusLabel(it.status)}
                      </span>
                      <span className={styles.iterationTime}>
                        {new Date(it.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {it.outputs[0]?.fileType?.startsWith("video") ? (
                      <video
                        src={it.outputs[0].fileUrl}
                        className={styles.iterationMedia}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : it.outputs[0]?.fileUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.outputs[0].fileUrl}
                        alt=""
                        className={styles.iterationMedia}
                      />
                    ) : (
                      <div className={styles.iterationPlaceholder}>
                        <span className={styles.iterationPlaceholderLabel}>
                          <span className={styles.iterationPlaceholderDot} />
                          Generating
                        </span>
                      </div>
                    )}
                    {it.prompt && (
                      <p className={styles.iterationPrompt}>{it.prompt}</p>
                    )}
                    <div className={styles.iterationReadouts}>
                      {it.modelId && (
                        <span className={styles.iterationReadout}>{it.modelId}</span>
                      )}
                      {typeof (it.parameters as Record<string, unknown>)?.duration === "number" && (
                        <span className={styles.iterationReadout}>
                          {String((it.parameters as Record<string, unknown>).duration)}s
                        </span>
                      )}
                      {typeof (it.parameters as Record<string, unknown>)?.aspectRatio === "string" && (
                        <span className={styles.iterationReadout}>
                          {String((it.parameters as Record<string, unknown>).aspectRatio)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(panel, document.body)}
      <ImageBrowseModal
        open={endFrameBrowseOpen}
        onClose={() => setEndFrameBrowseOpen(false)}
        onSelectImage={handleEndFrameBrowseSelect}
        projectId={projectId}
      />
    </>
  );
}
