import { SupabaseClient } from "@supabase/supabase-js";

export interface CurrentUserCompany {
  userId: string;
  companyId: string;
  role: string;
  companyName: string;
}

/**
 * Get the current authenticated user and their company membership.
 * Returns null if the user has no company (needs to complete registration).
 */
export async function getCurrentUserCompany(
  supabase: SupabaseClient
): Promise<CurrentUserCompany | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: membership, error: memberError } = await supabase
    .from("company_members")
    .select("company_id, role, companies(name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (memberError || !membership) {
    return null;
  }

  // Supabase returns the joined company as an object (single relation)
  const company = membership.companies as unknown as { name: string } | null;

  return {
    userId: user.id,
    companyId: membership.company_id,
    role: membership.role,
    companyName: company?.name ?? "My Company",
  };
}

/**
 * Get the full name of a user from user_profiles.
 * Used for display in audit log entries and similar.
 */
export async function getUserDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  return data?.full_name || data?.email || "Unknown User";
}
