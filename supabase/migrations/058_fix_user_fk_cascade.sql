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

-- ============================================================
-- PART 2: Helper to drop a FK constraint and recreate it with
-- ON DELETE SET NULL or ON DELETE CASCADE
-- ============================================================

-- Drop and recreate constraint with ON DELETE SET NULL
CREATE OR REPLACE FUNCTION pg_temp.fix_fk(
  p_table TEXT, p_column TEXT, p_ref_table TEXT, p_ref_schema TEXT DEFAULT 'auth', p_action TEXT DEFAULT 'SET NULL'
) RETURNS VOID AS $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find all FK constraints for this column → target table
  FOR constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = p_table
      AND kcu.column_name = p_column
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = p_ref_schema
      AND ccu.table_name = p_ref_table
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_table, constraint_name);
  END LOOP;

  -- Recreate with the desired ON DELETE behavior
  EXECUTE format(
    'ALTER TABLE public.%I ADD CONSTRAINT %I_%I_%s_fkey FOREIGN KEY (%I) REFERENCES %I.%I(id) ON DELETE %s',
    p_table, p_table, p_column, p_ref_table, p_column, p_ref_schema, p_ref_table, p_action
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- PART 3: Fix FK constraints to auth.users(id) → ON DELETE SET NULL
-- ============================================================

SELECT pg_temp.fix_fk('companies',                'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('safety_incidents',          'reported_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('safety_incidents',          'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('safety_incidents',          'closed_by',               'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('toolbox_talks',             'conducted_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('equipment_maintenance_logs','performed_by_user_id',    'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('equipment_assignments',     'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('equipment_assignments',     'assigned_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('bank_transactions',         'reconciled_by',           'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('bank_reconciliations',      'reconciled_by',           'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contracts',                 'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contracts',                 'approved_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contracts',                 'terminated_by',           'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('contract_milestones',       'completed_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('integrations',              'connected_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('security_settings',         'updated_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('automation_rules',          'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('login_history',             'user_id',                 'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('active_sessions',           'user_id',                 'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('messages',                  'sender_id',               'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('messages',                  'recipient_id',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'created_by',              'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'assigned_to',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('tickets',                   'resolved_by',             'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('invoices',                  'submitted_by',            'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('payments',                  'approved_by',             'users', 'auth', 'SET NULL');

-- columns added by migration 012 (signatures)
SELECT pg_temp.fix_fk('contracts',                 'signed_by',               'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('change_orders',             'signed_by',               'users', 'auth', 'SET NULL');
SELECT pg_temp.fix_fk('submittals',                'signed_by',               'users', 'auth', 'SET NULL');

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
  SELECT pg_temp.fix_fk('markup_annotations',      'created_by', 'users', 'auth', 'CASCADE');
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
  -- Find every FK column in public AND storage schemas that references:
  --   1. auth.users(id)
  --   2. public.user_profiles(id)
  FOR rec IN
    SELECT DISTINCT
      kcu.table_schema,
      kcu.table_name,
      kcu.column_name,
      c.is_nullable
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = rc.constraint_name
     AND kcu.constraint_schema = rc.constraint_schema
    JOIN information_schema.columns c
      ON c.table_schema = kcu.table_schema
     AND c.table_name = kcu.table_name
     AND c.column_name = kcu.column_name
    WHERE kcu.table_schema IN ('public', 'storage')
      AND kcu.table_name != 'user_profiles'
      AND EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage ccu
        WHERE ccu.constraint_schema = rc.unique_constraint_schema
          AND ccu.constraint_name = rc.unique_constraint_name
          AND ccu.column_name = 'id'
          AND (
            (ccu.table_schema = 'auth' AND ccu.table_name = 'users')
            OR
            (ccu.table_schema = 'public' AND ccu.table_name = 'user_profiles')
          )
      )
  LOOP
    IF rec.is_nullable = 'YES' THEN
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
