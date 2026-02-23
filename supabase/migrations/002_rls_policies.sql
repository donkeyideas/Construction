-- ============================================================
-- Buildwrk Row Level Security Policies
-- Multi-tenant isolation via company_id
-- ============================================================
-- IMPORTANT: company_id is NOT in the JWT. All tenant lookups
-- go through the company_members table via helper functions.
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns all company_ids the current user belongs to (active memberships only)
create or replace function public.get_company_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select company_id
  from public.company_members
  where user_id = auth.uid()
    and is_active = true;
$$;

-- Checks if the current user has one of the specified roles in the given company
create or replace function public.has_role(_company_id uuid, _roles text[])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.company_members
    where user_id = auth.uid()
      and company_id = _company_id
      and role = any(_roles)
      and is_active = true
  );
$$;

-- Checks if the current user is a platform admin
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_platform_admin
     from public.user_profiles
     where id = auth.uid()),
    false
  );
$$;


-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

alter table companies enable row level security;
alter table user_profiles enable row level security;
alter table company_members enable row level security;
alter table audit_log enable row level security;

alter table projects enable row level security;
alter table project_phases enable row level security;
alter table project_tasks enable row level security;
alter table daily_logs enable row level security;
alter table rfis enable row level security;
alter table change_orders enable row level security;
alter table submittals enable row level security;
alter table punch_list_items enable row level security;
alter table safety_inspections enable row level security;
alter table project_budget_lines enable row level security;

alter table properties enable row level security;
alter table units enable row level security;
alter table leases enable row level security;
alter table maintenance_requests enable row level security;
alter table rent_payments enable row level security;

alter table chart_of_accounts enable row level security;
alter table journal_entries enable row level security;
alter table journal_entry_lines enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table bank_accounts enable row level security;
alter table budgets enable row level security;

alter table contacts enable row level security;
alter table time_entries enable row level security;
alter table certifications enable row level security;
alter table equipment enable row level security;
alter table vendor_contracts enable row level security;

alter table opportunities enable row level security;
alter table bids enable row level security;

alter table documents enable row level security;
alter table notifications enable row level security;
alter table comments enable row level security;

alter table ai_provider_configs enable row level security;
alter table ai_conversations enable row level security;
alter table ai_usage_log enable row level security;

alter table cms_pages enable row level security;
alter table cms_media enable row level security;
alter table seo_keywords enable row level security;

alter table subscription_events enable row level security;
alter table platform_announcements enable row level security;


-- ============================================================
-- COMPANIES
-- ============================================================

create policy "Companies: members can view their companies"
  on companies for select
  using (
    id in (select public.get_company_ids())
    or public.is_platform_admin()
  );

create policy "Companies: any authenticated user can create"
  on companies for insert
  with check (
    auth.uid() is not null
  );

create policy "Companies: owner and admin can update"
  on companies for update
  using (
    public.has_role(id, array['owner', 'admin'])
  );

create policy "Companies: only owner can delete"
  on companies for delete
  using (
    public.has_role(id, array['owner'])
  );


-- ============================================================
-- USER PROFILES
-- ============================================================

create policy "User profiles: users can view own profile"
  on user_profiles for select
  using (
    id = auth.uid()
    or public.is_platform_admin()
    or id in (
      select cm2.user_id
      from public.company_members cm1
      join public.company_members cm2
        on cm1.company_id = cm2.company_id
       and cm2.is_active = true
      where cm1.user_id = auth.uid()
        and cm1.is_active = true
    )
  );

create policy "User profiles: users can insert own profile"
  on user_profiles for insert
  with check (
    id = auth.uid()
  );

create policy "User profiles: users can update own profile"
  on user_profiles for update
  using (
    id = auth.uid()
  );


-- ============================================================
-- COMPANY MEMBERS
-- ============================================================

create policy "Company members: members can view fellow members"
  on company_members for select
  using (
    company_id in (select public.get_company_ids())
    or public.is_platform_admin()
  );

create policy "Company members: owner and admin can invite"
  on company_members for insert
  with check (
    public.has_role(company_id, array['owner', 'admin'])
    -- Allow self-insert during initial company setup (bootstrap the first owner).
    -- When a user creates a company, no members exist yet, so has_role() would
    -- return false. This clause lets them add themselves as the first owner.
    or (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from public.company_members existing
        where existing.company_id = company_members.company_id
      )
    )
  );

create policy "Company members: owner and admin can update roles"
  on company_members for update
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

