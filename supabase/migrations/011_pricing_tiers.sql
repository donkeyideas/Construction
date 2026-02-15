-- ============================================================
-- 011: Platform-Wide Pricing Tiers
-- Managed by platform admins (Super Admin portal)
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- Everyone can read (public pricing page)
-- Only platform admins can modify
-- ============================================================

ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_tiers_select" ON pricing_tiers FOR SELECT
  USING (true);

CREATE POLICY "pricing_tiers_insert" ON pricing_tiers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true)
  );

CREATE POLICY "pricing_tiers_update" ON pricing_tiers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true)
  );

CREATE POLICY "pricing_tiers_delete" ON pricing_tiers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true)
  );

-- ============================================================
-- Seed default tiers
-- ============================================================

INSERT INTO pricing_tiers (name, monthly_price, annual_price, features, is_popular, sort_order, max_users, max_projects, max_properties, max_storage_gb) VALUES
  ('Starter', 99, 79, '["Up to 10 users", "Up to 5 projects", "Up to 10 properties", "10 GB storage", "Email support"]'::jsonb, false, 0, 10, 5, 10, 10),
  ('Professional', 299, 249, '["Up to 50 users", "Up to 25 projects", "Up to 50 properties", "50 GB storage", "Priority support", "API access", "Automation rules"]'::jsonb, true, 1, 50, 25, 50, 50),
  ('Enterprise', 599, 499, '["Unlimited users", "Unlimited projects", "Unlimited properties", "250 GB storage", "Dedicated support", "SSO & SAML", "Custom integrations", "All 4 portals"]'::jsonb, false, 2, null, null, null, 250);
