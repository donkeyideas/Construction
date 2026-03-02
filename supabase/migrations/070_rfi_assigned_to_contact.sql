-- Migration 070: Add assigned_to_contact_id to rfis
-- Allows assigning RFIs to contacts (employees/subcontractors) from the
-- People directory, not just system users.

ALTER TABLE rfis
  ADD COLUMN IF NOT EXISTS assigned_to_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rfis_assigned_to_contact ON rfis(assigned_to_contact_id);