create policy "Company members: owner and admin can remove, users can remove themselves"
  on company_members for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
    or user_id = auth.uid()
  );


-- ============================================================
-- AUDIT LOG
-- ============================================================

create policy "Audit log: admin and owner can view"
  on audit_log for select
  using (
    public.has_role(company_id, array['owner', 'admin'])
    or public.is_platform_admin()
  );

create policy "Audit log: any authenticated user can insert"
  on audit_log for insert
  with check (
    auth.uid() is not null
    and company_id in (select public.get_company_ids())
  );

-- No UPDATE or DELETE policies for audit_log (immutable)


-- ============================================================
-- PROJECT-SCOPED TABLES
-- These share the same pattern:
--   SELECT: company members
--   INSERT/UPDATE: owner, admin, project_manager, superintendent
--   DELETE: owner, admin only
-- Exceptions noted per table.
-- ============================================================

-- --------------- PROJECTS ---------------

create policy "Projects: company members can view"
  on projects for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Projects: managers can create"
  on projects for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Projects: managers can update"
  on projects for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Projects: admin and owner can delete"
  on projects for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- PROJECT PHASES ---------------

create policy "Project phases: company members can view"
  on project_phases for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Project phases: managers can create"
  on project_phases for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Project phases: managers can update"
  on project_phases for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Project phases: admin and owner can delete"
  on project_phases for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- PROJECT TASKS ---------------

create policy "Project tasks: company members can view"
  on project_tasks for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Project tasks: managers can create"
  on project_tasks for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Project tasks: managers can update"
  on project_tasks for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Project tasks: admin and owner can delete"
  on project_tasks for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- DAILY LOGS ---------------
-- Exception: field_workers can also insert and update daily logs

create policy "Daily logs: company members can view"
  on daily_logs for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Daily logs: managers and field workers can create"
  on daily_logs for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent', 'field_worker'])
  );

create policy "Daily logs: managers and field workers can update"
  on daily_logs for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent', 'field_worker'])
  );

create policy "Daily logs: admin and owner can delete"
  on daily_logs for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- RFIs ---------------

create policy "RFIs: company members can view"
  on rfis for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "RFIs: managers can create"
  on rfis for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "RFIs: managers can update"
  on rfis for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "RFIs: admin and owner can delete"
  on rfis for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- CHANGE ORDERS ---------------

create policy "Change orders: company members can view"
  on change_orders for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Change orders: managers can create"
  on change_orders for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Change orders: managers can update"
  on change_orders for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Change orders: admin and owner can delete"
  on change_orders for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- SUBMITTALS ---------------

create policy "Submittals: company members can view"
  on submittals for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Submittals: managers can create"
  on submittals for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Submittals: managers can update"
  on submittals for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Submittals: admin and owner can delete"
  on submittals for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- PUNCH LIST ITEMS ---------------

create policy "Punch list items: company members can view"
  on punch_list_items for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Punch list items: managers can create"
  on punch_list_items for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Punch list items: managers can update"
  on punch_list_items for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Punch list items: admin and owner can delete"
  on punch_list_items for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- SAFETY INSPECTIONS ---------------

create policy "Safety inspections: company members can view"
  on safety_inspections for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Safety inspections: managers can create"
  on safety_inspections for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Safety inspections: managers can update"
  on safety_inspections for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Safety inspections: admin and owner can delete"
  on safety_inspections for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- PROJECT BUDGET LINES ---------------

create policy "Project budget lines: company members can view"
  on project_budget_lines for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Project budget lines: managers can create"
  on project_budget_lines for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Project budget lines: managers can update"
  on project_budget_lines for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Project budget lines: admin and owner can delete"
  on project_budget_lines for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );


-- ============================================================
-- PROPERTY-SCOPED TABLES
--   SELECT: company members (tenants can see own leases/maintenance)
--   INSERT/UPDATE/DELETE: admin, owner, project_manager
-- ============================================================

-- --------------- PROPERTIES ---------------

create policy "Properties: company members can view"
  on properties for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Properties: managers can create"
  on properties for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Properties: managers can update"
  on properties for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Properties: admin and owner can delete"
  on properties for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- UNITS ---------------

create policy "Units: company members can view"
  on units for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Units: managers can create"
  on units for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Units: managers can update"
  on units for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Units: admin and owner can delete"
  on units for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- LEASES ---------------
-- Tenants (tenant_user_id) can also see their own leases

create policy "Leases: company members and tenants can view"
  on leases for select
  using (
    company_id in (select public.get_company_ids())
    or tenant_user_id = auth.uid()
  );

