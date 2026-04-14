-- 077: Financial Audit Compliance
-- Adds period locking, sequential numbering, change history, and soft-delete columns

-- ═══════════════════════════════════════════════
-- 1. Fiscal Period Locks
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fiscal_period_locks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year        int  NOT NULL,
  month       int  NOT NULL CHECK (month BETWEEN 1 AND 12),
  locked_by   uuid REFERENCES user_profiles(id),
  locked_at   timestamptz NOT NULL DEFAULT now(),
  notes       text,
  UNIQUE(company_id, year, month)
);

ALTER TABLE fiscal_period_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_period_locks_company" ON fiscal_period_locks
  FOR ALL USING (company_id IN (SELECT get_company_ids()));

-- ═══════════════════════════════════════════════
-- 2. Document Sequences (atomic counters)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_sequences (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type   text NOT NULL,  -- 'JE', 'INV', 'PAY'
  last_number     int  NOT NULL DEFAULT 0,
  UNIQUE(company_id, document_type)
);

ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_sequences_company" ON document_sequences
  FOR ALL USING (company_id IN (SELECT get_company_ids()));

-- ═══════════════════════════════════════════════
-- 3. Financial Change History
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financial_change_history (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES user_profiles(id),
  entity_type  text NOT NULL,   -- 'journal_entry', 'invoice', 'payment'
  entity_id    uuid NOT NULL,
  field_name   text NOT NULL,
  old_value    text,
  new_value    text,
  changed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_history_entity ON financial_change_history(entity_type, entity_id);
CREATE INDEX idx_change_history_company ON financial_change_history(company_id, changed_at DESC);

ALTER TABLE financial_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_history_company" ON financial_change_history
  FOR ALL USING (company_id IN (SELECT get_company_ids()));

-- ═══════════════════════════════════════════════
-- 4. ALTER: payments table — soft delete + attribution
-- ═══════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES user_profiles(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES user_profiles(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_at timestamptz;
EXCEPTION WHEN others THEN NULL; END $$;

-- ═══════════════════════════════════════════════
-- 5. ALTER: journal_entries — void tracking + approval
-- ═══════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES user_profiles(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES user_profiles(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS voided_at timestamptz;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES user_profiles(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS approved_at timestamptz;
EXCEPTION WHEN others THEN NULL; END $$;

-- ═══════════════════════════════════════════════
-- 6. ALTER: invoices — void tracking + approval
-- ═══════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES user_profiles(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_at timestamptz;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES user_profiles(id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS approved_at timestamptz;
EXCEPTION WHEN others THEN NULL; END $$;

-- ═══════════════════════════════════════════════
-- 7. RPC: Atomic document sequence increment
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_document_sequence(
  p_company_id uuid,
  p_document_type text
) RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO document_sequences (company_id, document_type, last_number)
  VALUES (p_company_id, p_document_type, 1)
  ON CONFLICT (company_id, document_type)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;

-- ═══════════════════════════════════════════════
-- 8. ALTER: companies — separation of duties opt-in
-- ═══════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS enforce_separation_of_duties boolean NOT NULL DEFAULT false;
EXCEPTION WHEN others THEN NULL; END $$;
