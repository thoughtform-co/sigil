"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GenerationItem, GenerationType, ModelItem, SessionItem } from "@/components/generation/types";
import { useGenerationsRealtime } from "@/hooks/useGenerationsRealtime";
import { ForgeSidebar } from "@/components/generation/ForgeSidebar";
import { ForgeGallery } from "@/components/generation/ForgeGallery";
import { ForgePromptBar } from "@/components/generation/ForgePromptBar";
import { ForgeCostTicker } from "@/components/generation/ForgeCostTicker";
import { BrainstormPanel } from "@/components/generation/BrainstormPanel";
import styles from "./ProjectWorkspace.module.css";

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [generationType, setGenerationType] = useState<GenerationType>("image");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const lastActiveSessionByType = useRef<Record<GenerationType, string | null>>({ image: null, video: null });
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1024");
  const [numOutputs, setNumOutputs] = useState("1");
  const [duration, setDuration] = useState("5");
  const [modelId, setModelId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [dismissedGenerationIds, setDismissedGenerationIds] = useState<Set<string>>(() => new Set());
  const [brainstormOpen, setBrainstormOpen] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setIsNarrow(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    async function loadProject() {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { projects: Array<{ id: string; name: string }> };
      const found = data.projects.find((p) => p.id === projectId);
      if (found) setProjectName(found.name);
    }
    void loadProject();
  }, [projectId]);

  useEffect(() => {
    async function loadModels() {
      const response = await fetch("/api/models", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { models: ModelItem[] };
      setModels(data.models);
      setModelId((prev) => {
        if (prev || data.models.length === 0) return prev;
        const firstImage = data.models.find((m) => m.type === "image");
        return (firstImage || data.models[0]).id;
      });
    }
    void loadModels();
  }, []);

  const sessionsFiltered = useMemo(
    () => sessions.filter((s) => s.type === generationType),
    [sessions, generationType],
  );

  useEffect(() => {
    async function loadSessions() {
      const response = await fetch(`/api/sessions?projectId=${projectId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { sessions: SessionItem[] };
      setSessions(data.sessions);
    }
    void loadSessions();
  }, [projectId]);

  useEffect(() => {
    const filtered = sessions.filter((s) => s.type === generationType);
    if (filtered.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    const lastForType = lastActiveSessionByType.current[generationType];
    const validLast = lastForType && filtered.some((s) => s.id === lastForType);
    setSelectedSessionId((prev) => {
      const stillValid = prev && filtered.some((s) => s.id === prev);
      if (stillValid) return prev;
      return validLast ? lastForType : filtered[0].id;
    });
  }, [sessions, generationType]);

  useEffect(() => {
    async function loadGenerations() {
      if (!selectedSessionId) return;
      const response = await fetch(`/api/generations?sessionId=${selectedSessionId}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { generations: GenerationItem[] };
      setGenerations(data.generations);
    }
    void loadGenerations();
  }, [selectedSessionId]);

  useGenerationsRealtime(selectedSessionId, setGenerations);

  useEffect(() => {
    if (!selectedSessionId) return;
    const hasProcessing = generations.some(
      (g) => g.status === "processing" || g.status === "processing_locked",
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      void (async () => {
        const response = await fetch(`/api/generations?sessionId=${selectedSessionId}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { generations: GenerationItem[] };
        setGenerations(data.generations);
      })();
    }, 10000);
    return () => clearInterval(interval);
  }, [generations, selectedSessionId]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const generationsVisible = useMemo(
    () => generations.filter((g) => !dismissedGenerationIds.has(g.id)),
    [generations, dismissedGenerationIds],
  );

  function handleDismissGeneration(generationId: string) {
    setDismissedGenerationIds((prev) => new Set(prev).add(generationId));
  }

  function handleConvertToVideo(imageUrl: string) {
    setReferenceImageUrl(imageUrl);
    setGenerationType("video");
  }

  useEffect(() => {
    if (activeSession) {
      lastActiveSessionByType.current[activeSession.type as GenerationType] = activeSession.id;
    }
  }, [activeSession]);

  useEffect(() => {
    setDismissedGenerationIds(() => new Set());
  }, [selectedSessionId]);

  const compatibleModels = useMemo(() => {
    if (!activeSession) return models;
    return models.filter((m) => m.type === activeSession.type);
  }, [activeSession, models]);

  useEffect(() => {
    if (!compatibleModels.length) return;
    if (compatibleModels.some((m) => m.id === modelId)) return;
    setModelId(compatibleModels[0].id);
  }, [compatibleModels, modelId]);

  async function createSession(type: "image" | "video") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: `${type === "image" ? "Image" : "Video"} Session ${sessions.length + 1}`,
          type,
        }),
      });
      const data = (await response.json()) as { session?: SessionItem; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create session");
      const created = data.session!;
      setSessions((prev) => [created, ...prev]);
      setGenerationType(type);
      setSelectedSessionId(created.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setBusy(false);
    }
  }

  async function submitGeneration() {
    if (!selectedSessionId || !prompt.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const parameters: Record<string, unknown> = {
        aspectRatio,
        resolution: Number(resolution),
        numOutputs: Number(numOutputs),
        duration: Number(duration),
      };
      if (referenceImageUrl.trim()) parameters.referenceImageUrl = referenceImageUrl.trim();

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          modelId,
          prompt: prompt.trim(),
          parameters,
        }),
      });
      const data = (await response.json()) as { generation?: { id: string }; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to submit generation");
      setPrompt("");
      setReferenceImageUrl("");
      setMessage(data.generation ? `Generation queued: ${data.generation.id}` : "Generation queued.");
      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, {
        cache: "no-store",
      });
      if (refresh.ok) {
        const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
        setGenerations(refreshed.generations);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to submit generation");
    } finally {
      setBusy(false);
    }
  }

  async function enhancePrompt() {
    if (!prompt.trim() || !modelId) return;
    setEnhancing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/prompts/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelId,
          referenceImageUrl: referenceImageUrl.trim() || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { enhancedPrompt?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to enhance prompt");
      if (typeof data.enhancedPrompt === "string" && data.enhancedPrompt.trim()) {
        setPrompt(data.enhancedPrompt.trim());
        setMessage("Prompt enhanced.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to enhance prompt");
    } finally {
      setEnhancing(false);
    }
  }

  async function retryGeneration(generationId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/generations/${generationId}/retry`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to retry generation");
      setMessage(`Retry queued: ${generationId}`);
      if (!selectedSessionId) return;
      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, {
        cache: "no-store",
      });
      if (!refresh.ok) return;
      const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
      setGenerations(refreshed.generations);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to retry generation");
    } finally {
      setBusy(false);
    }
  }

  async function toggleApproveOutput(outputId: string, isApproved: boolean) {
    try {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to update output");
      if (!selectedSessionId) return;
      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, {
        cache: "no-store",
      });
      if (!refresh.ok) return;
      const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
      setGenerations(refreshed.generations);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update output");
    }
  }

  async function deleteOutput(outputId: string) {
    try {
      const response = await fetch(`/api/outputs/${outputId}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete output");
      if (!selectedSessionId) return;
      const refresh = await fetch(`/api/generations?sessionId=${selectedSessionId}`, {
        cache: "no-store",
      });
      if (!refresh.ok) return;
      const refreshed = (await refresh.json()) as { generations: GenerationItem[] };
      setGenerations(refreshed.generations);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete output");
    }
  }

  function reuseGeneration(generation: GenerationItem) {
    setPrompt(generation.prompt);
    setModelId(generation.modelId);
    const params = generation.parameters ?? {};
    if (typeof params.aspectRatio === "string") setAspectRatio(params.aspectRatio);
    if (typeof params.resolution === "number" || typeof params.resolution === "string")
      setResolution(String(params.resolution));
    if (typeof params.numOutputs === "number" || typeof params.numOutputs === "string")
      setNumOutputs(String(params.numOutputs));
    if (typeof params.duration === "number" || typeof params.duration === "string")
      setDuration(String(params.duration));
    if (typeof params.referenceImageUrl === "string") setReferenceImageUrl(params.referenceImageUrl);
    setMessage("Parameters loaded from previous generation.");
  }

  async function deleteSession(sessionId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete session");
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);
      setSelectedSessionId(remaining[0]?.id ?? null);
      setGenerations([]);
      setMessage("Session deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.body}>
        <ForgeSidebar
          projectId={projectId}
          projectName={projectName}
          sessions={sessionsFiltered}
          activeSessionId={selectedSessionId}
          onSessionSelect={setSelectedSessionId}
          onSessionCreate={createSession}
          onSessionDelete={deleteSession}
          generationType={generationType}
          busy={busy}
        />
        <div className={styles.main}>
          <ForgeCostTicker />
          <div className={styles.topBar}>
            <button
              type="button"
              className={`${styles.brainstormToggle} ${brainstormOpen ? styles.brainstormToggleActive : ""}`}
              onClick={() => setBrainstormOpen((v) => !v)}
              aria-label={brainstormOpen ? "Close brainstorm" : "Open brainstorm"}
            >
              Brainstorm
            </button>
          </div>
          <ForgeGallery
            generations={generationsVisible}
            onRetry={retryGeneration}
            onReuse={reuseGeneration}
            onRerun={retryGeneration}
            onConvertToVideo={handleConvertToVideo}
            onDismiss={handleDismissGeneration}
            onApprove={toggleApproveOutput}
            onDeleteOutput={deleteOutput}
            busy={busy}
          />
        </div>
        {brainstormOpen && !isNarrow && (
          <BrainstormPanel
            projectId={projectId}
            onSendPrompt={setPrompt}
            onClose={() => setBrainstormOpen(false)}
            variant="docked"
          />
        )}
      </div>
      <ForgePromptBar
        generationType={generationType}
        onGenerationTypeChange={setGenerationType}
        prompt={prompt}
        onPromptChange={setPrompt}
        referenceImageUrl={referenceImageUrl}
        onReferenceImageUrlChange={setReferenceImageUrl}
        modelId={modelId}
        onModelChange={setModelId}
        models={compatibleModels}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        resolution={resolution}
        onResolutionChange={setResolution}
        numOutputs={numOutputs}
        onNumOutputsChange={setNumOutputs}
        duration={duration}
        onDurationChange={setDuration}
        activeSessionName={activeSession?.name}
        hasSession={!!selectedSessionId}
        onSubmit={submitGeneration}
        onEnhance={enhancePrompt}
        busy={busy}
        enhancing={enhancing}
        message={message}
      />
      {brainstormOpen && isNarrow && (
        <BrainstormPanel
          projectId={projectId}
          onSendPrompt={setPrompt}
          onClose={() => setBrainstormOpen(false)}
          variant="floating"
        />
      )}
    </div>
  );
}
