-- Migration 029: GAAP Accounting Schema
-- Adds lease revenue schedule, equipment depreciation fields, JE link columns, and GL account seeds

-- ============================================================
-- 1. Lease Revenue Schedule Table
-- One row per month per lease, tracking deferred → recognized → collected
-- ============================================================

create table if not exists lease_revenue_schedule (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  property_id uuid not null references properties(id),
  schedule_date date not null,
  monthly_rent numeric(10,2) not null,
  status text default 'scheduled', -- scheduled, accrued, collected
  accrual_je_id uuid references journal_entries(id),
  recognition_je_id uuid references journal_entries(id),
  collection_je_id uuid references journal_entries(id),
  rent_payment_id uuid references rent_payments(id),
  created_at timestamptz default now(),
  unique(lease_id, schedule_date)
);

create index if not exists idx_lease_rev_schedule_company on lease_revenue_schedule(company_id, schedule_date);
create index if not exists idx_lease_rev_schedule_lease on lease_revenue_schedule(lease_id);

alter table lease_revenue_schedule enable row level security;

create policy "lease_rev_schedule_select" on lease_revenue_schedule for select
  using (company_id in (select get_company_ids()));

create policy "lease_rev_schedule_insert" on lease_revenue_schedule for insert
  with check (company_id in (select get_company_ids()));

create policy "lease_rev_schedule_update" on lease_revenue_schedule for update
  using (company_id in (select get_company_ids()));

create policy "lease_rev_schedule_delete" on lease_revenue_schedule for delete
  using (company_id in (select get_company_ids()));

-- ============================================================
-- 2. JE Link Columns on Existing Tables
-- ============================================================

alter table rent_payments add column if not exists journal_entry_id uuid references journal_entries(id);
alter table maintenance_requests add column if not exists journal_entry_id uuid references journal_entries(id);
alter table equipment_maintenance_logs add column if not exists journal_entry_id uuid references journal_entries(id);

-- ============================================================
-- 3. Equipment Depreciation Fields
-- ============================================================

alter table equipment add column if not exists useful_life_months int;
alter table equipment add column if not exists salvage_value numeric(14,2) default 0;
alter table equipment add column if not exists depreciation_method text default 'straight_line';
alter table equipment add column if not exists depreciation_start_date date;

-- ============================================================
-- 4. GL Account Seeds for GAAP Accounting
-- Idempotent: uses ON CONFLICT DO NOTHING with unique constraint on (company_id, account_number)
-- These accounts are seeded for every company that already has a chart of accounts
-- ============================================================

-- Seed function for new GL accounts
create or replace function seed_gaap_accounts(p_company_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Only seed if company already has a chart of accounts
  if not exists (select 1 from chart_of_accounts where company_id = p_company_id limit 1) then
    return;
  end if;

  -- 1150 Rent Receivable
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description, is_active)
  values (p_company_id, '1150', 'Rent Receivable', 'asset', 'current_asset', 'debit', 'Rent amounts owed by tenants', true)
  on conflict do nothing;

  -- 1540 Accumulated Depreciation
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description, is_active)
  values (p_company_id, '1540', 'Accumulated Depreciation', 'asset', 'fixed_asset', 'credit', 'Cumulative depreciation of fixed assets', true)
  on conflict do nothing;

  -- 2450 Deferred Rental Revenue
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description, is_active)
  values (p_company_id, '2450', 'Deferred Rental Revenue', 'liability', 'current_liability', 'credit', 'Unearned rental revenue to be recognized monthly', true)
  on conflict do nothing;

  -- 4200 Rental Income
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description, is_active)
  values (p_company_id, '4200', 'Rental Income', 'revenue', 'other_revenue', 'credit', 'Income from property leasing', true)
  on conflict do nothing;

  -- 4250 Late Fee Revenue
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description, is_active)
  values (p_company_id, '4250', 'Late Fee Revenue', 'revenue', 'other_revenue', 'credit', 'Late fees charged on overdue rent', true)
  on conflict do nothing;

  -- 6250 Repairs & Maintenance
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description, is_active)
  values (p_company_id, '6250', 'Repairs & Maintenance', 'expense', 'operating_expense', 'debit', 'Property and equipment repair costs', true)
  on conflict do nothing;

  -- 6700 Depreciation Expense
  insert into chart_of_accounts (company_id, account_number, name, account_type, sub_type, normal_balance, description, is_active)
  values (p_company_id, '6700', 'Depreciation Expense', 'expense', 'operating_expense', 'debit', 'Periodic depreciation of fixed assets', true)
  on conflict do nothing;
end;
$$;

-- Run seed for all companies that have a chart of accounts
do $$
declare
  r record;
begin
  for r in select distinct company_id from chart_of_accounts loop
    perform seed_gaap_accounts(r.company_id);
  end loop;
end;
$$;
