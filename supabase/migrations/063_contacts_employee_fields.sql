-- 063: Add employee-specific fields to contacts table
-- Adds hire_date, employment_status, and department for employee records

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS employment_status text DEFAULT 'active';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS department text;

COMMENT ON COLUMN contacts.employment_status IS 'active, inactive, terminated, on_leave';