create policy "Leases: managers can create"
  on leases for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Leases: managers can update"
  on leases for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Leases: admin and owner can delete"
  on leases for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- MAINTENANCE REQUESTS ---------------
-- Tenants (requested_by) can also see their own requests

create policy "Maintenance requests: company members and requesters can view"
  on maintenance_requests for select
  using (
    company_id in (select public.get_company_ids())
    or requested_by = auth.uid()
  );

create policy "Maintenance requests: managers can create"
  on maintenance_requests for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
    -- Tenants can also submit maintenance requests
    or requested_by = auth.uid()
  );

create policy "Maintenance requests: managers can update"
  on maintenance_requests for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Maintenance requests: admin and owner can delete"
  on maintenance_requests for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- RENT PAYMENTS ---------------

create policy "Rent payments: company members can view"
  on rent_payments for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Rent payments: managers can create"
  on rent_payments for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Rent payments: managers can update"
  on rent_payments for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Rent payments: admin and owner can delete"
  on rent_payments for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );


-- ============================================================
-- FINANCIAL TABLES
--   SELECT: accountant, admin, owner, project_manager
--   INSERT/UPDATE: accountant, admin, owner
--   DELETE: admin, owner
-- ============================================================

-- --------------- CHART OF ACCOUNTS ---------------

create policy "Chart of accounts: financial roles can view"
  on chart_of_accounts for select
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
  );

create policy "Chart of accounts: accountant and admin can create"
  on chart_of_accounts for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Chart of accounts: accountant and admin can update"
  on chart_of_accounts for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Chart of accounts: admin and owner can delete"
  on chart_of_accounts for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- JOURNAL ENTRIES ---------------

create policy "Journal entries: financial roles can view"
  on journal_entries for select
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
  );

create policy "Journal entries: accountant and admin can create"
  on journal_entries for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Journal entries: accountant and admin can update"
  on journal_entries for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Journal entries: admin and owner can delete"
  on journal_entries for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- JOURNAL ENTRY LINES ---------------

create policy "Journal entry lines: financial roles can view"
  on journal_entry_lines for select
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
  );

create policy "Journal entry lines: accountant and admin can create"
  on journal_entry_lines for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Journal entry lines: accountant and admin can update"
  on journal_entry_lines for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Journal entry lines: admin and owner can delete"
  on journal_entry_lines for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- INVOICES ---------------

create policy "Invoices: financial roles can view"
  on invoices for select
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
  );

create policy "Invoices: accountant and admin can create"
  on invoices for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Invoices: accountant and admin can update"
  on invoices for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Invoices: admin and owner can delete"
  on invoices for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- PAYMENTS ---------------

create policy "Payments: financial roles can view"
  on payments for select
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
  );

create policy "Payments: accountant and admin can create"
  on payments for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Payments: accountant and admin can update"
  on payments for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Payments: admin and owner can delete"
  on payments for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- BANK ACCOUNTS ---------------

create policy "Bank accounts: financial roles can view"
  on bank_accounts for select
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
  );

create policy "Bank accounts: accountant and admin can create"
  on bank_accounts for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Bank accounts: accountant and admin can update"
  on bank_accounts for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Bank accounts: admin and owner can delete"
  on bank_accounts for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- BUDGETS ---------------

create policy "Budgets: financial roles can view"
  on budgets for select
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
  );

create policy "Budgets: accountant and admin can create"
  on budgets for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Budgets: accountant and admin can update"
  on budgets for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
  );

create policy "Budgets: admin and owner can delete"
  on budgets for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );


-- ============================================================
-- PEOPLE & CONTACTS TABLES
--   SELECT: company members
--   INSERT/UPDATE: admin, owner, project_manager, superintendent
--   DELETE: admin, owner
--   time_entries: field_workers can insert/update their own
-- ============================================================

-- --------------- CONTACTS ---------------

create policy "Contacts: company members can view"
  on contacts for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Contacts: managers can create"
  on contacts for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Contacts: managers can update"
  on contacts for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Contacts: admin and owner can delete"
  on contacts for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- TIME ENTRIES ---------------

create policy "Time entries: company members can view"
  on time_entries for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Time entries: managers can create"
  on time_entries for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
    -- Field workers can create their own time entries
    or (
      user_id = auth.uid()
      and public.has_role(company_id, array['field_worker'])
    )
  );

