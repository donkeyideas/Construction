-- ============================================================================
-- Migration 030: Property Operating Expenses
-- Adds a property_expenses table for tracking all non-maintenance operating
-- costs: CAM, property taxes, insurance, utilities, management fees, and
-- capital expenditures. Updates property financials to include these.
-- ============================================================================

-- 1. Property Expenses table
CREATE TABLE IF NOT EXISTS property_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  expense_type  text NOT NULL CHECK (expense_type IN (
    'cam',              -- Common Area Maintenance (cleaning, landscaping, security)
    'property_tax',     -- Annual/quarterly property taxes
    'insurance',        -- Property insurance, liability, flood, etc.
    'utilities',        -- Electric, water, gas, trash, sewer
    'management_fee',   -- Property management company fees
    'capital_expense',  -- Capital improvements / CapEx
    'hoa_fee',          -- HOA or association fees
    'marketing',        -- Leasing/marketing costs
    'legal',            -- Legal and professional fees
    'other'             -- Catch-all for miscellaneous
  )),
  description   text,
  amount        numeric(14,2) NOT NULL DEFAULT 0,
  frequency     text NOT NULL DEFAULT 'monthly' CHECK (frequency IN (
    'one_time', 'monthly', 'quarterly', 'semi_annual', 'annual'
  )),
  effective_date date,            -- When this expense starts
  end_date       date,            -- When it ends (NULL = ongoing)
  vendor_name    text,            -- Who gets paid
  invoice_id     uuid REFERENCES invoices(id),  -- Link to invoice if applicable
  journal_entry_id uuid REFERENCES journal_entries(id),
  notes          text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_property_expenses_property ON property_expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_property_expenses_company  ON property_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_property_expenses_type     ON property_expenses(expense_type);

-- RLS
ALTER TABLE property_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_expenses_select" ON property_expenses
  FOR SELECT USING (company_id IN (SELECT get_company_ids()));

CREATE POLICY "property_expenses_insert" ON property_expenses
  FOR INSERT WITH CHECK (company_id IN (SELECT get_company_ids()));

CREATE POLICY "property_expenses_update" ON property_expenses
  FOR UPDATE USING (company_id IN (SELECT get_company_ids()));

CREATE POLICY "property_expenses_delete" ON property_expenses
  FOR DELETE USING (company_id IN (SELECT get_company_ids()));

-- 2. Seed common GL accounts for property operating expenses (ON CONFLICT DO NOTHING)
-- These may already exist from earlier migrations; the DO NOTHING ensures idempotency.
DO $$
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM companies LOOP
    -- Property Tax Expense
    INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, is_active)
    VALUES (comp.id, '6400', 'Property Tax Expense', 'expense', true)
    ON CONFLICT DO NOTHING;

    -- CAM Expense
    INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, is_active)
    VALUES (comp.id, '6410', 'Common Area Maintenance', 'expense', true)
    ON CONFLICT DO NOTHING;

    -- Utilities Expense (may already exist as 6220)
    INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, is_active)
    VALUES (comp.id, '6420', 'Property Utilities', 'expense', true)
    ON CONFLICT DO NOTHING;

    -- Management Fee Expense
    INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, is_active)
    VALUES (comp.id, '6430', 'Property Management Fees', 'expense', true)
    ON CONFLICT DO NOTHING;

    -- Marketing / Leasing Expense
    INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, is_active)
    VALUES (comp.id, '6440', 'Leasing & Marketing', 'expense', true)
    ON CONFLICT DO NOTHING;

    -- Capital Improvements (asset, not expense — gets depreciated)
    INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, is_active)
    VALUES (comp.id, '1560', 'Capital Improvements', 'asset', true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
