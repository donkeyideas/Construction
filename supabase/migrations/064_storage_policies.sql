-- Storage bucket RLS policies for documents
-- Note: The app uses the admin client (service role) for uploads/downloads,
-- so these policies are defense-in-depth for any direct client-side access.

-- Ensure the documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Select policy: users can read their company's files
CREATE POLICY IF NOT EXISTS "company_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (SELECT id::text FROM companies WHERE id IN (SELECT get_company_ids()))
  );

-- Insert policy: users can upload to their company's path
CREATE POLICY IF NOT EXISTS "company_upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (SELECT id::text FROM companies WHERE id IN (SELECT get_company_ids()))
  );

-- Delete policy: users can delete their company's files
CREATE POLICY IF NOT EXISTS "company_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (SELECT id::text FROM companies WHERE id IN (SELECT get_company_ids()))
  );
