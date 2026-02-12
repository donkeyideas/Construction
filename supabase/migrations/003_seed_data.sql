-- ============================================================
-- ConstructionERP Seed Data
-- Production reference data for Construction & Real Estate ERP
-- ============================================================

-- ============================================================
-- 1. STANDARD CONSTRUCTION CHART OF ACCOUNTS
--    CSI MasterFormat-based, inserted per company via function
-- ============================================================

create or replace function seed_company_chart_of_accounts(p_company_id uuid)
returns void as $$
declare
  -- Parent account IDs (looked up after insert)
  v_cash_id uuid;
  v_ar_id uuid;
  v_fixed_assets_id uuid;
  v_ap_id uuid;
  v_accrued_id uuid;
  v_vehicle_exp_id uuid;
  v_office_exp_id uuid;
  v_insurance_id uuid;
  v_professional_id uuid;
  v_general_req_id uuid;
begin

  -- --------------------------------------------------------
  -- ASSETS (1000-1999)
  -- --------------------------------------------------------

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '1000', 'Cash and Cash Equivalents', 'asset', 'current_asset', 'debit', 'All cash accounts and liquid equivalents')
  returning id into v_cash_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values
    (p_company_id, '1010', 'Operating Checking Account', 'asset', 'current_asset', v_cash_id, 'debit', 'Primary operating bank account'),
    (p_company_id, '1020', 'Payroll Account', 'asset', 'current_asset', v_cash_id, 'debit', 'Dedicated payroll bank account'),
    (p_company_id, '1030', 'Petty Cash', 'asset', 'current_asset', v_cash_id, 'debit', 'On-hand petty cash fund');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '1100', 'Accounts Receivable', 'asset', 'current_asset', 'debit', 'Amounts owed by clients for completed work')
  returning id into v_ar_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values (p_company_id, '1110', 'Retainage Receivable', 'asset', 'current_asset', v_ar_id, 'debit', 'Retainage amounts withheld by clients pending project completion');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '1200', 'Work in Progress', 'asset', 'current_asset', 'debit', 'Costs incurred on contracts not yet billed or recognized as revenue');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '1300', 'Prepaid Expenses', 'asset', 'current_asset', 'debit', 'Payments made in advance for insurance, rent, and other expenses');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '1400', 'Inventory - Materials', 'asset', 'current_asset', 'debit', 'Construction materials and supplies on hand');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '1500', 'Fixed Assets', 'asset', 'fixed_asset', 'debit', 'Long-term tangible assets used in operations')
  returning id into v_fixed_assets_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values
    (p_company_id, '1510', 'Vehicles', 'asset', 'fixed_asset', v_fixed_assets_id, 'debit', 'Company-owned trucks, vans, and other vehicles'),
    (p_company_id, '1520', 'Equipment', 'asset', 'fixed_asset', v_fixed_assets_id, 'debit', 'Construction equipment, tools, and machinery'),
    (p_company_id, '1530', 'Office Furniture', 'asset', 'fixed_asset', v_fixed_assets_id, 'debit', 'Desks, chairs, and other office furnishings'),
    (p_company_id, '1540', 'Accumulated Depreciation', 'asset', 'contra_asset', v_fixed_assets_id, 'credit', 'Accumulated depreciation on all fixed assets');

  -- --------------------------------------------------------
  -- LIABILITIES (2000-2999)
  -- --------------------------------------------------------

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '2000', 'Accounts Payable', 'liability', 'current_liability', 'credit', 'Amounts owed to subcontractors, vendors, and suppliers')
  returning id into v_ap_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values (p_company_id, '2010', 'Retainage Payable', 'liability', 'current_liability', v_ap_id, 'credit', 'Retainage withheld from subcontractor payments');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '2100', 'Accrued Expenses', 'liability', 'current_liability', 'credit', 'Expenses incurred but not yet paid')
  returning id into v_accrued_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values
    (p_company_id, '2110', 'Accrued Payroll', 'liability', 'current_liability', v_accrued_id, 'credit', 'Wages and salaries earned by employees but not yet paid'),
    (p_company_id, '2120', 'Accrued Taxes', 'liability', 'current_liability', v_accrued_id, 'credit', 'Taxes owed but not yet remitted to taxing authorities');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '2200', 'Short-Term Debt', 'liability', 'current_liability', 'credit', 'Lines of credit and loans due within one year');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '2300', 'Long-Term Debt', 'liability', 'long_term_liability', 'credit', 'Mortgages, equipment loans, and other obligations due beyond one year');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '2400', 'Customer Deposits', 'liability', 'current_liability', 'credit', 'Advance payments received from clients before work is performed');

  -- --------------------------------------------------------
  -- EQUITY (3000-3999)
  -- --------------------------------------------------------

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '3000', 'Owner''s Equity', 'equity', 'owners_equity', 'credit', 'Owner investment and capital contributions');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '3100', 'Retained Earnings', 'equity', 'retained_earnings', 'credit', 'Cumulative net income retained in the business from prior periods');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '3200', 'Current Year Earnings', 'equity', 'retained_earnings', 'credit', 'Net income or loss for the current fiscal year');

  -- --------------------------------------------------------
  -- REVENUE (4000-4999)
  -- --------------------------------------------------------

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '4000', 'Contract Revenue', 'revenue', 'operating_revenue', 'credit', 'Revenue recognized from construction contracts using percentage-of-completion or completed-contract method');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '4010', 'Change Order Revenue', 'revenue', 'operating_revenue', 'credit', 'Revenue from approved change orders on construction contracts');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '4100', 'Service Revenue', 'revenue', 'operating_revenue', 'credit', 'Revenue from maintenance, consulting, and other service work');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '4200', 'Rental Income', 'revenue', 'other_revenue', 'credit', 'Income from equipment rental or property leasing');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '4300', 'Other Income', 'revenue', 'other_revenue', 'credit', 'Miscellaneous income not classified elsewhere');

  -- --------------------------------------------------------
  -- COST OF CONSTRUCTION (5000-5999) - CSI MasterFormat
  -- --------------------------------------------------------

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5000', 'General Requirements (Division 01)', 'expense', 'cost_of_construction', 'debit', 'Project overhead including temporary facilities, project management, and general conditions')
  returning id into v_general_req_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5010', 'Site Construction (Division 02)', 'expense', 'cost_of_construction', 'debit', 'Earthwork, demolition, site clearing, grading, and utilities');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5020', 'Concrete (Division 03)', 'expense', 'cost_of_construction', 'debit', 'Formwork, reinforcement, cast-in-place concrete, and precast');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5030', 'Masonry (Division 04)', 'expense', 'cost_of_construction', 'debit', 'Brick, block, stone, and mortar work');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5040', 'Metals (Division 05)', 'expense', 'cost_of_construction', 'debit', 'Structural steel, metal fabrication, and miscellaneous metals');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5050', 'Wood and Plastics (Division 06)', 'expense', 'cost_of_construction', 'debit', 'Rough and finish carpentry, millwork, and plastic fabrications');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5060', 'Thermal and Moisture Protection (Division 07)', 'expense', 'cost_of_construction', 'debit', 'Waterproofing, insulation, roofing, siding, and sealants');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5070', 'Doors and Windows (Division 08)', 'expense', 'cost_of_construction', 'debit', 'Doors, windows, frames, hardware, and glazing');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5080', 'Finishes (Division 09)', 'expense', 'cost_of_construction', 'debit', 'Drywall, plaster, tile, flooring, painting, and wall coverings');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5090', 'Specialties (Division 10)', 'expense', 'cost_of_construction', 'debit', 'Signage, lockers, toilet accessories, and other specialties');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5100', 'Equipment (Division 11)', 'expense', 'cost_of_construction', 'debit', 'Built-in equipment including kitchen, laundry, and industrial equipment');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5110', 'Furnishings (Division 12)', 'expense', 'cost_of_construction', 'debit', 'Furniture, window treatments, and casework');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5120', 'Special Construction (Division 13)', 'expense', 'cost_of_construction', 'debit', 'Clean rooms, pre-engineered structures, and special purpose rooms');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5130', 'Conveying Systems (Division 14)', 'expense', 'cost_of_construction', 'debit', 'Elevators, escalators, dumbwaiters, and material handling systems');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5200', 'Mechanical (Divisions 21-23)', 'expense', 'cost_of_construction', 'debit', 'Fire suppression, plumbing, HVAC, and mechanical systems');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '5300', 'Electrical (Divisions 26-28)', 'expense', 'cost_of_construction', 'debit', 'Electrical power, lighting, communications, and electronic safety systems');

  -- --------------------------------------------------------
  -- OPERATING EXPENSES (6000-6999)
  -- --------------------------------------------------------

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6000', 'Payroll Expenses', 'expense', 'operating_expense', 'debit', 'Salaries and wages for office and field employees');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6010', 'Payroll Taxes', 'expense', 'operating_expense', 'debit', 'Employer share of FICA, FUTA, SUTA, and other payroll taxes');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6020', 'Employee Benefits', 'expense', 'operating_expense', 'debit', 'Health insurance, retirement contributions, and other employee benefits');

  -- Vehicle Expenses group
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6100', 'Vehicle Expenses', 'expense', 'operating_expense', 'debit', 'All costs related to company vehicle operations')
  returning id into v_vehicle_exp_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values
    (p_company_id, '6110', 'Fuel', 'expense', 'operating_expense', v_vehicle_exp_id, 'debit', 'Gasoline, diesel, and other fuel costs for company vehicles'),
    (p_company_id, '6120', 'Vehicle Insurance', 'expense', 'operating_expense', v_vehicle_exp_id, 'debit', 'Insurance premiums for company vehicles'),
    (p_company_id, '6130', 'Vehicle Maintenance', 'expense', 'operating_expense', v_vehicle_exp_id, 'debit', 'Repairs, tires, oil changes, and other vehicle upkeep');

  -- Office Expenses group
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6200', 'Office Expenses', 'expense', 'operating_expense', 'debit', 'General office operating costs')
  returning id into v_office_exp_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values
    (p_company_id, '6210', 'Rent', 'expense', 'operating_expense', v_office_exp_id, 'debit', 'Office and yard space rental payments'),
    (p_company_id, '6220', 'Utilities', 'expense', 'operating_expense', v_office_exp_id, 'debit', 'Electric, gas, water, and sewer for office locations'),
    (p_company_id, '6230', 'Office Supplies', 'expense', 'operating_expense', v_office_exp_id, 'debit', 'Paper, toner, pens, and general office consumables'),
    (p_company_id, '6240', 'Phone and Internet', 'expense', 'operating_expense', v_office_exp_id, 'debit', 'Telephone, cell phone, and internet service');

  -- Insurance group
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6300', 'Insurance', 'expense', 'operating_expense', 'debit', 'Business insurance premiums')
  returning id into v_insurance_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values
    (p_company_id, '6310', 'General Liability Insurance', 'expense', 'operating_expense', v_insurance_id, 'debit', 'Commercial general liability coverage'),
    (p_company_id, '6320', 'Workers Compensation', 'expense', 'operating_expense', v_insurance_id, 'debit', 'Workers compensation insurance premiums'),
    (p_company_id, '6330', 'Professional Liability', 'expense', 'operating_expense', v_insurance_id, 'debit', 'Errors and omissions or professional liability coverage');

  -- Professional Services group
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6400', 'Professional Services', 'expense', 'operating_expense', 'debit', 'Outside professional service fees')
  returning id into v_professional_id;

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, normal_balance, description)
  values
    (p_company_id, '6410', 'Legal Fees', 'expense', 'operating_expense', v_professional_id, 'debit', 'Attorneys fees for contracts, disputes, and compliance'),
    (p_company_id, '6420', 'Accounting Fees', 'expense', 'operating_expense', v_professional_id, 'debit', 'CPA, bookkeeping, tax preparation, and audit fees');

  -- Remaining operating expenses (no parent grouping needed)
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6500', 'Marketing and Advertising', 'expense', 'operating_expense', 'debit', 'Advertising, website, trade shows, and business development');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6600', 'Travel and Entertainment', 'expense', 'operating_expense', 'debit', 'Business travel, meals, and client entertainment');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6700', 'Depreciation Expense', 'expense', 'operating_expense', 'debit', 'Periodic depreciation of fixed assets');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6800', 'Interest Expense', 'expense', 'other_expense', 'debit', 'Interest paid on loans, lines of credit, and other debt');

  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description)
  values (p_company_id, '6900', 'Other Expenses', 'expense', 'other_expense', 'debit', 'Miscellaneous expenses not classified elsewhere');

