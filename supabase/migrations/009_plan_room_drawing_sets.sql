-- ============================================================
-- 009: Plan Room - Drawing Sets & Document Enhancements
-- ============================================================

-- Drawing Sets table
CREATE TABLE IF NOT EXISTS drawing_sets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  discipline text,  -- architectural, structural, mechanical, electrical, plumbing, civil, landscape
  status text NOT NULL DEFAULT 'current',  -- current, superseded, draft
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add plan-room columns to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drawing_set_id uuid REFERENCES drawing_sets(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS discipline text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS revision_label text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true;

-- ============================================================
-- RLS Policies for drawing_sets
-- ============================================================

ALTER TABLE drawing_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drawing_sets_select" ON drawing_sets FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "drawing_sets_insert" ON drawing_sets FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "drawing_sets_update" ON drawing_sets FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "drawing_sets_delete" ON drawing_sets FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_drawing_sets_company ON drawing_sets(company_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sets_project ON drawing_sets(company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_documents_drawing_set ON documents(drawing_set_id);
CREATE INDEX IF NOT EXISTS idx_documents_discipline ON documents(company_id, discipline);
CREATE INDEX IF NOT EXISTS idx_documents_is_current ON documents(company_id, is_current);
