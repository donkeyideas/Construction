-- ============================================================
-- 022: Super Admin Feature Tables
-- Audit Logs, Support Tickets, Email Templates, Feature Flags
-- ============================================================

-- ============================================================
-- 1. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles(id),
  company_id uuid REFERENCES companies(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "audit_logs_insert_any" ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 2. SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number serial,
  company_id uuid REFERENCES companies(id),
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text DEFAULT 'general' CHECK (category IN ('general', 'billing', 'technical', 'feature_request', 'bug_report', 'account')),
  assigned_to uuid REFERENCES user_profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX idx_support_tickets_created ON support_tickets(created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Platform admins see all tickets
CREATE POLICY "support_tickets_admin_select" ON support_tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "support_tickets_admin_update" ON support_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

-- Users can see and create their own tickets
CREATE POLICY "support_tickets_user_select" ON support_tickets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "support_tickets_user_insert" ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Support ticket messages
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) NOT NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);

ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_messages_admin_select" ON support_ticket_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "ticket_messages_admin_insert" ON support_ticket_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "ticket_messages_user_select" ON support_ticket_messages FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  )
  ;

CREATE POLICY "ticket_messages_user_insert" ON support_ticket_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]',
  category text DEFAULT 'system' CHECK (category IN ('system', 'billing', 'notification', 'marketing', 'onboarding')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_all" ON email_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

-- Seed default templates
INSERT INTO email_templates (name, subject, body, variables, category) VALUES
(
  'welcome',
  'Welcome to {{site_name}}!',
  '<h1>Welcome, {{user_name}}!</h1><p>Thank you for joining {{site_name}}. Your account for {{company_name}} is ready.</p><p>Get started by <a href="{{login_url}}">logging in</a>.</p>',
  '["user_name", "company_name", "site_name", "login_url"]',
  'onboarding'
),
(
  'password_reset',
  'Reset Your {{site_name}} Password',
  '<h1>Password Reset</h1><p>Hi {{user_name}},</p><p>Click the link below to reset your password:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>This link expires in 1 hour.</p>',
  '["user_name", "site_name", "reset_url"]',
  'system'
),
(
  'invoice_created',
  'New Invoice #{{invoice_number}} - {{site_name}}',
  '<h1>Invoice Created</h1><p>Hi {{user_name}},</p><p>A new invoice #{{invoice_number}} for {{amount}} has been created for {{company_name}}.</p><p><a href="{{invoice_url}}">View Invoice</a></p>',
  '["user_name", "company_name", "invoice_number", "amount", "site_name", "invoice_url"]',
  'billing'
),
(
  'lease_reminder',
  'Lease Expiring Soon - {{property_name}}',
  '<h1>Lease Expiration Reminder</h1><p>Hi {{user_name}},</p><p>The lease for {{tenant_name}} at {{property_name}}, Unit {{unit_name}} expires on {{expiry_date}}.</p><p><a href="{{lease_url}}">View Lease Details</a></p>',
  '["user_name", "tenant_name", "property_name", "unit_name", "expiry_date", "lease_url"]',
  'notification'
),
(
  'maintenance_update',
  'Maintenance Request Update - {{property_name}}',
  '<h1>Maintenance Update</h1><p>Hi {{user_name}},</p><p>Your maintenance request "{{request_title}}" at {{property_name}} has been updated to: <strong>{{new_status}}</strong>.</p><p><a href="{{request_url}}">View Details</a></p>',
  '["user_name", "request_title", "property_name", "new_status", "request_url"]',
  'notification'
),
(
  'subscription_confirmation',
  'Subscription Confirmed - {{plan_name}} Plan',
  '<h1>Subscription Confirmed</h1><p>Hi {{user_name}},</p><p>Your {{company_name}} subscription has been confirmed on the <strong>{{plan_name}}</strong> plan at {{amount}}/month.</p><p>Thank you for choosing {{site_name}}!</p>',
  '["user_name", "company_name", "plan_name", "amount", "site_name"]',
  'billing'
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. FEATURE FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  is_enabled boolean DEFAULT false,
  plan_requirements jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_admin_all" ON feature_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = true));

CREATE POLICY "feature_flags_read" ON feature_flags FOR SELECT
  USING (true);

-- Seed default feature flags
INSERT INTO feature_flags (name, description, is_enabled, plan_requirements) VALUES
('ai_insights', 'AI-powered project and financial insights', true, '["professional", "enterprise"]'),
('document_management', 'Document storage and plan room', true, '["starter", "professional", "enterprise"]'),
('advanced_reporting', 'Custom report builder and analytics', false, '["professional", "enterprise"]'),
('api_access', 'REST API access for integrations', false, '["enterprise"]'),
('multi_company', 'Manage multiple companies from one account', false, '["enterprise"]'),
('white_label', 'Custom branding and white-label options', false, '["enterprise"]'),
('bulk_import', 'Bulk CSV/Excel data import', true, '["starter", "professional", "enterprise"]'),
('tenant_portal', 'Tenant self-service portal', true, '["professional", "enterprise"]'),
('vendor_portal', 'Vendor/subcontractor portal', true, '["professional", "enterprise"]'),
('realtime_notifications', 'Real-time push notifications', true, '["starter", "professional", "enterprise"]')
ON CONFLICT (name) DO NOTHING;
