-- Push notification tokens for mobile app
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