end;
$$ language plpgsql;

-- Add a comment for discoverability
comment on function seed_company_chart_of_accounts(uuid) is
  'Seeds the standard CSI MasterFormat-based chart of accounts for a newly created company. Call this during company onboarding.';


-- ============================================================
-- 2. DEFAULT ROLES AND PERMISSIONS
-- ============================================================

create table if not exists role_permission_defaults (
  role text primary key,
  permissions jsonb not null,
  description text
);

insert into role_permission_defaults (role, permissions, description)
values
  (
    'owner',
    '[
      "projects.read", "projects.write", "projects.delete",
      "properties.read", "properties.write", "properties.delete",
      "financial.read", "financial.write", "financial.delete",
      "documents.read", "documents.write", "documents.delete",
      "people.read", "people.write", "people.delete",
      "crm.read", "crm.write", "crm.delete",
      "reports.read", "reports.export",
      "ai.read", "ai.write", "ai.configure",
      "admin.company", "admin.billing", "admin.members", "admin.roles", "admin.settings", "admin.delete_company",
      "content.read", "content.write", "content.publish",
      "seo.read", "seo.write"
    ]'::jsonb,
    'Full access to all features including company deletion and billing management'
  ),
  (
    'admin',
    '[
      "projects.read", "projects.write", "projects.delete",
      "properties.read", "properties.write", "properties.delete",
      "financial.read", "financial.write", "financial.delete",
      "documents.read", "documents.write", "documents.delete",
      "people.read", "people.write", "people.delete",
      "crm.read", "crm.write", "crm.delete",
      "reports.read", "reports.export",
      "ai.read", "ai.write", "ai.configure",
      "admin.company", "admin.members", "admin.roles", "admin.settings",
      "content.read", "content.write", "content.publish",
      "seo.read", "seo.write"
    ]'::jsonb,
    'Full access except company deletion and billing management'
  ),
  (
    'project_manager',
    '[
      "projects.read", "projects.write",
      "documents.read", "documents.write",
      "people.read", "people.write",
      "crm.read", "crm.write",
      "financial.read",
      "reports.read", "reports.export",
      "ai.read", "ai.write"
    ]'::jsonb,
    'Manages projects, tasks, daily logs, RFIs, change orders, submittals, contacts, time entries, documents, CRM, and reports'
  ),
  (
    'superintendent',
    '[
      "projects.read", "projects.write",
      "documents.read", "documents.write",
      "people.read",
      "ai.read"
    ]'::jsonb,
    'Manages assigned projects, tasks, daily logs, safety inspections, time entries, contacts, and documents'
  ),
  (
    'accountant',
    '[
      "financial.read", "financial.write",
      "reports.read", "reports.export",
      "documents.read",
      "ai.read"
    ]'::jsonb,
    'Full access to chart of accounts, journal entries, invoices, payments, budgets, and financial reports'
  ),
  (
    'field_worker',
    '[
      "projects.read",
      "documents.read", "documents.write",
      "ai.read"
    ]'::jsonb,
    'Can view assigned projects, submit own time entries and daily logs, complete safety checklists, and upload documents'
  ),
  (
    'viewer',
    '[
      "projects.read",
      "documents.read",
      "reports.read"
    ]'::jsonb,
    'Read-only access to assigned projects, documents, and reports'
  )
