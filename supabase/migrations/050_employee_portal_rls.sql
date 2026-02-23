-- Allow field_worker and employee roles to submit RFIs from the employee portal.
-- Previously only owner/admin/project_manager/superintendent could insert.
DROP POLICY IF EXISTS "RFIs: managers can create" ON rfis;
CREATE POLICY "RFIs: team members can create"
  ON rfis FOR INSERT
  WITH CHECK (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent', 'field_worker', 'employee'])
  );

-- Also allow employee role to submit daily logs (field_worker was already allowed).
DROP POLICY IF EXISTS "Daily logs: managers and field workers can create" ON daily_logs;
CREATE POLICY "Daily logs: team members can create"
  ON daily_logs FOR INSERT
  WITH CHECK (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent', 'field_worker', 'employee'])
  );

-- Allow field_worker and employee to update their own daily logs too.
DROP POLICY IF EXISTS "Daily logs: managers and field workers can update" ON daily_logs;
CREATE POLICY "Daily logs: team members can update"
  ON daily_logs FOR UPDATE
  USING (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent', 'field_worker', 'employee'])
  );

-- Allow field_worker and employee to update RFIs (add details, close, etc.)
DROP POLICY IF EXISTS "RFIs: managers can update" ON rfis;
CREATE POLICY "RFIs: team members can update"
  ON rfis FOR UPDATE
  USING (
    public.has_role(company_id, array['owner', 'admin', 'project_manager', 'superintendent', 'field_worker', 'employee'])
  );
