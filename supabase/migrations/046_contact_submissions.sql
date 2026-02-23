-- Contact submissions from public forms (homepage custom plan + contact page)
CREATE TABLE contact_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('contact', 'custom_plan')),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  company_size text CHECK (company_size IN ('1-10', '11-50', '51-200', '200+')),
  modules_interested text[] DEFAULT '{}',
  budget_range text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_type ON contact_submissions(type);
CREATE INDEX idx_contact_submissions_created ON contact_submissions(created_at DESC);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public INSERT (anyone can submit a form)
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- Platform admins can read all submissions
CREATE POLICY "Platform admins can view submissions"
  ON contact_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_platform_admin = true
    )
  );

-- Platform admins can update submissions
CREATE POLICY "Platform admins can update submissions"
  ON contact_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_platform_admin = true
    )
  );
