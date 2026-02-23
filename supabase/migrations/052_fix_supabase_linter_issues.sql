-- ============================================================
-- Fix all Supabase database linter issues
-- Addresses: rls_disabled, function_search_path, rls_always_true,
--            auth_rls_initplan (performance), multiple_permissive_policies
-- ============================================================


-- ============================================================
-- 1. ERROR: RLS disabled on payment_webhook_events
-- ============================================================

ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only platform admins and the owning company can read webhook events
CREATE POLICY "payment_webhook_events_select"
  ON payment_webhook_events FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR public.is_platform_admin()
  );

-- Only the system (service role) inserts webhook events — no user INSERT policy needed.
-- The Stripe/payment webhook handler uses the admin client which bypasses RLS.


-- ============================================================
-- 2. WARN: Function search_path mutable
--    Fix adjust_bank_balance and seed_company_chart_of_accounts
-- ============================================================

-- adjust_bank_balance (created in migration 051)
ALTER FUNCTION public.adjust_bank_balance(UUID, NUMERIC) SET search_path = 'public';

-- seed_company_chart_of_accounts — migration 033 already set this, but re-apply to be safe
ALTER FUNCTION public.seed_company_chart_of_accounts(UUID) SET search_path = 'public';


-- ============================================================
-- 3. WARN: RLS policy always true — contact_submissions INSERT
--    Replace the unrestricted `WITH CHECK (true)` with a check
--    that enforces basic field presence (still allows anon/public).
-- ============================================================

DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_submissions;

CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  WITH CHECK (
    -- Allow anonymous submissions but require non-empty name, email, and message
    length(COALESCE(name, '')) > 0
    AND length(COALESCE(email, '')) > 0
    AND length(COALESCE(message, '')) > 0
  );


-- ============================================================
-- 4. WARN: auth_rls_initplan (Performance)
--    Replace `auth.uid()` with `(SELECT auth.uid())` so it's
--    evaluated once per query, not once per row.
-- ============================================================

-- --- aeo_tracking (4 policies) ---
DROP POLICY IF EXISTS "aeo_tracking_select" ON aeo_tracking;
DROP POLICY IF EXISTS "aeo_tracking_insert" ON aeo_tracking;
DROP POLICY IF EXISTS "aeo_tracking_update" ON aeo_tracking;
DROP POLICY IF EXISTS "aeo_tracking_delete" ON aeo_tracking;

CREATE POLICY "aeo_tracking_select" ON aeo_tracking FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

CREATE POLICY "aeo_tracking_insert" ON aeo_tracking FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

CREATE POLICY "aeo_tracking_update" ON aeo_tracking FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

CREATE POLICY "aeo_tracking_delete" ON aeo_tracking FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

-- --- cro_ab_tests (4 policies) ---
DROP POLICY IF EXISTS "cro_ab_tests_select" ON cro_ab_tests;
DROP POLICY IF EXISTS "cro_ab_tests_insert" ON cro_ab_tests;
DROP POLICY IF EXISTS "cro_ab_tests_update" ON cro_ab_tests;
DROP POLICY IF EXISTS "cro_ab_tests_delete" ON cro_ab_tests;

CREATE POLICY "cro_ab_tests_select" ON cro_ab_tests FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

CREATE POLICY "cro_ab_tests_insert" ON cro_ab_tests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

CREATE POLICY "cro_ab_tests_update" ON cro_ab_tests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

CREATE POLICY "cro_ab_tests_delete" ON cro_ab_tests FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

-- --- contact_submissions (2 policies — platform admin view/update) ---
DROP POLICY IF EXISTS "Platform admins can view submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Platform admins can update submissions" ON contact_submissions;

CREATE POLICY "Platform admins can view submissions"
  ON contact_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

CREATE POLICY "Platform admins can update submissions"
  ON contact_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid()) AND is_platform_admin = true));

-- --- invoices: invoices_vendor_insert ---
DROP POLICY IF EXISTS "invoices_vendor_insert" ON invoices;

