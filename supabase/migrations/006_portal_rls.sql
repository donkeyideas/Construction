-- ============================================================
-- Migration 006: RLS Policies for Portal Tables
-- Enables Row-Level Security on new portal tables and adds
-- policies for tenant/vendor self-service access.
-- ============================================================

-- ========== TENANT ANNOUNCEMENTS ==========
ALTER TABLE tenant_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_announcements_company_members_all"
  ON tenant_announcements FOR ALL
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "tenant_announcements_tenants_select"
  ON tenant_announcements FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND property_id IN (
      SELECT p.id FROM properties p
      JOIN units u ON u.property_id = p.id
      JOIN leases l ON l.unit_id = u.id
      WHERE l.tenant_user_id = auth.uid() AND l.status = 'active'
    )
  );

-- ========== TENANT DOCUMENTS ==========
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_documents_company_members_all"
  ON tenant_documents FOR ALL
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "tenant_documents_tenants_select"
  ON tenant_documents FOR SELECT
  USING (shared_with_tenant_user_id = auth.uid());

-- ========== VENDOR DOCUMENTS ==========
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_documents_company_members_all"
  ON vendor_documents FOR ALL
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "vendor_documents_vendors_select"
  ON vendor_documents FOR SELECT
  USING (
    vendor_contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- ========== PORTAL INVITATIONS ==========
ALTER TABLE portal_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_invitations_admin_owner_all"
  ON portal_invitations FOR ALL
  USING (public.has_role(company_id, ARRAY['owner', 'admin']));

-- ========== EXTEND EXISTING TABLE POLICIES ==========

-- Allow tenants to view their own lease payments
CREATE POLICY "rent_payments_tenant_select"
  ON rent_payments FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE tenant_user_id = auth.uid()
    )
  );

-- Allow tenants to view their own lease
CREATE POLICY "leases_tenant_select"
  ON leases FOR SELECT
  USING (tenant_user_id = auth.uid());

-- Allow tenants to view their unit and property info
CREATE POLICY "units_tenant_select"
  ON units FOR SELECT
  USING (
    id IN (
      SELECT unit_id FROM leases WHERE tenant_user_id = auth.uid()
    )
  );

-- Allow vendors to view their own invoices
CREATE POLICY "invoices_vendor_select"
  ON invoices FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- Allow vendors to view their own contracts
CREATE POLICY "vendor_contracts_vendor_select"
  ON vendor_contracts FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- Allow vendors to view their own certifications
CREATE POLICY "certifications_vendor_select"
  ON certifications FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- Allow vendors to manage their own certifications
CREATE POLICY "certifications_vendor_insert"
  ON certifications FOR INSERT
  WITH CHECK (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "certifications_vendor_update"
  ON certifications FOR UPDATE
  USING (
    contact_id IN (
      SELECT id FROM contacts WHERE user_id = auth.uid()
    )
  );

-- Allow tenants to create maintenance requests
CREATE POLICY "maintenance_requests_tenant_insert"
  ON maintenance_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

-- Allow tenants to view their own maintenance requests
CREATE POLICY "maintenance_requests_tenant_select"
  ON maintenance_requests FOR SELECT
  USING (requested_by = auth.uid());
