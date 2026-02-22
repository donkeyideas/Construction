-- Migration 041: Create dedicated GL accounts per bank account
--
-- Each bank account gets its OWN GL account named "Checking ••1842" (using last 4 digits).
-- Reclassification JEs move existing balances from old GL accounts to the new ones:
--   1. Transfer full balance from old linked GL (1010/1020/1030) → new account
--   2. Transfer remaining bank balance from 1000 Cash → new account
-- This zeroes out the old sub-accounts and reduces 1000 Cash proportionally.

DO $$
DECLARE
  bank RECORD;
  next_num integer;
  new_gl_id uuid;
  parent_cash_id uuid;
  cash_1000_id uuid;
  old_gl_id uuid;
  old_gl_balance numeric;
  remaining numeric;
  je_id uuid;
  creator_uid uuid;
  type_label text;
  acct_label text;
  old_gl_name text;
BEGIN
  FOR bank IN
    SELECT ba.id, ba.company_id, ba.name, ba.account_type,
           ba.account_number_last4, ba.current_balance, ba.gl_account_id
    FROM bank_accounts ba
    ORDER BY ba.company_id, ba.name
  LOOP
    -- Skip if already linked to a "••" account (idempotent)
    IF bank.gl_account_id IS NOT NULL THEN
      SELECT name INTO old_gl_name FROM chart_of_accounts WHERE id = bank.gl_account_id;
      IF old_gl_name LIKE '%••%' THEN
        CONTINUE;
      END IF;
    END IF;

    -- Remember old GL link from migration 040
    old_gl_id := bank.gl_account_id;

    -- Compute old GL account's posted balance (debits - credits)
    old_gl_balance := 0;
    IF old_gl_id IS NOT NULL THEN
      SELECT COALESCE(SUM(jel.debit) - SUM(jel.credit), 0)
      INTO old_gl_balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.company_id = bank.company_id
        AND jel.account_id = old_gl_id
        AND je.status = 'posted';
    END IF;

    -- Find 1000 Cash for this company
    SELECT id INTO cash_1000_id
    FROM chart_of_accounts
    WHERE company_id = bank.company_id AND account_number = '1000'
    LIMIT 1;
    parent_cash_id := cash_1000_id;

    -- Next available account number in 1040-1099
    SELECT COALESCE(MAX(account_number::integer) + 1, 1040)
    INTO next_num
    FROM chart_of_accounts
    WHERE company_id = bank.company_id
      AND account_number ~ '^\d+$'
      AND account_number::integer BETWEEN 1040 AND 1099;

    IF next_num IS NULL THEN next_num := 1040; END IF;
    IF next_num > 1099 THEN next_num := 1040; END IF;

    -- Build label: "Checking ••1842" or "Savings ••7234"
    type_label := CASE WHEN bank.account_type = 'savings' THEN 'Savings' ELSE 'Checking' END;
    acct_label := type_label || ' ••' || COALESCE(bank.account_number_last4, '????');

    -- Create new GL account
    new_gl_id := gen_random_uuid();
    INSERT INTO chart_of_accounts
      (id, company_id, account_number, name, account_type, sub_type, normal_balance, is_active, description, parent_id)
    VALUES
      (new_gl_id, bank.company_id, next_num::text, acct_label,
       'asset', 'current_asset', 'debit', true,
       'Bank account: ' || bank.name, parent_cash_id);

    -- Link bank account to new GL
    UPDATE bank_accounts SET gl_account_id = new_gl_id WHERE id = bank.id;

    -- Get a user for created_by on JEs
    SELECT user_id INTO creator_uid
    FROM company_members WHERE company_id = bank.company_id LIMIT 1;

    -- ── Reclassification JE 1: Old GL → New GL (zeros out old sub-account) ──
    IF old_gl_id IS NOT NULL AND old_gl_balance > 0 THEN
      je_id := gen_random_uuid();

      SELECT name INTO old_gl_name FROM chart_of_accounts WHERE id = old_gl_id;

      INSERT INTO journal_entries
        (id, company_id, entry_number, entry_date, description, reference, status, created_by)
      VALUES
        (je_id, bank.company_id,
         'JE-RECLASS-' || substring(bank.id::text from 1 for 8),
         CURRENT_DATE,
         'Reclassify ' || old_gl_name || ' → ' || acct_label,
         'reclass_bank:' || bank.id || ':old_gl',
         'posted', creator_uid);

      INSERT INTO journal_entry_lines
        (id, company_id, journal_entry_id, account_id, debit, credit, description, line_order)
      VALUES
        (gen_random_uuid(), bank.company_id, je_id, new_gl_id,
         old_gl_balance, 0, 'Reclassify to ' || acct_label, 1);

      INSERT INTO journal_entry_lines
        (id, company_id, journal_entry_id, account_id, debit, credit, description, line_order)
      VALUES
        (gen_random_uuid(), bank.company_id, je_id, old_gl_id,
         0, old_gl_balance, 'Reclassify from ' || old_gl_name, 2);
    END IF;

    -- ── Reclassification JE 2: 1000 Cash → New GL (remaining balance) ──
    remaining := GREATEST(COALESCE(bank.current_balance, 0) - GREATEST(old_gl_balance, 0), 0);

    IF remaining > 0 AND cash_1000_id IS NOT NULL THEN
      je_id := gen_random_uuid();

      INSERT INTO journal_entries
        (id, company_id, entry_number, entry_date, description, reference, status, created_by)
      VALUES
        (je_id, bank.company_id,
         'JE-RECLASS2-' || substring(bank.id::text from 1 for 8),
         CURRENT_DATE,
         'Reclassify Cash → ' || acct_label,
         'reclass_bank:' || bank.id || ':cash',
         'posted', creator_uid);

      INSERT INTO journal_entry_lines
        (id, company_id, journal_entry_id, account_id, debit, credit, description, line_order)
      VALUES
        (gen_random_uuid(), bank.company_id, je_id, new_gl_id,
         remaining, 0, 'Reclassify Cash to ' || acct_label, 1);

      INSERT INTO journal_entry_lines
        (id, company_id, journal_entry_id, account_id, debit, credit, description, line_order)
      VALUES
        (gen_random_uuid(), bank.company_id, je_id, cash_1000_id,
         0, remaining, 'Reclassify Cash to bank account', 2);
    END IF;

  END LOOP;
END $$;
