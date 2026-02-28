-- Ensure every company has a "Deferred Revenue" account (liability) and "Prepaid Expenses" (asset).
-- Migration 065 added these with a NOT EXISTS guard, but if a company already had a different
-- "deferred revenue" account (e.g. "Deferred Rental Revenue"), the 065 INSERT was skipped.
-- This migration seeds the accounts only if the company truly has no non-rental deferred revenue account.

INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, is_active)
SELECT c.id, '2460', 'Deferred Revenue', 'liability', 'deferred_revenue', 'credit', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts ca
  WHERE ca.company_id = c.id
    AND (
      (ca.account_type = 'liability' AND ca.name ILIKE '%deferred%' AND ca.name ILIKE '%revenue%' AND ca.name NOT ILIKE '%rental%' AND ca.name NOT ILIKE '%rent%')
      OR ca.sub_type = 'deferred_revenue'
      OR ca.account_type = 'deferred_revenue'
    )
)
ON CONFLICT DO NOTHING;

-- Also ensure Prepaid Expenses for companies that don't have one
INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, is_active)
SELECT c.id, '1160', 'Prepaid Expenses', 'asset', 'prepaid', 'debit', true
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts ca
  WHERE ca.company_id = c.id AND ca.name ILIKE '%prepaid%'
)
ON CONFLICT DO NOTHING;
