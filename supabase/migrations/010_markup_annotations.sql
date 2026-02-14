-- ============================================================
-- 010: Plan Room - Markup Annotations
-- ============================================================

CREATE TABLE IF NOT EXISTS markup_annotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number int NOT NULL DEFAULT 1,

  -- Annotation type and visual properties
  annotation_type text NOT NULL,  -- line, rectangle, circle, text, arrow, cloud
  color text NOT NULL DEFAULT '#dc2626',
  stroke_width real NOT NULL DEFAULT 2.0,

  -- Geometry stored as JSONB for flexibility
  -- Coordinates are normalized (0-1 range relative to page dimensions)
  geometry jsonb NOT NULL,

  -- Text content (for text annotations, arrow labels, cloud labels)
  text_content text,

  -- Metadata
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE markup_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "markup_annotations_select" ON markup_annotations FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "markup_annotations_insert" ON markup_annotations FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "markup_annotations_update" ON markup_annotations FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "markup_annotations_delete" ON markup_annotations FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND (
      created_by = auth.uid()
      OR public.has_role(company_id, ARRAY['owner','admin'])
    )
  );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_markup_annotations_document
  ON markup_annotations(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_markup_annotations_company
  ON markup_annotations(company_id);
CREATE INDEX IF NOT EXISTS idx_markup_annotations_created_by
  ON markup_annotations(created_by);
