-- Workshop participant: confine non-admin users to a single journey (optional).
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "locked_workspace_project_id" UUID;

ALTER TABLE "profiles"
  DROP CONSTRAINT IF EXISTS "profiles_locked_workspace_project_id_fkey";

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_locked_workspace_project_id_fkey"
  FOREIGN KEY ("locked_workspace_project_id") REFERENCES "workspace_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "profiles_locked_workspace_project_id_idx" ON "profiles"("locked_workspace_project_id");
