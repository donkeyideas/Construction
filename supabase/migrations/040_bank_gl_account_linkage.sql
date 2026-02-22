-- Migration 040: Link bank_accounts to chart_of_accounts
-- Each bank account gets a corresponding GL account for proper Balance Sheet reporting.
-- Payment JEs will debit/credit the bank-specific GL account instead of generic Cash.

-- 1. Add gl_account_id FK column to bank_accounts
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS gl_account_id uuid REFERENCES chart_of_accounts(id);

-- 2. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_bank_accounts_gl_account_id
  ON bank_accounts(gl_account_id) WHERE gl_account_id IS NOT NULL;

-- 3. Backfill: Link existing bank accounts to existing GL accounts by name matching
DO $$
DECLARE
  bank RECORD;
  matched_gl_id uuid;
BEGIN
  FOR bank IN
    SELECT ba.id, ba.company_id, lower(ba.name) AS name_lower
    FROM bank_accounts ba
    WHERE ba.gl_account_id IS NULL
  LOOP
    -- Match by: exact name, or bank name contains GL name, or GL name contains bank name
    -- Restricted to cash/bank GL accounts (account_number 1000-1099, asset type)
    SELECT ca.id INTO matched_gl_id
    FROM chart_of_accounts ca
    WHERE ca.company_id = bank.company_id
      AND ca.account_type = 'asset'
      AND ca.is_active = true
      AND ca.account_number >= '1000'
      AND ca.account_number <= '1099'
      AND (
        lower(ca.name) = bank.name_lower
        OR bank.name_lower LIKE '%' || lower(ca.name) || '%'
        OR lower(ca.name) LIKE '%' || bank.name_lower || '%'
        -- Match common keywords: "operating" <-> "operating", "payroll" <-> "payroll", etc.
        OR (bank.name_lower LIKE '%operating%' AND lower(ca.name) LIKE '%operating%')
        OR (bank.name_lower LIKE '%payroll%' AND lower(ca.name) LIKE '%payroll%')
        OR (bank.name_lower LIKE '%savings%' AND lower(ca.name) LIKE '%savings%')
        OR (bank.name_lower LIKE '%reserve%' AND lower(ca.name) LIKE '%reserve%')
      )
    ORDER BY
      CASE WHEN lower(ca.name) = bank.name_lower THEN 0 ELSE 1 END,
      ca.account_number
    LIMIT 1;

    IF matched_gl_id IS NOT NULL THEN
      UPDATE bank_accounts SET gl_account_id = matched_gl_id WHERE id = bank.id;
    END IF;
  END LOOP;
END $$;
