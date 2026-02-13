import type { SupabaseClient } from "@supabase/supabase-js";

export interface TenantDashboard {
  lease: {
    id: string;
    status: string;
    monthly_rent: number;
    start_date: string;
    end_date: string;
    unit_name: string;
    property_name: string;
  } | null;
  openMaintenanceCount: number;
  announcementCount: number;
}

export async function getTenantDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<TenantDashboard> {
  const [leaseRes, maintenanceRes, announcementsRes] = await Promise.all([
    supabase
      .from("leases")
      .select("id, status, monthly_rent, start_date, end_date, units(name, properties(name))")
      .eq("tenant_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single(),
    supabase
      .from("maintenance_requests")
      .select("id", { count: "exact" })
      .eq("requested_by", userId)
      .in("status", ["submitted", "assigned", "in_progress"]),
    supabase
      .from("tenant_announcements")
      .select("id", { count: "exact" })
      .eq("is_active", true),
  ]);

  const leaseData = leaseRes.data;
  const unit = leaseData?.units as unknown as { name: string; properties: { name: string } } | null;

  return {
    lease: leaseData ? {
      id: leaseData.id,
      status: leaseData.status,
      monthly_rent: leaseData.monthly_rent,
      start_date: leaseData.start_date,
      end_date: leaseData.end_date,
      unit_name: unit?.name ?? "Unknown Unit",
      property_name: unit?.properties?.name ?? "Unknown Property",
    } : null,
    openMaintenanceCount: maintenanceRes.count ?? 0,
    announcementCount: announcementsRes.count ?? 0,
  };
}

export async function getTenantLease(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("leases")
    .select("*, units(name, properties(name, address_line1, city, state, zip))")
    .eq("tenant_user_id", userId)
    .order("start_date", { ascending: false });
  return data ?? [];
}

export async function getTenantPayments(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("rent_payments")
    .select("*, leases(units(name, properties(name)))")
    .eq("leases.tenant_user_id", userId)
    .order("payment_date", { ascending: false });
  return data ?? [];
}

export async function getTenantMaintenanceRequests(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("requested_by", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getTenantDocuments(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("tenant_documents")
    .select("*, documents(name, file_url, file_type, file_size, created_at)")
    .eq("shared_with_tenant_user_id", userId)
    .order("shared_at", { ascending: false });
  return data ?? [];
}

export async function getTenantAnnouncements(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("tenant_announcements")
    .select("*")
    .eq("is_active", true)
    .order("published_at", { ascending: false });
  return data ?? [];
}
