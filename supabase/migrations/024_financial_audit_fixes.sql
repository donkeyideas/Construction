-- 024: Financial Audit Remediation
-- Fixes: CRITICAL-1 (expense classification), CRITICAL-4 (no GL account field),
--        CRITICAL-5 (tax not posted separately), MEDIUM-1 (retainage)
--
-- Run this in Supabase SQL Editor after 023_registration_fields.sql

-- 1. Add GL account reference to invoices (which expense/revenue account this hits)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gl_account_id uuid REFERENCES chart_of_accounts(id);

-- 2. Add retainage tracking fields to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS retainage_pct numeric(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS retainage_held numeric(14,2) DEFAULT 0;

-- 3. Add Sales Tax Payable to the seed function (for new companies)
--    Existing companies will need this inserted manually or via a one-off script below.

-- One-off: insert Sales Tax Payable for ALL existing companies that don't have it
INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
SELECT c.id, '2500', 'Sales Tax Payable', 'liability', 'current_liability', 'credit',
       'Sales and use tax collected but not yet remitted'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts coa
  WHERE coa.company_id = c.id AND coa.account_number = '2500'
);

-- 4. Add Sales Tax Receivable for existing companies (input tax credits)
INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
SELECT c.id, '1150', 'Sales Tax Receivable', 'asset', 'current_asset', 'debit',
       'Sales and use tax paid on purchases eligible for input credit'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts coa
  WHERE coa.company_id = c.id AND coa.account_number = '1150'
);
