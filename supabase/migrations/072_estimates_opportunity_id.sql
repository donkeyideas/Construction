-- ============================================================
-- 072: Add opportunity_id to estimates table
-- Links estimates to CRM pipeline opportunities
-- ============================================================

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES opportunities(id);

CREATE INDEX IF NOT EXISTS idx_estimates_opportunity ON estimates(opportunity_id);
