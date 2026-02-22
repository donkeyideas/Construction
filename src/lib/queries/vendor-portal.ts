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
  amount_paid: number;
  status: string;
}

export interface VendorDocumentItem {
  id: string;
  doc_name: string;
  file_path: string | null;
  file_type: string | null;
  shared_at: string | null;
  doc_category: string | null;
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
      .select("id, title, status, amount, project_id, projects(name)")
      .eq("vendor_id", contact.id)
      .order("created_at", { ascending: false }),
    // Shared documents (for Documents card)
    supabase
      .from("vendor_documents")
      .select("id, shared_at, documents(name, file_path, file_type, ai_extracted_data)")
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

  // Build all contracts list with amount_paid from invoices
  const contractsList: VendorContractItem[] = allContracts.map((c: Record<string, unknown>) => {
    const project = c.projects as { name: string } | null;
    const projId = c.project_id as string | null;
    // Sum amount_paid from invoices matching this contract's project and vendor
    const paid = invoices
      .filter((inv: Record<string, unknown>) => projId && inv.project_id === projId)
      .reduce((sum: number, inv: Record<string, unknown>) => {
        const totalAmt = (inv.total_amount as number) ?? 0;
        const balanceDue = (inv.balance_due as number) ?? 0;
        return sum + (totalAmt - balanceDue);
      }, 0);
    return {
      id: c.id as string,
      project_name: project?.name ?? "Unknown Project",
      title: (c.title as string) ?? "",
      amount: (c.amount as number) ?? 0,
      amount_paid: paid,
      status: (c.status as string) ?? "draft",
    };
  });

