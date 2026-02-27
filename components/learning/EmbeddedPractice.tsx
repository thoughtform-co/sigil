"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { PracticeBlock } from "@/lib/learning/types";
import type { ModelItem } from "@/components/generation/types";
import styles from "@/app/journeys/[id]/lessons/[lessonId]/LessonPage.module.css";

type GenerationResult = {
  id: string;
  status: string;
  outputs: { id: string; fileUrl: string; fileType: string }[];
};

const jsonFetcher = <T,>(url: string): Promise<T> =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
    return r.json() as Promise<T>;
  });

export function EmbeddedPractice({
  block,
  journeyId,
}: {
  block: PracticeBlock;
  journeyId: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [modelId, setModelId] = useState("");

  const { data: modelsData } = useSWR<{ models: ModelItem[] }>(
    `/api/models?type=${block.targetSessionType ?? "image"}`,
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );
  const models = modelsData?.models ?? [];

  useEffect(() => {
    if (models.length > 0 && !modelId) {
      setModelId(models[0].id);
    }
  }, [models, modelId]);

  const submit = useCallback(async () => {
    if (!prompt.trim() || !modelId) return;
    setBusy(true);
    setMessage(null);
    setResult(null);

    try {
      let sessionId: string | undefined;

      if (block.targetRouteId) {
        const sessRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: block.targetRouteId,
            name: `Practice — ${block.instruction.slice(0, 40)}`,
            type: block.targetSessionType ?? "image",
          }),
        });
        const sessData = (await sessRes.json()) as { session?: { id: string }; error?: string };
        if (!sessRes.ok) throw new Error(sessData.error ?? "Failed to create session");
        sessionId = sessData.session?.id;
      }

      if (!sessionId) {
        const projectsRes = await fetch("/api/projects", { cache: "no-store" });
        const projectsData = (await projectsRes.json()) as {
          projects: { id: string; name: string }[];
        };
        const firstProject = projectsData.projects[0];
        if (!firstProject) throw new Error("No route available for practice generation");

        const sessRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: firstProject.id,
            name: `Practice — ${block.instruction.slice(0, 40)}`,
            type: block.targetSessionType ?? "image",
          }),
        });
        const sessData = (await sessRes.json()) as { session?: { id: string }; error?: string };
        if (!sessRes.ok) throw new Error(sessData.error ?? "Failed to create session");
        sessionId = sessData.session?.id;
      }

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          modelId,
          prompt: prompt.trim(),
          parameters: { aspectRatio: "1:1", resolution: 2048, numOutputs: 1 },
        }),
      });
      const genData = (await genRes.json()) as { generation?: { id: string }; error?: string };
      if (!genRes.ok) throw new Error(genData.error ?? "Generation failed");

      setMessage("Generation queued — processing...");

      if (genData.generation) {
        pollGeneration(genData.generation.id);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setBusy(false);
    }
  }, [prompt, modelId, block]);

  function pollGeneration(generationId: string) {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/generations?limit=1&cursor=`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { generations: GenerationResult[] };
        const gen = data.generations.find((g) => g.id === generationId);
        if (gen) {
          if (gen.status === "completed" || gen.status === "failed") {
            setResult(gen);
            setMessage(gen.status === "completed" ? "Generation complete" : "Generation failed");
            return;
          }
        }
      } catch {
        // continue polling
      }
      if (attempts < 30) {
        setTimeout(poll, 3000);
      } else {
        setMessage("Generation is still processing. Check your route workspace.");
      }
    };
    setTimeout(poll, 3000);
  }

  return (
    <div className={styles.practiceBlock}>
      <span className={styles.practiceCornerTL} />
      <span className={styles.practiceCornerBR} />
      <div className={styles.practiceLabel}>Exercise</div>
      <div className={styles.practiceInstruction}>{block.instruction}</div>
      {block.hint && <div className={styles.practiceHint}>{block.hint}</div>}

      {/* Compact prompt bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <textarea
          className="sigil-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Write your prompt here..."
          rows={3}
          style={{ fontSize: "13px", lineHeight: "1.6" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          {models.length > 0 && (
            <select
              className="sigil-select"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              style={{ fontSize: "10px", maxWidth: "200px" }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          <div style={{ flex: 1 }} />

          <button
            type="button"
            className="sigil-btn-primary"
            disabled={busy || !prompt.trim()}
            onClick={() => void submit()}
            style={{ fontSize: "10px", letterSpacing: "0.1em" }}
          >
            {busy ? "generating..." : "generate"}
          </button>
        </div>

        {message && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.06em",
              color: "var(--dawn-40)",
              marginTop: "var(--space-xs)",
            }}
          >
            {message}
          </div>
        )}

        {/* Result preview */}
        {result && result.outputs.length > 0 && (
          <div style={{ marginTop: "var(--space-md)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "var(--space-sm)",
              }}
            >
              {result.outputs.map((output) => (
                <div
                  key={output.id}
                  style={{
                    aspectRatio: "1",
                    backgroundImage: `url(${output.fileUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid var(--dawn-08)",
                    backgroundColor: "var(--surface-0)",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-sm)" }}>
              <Link
                href={block.targetRouteId ? `/routes/${block.targetRouteId}/image` : `/journeys/${journeyId}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  textDecoration: "none",
                }}
              >
                View in creation suite &rarr;
              </Link>
              {!block.targetRouteId && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    color: "var(--dawn-50)",
                  }}
                >
                  (saved to your default route workspace)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