on conflict (role) do nothing;

comment on table role_permission_defaults is
  'Reference table of default permission sets by role. Application code uses this to populate company_members.permissions when a member is assigned a role.';


-- ============================================================
-- 3. CMS HOMEPAGE AND PAGE SEEDS
-- ============================================================

-- Homepage (published)
insert into cms_pages (page_slug, title, status, published_at, meta_title, meta_description, sections)
values (
  'homepage',
  'ConstructionERP - Build Smarter',
  'published',
  now(),
  'ConstructionERP - Construction Project Management and Real Estate Operations',
  'All-in-one platform for construction project management, financial tracking, real estate operations, and team collaboration. Streamline your business from bid to closeout.',
  '[
    {
      "type": "hero",
      "order": 1,
      "visible": true,
      "content": {
        "headline": "Build Smarter. Manage Everything.",
        "subheadline": "The all-in-one platform for construction project management, financial tracking, and real estate operations. From pre-construction to closeout, keep your entire business in one place.",
        "cta_text": "Start Free Trial",
        "cta_url": "/signup",
        "secondary_cta_text": "Request a Demo",
        "secondary_cta_url": "/demo"
      }
    },
    {
      "type": "features",
      "order": 2,
      "visible": true,
      "content": {
        "section_title": "Everything You Need to Run Your Construction Business",
        "section_subtitle": "Purpose-built tools for general contractors, specialty contractors, and real estate operators.",
        "features": [
          {
            "title": "Project Management",
            "description": "Gantt charts, task tracking, daily logs, RFIs, change orders, and submittals. Keep every project on schedule and on budget.",
            "icon": "clipboard-check"
          },
          {
            "title": "Financial Management",
            "description": "CSI MasterFormat chart of accounts, job costing, AIA billing, accounts payable and receivable, and real-time budget tracking.",
            "icon": "currency-dollar"
          },
          {
            "title": "Real Estate Operations",
            "description": "Property management, lease tracking, rent collection, maintenance requests, and portfolio-level financial reporting.",
            "icon": "building-office"
          },
          {
            "title": "Team Collaboration",
            "description": "Role-based access control, field-to-office communication, time tracking with GPS, and document management.",
            "icon": "users"
          },
          {
            "title": "CRM and Estimating",
            "description": "Lead tracking, opportunity pipeline, bid management, and client relationship tools to win more work.",
            "icon": "chart-bar"
          },
          {
            "title": "AI-Powered Insights",
            "description": "Connect your preferred AI provider for document analysis, cost predictions, and natural-language queries across your project data.",
            "icon": "cpu-chip"
          }
        ]
      }
    },
    {
      "type": "stats",
      "order": 3,
      "visible": true,
      "content": {
        "section_title": "Trusted by Construction Professionals",
        "metrics": [
          {"value": "500+", "label": "Projects Managed"},
          {"value": "98%", "label": "On-Time Delivery Rate"},
          {"value": "$2B+", "label": "Total Contract Value Tracked"},
          {"value": "15,000+", "label": "Daily Logs Submitted"}
        ]
      }
    },
    {
      "type": "testimonials",
      "order": 4,
      "visible": true,
      "content": {
        "section_title": "What Our Customers Say",
        "testimonials": [
          {
            "quote": "ConstructionERP replaced four different software tools for us. Everything from daily logs to job costing is in one place now.",
            "author": "Project Manager",
            "company": "General Contractor",
            "role": "Commercial Construction"
          },
          {
            "quote": "The financial tracking alone paid for itself in the first month. We caught cost overruns weeks earlier than we used to.",
            "author": "Controller",
            "company": "Specialty Contractor",
            "role": "Mechanical and Plumbing"
          },
          {
            "quote": "Our field teams actually use it. The mobile daily logs and time tracking are straightforward and fast.",
            "author": "Superintendent",
            "company": "Residential Builder",
            "role": "Custom Homes"
          }
        ]
      }
    },
    {
      "type": "cta",
      "order": 5,
      "visible": true,
      "content": {
        "headline": "Ready to Streamline Your Operations?",
        "subheadline": "Start your free 14-day trial. No credit card required. Full access to all features.",
        "cta_text": "Get Started Free",
        "cta_url": "/signup"
      }
    }
  ]'::jsonb
)
on conflict (page_slug) do nothing;

