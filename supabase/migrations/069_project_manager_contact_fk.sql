-- 069: Change project_manager_id and superintendent_id to reference contacts
-- Previously these referenced auth.users(id); employees are stored in contacts,
-- not as system users, so the dropdowns only showed the one logged-in account.

-- Drop old FK constraints (reference auth.users)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_manager_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_superintendent_id_fkey;

-- Clear stale values that were auth.user UUIDs (won't match any contact)
UPDATE projects
  SET project_manager_id = NULL, superintendent_id = NULL
  WHERE project_manager_id IS NOT NULL OR superintendent_id IS NOT NULL;

-- Add new FK constraints referencing contacts
ALTER TABLE projects
  ADD CONSTRAINT projects_project_manager_id_fkey
  FOREIGN KEY (project_manager_id) REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE projects
  ADD CONSTRAINT projects_superintendent_id_fkey
  FOREIGN KEY (superintendent_id) REFERENCES contacts(id) ON DELETE SET NULL;
