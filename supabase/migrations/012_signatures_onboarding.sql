-- ============================================================
-- 012: E-Signature Fields + Onboarding Flag
-- ============================================================

-- Add signature fields to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Add signature fields to change_orders
ALTER TABLE change_orders ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE change_orders ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);
ALTER TABLE change_orders ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Add signature fields to submittals
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);
ALTER TABLE submittals ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- daily_logs already has signature_url

-- Onboarding flag for companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Subcontractor prequalification fields on contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS emr_rate numeric(5,3);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bonding_capacity numeric(14,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS prequalification_score int;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS prequalification_notes text;
