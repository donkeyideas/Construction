-- ============================================================
-- Migration 033: Security & Performance Fixes
-- Resolves 12 Supabase security warnings + ~90 performance warnings
-- ============================================================
-- Security fixes:
--   1. Functions with mutable search_path (8 functions)
--   2. Enable RLS on role_permission_defaults
--   3. certifications_with_status view SECURITY DEFINER → INVOKER
--   4. audit_logs_insert_any unrestricted INSERT
-- Performance fixes:
--   Replace auth.uid() with (select auth.uid()) in all RLS policies
--   to prevent per-row re-evaluation of auth functions.
-- Duplicate policy cleanup:
--   Remove redundant SELECT policies where FOR ALL already covers them.
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: Fix functions with mutable search_path
-- ============================================================

ALTER FUNCTION public.get_company_ids() SET search_path = 'public';
ALTER FUNCTION public.has_role(uuid, text[]) SET search_path = 'public';
ALTER FUNCTION public.is_platform_admin() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at() SET search_path = 'public';
ALTER FUNCTION public.seed_company_chart_of_accounts(uuid) SET search_path = 'public';
ALTER FUNCTION public.seed_automation_rules(uuid) SET search_path = 'public';
ALTER FUNCTION public.seed_payroll_accounts(uuid) SET search_path = 'public';
ALTER FUNCTION public.seed_gaap_accounts(uuid) SET search_path = 'public';


-- ============================================================
-- SECTION 2: Enable RLS on role_permission_defaults
-- ============================================================

ALTER TABLE public.role_permission_defaults ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read role definitions (needed for UI)
CREATE POLICY "role_permission_defaults_select"
  ON role_permission_defaults FOR SELECT
  USING (true);

-- Only platform admins can modify role defaults
CREATE POLICY "role_permission_defaults_admin_all"
  ON role_permission_defaults FOR ALL
  USING (public.is_platform_admin());


-- ============================================================
-- SECTION 3: Fix certifications_with_status view
-- Change from SECURITY DEFINER to SECURITY INVOKER
-- ============================================================

ALTER VIEW public.certifications_with_status SET (security_invoker = true);


-- ============================================================
-- SECTION 4: Fix audit_logs_insert_any (unrestricted INSERT)
-- ============================================================

DROP POLICY IF EXISTS "audit_logs_insert_any" ON audit_logs;
CREATE POLICY "audit_logs_insert_any" ON audit_logs FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);


-- ============================================================
-- SECTION 5: Fix duplicate/redundant policies
-- Remove SELECT policies where a FOR ALL policy already covers them
-- ============================================================

-- active_sessions: active_sessions_all (FOR ALL) already grants SELECT
DROP POLICY IF EXISTS "active_sessions_select" ON active_sessions;

-- asset_library: "Company members can manage assets" (FOR ALL) already grants SELECT
DROP POLICY IF EXISTS "Company members can view assets" ON asset_library;

-- document_folders: "Company members can manage folders" (FOR ALL) already grants SELECT
DROP POLICY IF EXISTS "Company members can view folders" ON document_folders;


-- ============================================================
-- SECTION 6: Performance — Rewrite policies with (select auth.uid())
-- Organized by source migration file
-- ============================================================

-- =============================================
-- From 002_rls_policies.sql
-- =============================================

-- --- PLATFORM ANNOUNCEMENTS ---
DROP POLICY IF EXISTS "Platform announcements: all authenticated users can view" ON platform_announcements;
CREATE POLICY "Platform announcements: all authenticated users can view"
  ON platform_announcements FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- --- COMPANIES ---
DROP POLICY IF EXISTS "Companies: any authenticated user can create" ON companies;
CREATE POLICY "Companies: any authenticated user can create"
  ON companies FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- --- COMPANY MEMBERS ---
DROP POLICY IF EXISTS "Company members: owner and admin can invite" ON company_members;
CREATE POLICY "Company members: owner and admin can invite"
  ON company_members FOR INSERT
  WITH CHECK (
    public.has_role(company_id, array['owner', 'admin'])
    OR (
      user_id = (select auth.uid())
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.company_members existing
        WHERE existing.company_id = company_members.company_id
      )
    )
  );

DROP POLICY IF EXISTS "Company members: owner and admin can remove, users can remove themselves" ON company_members;
CREATE POLICY "Company members: owner and admin can remove, users can remove themselves"
  ON company_members FOR DELETE
  USING (
    public.has_role(company_id, array['owner', 'admin'])
    OR user_id = (select auth.uid())
  );

