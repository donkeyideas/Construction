-- ============================================================
-- 038: Payment Gateway Configuration (Multi-Provider)
-- ============================================================

-- Payment gateway configuration per company
CREATE TABLE IF NOT EXISTS payment_gateway_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider text NOT NULL,           -- 'stripe', 'paypal', 'square', 'gocardless', 'adyen'
  is_active boolean DEFAULT false,
  account_id text,                  -- provider-specific account ID
  config jsonb DEFAULT '{}',        -- provider-specific config (tokens, metadata)
  onboarded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, provider)
);

ALTER TABLE payment_gateway_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pgc_company_all" ON payment_gateway_config
  FOR ALL USING (company_id IN (SELECT get_company_ids()));

CREATE INDEX IF NOT EXISTS idx_pgc_company ON payment_gateway_config (company_id);

-- Add gateway tracking columns to rent_payments
ALTER TABLE rent_payments
  ADD COLUMN IF NOT EXISTS gateway_provider text,
  ADD COLUMN IF NOT EXISTS gateway_payment_id text,
  ADD COLUMN IF NOT EXISTS gateway_session_id text;

CREATE INDEX IF NOT EXISTS idx_rent_payments_gateway_session
  ON rent_payments (gateway_session_id)
  WHERE gateway_session_id IS NOT NULL;

-- Webhook idempotency log
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id text UNIQUE NOT NULL,
  provider text NOT NULL,
  event_type text NOT NULL,
  company_id uuid REFERENCES companies(id),
  payload jsonb,
  processed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwe_event_id ON payment_webhook_events (event_id);
