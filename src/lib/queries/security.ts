import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecuritySettingsRow {
  id: string;
  company_id: string;
  min_password_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  password_expiry_days: number;
  require_2fa: boolean;
  require_2fa_for_roles: string[];
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface LoginHistoryRow {
  id: string;
  company_id: string;
  user_id: string | null;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  status: "success" | "failed";
  failure_reason: string | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface ActiveSessionRow {
  id: string;
  company_id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// getSecuritySettings
// ---------------------------------------------------------------------------

export async function getSecuritySettings(
  supabase: SupabaseClient,
  companyId: string
): Promise<SecuritySettingsRow | null> {
  const { data, error } = await supabase
    .from("security_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("getSecuritySettings error:", error);
    return null;
  }

  return data as SecuritySettingsRow | null;
}

// ---------------------------------------------------------------------------
// upsertSecuritySettings
// ---------------------------------------------------------------------------

export async function upsertSecuritySettings(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: Partial<Omit<SecuritySettingsRow, "id" | "company_id" | "created_at" | "updated_at">>
): Promise<{ settings: SecuritySettingsRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from("security_settings")
    .upsert(
      {
        company_id: companyId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("upsertSecuritySettings error:", error);
    return { settings: null, error: error.message };
  }

  return { settings: row as SecuritySettingsRow, error: null };
}

// ---------------------------------------------------------------------------
// getLoginHistory
// ---------------------------------------------------------------------------

export async function getLoginHistory(
  supabase: SupabaseClient,
  companyId: string,
  opts?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
): Promise<LoginHistoryRow[]> {
  let query = supabase
    .from("login_history")
    .select(
      `
      *,
      user_profile:user_profiles!login_history_user_profile_fkey(full_name, email)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts?.startDate) {
    query = query.gte("created_at", opts.startDate);
  }

  if (opts?.endDate) {
    query = query.lte("created_at", opts.endDate);
  }

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  if (opts?.offset) {
    query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getLoginHistory error:", error);
    return [];
  }

  return (data ?? []) as LoginHistoryRow[];
}

// ---------------------------------------------------------------------------
// getActiveSessions
// ---------------------------------------------------------------------------

export async function getActiveSessions(
  supabase: SupabaseClient,
  companyId: string
): Promise<ActiveSessionRow[]> {
  const { data, error } = await supabase
    .from("active_sessions")
    .select(
      `
      *,
      user_profile:user_profiles!active_sessions_user_profile_fkey(full_name, email)
    `
    )
    .eq("company_id", companyId)
    .order("last_active_at", { ascending: false });

  if (error) {
    console.error("getActiveSessions error:", error);
    return [];
  }

  return (data ?? []) as ActiveSessionRow[];
}