  // Build documents list
  const documentsList: VendorDocumentItem[] = docs.map((d: Record<string, unknown>) => {
    const doc = d.documents as { name: string; file_path: string; file_type: string; ai_extracted_data: Record<string, string> | null } | null;
    return {
      id: d.id as string,
      doc_name: doc?.name ?? "Untitled Document",
      file_path: doc?.file_path ?? null,
      file_type: doc?.file_type ?? null,
      shared_at: (d.shared_at as string) ?? null,
      doc_category: doc?.ai_extracted_data?.doc_type ?? null,
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

// ---------- Detail page queries ----------

export async function getVendorContact(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .in("contact_type", ["vendor", "subcontractor"])
    .limit(1)
    .single();
  return data;
}

export interface VendorInvoiceDetail {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  status: string;
  invoice_date: string;
  due_date: string | null;
  description: string | null;
  payment_terms: string | null;
  tax_amount: number;
  line_items: unknown;
  project_name: string | null;
  payments: {
    id: string;
    payment_date: string;
    amount: number;
    method: string;
    reference_number: string | null;
    je_entry_number: string | null;
  }[];
}

export async function getVendorInvoiceDetail(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
): Promise<VendorInvoiceDetail | null> {
  const contact = await getVendorContact(supabase, userId);
  if (!contact) return null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, projects(name)")
    .eq("id", invoiceId)
    .eq("vendor_id", contact.id)
    .eq("invoice_type", "payable")
    .single();

  if (!invoice) return null;

  // Fetch payments for this invoice
  const { data: payments } = await supabase
    .from("payments")
    .select("id, payment_date, amount, method, reference_number")
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false });

  // Look up JE references
  const paymentRows = (payments ?? []).map((p) => ({
    ...p,
    je_entry_number: null as string | null,
  }));

  if (paymentRows.length > 0) {
    const refs = paymentRows.map((p) => `payment:${p.id}`);
    const { data: jeData } = await supabase
      .from("journal_entries")
      .select("entry_number, reference")
      .in("reference", refs);
    if (jeData) {
      const jeMap = new Map(jeData.map((je) => [je.reference.replace("payment:", ""), je.entry_number]));
      for (const row of paymentRows) {
        row.je_entry_number = jeMap.get(row.id) || null;
      }
    }
  }

  const project = invoice.projects as { name: string } | null;
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number ?? "",
    total_amount: invoice.total_amount ?? 0,
    balance_due: invoice.balance_due ?? 0,
    status: invoice.status ?? "draft",
    invoice_date: invoice.invoice_date ?? "",
    due_date: invoice.due_date ?? null,
    description: invoice.description ?? null,
    payment_terms: invoice.payment_terms ?? null,
    tax_amount: invoice.tax_amount ?? 0,
    line_items: invoice.line_items ?? null,
    project_name: project?.name ?? null,
    payments: paymentRows,
  };
}

export interface VendorContractDetail {
  id: string;
  contract_number: string | null;
  title: string;
  contract_type: string | null;
  amount: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  scope_of_work: string | null;
  retention_pct: number;
  insurance_required: boolean;
  insurance_expiry: string | null;
  project_name: string | null;
  project_status: string | null;
  invoices: {
    id: string;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
    status: string;
    invoice_date: string;
  }[];
}

export async function getVendorContractDetail(
  supabase: SupabaseClient,
  userId: string,
  contractId: string
): Promise<VendorContractDetail | null> {
  const contact = await getVendorContact(supabase, userId);
  if (!contact) return null;

  const { data: contract } = await supabase
    .from("vendor_contracts")
    .select("*, projects(name, status)")
    .eq("id", contractId)
    .eq("vendor_id", contact.id)
    .single();

  if (!contract) return null;

  // Fetch invoices for this contract's project
  let invoices: { id: string; invoice_number: string; total_amount: number; balance_due: number; status: string; invoice_date: string }[] = [];
  if (contract.project_id) {
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, balance_due, status, invoice_date")
      .eq("vendor_id", contact.id)
      .eq("project_id", contract.project_id)
      .eq("invoice_type", "payable")
      .order("invoice_date", { ascending: false });
    invoices = (data ?? []) as typeof invoices;
  }

  const project = contract.projects as { name: string; status: string } | null;
  return {
    id: contract.id,
    contract_number: contract.contract_number ?? null,
    title: contract.title ?? "",
    contract_type: contract.contract_type ?? null,
    amount: contract.amount ?? 0,
    status: contract.status ?? "draft",
    start_date: contract.start_date ?? null,
    end_date: contract.end_date ?? null,
    scope_of_work: contract.scope_of_work ?? null,
    retention_pct: contract.retention_pct ?? 0,
    insurance_required: contract.insurance_required ?? false,
    insurance_expiry: contract.insurance_expiry ?? null,
    project_name: project?.name ?? null,
    project_status: project?.status ?? null,
    invoices,
  };
}

export interface VendorProjectDetail {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  project_number: string | null;
  contract: {
    id: string;
    title: string;
    amount: number;
    status: string;
    contract_number: string | null;
  } | null;
  invoices: {
    id: string;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
    status: string;
    invoice_date: string;
  }[];
}

export async function getVendorProjectDetail(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<VendorProjectDetail | null> {
  const contact = await getVendorContact(supabase, userId);
  if (!contact) return null;

  // Verify vendor has a contract for this project
  const { data: contract } = await supabase
    .from("vendor_contracts")
    .select("id, title, amount, status, contract_number")
    .eq("vendor_id", contact.id)
    .eq("project_id", projectId)
    .limit(1)
    .single();

  if (!contract) return null;

  // Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, start_date, end_date, project_number")
    .eq("id", projectId)
    .single();

  if (!project) return null;

  // Fetch invoices for this project
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, balance_due, status, invoice_date")
    .eq("vendor_id", contact.id)
    .eq("project_id", projectId)
    .eq("invoice_type", "payable")
    .order("invoice_date", { ascending: false });

  return {
    id: project.id,
    name: project.name ?? "",
    status: project.status ?? "planning",
    start_date: project.start_date ?? null,
    end_date: project.end_date ?? null,
    project_number: project.project_number ?? null,
    contract: {
      id: contract.id,
      title: contract.title,
      amount: contract.amount ?? 0,
      status: contract.status ?? "draft",
      contract_number: contract.contract_number ?? null,
    },
    invoices: (invoices ?? []) as VendorProjectDetail["invoices"],
  };
}