CREATE POLICY "invoices_vendor_insert" ON invoices FOR INSERT
  WITH CHECK (
    invoice_type = 'payable'
    AND vendor_id IN (SELECT id FROM contacts WHERE user_id = (SELECT auth.uid()))
  );


-- ============================================================
-- 5. WARN: Multiple permissive policies for same role/action
--    Merge duplicate SELECT/INSERT policies into single policies.
-- ============================================================

-- --- contacts: merge "Contacts: company members can view" + "contacts_self_select" ---
-- The original policy already covers company members. contacts_self_select adds
-- self-access for vendor/tenant portal users who may not be company members.
-- Merge into a single policy that handles both cases.
DROP POLICY IF EXISTS "Contacts: company members can view" ON contacts;
DROP POLICY IF EXISTS "contacts_self_select" ON contacts;

CREATE POLICY "Contacts: company members and self can view"
  ON contacts FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR user_id = (SELECT auth.uid())
  );

-- --- invoices: merge "Invoices: accountant and admin can create" + "invoices_vendor_insert" ---
-- The original policy allows accountant/admin/owner to create any invoice.
-- invoices_vendor_insert allows vendors to submit payable invoices for themselves.
-- Merge into a single policy.
DROP POLICY IF EXISTS "Invoices: accountant and admin can create" ON invoices;
-- invoices_vendor_insert was already re-created above with (SELECT auth.uid()),
-- but now we need to merge it with the accountant/admin policy.
DROP POLICY IF EXISTS "invoices_vendor_insert" ON invoices;

CREATE POLICY "Invoices: authorized users can create"
  ON invoices FOR INSERT
  WITH CHECK (
    -- Company accountants, admins, and owners
    public.has_role(company_id, array['owner', 'admin', 'accountant'])
    -- Vendors can submit payable invoices for themselves
    OR (
      invoice_type = 'payable'
      AND vendor_id IN (SELECT id FROM contacts WHERE user_id = (SELECT auth.uid()))
    )
  );

-- --- leases: merge "Leases: company members and tenants can view" + "leases_tenant_self_select" ---
-- The original policy already includes `tenant_user_id = auth.uid()`.
-- leases_tenant_self_select is redundant. Just drop the duplicate.
DROP POLICY IF EXISTS "leases_tenant_self_select" ON leases;
-- Re-create the original with (SELECT auth.uid()) for performance
DROP POLICY IF EXISTS "Leases: company members and tenants can view" ON leases;

CREATE POLICY "Leases: company members and tenants can view"
  ON leases FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR tenant_user_id = (SELECT auth.uid())
  );

-- --- property_payment_methods: merge payment_methods_company_all + payment_methods_tenant_select ---
-- payment_methods_company_all is a FOR ALL policy (covers SELECT too).
-- payment_methods_tenant_select is a FOR SELECT policy.
-- Having both for SELECT causes the linter warning.
-- Replace with separate policies for each operation to avoid FOR ALL overlap.
DROP POLICY IF EXISTS "payment_methods_company_all" ON property_payment_methods;
DROP POLICY IF EXISTS "payment_methods_tenant_select" ON property_payment_methods;

-- Company members: full CRUD
CREATE POLICY "payment_methods_company_select"
  ON property_payment_methods FOR SELECT
  USING (
    company_id IN (SELECT public.get_company_ids())
    OR (
      is_enabled = true
      AND property_id IN (
        SELECT l.property_id FROM leases l
        WHERE l.tenant_user_id = (SELECT auth.uid())
          AND l.status = 'active'
      )
    )
  );

CREATE POLICY "payment_methods_company_insert"
  ON property_payment_methods FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "payment_methods_company_update"
  ON property_payment_methods FOR UPDATE
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "payment_methods_company_delete"
  ON property_payment_methods FOR DELETE
  USING (company_id IN (SELECT public.get_company_ids()));
