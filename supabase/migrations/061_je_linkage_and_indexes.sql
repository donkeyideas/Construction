-- ============================================================================
-- Migration 061: Backfill JE line project_id/property_id + Performance Indexes
-- ============================================================================
-- Context: Invoice and payment JE generation was missing property_id on JE lines.
-- This migration backfills historical data and adds indexes for fast lookups.

-- ─── 1. Backfill project_id on JE lines from invoices ───
-- Reference format: "invoice:<uuid>"
UPDATE journal_entry_lines jel
SET project_id = inv.project_id
FROM journal_entries je
  JOIN invoices inv ON je.reference = 'invoice:' || inv.id::text
WHERE jel.journal_entry_id = je.id
  AND jel.project_id IS NULL
  AND inv.project_id IS NOT NULL;

-- ─── 2. Backfill property_id on JE lines from invoices ───
UPDATE journal_entry_lines jel
SET property_id = inv.property_id
FROM journal_entries je
  JOIN invoices inv ON je.reference = 'invoice:' || inv.id::text
WHERE jel.journal_entry_id = je.id
  AND jel.property_id IS NULL
  AND inv.property_id IS NOT NULL;

-- ─── 3. Backfill project_id on JE lines from payments → invoices ───
-- Reference format: "payment:<uuid>"
UPDATE journal_entry_lines jel
SET project_id = inv.project_id
FROM journal_entries je
  JOIN payments pmt ON je.reference = 'payment:' || pmt.id::text
  JOIN invoices inv ON pmt.invoice_id = inv.id
WHERE jel.journal_entry_id = je.id
  AND jel.project_id IS NULL
  AND inv.project_id IS NOT NULL;

-- ─── 4. Backfill property_id on JE lines from payments → invoices ───
UPDATE journal_entry_lines jel
SET property_id = inv.property_id
FROM journal_entries je
  JOIN payments pmt ON je.reference = 'payment:' || pmt.id::text
  JOIN invoices inv ON pmt.invoice_id = inv.id
WHERE jel.journal_entry_id = je.id
  AND jel.property_id IS NULL
  AND inv.property_id IS NOT NULL;

-- ─── 5. Backfill project_id on JE lines from change orders ───
-- Reference format: "change_order:<uuid>"
UPDATE journal_entry_lines jel
SET project_id = co.project_id
FROM journal_entries je
  JOIN change_orders co ON je.reference = 'change_order:' || co.id::text
WHERE jel.journal_entry_id = je.id
  AND jel.project_id IS NULL
  AND co.project_id IS NOT NULL;

-- ─── 6. Performance indexes ───

-- Property-based JE line lookups (critical for getPropertyTransactions)
CREATE INDEX IF NOT EXISTS idx_jel_company_property
  ON journal_entry_lines (company_id, property_id) WHERE property_id IS NOT NULL;

-- Invoice property lookups
CREATE INDEX IF NOT EXISTS idx_invoices_company_property
  ON invoices (company_id, property_id) WHERE property_id IS NOT NULL;

-- Invoice project lookups
CREATE INDEX IF NOT EXISTS idx_invoices_company_project
  ON invoices (company_id, project_id) WHERE project_id IS NOT NULL;
