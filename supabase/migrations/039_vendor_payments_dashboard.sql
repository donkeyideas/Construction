-- Migration 039: Vendor Payments Dashboard
-- Adds payment_terms, submitted_by/at to invoices; approved_by/at to payments;
-- vendor invoice insert RLS policy; AP dashboard index.

-- 1. Payment terms on invoices (NET 30, NET 60, etc.)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms text;

-- 2. Track which vendor user submitted the invoice
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- 3. Track payment approval
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- 4. RLS: Allow vendors to INSERT invoices for their own vendor_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'invoices_vendor_insert' AND tablename = 'invoices'
  ) THEN
    CREATE POLICY invoices_vendor_insert ON invoices FOR INSERT
      WITH CHECK (
        invoice_type = 'payable'
        AND vendor_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- 5. Index for AP dashboard queries (payable invoices by company + status)
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_payable
  ON invoices (company_id, invoice_type, status)
  WHERE invoice_type = 'payable';

-- 6. Index for payment lookups by invoice
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON payments (invoice_id);
