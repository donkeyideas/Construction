import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Unified Section Transactions
// ---------------------------------------------------------------------------

export interface SectionTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  source: string;
  sourceHref: string;
  debit: number;
  credit: number;
  jeNumber: string | null;
  jeId: string | null;
}

export interface SectionTransactionSummary {
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  netAmount: number;
  transactions: SectionTransaction[];
}

function buildSummary(txns: SectionTransaction[]): SectionTransactionSummary {
  const totalDebits = txns.reduce((s, t) => s + t.debit, 0);
  const totalCredits = txns.reduce((s, t) => s + t.credit, 0);
  return {
    totalTransactions: txns.length,
    totalDebits,
    totalCredits,
    netAmount: totalDebits - totalCredits,
    transactions: txns.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  };
}

// ---------------------------------------------------------------------------
// Helper: Find JE by reference
// ---------------------------------------------------------------------------

async function getJEMap(
  supabase: SupabaseClient,
  companyId: string,
  references: string[]
): Promise<Map<string, { id: string; entry_number: string }>> {
  const map = new Map<string, { id: string; entry_number: string }>();
  if (references.length === 0) return map;

  const { data } = await supabase
    .from("journal_entries")
    .select("id, entry_number, reference")
    .eq("company_id", companyId)
    .eq("status", "posted")
    .in("reference", references);

  for (const je of data ?? []) {
    if (je.reference) {
      map.set(je.reference, { id: je.id, entry_number: je.entry_number });
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// PROJECTS: invoices with project_id + change orders
// ---------------------------------------------------------------------------

export async function getProjectTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Invoices linked to projects
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, invoice_date, total_amount, vendor_name, client_name, status, project_id, projects(name)")
    .eq("company_id", companyId)
    .not("project_id", "is", null)
    .neq("status", "voided")
    .order("invoice_date", { ascending: false })
    .limit(200);

  // Change orders with amounts
  const { data: changeOrders } = await supabase
    .from("change_orders")
    .select("id, co_number, title, amount, status, approved_at, created_at, projects(name)")
    .eq("company_id", companyId)
    .not("amount", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  // Payments on project invoices
  const projectInvoiceIds = (invoices ?? []).map((i) => i.id);
  let payments: { id: string; invoice_id: string; amount: number; payment_date: string; reference_number: string | null }[] = [];
  if (projectInvoiceIds.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("id, invoice_id, amount, payment_date, reference_number")
      .in("invoice_id", projectInvoiceIds)
      .order("payment_date", { ascending: false });
    payments = (data ?? []) as typeof payments;
  }

  // Build JE reference list
  const refs: string[] = [];
  for (const inv of invoices ?? []) refs.push(`invoice:${inv.id}`);
  for (const co of changeOrders ?? []) refs.push(`change_order:${co.id}`);
  for (const p of payments) refs.push(`payment:${p.id}`);

  const jeMap = await getJEMap(supabase, companyId, refs);

  // Map invoices
  for (const inv of invoices ?? []) {
    const je = jeMap.get(`invoice:${inv.id}`);
    const projectName = (inv.projects as unknown as { name: string } | null)?.name ?? "";
    const isPayable = inv.invoice_type === "payable";
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${isPayable ? (inv.vendor_name ?? "Vendor") : (inv.client_name ?? "Client")}${projectName ? ` (${projectName})` : ""}`,
      reference: inv.invoice_number,
      source: isPayable ? "Accounts Payable" : "Accounts Receivable",
      sourceHref: `/financial/invoices/${inv.id}`,
      debit: isPayable ? Number(inv.total_amount) || 0 : 0,
      credit: !isPayable ? Number(inv.total_amount) || 0 : 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  // Map change orders
  for (const co of changeOrders ?? []) {
    const je = jeMap.get(`change_order:${co.id}`);
    const projectName = (co.projects as unknown as { name: string } | null)?.name ?? "";
    const amount = Number(co.amount) || 0;
    txns.push({
      id: `co-${co.id}`,
      date: co.approved_at ?? co.created_at,
      description: `${co.co_number} — ${co.title}${projectName ? ` (${projectName})` : ""}`,
      reference: co.co_number,
      source: "Change Orders",
      sourceHref: "/projects/change-orders",
      debit: amount > 0 ? amount : 0,
      credit: amount < 0 ? Math.abs(amount) : 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  // Map payments
  const invoiceMap = new Map((invoices ?? []).map((i) => [i.id, i]));
  for (const p of payments) {
    const je = jeMap.get(`payment:${p.id}`);
    const inv = invoiceMap.get(p.invoice_id);
    const isPayable = inv?.invoice_type === "payable";
    txns.push({
      id: `pmt-${p.id}`,
      date: p.payment_date,
      description: `Payment on ${inv?.invoice_number ?? "Invoice"} — ${p.reference_number ?? ""}`,
      reference: p.reference_number ?? "",
      source: "Payments",
      sourceHref: inv ? `/financial/invoices/${inv.id}` : "/financial/invoices",
      debit: !isPayable ? Number(p.amount) || 0 : 0,
      credit: isPayable ? Number(p.amount) || 0 : 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// PROPERTIES: invoices with property_id + lease-related
// ---------------------------------------------------------------------------

export async function getPropertyTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, invoice_date, total_amount, vendor_name, client_name, status")
    .eq("company_id", companyId)
    .not("property_id", "is", null)
    .neq("status", "voided")
    .order("invoice_date", { ascending: false })
    .limit(200);

  const refs = (invoices ?? []).map((i) => `invoice:${i.id}`);

  // Payments on property invoices
  const invoiceIds = (invoices ?? []).map((i) => i.id);
  let payments: { id: string; invoice_id: string; amount: number; payment_date: string; reference_number: string | null }[] = [];
  if (invoiceIds.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("id, invoice_id, amount, payment_date, reference_number")
      .in("invoice_id", invoiceIds)
      .order("payment_date", { ascending: false });
    payments = (data ?? []) as typeof payments;
    for (const p of payments) refs.push(`payment:${p.id}`);
  }

  // JE lines with property_id
  const { data: jeLines } = await supabase
    .from("journal_entry_lines")
    .select("id, debit, credit, description, journal_entry_id, journal_entries(id, entry_number, entry_date, reference, status)")
    .eq("company_id", companyId)
    .not("property_id", "is", null)
    .limit(200);

  const jeMap = await getJEMap(supabase, companyId, refs);

  // Map invoices
  for (const inv of invoices ?? []) {
    const je = jeMap.get(`invoice:${inv.id}`);
    const isPayable = inv.invoice_type === "payable";
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${isPayable ? (inv.vendor_name ?? "Vendor") : (inv.client_name ?? "Client")}`,
      reference: inv.invoice_number,
      source: isPayable ? "Accounts Payable" : "Accounts Receivable",
      sourceHref: `/financial/invoices/${inv.id}`,
      debit: isPayable ? Number(inv.total_amount) || 0 : 0,
      credit: !isPayable ? Number(inv.total_amount) || 0 : 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  // Map payments
  const invoiceMap = new Map((invoices ?? []).map((i) => [i.id, i]));
  for (const p of payments) {
    const je = jeMap.get(`payment:${p.id}`);
    const inv = invoiceMap.get(p.invoice_id);
    const isPayable = inv?.invoice_type === "payable";
    txns.push({
      id: `pmt-${p.id}`,
      date: p.payment_date,
      description: `Payment on ${inv?.invoice_number ?? "Invoice"}`,
      reference: p.reference_number ?? "",
      source: "Payments",
      sourceHref: inv ? `/financial/invoices/${inv.id}` : "/financial/invoices",
      debit: !isPayable ? Number(p.amount) || 0 : 0,
      credit: isPayable ? Number(p.amount) || 0 : 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  // Add JE lines that reference properties but aren't from invoices/payments
  const existingIds = new Set(txns.map((t) => t.id));
  for (const line of jeLines ?? []) {
    const je = line.journal_entries as unknown as { id: string; entry_number: string; entry_date: string; reference: string | null; status: string } | null;
    if (!je || je.status !== "posted") continue;
    // Skip if we already have this from invoices/payments
    if (je.reference && (je.reference.startsWith("invoice:") || je.reference.startsWith("payment:"))) continue;

    const lineId = `jel-${line.id}`;
    if (existingIds.has(lineId)) continue;

    txns.push({
      id: lineId,
      date: je.entry_date,
      description: line.description || je.reference || "Journal Entry",
      reference: je.entry_number,
      source: "General Ledger",
      sourceHref: `/financial/general-ledger?entry=${je.entry_number}`,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      jeNumber: je.entry_number,
      jeId: je.id,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// FINANCIAL: All journal entry lines (the master ledger)
// ---------------------------------------------------------------------------

export async function getFinancialTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  const { data: jeLines } = await supabase
    .from("journal_entry_lines")
    .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(300);

  for (const line of jeLines ?? []) {
    const je = line.journal_entries as unknown as { id: string; entry_number: string; entry_date: string; description: string; reference: string | null; status: string } | null;
    if (!je || je.status !== "posted") continue;

    let source = "General Ledger";
    let sourceHref = `/financial/general-ledger?entry=${je.entry_number}`;
    const ref = je.reference ?? "";

    if (ref.startsWith("invoice:")) {
      source = "Invoices";
      sourceHref = `/financial/invoices/${ref.replace("invoice:", "")}`;
    } else if (ref.startsWith("payment:")) {
      source = "Payments";
      sourceHref = "/financial/invoices";
    } else if (ref.startsWith("change_order:")) {
      source = "Change Orders";
      sourceHref = "/projects/change-orders";
    } else if (ref.startsWith("payroll_run:")) {
      source = "Payroll";
      sourceHref = "/people/payroll";
    }

    txns.push({
      id: `jel-${line.id}`,
      date: je.entry_date,
      description: line.description || je.description || "",
      reference: je.entry_number,
      source,
      sourceHref,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      jeNumber: je.entry_number,
      jeId: je.id,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// PEOPLE: Payroll runs + contractor invoices
// ---------------------------------------------------------------------------

export async function getPeopleTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Payroll runs
  const { data: payrollRuns } = await supabase
    .from("payroll_runs")
    .select("id, period_start, period_end, pay_date, status, total_gross, total_net, total_employer_taxes, employee_count, journal_entry_id")
    .eq("company_id", companyId)
    .in("status", ["approved", "paid"])
    .order("pay_date", { ascending: false })
    .limit(100);

  // Get JEs for payroll
  const payrollRefs = (payrollRuns ?? []).map((r) => `payroll_run:${r.id}`);
  const jeMap = await getJEMap(supabase, companyId, payrollRefs);

  for (const run of payrollRuns ?? []) {
    const je = jeMap.get(`payroll_run:${run.id}`);
    const gross = Number(run.total_gross) || 0;
    const employerTaxes = Number(run.total_employer_taxes) || 0;
    const net = Number(run.total_net) || 0;

    txns.push({
      id: `pr-${run.id}`,
      date: run.pay_date ?? run.period_end,
      description: `Payroll ${run.period_start} to ${run.period_end} (${run.employee_count} employees)`,
      reference: `PR-${run.id.substring(0, 8)}`,
      source: "Payroll",
      sourceHref: "/people/payroll",
      debit: gross + employerTaxes,
      credit: net,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  // Contractor/vendor invoices (payable invoices with vendor)
  const { data: contractorInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, total_amount, vendor_name, status")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .neq("status", "voided")
    .order("invoice_date", { ascending: false })
    .limit(100);

  const invRefs = (contractorInvoices ?? []).map((i) => `invoice:${i.id}`);
  const invJeMap = await getJEMap(supabase, companyId, invRefs);

  for (const inv of contractorInvoices ?? []) {
    const je = invJeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Vendor Invoices",
      sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0,
      credit: 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// EQUIPMENT: equipment purchases + maintenance costs
// ---------------------------------------------------------------------------

export async function getEquipmentTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // JE lines tagged to fixed asset accounts (account_type = 'asset', sub_type = 'fixed_asset')
  const { data: fixedAssetAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("sub_type", "fixed_asset")
    .eq("is_active", true);

  const accountIds = (fixedAssetAccounts ?? []).map((a) => a.id);

  if (accountIds.length > 0) {
    const { data: jeLines } = await supabase
      .from("journal_entry_lines")
      .select("id, debit, credit, description, account_id, journal_entries(id, entry_number, entry_date, description, reference, status)")
      .eq("company_id", companyId)
      .in("account_id", accountIds)
      .limit(200);

    for (const line of jeLines ?? []) {
      const je = line.journal_entries as unknown as { id: string; entry_number: string; entry_date: string; description: string; reference: string | null; status: string } | null;
      if (!je || je.status !== "posted") continue;

      txns.push({
        id: `jel-${line.id}`,
        date: je.entry_date,
        description: line.description || je.description || "Equipment Transaction",
        reference: je.entry_number,
        source: "General Ledger",
        sourceHref: `/financial/general-ledger?entry=${je.entry_number}`,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        jeNumber: je.entry_number,
        jeId: je.id,
      });
    }
  }

  // Equipment maintenance invoices - match invoices with "equipment" or "maintenance" in description
  const { data: equipInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, total_amount, vendor_name, status, notes")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .neq("status", "voided")
    .or("notes.ilike.%equipment%,notes.ilike.%maintenance%,notes.ilike.%repair%,notes.ilike.%rental%")
    .order("invoice_date", { ascending: false })
    .limit(100);

  const invRefs = (equipInvoices ?? []).map((i) => `invoice:${i.id}`);
  const jeMap = await getJEMap(supabase, companyId, invRefs);

  for (const inv of equipInvoices ?? []) {
    const je = jeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Invoices",
      sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0,
      credit: 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// SAFETY: safety-related expenses (training, equipment, incident costs)
// ---------------------------------------------------------------------------

export async function getSafetyTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Invoices with safety-related keywords
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, total_amount, vendor_name, status, notes")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .neq("status", "voided")
    .or("notes.ilike.%safety%,notes.ilike.%training%,notes.ilike.%ppe%,notes.ilike.%osha%,notes.ilike.%inspection%")
    .order("invoice_date", { ascending: false })
    .limit(100);

  const refs = (invoices ?? []).map((i) => `invoice:${i.id}`);
  const jeMap = await getJEMap(supabase, companyId, refs);

  for (const inv of invoices ?? []) {
    const je = jeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Invoices",
      sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0,
      credit: 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// DOCUMENTS: storage/printing costs (minimal)
// ---------------------------------------------------------------------------

export async function getDocumentTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Invoices with document-related keywords
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, total_amount, vendor_name, status, notes")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .neq("status", "voided")
    .or("notes.ilike.%printing%,notes.ilike.%document%,notes.ilike.%blueprint%,notes.ilike.%scanning%,notes.ilike.%storage%")
    .order("invoice_date", { ascending: false })
    .limit(100);

  const refs = (invoices ?? []).map((i) => `invoice:${i.id}`);
  const jeMap = await getJEMap(supabase, companyId, refs);

  for (const inv of invoices ?? []) {
    const je = jeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Invoices",
      sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0,
      credit: 0,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// CRM: bid costs + won opportunity values
// ---------------------------------------------------------------------------

export async function getCRMTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Won opportunities with estimated_value
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, name, estimated_value, stage, close_date, created_at")
    .eq("company_id", companyId)
    .eq("stage", "won")
    .not("estimated_value", "is", null)
    .order("close_date", { ascending: false })
    .limit(100);

  for (const opp of opportunities ?? []) {
    const value = Number(opp.estimated_value) || 0;
    txns.push({
      id: `opp-${opp.id}`,
      date: opp.close_date ?? opp.created_at,
      description: `Won: ${opp.name}`,
      reference: "",
      source: "Opportunities",
      sourceHref: "/crm",
      debit: 0,
      credit: value,
      jeNumber: null,
      jeId: null,
    });
  }

  // Bid costs from bids table
  const { data: bids } = await supabase
    .from("bids")
    .select("id, bid_number, project_name, bid_amount, estimated_cost, status, due_date, created_at")
    .eq("company_id", companyId)
    .not("bid_amount", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  for (const bid of bids ?? []) {
    const amount = Number(bid.bid_amount) || 0;
    const cost = Number(bid.estimated_cost) || 0;
    txns.push({
      id: `bid-${bid.id}`,
      date: bid.due_date ?? bid.created_at,
      description: `Bid ${bid.bid_number ?? ""} — ${bid.project_name ?? ""}`.trim(),
      reference: bid.bid_number ?? "",
      source: "Bids",
      sourceHref: "/crm/bids",
      debit: cost > 0 ? cost : 0,
      credit: amount > 0 ? amount : 0,
      jeNumber: null,
      jeId: null,
    });
  }

  return buildSummary(txns);
}
