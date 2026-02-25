"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GenerationItem, GenerationType, ModelItem, SessionItem } from "@/components/generation/types";
import { useGenerationsRealtime } from "@/hooks/useGenerationsRealtime";
import { ForgeSidebar } from "@/components/generation/ForgeSidebar";
import { ForgeGallery } from "@/components/generation/ForgeGallery";
import { ForgePromptBar } from "@/components/generation/ForgePromptBar";

import { BrainstormPanel } from "@/components/generation/BrainstormPanel";
import { ConvertToVideoModal } from "@/components/generation/ConvertToVideoModal";
import { CanvasSidebar } from "@/components/canvas/CanvasSidebar";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import type { WorkflowItem } from "@/components/canvas/types";
import type { Node, Edge, Viewport } from "@xyflow/react";
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

  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (mode !== "canvas") return;
    async function loadWorkflows() {
      const response = await fetch(`/api/workflows?projectId=${projectId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { workflows: WorkflowItem[] };
      setWorkflows(data.workflows);
    }
    void loadWorkflows();
  }, [projectId, mode]);

  useEffect(() => {
    if (mode !== "canvas" || !selectedWorkflowId) {
      setSelectedWorkflow(null);
      return;
    }
    const w = workflows.find((wf) => wf.id === selectedWorkflowId);
    setSelectedWorkflow(w ?? null);
  }, [mode, selectedWorkflowId, workflows]);

  useEffect(() => {
    const filtered = sessions.filter((s) => s.type === mode);
    if (filtered.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    const urlSession = searchParams.get("session");
    const urlSessionValid = urlSession && filtered.some((s) => s.id === urlSession);
    const storageKey = `sigil:lastSession:${projectId}:${mode}`;
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
    const storedValid = stored && filtered.some((s) => s.id === stored);
    setSelectedSessionId((prev) => {
      if (urlSessionValid) return urlSession;
      const stillValid = prev && filtered.some((s) => s.id === prev);
      if (stillValid) return prev;
      return storedValid ? stored : filtered[0].id;
    });
  }, [sessions, mode, projectId, searchParams]);

  useEffect(() => {
    if (!selectedSessionId) return;
    const storageKey = `sigil:lastSession:${projectId}:${mode}`;
    sessionStorage.setItem(storageKey, selectedSessionId);
  }, [selectedSessionId, projectId, mode]);

  useEffect(() => {
    async function loadGenerations() {
      if (mode === "canvas") return;
      const response = await fetch(`/api/generations?projectId=${projectId}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { generations: GenerationItem[] };
      setGenerations(data.generations);
    }
    void loadGenerations();
  }, [projectId, mode]);

  useGenerationsRealtime(selectedSessionId, setGenerations);

  useEffect(() => {
    if (mode === "canvas" || !projectId) return;
    const hasProcessing = generations.some(
      (g) => g.status === "processing" || g.status === "processing_locked",
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      void (async () => {
        const response = await fetch(`/api/generations?projectId=${projectId}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { generations: GenerationItem[] };
        setGenerations(data.generations);
      })();
    }, 10000);
    return () => clearInterval(interval);
  }, [generations, projectId, mode]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const generationsVisible = useMemo(() => {
    const modeSessionIds = new Set(sessionsFiltered.map((s) => s.id));
    return generations.filter((g) => !g.sessionId || modeSessionIds.has(g.sessionId));
  }, [generations, sessionsFiltered]);

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

  const [convertGenMeta, setConvertGenMeta] = useState<{
    generationId: string;
    modelId: string;
    createdAt: string;
    status: string;
  } | null>(null);

  function handleConvertToVideo(outputId: string, imageUrl: string, genMeta?: { generationId: string; modelId: string; createdAt: string; status: string }) {
    setConvertOutputId(outputId);
    setConvertImageUrl(imageUrl);
    setConvertGenMeta(genMeta ?? null);
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
      if (resolvedReferenceUrl && (resolvedReferenceUrl.startsWith("data:") || resolvedReferenceUrl.startsWith("blob:"))) {
        const compressedDataUrl = await compressImage(resolvedReferenceUrl, { maxDim: 2048, maxSizeMB: 4, quality: 0.85 });
        if (compressedDataUrl) {
          const uploadRes = await fetch("/api/upload/reference-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: compressedDataUrl, projectId: projectId || undefined }),
          });
          const ct = uploadRes.headers.get("content-type") ?? "";
          if (!ct.includes("application/json")) {
            const text = await uploadRes.text();
            throw new Error(`Upload returned non-JSON (${uploadRes.status}): ${text.slice(0, 120)}`);
          }
          const uploadData = (await uploadRes.json()) as { url?: string; referenceImageUrl?: string; error?: string };
          if (!uploadRes.ok) throw new Error(uploadData.error ?? "Reference image upload failed");
          resolvedReferenceUrl = uploadData.referenceImageUrl ?? uploadData.url ?? resolvedReferenceUrl;
        }
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
      const genCt = response.headers.get("content-type") ?? "";
      if (!genCt.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Generate returned non-JSON (${response.status}): ${text.slice(0, 120)}`);
      }
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

  const morphIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (morphIntervalRef.current) clearInterval(morphIntervalRef.current);
    };
  }, []);

  async function compressImage(
    src: string,
    opts: { maxDim?: number; maxSizeMB?: number; quality?: number } = {},
  ): Promise<string | undefined> {
    const { maxDim = 1024, maxSizeMB = 2, quality: initQuality = 0.82 } = opts;
    if (!src || (!src.startsWith("data:") && !src.startsWith("blob:") && !src.startsWith("http"))) return undefined;
    try {
      const res = await fetch(src);
      if (!res.ok) return undefined;
      const blob = await res.blob();
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = maxDim / Math.max(width, height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = initQuality;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      const approxMB = (s: string) => Math.floor(((s.split(",")[1] || "").length * 3) / 4) / (1024 * 1024);
      let attempts = 0;
      while (approxMB(dataUrl) > maxSizeMB && attempts < 4 && quality > 0.5) {
        quality = Math.max(0.5, quality - 0.1);
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        attempts++;
      }
      if (approxMB(dataUrl) > maxSizeMB) return undefined;
      return dataUrl;
    } catch {
      return undefined;
    }
  }

  async function enhancePrompt() {
    if (!prompt.trim() || !modelId) return;
    setEnhancing(true);
    setMessage(null);
    const originalPrompt = prompt;
    try {
      const imageData = referenceImageUrl.trim()
        ? await compressImage(referenceImageUrl.trim(), { maxDim: 1024, maxSizeMB: 2, quality: 0.8 })
        : undefined;

      const response = await fetch("/api/prompts/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelId,
          referenceImageUrl: imageData,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { enhancedPrompt?: string; error?: unknown };
      if (!response.ok) {
        const errStr = typeof data.error === "string" ? data.error : JSON.stringify(data.error) || "Failed to enhance prompt";
        throw new Error(errStr);
      }
      if (typeof data.enhancedPrompt === "string" && data.enhancedPrompt.trim()) {
        const enhanced = data.enhancedPrompt.trim();
        const GLITCH = "░▒▓█▄▀■□▪▫●○◆◇";
        const steps = 45;
        const duration = 1400;
        let step = 0;

        if (morphIntervalRef.current) clearInterval(morphIntervalRef.current);
        morphIntervalRef.current = setInterval(() => {
          step++;
          const progress = Math.min(step / steps, 1);
          const chars = enhanced.split("");
          const orig = originalPrompt.split("");
          const maxLen = Math.max(chars.length, orig.length);
          const result: string[] = [];

          for (let i = 0; i < maxLen; i++) {
            const ec = chars[i] ?? "";
            const oc = orig[i] ?? "";
            const cp = Math.max(0, Math.min(1, progress * 1.5 - (i / maxLen) * 0.5));
            if (cp < 0.2) result.push(oc);
            else if (cp < 0.4) result.push(Math.random() < 0.6 ? GLITCH[Math.floor(Math.random() * GLITCH.length)] : oc);
            else if (cp < 0.7) result.push(Math.random() < 0.7 ? GLITCH[Math.floor(Math.random() * GLITCH.length)] : Math.random() < 0.5 ? ec : oc);
            else if (cp < 0.9) result.push(Math.random() < 0.25 ? GLITCH[Math.floor(Math.random() * GLITCH.length)] : ec);
            else result.push(ec);
          }

          setPrompt(result.join(""));

          if (progress >= 1) {
            if (morphIntervalRef.current) clearInterval(morphIntervalRef.current);
            morphIntervalRef.current = null;
            setPrompt(enhanced);
            setMessage("Prompt enhanced.");
            setEnhancing(false);
          }
        }, duration / steps);
        return;
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to enhance prompt");
    }
    setEnhancing(false);
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

  async function createWorkflow() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await response.json()) as { workflow?: WorkflowItem; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create workflow");
      const created = data.workflow!;
      setWorkflows((prev) => [created, ...prev]);
      setSelectedWorkflowId(created.id);
      setSelectedWorkflow(created);
      setMessage("Workflow created.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create workflow");
    } finally {
      setBusy(false);
    }
  }

  async function deleteWorkflow(workflowId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete workflow");
      const remaining = workflows.filter((w) => w.id !== workflowId);
      setWorkflows(remaining);
      setSelectedWorkflowId(remaining[0]?.id ?? null);
      setSelectedWorkflow(remaining[0] ?? null);
      setMessage("Workflow deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete workflow");
    } finally {
      setBusy(false);
    }
  }

  const handleCanvasGraphChange = useCallback(
    (nodes: Node[], edges: Edge[], viewport: Viewport) => {
      if (!selectedWorkflowId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        void fetch(`/api/workflows/${selectedWorkflowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            graphData: { nodes, edges, viewport },
          }),
        });
      }, 800);
    },
    [selectedWorkflowId],
  );

  const canvasInitialNodes = useMemo((): Node[] => {
    const g = selectedWorkflow?.graphData;
    if (!g || !Array.isArray(g.nodes)) return [];
    return g.nodes as Node[];
  }, [selectedWorkflow?.graphData]);

  const canvasInitialEdges = useMemo((): Edge[] => {
    const g = selectedWorkflow?.graphData;
    if (!g || !Array.isArray(g.edges)) return [];
    return g.edges as Edge[];
  }, [selectedWorkflow?.graphData]);

  const canvasInitialViewport = useMemo((): Viewport | undefined => {
    const g = selectedWorkflow?.graphData as { viewport?: Viewport } | undefined;
    return g?.viewport;
  }, [selectedWorkflow?.graphData]);

  if (mode === "canvas") {
    return (
      <div className={`${styles.container} ${styles.containerCanvas}`}>
        <div className={styles.body}>
          <CanvasSidebar
            projectId={projectId}
            projectName={projectName}
            workflows={workflows}
            activeWorkflowId={selectedWorkflowId}
            onWorkflowSelect={setSelectedWorkflowId}
            onWorkflowCreate={createWorkflow}
            onWorkflowDelete={deleteWorkflow}
            busy={busy}
          />
          <div className={styles.main}>
            <CanvasWorkspace
              projectId={projectId}
              workflowId={selectedWorkflowId}
              workflowName={selectedWorkflow?.name ?? ""}
              initialNodes={canvasInitialNodes}
              initialEdges={canvasInitialEdges}
              initialViewport={canvasInitialViewport}
              onGraphChange={handleCanvasGraphChange}
            />
          </div>
        </div>
        <div className={styles.canvasPromptBarWrap}>
          <ForgePromptBar
            projectId={projectId}
            generationType="canvas"
            minimal
            brainstormOpen={brainstormOpen}
            onBrainstormToggle={() => setBrainstormOpen((v) => !v)}
          />
        </div>
        {brainstormOpen && (
          <BrainstormPanel
            projectId={projectId}
            onSendPrompt={setPrompt}
            onClose={() => setBrainstormOpen(false)}
          />
        )}
      </div>
    );
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
          sourceGenerationId={convertGenMeta?.generationId}
          sourceModelId={convertGenMeta?.modelId}
          sourceCreatedAt={convertGenMeta?.createdAt}
          sourceStatus={convertGenMeta?.status}
        />
      )}
    </div>
  );
}
