-- 023: Additional registration fields
-- Company size, website, modules; user terms acceptance

-- Companies: add company_size, website, selected_modules
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS selected_modules jsonb DEFAULT '[]';

-- User profiles: add accepted_terms_at
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;
