-- Migration 033: Add hourly_rate to contacts for labor cost fallback
-- Primary rate source is employee_pay_rates; contacts.hourly_rate is the fallback.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);
