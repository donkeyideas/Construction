-- Migration 068: Add property_id to operational tables
-- Allows safety incidents, inspections, toolbox talks, time entries,
-- and equipment assignments to be linked to a property (in addition to a project).
-- Contracts already had property_id in the DB schema; no change needed there.

ALTER TABLE safety_incidents
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE safety_inspections
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE toolbox_talks
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE equipment_assignments
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;
