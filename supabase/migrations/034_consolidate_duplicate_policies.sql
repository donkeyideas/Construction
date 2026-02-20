-- ============================================================
-- Migration 034: Consolidate Multiple Permissive Policies
-- Resolves all "multiple_permissive_policies" performance warnings
-- by ensuring each table has at most ONE permissive policy per action.
--
-- Strategy per pattern:
--   A. FOR ALL + FOR SELECT overlap → Split FOR ALL into per-action
--      policies (INSERT/UPDATE/DELETE) and keep one SELECT.
--   B. Dual SELECT policies (company + portal) → Merge into single
--      SELECT with OR conditions.
--   C. Redundant portal policies already absorbed by main policy →
--      Drop the redundant ones.
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: Drop redundant SELECT where FOR ALL covers it
-- ============================================================

-- active_sessions: FOR ALL via get_company_ids() already grants SELECT
DROP POLICY IF EXISTS "active_sessions_select" ON active_sessions;


-- ============================================================
-- SECTION 2: Split FOR ALL + FOR SELECT into per-action policies
-- Tables: employee_pay_rates, payroll_runs, payroll_items,
--         payroll_deductions, payroll_tax_config,
--         feature_flags, role_permission_defaults
-- ============================================================

-- --- EMPLOYEE PAY RATES ---
DROP POLICY IF EXISTS "Admins can manage pay rates" ON employee_pay_rates;
DROP POLICY IF EXISTS "Company members can view pay rates" ON employee_pay_rates;

CREATE POLICY "employee_pay_rates_select"
  ON employee_pay_rates FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "employee_pay_rates_insert"
  ON employee_pay_rates FOR INSERT
  WITH CHECK (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "employee_pay_rates_update"
  ON employee_pay_rates FOR UPDATE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "employee_pay_rates_delete"
  ON employee_pay_rates FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

-- --- PAYROLL RUNS ---
DROP POLICY IF EXISTS "Admins can manage payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "Company members can view payroll runs" ON payroll_runs;

CREATE POLICY "payroll_runs_select"
  ON payroll_runs FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "payroll_runs_insert"
  ON payroll_runs FOR INSERT
  WITH CHECK (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_runs_update"
  ON payroll_runs FOR UPDATE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_runs_delete"
  ON payroll_runs FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

-- --- PAYROLL ITEMS ---
DROP POLICY IF EXISTS "Admins can manage payroll items" ON payroll_items;
DROP POLICY IF EXISTS "Company members can view payroll items" ON payroll_items;

CREATE POLICY "payroll_items_select"
  ON payroll_items FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "payroll_items_insert"
  ON payroll_items FOR INSERT
  WITH CHECK (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_items_update"
  ON payroll_items FOR UPDATE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_items_delete"
  ON payroll_items FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

-- --- PAYROLL DEDUCTIONS ---
DROP POLICY IF EXISTS "Admins can manage deductions" ON payroll_deductions;
DROP POLICY IF EXISTS "Company members can view deductions" ON payroll_deductions;

CREATE POLICY "payroll_deductions_select"
  ON payroll_deductions FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "payroll_deductions_insert"
  ON payroll_deductions FOR INSERT
  WITH CHECK (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_deductions_update"
  ON payroll_deductions FOR UPDATE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_deductions_delete"
  ON payroll_deductions FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

-- --- PAYROLL TAX CONFIG ---
DROP POLICY IF EXISTS "Admins can manage tax config" ON payroll_tax_config;
DROP POLICY IF EXISTS "Company members can view tax config" ON payroll_tax_config;

CREATE POLICY "payroll_tax_config_select"
  ON payroll_tax_config FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "payroll_tax_config_insert"
  ON payroll_tax_config FOR INSERT
  WITH CHECK (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_tax_config_update"
  ON payroll_tax_config FOR UPDATE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "payroll_tax_config_delete"
  ON payroll_tax_config FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND public.has_role(company_id, ARRAY['owner', 'admin'])
  );

-- --- FEATURE FLAGS ---
DROP POLICY IF EXISTS "feature_flags_admin_all" ON feature_flags;
DROP POLICY IF EXISTS "feature_flags_read" ON feature_flags;

CREATE POLICY "feature_flags_select"
  ON feature_flags FOR SELECT
  USING (true);

CREATE POLICY "feature_flags_insert"
  ON feature_flags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = (select auth.uid()) AND is_platform_admin = true
  ));

CREATE POLICY "feature_flags_update"
  ON feature_flags FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = (select auth.uid()) AND is_platform_admin = true
  ));

