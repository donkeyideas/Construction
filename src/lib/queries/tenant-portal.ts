import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TenantDashboard {
  lease: {
    id: string;
    status: string;
    monthly_rent: number;
    lease_start: string;
    lease_end: string;
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
      .select("id, status, monthly_rent, lease_start, lease_end, units(unit_number, properties(name))")
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
  const unit = leaseData?.units as unknown as { unit_number: string; properties: { name: string } } | null;

  return {
    lease: leaseData ? {
      id: leaseData.id,
      status: leaseData.status,
      monthly_rent: leaseData.monthly_rent,
      lease_start: leaseData.lease_start,
      lease_end: leaseData.lease_end,
      unit_name: unit?.unit_number ?? "Unknown Unit",
      property_name: unit?.properties?.name ?? "Unknown Property",
    } : null,
    openMaintenanceCount: maintenanceRes.count ?? 0,
    announcementCount: announcementsRes.count ?? 0,
  };
}

export async function getTenantLease(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("leases")
    .select("*, units(unit_number, properties(name, address_line1, city, state, zip))")
    .eq("tenant_user_id", userId)
    .order("lease_start", { ascending: false });
  return data ?? [];
}

export async function getTenantPayments(supabase: SupabaseClient, userId: string) {
  // First get lease IDs for this tenant
  const { data: leases } = await supabase
    .from("leases")
    .select("id")
    .eq("tenant_user_id", userId);

  const leaseIds = (leases ?? []).map((l) => l.id);
  if (leaseIds.length === 0) return [];

  const { data } = await supabase
    .from("rent_payments")
    .select("*, leases(units(unit_number, properties(name)))")
    .in("lease_id", leaseIds)
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

export interface TenantDocument {
  id: string;
  document_id: string;
  shared_at: string | null;
  doc_name: string;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  doc_created_at: string | null;
}

export async function getTenantDocuments(_supabase: SupabaseClient, userId: string): Promise<TenantDocument[]> {
  // Use admin client because tenants lack RLS SELECT on the documents table,
  // which causes the PostgREST join to return null. We manually filter by userId.
  const admin = createAdminClient();

  const { data } = await admin
    .from("tenant_documents")
    .select("id, document_id, shared_at, documents(name, file_path, file_type, file_size, category, created_at)")
    .eq("shared_with_tenant_user_id", userId)
    .order("shared_at", { ascending: false });

  return (data ?? []).map((row: Record<string, unknown>) => {
    const doc = row.documents as { name: string; file_path: string; file_type: string; file_size: number; category: string; created_at: string } | null;
    return {
      id: row.id as string,
      document_id: row.document_id as string,
      shared_at: row.shared_at as string | null,
      doc_name: doc?.name ?? "Untitled Document",
      file_path: doc?.file_path ?? null,
      file_type: doc?.file_type ?? null,
      file_size: doc?.file_size ?? null,
      category: doc?.category ?? null,
      doc_created_at: doc?.created_at ?? null,
    };
  });
}

export interface TenantProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  lease: {
    unit_name: string;
    property_name: string;
    lease_start: string;
    lease_end: string;
    monthly_rent: number;
    status: string;
  } | null;
}

export async function getTenantProfile(supabase: SupabaseClient, userId: string): Promise<TenantProfile | null> {
  const [profileRes, leaseRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, email, full_name, phone, avatar_url")
      .eq("id", userId)
      .single(),
    supabase
      .from("leases")
      .select("status, monthly_rent, lease_start, lease_end, units(unit_number, properties(name))")
      .eq("tenant_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single(),
  ]);

  const profile = profileRes.data;
  if (!profile) return null;

  const lease = leaseRes.data;
  const unit = lease?.units as unknown as { unit_number: string; properties: { name: string } } | null;

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    lease: lease ? {
      unit_name: unit?.unit_number ?? "Unknown Unit",
      property_name: unit?.properties?.name ?? "Unknown Property",
      lease_start: lease.lease_start,
      lease_end: lease.lease_end,
      monthly_rent: lease.monthly_rent,
      status: lease.status,
    } : null,
  };
}

export async function getTenantAnnouncements(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("tenant_announcements")
    .select("*")
    .eq("is_active", true)
    .order("published_at", { ascending: false });
  return data ?? [];
}
