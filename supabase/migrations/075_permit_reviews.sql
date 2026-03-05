-- ============================================================
-- 075: AI Permit Reviews
-- Stores AI-powered building permit compliance review results
-- ============================================================

CREATE TABLE IF NOT EXISTS permit_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,

  -- Review metadata
  title text NOT NULL DEFAULT 'Untitled Review',
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing', 'completed', 'failed')),

  -- Input data
  document_text text,
  jurisdiction text,
  building_type text,

  -- AI results (structured JSON)
  overall_status text CHECK (overall_status IN (
    'likely_compliant', 'needs_review', 'issues_found'
  )),
  overall_confidence numeric(5,2),
  summary text,
  sections jsonb DEFAULT '[]',
  issues jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  raw_ai_response text,

  -- AI provider tracking
  provider_name text,
  model_id text,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  estimated_cost numeric(10,4) DEFAULT 0,
  processing_time_ms integer,

  -- Audit
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_permit_reviews_company ON permit_reviews(company_id);
CREATE INDEX idx_permit_reviews_created ON permit_reviews(created_at DESC);

-- RLS
ALTER TABLE permit_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permit_reviews_select" ON permit_reviews FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "permit_reviews_insert" ON permit_reviews FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "permit_reviews_update" ON permit_reviews FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "permit_reviews_delete" ON permit_reviews FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));
