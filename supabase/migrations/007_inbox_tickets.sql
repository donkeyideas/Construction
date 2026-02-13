-- ============================================================
-- Migration 007: Inbox Messages & Ticket System
-- ============================================================

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
