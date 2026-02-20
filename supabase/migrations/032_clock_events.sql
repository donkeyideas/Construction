-- Migration 032: Clock Events table for Employee Portal
-- Supports employee clock in/out tracking

CREATE TABLE IF NOT EXISTS clock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clock_events_user_company ON clock_events(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_clock_events_timestamp ON clock_events(timestamp DESC);

-- RLS
ALTER TABLE clock_events ENABLE ROW LEVEL SECURITY;

-- Employees can read their own clock events
CREATE POLICY clock_events_select ON clock_events
  FOR SELECT USING (
    user_id = auth.uid()
    OR company_id IN (SELECT get_company_ids())
  );

-- Employees can insert their own clock events
CREATE POLICY clock_events_insert ON clock_events
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );
