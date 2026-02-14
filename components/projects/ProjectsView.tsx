"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/components/projects/ProjectCard";

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
    <section className="mx-auto max-w-6xl pt-12">
      <div className="mb-6 flex items-end justify-between gap-3">
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          projects
        </h1>
        <div className="flex gap-2">
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            className="border border-[var(--dawn-15)] bg-[var(--void)] px-3 py-2 text-sm text-[var(--dawn)] outline-none"
          />
          <input
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Description"
            className="border border-[var(--dawn-15)] bg-[var(--void)] px-3 py-2 text-sm text-[var(--dawn)] outline-none"
          />
          <button
            className="border border-[var(--gold)] bg-transparent px-3 py-2 text-xs uppercase tracking-[0.08em] text-[var(--gold)] transition-colors hover:bg-[rgba(202,165,84,0.1)] disabled:opacity-50"
            style={{ fontFamily: "var(--font-mono)" }}
            type="button"
            disabled={creating || !newProjectName.trim()}
            onClick={() => {
              void createProject();
            }}
          >
            {creating ? "creating..." : "new project"}
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--dawn-50)]">Loading projects...</p>
      ) : hasProjects ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description ?? "No description"}
              updatedAt={new Date(project.updatedAt).toLocaleDateString()}
            />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[var(--dawn-15)] bg-[var(--surface-0)] p-5 text-sm text-[var(--dawn-50)]">
          No projects yet. Create one to start generating.
        </div>
      )}
    </section>
  );
}
