-- ============================================================
-- Migration 058: Fix FK constraints for user deletion
--
-- Adds ON DELETE SET NULL / CASCADE to all FK references to
-- auth.users(id) and user_profiles(id) so that deleting a user
-- does not fail with constraint violations.
--
-- NOT NULL columns that should allow null after user deletion
-- are altered to DROP NOT NULL first.
-- ============================================================

-- ============================================================
-- PART 1: Fix NOT NULL columns that reference auth.users
-- Make them nullable so SET NULL works on user deletion
-- ============================================================

-- safety_incidents.reported_by
ALTER TABLE safety_incidents ALTER COLUMN reported_by DROP NOT NULL;

-- toolbox_talks.conducted_by (same pattern as safety_inspections)
ALTER TABLE toolbox_talks ALTER COLUMN conducted_by DROP NOT NULL;

-- login_history.user_id
ALTER TABLE login_history ALTER COLUMN user_id DROP NOT NULL;

-- active_sessions.user_id
ALTER TABLE active_sessions ALTER COLUMN user_id DROP NOT NULL;

-- messages.sender_id and recipient_id
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE messages ALTER COLUMN recipient_id DROP NOT NULL;

-- tickets.created_by
ALTER TABLE tickets ALTER COLUMN created_by DROP NOT NULL;

-- support_tickets.user_id
ALTER TABLE support_tickets ALTER COLUMN user_id DROP NOT NULL;

-- markup_annotations.created_by
DO $$ BEGIN
  ALTER TABLE markup_annotations ALTER COLUMN created_by DROP NOT NULL;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- payroll_items.user_id (keep payroll history, lose user ref)
DO $$ BEGIN
  ALTER TABLE payroll_items ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- promo_redemptions.user_id
DO $$ BEGIN
  ALTER TABLE promo_redemptions ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- daily_logs.created_by (keep log history, lose creator ref)
ALTER TABLE daily_logs ALTER COLUMN created_by DROP NOT NULL;

-- rfis.submitted_by (keep RFI history, lose submitter ref)
ALTER TABLE rfis ALTER COLUMN submitted_by DROP NOT NULL;

-- safety_inspections.inspector_id (keep inspection history)
ALTER TABLE safety_inspections ALTER COLUMN inspector_id DROP NOT NULL;

-- time_entries.user_id (keep time history, lose user ref)
ALTER TABLE time_entries ALTER COLUMN user_id DROP NOT NULL;

-- comments.user_id (keep comment history)
ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;

-- notifications.user_id (per-user data, but make nullable for safety)
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

-- ai_conversations.user_id
ALTER TABLE ai_conversations ALTER COLUMN user_id DROP NOT NULL;

-- support_ticket_messages.user_id (migration 022)
DO $$ BEGIN
  ALTER TABLE support_ticket_messages ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- ============================================================
-- PART 2: Helper to drop a FK constraint and recreate it with
-- ON DELETE SET NULL or ON DELETE CASCADE
-- ============================================================

-- Drop and recreate constraint with ON DELETE SET NULL
-- Uses pg_catalog instead of information_schema for full cross-schema visibility
CREATE OR REPLACE FUNCTION pg_temp.fix_fk(
  p_table TEXT, p_column TEXT, p_ref_table TEXT, p_ref_schema TEXT DEFAULT 'auth', p_action TEXT DEFAULT 'SET NULL'
) RETURNS VOID AS $$
DECLARE
  rec RECORD;
  new_constraint_name TEXT;
  tbl_exists BOOLEAN;
