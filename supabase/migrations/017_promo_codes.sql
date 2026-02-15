-- ============================================================
-- 017: Promo Codes System
-- ============================================================

-- Promo codes created by platform admins
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  description text,
  duration_days int NOT NULL DEFAULT 30,
  max_uses int,                          -- NULL = unlimited
  current_uses int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  plan_granted text NOT NULL DEFAULT 'professional',
  expires_at timestamptz,                -- NULL = never expires
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Track which company/user redeemed which code
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  redeemed_at timestamptz DEFAULT now(),
  access_expires_at timestamptz NOT NULL
);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_company ON promo_code_redemptions(company_id);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Promo codes: platform admins only
CREATE POLICY "promo_codes_select" ON promo_codes FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "promo_codes_insert" ON promo_codes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "promo_codes_update" ON promo_codes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "promo_codes_delete" ON promo_codes FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

-- Redemptions: platform admins see all, company members see own
CREATE POLICY "promo_redemptions_admin_select" ON promo_code_redemptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "promo_redemptions_company_select" ON promo_code_redemptions FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true));
