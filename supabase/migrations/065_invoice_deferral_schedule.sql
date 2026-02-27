-- Add deferral date fields to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deferral_start_date date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deferral_end_date date;

-- Deferral schedule table (mirrors lease_revenue_schedule pattern)
CREATE TABLE IF NOT EXISTS invoice_deferral_schedule (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  schedule_date date NOT NULL,
  monthly_amount numeric(14,2) NOT NULL,
  status text DEFAULT 'scheduled',  -- scheduled, recognized
  accrual_je_id uuid REFERENCES journal_entries(id),
  recognition_je_id uuid REFERENCES journal_entries(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(invoice_id, schedule_date)
);

CREATE INDEX IF NOT EXISTS idx_inv_deferral_company ON invoice_deferral_schedule(company_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_inv_deferral_invoice ON invoice_deferral_schedule(invoice_id);

ALTER TABLE invoice_deferral_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_deferral_select" ON invoice_deferral_schedule FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "inv_deferral_insert" ON invoice_deferral_schedule FOR INSERT
  WITH CHECK (company_id IN (SELECT get_company_ids()));
CREATE POLICY "inv_deferral_update" ON invoice_deferral_schedule FOR UPDATE
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "inv_deferral_delete" ON invoice_deferral_schedule FOR DELETE
  USING (company_id IN (SELECT get_company_ids()));

-- Seed deferred revenue GL account if not already present
-- (Deferred Rental Revenue at 2450 already exists from migration 029;
--  this adds a general "Deferred Revenue" and "Prepaid Expenses" if missing)
INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, is_active)
SELECT c.id, '2460', 'Deferred Revenue', 'liability', 'deferred_revenue', 'credit', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts ca
  WHERE ca.company_id = c.id AND ca.name ILIKE '%deferred revenue%' AND ca.name NOT ILIKE '%rental%'
)
ON CONFLICT DO NOTHING;

INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, is_active)
SELECT c.id, '1160', 'Prepaid Expenses', 'asset', 'prepaid', 'debit', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts ca
  WHERE ca.company_id = c.id AND ca.name ILIKE '%prepaid%'
)
ON CONFLICT DO NOTHING;