-- --- USER PROFILES ---
DROP POLICY IF EXISTS "User profiles: users can view own profile" ON user_profiles;
CREATE POLICY "User profiles: users can view own profile"
  ON user_profiles FOR SELECT
  USING (
    id = (select auth.uid())
    OR public.is_platform_admin()
    OR id IN (
      SELECT cm2.user_id
      FROM public.company_members cm1
      JOIN public.company_members cm2
        ON cm1.company_id = cm2.company_id
       AND cm2.is_active = true
      WHERE cm1.user_id = (select auth.uid())
        AND cm1.is_active = true
    )
  );

DROP POLICY IF EXISTS "User profiles: users can insert own profile" ON user_profiles;
CREATE POLICY "User profiles: users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "User profiles: users can update own profile" ON user_profiles;
CREATE POLICY "User profiles: users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = (select auth.uid()));

-- --- AUDIT LOG ---
DROP POLICY IF EXISTS "Audit log: any authenticated user can insert" ON audit_log;
CREATE POLICY "Audit log: any authenticated user can insert"
  ON audit_log FOR INSERT
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND company_id IN (SELECT public.get_company_ids())
  );

-- --- LEASES ---
DROP POLICY IF EXISTS "Leases: company members and tenants can view" ON leases;
CREATE POLICY "Leases: company members and tenants can view"
  ON leases FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR tenant_user_id = (select auth.uid())
  );

-- --- MAINTENANCE REQUESTS ---
DROP POLICY IF EXISTS "Maintenance requests: company members and requesters can view" ON maintenance_requests;
CREATE POLICY "Maintenance requests: company members and requesters can view"
  ON maintenance_requests FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR requested_by = (select auth.uid())
  );

DROP POLICY IF EXISTS "Maintenance requests: managers can create" ON maintenance_requests;
CREATE POLICY "Maintenance requests: managers can create"
  ON maintenance_requests FOR INSERT
  WITH CHECK (
    public.has_role(company_id, array['owner', 'admin', 'project_manager'])
    OR requested_by = (select auth.uid())
  );

-- --- TIME ENTRIES ---
DROP POLICY IF EXISTS "Time entries: managers can create" ON time_entries;
CREATE POLICY "Time entries: managers can create"
  ON time_entries FOR INSERT
  WITH CHECK (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
    OR (
      user_id = (select auth.uid())
      AND public.has_role(company_id, array['field_worker'])
    )
  );

DROP POLICY IF EXISTS "Time entries: managers can update" ON time_entries;
CREATE POLICY "Time entries: managers can update"
  ON time_entries FOR UPDATE
  USING (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent'])
    OR (
      user_id = (select auth.uid())
      AND public.has_role(company_id, array['field_worker'])
    )
  );

-- --- DOCUMENTS ---
DROP POLICY IF EXISTS "Documents: uploader or admin can update" ON documents;
CREATE POLICY "Documents: uploader or admin can update"
  ON documents FOR UPDATE
  USING (
    uploaded_by = (select auth.uid())
    OR public.has_role(company_id, array['owner', 'admin'])
  );

DROP POLICY IF EXISTS "Documents: uploader or admin can delete" ON documents;
CREATE POLICY "Documents: uploader or admin can delete"
  ON documents FOR DELETE
  USING (
    uploaded_by = (select auth.uid())
    OR public.has_role(company_id, array['owner', 'admin'])
  );

-- --- NOTIFICATIONS ---
DROP POLICY IF EXISTS "Notifications: users can view own notifications" ON notifications;
CREATE POLICY "Notifications: users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Notifications: users can update own notifications" ON notifications;
CREATE POLICY "Notifications: users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (select auth.uid()));

-- --- COMMENTS ---
DROP POLICY IF EXISTS "Comments: any company member can create" ON comments;
CREATE POLICY "Comments: any company member can create"
  ON comments FOR INSERT
  WITH CHECK (
    company_id IN (SELECT public.get_company_ids())
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Comments: users can update own comments" ON comments;
CREATE POLICY "Comments: users can update own comments"
  ON comments FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Comments: users can delete own comments" ON comments;
CREATE POLICY "Comments: users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = (select auth.uid()));

-- --- AI CONVERSATIONS ---
DROP POLICY IF EXISTS "AI conversations: users can view own conversations" ON ai_conversations;
CREATE POLICY "AI conversations: users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "AI conversations: users can create own conversations" ON ai_conversations;
CREATE POLICY "AI conversations: users can create own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    AND company_id IN (SELECT public.get_company_ids())
  );

DROP POLICY IF EXISTS "AI conversations: users can update own conversations" ON ai_conversations;
CREATE POLICY "AI conversations: users can update own conversations"
  ON ai_conversations FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "AI conversations: users can delete own conversations" ON ai_conversations;
