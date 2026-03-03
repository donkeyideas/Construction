-- Migration 071: Add assigned_to_contact_id to equipment_assignments
-- Allows assigning equipment to contacts (employees, subcontractors) who don't have user accounts
-- The existing assigned_to column references user_profiles (platform users only)

ALTER TABLE equipment_assignments
  ADD COLUMN IF NOT EXISTS assigned_to_contact_id UUID REFERENCES contacts(id);

-- Also add to equipment table for inventory-level contact assignment
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS assigned_to_contact_id UUID REFERENCES contacts(id);
