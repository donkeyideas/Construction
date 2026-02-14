-- ============================================================
-- 011: Admin-Manageable Pricing Tiers
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  annual_price numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_popular boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  max_users int,
  max_projects int,
  max_properties int,
  max_storage_gb int,
  stripe_price_id_monthly text,
  stripe_price_id_annual text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER set_pricing_tiers_updated_at
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_tiers_select" ON pricing_tiers FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "pricing_tiers_insert" ON pricing_tiers FOR INSERT
  WITH CHECK (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner','admin'])
  );

CREATE POLICY "pricing_tiers_update" ON pricing_tiers FOR UPDATE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner','admin'])
  );

CREATE POLICY "pricing_tiers_delete" ON pricing_tiers FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner','admin'])
  );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_company
  ON pricing_tiers(company_id);
