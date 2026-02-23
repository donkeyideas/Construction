-- ============================================================
-- Migration 054: RPC to clear all auth.users FK references
-- before deleting a user. Uses information_schema to
-- dynamically find every FK column pointing at auth.users,
-- so it never goes stale when new tables/columns are added.
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
  -- Find every FK column in 'public' schema that references auth.users(id)
  FOR rec IN
    SELECT
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
    WHERE rc.unique_constraint_schema = 'auth'
      AND kcu.table_schema = 'public'
      -- Only target FKs that point to auth.users
      -- (match on the referenced table via the unique constraint)
      AND EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage ccu
        WHERE ccu.constraint_schema = rc.unique_constraint_schema
          AND ccu.constraint_name = rc.unique_constraint_name
          AND ccu.table_name = 'users'
          AND ccu.column_name = 'id'
      )
  LOOP
    IF rec.is_nullable = 'YES' THEN
      -- Nullable column → SET NULL
      sql_stmt := format(
        'UPDATE %I.%I SET %I = NULL WHERE %I = $1',
        rec.table_schema, rec.table_name, rec.column_name, rec.column_name
      );
    ELSE
      -- NOT NULL column → DELETE the row
      sql_stmt := format(
        'DELETE FROM %I.%I WHERE %I = $1',
        rec.table_schema, rec.table_name, rec.column_name
      );
    END IF;

    BEGIN
      EXECUTE sql_stmt USING p_user_id;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail — some tables may have additional constraints
      RAISE WARNING 'cleanup_user_references: failed on %.%: %',
        rec.table_name, rec.column_name, SQLERRM;
    END;
  END LOOP;
END;
$$;
