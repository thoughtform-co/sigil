"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GenerationItem, GenerationType, ModelItem, SessionItem } from "@/components/generation/types";
import { useGenerationsRealtime } from "@/hooks/useGenerationsRealtime";
import { ForgeSidebar } from "@/components/generation/ForgeSidebar";
import { ForgeGallery } from "@/components/generation/ForgeGallery";
import { ForgePromptBar } from "@/components/generation/ForgePromptBar";
import { ForgeCostTicker } from "@/components/generation/ForgeCostTicker";
import { BrainstormPanel } from "@/components/generation/BrainstormPanel";
import { ConvertToVideoModal } from "@/components/generation/ConvertToVideoModal";
import styles from "./ProjectWorkspace.module.css";

export function ProjectWorkspace({ projectId, mode }: { projectId: string; mode: GenerationType }) {
  const searchParams = useSearchParams();
  const [models, setModels] = useState<ModelItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("4096");
  const [numOutputs, setNumOutputs] = useState("1");
  const [duration, setDuration] = useState("5");
  const [modelId, setModelId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [brainstormOpen, setBrainstormOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertOutputId, setConvertOutputId] = useState<string | null>(null);
  const [convertImageUrl, setConvertImageUrl] = useState<string | null>(null);

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
      const response = await fetch(`/api/models?type=${mode}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { models: ModelItem[] };
      setModels(data.models);
      const storageKey = `sigil:lastModel:${projectId}:${mode}`;
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
      const storedValid = stored && data.models.some((m) => m.id === stored);
      setModelId((prev) => {
        if (prev && data.models.some((m) => m.id === prev)) return prev;
        return storedValid ? stored! : data.models[0]?.id ?? "";
      });
    }
    void loadModels();
  }, [mode, projectId]);

  const sessionsFiltered = useMemo(
    () => sessions.filter((s) => s.type === mode),
    [sessions, mode],
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
    const filtered = sessions.filter((s) => s.type === mode);
    if (filtered.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    const storageKey = `sigil:lastSession:${projectId}:${mode}`;
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
    const storedValid = stored && filtered.some((s) => s.id === stored);
    setSelectedSessionId((prev) => {
      const stillValid = prev && filtered.some((s) => s.id === prev);
      if (stillValid) return prev;
      return storedValid ? stored : filtered[0].id;
    });
  }, [sessions, mode, projectId]);

  useEffect(() => {
    if (!selectedSessionId) return;
    const storageKey = `sigil:lastSession:${projectId}:${mode}`;
    sessionStorage.setItem(storageKey, selectedSessionId);
  }, [selectedSessionId, projectId, mode]);

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

  const generationsVisible = generations;

  const sessionThumbnails = useMemo(() => {
    const thumbnails: Record<string, string> = {};

    for (const session of sessionsFiltered) {
      if (session.thumbnailUrl) {
        thumbnails[session.id] = session.thumbnailUrl;
      }
    }

    if (selectedSessionId) {
      const latestWithOutput = generations
        .filter((g) => g.outputs.length > 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const latestOutputUrl = latestWithOutput?.outputs[0]?.fileUrl;
      if (latestOutputUrl) {
        thumbnails[selectedSessionId] = latestOutputUrl;
      }
    }

    return thumbnails;
  }, [sessionsFiltered, selectedSessionId, generations]);

  async function handleDismissGeneration(generationId: string) {
    try {
      const response = await fetch(`/api/generations/${generationId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to dismiss");
      }
      setGenerations((prev) => prev.filter((g) => g.id !== generationId));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to dismiss generation");
    }
  }

  function handleConvertToVideo(outputId: string, imageUrl: string) {
    setConvertOutputId(outputId);
    setConvertImageUrl(imageUrl);
    setConvertModalOpen(true);
  }

  function closeConvertModal() {
    setConvertModalOpen(false);
    setConvertOutputId(null);
    setConvertImageUrl(null);
  }

  useEffect(() => {
    if (mode !== "video") return;
    const ref = searchParams.get("ref");
    if (ref != null && ref !== "") setReferenceImageUrl(ref);
  }, [mode, searchParams]);

  const compatibleModels = useMemo(
    () => models.filter((m) => m.type === mode),
    [models, mode],
  );

  useEffect(() => {
    if (!compatibleModels.length) return;
    if (compatibleModels.some((m) => m.id === modelId)) return;
    setModelId(compatibleModels[0].id);
  }, [compatibleModels, modelId]);

  useEffect(() => {
    if (!modelId) return;
    const storageKey = `sigil:lastModel:${projectId}:${mode}`;
    sessionStorage.setItem(storageKey, modelId);
  }, [modelId, projectId, mode]);

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
      setSelectedSessionId(created.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setBusy(false);
    }
  }

  async function submitGeneration() {
    if (!prompt.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      let sessionId = selectedSessionId;
      if (!sessionId) {
        const sessionResponse = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: `${mode === "image" ? "Image" : "Video"} Session ${sessions.length + 1}`,
            type: mode,
          }),
        });
        const sessionData = (await sessionResponse.json()) as { session?: SessionItem; error?: string };
        if (!sessionResponse.ok) throw new Error(sessionData.error ?? "Failed to create session");
        const created = sessionData.session!;
        setSessions((prev) => [created, ...prev]);
        setSelectedSessionId(created.id);
        sessionId = created.id;
      }

      let resolvedReferenceUrl = referenceImageUrl.trim() || undefined;
      if (resolvedReferenceUrl && resolvedReferenceUrl.startsWith("data:")) {
        const uploadRes = await fetch("/api/upload/reference-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: resolvedReferenceUrl,
            projectId: projectId || undefined,
          }),
        });
        if (!uploadRes.ok) {
          const uploadData = (await uploadRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(uploadData.error ?? "Reference image upload failed");
        }
        const uploadData = (await uploadRes.json()) as { url?: string; referenceImageUrl?: string };
        resolvedReferenceUrl = uploadData.referenceImageUrl ?? uploadData.url ?? resolvedReferenceUrl;
      }

      const parameters: Record<string, unknown> = {
        aspectRatio,
        resolution: Number(resolution),
        numOutputs: Number(numOutputs),
        duration: Number(duration),
      };
      if (resolvedReferenceUrl) parameters.referenceImageUrl = resolvedReferenceUrl;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
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
      const refresh = await fetch(`/api/generations?sessionId=${sessionId}`, {
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
      const nextOfMode = remaining.find((s) => s.type === mode);
      setSelectedSessionId(nextOfMode?.id ?? null);
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
          mode={mode}
          sessionThumbnails={sessionThumbnails}
          busy={busy}
        />
        <div className={styles.main}>
          <ForgeCostTicker />
          <ForgeGallery
            generations={generationsVisible}
            onRetry={retryGeneration}
            onReuse={reuseGeneration}
            onRerun={retryGeneration}
            onConvertToVideo={handleConvertToVideo}
            onUseAsReference={setReferenceImageUrl}
            onDismiss={handleDismissGeneration}
            onApprove={toggleApproveOutput}
            busy={busy}
          />
        </div>
      </div>
      <ForgePromptBar
        projectId={projectId}
        generationType={mode}
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
        brainstormOpen={brainstormOpen}
        onBrainstormToggle={() => setBrainstormOpen((v) => !v)}
      />
      {brainstormOpen && (
        <BrainstormPanel
          projectId={projectId}
          onSendPrompt={setPrompt}
          onClose={() => setBrainstormOpen(false)}
        />
      )}
      {convertModalOpen && convertOutputId && convertImageUrl && (
        <ConvertToVideoModal
          projectId={projectId}
          outputId={convertOutputId}
          imageUrl={convertImageUrl}
          open={convertModalOpen}
          onClose={closeConvertModal}
          onSuccess={() => {
            closeConvertModal();
          }}
        />
      )}
    </div>
  );
}
