-- ============================================================
-- Migration 008: Safety, Equipment, Banking, Contracts,
--                Integrations, Security, Automation
-- ============================================================

-- ==========================================================================
-- SECTION 1: SAFETY
-- ==========================================================================

CREATE TABLE IF NOT EXISTS safety_incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  incident_number text NOT NULL,
  title text NOT NULL,
  description text,
  incident_type text NOT NULL DEFAULT 'near_miss',
  severity text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'reported',
  incident_date timestamptz NOT NULL DEFAULT now(),
  location text,
  reported_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  injured_party_name text,
  injured_party_type text,
  body_part_affected text,
  treatment_provided text,
  witness_names text[] DEFAULT '{}',
  root_cause text,
  corrective_actions text,
  preventive_actions text,
  osha_recordable boolean DEFAULT false,
  osha_case_number text,
  days_away int DEFAULT 0,
  days_restricted int DEFAULT 0,
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_safety_incidents_number ON safety_incidents(company_id, incident_number);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_company ON safety_incidents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_project ON safety_incidents(project_id);

ALTER TABLE safety_incidents
  ADD CONSTRAINT safety_incidents_reporter_profile_fkey
  FOREIGN KEY (reported_by) REFERENCES user_profiles(id);

ALTER TABLE safety_incidents
  ADD CONSTRAINT safety_incidents_assignee_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safety_incidents_select" ON safety_incidents FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "safety_incidents_insert" ON safety_incidents FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "safety_incidents_update" ON safety_incidents FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "safety_incidents_delete" ON safety_incidents FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

-- Toolbox Talks
CREATE TABLE IF NOT EXISTS toolbox_talks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  talk_number text NOT NULL,
  title text NOT NULL,
  topic text NOT NULL DEFAULT 'general',
  description text,
  conducted_by uuid NOT NULL REFERENCES auth.users(id),
  conducted_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes int DEFAULT 15,
  attendees jsonb DEFAULT '[]',
  attendee_count int DEFAULT 0,
  notes text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_toolbox_talks_number ON toolbox_talks(company_id, talk_number);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_company ON toolbox_talks(company_id);

ALTER TABLE toolbox_talks
  ADD CONSTRAINT toolbox_talks_conductor_profile_fkey
  FOREIGN KEY (conducted_by) REFERENCES user_profiles(id);

ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "toolbox_talks_select" ON toolbox_talks FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "toolbox_talks_insert" ON toolbox_talks FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "toolbox_talks_update" ON toolbox_talks FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "toolbox_talks_delete" ON toolbox_talks FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));


-- ==========================================================================
-- SECTION 2: EQUIPMENT (maintenance logs + assignments)
-- ==========================================================================

-- FK from existing equipment table to user_profiles
ALTER TABLE equipment
  ADD CONSTRAINT equipment_assignee_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

CREATE TABLE IF NOT EXISTS equipment_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL DEFAULT 'preventive',
  title text NOT NULL,
  description text,
  performed_by text,
  performed_by_user_id uuid REFERENCES auth.users(id),
  maintenance_date date NOT NULL DEFAULT CURRENT_DATE,
  next_due_date date,
  cost numeric(14,2) DEFAULT 0,
  vendor_name text,
  parts_used jsonb DEFAULT '[]',
  hours_at_service numeric(10,2),
  status text DEFAULT 'completed',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equip_maint_equipment ON equipment_maintenance_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_maint_company ON equipment_maintenance_logs(company_id);

ALTER TABLE equipment_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equip_maint_select" ON equipment_maintenance_logs FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "equip_maint_insert" ON equipment_maintenance_logs FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "equip_maint_update" ON equipment_maintenance_logs FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "equip_maint_delete" ON equipment_maintenance_logs FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE TABLE IF NOT EXISTS equipment_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  returned_date date,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equip_assignments_equipment ON equipment_assignments(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_assignments_company ON equipment_assignments(company_id, status);

ALTER TABLE equipment_assignments
  ADD CONSTRAINT equip_assignments_assignee_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

ALTER TABLE equipment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equip_assignments_select" ON equipment_assignments FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "equip_assignments_insert" ON equipment_assignments FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "equip_assignments_update" ON equipment_assignments FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "equip_assignments_delete" ON equipment_assignments FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));


