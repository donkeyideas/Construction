-- Add pay_frequency column to payroll_tax_config
-- Allows companies to configure weekly, biweekly, semi-monthly, or monthly pay schedules
-- Default is 'biweekly' (26 periods/year), which was previously hardcoded

ALTER TABLE payroll_tax_config
ADD COLUMN IF NOT EXISTS pay_frequency TEXT DEFAULT 'biweekly';

COMMENT ON COLUMN payroll_tax_config.pay_frequency IS 'Pay schedule: weekly, biweekly, semi_monthly, monthly';
