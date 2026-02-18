-- ==========================================================================
-- Migration 026: Import Tracking
-- Adds import progress tracking to companies and import run history
-- ==========================================================================

-- Add import_progress JSONB column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS import_progress jsonb DEFAULT '{}';

-- Import run history table
CREATE TABLE IF NOT EXISTS import_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_type text NOT NULL DEFAULT 'csv_single', -- 'excel_master', 'csv_single'
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_sheets int DEFAULT 0,
  processed_sheets int DEFAULT 0,
  total_rows int DEFAULT 0,
  success_rows int DEFAULT 0,
  error_rows int DEFAULT 0,
  sheet_results jsonb DEFAULT '[]',
  file_name text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view import runs"
  ON import_runs FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));

CREATE POLICY "Company members can insert import runs"
  ON import_runs FOR INSERT
  WITH CHECK (company_id IN (SELECT get_company_ids()));

CREATE POLICY "Company members can update import runs"
  ON import_runs FOR UPDATE
  USING (company_id IN (SELECT get_company_ids()));

-- Index
CREATE INDEX IF NOT EXISTS idx_import_runs_company ON import_runs(company_id, created_at DESC);