BEGIN
  -- Skip silently if the table or column does not exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_column
  ) INTO tbl_exists;

  IF NOT tbl_exists THEN
    RAISE NOTICE 'fix_fk: skipping %.% (table or column does not exist)', p_table, p_column;
    RETURN;
  END IF;

  new_constraint_name := p_table || '_' || p_column || '_' || p_ref_table || '_fkey';

  -- Find ALL FK constraints on this table+column using pg_catalog (works cross-schema)
  FOR rec IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_catalog.pg_attribute att ON att.attrelid = con.conrelid
      AND att.attnum = ANY(con.conkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = p_table
      AND att.attname = p_column
      AND con.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_table, rec.conname);
  END LOOP;

  -- Recreate with the desired ON DELETE behavior
  EXECUTE format(
    'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(id) ON DELETE %s',
    p_table, new_constraint_name, p_column, p_ref_schema, p_ref_table, p_action
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 3: Fix FK constraints to auth.users(id) → ON DELETE SET NULL
-- Exhaustive list of every column in 001_schema.sql + later migrations
-- ============================================================

-- companies
SELECT pg_temp.fix_fk('companies',                'created_by',              'users', 'auth', 'SET NULL');

-- company_members
SELECT pg_temp.fix_fk('company_members',           'invited_by',              'users', 'auth', 'SET NULL');

-- audit_log
SELECT pg_temp.fix_fk('audit_log',                 'user_id',                 'users', 'auth', 'SET NULL');

-- projects
SELECT pg_temp.fix_fk('projects',                  'project_manager_id',      'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('projects',                  'superintendent_id',       'users', 'auth', 'SET NULL');

-- project_tasks
SELECT pg_temp.fix_fk('project_tasks',             'assigned_to',             'users', 'auth', 'SET NULL');

-- daily_logs
SELECT pg_temp.fix_fk('daily_logs',                'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('daily_logs',                'approved_by',             'users', 'auth', 'SET NULL');

-- rfis
SELECT pg_temp.fix_fk('rfis',                      'submitted_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('rfis',                      'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('rfis',                      'answered_by',             'users', 'auth', 'SET NULL');

-- change_orders
SELECT pg_temp.fix_fk('change_orders',             'requested_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('change_orders',             'approved_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('change_orders',             'signed_by',               'users', 'auth', 'SET NULL');

-- submittals
SELECT pg_temp.fix_fk('submittals',                'submitted_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('submittals',                'reviewer_id',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('submittals',                'signed_by',               'users', 'auth', 'SET NULL');

-- punch_list_items
SELECT pg_temp.fix_fk('punch_list_items',          'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('punch_list_items',          'verified_by',             'users', 'auth', 'SET NULL');

-- safety_incidents
SELECT pg_temp.fix_fk('safety_incidents',          'reported_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('safety_incidents',          'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('safety_incidents',          'closed_by',               'users', 'auth', 'SET NULL');

-- safety_inspections
SELECT pg_temp.fix_fk('safety_inspections',        'inspector_id',            'users', 'auth', 'SET NULL');

-- toolbox_talks
SELECT pg_temp.fix_fk('toolbox_talks',             'conducted_by',            'users', 'auth', 'SET NULL');

-- properties
SELECT pg_temp.fix_fk('properties',                'manager_id',              'users', 'auth', 'SET NULL');

-- leases
SELECT pg_temp.fix_fk('leases',                    'tenant_user_id',          'users', 'auth', 'SET NULL');

-- maintenance_requests
SELECT pg_temp.fix_fk('maintenance_requests',      'requested_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('maintenance_requests',      'assigned_to',             'users', 'auth', 'SET NULL');

-- journal_entries
SELECT pg_temp.fix_fk('journal_entries',           'posted_by',               'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('journal_entries',           'created_by',              'users', 'auth', 'SET NULL');

-- invoices
SELECT pg_temp.fix_fk('invoices',                  'approved_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('invoices',                  'submitted_by',            'users', 'auth', 'SET NULL');

-- payments
SELECT pg_temp.fix_fk('payments',                  'approved_by',             'users', 'auth', 'SET NULL');

-- contacts
SELECT pg_temp.fix_fk('contacts',                  'user_id',                 'users', 'auth', 'SET NULL');

-- time_entries
SELECT pg_temp.fix_fk('time_entries',              'user_id',                 'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('time_entries',              'approved_by',             'users', 'auth', 'SET NULL');

-- equipment
SELECT pg_temp.fix_fk('equipment',                 'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('equipment_maintenance_logs','performed_by_user_id',    'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('equipment_assignments',     'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('equipment_assignments',     'assigned_by',             'users', 'auth', 'SET NULL');

-- opportunities
SELECT pg_temp.fix_fk('opportunities',             'assigned_to',             'users', 'auth', 'SET NULL');

-- bids
SELECT pg_temp.fix_fk('bids',                      'submitted_by',            'users', 'auth', 'SET NULL');

-- documents
SELECT pg_temp.fix_fk('documents',                 'uploaded_by',             'users', 'auth', 'SET NULL');

-- notifications → CASCADE (per-user data)
SELECT pg_temp.fix_fk('notifications',             'user_id',                 'users', 'auth', 'CASCADE');

-- comments
SELECT pg_temp.fix_fk('comments',                  'user_id',                 'users', 'auth', 'SET NULL');

-- ai
SELECT pg_temp.fix_fk('ai_conversations',          'user_id',                 'users', 'auth', 'CASCADE');
SELECT pg_temp.fix_fk('ai_usage_log',              'user_id',                 'users', 'auth', 'SET NULL');

-- cms
SELECT pg_temp.fix_fk('cms_pages',                 'published_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('cms_media',                 'uploaded_by',             'users', 'auth', 'SET NULL');

-- platform
SELECT pg_temp.fix_fk('platform_announcements',    'created_by',              'users', 'auth', 'SET NULL');

-- bank
SELECT pg_temp.fix_fk('bank_transactions',         'reconciled_by',           'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('bank_reconciliations',      'reconciled_by',           'users', 'auth', 'SET NULL');

-- contracts
SELECT pg_temp.fix_fk('contracts',                 'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contracts',                 'approved_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contracts',                 'terminated_by',           'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contracts',                 'signed_by',               'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contract_milestones',       'completed_by',            'users', 'auth', 'SET NULL');

-- integrations & settings
SELECT pg_temp.fix_fk('integrations',              'connected_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('security_settings',         'updated_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('automation_rules',          'created_by',              'users', 'auth', 'SET NULL');

-- login/sessions
SELECT pg_temp.fix_fk('login_history',             'user_id',                 'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('active_sessions',           'user_id',                 'users', 'auth', 'SET NULL');

-- messages
SELECT pg_temp.fix_fk('messages',                  'sender_id',               'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('messages',                  'recipient_id',            'users', 'auth', 'SET NULL');

-- tickets
SELECT pg_temp.fix_fk('tickets',                   'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'resolved_by',             'users', 'auth', 'SET NULL');

-- portal tables (migration 005)
SELECT pg_temp.fix_fk('portal_documents',          'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('portal_documents',          'shared_with_tenant_user_id','users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('portal_invitations',        'invited_by',              'users', 'auth', 'SET NULL');

-- plan room (migration 009 + 028)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('drawing_sets',           'created_by',              'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('plan_room_projects',     'created_by',              'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('plan_room_documents',    'uploaded_by',             'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- estimating (migration 013)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('estimates',              'created_by',              'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('estimates',              'approved_by',             'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('cost_estimates',         'created_by',              'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- authoritative_reports (migration 014)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('authoritative_reports',  'created_by',              'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- import_batches (migration 026)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('import_batches',         'created_by',              'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- payroll (migration 027)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('payroll_runs',           'approved_by',             'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('payroll_runs',           'created_by',              'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('payroll_items',          'user_id',                 'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- support_ticket_messages (migration 022)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('support_ticket_messages','user_id',                 'users', 'auth', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- ============================================================
-- PART 4: Fix FK constraints to user_profiles(id) → ON DELETE SET NULL
-- (These are the "PostgREST join" FKs added in migrations 007/008)
-- ============================================================

SELECT pg_temp.fix_fk('company_members',           'user_id',    'user_profiles', 'public', 'CASCADE');
SELECT pg_temp.fix_fk('comments',                  'user_id',    'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('projects',                  'project_manager_id', 'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('projects',                  'superintendent_id',  'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('project_tasks',             'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('daily_logs',                'created_by', 'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('rfis',                      'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('documents',                 'uploaded_by','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('time_entries',              'user_id',    'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('audit_log',                 'user_id',    'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('opportunities',             'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('safety_incidents',          'reported_by','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('safety_incidents',          'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('toolbox_talks',             'conducted_by','user_profiles','public', 'SET NULL');
SELECT pg_temp.fix_fk('equipment',                 'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('equipment_assignments',     'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('contracts',                 'created_by', 'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('messages',                  'sender_id',  'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('messages',                  'recipient_id','user_profiles','public', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'created_by', 'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'resolved_by','user_profiles', 'public', 'SET NULL');

-- super-admin tables (migration 022)
SELECT pg_temp.fix_fk('audit_logs',                'user_id',    'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('support_tickets',           'user_id',    'user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('support_tickets',           'assigned_to','user_profiles', 'public', 'SET NULL');
SELECT pg_temp.fix_fk('subscription_events',       'user_id',    'user_profiles', 'public', 'SET NULL');

-- promo tables (migration 017)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('promo_codes',            'created_by', 'user_profiles', 'public', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('promo_redemptions',      'user_id',    'user_profiles', 'public', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- platform_settings (migration 018)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('platform_settings',      'updated_by', 'user_profiles', 'public', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- leases (migration 008 section)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('leases',                 'created_by', 'user_profiles', 'public', 'SET NULL');
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- user_notifications / notification_preferences → CASCADE (per-user data)
DO $$ BEGIN
  ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_user_id_fkey;
  ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
  ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- markup_annotations → CASCADE (per-user annotations)
DO $$ BEGIN
  PERFORM pg_temp.fix_fk('markup_annotations',      'created_by', 'users', 'auth', 'CASCADE');
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- ============================================================
-- PART 5: Update the cleanup RPC to also handle storage schema
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_user_references(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rec RECORD;
  sql_stmt TEXT;
BEGIN
  -- Find every FK column in public AND storage schemas that references
  -- auth.users(id) or public.user_profiles(id).
  -- Uses pg_catalog for full cross-schema visibility (information_schema
  -- cannot see auth schema FK targets).
  FOR rec IN
    SELECT DISTINCT
      src_nsp.nspname AS table_schema,
      src_rel.relname AS table_name,
      src_att.attname AS column_name,
      NOT src_att.attnotnull AS is_nullable
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class src_rel ON src_rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace src_nsp ON src_nsp.oid = src_rel.relnamespace
    JOIN pg_catalog.pg_attribute src_att ON src_att.attrelid = con.conrelid
      AND src_att.attnum = ANY(con.conkey)
    JOIN pg_catalog.pg_class ref_rel ON ref_rel.oid = con.confrelid
    JOIN pg_catalog.pg_namespace ref_nsp ON ref_nsp.oid = ref_rel.relnamespace
    WHERE con.contype = 'f'
      AND src_nsp.nspname IN ('public', 'storage')
      AND src_rel.relname != 'user_profiles'
      AND (
        (ref_nsp.nspname = 'auth' AND ref_rel.relname = 'users')
        OR
        (ref_nsp.nspname = 'public' AND ref_rel.relname = 'user_profiles')
      )
  LOOP
    IF rec.is_nullable THEN
      sql_stmt := format(
        'UPDATE %I.%I SET %I = NULL WHERE %I = $1',
        rec.table_schema, rec.table_name, rec.column_name, rec.column_name
      );
    ELSE
      sql_stmt := format(
        'DELETE FROM %I.%I WHERE %I = $1',
        rec.table_schema, rec.table_name, rec.column_name
      );
    END IF;

    BEGIN
      EXECUTE sql_stmt USING p_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'cleanup_user_references: failed on %.%: %',
        rec.table_name, rec.column_name, SQLERRM;
    END;
  END LOOP;
END;
$$;
