-- ============================================================
-- Buildwrk Database Schema
-- Multi-tenant SaaS with RLS
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- COMPANY & ORGANIZATION
-- ============================================================

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  country text default 'US',
  phone text,
  website text,
  fiscal_year_start int default 1, -- month number
  currency text default 'USD',
  timezone text default 'America/Chicago',
  subscription_plan text default 'starter', -- starter, professional, enterprise
  subscription_status text default 'active', -- active, trial, past_due, canceled
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  industry_type text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  job_title text,
  preferences jsonb default '{}',
  is_platform_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table company_members (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer', -- owner, admin, project_manager, superintendent, accountant, field_worker, viewer
  permissions jsonb default '[]',
  is_active boolean default true,
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(company_id, user_id)
);

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb default '{}',
  ip_address inet,
  created_at timestamptz default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================

create table projects (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text, -- e.g., "RSC-001"
  description text,
  status text default 'pre_construction', -- pre_construction, active, on_hold, completed, closed
  project_type text, -- commercial, residential, industrial, infrastructure, renovation
  address_line1 text,
  city text,
  state text,
  zip text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  client_name text,
  client_contact text,
  client_email text,
  client_phone text,
  contract_amount numeric(14,2) default 0,
  estimated_cost numeric(14,2) default 0,
  actual_cost numeric(14,2) default 0,
  start_date date,
  estimated_end_date date,
  actual_end_date date,
  completion_pct numeric(5,2) default 0,
  project_manager_id uuid references auth.users(id),
  superintendent_id uuid references auth.users(id),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table project_phases (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  color text default '#3b82f6',
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table project_tasks (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  phase_id uuid references project_phases(id) on delete set null,
  parent_task_id uuid references project_tasks(id) on delete cascade,
  name text not null,
  description text,
  status text default 'not_started', -- not_started, in_progress, completed, blocked
  priority text default 'medium', -- low, medium, high, critical
  assigned_to uuid references auth.users(id),
  start_date date,
  end_date date,
  duration_days int,
  completion_pct numeric(5,2) default 0,
  is_milestone boolean default false,
  is_critical_path boolean default false,
  dependency_ids uuid[] default '{}',
  sort_order int default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table daily_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  log_date date not null,
  created_by uuid not null references auth.users(id),
  weather_temp_high numeric(5,1),
  weather_temp_low numeric(5,1),
  weather_conditions text, -- clear, cloudy, rain, snow, wind
  weather_wind_mph numeric(5,1),
  weather_humidity_pct numeric(5,1),
  workforce jsonb default '[]', -- [{trade, company, headcount, hours}]
  equipment jsonb default '[]', -- [{name, hours, status}]
  work_performed text,
  materials_received text,
  visitors jsonb default '[]',
  safety_incidents text,
  delays text,
  photos jsonb default '[]', -- [{url, caption, taken_at}]
  signature_url text,
  status text default 'draft', -- draft, submitted, approved
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table rfis (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  rfi_number text not null,
  subject text not null,
  question text not null,
  answer text,
  status text default 'open', -- open, answered, closed
  priority text default 'medium',
  submitted_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  due_date date,
  answered_at timestamptz,
  answered_by uuid references auth.users(id),
  cost_impact numeric(14,2),
  schedule_impact_days int,
  attachments jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table change_orders (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  co_number text not null,
  title text not null,
  description text,
  status text default 'draft', -- draft, submitted, approved, rejected
  reason text, -- owner_request, design_change, unforeseen_condition, value_engineering
  amount numeric(14,2) default 0,
  schedule_impact_days int default 0,
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  line_items jsonb default '[]', -- [{description, quantity, unit, unit_cost, total}]
  attachments jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table submittals (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  submittal_number text not null,
  title text not null,
  spec_section text,
  status text default 'pending', -- pending, under_review, approved, rejected, resubmit
  submitted_by uuid references auth.users(id),
  reviewer_id uuid references auth.users(id),
  due_date date,
  reviewed_at timestamptz,
  review_comments text,
  attachments jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table punch_list_items (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  description text not null,
  location text,
  trade text,
  status text default 'open', -- open, in_progress, completed, verified
  priority text default 'medium',
  assigned_to uuid references auth.users(id),
  due_date date,
  photos jsonb default '[]',
  completed_at timestamptz,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table safety_inspections (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  inspection_date date not null,
  inspector_id uuid not null references auth.users(id),
  inspection_type text, -- daily, weekly, osha, client
  score numeric(5,2),
  checklist jsonb default '[]', -- [{item, passed, notes}]
  findings text,
  corrective_actions text,
  photos jsonb default '[]',
  status text default 'completed',
  created_at timestamptz default now()
);

create table project_budget_lines (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  csi_code text, -- CSI MasterFormat division code
  description text not null,
  budgeted_amount numeric(14,2) default 0,
  committed_amount numeric(14,2) default 0,
  actual_amount numeric(14,2) default 0,
  variance numeric(14,2) generated always as (budgeted_amount - actual_amount) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROPERTIES & REAL ESTATE
-- ============================================================

create table properties (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  property_type text, -- residential, commercial, industrial, mixed_use
  address_line1 text,
  city text,
  state text,
  zip text,
  year_built int,
  total_sqft numeric(12,2),
  total_units int default 0,
  occupied_units int default 0,
  occupancy_rate numeric(5,2) generated always as (
    case when total_units > 0 then (occupied_units::numeric / total_units * 100) else 0 end
  ) stored,
  purchase_price numeric(14,2),
  current_value numeric(14,2),
  monthly_revenue numeric(14,2) default 0,
  monthly_expenses numeric(14,2) default 0,
  noi numeric(14,2) generated always as (monthly_revenue - monthly_expenses) stored,
  manager_id uuid references auth.users(id),
  photos jsonb default '[]',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table units (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_number text not null,
  unit_type text, -- studio, 1br, 2br, 3br, office, retail, warehouse
  sqft numeric(10,2),
  bedrooms int,
  bathrooms numeric(3,1),
  floor_number int,
  market_rent numeric(10,2),
  status text default 'vacant', -- vacant, occupied, maintenance, reserved
  current_tenant_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table leases (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  tenant_name text not null,
  tenant_email text,
  tenant_phone text,
  tenant_user_id uuid references auth.users(id), -- if tenant has portal access
  lease_start date not null,
  lease_end date not null,
  monthly_rent numeric(10,2) not null,
  security_deposit numeric(10,2),
  status text default 'active', -- active, expired, terminated, pending
  auto_renew boolean default false,
  renewal_terms text,
  lease_document_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid references units(id),
  title text not null,
  description text,
  category text, -- plumbing, electrical, hvac, appliance, structural, general
  priority text default 'medium', -- low, medium, high, emergency
  status text default 'submitted', -- submitted, assigned, in_progress, completed, closed
  requested_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  scheduled_date date,
  completed_at timestamptz,
  photos jsonb default '[]',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table rent_payments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_date date not null,
  due_date date not null,
  method text, -- check, ach, credit_card, cash
  status text default 'paid', -- paid, pending, late, failed
  reference_number text,
  late_fee numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- FINANCIAL MANAGEMENT
-- ============================================================

create table chart_of_accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  account_number text not null,
  name text not null,
  account_type text not null, -- asset, liability, equity, revenue, expense
  sub_type text, -- current_asset, fixed_asset, accounts_payable, etc.
  parent_id uuid references chart_of_accounts(id),
  is_active boolean default true,
  description text,
  normal_balance text default 'debit', -- debit, credit
  created_at timestamptz default now(),
  unique(company_id, account_number)
);

create table journal_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  entry_number text not null,
  entry_date date not null,
  description text,
  reference text,
  project_id uuid references projects(id),
  status text default 'draft', -- draft, posted, voided
  posted_by uuid references auth.users(id),
  posted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table journal_entry_lines (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  debit numeric(14,2) default 0,
  credit numeric(14,2) default 0,
  description text,
  project_id uuid references projects(id),
  property_id uuid references properties(id),
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  invoice_number text not null,
  invoice_type text not null, -- payable, receivable
  vendor_name text,
  vendor_id uuid,
  client_name text,
  project_id uuid references projects(id),
  property_id uuid references properties(id),
  invoice_date date not null,
  due_date date not null,
  subtotal numeric(14,2) default 0,
  tax_amount numeric(14,2) default 0,
  total_amount numeric(14,2) default 0,
  amount_paid numeric(14,2) default 0,
  balance_due numeric(14,2) generated always as (total_amount - amount_paid) stored,
  status text default 'draft', -- draft, pending, approved, paid, overdue, voided
  line_items jsonb default '[]', -- [{description, quantity, unit_price, amount, csi_code}]
  notes text,
  attachments jsonb default '[]',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  invoice_id uuid references invoices(id),
  payment_date date not null,
  amount numeric(14,2) not null,
  method text, -- check, ach, wire, credit_card
  reference_number text,
  bank_account_id uuid,
  notes text,
  created_at timestamptz default now()
);

create table bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  bank_name text,
  account_number_last4 text,
  routing_number_last4 text,
  account_type text, -- checking, savings
  current_balance numeric(14,2) default 0,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table budgets (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  fiscal_year int not null,
  project_id uuid references projects(id),
  property_id uuid references properties(id),
  line_items jsonb default '[]', -- [{account_id, jan, feb, ..., dec}]
  status text default 'draft', -- draft, approved, active
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PEOPLE & CONTACTS
-- ============================================================

create table contacts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_type text not null, -- employee, subcontractor, vendor, client, tenant
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  company_name text,
  job_title text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  is_active boolean default true,
  user_id uuid references auth.users(id), -- linked portal user if applicable
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  project_id uuid references projects(id),
  entry_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  hours numeric(5,2),
  break_minutes int default 0,
  work_type text, -- regular, overtime, double_time
  cost_code text,
  notes text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  status text default 'pending', -- pending, approved, rejected
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table certifications (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  cert_type text not null, -- osha_10, osha_30, first_aid, cpr, license, insurance
  cert_name text not null,
  issuing_authority text,
  cert_number text,
  issued_date date,
  expiry_date date,
  document_url text,
  status text default 'valid', -- computed at query time via view/app logic (expired, expiring_soon, valid)
  created_at timestamptz default now()
);

create table equipment (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  equipment_type text,
  make text,
  model text,
  serial_number text,
  status text default 'available', -- available, in_use, maintenance, retired
  current_project_id uuid references projects(id),
  assigned_to uuid references auth.users(id),
  purchase_date date,
  purchase_cost numeric(14,2),
  hourly_rate numeric(10,2),
  total_hours numeric(10,2) default 0,
  last_maintenance_date date,
  next_maintenance_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table vendor_contracts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  vendor_id uuid not null references contacts(id) on delete cascade,
  project_id uuid references projects(id),
  contract_number text,
  title text not null,
  contract_type text, -- subcontract, purchase_order, service_agreement
  amount numeric(14,2) default 0,
  status text default 'active', -- draft, active, completed, terminated
  start_date date,
  end_date date,
  scope_of_work text,
  retention_pct numeric(5,2) default 0,
  insurance_required boolean default true,
  insurance_expiry date,
  document_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CRM & BUSINESS DEVELOPMENT
-- ============================================================

create table opportunities (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  client_name text,
  client_contact text,
  client_email text,
  client_phone text,
  project_type text,
  estimated_value numeric(14,2),
  probability_pct numeric(5,2) default 50,
  weighted_value numeric(14,2) generated always as (estimated_value * probability_pct / 100) stored,
  stage text default 'lead', -- lead, qualification, proposal, negotiation, won, lost
  source text, -- referral, website, cold_call, repeat_client
  assigned_to uuid references auth.users(id),
  expected_close_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table bids (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  opportunity_id uuid references opportunities(id),
  bid_number text not null,
  project_name text not null,
  client_name text,
  bid_date date,
  due_date date,
  status text default 'in_progress', -- in_progress, submitted, won, lost, no_bid
  estimated_cost numeric(14,2) default 0,
  bid_amount numeric(14,2) default 0,
  margin_pct numeric(5,2) generated always as (
    case when bid_amount > 0 then ((bid_amount - estimated_cost) / bid_amount * 100) else 0 end
  ) stored,
  scope_description text,
  line_items jsonb default '[]',
  attachments jsonb default '[]',
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTS & SYSTEM
-- ============================================================

create table documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid references projects(id),
  property_id uuid references properties(id),
  name text not null,
  file_path text not null, -- Supabase Storage path
  file_type text, -- pdf, dwg, xlsx, docx, jpg, png
  file_size bigint,
  folder_path text default '/',
  category text, -- plan, spec, contract, photo, report, correspondence
  version int default 1,
  uploaded_by uuid references auth.users(id),
  tags text[] default '{}',
  ai_extracted_data jsonb, -- AI-processed metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  title text not null,
  message text,
  notification_type text, -- approval, mention, deadline, alert, system
  entity_type text,
  entity_id uuid,
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table comments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  entity_type text not null, -- project, rfi, change_order, daily_log, maintenance_request
  entity_id uuid not null,
  user_id uuid not null references auth.users(id),
  content text not null,
  attachments jsonb default '[]',
  parent_id uuid references comments(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- AI & INTEGRATIONS
-- ============================================================

create table ai_provider_configs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  provider_name text not null, -- openai, anthropic, google, deepseek, mistral, cohere, groq, perplexity, xai, bedrock
  api_key_encrypted text not null,
  model_id text not null,
  is_active boolean default true,
  use_for_chat boolean default false,
  use_for_documents boolean default false,
  use_for_predictions boolean default false,
  is_default boolean default false,
  monthly_budget_limit numeric(10,2),
  current_month_usage numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  title text,
  provider_name text,
  model_id text,
  messages jsonb default '[]', -- [{role, content, timestamp}]
  context jsonb default '{}', -- {project_id, page, filters}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ai_usage_log (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id),
  provider_name text not null,
  model_id text not null,
  task_type text, -- chat, document, prediction
  input_tokens int default 0,
  output_tokens int default 0,
  estimated_cost numeric(8,4) default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- CONTENT MANAGEMENT & SEO
-- ============================================================

create table cms_pages (
  id uuid primary key default uuid_generate_v4(),
  page_slug text unique not null, -- 'homepage', 'features', 'pricing', 'about'
  title text not null,
  sections jsonb default '[]', -- [{type, content, order, visible}]
  meta_title text,
  meta_description text,
  og_image_url text,
  status text default 'draft', -- draft, published
  published_at timestamptz,
  published_by uuid references auth.users(id),
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table cms_media (
  id uuid primary key default uuid_generate_v4(),
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  alt_text text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table seo_keywords (
  id uuid primary key default uuid_generate_v4(),
  keyword text not null,
  search_volume int,
  current_position int,
  previous_position int,
  difficulty int,
  intent text, -- informational, commercial, transactional, navigational
  target_url text,
  tracked_since date default current_date,
  last_checked timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SUBSCRIPTIONS & PLATFORM (Super Admin)
-- ============================================================

create table subscription_events (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  event_type text not null, -- created, upgraded, downgraded, canceled, payment_failed, renewed
  plan_from text,
  plan_to text,
  amount numeric(10,2),
  stripe_event_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table platform_announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  target_audience text default 'all', -- all, enterprise, professional, starter
  is_active boolean default true,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Certification status computed dynamically (current_date is not immutable for generated columns)
create or replace view certifications_with_status as
select *,
  case
    when expiry_date is null then 'valid'
    when expiry_date < current_date then 'expired'
    when expiry_date < current_date + interval '30 days' then 'expiring_soon'
    else 'valid'
  end as computed_status
from certifications;

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_company_members_company on company_members(company_id);
create index idx_company_members_user on company_members(user_id);
create index idx_projects_company on projects(company_id);
create index idx_projects_status on projects(company_id, status);
create index idx_project_tasks_project on project_tasks(project_id);
create index idx_daily_logs_project_date on daily_logs(project_id, log_date);
create index idx_rfis_project on rfis(project_id);
create index idx_change_orders_project on change_orders(project_id);
create index idx_properties_company on properties(company_id);
create index idx_units_property on units(property_id);
create index idx_leases_property on leases(property_id);
create index idx_leases_unit on leases(unit_id);
create index idx_maintenance_property on maintenance_requests(property_id);
create index idx_invoices_company on invoices(company_id);
create index idx_invoices_project on invoices(project_id);
create index idx_invoices_status on invoices(company_id, status);
create index idx_time_entries_user_date on time_entries(user_id, entry_date);
create index idx_documents_company on documents(company_id);
create index idx_documents_project on documents(project_id);
create index idx_notifications_user on notifications(user_id, is_read);
create index idx_comments_entity on comments(entity_type, entity_id);
create index idx_audit_log_company on audit_log(company_id, created_at desc);
create index idx_opportunities_company on opportunities(company_id, stage);
create index idx_bids_company on bids(company_id, status);
create index idx_ai_usage_company on ai_usage_log(company_id, created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to all tables with updated_at
do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where column_name = 'updated_at'
    and table_schema = 'public'
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on %I for each row execute function update_updated_at()',
      t, t
    );
  end loop;
end;
$$;
