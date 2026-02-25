import { NavigationFrame } from "@/components/hud/NavigationFrame";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ProjectsView } from "@/components/projects/ProjectsView";

export default function ProjectsPage() {
  return (
    <RequireAuth>
      <NavigationFrame title="SIGIL" modeLabel="projects">
        <ProjectsView />
      </NavigationFrame>
    </RequireAuth>
  );
}
