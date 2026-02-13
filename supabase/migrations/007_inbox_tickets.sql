-- ============================================================
-- Migration 007: Inbox Messages, Ticket System & user_profiles FKs
-- ============================================================

-- ==========================================================================
-- STEP 1: Add direct FK constraints from existing tables to user_profiles
-- PostgREST needs direct FKs to enable embedded joins (e.g. user_profiles(...))
-- The existing FKs go to auth.users but PostgREST can't follow transitive paths.
-- ==========================================================================

-- company_members → user_profiles
ALTER TABLE company_members
  ADD CONSTRAINT company_members_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id);

-- comments → user_profiles
ALTER TABLE comments
  ADD CONSTRAINT comments_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id);

-- projects → user_profiles (project_manager, superintendent)
ALTER TABLE projects
  ADD CONSTRAINT projects_pm_profile_fkey
  FOREIGN KEY (project_manager_id) REFERENCES user_profiles(id);

ALTER TABLE projects
  ADD CONSTRAINT projects_super_profile_fkey
  FOREIGN KEY (superintendent_id) REFERENCES user_profiles(id);

-- project_tasks → user_profiles
ALTER TABLE project_tasks
  ADD CONSTRAINT project_tasks_assignee_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

-- daily_logs → user_profiles
ALTER TABLE daily_logs
  ADD CONSTRAINT daily_logs_creator_profile_fkey
  FOREIGN KEY (created_by) REFERENCES user_profiles(id);

-- rfis → user_profiles
ALTER TABLE rfis
  ADD CONSTRAINT rfis_assignee_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

-- documents → user_profiles
ALTER TABLE documents
  ADD CONSTRAINT documents_uploader_profile_fkey
  FOREIGN KEY (uploaded_by) REFERENCES user_profiles(id);

-- time_entries → user_profiles
ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id);

-- audit_log → user_profiles
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id);

-- opportunities → user_profiles
ALTER TABLE opportunities
  ADD CONSTRAINT opportunities_assignee_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

-- ========== MESSAGES (Internal Direct Messaging) ==========
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_id uuid NOT NULL REFERENCES auth.users(id),
  subject text,
  body text NOT NULL,
  parent_message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  is_archived boolean DEFAULT false,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_company ON messages(company_id);
CREATE INDEX idx_messages_thread ON messages(parent_message_id);

-- Direct FK to user_profiles for PostgREST joins
ALTER TABLE messages
  ADD CONSTRAINT messages_sender_profile_fkey
  FOREIGN KEY (sender_id) REFERENCES user_profiles(id);

ALTER TABLE messages
  ADD CONSTRAINT messages_recipient_profile_fkey
  FOREIGN KEY (recipient_id) REFERENCES user_profiles(id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own"
  ON messages FOR SELECT
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

CREATE POLICY "messages_insert_company"
  ON messages FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "messages_update_recipient"
  ON messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- ========== TICKETS (Internal Ticket System) ==========
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  category text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  closed_at timestamptz,
  entity_type text,
  entity_id uuid,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tickets_company ON tickets(company_id, status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to, status);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE UNIQUE INDEX idx_tickets_number ON tickets(company_id, ticket_number);

-- Direct FKs to user_profiles for PostgREST joins
ALTER TABLE tickets
  ADD CONSTRAINT tickets_creator_profile_fkey
  FOREIGN KEY (created_by) REFERENCES user_profiles(id);

ALTER TABLE tickets
  ADD CONSTRAINT tickets_assignee_profile_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id);

ALTER TABLE tickets
  ADD CONSTRAINT tickets_resolver_profile_fkey
  FOREIGN KEY (resolved_by) REFERENCES user_profiles(id);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select_company"
  ON tickets FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "tickets_insert_company"
  ON tickets FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "tickets_update_authorized"
  ON tickets FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      auth.uid() = assigned_to
      OR auth.uid() = created_by
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE user_id = auth.uid()
          AND company_id = tickets.company_id
          AND role IN ('owner', 'admin', 'project_manager')
      )
    )
  );