-- ==========================================================================
-- SECTION 3: BANKING (transactions + reconciliations)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  posted_date date,
  description text NOT NULL,
  reference text,
  transaction_type text NOT NULL DEFAULT 'debit',
  amount numeric(14,2) NOT NULL,
  running_balance numeric(14,2),
  category text,
  is_reconciled boolean DEFAULT false,
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES auth.users(id),
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_account ON bank_transactions(bank_account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txn_company ON bank_transactions(company_id);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_txn_select" ON bank_transactions FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "bank_txn_insert" ON bank_transactions FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "bank_txn_update" ON bank_transactions FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "bank_txn_delete" ON bank_transactions FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date date NOT NULL,
  statement_ending_balance numeric(14,2) NOT NULL,
  book_balance numeric(14,2) NOT NULL DEFAULT 0,
  adjusted_book_balance numeric(14,2),
  difference numeric(14,2) DEFAULT 0,
  status text DEFAULT 'in_progress',
  reconciled_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_account ON bank_reconciliations(bank_account_id, statement_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_recon_company ON bank_reconciliations(company_id);

ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_recon_select" ON bank_reconciliations FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "bank_recon_insert" ON bank_reconciliations FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "bank_recon_update" ON bank_reconciliations FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "bank_recon_delete" ON bank_reconciliations FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));


-- ==========================================================================
-- SECTION 4: CONTRACTS
-- ==========================================================================

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_number text NOT NULL,
  title text NOT NULL,
  description text,
  contract_type text NOT NULL DEFAULT 'subcontractor',
  status text DEFAULT 'draft',
  party_name text NOT NULL,
  party_contact_id uuid REFERENCES contacts(id),
  party_email text,
  party_phone text,
  contract_amount numeric(14,2) DEFAULT 0,
  retention_pct numeric(5,2) DEFAULT 0,
  payment_terms text,
  start_date date,
  end_date date,
  signed_date date,
  project_id uuid REFERENCES projects(id),
  property_id uuid REFERENCES properties(id),
  scope_of_work text,
  terms_and_conditions text,
  special_conditions text,
  insurance_required boolean DEFAULT false,
  insurance_expiry date,
  bond_required boolean DEFAULT false,
  bond_amount numeric(14,2),
  document_url text,
  attachments jsonb DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  terminated_by uuid REFERENCES auth.users(id),
  terminated_at timestamptz,
  termination_reason text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_number ON contracts(company_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);

ALTER TABLE contracts
  ADD CONSTRAINT contracts_creator_profile_fkey
  FOREIGN KEY (created_by) REFERENCES user_profiles(id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON contracts FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "contracts_insert" ON contracts FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "contracts_update" ON contracts FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "contracts_delete" ON contracts FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE TABLE IF NOT EXISTS contract_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  amount numeric(14,2),
  status text DEFAULT 'pending',
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_milestones_contract ON contract_milestones(contract_id);

ALTER TABLE contract_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_milestones_select" ON contract_milestones FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "contract_milestones_insert" ON contract_milestones FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "contract_milestones_update" ON contract_milestones FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "contract_milestones_delete" ON contract_milestones FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));


-- ==========================================================================
-- SECTION 5: INTEGRATIONS
-- ==========================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider text NOT NULL,
  display_name text NOT NULL,
  is_connected boolean DEFAULT false,
  connected_at timestamptz,
  connected_by uuid REFERENCES auth.users(id),
  auth_type text,
  config jsonb DEFAULT '{}',
  sync_settings jsonb DEFAULT '{}',
  status text DEFAULT 'disconnected',
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_company ON integrations(company_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select" ON integrations FOR SELECT
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE POLICY "integrations_insert" ON integrations FOR INSERT
  WITH CHECK (public.has_role(company_id, ARRAY['owner','admin']));

CREATE POLICY "integrations_update" ON integrations FOR UPDATE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE POLICY "integrations_delete" ON integrations FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));


-- ==========================================================================
-- SECTION 6: SECURITY
-- ==========================================================================

CREATE TABLE IF NOT EXISTS security_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  min_password_length int DEFAULT 8,
  require_uppercase boolean DEFAULT true,
  require_lowercase boolean DEFAULT true,
  require_numbers boolean DEFAULT true,
  require_special_chars boolean DEFAULT false,
  password_expiry_days int DEFAULT 0,
  session_timeout_minutes int DEFAULT 480,
  max_concurrent_sessions int DEFAULT 5,
  force_logout_on_password_change boolean DEFAULT true,
  require_2fa boolean DEFAULT false,
  require_2fa_for_roles text[] DEFAULT '{}',
  ip_allowlist_enabled boolean DEFAULT false,
  ip_allowlist text[] DEFAULT '{}',
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_settings_select" ON security_settings FOR SELECT
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE POLICY "security_settings_insert" ON security_settings FOR INSERT
  WITH CHECK (public.has_role(company_id, ARRAY['owner','admin']));

CREATE POLICY "security_settings_update" ON security_settings FOR UPDATE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  login_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  status text DEFAULT 'success',
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_company ON login_history(company_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, login_at DESC);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_history_select" ON login_history FOR SELECT
  USING (
    public.has_role(company_id, ARRAY['owner','admin'])
    OR user_id = auth.uid()
  );

CREATE POLICY "login_history_insert" ON login_history FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));

CREATE TABLE IF NOT EXISTS active_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  session_token text NOT NULL,
  ip_address text,
  user_agent text,
  device_info text,
  last_active_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_company ON active_sessions(company_id);

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_sessions_select" ON active_sessions FOR SELECT
  USING (
    public.has_role(company_id, ARRAY['owner','admin'])
    OR user_id = auth.uid()
  );

CREATE POLICY "active_sessions_all" ON active_sessions FOR ALL
  USING (company_id IN (SELECT public.get_company_ids()));


-- ==========================================================================
-- SECTION 7: AUTOMATION
-- ==========================================================================

CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT true,
  is_template boolean DEFAULT false,
  trigger_type text NOT NULL,
  trigger_entity text,
  trigger_config jsonb DEFAULT '{}',
  conditions jsonb DEFAULT '[]',
  actions jsonb DEFAULT '[]',
  last_triggered_at timestamptz,
  trigger_count int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_company ON automation_rules(company_id);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_rules_select" ON automation_rules FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "automation_rules_insert" ON automation_rules FOR INSERT
  WITH CHECK (public.has_role(company_id, ARRAY['owner','admin']));

CREATE POLICY "automation_rules_update" ON automation_rules FOR UPDATE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE POLICY "automation_rules_delete" ON automation_rules FOR DELETE
  USING (public.has_role(company_id, ARRAY['owner','admin']));

CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  trigger_entity text,
  trigger_entity_id uuid,
  status text DEFAULT 'success',
  actions_executed jsonb DEFAULT '[]',
  error_message text,
  execution_time_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_company ON automation_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON automation_logs(rule_id);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_logs_select" ON automation_logs FOR SELECT
  USING (company_id IN (SELECT public.get_company_ids()));

CREATE POLICY "automation_logs_insert" ON automation_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT public.get_company_ids()));
