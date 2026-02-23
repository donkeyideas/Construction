-- ============================================================
-- Migration 053: Optimize Slow Queries (Supabase Performance Advisor)
--
-- Addresses the top application-level slow queries:
--   1. journal_entry_lines JOIN queries (~45ms, ~35ms, ~29ms avg, 891 calls)
--      → Financial reports: P&L, Balance Sheet, Cash Flow, Trial Balance
--   2. journal_entries.reference LIKE queries (~4.7ms avg, 1473 calls)
--      → Audit checks, CO reversal detection, JE linkage
--   3. journal_entries date range filters
--      → Date-scoped financial statements
--   4. journal_entry_lines project-based lookups
--      → Section transaction drill-downs
--
-- Existing indexes (from 035_performance_indexes.sql):
--   idx_jel_company         ON journal_entry_lines (company_id)
--   idx_jel_journal_entry   ON journal_entry_lines (journal_entry_id)
--   idx_jel_account         ON journal_entry_lines (account_id)
--   idx_je_company_status   ON journal_entries (company_id, status)
-- ============================================================


-- ============================================================
-- 1. CRITICAL: Index on reference field for LIKE prefix queries
--    Queries: WHERE company_id = $1 AND reference LIKE 'invoice:%'
--    Also covers exact matches: WHERE company_id = $1 AND reference = $2
--    Used by: financial-audit.ts (audit checks), invoice-accounting.ts
--             (reversal detection), je-linkage.ts, backfill operations
--
--    text_pattern_ops enables B-tree index usage for LIKE 'prefix%'
--    queries, which standard btree indexes cannot serve.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_je_company_reference
  ON journal_entries (company_id, reference text_pattern_ops);


-- ============================================================
-- 2. CRITICAL: Composite index for posted entries with date ordering
--    Queries: WHERE company_id = $1
--             AND status = 'posted'
--             AND entry_date BETWEEN $start AND $end
--             ORDER BY entry_date DESC
--    Used by: getTrialBalanceDateRange(), getCashFlowStatement(),
--             getIncomeStatement(), getJournalEntries()
--
--    Partial index (WHERE status = 'posted') keeps it small and fast
--    since ~95% of financial queries filter on posted status.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_je_posted_date
  ON journal_entries (company_id, entry_date DESC)
  WHERE status = 'posted';


-- ============================================================
-- 3. HIGH: Composite index for account + company on JE lines
--    Queries: WHERE account_id = $1 AND company_id = $2
--             AND journal_entries.status = 'posted'
--    Used by: getAccountTransactions(), computeGLBal() in backfill,
--             checkBankReconciliation() in audit
--
--    Replaces two single-column index scans with one composite scan.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jel_account_company
  ON journal_entry_lines (account_id, company_id);


-- ============================================================
-- 4. HIGH: Project-based JE line lookups
--    Queries: WHERE company_id = $1 AND project_id IN ($projectIds)
--    Used by: getSectionTransactions() for project drill-downs
--
--    Partial index excludes NULL project_id rows (many JE lines
--    like opening balances have no project association).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jel_company_project
  ON journal_entry_lines (company_id, project_id)
  WHERE project_id IS NOT NULL;


-- ============================================================
-- 5. MEDIUM: Covering index for JE lines financial aggregation
--    Queries: SELECT account_id, debit, credit
--             FROM journal_entry_lines WHERE company_id = $1
--    Used by: getChartOfAccounts() balance computation,
--             checkTrialBalance(), checkBalanceSheetBalance()
--
--    INCLUDE columns allow index-only scans without heap lookups
--    for the most common aggregation pattern (sum debits/credits).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jel_company_covering
  ON journal_entry_lines (company_id)
  INCLUDE (account_id, debit, credit);


-- ============================================================
-- 6. MEDIUM: Full date + status + ordering for JE list views
--    Queries: WHERE company_id = $1 [AND status = $2]
--             ORDER BY entry_date DESC
--    Used by: getJournalEntries() list page
--
--    Supersedes idx_je_company_status for queries that also sort
--    by date. The original index is kept for non-date queries.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_je_company_status_date
  ON journal_entries (company_id, status, entry_date DESC);