CREATE POLICY "feature_flags_delete"
  ON feature_flags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = (select auth.uid()) AND is_platform_admin = true
  ));

-- --- ROLE PERMISSION DEFAULTS ---
DROP POLICY IF EXISTS "role_permission_defaults_admin_all" ON role_permission_defaults;
DROP POLICY IF EXISTS "role_permission_defaults_select" ON role_permission_defaults;

CREATE POLICY "role_permission_defaults_select"
  ON role_permission_defaults FOR SELECT
  USING (true);

CREATE POLICY "role_permission_defaults_insert"
  ON role_permission_defaults FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "role_permission_defaults_update"
  ON role_permission_defaults FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "role_permission_defaults_delete"
  ON role_permission_defaults FOR DELETE
  USING (public.is_platform_admin());


-- ============================================================
-- SECTION 3: Split FOR ALL + portal SELECT (portal tables)
-- Tables: tenant_announcements, tenant_documents, vendor_documents
-- ============================================================

-- --- TENANT ANNOUNCEMENTS ---
DROP POLICY IF EXISTS "tenant_announcements_company_members_all" ON tenant_announcements;
DROP POLICY IF EXISTS "tenant_announcements_tenants_select" ON tenant_announcements;

CREATE POLICY "tenant_announcements_select"
  ON tenant_announcements FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR (
      is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND property_id IN (
        SELECT p.id FROM properties p
        JOIN units u ON u.property_id = p.id
        JOIN leases l ON l.unit_id = u.id
        WHERE l.tenant_user_id = (select auth.uid()) AND l.status = 'active'
      )
    )
  );

CREATE POLICY "tenant_announcements_insert"
  ON tenant_announcements FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "tenant_announcements_update"
  ON tenant_announcements FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "tenant_announcements_delete"
  ON tenant_announcements FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));

-- --- TENANT DOCUMENTS ---
DROP POLICY IF EXISTS "tenant_documents_company_members_all" ON tenant_documents;
DROP POLICY IF EXISTS "tenant_documents_tenants_select" ON tenant_documents;

CREATE POLICY "tenant_documents_select"
  ON tenant_documents FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR shared_with_tenant_user_id = (select auth.uid())
  );

CREATE POLICY "tenant_documents_insert"
  ON tenant_documents FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "tenant_documents_update"
  ON tenant_documents FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "tenant_documents_delete"
  ON tenant_documents FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));

-- --- VENDOR DOCUMENTS ---
DROP POLICY IF EXISTS "vendor_documents_company_members_all" ON vendor_documents;
DROP POLICY IF EXISTS "vendor_documents_vendors_select" ON vendor_documents;

CREATE POLICY "vendor_documents_select"
  ON vendor_documents FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR vendor_contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "vendor_documents_insert"
  ON vendor_documents FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "vendor_documents_update"
  ON vendor_documents FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "vendor_documents_delete"
  ON vendor_documents FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));


-- ============================================================
-- SECTION 4: Merge dual SELECT/INSERT policies into single ones
-- Tables with company + portal user SELECT overlap
-- ============================================================

-- --- CERTIFICATIONS (company + vendor) ---
DROP POLICY IF EXISTS "Certifications: company members can view" ON certifications;
DROP POLICY IF EXISTS "certifications_vendor_select" ON certifications;

CREATE POLICY "certifications_select"
  ON certifications FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- Merge dual INSERT
DROP POLICY IF EXISTS "Certifications: managers can create" ON certifications;
DROP POLICY IF EXISTS "certifications_vendor_insert" ON certifications;