-- Features page (draft)
insert into cms_pages (page_slug, title, status, meta_title, meta_description, sections)
values (
  'features',
  'Features - ConstructionERP',
  'draft',
  'Features - Construction Project Management Software',
  'Explore the full feature set of ConstructionERP: project management, financial tracking, real estate operations, CRM, document management, and AI-powered insights.',
  '[
    {
      "type": "hero",
      "order": 1,
      "visible": true,
      "content": {
        "headline": "Powerful Features for Every Phase of Construction",
        "subheadline": "From pre-construction planning through project closeout and property management, ConstructionERP covers every aspect of your business."
      }
    },
    {
      "type": "feature_detail",
      "order": 2,
      "visible": true,
      "content": {
        "categories": [
          {
            "name": "Project Management",
            "features": [
              "Gantt chart scheduling with critical path",
              "Task assignment and progress tracking",
              "Daily logs with weather, workforce, and equipment tracking",
              "RFI creation and response workflow",
              "Change order management with cost and schedule impact",
              "Submittal tracking and review",
              "Punch list management",
              "Safety inspection checklists"
            ]
          },
          {
            "name": "Financial Management",
            "features": [
              "CSI MasterFormat chart of accounts",
              "Double-entry journal entries",
              "Accounts payable and receivable",
              "Job cost tracking by CSI division",
              "Project budgets with variance analysis",
              "Payment processing and tracking",
              "Retainage management",
              "Bank account reconciliation"
            ]
          },
          {
            "name": "Real Estate Operations",
            "features": [
              "Property portfolio management",
              "Unit tracking and availability",
              "Lease management with auto-renewal",
              "Rent collection and payment tracking",
              "Maintenance request workflow",
              "Occupancy and NOI reporting",
              "Tenant portal access"
            ]
          },
          {
            "name": "People and Resources",
            "features": [
              "Contact management for subs, vendors, and clients",
              "Time tracking with GPS location",
              "Certification and license tracking with expiration alerts",
              "Equipment management and assignment",
              "Vendor contract management",
              "Role-based access control"
            ]
          }
        ]
      }
    }
  ]'::jsonb
)
on conflict (page_slug) do nothing;

