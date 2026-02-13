-- ============================================================
-- Migration 005: Portal Access Support
-- Adds portal_type to user_profiles, tenant/vendor document
-- sharing tables, tenant announcements, portal invitations.
-- ============================================================

-- 1. Add portal_type to user_profiles for fast middleware routing
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS portal_type text DEFAULT NULL;
-- Values: 'executive', 'admin', 'tenant', 'vendor'

COMMENT ON COLUMN user_profiles.portal_type IS 'Portal type for fast routing: executive, admin, tenant, vendor';

-- 2. Tenant announcements (per-property announcements for tenants)
CREATE TABLE IF NOT EXISTS tenant_announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general', -- general, maintenance, emergency, event
  is_active boolean DEFAULT true,
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Tenant documents (documents shared with specific tenants)
CREATE TABLE IF NOT EXISTS tenant_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES leases(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with_tenant_user_id uuid REFERENCES auth.users(id),
  shared_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4. Vendor documents (documents shared with specific vendors)
CREATE TABLE IF NOT EXISTS vendor_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  vendor_contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 5. Portal invitations (track tenant/vendor portal invites)
CREATE TABLE IF NOT EXISTS portal_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  portal_type text NOT NULL, -- 'tenant', 'vendor'
  email text NOT NULL,
  entity_id uuid NOT NULL, -- lease_id for tenants, contact_id for vendors
  entity_type text NOT NULL, -- 'lease', 'contact'
  invited_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending', -- pending, accepted, expired
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_portal_type
  ON user_profiles(portal_type) WHERE portal_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_announcements_property
  ON tenant_announcements(property_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_announcements_company
  ON tenant_announcements(company_id);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant
  ON tenant_documents(shared_with_tenant_user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_lease
  ON tenant_documents(lease_id);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor
  ON vendor_documents(vendor_contact_id);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_project
  ON vendor_documents(project_id);

CREATE INDEX IF NOT EXISTS idx_portal_invitations_token
  ON portal_invitations(token) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_portal_invitations_email
  ON portal_invitations(email, portal_type);
