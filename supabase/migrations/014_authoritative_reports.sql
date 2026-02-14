-- ============================================================
-- Migration 013: Authoritative Reports
-- Adds table for saving generated authoritative reports
-- (Market Feasibility, Offering Memorandum, Basis of Design)
-- ============================================================

create table authoritative_reports (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  report_type text not null check (report_type in ('market_feasibility', 'offering_memorandum', 'basis_of_design')),
  title text not null,
  status text default 'draft' check (status in ('draft', 'finalized')),

  -- Subject references
  project_id uuid references projects(id) on delete set null,
  property_ids uuid[] default '{}',

  -- Configuration: ordered list of section IDs + enabled flags
  section_config jsonb not null default '[]',

  -- Generated content: { sectionId: { narrative, tableData, chartConfig } }
  sections_data jsonb not null default '{}',

  -- Watermark / display options
  watermark text default null check (watermark in ('draft', 'confidential', null)),

  -- Tracking
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_auth_reports_company on authoritative_reports(company_id);
create index idx_auth_reports_type on authoritative_reports(report_type);
create index idx_auth_reports_status on authoritative_reports(status);

-- RLS
alter table authoritative_reports enable row level security;

create policy "authoritative_reports_select"
  on authoritative_reports for select
  using (company_id in (select get_company_ids()));

create policy "authoritative_reports_insert"
  on authoritative_reports for insert
  with check (company_id in (select get_company_ids()));

create policy "authoritative_reports_update"
  on authoritative_reports for update
  using (company_id in (select get_company_ids()));

create policy "authoritative_reports_delete"
  on authoritative_reports for delete
  using (company_id in (select get_company_ids()));
