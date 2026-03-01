import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemberRole =
  | "owner"
  | "admin"
  | "project_manager"
  | "superintendent"
  | "accountant"
  | "field_worker"
  | "viewer";

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string | null;
  role: MemberRole;
  is_active: boolean;
  invited_email: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  user_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
}

export interface CompanyDetails {
  id: string;
  name: string;
  slug: string | null;
  industry_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  subscription_plan: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  selected_modules: string[];
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  grace_period_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface RolePermission {
  role: string;
  permission: string;
  allowed: boolean;
}

// ---------------------------------------------------------------------------
// getCompanyMembers - all members with user profile join
// ---------------------------------------------------------------------------

export async function getCompanyMembers(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from("company_members")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getCompanyMembers error:", error);
    return [];
  }

  const members = data ?? [];

  // Batch-fetch user profiles
  const userIds = [...new Set(members.map((m: { user_id: string | null }) => m.user_id).filter(Boolean))] as string[];
  let profileMap = new Map<string, { id: string; full_name: string | null; email: string | null; avatar_url: string | null; phone: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, avatar_url, phone")
      .in("id", userIds);
    profileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; phone: string | null }) => [p.id, p])
    );
  }

  return (members.map((m: Record<string, unknown>) => ({
    ...m,
    user_profile: m.user_id ? profileMap.get(m.user_id as string) ?? null : null,
  })) as CompanyMember[]).sort((a, b) => {
    const nameA = a.user_profile?.full_name ?? a.invited_email ?? "";
    const nameB = b.user_profile?.full_name ?? b.invited_email ?? "";
    return nameA.localeCompare(nameB);
  });
}

// ---------------------------------------------------------------------------
// getCompanyDetails - full company record
// ---------------------------------------------------------------------------

export async function getCompanyDetails(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyDetails | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error) {
    console.error("getCompanyDetails error:", error);
    return null;
  }

  return data as CompanyDetails;
}

// ---------------------------------------------------------------------------
// updateCompanySettings - partial update on company record
// ---------------------------------------------------------------------------

export async function updateCompanySettings(
  supabase: SupabaseClient,
  companyId: string,
  settings: Partial<
    Pick<
      CompanyDetails,
      | "name"
      | "industry_type"
      | "address"
      | "city"
      | "state"
      | "zip"
      | "phone"
      | "website"
      | "logo_url"
      | "settings"
    >
  >
): Promise<{ company: CompanyDetails | null; error: string | null }> {
  const { data, error } = await supabase
    .from("companies")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", companyId)
    .select()
    .single();

  if (error) {
    console.error("updateCompanySettings error:", error);
    return { company: null, error: error.message };
  }

  return { company: data as CompanyDetails, error: null };
}

// ---------------------------------------------------------------------------
// inviteMember - insert a new invited member row
// ---------------------------------------------------------------------------

export async function inviteMember(
  supabase: SupabaseClient,
  companyId: string,
  email: string,
  role: MemberRole
): Promise<{ member: CompanyMember | null; error: string | null }> {
  // Check if already invited or active
  const { data: existing } = await supabase
    .from("company_members")
    .select("id, is_active, invited_email")
    .eq("company_id", companyId)
    .or(`invited_email.eq.${email}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      member: null,
      error: "A member with this email already exists or has been invited.",
    };
  }

  const { data, error } = await supabase
    .from("company_members")
    .insert({
      company_id: companyId,
      role,
      invited_email: email,
      invited_at: new Date().toISOString(),
      is_active: false,
    })
    .select()
    .single();

  if (error) {
    console.error("inviteMember error:", error);
    return { member: null, error: error.message };
  }

  return { member: data as CompanyMember, error: null };
}

// ---------------------------------------------------------------------------
// updateMemberRole - change role for an existing member
// ---------------------------------------------------------------------------

export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: MemberRole
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("id", memberId);

  if (error) {
    console.error("updateMemberRole error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// deactivateMember - soft-delete by setting is_active = false
// ---------------------------------------------------------------------------

export async function deactivateMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("company_members")
    .update({ is_active: false })
    .eq("id", memberId);

  if (error) {
    console.error("deactivateMember error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// getAuditLog - recent entries with user profile join
// ---------------------------------------------------------------------------

export async function getAuditLog(
  supabase: SupabaseClient,
  companyId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      `
      *,
      user_profile:user_profiles(id, full_name, email)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAuditLog error:", error);
    return [];
  }

  return (data ?? []) as AuditLogEntry[];
}

// ---------------------------------------------------------------------------
// getRolePermissions - role-permission defaults matrix
// ---------------------------------------------------------------------------

export async function getRolePermissions(
  supabase: SupabaseClient
): Promise<RolePermission[]> {
  const { data, error } = await supabase
    .from("role_permission_defaults")
    .select("*")
    .order("role", { ascending: true });

  if (error) {
    console.error("getRolePermissions error:", error);
    return [];
  }

  return (data ?? []) as RolePermission[];
}
