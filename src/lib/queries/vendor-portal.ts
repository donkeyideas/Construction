import type { SupabaseClient } from "@supabase/supabase-js";

export interface VendorDashboard {
  contactId: string | null;
  totalContractValue: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  expiringCertifications: number;
}

export async function getVendorDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<VendorDashboard> {
  // First get the contact record for this user
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .in("contact_type", ["vendor", "subcontractor"])
    .limit(1)
    .single();

  if (!contact) {
    return {
      contactId: null,
      totalContractValue: 0,
      outstandingInvoices: 0,
      outstandingAmount: 0,
      expiringCertifications: 0,
    };
  }

  const [contractsRes, invoicesRes, certsRes] = await Promise.all([
    supabase
      .from("vendor_contracts")
      .select("amount")
      .eq("vendor_id", contact.id)
      .eq("status", "active"),
    supabase
      .from("invoices")
      .select("id, balance_due")
      .eq("vendor_id", contact.id)
      .eq("invoice_type", "payable")
      .neq("status", "paid"),
    supabase
      .from("certifications")
      .select("id, expiry_date")
      .eq("contact_id", contact.id)
      .gte("expiry_date", new Date().toISOString())
      .lte("expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const contracts = contractsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  return {
    contactId: contact.id,
    totalContractValue: contracts.reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0),
    outstandingInvoices: invoices.length,
    outstandingAmount: invoices.reduce((sum: number, i: { balance_due: number }) => sum + (i.balance_due || 0), 0),
    expiringCertifications: certsRes.data?.length ?? 0,
  };
}

export async function getVendorContracts(supabase: SupabaseClient, userId: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!contact) return [];

  const { data } = await supabase
    .from("vendor_contracts")
    .select("*, projects(name)")
    .eq("vendor_id", contact.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getVendorInvoices(supabase: SupabaseClient, userId: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!contact) return [];

  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("vendor_id", contact.id)
    .eq("invoice_type", "payable")
    .order("invoice_date", { ascending: false });
  return data ?? [];
}

export async function getVendorPayments(supabase: SupabaseClient, userId: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!contact) return [];

  // Two-step: get vendor invoice IDs first, then filter payments
  const { data: vendorInvoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("vendor_id", contact.id)
    .eq("invoice_type", "payable");

  if (!vendorInvoices || vendorInvoices.length === 0) return [];

  const invoiceIds = vendorInvoices.map((i) => i.id);
  const { data } = await supabase
    .from("payments")
    .select("*, invoices(invoice_number)")
    .in("invoice_id", invoiceIds)
    .order("payment_date", { ascending: false });
  return data ?? [];
}

export async function getVendorProjects(supabase: SupabaseClient, userId: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!contact) return [];

  const { data } = await supabase
    .from("vendor_contracts")
    .select("project_id, projects(id, name, status, start_date, end_date)")
    .eq("vendor_id", contact.id)
    .eq("status", "active");
  return data ?? [];
}

export async function getVendorCertifications(supabase: SupabaseClient, userId: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!contact) return [];

  const { data } = await supabase
    .from("certifications")
    .select("*")
    .eq("contact_id", contact.id)
    .order("expiry_date", { ascending: true });
  return data ?? [];
}

export async function getVendorDocuments(supabase: SupabaseClient, userId: string) {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!contact) return [];

  const { data } = await supabase
    .from("vendor_documents")
    .select("*, documents(name, file_path, file_type, file_size, created_at)")
    .eq("vendor_contact_id", contact.id)
    .order("shared_at", { ascending: false });
  return data ?? [];
}
