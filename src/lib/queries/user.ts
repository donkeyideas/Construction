import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export interface CurrentUserCompany {
  userId: string;
  companyId: string;
  role: string;
  companyName: string;
}

/**
 * Get the current authenticated user and their company membership.
 * Supports multi-company users via active_company cookie.
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

  // Check for active company cookie (multi-company support)
  let preferredCompanyId: string | null = null;
  try {
    const cookieStore = await cookies();
    preferredCompanyId = cookieStore.get("active_company")?.value ?? null;
  } catch {
    // cookies() may not be available in all contexts
  }

  // If we have a preferred company, try to get that specific membership
  if (preferredCompanyId) {
    const { data: preferred } = await supabase
      .from("company_members")
      .select("company_id, role, companies(name)")
      .eq("user_id", user.id)
      .eq("company_id", preferredCompanyId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (preferred) {
      const company = preferred.companies as unknown as { name: string } | null;
      return {
        userId: user.id,
        companyId: preferred.company_id,
        role: preferred.role,
        companyName: company?.name ?? "My Company",
      };
    }
  }

  // Fallback: get first active membership
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
