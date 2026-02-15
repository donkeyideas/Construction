-- ============================================================
-- 018: Platform Settings (Stripe keys, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  is_encrypted boolean NOT NULL DEFAULT false,
  description text,
  updated_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: platform admins only
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "platform_settings_insert" ON platform_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "platform_settings_update" ON platform_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "platform_settings_delete" ON platform_settings FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

-- Seed default Stripe mode
INSERT INTO platform_settings (key, value, is_encrypted, description)
VALUES ('stripe_mode', 'test', false, 'Current Stripe mode: test or live')
ON CONFLICT (key) DO NOTHING;
