-- Migration 036: Allow vendor users to read their own contact record
-- Vendor users don't have company_members entries, so get_company_ids() returns empty.
-- This policy lets them SELECT their own row via user_id = auth.uid().

CREATE POLICY "contacts_self_select"
  ON contacts
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));
