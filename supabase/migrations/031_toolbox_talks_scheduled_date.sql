-- Migration 031: Add scheduled_date column to toolbox_talks
-- The existing conducted_date tracks when a talk was conducted.
-- The UI and codebase use scheduled_date for scheduling future talks.

ALTER TABLE toolbox_talks
  ADD COLUMN IF NOT EXISTS scheduled_date date;

-- Backfill existing rows: copy conducted_date to scheduled_date
UPDATE toolbox_talks SET scheduled_date = conducted_date WHERE scheduled_date IS NULL;