CREATE POLICY "AI conversations: users can delete own conversations"
  ON ai_conversations FOR DELETE
  USING (user_id = (select auth.uid()));


-- =============================================
-- From 006_portal_rls.sql
-- =============================================

-- --- TENANT ANNOUNCEMENTS ---
DROP POLICY IF EXISTS "tenant_announcements_tenants_select" ON tenant_announcements;
CREATE POLICY "tenant_announcements_tenants_select"
  ON tenant_announcements FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND property_id IN (
      SELECT p.id FROM properties p
      JOIN units u ON u.property_id = p.id
      JOIN leases l ON l.unit_id = u.id
      WHERE l.tenant_user_id = (select auth.uid()) AND l.status = 'active'
    )
  );

-- --- TENANT DOCUMENTS ---
DROP POLICY IF EXISTS "tenant_documents_tenants_select" ON tenant_documents;
CREATE POLICY "tenant_documents_tenants_select"
  ON tenant_documents FOR SELECT
  USING (shared_with_tenant_user_id = (select auth.uid()));

-- --- VENDOR DOCUMENTS ---
DROP POLICY IF EXISTS "vendor_documents_vendors_select" ON vendor_documents;
CREATE POLICY "vendor_documents_vendors_select"
  ON vendor_documents FOR SELECT
  USING (
    vendor_contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- --- RENT PAYMENTS (tenant select) ---
DROP POLICY IF EXISTS "rent_payments_tenant_select" ON rent_payments;
CREATE POLICY "rent_payments_tenant_select"
  ON rent_payments FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE tenant_user_id = (select auth.uid())
    )
  );

-- --- LEASES (tenant select) ---
DROP POLICY IF EXISTS "leases_tenant_select" ON leases;
CREATE POLICY "leases_tenant_select"
  ON leases FOR SELECT
  USING (tenant_user_id = (select auth.uid()));

-- --- UNITS (tenant select) ---
DROP POLICY IF EXISTS "units_tenant_select" ON units;
CREATE POLICY "units_tenant_select"
  ON units FOR SELECT
  USING (
    id IN (
      SELECT unit_id FROM leases WHERE tenant_user_id = (select auth.uid())
    )
  );

-- --- INVOICES (vendor select) ---
DROP POLICY IF EXISTS "invoices_vendor_select" ON invoices;
CREATE POLICY "invoices_vendor_select"
  ON invoices FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- --- VENDOR CONTRACTS (vendor select) ---
DROP POLICY IF EXISTS "vendor_contracts_vendor_select" ON vendor_contracts;
CREATE POLICY "vendor_contracts_vendor_select"
  ON vendor_contracts FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- --- CERTIFICATIONS (vendor CRUD) ---
DROP POLICY IF EXISTS "certifications_vendor_select" ON certifications;
CREATE POLICY "certifications_vendor_select"
  ON certifications FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "certifications_vendor_insert" ON certifications;
CREATE POLICY "certifications_vendor_insert"
  ON certifications FOR INSERT
  WITH CHECK (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "certifications_vendor_update" ON certifications;
CREATE POLICY "certifications_vendor_update"
  ON certifications FOR UPDATE
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = (select auth.uid())
    )
  );

-- --- MAINTENANCE REQUESTS (tenant) ---
DROP POLICY IF EXISTS "maintenance_requests_tenant_insert" ON maintenance_requests;
CREATE POLICY "maintenance_requests_tenant_insert"
  ON maintenance_requests FOR INSERT
  WITH CHECK (requested_by = (select auth.uid()));

DROP POLICY IF EXISTS "maintenance_requests_tenant_select" ON maintenance_requests;
CREATE POLICY "maintenance_requests_tenant_select"
  ON maintenance_requests FOR SELECT
  USING (requested_by = (select auth.uid()));


-- =============================================
-- From 007_inbox_tickets.sql
-- =============================================

-- --- MESSAGES ---
DROP POLICY IF EXISTS "messages_select_own" ON messages;
CREATE POLICY "messages_select_own"
  ON messages FOR SELECT
  USING (
    (select auth.uid()) = recipient_id
    OR (select auth.uid()) = sender_id
  );

DROP POLICY IF EXISTS "messages_insert_company" ON messages;
CREATE POLICY "messages_insert_company"
  ON messages FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

DROP POLICY IF EXISTS "messages_update_recipient" ON messages;
CREATE POLICY "messages_update_recipient"
  ON messages FOR UPDATE
  USING ((select auth.uid()) = recipient_id);

