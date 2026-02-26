import { SupabaseClient } from "@supabase/supabase-js";
import { paginatedQuery } from "@/lib/utils/paginated-query";

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
  /** When false, this transaction type doesn't generate JEs (e.g. contracts, RFIs) */
  jeExpected?: boolean;
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

  // Chunk .in() queries at 300 to avoid URL length limits
  const CHUNK = 300;
  for (let i = 0; i < references.length; i += CHUNK) {
    const chunk = references.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("journal_entries")
      .select("id, entry_number, reference")
      .eq("company_id", companyId)
      .eq("status", "posted")
      .in("reference", chunk);

    for (const je of data ?? []) {
      if (je.reference) {
        map.set(je.reference, { id: je.id, entry_number: je.entry_number });
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// PROJECTS: JE lines, invoices, change orders, payments, contracts, RFIs
// ---------------------------------------------------------------------------

export async function getProjectTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // 1. Get all project IDs for this company
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId);
  const projectIds = (projects ?? []).map((p) => p.id);
  const projectNameMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

  if (projectIds.length === 0) return buildSummary(txns);

  // 2. Fetch ALL data sources in parallel using paginatedQuery (no hard limits)
  const [invoices, changeOrders, jeLines, contracts, rfis] = await Promise.all([
    paginatedQuery<{ id: string; invoice_number: string; invoice_type: string; invoice_date: string; total_amount: number; vendor_name: string | null; client_name: string | null; status: string; project_id: string | null }>((from, to) =>
      supabase.from("invoices")
        .select("id, invoice_number, invoice_type, invoice_date, total_amount, vendor_name, client_name, status, project_id")
        .eq("company_id", companyId).in("project_id", projectIds).neq("status", "voided")
        .order("invoice_date", { ascending: false }).range(from, to)),
    paginatedQuery<{ id: string; co_number: string; title: string; amount: number; status: string; approved_at: string | null; created_at: string; project_id: string }>((from, to) =>
      supabase.from("change_orders")
        .select("id, co_number, title, amount, status, approved_at, created_at, project_id")
        .eq("company_id", companyId).in("project_id", projectIds).not("amount", "is", null)
        .order("created_at", { ascending: false }).range(from, to)),
    paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; project_id: string | null; journal_entries: unknown }>((from, to) =>
      supabase.from("journal_entry_lines")
        .select("id, debit, credit, description, project_id, journal_entries(id, entry_number, entry_date, description, reference, status)")
        .eq("company_id", companyId).in("project_id", projectIds).range(from, to)),
    paginatedQuery<{ id: string; contract_number: string | null; title: string | null; contract_amount: number; status: string; start_date: string | null; project_id: string }>((from, to) =>
      supabase.from("contracts")
        .select("id, contract_number, title, contract_amount, status, start_date, project_id")
        .eq("company_id", companyId).in("project_id", projectIds).not("contract_amount", "is", null)
        .order("start_date", { ascending: false }).range(from, to)),
    paginatedQuery<{ id: string; rfi_number: string | null; subject: string | null; cost_impact: number; status: string; created_at: string; project_id: string }>((from, to) =>
      supabase.from("rfis")
        .select("id, rfi_number, subject, cost_impact, status, created_at, project_id")
        .eq("company_id", companyId).in("project_id", projectIds).not("cost_impact", "is", null).gt("cost_impact", 0)
        .order("created_at", { ascending: false }).range(from, to)),
  ]);

  // 3. Fetch payments for project invoices (uses invoice IDs from step 2)
  const projectInvoiceIds = invoices.map((i) => i.id);
  const pmts = projectInvoiceIds.length > 0
    ? await paginatedQuery<{ id: string; invoice_id: string; amount: number; payment_date: string; reference_number: string | null }>((from, to) =>
        supabase.from("payments")
          .select("id, invoice_id, amount, payment_date, reference_number")
          .in("invoice_id", projectInvoiceIds).order("payment_date", { ascending: false }).range(from, to))
    : [];

  // 4. Single batched JE lookup for all references
  const allRefs = [
    ...invoices.map((i) => `invoice:${i.id}`),
    ...changeOrders.map((co) => `change_order:${co.id}`),
    ...pmts.map((p) => `payment:${p.id}`),
    ...contracts.map((c) => `contract:${c.id}`),
    ...rfis.map((r) => `rfi:${r.id}`),
  ];
  const jeMap = await getJEMap(supabase, companyId, allRefs);

  // 5. Build transaction rows — populate coveredJeIds from all source entities
  //    BEFORE the standalone JE lines loop, so it can skip duplicates.
  const coveredJeIds = new Set<string>();

  for (const inv of invoices) {
    const je = jeMap.get(`invoice:${inv.id}`);
    if (je) coveredJeIds.add(je.id);
    const projectName = inv.project_id ? projectNameMap.get(inv.project_id) ?? "" : "";
    const isPayable = inv.invoice_type === "payable";
    txns.push({
      id: `inv-${inv.id}`, date: inv.invoice_date,
      description: `${inv.invoice_number} — ${isPayable ? (inv.vendor_name ?? "Vendor") : (inv.client_name ?? "Client")}${projectName ? ` (${projectName})` : ""}`,
      reference: inv.invoice_number,
      source: isPayable ? "Accounts Payable" : "Accounts Receivable",
      sourceHref: `/financial/invoices/${inv.id}`,
      debit: isPayable ? Number(inv.total_amount) || 0 : 0,
      credit: !isPayable ? Number(inv.total_amount) || 0 : 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  for (const co of changeOrders) {
    const je = jeMap.get(`change_order:${co.id}`);
    if (je) coveredJeIds.add(je.id);
    const projectName = co.project_id ? projectNameMap.get(co.project_id) ?? "" : "";
    const amount = Number(co.amount) || 0;
    txns.push({
      id: `co-${co.id}`, date: co.approved_at ?? co.created_at,
      description: `${co.co_number} — ${co.title}${projectName ? ` (${projectName})` : ""}`,
      reference: co.co_number, source: "Change Orders", sourceHref: "/projects/change-orders",
      debit: amount > 0 ? amount : 0, credit: amount < 0 ? Math.abs(amount) : 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
  for (const p of pmts) {
    const je = jeMap.get(`payment:${p.id}`);
    if (je) coveredJeIds.add(je.id);
    const inv = invoiceMap.get(p.invoice_id);
    const isPayable = inv?.invoice_type === "payable";
    txns.push({
      id: `pmt-${p.id}`, date: p.payment_date,
      description: `Payment on ${inv?.invoice_number ?? "Invoice"} — ${p.reference_number ?? ""}`,
      reference: p.reference_number ?? "", source: "Payments",
      sourceHref: inv ? `/financial/invoices/${inv.id}` : "/financial/invoices",
      debit: !isPayable ? Number(p.amount) || 0 : 0, credit: isPayable ? Number(p.amount) || 0 : 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // Contracts MUST be processed before standalone JE lines so coveredJeIds is populated
  for (const c of contracts) {
    const je = jeMap.get(`contract:${c.id}`);
    if (je) coveredJeIds.add(je.id);
    const projectName = c.project_id ? projectNameMap.get(c.project_id) ?? "" : "";
    const amount = Number(c.contract_amount) || 0;
    txns.push({
      id: `contract-${c.id}`, date: c.start_date ?? new Date().toISOString().split("T")[0],
      description: `${c.contract_number ?? c.title ?? "Contract"}${projectName ? ` (${projectName})` : ""}`,
      reference: c.contract_number ?? "", source: "Contracts", sourceHref: "/projects/contracts",
      debit: amount, credit: 0, jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // RFIs — processed before JE lines so coveredJeIds is populated
  for (const rfi of rfis) {
    const je = jeMap.get(`rfi:${rfi.id}`);
    if (je) coveredJeIds.add(je.id);
    const projectName = rfi.project_id ? projectNameMap.get(rfi.project_id) ?? "" : "";
    const impact = Number(rfi.cost_impact) || 0;
    txns.push({
      id: `rfi-${rfi.id}`, date: rfi.created_at,
      description: `RFI ${rfi.rfi_number ?? ""} — ${rfi.subject ?? ""}${projectName ? ` (${projectName})` : ""}`.trim(),
      reference: rfi.rfi_number ?? "", source: "RFIs", sourceHref: "/projects/rfis",
      debit: impact, credit: 0, jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null, jeExpected: false,
    });
  }

  // Standalone JE lines — only those NOT already covered by source entities
  for (const line of jeLines) {
    const je = line.journal_entries as unknown as {
      id: string; entry_number: string; entry_date: string;
      description: string; reference: string | null; status: string;
    } | null;
    if (!je || je.status !== "posted" || coveredJeIds.has(je.id)) continue;
    const projectName = line.project_id ? projectNameMap.get(line.project_id) ?? "" : "";
    txns.push({
      id: `jel-${line.id}`, date: je.entry_date,
      description: `${line.description || je.description || "Journal Entry"}${projectName ? ` (${projectName})` : ""}`,
      reference: je.entry_number, source: "Journal Entry",
      sourceHref: `/financial/general-ledger?entry=${je.entry_number}`,
      debit: Number(line.debit) || 0, credit: Number(line.credit) || 0,
      jeNumber: je.entry_number, jeId: je.id,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// Helper: map JE lines with debit/credit and smart source labeling
// ---------------------------------------------------------------------------

type JELineRow = {
  id: string; debit: number | null; credit: number | null;
  description: string | null; project_id?: string | null; property_id?: string | null;
  account_id?: string | null;
  journal_entries: unknown;
};
type JEParsed = {
  id: string; entry_number: string; entry_date: string;
  description: string; reference: string | null; status: string;
};

function mapJELine(line: JELineRow, extra?: { projectNameMap?: Map<string, string> }): SectionTransaction | null {
  const je = line.journal_entries as unknown as JEParsed | null;
  if (!je || je.status !== "posted") return null;

  let source = "Journal Entry";
  let sourceHref = `/financial/general-ledger?entry=${je.entry_number}`;
  const ref = je.reference ?? "";

  if (ref.startsWith("invoice:")) {
    source = "Invoice JE";
    sourceHref = `/financial/invoices/${ref.replace("invoice:", "")}`;
  } else if (ref.startsWith("payment:")) {
    source = "Payment JE";
    sourceHref = "/financial/invoices";
  } else if (ref.startsWith("change_order:")) {
    source = "Change Order JE";
    sourceHref = "/projects/change-orders";
  } else if (ref.startsWith("payroll_run:") || ref.startsWith("payroll:")) {
    source = "Payroll JE";
    sourceHref = "/people/labor";
  } else if (ref.startsWith("lease_accrual:") || ref.startsWith("lease_recognition:") || ref.startsWith("lease:")) {
    source = "Lease JE";
    sourceHref = "/properties/leases";
  } else if (ref.startsWith("rent_payment:")) {
    source = "Rent Payment JE";
    sourceHref = "/properties/leases";
  } else if (ref.startsWith("equipment_purchase:")) {
    source = "Equipment Purchase JE";
    sourceHref = "/equipment";
  } else if (ref.startsWith("depreciation:")) {
    source = "Depreciation JE";
    sourceHref = "/equipment";
  } else if (ref.startsWith("maintenance:") || ref.startsWith("equip_maintenance:")) {
    source = "Maintenance JE";
    sourceHref = "/properties/maintenance";
  } else if (ref.startsWith("labor:")) {
    source = "Labor Accrual JE";
    sourceHref = "/people/activity";
  } else if (ref.startsWith("contract:")) {
    source = "Contract JE";
    sourceHref = "/projects/contracts";
  } else if (ref.startsWith("rfi:")) {
    source = "RFI JE";
    sourceHref = "/projects/rfis";
  }

  const projName = line.project_id && extra?.projectNameMap
    ? extra.projectNameMap.get(line.project_id) ?? ""
    : "";

  return {
    id: `jel-${line.id}`,
    date: je.entry_date,
    description: `${line.description || je.description || "Journal Entry"}${projName ? ` (${projName})` : ""}`,
    reference: je.entry_number,
    source,
    sourceHref,
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0,
    jeNumber: je.entry_number,
    jeId: je.id,
  };
}

// ---------------------------------------------------------------------------
// PROPERTIES: JE lines, invoices, payments, leases, maintenance
// ---------------------------------------------------------------------------

export async function getPropertyTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Run all independent queries in parallel using paginatedQuery (no hard limits)
  const [jeLines, invoices, scheduleRows, leases, maintenance, rentPayments] = await Promise.all([
    // 1. JE lines with property_id
    paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; property_id: string | null; journal_entries: unknown }>((from, to) =>
      supabase.from("journal_entry_lines")
        .select("id, debit, credit, description, property_id, journal_entries(id, entry_number, entry_date, description, reference, status)")
        .eq("company_id", companyId).not("property_id", "is", null).range(from, to)),
    // 2. Invoices with property_id
    paginatedQuery<{ id: string; invoice_number: string; invoice_type: string; invoice_date: string; total_amount: number; vendor_name: string | null; client_name: string | null; status: string }>((from, to) =>
      supabase.from("invoices")
        .select("id, invoice_number, invoice_type, invoice_date, total_amount, vendor_name, client_name, status")
        .eq("company_id", companyId).not("property_id", "is", null).neq("status", "voided")
        .order("invoice_date", { ascending: false }).range(from, to)),
    // 3. Lease revenue schedule
    paginatedQuery<{ id: string; schedule_date: string; monthly_rent: number; status: string; accrual_je_id: string | null; recognition_je_id: string | null; collection_je_id: string | null; lease_id: string; property_id: string | null; leases: unknown }>((from, to) =>
      supabase.from("lease_revenue_schedule")
        .select("id, schedule_date, monthly_rent, status, accrual_je_id, recognition_je_id, collection_je_id, lease_id, property_id, leases(tenant_name, units(unit_number))")
        .eq("company_id", companyId).order("schedule_date", { ascending: false }).range(from, to)),
    // 4. Leases (fallback for un-scheduled)
    paginatedQuery<{ id: string; tenant_name: string | null; monthly_rent: number | null; security_deposit: number | null; lease_start: string | null; status: string; property_id: string | null; units: unknown }>((from, to) =>
      supabase.from("leases")
        .select("id, tenant_name, monthly_rent, security_deposit, lease_start, status, property_id, units(unit_number)")
        .eq("company_id", companyId).not("monthly_rent", "is", null)
        .order("lease_start", { ascending: false }).range(from, to)),
    // 5. Maintenance requests
    paginatedQuery<{ id: string; title: string | null; actual_cost: number | null; estimated_cost: number | null; status: string; created_at: string; property_id: string | null }>((from, to) =>
      supabase.from("maintenance_requests")
        .select("id, title, actual_cost, estimated_cost, status, created_at, property_id")
        .eq("company_id", companyId).or("actual_cost.gt.0,estimated_cost.gt.0")
        .order("created_at", { ascending: false }).range(from, to)),
    // 6. Rent payments (via leases)
    paginatedQuery<{ id: string; amount: number; payment_date: string | null; method: string | null; status: string; gateway_provider: string | null; notes: string | null; lease_id: string; leases: unknown }>((from, to) =>
      supabase.from("rent_payments")
        .select("id, amount, payment_date, method, status, gateway_provider, notes, lease_id, leases(tenant_name, property_id, units(unit_number))")
        .eq("company_id", companyId).order("payment_date", { ascending: false }).range(from, to)),
  ]);

  // Build secondary queries that depend on primary results
  const invRefs = invoices.map((i) => `invoice:${i.id}`);
  const invoiceIds = invoices.map((i) => i.id);
  const maintRefs = maintenance.filter((m) => (Number(m.actual_cost) || Number(m.estimated_cost) || 0) > 0).map((m) => `maintenance:${m.id}`);
  const rentPaymentRefs = rentPayments.map((rp) => `rent_payment:${rp.id}`);
  const leaseRefs = leases.map((l) => `lease:${l.id}`);

  // Collect JE IDs from schedule rows
  const scheduleJeIds = new Set<string>();
  for (const row of scheduleRows) {
    if (row.accrual_je_id) scheduleJeIds.add(row.accrual_je_id);
    if (row.recognition_je_id) scheduleJeIds.add(row.recognition_je_id);
    if (row.collection_je_id) scheduleJeIds.add(row.collection_je_id);
  }
  const jeIdArray = Array.from(scheduleJeIds);

  // Run dependent queries in parallel — including payments + their JE map
  const [invJeMap, pmts, scheduleJeResult, maintJeMap, rentPaymentJeMap, leaseJeMap] = await Promise.all([
    getJEMap(supabase, companyId, invRefs),
    invoiceIds.length > 0
      ? paginatedQuery<{ id: string; invoice_id: string; amount: number; payment_date: string; reference_number: string | null }>((from, to) =>
          supabase.from("payments").select("id, invoice_id, amount, payment_date, reference_number")
            .in("invoice_id", invoiceIds).order("payment_date", { ascending: false }).range(from, to))
      : Promise.resolve([] as { id: string; invoice_id: string; amount: number; payment_date: string; reference_number: string | null }[]),
    jeIdArray.length > 0
      ? (async () => {
          const CHUNK = 300;
          const all: { id: string; entry_number: string }[] = [];
          for (let i = 0; i < jeIdArray.length; i += CHUNK) {
            const chunk = jeIdArray.slice(i, i + CHUNK);
            const { data } = await supabase.from("journal_entries").select("id, entry_number").in("id", chunk);
            if (data) all.push(...data);
          }
          return { data: all };
        })()
      : Promise.resolve({ data: null }),
    getJEMap(supabase, companyId, maintRefs),
    getJEMap(supabase, companyId, rentPaymentRefs),
    getJEMap(supabase, companyId, leaseRefs),
  ]);

  // Track JE IDs already represented by source entities (invoices/payments/maintenance/rent)
  // so standalone JE lines loop can skip duplicates.
  const coveredJeIds = new Set<string>();

  // Process invoices — always show, populate JE when available
  for (const inv of invoices) {
    const je = invJeMap.get(`invoice:${inv.id}`);
    if (je) coveredJeIds.add(je.id);
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
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // Process payments — fetch JE map, then build rows
  let pmtJeMap = new Map<string, { id: string; entry_number: string }>();
  if (pmts.length > 0) {
    pmtJeMap = await getJEMap(supabase, companyId, pmts.map((p) => `payment:${p.id}`));
  }
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  for (const p of pmts) {
    const je = pmtJeMap.get(`payment:${p.id}`);
    if (je) coveredJeIds.add(je.id);
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
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // Pre-populate coveredJeIds with maintenance + rent payment JEs before the JE lines loop
  for (const m of maintenance) {
    const je = maintJeMap.get(`maintenance:${m.id}`);
    if (je) coveredJeIds.add(je.id);
  }
  for (const rp of rentPayments) {
    const je = rentPaymentJeMap.get(`rent_payment:${rp.id}`);
    if (je) coveredJeIds.add(je.id);
  }

  // Standalone JE lines (only those NOT already covered by invoices/payments/maintenance/rent)
  for (const line of jeLines as JELineRow[]) {
    const je = line.journal_entries as unknown as {
      id: string; entry_number: string; entry_date: string;
      description: string; reference: string | null; status: string;
    } | null;
    if (!je || je.status !== "posted") continue;
    if (coveredJeIds.has(je.id)) continue;
    const txn = mapJELine(line);
    if (txn) txns.push(txn);
  }

  // Process lease revenue schedule
  const scheduleJeMap = new Map<string, string>(
    (scheduleJeResult.data ?? []).map((j) => [j.id, j.entry_number])
  );

  for (const row of scheduleRows) {
    const lease = row.leases as unknown as { tenant_name: string; units: { unit_number: string } | null } | null;
    const tenantName = lease?.tenant_name ?? "Tenant";
    const unitNumber = lease?.units?.unit_number ?? "N/A";
    const rent = Number(row.monthly_rent) || 0;
    const ym = row.schedule_date?.substring(0, 7) ?? "";
    const statusBadge = row.status === "collected" ? "[Collected]" :
                        row.status === "accrued" ? "[Recognized]" : "[Scheduled]";

    const jeId = row.collection_je_id || row.recognition_je_id || row.accrual_je_id || null;
    const jeNumber = jeId ? (scheduleJeMap.get(jeId) ?? null) : null;

    txns.push({
      id: `lrs-${row.id}`,
      date: row.schedule_date,
      description: `${statusBadge} ${tenantName} (Unit ${unitNumber}) — Rent ${ym}`,
      reference: jeNumber ?? "",
      source: "Lease Schedule",
      sourceHref: "/properties/leases",
      debit: row.status === "collected" ? rent : 0,
      credit: rent,
      jeNumber,
      jeId,
    });
  }

  // Leases without schedule rows — look up JEs created by backfill (reference = "lease:{id}")
  const scheduledLeaseIds = new Set(scheduleRows.map((r) => r.lease_id));
  for (const lease of leases) {
    if (scheduledLeaseIds.has(lease.id)) continue;
    const rent = Number(lease.monthly_rent) || 0;
    const deposit = Number(lease.security_deposit) || 0;
    const unitNum = (lease.units as unknown as { unit_number: string } | null)?.unit_number ?? "N/A";
    const isActive = ["active", "renewed"].includes(lease.status);
    const je = leaseJeMap.get(`lease:${lease.id}`);
    if (je) coveredJeIds.add(je.id);
    if (rent > 0) {
      txns.push({
        id: `lease-rent-${lease.id}`,
        date: lease.lease_start ?? new Date().toISOString().split("T")[0],
        description: `[Pending] ${lease.tenant_name ?? "Tenant"} (Unit ${unitNum}) — Monthly Rent`,
        reference: je?.entry_number ?? "", source: "Leases", sourceHref: "/properties/leases",
        debit: 0, credit: rent,
        jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null, jeExpected: isActive,
      });
    }
    if (deposit > 0) {
      txns.push({
        id: `lease-dep-${lease.id}`,
        date: lease.lease_start ?? new Date().toISOString().split("T")[0],
        description: `${lease.tenant_name ?? "Tenant"} (Unit ${unitNum}) — Security Deposit`,
        reference: je?.entry_number ?? "", source: "Leases", sourceHref: "/properties/leases",
        debit: deposit, credit: 0,
        jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null, jeExpected: isActive,
      });
    }
  }

  // Process maintenance requests — look up existing JEs by reference
  for (const m of maintenance) {
    const cost = Number(m.actual_cost) || Number(m.estimated_cost) || 0;
    if (cost <= 0) continue;
    const je = maintJeMap.get(`maintenance:${m.id}`);
    txns.push({
      id: `maint-${m.id}`,
      date: m.created_at,
      description: `Maintenance — ${m.title ?? "Work Order"}`,
      reference: je?.entry_number ?? "", source: "Maintenance", sourceHref: "/properties/maintenance",
      debit: cost, credit: 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // Process rent payments — show as explicit "Rent Payment" source
  for (const rp of rentPayments) {
    const amount = Number(rp.amount) || 0;
    if (amount <= 0) continue;
    const je = rentPaymentJeMap.get(`rent_payment:${rp.id}`);
    if (je) coveredJeIds.add(je.id);
    const leaseInfo = rp.leases as unknown as { tenant_name: string | null; property_id: string | null; units: { unit_number: string } | null } | null;
    const tenantName = leaseInfo?.tenant_name ?? "Tenant";
    const unitNumber = leaseInfo?.units?.unit_number ?? "";
    const methodLabel = rp.method === "online" && rp.gateway_provider
      ? `Online (${rp.gateway_provider.charAt(0).toUpperCase() + rp.gateway_provider.slice(1)})`
      : rp.method ?? "";
    txns.push({
      id: `rent-${rp.id}`,
      date: rp.payment_date ?? rp.notes ?? new Date().toISOString().split("T")[0],
      description: `Rent Payment — ${tenantName}${unitNumber ? ` (Unit ${unitNumber})` : ""}${methodLabel ? ` — ${methodLabel}` : ""}`,
      reference: je?.entry_number ?? "",
      source: "Rent Payment",
      sourceHref: "/properties",
      debit: 0,
      credit: amount,
      jeNumber: je?.entry_number ?? null,
      jeId: je?.id ?? null,
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

  const allJeLines = await paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }>((from, to) =>
    supabase.from("journal_entry_lines")
      .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }).range(from, to));

  for (const line of allJeLines as JELineRow[]) {
    const txn = mapJELine(line);
    if (txn) txns.push(txn);
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// PEOPLE: JE lines (payroll), payroll runs, contractor invoices
// ---------------------------------------------------------------------------

export async function getPeopleTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Phase 1: All independent queries in parallel
  const [payrollAccounts, payrollJEs, payrollRuns, contractorInvoices] = await Promise.all([
    paginatedQuery<{ id: string }>((from, to) =>
      supabase.from("chart_of_accounts").select("id")
        .eq("company_id", companyId).eq("is_active", true)
        .or("name.ilike.%payroll%,name.ilike.%salary%,name.ilike.%wage%,name.ilike.%fica%,name.ilike.%futa%,name.ilike.%suta%,name.ilike.%labor%,name.ilike.%personnel%,name.ilike.%benefit%,name.ilike.%workers comp%,name.ilike.%employee%")
        .range(from, to)),
    paginatedQuery<{ id: string; entry_number: string; entry_date: string; description: string; reference: string | null; status: string }>((from, to) =>
      supabase.from("journal_entries").select("id, entry_number, entry_date, description, reference, status")
        .eq("company_id", companyId).eq("status", "posted")
        .or("reference.like.payroll_run:%,reference.like.payroll:%,reference.like.labor:%").range(from, to)),
    paginatedQuery<{ id: string; period_start: string; period_end: string; pay_date: string | null; status: string; total_gross: number; total_net: number; total_employer_taxes: number; employee_count: number }>((from, to) =>
      supabase.from("payroll_runs").select("id, period_start, period_end, pay_date, status, total_gross, total_net, total_employer_taxes, employee_count")
        .eq("company_id", companyId).in("status", ["approved", "paid"])
        .order("pay_date", { ascending: false }).range(from, to)),
    paginatedQuery<{ id: string; invoice_number: string; invoice_date: string; total_amount: number; vendor_name: string | null; status: string }>((from, to) =>
      supabase.from("invoices").select("id, invoice_number, invoice_date, total_amount, vendor_name, status")
        .eq("company_id", companyId).eq("invoice_type", "payable").neq("status", "voided")
        .order("invoice_date", { ascending: false }).range(from, to)),
  ]);

  const payrollAcctIds = payrollAccounts.map((a) => a.id);
  const payrollJeIds = payrollJEs.map((j) => j.id);

  // Phase 2: Dependent queries in parallel
  const [jeLinesByAcct, jeLinesByRef, prJeMap, invJeMap] = await Promise.all([
    payrollAcctIds.length > 0
      ? paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }>((from, to) =>
          supabase.from("journal_entry_lines")
            .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
            .eq("company_id", companyId).in("account_id", payrollAcctIds).range(from, to))
      : Promise.resolve([] as { id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }[]),
    payrollJeIds.length > 0
      ? paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }>((from, to) =>
          supabase.from("journal_entry_lines")
            .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
            .eq("company_id", companyId).in("journal_entry_id", payrollJeIds).range(from, to))
      : Promise.resolve([] as { id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }[]),
    getJEMap(supabase, companyId, payrollRuns.map((r) => `payroll_run:${r.id}`)),
    getJEMap(supabase, companyId, contractorInvoices.map((i) => `invoice:${i.id}`)),
  ]);

  // Process payroll account JE lines
  for (const line of jeLinesByAcct as JELineRow[]) {
    const txn = mapJELine(line);
    if (txn) txns.push(txn);
  }

  // Process payroll reference JE lines (dedup against account lines)
  const seenJeLineIds = new Set(txns.map((t) => t.id));
  for (const line of jeLinesByRef as JELineRow[]) {
    const lineId = `jel-${line.id}`;
    if (seenJeLineIds.has(lineId)) continue;
    const txn = mapJELine(line);
    if (txn) { txns.push(txn); seenJeLineIds.add(lineId); }
  }

  // Process payroll runs
  for (const run of payrollRuns) {
    const je = prJeMap.get(`payroll_run:${run.id}`);
    const gross = Number(run.total_gross) || 0;
    const employerTaxes = Number(run.total_employer_taxes) || 0;
    const net = Number(run.total_net) || 0;
    txns.push({
      id: `pr-${run.id}`,
      date: run.pay_date ?? run.period_end,
      description: `Payroll ${run.period_start} to ${run.period_end} (${run.employee_count} employees)`,
      reference: `PR-${run.id.substring(0, 8)}`,
      source: "Payroll", sourceHref: "/people/labor",
      debit: gross + employerTaxes, credit: net,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // Process contractor invoices
  for (const inv of contractorInvoices) {
    const je = invJeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Vendor Invoices", sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0, credit: 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// EQUIPMENT: JE lines (fixed assets), purchases, maintenance logs
// ---------------------------------------------------------------------------

export async function getEquipmentTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Phase 1: All independent queries in parallel
  const [fixedAssetAccounts, equipment, maintLogs, equipInvoices] = await Promise.all([
    paginatedQuery<{ id: string }>((from, to) =>
      supabase.from("chart_of_accounts").select("id")
        .eq("company_id", companyId).eq("is_active", true)
        .or("sub_type.eq.fixed_asset,name.ilike.%equipment%,name.ilike.%depreciation%")
        .range(from, to)),
    paginatedQuery<{ id: string; name: string; purchase_cost: number; hourly_rate: number | null; status: string; purchase_date: string | null }>((from, to) =>
      supabase.from("equipment").select("id, name, purchase_cost, hourly_rate, status, purchase_date")
        .eq("company_id", companyId).not("purchase_cost", "is", null).gt("purchase_cost", 0)
        .order("purchase_date", { ascending: false }).range(from, to)),
    paginatedQuery<{ id: string; description: string | null; cost: number; maintenance_date: string; equipment_id: string; equipment: unknown }>((from, to) =>
      supabase.from("equipment_maintenance_logs").select("id, description, cost, maintenance_date, equipment_id, equipment(name)")
        .eq("company_id", companyId).not("cost", "is", null).gt("cost", 0)
        .order("maintenance_date", { ascending: false }).range(from, to)),
    paginatedQuery<{ id: string; invoice_number: string; invoice_date: string; total_amount: number; vendor_name: string | null; status: string }>((from, to) =>
      supabase.from("invoices").select("id, invoice_number, invoice_date, total_amount, vendor_name, status")
        .eq("company_id", companyId).eq("invoice_type", "payable").neq("status", "voided")
        .or("notes.ilike.%equipment%,notes.ilike.%maintenance%,notes.ilike.%repair%,notes.ilike.%rental%")
        .order("invoice_date", { ascending: false }).range(from, to)),
  ]);

  const accountIds = fixedAssetAccounts.map((a) => a.id);

  // Build all JE reference keys for batch lookup
  const allJeRefs = [
    ...equipment.map((e) => `equipment_purchase:${e.id}`),
    ...maintLogs.map((m) => `equip_maintenance:${m.id}`),
    ...equipInvoices.map((i) => `invoice:${i.id}`),
  ];

  // Phase 2: Dependent queries in parallel
  const [equipJeLines, jeMap] = await Promise.all([
    accountIds.length > 0
      ? paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }>((from, to) =>
          supabase.from("journal_entry_lines")
            .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
            .eq("company_id", companyId).in("account_id", accountIds).range(from, to))
      : Promise.resolve([] as { id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }[]),
    getJEMap(supabase, companyId, allJeRefs),
  ]);

  // Process JE lines
  for (const line of equipJeLines as JELineRow[]) {
    const txn = mapJELine(line);
    if (txn) txns.push(txn);
  }

  // Process equipment purchases
  for (const eq of equipment) {
    const cost = Number(eq.purchase_cost) || 0;
    const je = jeMap.get(`equipment_purchase:${eq.id}`);
    txns.push({
      id: `equip-${eq.id}`,
      date: eq.purchase_date ?? new Date().toISOString().split("T")[0],
      description: `Equipment Purchase — ${eq.name}`,
      reference: "", source: "Equipment", sourceHref: "/equipment",
      debit: cost, credit: 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // Process maintenance logs
  for (const log of maintLogs) {
    const equipName = (log.equipment as unknown as { name: string } | null)?.name ?? "Equipment";
    const je = jeMap.get(`equip_maintenance:${log.id}`);
    txns.push({
      id: `emaint-${log.id}`,
      date: log.maintenance_date,
      description: `Maintenance — ${equipName}: ${log.description || "Service"}`,
      reference: "", source: "Maintenance", sourceHref: "/equipment",
      debit: Number(log.cost) || 0, credit: 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  // Process equipment invoices
  for (const inv of equipInvoices) {
    const je = jeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Invoices", sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0, credit: 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// SAFETY: JE lines (safety accounts), invoices, inspections
// ---------------------------------------------------------------------------

export async function getSafetyTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Phase 1: Independent queries in parallel
  const [safetyAccounts, invoices] = await Promise.all([
    paginatedQuery<{ id: string }>((from, to) =>
      supabase.from("chart_of_accounts").select("id")
        .eq("company_id", companyId).eq("is_active", true)
        .or("name.ilike.%safety%,name.ilike.%training%,name.ilike.%ppe%,name.ilike.%osha%,name.ilike.%insurance%,name.ilike.%workers comp%,name.ilike.%liability%,name.ilike.%incident%,name.ilike.%compliance%,name.ilike.%hazard%,name.ilike.%fire%,name.ilike.%environmental%,name.ilike.%protection%")
        .range(from, to)),
    paginatedQuery<{ id: string; invoice_number: string; invoice_date: string; total_amount: number; vendor_name: string | null; status: string }>((from, to) =>
      supabase.from("invoices").select("id, invoice_number, invoice_date, total_amount, vendor_name, status")
        .eq("company_id", companyId).eq("invoice_type", "payable").neq("status", "voided")
        .or("notes.ilike.%safety%,notes.ilike.%training%,notes.ilike.%ppe%,notes.ilike.%osha%,notes.ilike.%inspection%,notes.ilike.%workers comp%,notes.ilike.%hazard%,notes.ilike.%compliance%,notes.ilike.%fire%,notes.ilike.%environmental%")
        .order("invoice_date", { ascending: false }).range(from, to)),
  ]);

  const safetyAcctIds = safetyAccounts.map((a) => a.id);

  // Phase 2: Dependent queries in parallel
  const [safetyJeLines, jeMap] = await Promise.all([
    safetyAcctIds.length > 0
      ? paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }>((from, to) =>
          supabase.from("journal_entry_lines")
            .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
            .eq("company_id", companyId).in("account_id", safetyAcctIds).range(from, to))
      : Promise.resolve([] as { id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }[]),
    getJEMap(supabase, companyId, invoices.map((i) => `invoice:${i.id}`)),
  ]);

  for (const line of safetyJeLines as JELineRow[]) {
    const txn = mapJELine(line);
    if (txn) txns.push(txn);
  }

  for (const inv of invoices) {
    const je = jeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Invoices", sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0, credit: 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// DOCUMENTS: JE lines (document accounts), invoices
// ---------------------------------------------------------------------------

export async function getDocumentTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // Phase 1: Independent queries in parallel
  const [docAccounts, invoices] = await Promise.all([
    paginatedQuery<{ id: string }>((from, to) =>
      supabase.from("chart_of_accounts").select("id")
        .eq("company_id", companyId).eq("is_active", true)
        .or("name.ilike.%printing%,name.ilike.%document%,name.ilike.%blueprint%,name.ilike.%office supplies%")
        .range(from, to)),
    paginatedQuery<{ id: string; invoice_number: string; invoice_date: string; total_amount: number; vendor_name: string | null; status: string }>((from, to) =>
      supabase.from("invoices").select("id, invoice_number, invoice_date, total_amount, vendor_name, status")
        .eq("company_id", companyId).eq("invoice_type", "payable").neq("status", "voided")
        .or("notes.ilike.%printing%,notes.ilike.%document%,notes.ilike.%blueprint%,notes.ilike.%scanning%,notes.ilike.%storage%")
        .order("invoice_date", { ascending: false }).range(from, to)),
  ]);

  const docAcctIds = docAccounts.map((a) => a.id);

  // Phase 2: Dependent queries in parallel
  const [docJeLines, jeMap] = await Promise.all([
    docAcctIds.length > 0
      ? paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }>((from, to) =>
          supabase.from("journal_entry_lines")
            .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
            .eq("company_id", companyId).in("account_id", docAcctIds).range(from, to))
      : Promise.resolve([] as { id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }[]),
    getJEMap(supabase, companyId, invoices.map((i) => `invoice:${i.id}`)),
  ]);

  for (const line of docJeLines as JELineRow[]) {
    const txn = mapJELine(line);
    if (txn) txns.push(txn);
  }

  for (const inv of invoices) {
    const je = jeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.vendor_name ?? "Vendor"}`,
      reference: inv.invoice_number,
      source: "Invoices", sourceHref: `/financial/invoices/${inv.id}`,
      debit: Number(inv.total_amount) || 0, credit: 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}

// ---------------------------------------------------------------------------
// CRM: opportunities, bids, related invoices
// ---------------------------------------------------------------------------

export async function getCRMTransactions(
  supabase: SupabaseClient,
  companyId: string
): Promise<SectionTransactionSummary> {
  const txns: SectionTransaction[] = [];

  // CRM transactions: only actual invoiced revenue (not forecasts/estimates)
  // Won opportunities and bids are informational forecasts, not GL entries.

  // Phase 1: Both independent queries in parallel
  const [crmJeLines, clientInvoices] = await Promise.all([
    paginatedQuery<{ id: string; debit: number | null; credit: number | null; description: string | null; journal_entries: unknown }>((from, to) =>
      supabase.from("journal_entry_lines")
        .select("id, debit, credit, description, journal_entries(id, entry_number, entry_date, description, reference, status)")
        .eq("company_id", companyId).range(from, to)),
    paginatedQuery<{ id: string; invoice_number: string; invoice_date: string; total_amount: number; client_name: string | null; status: string }>((from, to) =>
      supabase.from("invoices")
        .select("id, invoice_number, invoice_date, total_amount, client_name, status")
        .eq("company_id", companyId).eq("invoice_type", "receivable").neq("status", "voided")
        .order("invoice_date", { ascending: false }).range(from, to)),
  ]);

  // Phase 2: JE map lookup (depends on invoices result)
  const invJeMap = await getJEMap(supabase, companyId, clientInvoices.map((i) => `invoice:${i.id}`));

  // Process JE lines — filter to only invoice JEs
  for (const line of crmJeLines as JELineRow[]) {
    const je = line.journal_entries as unknown as JEParsed | null;
    if (!je || je.status !== "posted") continue;
    const ref = je.reference ?? "";
    if (!ref.startsWith("invoice:")) continue;

    const invId = ref.replace("invoice:", "");
    const txn = mapJELine(line);
    if (txn) {
      txn.source = "Client Invoice JE";
      txn.sourceHref = `/financial/invoices/${invId}`;
      txns.push(txn);
    }
  }

  // Process client invoices
  for (const inv of clientInvoices) {
    const je = invJeMap.get(`invoice:${inv.id}`);
    txns.push({
      id: `inv-${inv.id}`,
      date: inv.invoice_date,
      description: `${inv.invoice_number} — ${inv.client_name ?? "Client"}`,
      reference: inv.invoice_number,
      source: "Client Invoices", sourceHref: `/financial/invoices/${inv.id}`,
      debit: 0, credit: Number(inv.total_amount) || 0,
      jeNumber: je?.entry_number ?? null, jeId: je?.id ?? null,
    });
  }

  return buildSummary(txns);
}
