import { SupabaseClient } from "@supabase/supabase-js";

export interface PlatformUser {
  id: string;
  email: string;
  full_name: string | null;
  is_platform_admin: boolean;
  created_at: string;
}

export interface PlatformCompany {
  id: string;
  name: string;
  slug: string;
  industry_type: string | null;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  member_count?: number;
  project_count?: number;
}

export interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  totalUsers: number;
  planDistribution: Record<string, number>;
}

/**
 * Check if the current user is a platform admin.
 */
export async function isPlatformAdmin(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("user_profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  return data?.is_platform_admin === true;
}

/**
 * Get current platform admin user info.
 */
export async function getPlatformAdminUser(
  supabase: SupabaseClient
): Promise<PlatformUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, is_platform_admin, created_at")
    .eq("id", user.id)
    .single();

  if (!data || !data.is_platform_admin) return null;

  return data as PlatformUser;
}

/**
 * Get all companies on the platform.
 */
export async function getAllCompanies(
  supabase: SupabaseClient
): Promise<PlatformCompany[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, industry_type, subscription_plan, subscription_status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllCompanies error:", error);
    return [];
  }

  return (data ?? []) as PlatformCompany[];
}

/**
 * Get company member counts grouped by company.
 */
export async function getCompanyMemberCounts(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("is_active", true);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.company_id] = (counts[row.company_id] || 0) + 1;
  }
  return counts;
}

/**
 * Get all users on the platform with their company memberships.
 */
export async function getAllUsers(
  supabase: SupabaseClient
): Promise<Array<PlatformUser & { companies: string[] }>> {
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, is_platform_admin, created_at")
    .order("created_at", { ascending: false });

  if (error || !profiles) return [];

  const { data: members } = await supabase
    .from("company_members")
    .select("user_id, companies(name)")
    .eq("is_active", true);

  const userCompanies: Record<string, string[]> = {};
  if (members) {
    for (const m of members) {
      const companyName = (m.companies as unknown as { name: string } | null)?.name;
      if (companyName) {
        if (!userCompanies[m.user_id]) userCompanies[m.user_id] = [];
        userCompanies[m.user_id].push(companyName);
      }
    }
  }

  return profiles.map((p) => ({
    ...p,
    companies: userCompanies[p.id] || [],
  }));
}

/**
 * Get platform-level statistics.
 */
export async function getPlatformStats(
  supabase: SupabaseClient
): Promise<PlatformStats> {
  const [companiesResult, usersResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id, subscription_plan, subscription_status"),
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  const companies = companiesResult.data ?? [];
  const totalUsers = usersResult.count ?? 0;

  const planDistribution: Record<string, number> = {};
  let activeCompanies = 0;
  let trialCompanies = 0;

  for (const c of companies) {
    planDistribution[c.subscription_plan] =
      (planDistribution[c.subscription_plan] || 0) + 1;
    if (c.subscription_status === "active") activeCompanies++;
    if (c.subscription_status === "trial") trialCompanies++;
  }

  return {
    totalCompanies: companies.length,
    activeCompanies,
    trialCompanies,
    totalUsers,
    planDistribution,
  };
}

/**
 * Get all CMS pages.
 */
export async function getCmsPages(
  supabase: SupabaseClient
): Promise<
  Array<{
    id: string;
    page_slug: string;
    title: string;
    status: string;
    published_at: string | null;
    updated_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select("id, page_slug, title, status, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getCmsPages error:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get all platform announcements.
 */
export async function getPlatformAnnouncements(
  supabase: SupabaseClient
): Promise<
  Array<{
    id: string;
    title: string;
    content: string;
    target_audience: string;
    is_active: boolean;
    published_at: string | null;
    expires_at: string | null;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("platform_announcements")
    .select("id, title, content, target_audience, is_active, published_at, expires_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPlatformAnnouncements error:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get subscription events for the platform.
 */
export async function getSubscriptionEvents(
  supabase: SupabaseClient,
  limit = 20
): Promise<
  Array<{
    id: string;
    company_id: string;
    event_type: string;
    plan_from: string | null;
    plan_to: string | null;
    amount: number | null;
    created_at: string;
    company_name?: string;
  }>
> {
  const { data, error } = await supabase
    .from("subscription_events")
    .select("id, company_id, event_type, plan_from, plan_to, amount, created_at, companies(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getSubscriptionEvents error:", error);
    return [];
  }

  return (data ?? []).map((e) => ({
    ...e,
    company_name: (e.companies as unknown as { name: string } | null)?.name ?? "Unknown",
  }));
}
