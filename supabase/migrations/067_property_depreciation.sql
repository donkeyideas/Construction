-- 067: Property Depreciation Schedule
-- Adds depreciation setup columns to the properties table so each property
-- can track its land/building cost split and straight-line depreciation schedule.
-- JEs are generated upfront for the full useful life via the API.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS land_value              numeric(14,2),
  ADD COLUMN IF NOT EXISTS useful_life_years       numeric(5,1),
  ADD COLUMN IF NOT EXISTS depreciation_method     text DEFAULT 'straight_line',
  ADD COLUMN IF NOT EXISTS depreciation_start_date date;

-- Ensure every company has 6700 Depreciation Expense and 1540 Accumulated Depreciation
-- (these are seeded in 003 but may be missing for companies created before that migration)

INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
SELECT c.id, '6700', 'Depreciation Expense', 'expense', 'operating_expense', 'debit',
       'Periodic allocation of fixed asset costs over their useful lives'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts coa
  WHERE coa.company_id = c.id AND coa.account_number = '6700'
);

INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
SELECT c.id, '1540', 'Accumulated Depreciation', 'asset', 'contra_asset', 'credit',
       'Accumulated depreciation on all fixed assets'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts coa
  WHERE coa.company_id = c.id AND coa.account_number = '1540'
);
