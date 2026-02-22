-- ==========================================================================
-- Migration 043: Fix schema gaps for audit log, login history & sessions
-- ==========================================================================

-- 1. Add email column to login_history (UI expects it, missing from schema)
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS email text;

-- 2. Make user_id nullable (needed for failed logins where user is unknown)
ALTER TABLE login_history ALTER COLUMN user_id DROP NOT NULL;

-- 3. Add FK constraints for Supabase join syntax in query functions
--    login_history → user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'login_history_user_profile_fkey'
  ) THEN
    ALTER TABLE login_history
      ADD CONSTRAINT login_history_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES user_profiles(id);
  END IF;
END $$;

--    active_sessions → user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'active_sessions_user_profile_fkey'
  ) THEN
    ALTER TABLE active_sessions
      ADD CONSTRAINT active_sessions_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES user_profiles(id);
  END IF;
END $$;

-- 4. Allow service-role inserts to login_history for failed logins
--    (service role bypasses RLS, but add a permissive insert policy for
--     authenticated users recording their own company logins)
--    The existing policy already covers this case.

-- 5. Index on email for login_history lookups
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
