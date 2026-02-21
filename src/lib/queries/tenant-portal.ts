import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PaymentMethod {
  id: string;
  method_type: string;
  label: string;
  instructions: string;
  recipient_info: string | null;
}

export interface TenantDashboard {
  fullName: string | null;
  lease: {
    id: string;
    status: string;
    monthly_rent: number;
    security_deposit: number | null;
    lease_start: string;
    lease_end: string;
    unit_name: string;
    property_name: string;
  } | null;
  recentPayments: Array<{
    id: string;
    amount: number;
    payment_date: string;
    due_date: string | null;
    status: string;
    method: string | null;
    late_fee: number | null;
  }>;
  maintenanceRequests: Array<{
    id: string;
    title: string;
    status: string;
    category: string | null;
    created_at: string;
  }>;
  documents: TenantDocument[];
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    category: string | null;
    published_at: string;
  }>;
  openMaintenanceCount: number;
  paymentMethods: PaymentMethod[];
}

export async function getTenantDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<TenantDashboard> {
  // Phase 1: fetch profile + lease in parallel (lease needed for payment lookup)
  // Admin client is required for the lease query because tenants lack RLS access
  // to the properties table, so the nested join units→properties returns null.
  const admin = createAdminClient();
  const [profileRes, leaseRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", userId)
      .single(),
    admin
      .from("leases")
      .select("id, status, monthly_rent, security_deposit, lease_start, lease_end, property_id, units(unit_number, properties(name))")
      .eq("tenant_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single(),
  ]);

  const leaseData = leaseRes.data;
  const unit = leaseData?.units as unknown as { unit_number: string; properties: { name: string } } | null;
  const leaseId = leaseData?.id;
  const propertyId = leaseData?.property_id as string | undefined;

  // Phase 2: fetch remaining data in parallel (payments need leaseId)
  const [paymentsRes, maintenanceRes, maintenanceCountRes, announcementsRes, documents, paymentMethodsRes] =
    await Promise.all([
      leaseId
        ? supabase
            .from("rent_payments")
            .select("id, amount, payment_date, due_date, status, method, late_fee")
            .eq("lease_id", leaseId)
            .order("payment_date", { ascending: false })
            .limit(6)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("maintenance_requests")
        .select("id, title, status, category, created_at")
        .eq("requested_by", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact" })
        .eq("requested_by", userId)
        .in("status", ["submitted", "assigned", "in_progress"]),
      supabase
        .from("tenant_announcements")
        .select("id, title, content, category, published_at")
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(3),
      getTenantDocuments(supabase, userId),
      propertyId
        ? supabase
            .from("property_payment_methods")
            .select("id, method_type, label, instructions, recipient_info")
            .eq("property_id", propertyId)
            .eq("is_enabled", true)
            .order("display_order", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
    ]);

  return {
    fullName: profileRes.data?.full_name ?? null,
    lease: leaseData
      ? {
          id: leaseData.id,
          status: leaseData.status,
          monthly_rent: leaseData.monthly_rent,
          security_deposit: leaseData.security_deposit ?? null,
          lease_start: leaseData.lease_start,
          lease_end: leaseData.lease_end,
          unit_name: unit?.unit_number ?? "Unknown Unit",
          property_name: unit?.properties?.name ?? "Unknown Property",
        }
      : null,
    recentPayments: (paymentsRes.data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      amount: Number(p.amount) || 0,
      payment_date: p.payment_date as string,
      due_date: (p.due_date as string) ?? null,
      status: p.status as string,
      method: (p.method as string) ?? null,
      late_fee: p.late_fee != null ? Number(p.late_fee) : null,
    })),
    maintenanceRequests: (maintenanceRes.data ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      title: m.title as string,
      status: m.status as string,
      category: (m.category as string) ?? null,
      created_at: m.created_at as string,
    })),
    documents: documents.slice(0, 3),
    announcements: (announcementsRes.data ?? []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: (a.title as string) ?? "",
      content: (a.content as string) ?? "",
      category: (a.category as string) ?? null,
      published_at: a.published_at as string,
    })),
    openMaintenanceCount: maintenanceCountRes.count ?? 0,
    paymentMethods: (paymentMethodsRes.data ?? []).map((pm: Record<string, unknown>) => ({
      id: pm.id as string,
      method_type: pm.method_type as string,
      label: pm.label as string,
      instructions: pm.instructions as string,
      recipient_info: (pm.recipient_info as string) ?? null,
    })),
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

export async function getTenantDocuments(
  _supabase: SupabaseClient,
  userId: string
): Promise<TenantDocument[]> {
  // Admin client bypasses RLS — tenants lack SELECT on the documents table,
  // so the PostgREST join returns null with the user's client.
  const admin = createAdminClient();

  const { data } = await admin
    .from("tenant_documents")
    .select(
      "id, document_id, shared_at, documents(name, file_path, file_type, file_size, category, created_at)"
    )
    .eq("shared_with_tenant_user_id", userId)
    .order("shared_at", { ascending: false });

  return (data ?? []).map((row: Record<string, unknown>) => {
    const doc = row.documents as {
      name: string;
      file_path: string;
      file_type: string;
      file_size: number;
      category: string;
      created_at: string;
    } | null;
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

export async function getTenantProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<TenantProfile | null> {
  // Admin client bypasses RLS so the nested units→properties join resolves
  const admin = createAdminClient();
  const [profileRes, leaseRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, email, full_name, phone, avatar_url")
      .eq("id", userId)
      .single(),
    admin
      .from("leases")
      .select(
        "status, monthly_rent, lease_start, lease_end, units(unit_number, properties(name))"
      )
      .eq("tenant_user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single(),
  ]);

  const profile = profileRes.data;
  if (!profile) return null;

  const lease = leaseRes.data;
  const unit = lease?.units as unknown as {
    unit_number: string;
    properties: { name: string };
  } | null;

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    lease: lease
      ? {
          unit_name: unit?.unit_number ?? "Unknown Unit",
          property_name: unit?.properties?.name ?? "Unknown Property",
          lease_start: lease.lease_start,
          lease_end: lease.lease_end,
          monthly_rent: lease.monthly_rent,
          status: lease.status,
        }
      : null,
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
