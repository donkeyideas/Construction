-- ==========================================================================
-- Migration 027: Payroll Module
-- Full payroll processing with tax calculations
-- ==========================================================================

-- Company payroll tax configuration
CREATE TABLE IF NOT EXISTS payroll_tax_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tax_year int NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  social_security_rate numeric(5,4) DEFAULT 0.0620,
  social_security_wage_base numeric(12,2) DEFAULT 168600.00,
  medicare_rate numeric(5,4) DEFAULT 0.0145,
  additional_medicare_rate numeric(5,4) DEFAULT 0.0090,
  additional_medicare_threshold numeric(12,2) DEFAULT 200000.00,
  futa_rate numeric(5,4) DEFAULT 0.0060,
  futa_wage_base numeric(12,2) DEFAULT 7000.00,
  state_unemployment_rate numeric(5,4) DEFAULT 0.0270,
  state_unemployment_wage_base numeric(12,2) DEFAULT 9000.00,
  state_code text DEFAULT 'TX',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, tax_year)
);

-- Employee pay rates
CREATE TABLE IF NOT EXISTS employee_pay_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pay_type text NOT NULL DEFAULT 'hourly', -- hourly, salary
  hourly_rate numeric(10,2),
  overtime_rate numeric(10,2),
  salary_amount numeric(12,2),
  filing_status text DEFAULT 'single', -- single, married_jointly, married_separately, head_of_household
  federal_allowances int DEFAULT 0,
  state_code text DEFAULT 'TX',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id, effective_date)
);

-- Employee deductions (benefits, garnishments, etc.)
CREATE TABLE IF NOT EXISTS payroll_deductions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deduction_type text NOT NULL, -- health_insurance, dental, vision, 401k, roth_401k, hsa, garnishment, other
  label text NOT NULL, -- Display name
  amount numeric(10,2) NOT NULL DEFAULT 0,
  is_percentage boolean DEFAULT false,
  is_pretax boolean DEFAULT true,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date,
  status text NOT NULL DEFAULT 'draft', -- draft, review, approved, paid, voided
  total_gross numeric(14,2) DEFAULT 0,
  total_employee_taxes numeric(14,2) DEFAULT 0,
  total_employer_taxes numeric(14,2) DEFAULT 0,
  total_deductions numeric(14,2) DEFAULT 0,
  total_net numeric(14,2) DEFAULT 0,
  employee_count int DEFAULT 0,
  journal_entry_id uuid REFERENCES journal_entries(id),
  notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll line items per employee
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  regular_hours numeric(6,2) DEFAULT 0,
  overtime_hours numeric(6,2) DEFAULT 0,
  hourly_rate numeric(10,2),
  overtime_rate numeric(10,2),
  gross_pay numeric(12,2) DEFAULT 0,
  federal_income_tax numeric(10,2) DEFAULT 0,
  state_income_tax numeric(10,2) DEFAULT 0,
  social_security_employee numeric(10,2) DEFAULT 0,
  medicare_employee numeric(10,2) DEFAULT 0,
  social_security_employer numeric(10,2) DEFAULT 0,
  medicare_employer numeric(10,2) DEFAULT 0,
  futa_employer numeric(10,2) DEFAULT 0,
  suta_employer numeric(10,2) DEFAULT 0,
  pretax_deductions numeric(10,2) DEFAULT 0,
  posttax_deductions numeric(10,2) DEFAULT 0,
  total_employee_deductions numeric(10,2) DEFAULT 0,
  total_employer_taxes numeric(10,2) DEFAULT 0,
  net_pay numeric(12,2) DEFAULT 0,
  ytd_gross numeric(14,2) DEFAULT 0,
  deduction_details jsonb DEFAULT '[]',
  time_entry_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE payroll_tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

-- Payroll tax config policies
CREATE POLICY "Company members can view tax config"
  ON payroll_tax_config FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "Admins can manage tax config"
  ON payroll_tax_config FOR ALL
  USING (company_id IN (SELECT get_company_ids()) AND public.has_role(company_id, ARRAY['owner', 'admin']));

-- Employee pay rates policies
CREATE POLICY "Company members can view pay rates"
  ON employee_pay_rates FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "Admins can manage pay rates"
  ON employee_pay_rates FOR ALL
  USING (company_id IN (SELECT get_company_ids()) AND public.has_role(company_id, ARRAY['owner', 'admin']));

-- Payroll deductions policies
CREATE POLICY "Company members can view deductions"
  ON payroll_deductions FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "Admins can manage deductions"
  ON payroll_deductions FOR ALL
  USING (company_id IN (SELECT get_company_ids()) AND public.has_role(company_id, ARRAY['owner', 'admin']));

-- Payroll runs policies
CREATE POLICY "Company members can view payroll runs"
  ON payroll_runs FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "Admins can manage payroll runs"
  ON payroll_runs FOR ALL
  USING (company_id IN (SELECT get_company_ids()) AND public.has_role(company_id, ARRAY['owner', 'admin']));

-- Payroll items policies
CREATE POLICY "Company members can view payroll items"
  ON payroll_items FOR SELECT
  USING (company_id IN (SELECT get_company_ids()));
CREATE POLICY "Admins can manage payroll items"
  ON payroll_items FOR ALL
  USING (company_id IN (SELECT get_company_ids()) AND public.has_role(company_id, ARRAY['owner', 'admin']));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_pay_rates_company ON employee_pay_rates(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_user ON payroll_deductions(company_id, user_id);

-- Add payroll-related accounts to the seed function
-- These accounts will be added for existing companies that already have COA
CREATE OR REPLACE FUNCTION seed_payroll_accounts(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only add if company has a chart of accounts but missing payroll accounts
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = p_company_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- Federal Income Tax Payable
  INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  VALUES (p_company_id, '2500', 'Federal Income Tax Payable', 'liability', 'current_liability', 'credit', 'Federal income tax withheld from employee wages')
  ON CONFLICT DO NOTHING;

  -- State Income Tax Payable
  INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  VALUES (p_company_id, '2510', 'State Income Tax Payable', 'liability', 'current_liability', 'credit', 'State income tax withheld from employee wages')
  ON CONFLICT DO NOTHING;

  -- FICA Payable (combined Social Security + Medicare)
  INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  VALUES (p_company_id, '2520', 'FICA Payable', 'liability', 'current_liability', 'credit', 'Social Security and Medicare taxes (employee + employer portions)')
  ON CONFLICT DO NOTHING;

  -- FUTA Payable
  INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  VALUES (p_company_id, '2530', 'FUTA Payable', 'liability', 'current_liability', 'credit', 'Federal unemployment tax (employer only)')
  ON CONFLICT DO NOTHING;

  -- SUTA Payable
  INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  VALUES (p_company_id, '2540', 'SUTA Payable', 'liability', 'current_liability', 'credit', 'State unemployment tax (employer only)')
  ON CONFLICT DO NOTHING;

  -- Payroll Expense (if not exists -- usually 6000 exists as general payroll)
  INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  VALUES (p_company_id, '6010', 'Employer Payroll Taxes', 'expense', 'operating_expense', 'debit', 'Employer portion of FICA, FUTA, and SUTA taxes')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Seed payroll accounts for all existing companies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM companies LOOP
    PERFORM seed_payroll_accounts(r.id);
  END LOOP;
END;
$$;