create policy "Time entries: managers can update"
  on time_entries for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
    -- Field workers can update their own time entries
    or (
      user_id = auth.uid()
      and public.has_role(company_id, array['field_worker'])
    )
  );

create policy "Time entries: admin and owner can delete"
  on time_entries for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- CERTIFICATIONS ---------------

create policy "Certifications: company members can view"
  on certifications for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Certifications: managers can create"
  on certifications for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Certifications: managers can update"
  on certifications for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Certifications: admin and owner can delete"
  on certifications for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- EQUIPMENT ---------------

create policy "Equipment: company members can view"
  on equipment for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Equipment: managers can create"
  on equipment for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Equipment: managers can update"
  on equipment for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Equipment: admin and owner can delete"
  on equipment for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- VENDOR CONTRACTS ---------------

create policy "Vendor contracts: company members can view"
  on vendor_contracts for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Vendor contracts: managers can create"
  on vendor_contracts for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Vendor contracts: managers can update"
  on vendor_contracts for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
  );

create policy "Vendor contracts: admin and owner can delete"
  on vendor_contracts for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );


-- ============================================================
-- CRM TABLES
--   SELECT: company members
--   INSERT/UPDATE: admin, owner, project_manager
--   DELETE: admin, owner
-- ============================================================

-- --------------- OPPORTUNITIES ---------------

create policy "Opportunities: company members can view"
  on opportunities for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Opportunities: managers can create"
  on opportunities for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Opportunities: managers can update"
  on opportunities for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Opportunities: admin and owner can delete"
  on opportunities for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- BIDS ---------------

create policy "Bids: company members can view"
  on bids for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Bids: managers can create"
  on bids for insert
  with check (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Bids: managers can update"
  on bids for update
  using (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
  );

create policy "Bids: admin and owner can delete"
  on bids for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );


-- ============================================================
-- DOCUMENTS
--   SELECT: company members
--   INSERT: any company member
--   UPDATE/DELETE: uploader or admin/owner
-- ============================================================

create policy "Documents: company members can view"
  on documents for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Documents: any company member can upload"
  on documents for insert
  with check (
    company_id in (select public.get_company_ids())
  );

create policy "Documents: uploader or admin can update"
  on documents for update
  using (
    uploaded_by = auth.uid()
    or public.has_role(company_id, array['owner', 'admin'])
  );

create policy "Documents: uploader or admin can delete"
  on documents for delete
  using (
    uploaded_by = auth.uid()
    or public.has_role(company_id, array['owner', 'admin'])
  );


-- ============================================================
-- NOTIFICATIONS
--   SELECT/UPDATE: own notifications only (mark as read)
--   INSERT: system / any authenticated member of the company
--   No DELETE
-- ============================================================

create policy "Notifications: users can view own notifications"
  on notifications for select
  using (
    user_id = auth.uid()
  );

create policy "Notifications: system can create for company members"
  on notifications for insert
  with check (
    company_id in (select public.get_company_ids())
  );

create policy "Notifications: users can update own notifications"
  on notifications for update
  using (
    user_id = auth.uid()
  );


-- ============================================================
-- COMMENTS
--   SELECT: company members
--   INSERT: any company member
--   UPDATE/DELETE: own comments only
-- ============================================================

create policy "Comments: company members can view"
  on comments for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "Comments: any company member can create"
  on comments for insert
  with check (
    company_id in (select public.get_company_ids())
    and user_id = auth.uid()
  );

create policy "Comments: users can update own comments"
  on comments for update
  using (
    user_id = auth.uid()
  );

create policy "Comments: users can delete own comments"
  on comments for delete
  using (
    user_id = auth.uid()
  );


-- ============================================================
-- AI TABLES
-- ============================================================

-- --------------- AI PROVIDER CONFIGS ---------------

create policy "AI provider configs: company members can view"
  on ai_provider_configs for select
  using (
    company_id in (select public.get_company_ids())
  );

create policy "AI provider configs: admin and owner can create"
  on ai_provider_configs for insert
  with check (
    public.has_role(company_id, array['owner', 'admin'])
  );

create policy "AI provider configs: admin and owner can update"
  on ai_provider_configs for update
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

create policy "AI provider configs: admin and owner can delete"
  on ai_provider_configs for delete
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

-- --------------- AI CONVERSATIONS ---------------

create policy "AI conversations: users can view own conversations"
  on ai_conversations for select
  using (
    user_id = auth.uid()
  );

create policy "AI conversations: users can create own conversations"
  on ai_conversations for insert
  with check (
    user_id = auth.uid()
    and company_id in (select public.get_company_ids())
  );

