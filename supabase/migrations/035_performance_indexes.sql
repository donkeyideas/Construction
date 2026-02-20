-- ============================================================
-- Migration 035: Performance Indexes for Slow Queries
-- Adds indexes identified from Supabase slow query log.
--
-- Top actionable slow queries:
--   1. units SELECT by company_id + property_id (11.3ms avg, 4983 calls)
--   2. journal_entry_lines JOINs with journal_entries & chart_of_accounts
--      (106-188ms avg, 83-136 calls each — financial reports)
--
-- Also adds indexes to speed up RLS policy evaluation for portal
-- users (tenant/vendor subqueries on contacts, leases).
-- ============================================================

-- ============================================================
-- SECTION 1: Fix slow units queries
-- Query: WHERE units.company_id = $1 AND units.property_id = $2
-- Existing: idx_units_property(property_id) — missing company_id
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_company_property
  ON units (company_id, property_id);


-- ============================================================
-- SECTION 2: Fix slow journal_entry_lines queries
-- These are the financial report queries (Balance Sheet, P&L, etc.)
-- that JOIN journal_entry_lines → journal_entries → chart_of_accounts.
-- No indexes exist on journal_entry_lines FK columns.
-- ============================================================

-- For WHERE journal_entry_lines.company_id = $X
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jel_company
  ON journal_entry_lines (company_id);

-- For JOIN journal_entries.id = journal_entry_lines.journal_entry_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jel_journal_entry
  ON journal_entry_lines (journal_entry_id);

-- For JOIN chart_of_accounts.id = journal_entry_lines.account_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jel_account
  ON journal_entry_lines (account_id);

-- For filtered JOIN: journal_entries.status = 'posted' (in LATERAL subquery)
-- PK covers id lookup, but status filter benefits from composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_je_company_status
  ON journal_entries (company_id, status);


-- ============================================================
-- SECTION 3: RLS policy evaluation indexes
-- Portal RLS policies do subqueries like:
--   contacts WHERE user_id = auth.uid()
--   leases WHERE tenant_user_id = auth.uid()
-- These need indexes to avoid sequential scans.
-- ============================================================

-- For vendor portal: SELECT id FROM contacts WHERE user_id = auth.uid()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user
  ON contacts (user_id) WHERE user_id IS NOT NULL;

-- For tenant portal: SELECT id FROM leases WHERE tenant_user_id = auth.uid()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_tenant_user
  ON leases (tenant_user_id) WHERE tenant_user_id IS NOT NULL;

-- For tenant portal: rent_payments via lease_id lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rent_payments_lease
  ON rent_payments (lease_id);

-- For company_members lookups in RLS (used by get_company_ids())
-- Existing: idx_company_members_user(user_id) — good
-- Add composite for the common pattern: WHERE user_id = $1 AND is_active = true
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_user_active
  ON company_members (user_id, is_active) WHERE is_active = true;
