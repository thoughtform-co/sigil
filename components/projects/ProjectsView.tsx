"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { HudPanel, HudPanelHeader, HudEmptyState } from "@/components/ui/hud";
import { Dialog } from "@/components/ui/Dialog";

type Project = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
};

export function ProjectsView() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load projects");
        }
        const data = (await response.json()) as { projects: Project[] };
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, []);

  async function createProject() {
    if (!newProjectName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: projectDescription.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create project");
      }

      const createdProject = payload.project as Project;
      setProjects((prev) => [createdProject, ...prev]);
      setNewProjectName("");
      setProjectDescription("");
      setDialogOpen(false);
      router.push(`/projects/${createdProject.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  const hasProjects = useMemo(() => projects.length > 0, [projects.length]);

  return (
    <section
      className="w-full max-w-[960px] animate-fade-in-up"
      style={{ paddingTop: "var(--space-2xl)" }}
    >
      <HudPanel>
        <HudPanelHeader
          title="generation projects"
          actions={
            <button
              type="button"
              className="sigil-btn-secondary"
              onClick={() => setDialogOpen(true)}
            >
              + new project
            </button>
          }
        />

        {error ? (
          <div
            className="mb-4"
            style={{
              padding: "10px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--status-error)",
              background: "rgba(193, 127, 89, 0.1)",
              border: "1px solid rgba(193, 127, 89, 0.2)",
            }}
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 py-12">
            <div
              style={{
                width: "6px",
                height: "6px",
                background: "var(--gold)",
                animation: "glowPulse 1.5s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--dawn-30)",
              }}
            >
              Loading projects...
            </span>
          </div>
        ) : hasProjects ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <ProjectCard
                  id={project.id}
                  name={project.name}
                  description={project.description ?? "No description"}
                  updatedAt={new Date(project.updatedAt).toLocaleDateString()}
                />
              </div>
            ))}
          </div>
        ) : (
          <HudEmptyState
            title="No projects yet"
            body="Create a project to start generating images and video."
            action={
              <button
                type="button"
                className="sigil-btn-primary"
                onClick={() => setDialogOpen(true)}
              >
                + create first project
              </button>
            }
          />
        )}
      </HudPanel>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="create new project"
        footer={
          <>
            <button
              type="button"
              className="sigil-btn-ghost"
              onClick={() => setDialogOpen(false)}
            >
              cancel
            </button>
            <button
              type="button"
              className="sigil-btn-primary"
              disabled={creating || !newProjectName.trim()}
              onClick={() => void createProject()}
            >
              {creating ? "creating..." : "create"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="dialog-project-name"
              className="sigil-section-label"
              style={{ fontSize: "9px", letterSpacing: "0.05em" }}
            >
              name
            </label>
            <input
              id="dialog-project-name"
              type="text"
              className="sigil-input"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createProject();
                }
              }}
              placeholder="Enter project name..."
              autoFocus
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="dialog-project-desc"
              className="sigil-section-label"
              style={{ fontSize: "9px", letterSpacing: "0.05em" }}
            >
              description
            </label>
            <textarea
              id="dialog-project-desc"
              className="sigil-textarea"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Optional description..."
              rows={4}
            />
          </div>
        </div>
      </Dialog>
    </section>
  );
}