-- --- TICKETS ---
DROP POLICY IF EXISTS "tickets_select_company" ON tickets;
CREATE POLICY "tickets_select_company"
  ON tickets FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

DROP POLICY IF EXISTS "tickets_insert_company" ON tickets;
CREATE POLICY "tickets_insert_company"
  ON tickets FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
  );

DROP POLICY IF EXISTS "tickets_update_authorized" ON tickets;
CREATE POLICY "tickets_update_authorized"
  ON tickets FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = (select auth.uid()) AND is_active = true
    )
    AND (
      (select auth.uid()) = assigned_to
      OR (select auth.uid()) = created_by
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE user_id = (select auth.uid())
          AND company_id = tickets.company_id
          AND role IN ('owner', 'admin', 'project_manager')
      )
    )
  );


-- =============================================
-- From 008_new_sections.sql
-- =============================================

-- --- SAFETY INCIDENTS ---
DROP POLICY IF EXISTS "safety_incidents_insert" ON safety_incidents;
CREATE POLICY "safety_incidents_insert" ON safety_incidents FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "safety_incidents_update" ON safety_incidents;
CREATE POLICY "safety_incidents_update" ON safety_incidents FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- TOOLBOX TALKS ---
DROP POLICY IF EXISTS "toolbox_talks_insert" ON toolbox_talks;
CREATE POLICY "toolbox_talks_insert" ON toolbox_talks FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "toolbox_talks_update" ON toolbox_talks;
CREATE POLICY "toolbox_talks_update" ON toolbox_talks FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- EQUIPMENT MAINTENANCE LOGS ---
DROP POLICY IF EXISTS "equip_maint_insert" ON equipment_maintenance_logs;
CREATE POLICY "equip_maint_insert" ON equipment_maintenance_logs FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "equip_maint_update" ON equipment_maintenance_logs;
CREATE POLICY "equip_maint_update" ON equipment_maintenance_logs FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- EQUIPMENT ASSIGNMENTS ---
DROP POLICY IF EXISTS "equip_assignments_insert" ON equipment_assignments;
CREATE POLICY "equip_assignments_insert" ON equipment_assignments FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "equip_assignments_update" ON equipment_assignments;
CREATE POLICY "equip_assignments_update" ON equipment_assignments FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- BANK TRANSACTIONS ---
DROP POLICY IF EXISTS "bank_txn_insert" ON bank_transactions;
CREATE POLICY "bank_txn_insert" ON bank_transactions FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "bank_txn_update" ON bank_transactions;
CREATE POLICY "bank_txn_update" ON bank_transactions FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- BANK RECONCILIATIONS ---
DROP POLICY IF EXISTS "bank_recon_insert" ON bank_reconciliations;
CREATE POLICY "bank_recon_insert" ON bank_reconciliations FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "bank_recon_update" ON bank_reconciliations;
CREATE POLICY "bank_recon_update" ON bank_reconciliations FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- CONTRACTS ---
DROP POLICY IF EXISTS "contracts_insert" ON contracts;
CREATE POLICY "contracts_insert" ON contracts FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "contracts_update" ON contracts;
CREATE POLICY "contracts_update" ON contracts FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- CONTRACT MILESTONES ---
DROP POLICY IF EXISTS "contract_milestones_insert" ON contract_milestones;
CREATE POLICY "contract_milestones_insert" ON contract_milestones FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

DROP POLICY IF EXISTS "contract_milestones_update" ON contract_milestones;
CREATE POLICY "contract_milestones_update" ON contract_milestones FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- --- LOGIN HISTORY ---
DROP POLICY IF EXISTS "login_history_select" ON login_history;
CREATE POLICY "login_history_select" ON login_history FOR SELECT
  USING (
    public.has_role(company_id, ARRAY['owner','admin'])
    OR user_id = (select auth.uid())
  );

-- --- ACTIVE SESSIONS (already dropped the duplicate SELECT above) ---
-- Recreate the active_sessions_select with optimized auth call
-- Note: active_sessions_all uses get_company_ids() which is fine
-- We only need to fix the user_id check
DROP POLICY IF EXISTS "active_sessions_all" ON active_sessions;
CREATE POLICY "active_sessions_all" ON active_sessions FOR ALL
  USING (company_id IN (SELECT public.get_company_ids()));

-- Re-add a fixed SELECT for user's own sessions (covers non-admin users)
CREATE POLICY "active_sessions_select" ON active_sessions FOR SELECT
  USING (
    public.has_role(company_id, ARRAY['owner','admin'])
    OR user_id = (select auth.uid())
  );


-- =============================================
-- From 010_markup_annotations.sql
-- =============================================

