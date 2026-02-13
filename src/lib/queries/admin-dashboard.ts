import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminOverview {
  totalMembers: number;
  activeMembers: number;
  totalTenants: number;
  totalVendors: number;
  pendingInvitations: number;
  companyName: string;
  subscriptionPlan: string;
}

export async function getAdminOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<AdminOverview> {
  const [membersRes, tenantsRes, vendorsRes, invitationsRes, companyRes] =
    await Promise.all([
      supabase
        .from("company_members")
        .select("id, is_active", { count: "exact" })
        .eq("company_id", companyId),
      supabase
        .from("leases")
        .select("id", { count: "exact" })
        .eq("company_id", companyId)
        .not("tenant_user_id", "is", null),
      supabase
        .from("contacts")
        .select("id", { count: "exact" })
        .eq("company_id", companyId)
        .in("contact_type", ["vendor", "subcontractor"]),
      supabase
        .from("portal_invitations")
        .select("id", { count: "exact" })
        .eq("company_id", companyId)
        .eq("status", "pending"),
      supabase
        .from("companies")
        .select("name, subscription_plan")
        .eq("id", companyId)
        .single(),
    ]);

  const members = membersRes.data ?? [];
  return {
    totalMembers: membersRes.count ?? 0,
    activeMembers: members.filter((m: { is_active: boolean }) => m.is_active).length,
    totalTenants: tenantsRes.count ?? 0,
    totalVendors: vendorsRes.count ?? 0,
    pendingInvitations: invitationsRes.count ?? 0,
    companyName: companyRes.data?.name ?? "Unknown",
    subscriptionPlan: companyRes.data?.subscription_plan ?? "starter",
  };
}

export async function getTeamMembers(supabase: SupabaseClient, companyId: string) {
  const { data } = await supabase
    .from("company_members")
    .select("id, user_id, role, is_active, joined_at, user_profiles(full_name, email, avatar_url)")
    .eq("company_id", companyId)
    .order("joined_at", { ascending: false });
  return data ?? [];
}

export async function getAllTenants(supabase: SupabaseClient, companyId: string) {
  const { data } = await supabase
    .from("leases")
    .select("id, status, monthly_rent, start_date, end_date, tenant_user_id, units(name, properties(name))")
    .eq("company_id", companyId)
    .not("tenant_user_id", "is", null)
    .order("start_date", { ascending: false });
  return data ?? [];
}

export async function getAllVendors(supabase: SupabaseClient, companyId: string) {
  const { data } = await supabase
    .from("contacts")
    .select("id, name, email, phone, contact_type, company_name, user_id, created_at")
    .eq("company_id", companyId)
    .in("contact_type", ["vendor", "subcontractor"])
    .order("name");
  return data ?? [];
}

export async function getAuditLog(supabase: SupabaseClient, companyId: string, limit = 50) {
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, entity_id, details, created_at, user_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
