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

export interface VendorContractItem {
  id: string;
  project_name: string;
  title: string;
  amount: number;
  status: string;
}

export interface VendorDocumentItem {
  id: string;
  doc_name: string;
  file_path: string | null;
  file_type: string | null;
  shared_at: string | null;
}

export interface VendorDashboardFull {
  contact: VendorContact | null;
  activeProjects: VendorActiveProject[];
  recentInvoices: VendorRecentInvoice[];
  certifications: VendorCertification[];
  contracts: VendorContractItem[];
  documents: VendorDocumentItem[];
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
    contracts: [],
    documents: [],
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

  const [contractsRes, invoicesRes, certsRes, outstandingRes, allContractsRes, docsRes] = await Promise.all([
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
    // All contracts (for My Contracts card)
    supabase
      .from("vendor_contracts")
      .select("id, title, status, amount, projects(name)")
      .eq("vendor_id", contact.id)
      .order("created_at", { ascending: false }),
    // Shared documents (for Documents card)
    supabase
      .from("vendor_documents")
      .select("id, shared_at, documents(name, file_path, file_type)")
      .eq("vendor_contact_id", contact.id)
      .order("shared_at", { ascending: false })
      .limit(10),
  ]);

  const contracts = contractsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const certs = certsRes.data ?? [];
  const outstanding = outstandingRes.data ?? [];
  const allContracts = allContractsRes.data ?? [];
  const docs = docsRes.data ?? [];

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

  // Build all contracts list
  const contractsList: VendorContractItem[] = allContracts.map((c: Record<string, unknown>) => {
    const project = c.projects as { name: string } | null;
    return {
      id: c.id as string,
      project_name: project?.name ?? "Unknown Project",
      title: (c.title as string) ?? "",
      amount: (c.amount as number) ?? 0,
      status: (c.status as string) ?? "draft",
    };
  });

  // Build documents list
  const documentsList: VendorDocumentItem[] = docs.map((d: Record<string, unknown>) => {
    const doc = d.documents as { name: string; file_path: string; file_type: string } | null;
    return {
      id: d.id as string,
      doc_name: doc?.name ?? "Untitled Document",
      file_path: doc?.file_path ?? null,
      file_type: doc?.file_type ?? null,
      shared_at: (d.shared_at as string) ?? null,
    };
  });

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
    contracts: contractsList,
    documents: documentsList,
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

export interface VendorPaymentDashboard {
  payments: {
    id: string;
    payment_date: string;
    amount: number;
    method: string;
    reference_number: string | null;
    notes: string | null;
    invoice_number: string;
    je_entry_number: string | null;
    je_id: string | null;
  }[];
  pendingInvoices: {
    id: string;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
    status: string;
    invoice_date: string;
    due_date: string;
    payment_terms: string | null;
    project_name: string | null;
  }[];
  stats: {
    totalReceived: number;
    pendingCount: number;
    outstandingBalance: number;
  };
}

export async function getVendorPaymentDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<VendorPaymentDashboard> {
  const empty: VendorPaymentDashboard = {
    payments: [],
    pendingInvoices: [],
    stats: { totalReceived: 0, pendingCount: 0, outstandingBalance: 0 },
  };

  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .in("contact_type", ["vendor", "subcontractor"])
    .limit(1)
    .single();

  if (!contact) return empty;

  // Fetch vendor invoices and payments in parallel
  const [invoicesRes, paymentsInvoicesRes] = await Promise.all([
    // All vendor invoices (unpaid)
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, balance_due, status, invoice_date, due_date, payment_terms, project_id, projects(name)")
      .eq("vendor_id", contact.id)
      .eq("invoice_type", "payable")
      .not("status", "eq", "paid")
      .not("status", "eq", "voided")
      .order("due_date", { ascending: true }),
    // All vendor invoice IDs for payment lookup
    supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("vendor_id", contact.id)
      .eq("invoice_type", "payable"),
  ]);

  const unpaidInvoices = invoicesRes.data ?? [];
  const allInvoices = paymentsInvoicesRes.data ?? [];

  // Build invoice number map
  const invoiceMap = new Map<string, string>();
  for (const inv of allInvoices) {
    invoiceMap.set(inv.id, inv.invoice_number);
  }

  // Fetch payments
  const invoiceIds = allInvoices.map((i) => i.id);
  let payments: Record<string, unknown>[] = [];
  if (invoiceIds.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("id, payment_date, amount, method, reference_number, notes, invoice_id")
      .in("invoice_id", invoiceIds)
      .order("payment_date", { ascending: false });
    payments = (data ?? []) as Record<string, unknown>[];
  }

  // Look up JE references for payments
  const paymentIds = payments.map((p) => p.id as string);
  let jeMap = new Map<string, { id: string; entry_number: string }>();
  if (paymentIds.length > 0) {
    const refs = paymentIds.map((pid) => `payment:${pid}`);
    const { data: jeData } = await supabase
      .from("journal_entries")
      .select("id, entry_number, reference")
      .in("reference", refs);
    if (jeData) {
      for (const je of jeData) {
        const paymentId = (je.reference as string).replace("payment:", "");
        jeMap.set(paymentId, { id: je.id, entry_number: je.entry_number });
      }
    }
  }

  // Build payment rows
  const paymentRows = payments.map((p) => {
    const pid = p.id as string;
    const je = jeMap.get(pid);
    return {
      id: pid,
      payment_date: p.payment_date as string,
      amount: p.amount as number,
      method: (p.method as string) || "check",
      reference_number: (p.reference_number as string) || null,
      notes: (p.notes as string) || null,
      invoice_number: invoiceMap.get(p.invoice_id as string) || "",
      je_entry_number: je?.entry_number || null,
      je_id: je?.id || null,
    };
  });

  // Build pending invoices
  const pendingInvoices = unpaidInvoices.map((inv: Record<string, unknown>) => {
    const project = inv.projects as { name: string } | null;
    return {
      id: inv.id as string,
      invoice_number: (inv.invoice_number as string) || "",
      total_amount: (inv.total_amount as number) || 0,
      balance_due: (inv.balance_due as number) || 0,
      status: (inv.status as string) || "draft",
      invoice_date: (inv.invoice_date as string) || "",
      due_date: (inv.due_date as string) || "",
      payment_terms: (inv.payment_terms as string) || null,
      project_name: project?.name || null,
    };
  });

  // Compute stats
  const totalReceived = paymentRows.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = pendingInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);

  return {
    payments: paymentRows,
    pendingInvoices,
    stats: {
      totalReceived,
      pendingCount: pendingInvoices.length,
      outstandingBalance,
    },
  };
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