DROP POLICY IF EXISTS "markup_annotations_delete" ON markup_annotations;
CREATE POLICY "markup_annotations_delete" ON markup_annotations FOR DELETE
  USING (
    company_id IN (SELECT public.get_company_ids())
    AND (
      created_by = (select auth.uid())
      OR public.has_role(company_id, ARRAY['owner','admin'])
    )
  );


-- =============================================
-- From 011_pricing_tiers.sql
-- =============================================

DROP POLICY IF EXISTS "pricing_tiers_insert" ON pricing_tiers;
CREATE POLICY "pricing_tiers_insert" ON pricing_tiers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true)
  );

DROP POLICY IF EXISTS "pricing_tiers_update" ON pricing_tiers;
CREATE POLICY "pricing_tiers_update" ON pricing_tiers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true)
  );

DROP POLICY IF EXISTS "pricing_tiers_delete" ON pricing_tiers;
CREATE POLICY "pricing_tiers_delete" ON pricing_tiers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true)
  );


-- =============================================
-- From 017_promo_codes.sql
-- =============================================

DROP POLICY IF EXISTS "promo_codes_select" ON promo_codes;
CREATE POLICY "promo_codes_select" ON promo_codes FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "promo_codes_insert" ON promo_codes;
CREATE POLICY "promo_codes_insert" ON promo_codes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "promo_codes_update" ON promo_codes;
CREATE POLICY "promo_codes_update" ON promo_codes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "promo_codes_delete" ON promo_codes;
CREATE POLICY "promo_codes_delete" ON promo_codes FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "promo_redemptions_admin_select" ON promo_code_redemptions;
CREATE POLICY "promo_redemptions_admin_select" ON promo_code_redemptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "promo_redemptions_company_select" ON promo_code_redemptions;
CREATE POLICY "promo_redemptions_company_select" ON promo_code_redemptions FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = (select auth.uid()) AND is_active = true));


-- =============================================
-- From 018_platform_settings.sql
-- =============================================

DROP POLICY IF EXISTS "platform_settings_select" ON platform_settings;
CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "platform_settings_insert" ON platform_settings;
CREATE POLICY "platform_settings_insert" ON platform_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "platform_settings_update" ON platform_settings;
CREATE POLICY "platform_settings_update" ON platform_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "platform_settings_delete" ON platform_settings;
CREATE POLICY "platform_settings_delete" ON platform_settings FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));


-- =============================================
-- From 022_super_admin_features.sql
-- =============================================

DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

-- --- SUPPORT TICKETS ---
DROP POLICY IF EXISTS "support_tickets_admin_select" ON support_tickets;
CREATE POLICY "support_tickets_admin_select" ON support_tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "support_tickets_admin_update" ON support_tickets;
CREATE POLICY "support_tickets_admin_update" ON support_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "support_tickets_user_select" ON support_tickets;
CREATE POLICY "support_tickets_user_select" ON support_tickets FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "support_tickets_user_insert" ON support_tickets;
CREATE POLICY "support_tickets_user_insert" ON support_tickets FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- --- SUPPORT TICKET MESSAGES ---
DROP POLICY IF EXISTS "ticket_messages_admin_select" ON support_ticket_messages;
CREATE POLICY "ticket_messages_admin_select" ON support_ticket_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "ticket_messages_admin_insert" ON support_ticket_messages;
CREATE POLICY "ticket_messages_admin_insert" ON support_ticket_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

DROP POLICY IF EXISTS "ticket_messages_user_select" ON support_ticket_messages;
CREATE POLICY "ticket_messages_user_select" ON support_ticket_messages FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "ticket_messages_user_insert" ON support_ticket_messages;
CREATE POLICY "ticket_messages_user_insert" ON support_ticket_messages FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- --- EMAIL TEMPLATES ---
DROP POLICY IF EXISTS "email_templates_admin_all" ON email_templates;
CREATE POLICY "email_templates_admin_all" ON email_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));

-- --- FEATURE FLAGS ---
DROP POLICY IF EXISTS "feature_flags_admin_all" ON feature_flags;
CREATE POLICY "feature_flags_admin_all" ON feature_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (select auth.uid()) AND is_platform_admin = true));


-- =============================================
-- From 032_clock_events.sql
-- =============================================

DROP POLICY IF EXISTS "clock_events_select" ON clock_events;
CREATE POLICY "clock_events_select" ON clock_events FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR company_id IN (SELECT public.get_company_ids())
  );

DROP POLICY IF EXISTS "clock_events_insert" ON clock_events;
CREATE POLICY "clock_events_insert" ON clock_events FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));


COMMIT;