-- Pricing page (draft)
insert into cms_pages (page_slug, title, status, meta_title, meta_description, sections)
values (
  'pricing',
  'Pricing - ConstructionERP',
  'draft',
  'Pricing Plans - Construction Project Management Software',
  'Simple, transparent pricing for construction companies of all sizes. Start free and scale as you grow.',
  '[
    {
      "type": "hero",
      "order": 1,
      "visible": true,
      "content": {
        "headline": "Simple, Transparent Pricing",
        "subheadline": "Choose the plan that fits your business. All plans include a 14-day free trial."
      }
    },
    {
      "type": "pricing_table",
      "order": 2,
      "visible": true,
      "content": {
        "plans": [
          {
            "name": "Starter",
            "description": "For small contractors and single-project teams",
            "features": [
              "Up to 3 active projects",
              "5 team members",
              "Basic financial tracking",
              "Document storage (5 GB)",
              "Email support"
            ]
          },
          {
            "name": "Professional",
            "description": "For growing contractors and property managers",
            "highlighted": true,
            "features": [
              "Unlimited projects",
              "25 team members",
              "Full financial suite",
              "Document storage (50 GB)",
              "Real estate module",
              "CRM and bid management",
              "Priority support"
            ]
          },
          {
            "name": "Enterprise",
            "description": "For large contractors and multi-entity organizations",
            "features": [
              "Unlimited everything",
              "Unlimited team members",
              "Advanced reporting and analytics",
              "Document storage (500 GB)",
              "AI-powered insights",
              "Custom integrations",
              "Dedicated account manager",
              "SSO and advanced security"
            ]
          }
        ]
      }
    },
    {
      "type": "faq",
      "order": 3,
      "visible": true,
      "content": {
        "questions": [
          {
            "question": "Can I switch plans at any time?",
            "answer": "Yes. You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle."
          },
          {
            "question": "Is there a long-term contract?",
            "answer": "No. All plans are month-to-month with no long-term commitment. Annual billing is available at a discount."
          },
          {
            "question": "What happens when my trial ends?",
            "answer": "After your 14-day trial, you can choose a plan to continue. Your data is preserved for 30 days if you need more time to decide."
          }
        ]
      }
    }
  ]'::jsonb
)
on conflict (page_slug) do nothing;

