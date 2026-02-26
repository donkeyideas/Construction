-- Beta / Founding Member Program applications table
CREATE TABLE IF NOT EXISTS beta_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company_name text NOT NULL,
  company_type text NOT NULL,
  company_size text,
  role text,
  biggest_pain text,
  phone text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES user_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_beta_applications_status ON beta_applications(status);
CREATE INDEX IF NOT EXISTS idx_beta_applications_created ON beta_applications(created_at DESC);
