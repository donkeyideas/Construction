-- Migration 037: Property payment methods + tenant lease self-select RLS
-- Enables property managers to configure payment methods (Zelle, CashApp, etc.)
-- displayed on the tenant portal, and allows tenants to read their own lease.

-- ============================================================
-- 1. property_payment_methods table
-- ============================================================
CREATE TABLE property_payment_methods (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  method_type text NOT NULL,          -- zelle, cashapp, venmo, paypal, wire, check, other
  label       text NOT NULL,          -- display name, e.g. "Zelle"
  instructions text NOT NULL,         -- how to pay, e.g. "Send to myemail@gmail.com"
  recipient_info text,                -- copyable handle/email/phone
  is_enabled  boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_methods_property
  ON property_payment_methods(property_id) WHERE is_enabled = true;

-- ============================================================
-- 2. RLS for property_payment_methods
-- ============================================================
ALTER TABLE property_payment_methods ENABLE ROW LEVEL SECURITY;

-- Company members full access
CREATE POLICY "payment_methods_company_all"
  ON property_payment_methods FOR ALL
  USING (company_id IN (SELECT get_company_ids()));

-- Tenants can view enabled methods for their property
CREATE POLICY "payment_methods_tenant_select"
  ON property_payment_methods FOR SELECT
  USING (
    is_enabled = true
    AND property_id IN (
      SELECT l.property_id FROM leases l
      WHERE l.tenant_user_id = (SELECT auth.uid())
        AND l.status = 'active'
    )
  );

-- ============================================================
-- 3. Tenant self-select on leases (like vendor contacts_self_select)
-- ============================================================
CREATE POLICY "leases_tenant_self_select"
  ON leases
  FOR SELECT
  USING (tenant_user_id = (SELECT auth.uid()));