create policy "AI conversations: users can update own conversations"
  on ai_conversations for update
  using (
    user_id = auth.uid()
  );

create policy "AI conversations: users can delete own conversations"
  on ai_conversations for delete
  using (
    user_id = auth.uid()
  );

-- --------------- AI USAGE LOG ---------------

create policy "AI usage log: admin and owner can view"
  on ai_usage_log for select
  using (
    public.has_role(company_id, array['owner', 'admin'])
  );

create policy "AI usage log: any company member can insert"
  on ai_usage_log for insert
  with check (
    company_id in (select public.get_company_ids())
  );


-- ============================================================
-- CMS TABLES
--   SELECT: public (no auth needed for published pages)
--   INSERT/UPDATE/DELETE: platform admins only
-- ============================================================

-- --------------- CMS PAGES ---------------

create policy "CMS pages: anyone can view published pages"
  on cms_pages for select
  using (
    status = 'published'
    or public.is_platform_admin()
  );

create policy "CMS pages: platform admins can create"
  on cms_pages for insert
  with check (
    public.is_platform_admin()
  );

create policy "CMS pages: platform admins can update"
  on cms_pages for update
  using (
    public.is_platform_admin()
  );

create policy "CMS pages: platform admins can delete"
  on cms_pages for delete
  using (
    public.is_platform_admin()
  );

-- --------------- CMS MEDIA ---------------

create policy "CMS media: anyone can view"
  on cms_media for select
  using (true);

create policy "CMS media: platform admins can create"
  on cms_media for insert
  with check (
    public.is_platform_admin()
  );

create policy "CMS media: platform admins can update"
  on cms_media for update
  using (
    public.is_platform_admin()
  );

create policy "CMS media: platform admins can delete"
  on cms_media for delete
  using (
    public.is_platform_admin()
  );


-- ============================================================
-- SEO TABLES
--   All operations: platform admins only
-- ============================================================

create policy "SEO keywords: platform admins can view"
  on seo_keywords for select
  using (
    public.is_platform_admin()
  );

create policy "SEO keywords: platform admins can create"
  on seo_keywords for insert
  with check (
    public.is_platform_admin()
  );

create policy "SEO keywords: platform admins can update"
  on seo_keywords for update
  using (
    public.is_platform_admin()
  );

create policy "SEO keywords: platform admins can delete"
  on seo_keywords for delete
  using (
    public.is_platform_admin()
  );


-- ============================================================
-- PLATFORM / SUBSCRIPTION TABLES
-- ============================================================

-- --------------- SUBSCRIPTION EVENTS ---------------

create policy "Subscription events: company owner and admin can view"
  on subscription_events for select
  using (
    public.has_role(company_id, array['owner', 'admin'])
    or public.is_platform_admin()
  );

create policy "Subscription events: platform admin can insert"
  on subscription_events for insert
  with check (
    public.is_platform_admin()
  );

-- --------------- PLATFORM ANNOUNCEMENTS ---------------

create policy "Platform announcements: all authenticated users can view"
  on platform_announcements for select
  using (
    auth.uid() is not null
  );

create policy "Platform announcements: platform admin can create"
  on platform_announcements for insert
  with check (
    public.is_platform_admin()
  );

create policy "Platform announcements: platform admin can update"
  on platform_announcements for update
  using (
    public.is_platform_admin()
  );

create policy "Platform announcements: platform admin can delete"
  on platform_announcements for delete
  using (
    public.is_platform_admin()
  );


-- ============================================================
-- GRANT ANON ACCESS FOR PUBLIC CMS PAGES
-- ============================================================
-- The anon role needs SELECT on cms_pages and cms_media so that
-- unauthenticated visitors can read published marketing pages.
-- ============================================================

grant select on cms_pages to anon;
grant select on cms_media to anon;


-- ============================================================
-- PERFORMANCE: Indexes to support RLS policy lookups
-- ============================================================
-- The schema already has idx_company_members_company and
-- idx_company_members_user. Add a composite index for the
-- exact lookup pattern used by public.get_company_ids() and
-- public.has_role().
-- ============================================================

create index if not exists idx_company_members_user_active
  on company_members(user_id, is_active)
  where is_active = true;

create index if not exists idx_company_members_user_company_role
  on company_members(user_id, company_id, role)
  where is_active = true;

create index if not exists idx_user_profiles_platform_admin
  on user_profiles(id)
  where is_platform_admin = true;