CREATE POLICY "certifications_insert"
  ON certifications FOR INSERT
  WITH CHECK (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
    OR contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- Merge dual UPDATE
DROP POLICY IF EXISTS "Certifications: managers can update" ON certifications;
DROP POLICY IF EXISTS "certifications_vendor_update" ON certifications;

CREATE POLICY "certifications_update"
  ON certifications FOR UPDATE
  USING (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
    OR contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- DELETE stays as-is: only "Certifications: admin and owner can delete" exists

-- --- INVOICES (financial roles + vendor) ---
DROP POLICY IF EXISTS "Invoices: financial roles can view" ON invoices;
DROP POLICY IF EXISTS "invoices_vendor_select" ON invoices;

CREATE POLICY "invoices_select"
  ON invoices FOR SELECT
  USING (
    public.has_role(company_id, array['owner', 'admin', 'accountant', 'project_manager'])
    OR vendor_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- --- LEASES ---
-- "Leases: company members and tenants can view" already includes
-- tenant_user_id check via OR. "leases_tenant_select" is fully redundant.
DROP POLICY IF EXISTS "leases_tenant_select" ON leases;

-- --- MAINTENANCE REQUESTS ---
-- "Maintenance requests: company members and requesters can view" already
-- includes requested_by check. Tenant SELECT is redundant.
DROP POLICY IF EXISTS "maintenance_requests_tenant_select" ON maintenance_requests;

-- "Maintenance requests: managers can create" already includes
-- requested_by check. Tenant INSERT is redundant.
DROP POLICY IF EXISTS "maintenance_requests_tenant_insert" ON maintenance_requests;

-- --- RENT PAYMENTS (company + tenant) ---
DROP POLICY IF EXISTS "Rent payments: company members can view" ON rent_payments;
DROP POLICY IF EXISTS "rent_payments_tenant_select" ON rent_payments;

CREATE POLICY "rent_payments_select"
  ON rent_payments FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR lease_id IN (
      SELECT id FROM leases WHERE tenant_user_id = (select auth.uid())
    )
  );

-- --- UNITS (company + tenant) ---
DROP POLICY IF EXISTS "Units: company members can view" ON units;
DROP POLICY IF EXISTS "units_tenant_select" ON units;

CREATE POLICY "units_select"
  ON units FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR id IN (
      SELECT unit_id FROM leases WHERE tenant_user_id = (select auth.uid())
    )
  );

-- --- VENDOR CONTRACTS (company + vendor) ---
DROP POLICY IF EXISTS "Vendor contracts: company members can view" ON vendor_contracts;
DROP POLICY IF EXISTS "vendor_contracts_vendor_select" ON vendor_contracts;

CREATE POLICY "vendor_contracts_select"
  ON vendor_contracts FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR vendor_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- --- PROMO CODE REDEMPTIONS (admin + company) ---
DROP POLICY IF EXISTS "promo_redemptions_admin_select" ON promo_code_redemptions;
DROP POLICY IF EXISTS "promo_redemptions_company_select" ON promo_code_redemptions;

CREATE POLICY "promo_code_redemptions_select"
  ON promo_code_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_platform_admin = true
    )
    OR company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

-- --- SUPPORT TICKETS (admin + user) ---
DROP POLICY IF EXISTS "support_tickets_admin_select" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_user_select" ON support_tickets;

CREATE POLICY "support_tickets_select"
  ON support_tickets FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_platform_admin = true
    )
  );

-- --- SUPPORT TICKET MESSAGES (admin + user) ---
DROP POLICY IF EXISTS "ticket_messages_admin_select" ON support_ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_user_select" ON support_ticket_messages;

CREATE POLICY "support_ticket_messages_select"
  ON support_ticket_messages FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_platform_admin = true
    )
  );

-- Merge dual INSERT
DROP POLICY IF EXISTS "ticket_messages_admin_insert" ON support_ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_user_insert" ON support_ticket_messages;

CREATE POLICY "support_ticket_messages_insert"
  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid()) AND is_platform_admin = true
    )
  );


COMMIT;