-- About page (draft)
insert into cms_pages (page_slug, title, status, meta_title, meta_description, sections)
values (
  'about',
  'About - ConstructionERP',
  'draft',
  'About ConstructionERP - Built for the Construction Industry',
  'ConstructionERP was built by construction professionals who understand the challenges of managing projects, finances, and properties. Learn more about our mission.',
  '[
    {
      "type": "hero",
      "order": 1,
      "visible": true,
      "content": {
        "headline": "Built by Construction Professionals, for Construction Professionals",
        "subheadline": "We understand the unique challenges of managing construction projects and real estate operations because we have lived them."
      }
    },
    {
      "type": "story",
      "order": 2,
      "visible": true,
      "content": {
        "title": "Our Mission",
        "body": "Construction companies deserve software that works the way they do. Too many tools are built for generic project management and force contractors to adapt their workflows. ConstructionERP is purpose-built for the construction and real estate industries, with native support for CSI MasterFormat cost codes, AIA billing, retainage tracking, daily field logs, and everything else that makes this industry unique."
      }
    },
    {
      "type": "values",
      "order": 3,
      "visible": true,
      "content": {
        "title": "What We Stand For",
        "values": [
          {
            "title": "Industry-First Design",
            "description": "Every feature is designed around how construction professionals actually work, from the field to the back office."
          },
          {
            "title": "Data Ownership",
            "description": "Your data belongs to you. Export anything, anytime. No vendor lock-in."
          },
          {
            "title": "Continuous Improvement",
            "description": "We ship updates every week based on direct feedback from contractors and property managers."
          }
        ]
      }
    }
  ]'::jsonb
)
on conflict (page_slug) do nothing;


-- ============================================================
-- 4. PLATFORM ANNOUNCEMENT
-- ============================================================

insert into platform_announcements (title, content, target_audience, is_active, published_at)
values (
  'Welcome to ConstructionERP',
  'Your all-in-one platform for construction project management and real estate operations. Get started by creating your first project or importing your existing data. Visit the Help Center for step-by-step guides on setting up your chart of accounts, inviting team members, and configuring your first project.',
  'all',
  true,
  now()
);
