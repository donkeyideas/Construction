-- ============================================================
-- Migration 055: Subscription Grace Period
--
-- Adds a grace_period_ends_at column to companies so that when
-- a subscription is canceled/deleted, the company gets 30 days
-- of read-only access before full suspension.
-- ============================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;

COMMENT ON COLUMN companies.grace_period_ends_at IS
  'When the 30-day read-only grace period expires after subscription cancellation. NULL means no active grace period.';
