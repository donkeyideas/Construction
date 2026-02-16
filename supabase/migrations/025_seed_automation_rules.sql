-- ==========================================================================
-- Migration 025: Seed Automation Rules
-- Populates default automation rules for all existing companies
-- ==========================================================================

-- Function to seed automation rules for a single company
CREATE OR REPLACE FUNCTION seed_automation_rules(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get any admin/owner user for this company to set as created_by
  SELECT user_id INTO v_user_id
  FROM company_members
  WHERE company_id = p_company_id
    AND role IN ('owner', 'admin')
  LIMIT 1;

  -- If no admin found, use any member
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM company_members
    WHERE company_id = p_company_id
    LIMIT 1;
  END IF;

  -- Skip if no members found (orphan company)
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Only insert if the company doesn't already have automation rules
  IF EXISTS (SELECT 1 FROM automation_rules WHERE company_id = p_company_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- 1. Auto-Process Invoices
  INSERT INTO automation_rules (
    company_id, name, description, is_enabled, trigger_type, trigger_entity,
    trigger_config, conditions, actions, trigger_count, last_triggered_at, created_by
  ) VALUES (
    p_company_id,
    'Auto-Process Invoices',
    'Extract data via AI when documents are uploaded to AP folder, create draft AP invoice, notify accountant',
    true,
    'field_change',
    'invoices',
    '{"event": "document_uploaded", "folder": "accounts_payable"}'::jsonb,
    '[{"field": "file_type", "operator": "in", "value": ["pdf", "image"]}]'::jsonb,
    '[{"type": "ai_extract", "target": "invoice_data"}, {"type": "create_record", "entity": "invoices", "status": "draft"}, {"type": "notify", "role": "accountant"}]'::jsonb,
    34,
    NOW() - INTERVAL '2 hours',
    v_user_id
  );

  -- 2. Safety Score Alert
  INSERT INTO automation_rules (
    company_id, name, description, is_enabled, trigger_type, trigger_entity,
    trigger_config, conditions, actions, trigger_count, last_triggered_at, created_by
  ) VALUES (
    p_company_id,
    'Safety Score Alert',
    'Send alert to Project Manager and Executive when safety inspection score falls below 80, flag project',
    true,
    'record_created',
    'inspections',
    '{"event": "inspection_submitted"}'::jsonb,
    '[{"field": "score", "operator": "less_than", "value": 80}]'::jsonb,
    '[{"type": "notify", "role": "project_manager"}, {"type": "notify", "role": "owner"}, {"type": "flag_project"}]'::jsonb,
    2,
    NOW() - INTERVAL '8 days',
    v_user_id
  );

  -- 3. Lease Expiration Reminder
  INSERT INTO automation_rules (
    company_id, name, description, is_enabled, trigger_type, trigger_entity,
    trigger_config, conditions, actions, trigger_count, last_triggered_at, created_by
  ) VALUES (
    p_company_id,
    'Lease Expiration Reminder',
    'Notify property manager and create renewal task when lease expires within 60 days and renewal not started',
    true,
    'schedule',
    'certifications',
    '{"schedule": "daily", "time": "08:00"}'::jsonb,
    '[{"field": "expiry_date", "operator": "within_days", "value": 60}, {"field": "renewal_status", "operator": "equals", "value": "not_started"}]'::jsonb,
    '[{"type": "notify", "role": "property_manager"}, {"type": "create_task", "title": "Lease Renewal Review"}]'::jsonb,
    5,
    NOW() - INTERVAL '6 hours',
    v_user_id
  );

  -- 4. Budget Threshold Alert
  INSERT INTO automation_rules (
    company_id, name, description, is_enabled, trigger_type, trigger_entity,
    trigger_config, conditions, actions, trigger_count, last_triggered_at, created_by
  ) VALUES (
    p_company_id,
    'Budget Threshold Alert',
    'Notify PM and Controller when cost code spending exceeds 90% of budget, add to executive dashboard alerts',
    true,
    'threshold',
    'projects',
    '{"event": "cost_recorded"}'::jsonb,
    '[{"field": "cost_code_spending_pct", "operator": "greater_than", "value": 90}]'::jsonb,
    '[{"type": "notify", "role": "project_manager"}, {"type": "notify", "role": "accountant"}, {"type": "dashboard_alert", "level": "executive"}]'::jsonb,
    8,
    NOW() - INTERVAL '1 day',
    v_user_id
  );

  -- 5. Certification Expiry Monitor
  INSERT INTO automation_rules (
    company_id, name, description, is_enabled, trigger_type, trigger_entity,
    trigger_config, conditions, actions, trigger_count, last_triggered_at, created_by
  ) VALUES (
    p_company_id,
    'Certification Expiry Monitor',
    'Send reminder to person and their manager when certification expires within 30 days, block project assignment if expired',
    true,
    'schedule',
    'certifications',
    '{"schedule": "daily", "time": "07:00"}'::jsonb,
    '[{"field": "expiry_date", "operator": "within_days", "value": 30}]'::jsonb,
    '[{"type": "notify", "target": "person"}, {"type": "notify", "target": "manager"}, {"type": "block_assignment", "condition": "expired"}]'::jsonb,
    3,
    NOW() - INTERVAL '4 hours',
    v_user_id
  );

  -- Insert sample automation logs for the first rule (Auto-Process Invoices)
  INSERT INTO automation_logs (
    company_id, rule_id, rule_name, trigger_entity, status,
    actions_executed, execution_time_ms, created_at
  )
  SELECT
    p_company_id,
    r.id,
    'Auto-Process Invoices',
    'invoices',
    CASE WHEN gs.n <= 30 THEN 'success' WHEN gs.n <= 32 THEN 'failed' ELSE 'success' END,
    '[{"type": "ai_extract", "status": "completed"}, {"type": "create_record", "status": "completed"}]'::jsonb,
    FLOOR(RANDOM() * 800 + 200)::int,
    NOW() - (gs.n || ' hours')::interval
  FROM automation_rules r
  CROSS JOIN generate_series(1, 34) AS gs(n)
  WHERE r.company_id = p_company_id
    AND r.name = 'Auto-Process Invoices';

  -- Insert sample logs for Safety Score Alert
  INSERT INTO automation_logs (
    company_id, rule_id, rule_name, trigger_entity, status,
    actions_executed, execution_time_ms, created_at
  )
  SELECT
    p_company_id,
    r.id,
    'Safety Score Alert',
    'inspections',
    'success',
    '[{"type": "notify", "status": "completed"}, {"type": "flag_project", "status": "completed"}]'::jsonb,
    FLOOR(RANDOM() * 300 + 100)::int,
    NOW() - (gs.n * 4 || ' days')::interval
  FROM automation_rules r
  CROSS JOIN generate_series(1, 2) AS gs(n)
  WHERE r.company_id = p_company_id
    AND r.name = 'Safety Score Alert';

  -- Insert sample logs for Lease Expiration Reminder
  INSERT INTO automation_logs (
    company_id, rule_id, rule_name, trigger_entity, status,
    actions_executed, execution_time_ms, created_at
  )
  SELECT
    p_company_id,
    r.id,
    'Lease Expiration Reminder',
    'certifications',
    'success',
    '[{"type": "notify", "status": "completed"}, {"type": "create_task", "status": "completed"}]'::jsonb,
    FLOOR(RANDOM() * 200 + 50)::int,
    NOW() - (gs.n || ' days')::interval
  FROM automation_rules r
  CROSS JOIN generate_series(1, 5) AS gs(n)
  WHERE r.company_id = p_company_id
    AND r.name = 'Lease Expiration Reminder';

  -- Insert sample logs for Budget Threshold Alert
  INSERT INTO automation_logs (
    company_id, rule_id, rule_name, trigger_entity, status,
    actions_executed, execution_time_ms, created_at
  )
  SELECT
    p_company_id,
    r.id,
    'Budget Threshold Alert',
    'projects',
    CASE WHEN gs.n = 5 THEN 'failed' ELSE 'success' END,
    '[{"type": "notify", "status": "completed"}, {"type": "dashboard_alert", "status": "completed"}]'::jsonb,
    FLOOR(RANDOM() * 400 + 150)::int,
    NOW() - (gs.n * 2 || ' days')::interval
  FROM automation_rules r
  CROSS JOIN generate_series(1, 8) AS gs(n)
  WHERE r.company_id = p_company_id
    AND r.name = 'Budget Threshold Alert';

END;
$$;

-- Seed automation rules for all existing companies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM companies LOOP
    PERFORM seed_automation_rules(r.id);
  END LOOP;
END;
$$;
