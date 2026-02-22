-- Migration 042: AEO tracking and CRO A/B test tables
-- ============================================================
-- AEO (Answer Engine Optimization): Track AI answer visibility
-- CRO (Conversion Rate Optimization): A/B test experiment tracking

-- ── AEO Tracking ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS aeo_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  ai_engine text NOT NULL,                       -- chatgpt | perplexity | gemini | google_ai_overview
  mention_type text NOT NULL DEFAULT 'mention',  -- mention | featured_snippet | knowledge_panel | people_also_ask
  url_cited text,
  position int,
  snippet_text text,
  confidence text DEFAULT 'manual',              -- manual | api | automated
  tracked_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE aeo_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aeo_tracking_select" ON aeo_tracking FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));
CREATE POLICY "aeo_tracking_insert" ON aeo_tracking FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));
CREATE POLICY "aeo_tracking_update" ON aeo_tracking FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));
CREATE POLICY "aeo_tracking_delete" ON aeo_tracking FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE INDEX idx_aeo_tracking_engine ON aeo_tracking (ai_engine);
CREATE INDEX idx_aeo_tracking_date ON aeo_tracking (tracked_date DESC);
CREATE INDEX idx_aeo_tracking_type ON aeo_tracking (mention_type);

-- ── CRO A/B Tests ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cro_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  page_url text,
  variant_a_name text NOT NULL DEFAULT 'Control',
  variant_b_name text NOT NULL DEFAULT 'Variant B',
  variant_a_conversions int DEFAULT 0,
  variant_a_visitors int DEFAULT 0,
  variant_b_conversions int DEFAULT 0,
  variant_b_visitors int DEFAULT 0,
  metric_name text DEFAULT 'Conversion Rate',
  status text NOT NULL DEFAULT 'running',        -- running | completed | paused
  winner text,                                   -- null | A | B | inconclusive
  statistical_significance numeric(5,2),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cro_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cro_ab_tests_select" ON cro_ab_tests FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));
CREATE POLICY "cro_ab_tests_insert" ON cro_ab_tests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));
CREATE POLICY "cro_ab_tests_update" ON cro_ab_tests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));
CREATE POLICY "cro_ab_tests_delete" ON cro_ab_tests FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE INDEX idx_cro_ab_tests_status ON cro_ab_tests (status);
