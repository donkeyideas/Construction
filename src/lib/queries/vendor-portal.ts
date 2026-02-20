import type { SupabaseClient } from "@supabase/supabase-js";

export interface VendorDashboard {
  contactId: string | null;
  totalContractValue: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  expiringCertifications: number;
}

// ---------- Full dashboard types ----------

export interface VendorContact {
  id: string;
  company_name: string | null;
  contact_type: string;
  first_name: string;
  last_name: string;
  email: string | null;
  job_title: string | null;
  company_id: string;
}

export interface VendorActiveProject {
  contract_id: string;
  project_id: string;
  project_name: string;
  project_status: string;
  contract_title: string;
  contract_status: string;
}

export interface VendorRecentInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  status: string;
  invoice_date: string;
  project_name: string | null;
}

export interface VendorCertification {
  id: string;
  cert_name: string;
  cert_type: string | null;
  expiry_date: string | null;
}

export interface VendorDashboardFull {
  contact: VendorContact | null;
  activeProjects: VendorActiveProject[];
  recentInvoices: VendorRecentInvoice[];
  certifications: VendorCertification[];
  stats: {
    totalContractValue: number;
    outstandingInvoices: number;
    outstandingAmount: number;
    expiringCertifications: number;
    activeProjectCount: number;
    complianceCurrent: boolean;
  };
}

export async function getVendorDashboardFull(
  supabase: SupabaseClient,
  userId: string
): Promise<VendorDashboardFull> {
  const empty: VendorDashboardFull = {
    contact: null,
    activeProjects: [],
    recentInvoices: [],
    certifications: [],
    stats: {
      totalContractValue: 0,
      outstandingInvoices: 0,
      outstandingAmount: 0,
      expiringCertifications: 0,
      activeProjectCount: 0,
      complianceCurrent: true,
    },
  };

  // Fetch full contact record
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, company_name, contact_type, first_name, last_name, email, job_title, company_id")
    .eq("user_id", userId)
    .in("contact_type", ["vendor", "subcontractor"])
    .limit(1)
    .single();

  if (!contact) return empty;

  const now = new Date();
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [contractsRes, invoicesRes, certsRes, outstandingRes] = await Promise.all([
    // Active contracts with projects
    supabase
      .from("vendor_contracts")
      .select("id, project_id, title, status, amount, projects(name, status)")
      .eq("vendor_id", contact.id)
      .eq("status", "active"),
    // Recent invoices (last 10) with project name
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, balance_due, status, invoice_date, project_id, projects(name)")
      .eq("vendor_id", contact.id)
      .eq("invoice_type", "payable")
      .order("invoice_date", { ascending: false })
      .limit(10),
    // All certifications
    supabase
      .from("certifications")
      .select("id, cert_name, cert_type, expiry_date")
      .eq("contact_id", contact.id)
      .order("expiry_date", { ascending: true }),
    // Outstanding invoices for stats
    supabase
      .from("invoices")
      .select("id, balance_due")
      .eq("vendor_id", contact.id)
      .eq("invoice_type", "payable")
      .neq("status", "paid"),
  ]);

  const contracts = contractsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const certs = certsRes.data ?? [];
  const outstanding = outstandingRes.data ?? [];

  // Build active projects list
  const activeProjects: VendorActiveProject[] = contracts.map((c: Record<string, unknown>) => {
    const project = c.projects as { name: string; status: string } | null;
    return {
      contract_id: c.id as string,
      project_id: c.project_id as string,
      project_name: project?.name ?? "Unknown Project",
      project_status: project?.status ?? "unknown",
      contract_title: c.title as string,
      contract_status: c.status as string,
    };
  });

  // Build recent invoices list
  const recentInvoices: VendorRecentInvoice[] = invoices.map((inv: Record<string, unknown>) => {
    const project = inv.projects as { name: string } | null;
    return {
      id: inv.id as string,
      invoice_number: (inv.invoice_number as string) ?? "",
      total_amount: (inv.total_amount as number) ?? 0,
      balance_due: (inv.balance_due as number) ?? 0,
      status: (inv.status as string) ?? "draft",
      invoice_date: (inv.invoice_date as string) ?? "",
      project_name: project?.name ?? null,
    };
  });

  // Build certifications
  const certifications: VendorCertification[] = certs.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    cert_name: (c.cert_name as string) ?? "Unnamed",
    cert_type: (c.cert_type as string) ?? null,
    expiry_date: (c.expiry_date as string) ?? null,
  }));

  // Compute stats
  const expiringCerts = certs.filter((c: Record<string, unknown>) => {
    if (!c.expiry_date) return false;
    const exp = new Date(c.expiry_date as string);
    return exp >= now && exp <= thirtyDays;
  });

  const expiredCerts = certs.filter((c: Record<string, unknown>) => {
    if (!c.expiry_date) return false;
    return new Date(c.expiry_date as string) < now;
  });

  return {
    contact: contact as VendorContact,
    activeProjects,
    recentInvoices,
    certifications,
    stats: {
      totalContractValue: contracts.reduce((sum: number, c: Record<string, unknown>) => sum + ((c.amount as number) || 0), 0),
      outstandingInvoices: outstanding.length,
      outstandingAmount: outstanding.reduce((sum: number, i: Record<string, unknown>) => sum + ((i.balance_due as number) || 0), 0),
      expiringCertifications: expiringCerts.length,
      activeProjectCount: activeProjects.length,
      complianceCurrent: expiredCerts.length === 0,
    },
  };
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
