"use client";

import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectsView } from "@/components/projects/ProjectsView";

export function ProjectsPageClient() {
  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="projects">
        <ProjectsView />
      </NavigationFrame>
    </RequireAuth>
  );
}
