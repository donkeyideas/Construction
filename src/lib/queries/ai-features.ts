import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIUsageLogRow } from "./ai";

/* ------------------------------------------------------------------
   Pagination helper — Supabase defaults to returning max 1000 rows.
   This fetches ALL rows by paginating through the full result set.
   ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function paginatedQuery<T = Record<string, unknown>>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data } = await queryFn(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/* ==================================================================
   Types
   ================================================================== */

export interface ProjectPredictionRow {
  id: string;
  name: string;
  code: string;
  status: string;
  contract_amount: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  completion_pct: number;
  start_date: string | null;
  estimated_end_date: string | null;
}

export interface SafetyRiskData {
  incidentCount: number;
  severeIncidentCount: number;
  avgInspectionScore: number | null;
  certGapCount: number;
  daysSinceLastIncident: number | null;
  projectCount: number;
}

export interface EquipmentPredictionRow {
  id: string;
  name: string;
  equipment_type: string;
  purchase_date: string | null;
  purchase_cost: number | null;
  hourly_rate: number | null;
  status: string;
  next_maintenance_date: string | null;
  ageMonths: number | null;
  daysSinceLastService: number | null;
}

export interface AnomalyDetectionData {
  invoicesWithoutJEs: { id: string; invoice_number: string; total_amount: number; invoice_date: string; vendor_name: string | null }[];
  budgetOverruns: { id: string; project_id: string; project_name: string | null; csi_code: string; description: string; budgeted_amount: number; actual_amount: number; pctUsed: number }[];
  unpostedJEs: { id: string; entry_number: string; entry_date: string; description: string; created_at: string }[];
  expiringCerts: { id: string; cert_name: string; expiry_date: string; contact_id: string; contact_name: string | null }[];
  overdueRFIs: { id: string; rfi_number: string; subject: string; status: string; created_at: string; project_id: string | null }[];
  pendingChangeOrders: { id: string; co_number: string; title: string; amount: number; created_at: string; project_id: string | null }[];
  overdueEquipment: { id: string; name: string; equipment_type: string; next_maintenance_date: string }[];
  overdueTasks: { id: string; name: string; status: string; end_date: string; project_id: string; project_name: string | null }[];
}

export interface VendorPerformanceData {
  vendor: { id: string; name: string; company_name: string | null; contact_type: string } | null;
  totalInvoices: number;
  paidOnTimeCount: number;
  totalInvoiceAmount: number;
  changeOrders: { id: string; co_number: string; title: string; amount: number; status: string }[];
  safetyIncidentCount: number;
}

export interface AgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
}

export interface CashFlowForecastData {
  currentCash: number;
  arAging: AgingBuckets;
  apAging: AgingBuckets;
  monthlyBurnRate: number;
}

export interface BidAnalysisData {
  totalBids: number;
  wonBids: number;
  lostBids: number;
  avgBidAmount: number;
  avgWinAmount: number;
}

export interface ChangeOrderImpactData {
  project: {
    id: string;
    name: string;
    contract_amount: number | null;
    estimated_cost: number | null;
    actual_cost: number | null;
    completion_pct: number;
  } | null;
  changeOrders: {
    id: string;
    co_number: string;
    title: string;
    status: string;
    amount: number;
    schedule_impact_days: number | null;
    created_at: string;
  }[];
  totalApprovedAmount: number;
}

export interface AIUsageDailyTotal {
  date: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
}

export interface AIUsageProviderBreakdown {
  provider: string;
  model: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
}

export interface AIUsageDetails {
  logs: AIUsageLogRow[];
  dailyTotals: AIUsageDailyTotal[];
  providerBreakdown: AIUsageProviderBreakdown[];
}

/* ==================================================================
   1. getProjectPredictionData
   ================================================================== */

export async function getProjectPredictionData(
  supabase: SupabaseClient,
  companyId: string
): Promise<ProjectPredictionRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, estimated_end_date")
    .eq("company_id", companyId)
    .in("status", ["active", "in_progress"]);

  if (error) {
    console.error("getProjectPredictionData error:", error);
    return [];
  }

  return (data ?? []) as ProjectPredictionRow[];
}

/* ==================================================================
   2. getSafetyRiskData
   ================================================================== */

export async function getSafetyRiskData(
  supabase: SupabaseClient,
  companyId: string
): Promise<SafetyRiskData> {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    incidentsRes,
    severeRes,
    lastIncidentRes,
    inspectionsRes,
    certsRes,
    projectsRes,
  ] = await Promise.all([
    // Total incidents
    supabase
      .from("safety_incidents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),

    // Severe incidents (critical + major)
    supabase
      .from("safety_incidents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("severity", ["critical", "major"]),

    // Most recent incident for recency calc
    supabase
      .from("safety_incidents")
      .select("created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1),

    // Inspection scores — fetch all to compute average
    supabase
      .from("safety_inspections")
      .select("score")
      .eq("company_id", companyId)
      .not("score", "is", null),

    // Certifications expiring within 30 days
    supabase
      .from("certifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .not("expiry_date", "is", null)
      .lte("expiry_date", thirtyDaysFromNow),

    // Active projects count
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", ["active", "in_progress"]),
  ]);

  // Calculate average inspection score
  let avgInspectionScore: number | null = null;
  const scores = (inspectionsRes.data ?? []) as { score: number }[];
  if (scores.length > 0) {
    const total = scores.reduce((sum, s) => sum + (s.score ?? 0), 0);
    avgInspectionScore = Math.round((total / scores.length) * 10) / 10;
  }

  // Calculate days since last incident
  let daysSinceLastIncident: number | null = null;
  const lastIncidents = lastIncidentRes.data ?? [];
  if (lastIncidents.length > 0 && lastIncidents[0].created_at) {
    const lastDate = new Date(lastIncidents[0].created_at);
    const now = new Date();
    daysSinceLastIncident = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    incidentCount: incidentsRes.count ?? 0,
    severeIncidentCount: severeRes.count ?? 0,
    avgInspectionScore,
    certGapCount: certsRes.count ?? 0,
    daysSinceLastIncident,
    projectCount: projectsRes.count ?? 0,
  };
}

/* ==================================================================
   3. getEquipmentPredictionData
   ================================================================== */

export async function getEquipmentPredictionData(
  supabase: SupabaseClient,
  companyId: string
): Promise<EquipmentPredictionRow[]> {
  const today = new Date();

  // Fetch equipment
  const { data: equipment, error: eqError } = await supabase
    .from("equipment")
    .select("id, name, equipment_type, purchase_date, purchase_cost, hourly_rate, status, next_maintenance_date")
    .eq("company_id", companyId);

  if (eqError) {
    console.error("getEquipmentPredictionData error:", eqError);
    return [];
  }

  if (!equipment || equipment.length === 0) return [];

  // Fetch most recent maintenance per equipment_id
  const { data: maintenance } = await supabase
    .from("equipment_maintenance")
    .select("equipment_id, service_date")
    .eq("company_id", companyId)
    .order("service_date", { ascending: false });

  // Build a map: equipment_id -> most recent service_date
  const lastServiceMap = new Map<string, string>();
  for (const m of maintenance ?? []) {
    if (!lastServiceMap.has(m.equipment_id)) {
      lastServiceMap.set(m.equipment_id, m.service_date);
    }
  }

  return equipment.map((eq) => {
    // Calculate age in months from purchase_date
    let ageMonths: number | null = null;
    if (eq.purchase_date) {
      const purchaseDate = new Date(eq.purchase_date);
      ageMonths =
        (today.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (today.getMonth() - purchaseDate.getMonth());
    }

    // Calculate days since last service
    let daysSinceLastService: number | null = null;
    const lastService = lastServiceMap.get(eq.id);
    if (lastService) {
      const serviceDate = new Date(lastService);
      daysSinceLastService = Math.floor(
        (today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      id: eq.id,
      name: eq.name,
      equipment_type: eq.equipment_type,
      purchase_date: eq.purchase_date,
      purchase_cost: eq.purchase_cost,
      hourly_rate: eq.hourly_rate,
      status: eq.status,
      next_maintenance_date: eq.next_maintenance_date,
      ageMonths,
      daysSinceLastService,
    };
  });
}

/* ==================================================================
   4. getAnomalyDetectionData
   ================================================================== */

export async function getAnomalyDetectionData(
  supabase: SupabaseClient,
  companyId: string
): Promise<AnomalyDetectionData> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    invoicesRes,
    jeRefsRes,
    budgetRes,
    unpostedJEsRes,
    expiringCertsRes,
    overdueRFIsRes,
    pendingCOsRes,
    overdueEquipRes,
    overdueTasksRes,
  ] = await Promise.all([
    // (a) All invoices to check for missing JEs
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, invoice_date, vendor_name")
      .eq("company_id", companyId)
      .not("status", "eq", "voided"),

    // Fetch all JE references that match invoice pattern to find which invoices have JEs
    supabase
      .from("journal_entries")
      .select("reference")
      .eq("company_id", companyId)
      .like("reference", "invoice:%"),

    // (b) Budget lines >90% spent — join with projects for name
    supabase
      .from("project_budget_lines")
      .select("id, project_id, csi_code, description, budgeted_amount, actual_amount, projects(name)")
      .eq("company_id", companyId)
      .gt("budgeted_amount", 0),

    // (c) Unposted JEs older than 7 days
    supabase
      .from("journal_entries")
      .select("id, entry_number, entry_date, description, created_at")
      .eq("company_id", companyId)
      .eq("status", "draft")
      .lt("created_at", sevenDaysAgo),

    // (d) Expiring certifications within 30 days, join user_profiles via contact
    supabase
      .from("certifications")
      .select("id, cert_name, expiry_date, contact_id, contacts(first_name, last_name)")
      .eq("company_id", companyId)
      .not("expiry_date", "is", null)
      .gte("expiry_date", today)
      .lte("expiry_date", thirtyDaysFromNow),

    // (e) Overdue RFIs: open and older than 7 days
    supabase
      .from("rfis")
      .select("id, rfi_number, subject, status, created_at, project_id")
      .eq("company_id", companyId)
      .eq("status", "open")
      .lt("created_at", sevenDaysAgo),

    // (f) Pending change orders >14 days
    supabase
      .from("change_orders")
      .select("id, co_number, title, amount, created_at, project_id")
      .eq("company_id", companyId)
      .in("status", ["pending", "submitted"])
      .lt("created_at", fourteenDaysAgo),

    // (g) Overdue equipment maintenance
    supabase
      .from("equipment")
      .select("id, name, equipment_type, next_maintenance_date")
      .eq("company_id", companyId)
      .not("next_maintenance_date", "is", null)
      .lt("next_maintenance_date", today),

    // (h) Overdue tasks — not completed and past end_date, join projects
    supabase
      .from("project_tasks")
      .select("id, name, status, end_date, project_id, projects(name)")
      .eq("company_id", companyId)
      .neq("status", "completed")
      .not("end_date", "is", null)
      .lt("end_date", today),
  ]);

  // --- (a) Invoices without journal entries ---
  const invoiceIdsWithJEs = new Set<string>();
  for (const je of jeRefsRes.data ?? []) {
    // reference format is "invoice:{uuid}"
    const ref = je.reference as string;
    if (ref && ref.startsWith("invoice:")) {
      invoiceIdsWithJEs.add(ref.substring(8));
    }
  }
  const invoicesWithoutJEs = (invoicesRes.data ?? [])
    .filter((inv) => !invoiceIdsWithJEs.has(inv.id))
    .map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      total_amount: inv.total_amount ?? 0,
      invoice_date: inv.invoice_date,
      vendor_name: inv.vendor_name,
    }));

  // --- (b) Budget lines >90% spent ---
  const budgetOverruns = (budgetRes.data ?? [])
    .filter((bl) => {
      const budgeted = bl.budgeted_amount ?? 0;
      const actual = bl.actual_amount ?? 0;
      return budgeted > 0 && actual / budgeted > 0.9;
    })
    .map((bl) => {
      const project = bl.projects as unknown as { name: string } | null;
      return {
        id: bl.id,
        project_id: bl.project_id,
        project_name: project?.name ?? null,
        csi_code: bl.csi_code,
        description: bl.description,
        budgeted_amount: bl.budgeted_amount ?? 0,
        actual_amount: bl.actual_amount ?? 0,
        pctUsed: bl.budgeted_amount ? Math.round(((bl.actual_amount ?? 0) / bl.budgeted_amount) * 100) : 0,
      };
    });

  // --- (c) Unposted JEs ---
  const unpostedJEs = (unpostedJEsRes.data ?? []).map((je) => ({
    id: je.id,
    entry_number: je.entry_number,
    entry_date: je.entry_date,
    description: je.description ?? "",
    created_at: je.created_at,
  }));

  // --- (d) Expiring certs ---
  const expiringCerts = (expiringCertsRes.data ?? []).map((c) => {
    const contact = c.contacts as unknown as { first_name: string; last_name: string } | null;
    return {
      id: c.id,
      cert_name: c.cert_name,
      expiry_date: c.expiry_date,
      contact_id: c.contact_id,
      contact_name: contact ? `${contact.first_name} ${contact.last_name}`.trim() : null,
    };
  });

  // --- (e) Overdue RFIs ---
  const overdueRFIs = (overdueRFIsRes.data ?? []).map((r) => ({
    id: r.id,
    rfi_number: r.rfi_number ?? "",
    subject: r.subject ?? "",
    status: r.status,
    created_at: r.created_at,
    project_id: r.project_id,
  }));

  // --- (f) Pending change orders ---
  const pendingChangeOrders = (pendingCOsRes.data ?? []).map((co) => ({
    id: co.id,
    co_number: co.co_number ?? "",
    title: co.title ?? "",
    amount: co.amount ?? 0,
    created_at: co.created_at,
    project_id: co.project_id,
  }));

  // --- (g) Overdue equipment maintenance ---
  const overdueEquipment = (overdueEquipRes.data ?? []).map((eq) => ({
    id: eq.id,
    name: eq.name,
    equipment_type: eq.equipment_type,
    next_maintenance_date: eq.next_maintenance_date,
  }));

  // --- (h) Overdue tasks ---
  const overdueTasks = (overdueTasksRes.data ?? []).map((t) => {
    const project = t.projects as unknown as { name: string } | null;
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      end_date: t.end_date,
      project_id: t.project_id,
      project_name: project?.name ?? null,
    };
  });

  return {
    invoicesWithoutJEs,
    budgetOverruns,
    unpostedJEs,
    expiringCerts,
    overdueRFIs,
    pendingChangeOrders,
    overdueEquipment,
    overdueTasks,
  };
}

/* ==================================================================
   5. getVendorPerformanceData
   ================================================================== */

export async function getVendorPerformanceData(
  supabase: SupabaseClient,
  companyId: string,
  vendorId: string
): Promise<VendorPerformanceData> {
  const empty: VendorPerformanceData = {
    vendor: null,
    totalInvoices: 0,
    paidOnTimeCount: 0,
    totalInvoiceAmount: 0,
    changeOrders: [],
    safetyIncidentCount: 0,
  };

  // Fetch vendor contact info
  const { data: vendor, error: vendorError } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, company_name, contact_type")
    .eq("id", vendorId)
    .eq("company_id", companyId)
    .single();

  if (vendorError || !vendor) {
    console.error("getVendorPerformanceData: vendor not found", vendorError);
    return empty;
  }

  const vendorName = `${vendor.first_name ?? ""} ${vendor.last_name ?? ""}`.trim();
  const vendorCompany = vendor.company_name;

  // Build a name matcher: invoices use vendor_name (string), not a foreign key.
  // We match on company_name or full name.
  const namePatterns: string[] = [];
  if (vendorCompany) namePatterns.push(vendorCompany);
  if (vendorName) namePatterns.push(vendorName);

  // Fetch invoices matching this vendor by name
  let invoices: { id: string; total_amount: number; due_date: string; status: string }[] = [];
  if (namePatterns.length > 0) {
    // Build OR filter for vendor_name matching
    const orClauses = namePatterns.map((n) => `vendor_name.ilike.%${n}%`).join(",");
    const { data: invData } = await supabase
      .from("invoices")
      .select("id, total_amount, due_date, status")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .or(orClauses);

    invoices = invData ?? [];
  }

  // Check which invoices were paid on time via payments table
  let paidOnTimeCount = 0;
  if (invoices.length > 0) {
    const invoiceIds = invoices.map((inv) => inv.id);

    // Batch in chunks to avoid URL length limits
    const BATCH_SIZE = 100;
    const allPayments: { invoice_id: string; payment_date: string }[] = [];
    for (let i = 0; i < invoiceIds.length; i += BATCH_SIZE) {
      const batch = invoiceIds.slice(i, i + BATCH_SIZE);
      const { data: pmts } = await supabase
        .from("payments")
        .select("invoice_id, payment_date")
        .in("invoice_id", batch);
      allPayments.push(...(pmts ?? []));
    }

    // Build map of earliest payment per invoice
    const paymentMap = new Map<string, string>();
    for (const p of allPayments) {
      const existing = paymentMap.get(p.invoice_id);
      if (!existing || p.payment_date < existing) {
        paymentMap.set(p.invoice_id, p.payment_date);
      }
    }

    for (const inv of invoices) {
      const payDate = paymentMap.get(inv.id);
      if (payDate && inv.due_date && payDate <= inv.due_date) {
        paidOnTimeCount++;
      }
    }
  }

  const totalInvoiceAmount = invoices.reduce(
    (sum, inv) => sum + (inv.total_amount ?? 0),
    0
  );

  // Change orders — match by vendor name in title/description (best effort)
  // or fetch all COs for projects where this vendor has invoices
  const projectIds = new Set<string>();
  if (invoices.length > 0) {
    // Get project_ids from vendor invoices
    const { data: invProjects } = await supabase
      .from("invoices")
      .select("project_id")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .not("project_id", "is", null)
      .or(namePatterns.map((n) => `vendor_name.ilike.%${n}%`).join(","));

    for (const ip of invProjects ?? []) {
      if (ip.project_id) projectIds.add(ip.project_id);
    }
  }

  let changeOrders: { id: string; co_number: string; title: string; amount: number; status: string }[] = [];
  if (projectIds.size > 0) {
    const { data: coData } = await supabase
      .from("change_orders")
      .select("id, co_number, title, amount, status")
      .eq("company_id", companyId)
      .in("project_id", Array.from(projectIds));

    changeOrders = (coData ?? []).map((co) => ({
      id: co.id,
      co_number: co.co_number ?? "",
      title: co.title ?? "",
      amount: co.amount ?? 0,
      status: co.status ?? "",
    }));
  }

  // Safety incidents on vendor's projects
  let safetyIncidentCount = 0;
  if (projectIds.size > 0) {
    const { count } = await supabase
      .from("safety_incidents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("project_id", Array.from(projectIds));
    safetyIncidentCount = count ?? 0;
  }

  return {
    vendor: {
      id: vendor.id,
      name: vendorCompany || vendorName,
      company_name: vendorCompany,
      contact_type: vendor.contact_type,
    },
    totalInvoices: invoices.length,
    paidOnTimeCount,
    totalInvoiceAmount,
    changeOrders,
    safetyIncidentCount,
  };
}

/* ==================================================================
   6. getCashFlowForecastData
   ================================================================== */

export async function getCashFlowForecastData(
  supabase: SupabaseClient,
  companyId: string
): Promise<CashFlowForecastData> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const defaultResult: CashFlowForecastData = {
    currentCash: 0,
    arAging: { current: 0, days30: 0, days60: 0, days90plus: 0 },
    apAging: { current: 0, days30: 0, days60: 0, days90plus: 0 },
    monthlyBurnRate: 0,
  };

  // --- Current cash ---
  const { data: bankAccounts, error: bankError } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (bankError) {
    console.error("getCashFlowForecastData bank error:", bankError);
  }

  const currentCash = (bankAccounts ?? []).reduce(
    (sum, ba) => sum + (ba.current_balance ?? 0),
    0
  );

  // --- AR Aging: receivable invoices not fully paid ---
  const { data: arInvoices } = await supabase
    .from("invoices")
    .select("due_date, balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .in("status", ["pending", "approved", "sent", "overdue", "partial"])
    .gt("balance_due", 0);

  const arAging = bucketByAge(arInvoices ?? [], now);

  // --- AP Aging: payable invoices not fully paid ---
  const { data: apInvoices } = await supabase
    .from("invoices")
    .select("due_date, balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .in("status", ["pending", "approved", "received", "overdue", "partial"])
    .gt("balance_due", 0);

  const apAging = bucketByAge(apInvoices ?? [], now);

  // --- Monthly burn rate: average of last 3 months expense JE lines ---
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

  // Get expense account IDs
  const { data: expenseAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_type", "expense")
    .eq("is_active", true);

  let monthlyBurnRate = 0;
  if (expenseAccounts && expenseAccounts.length > 0) {
    const expenseAccountIds = expenseAccounts.map((a) => a.id);

    // Paginated query for expense JE lines over last 3 months
    const expenseLines = await paginatedQuery<{
      debit: number;
      credit: number;
    }>((from, to) =>
      supabase
        .from("journal_entry_lines")
        .select("debit, credit, journal_entries!inner(status, entry_date)")
        .eq("company_id", companyId)
        .in("account_id", expenseAccountIds)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", threeMonthsAgoStr)
        .lte("journal_entries.entry_date", today)
        .range(from, to)
    );

    // Sum debits (expense normal balance is debit)
    const totalExpenses = expenseLines.reduce(
      (sum, line) => sum + ((line.debit ?? 0) - (line.credit ?? 0)),
      0
    );
    monthlyBurnRate = Math.round((totalExpenses / 3) * 100) / 100;
  }

  return {
    currentCash,
    arAging,
    apAging,
    monthlyBurnRate,
  };
}

/** Helper: bucket invoices by days overdue from due_date */
function bucketByAge(
  invoices: { due_date: string; balance_due: number }[],
  referenceDate: Date
): AgingBuckets {
  const buckets: AgingBuckets = { current: 0, days30: 0, days60: 0, days90plus: 0 };

  for (const inv of invoices) {
    const balance = inv.balance_due ?? 0;
    if (!inv.due_date) {
      buckets.current += balance;
      continue;
    }

    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor(
      (referenceDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue <= 0) {
      buckets.current += balance;
    } else if (daysOverdue <= 30) {
      buckets.days30 += balance;
    } else if (daysOverdue <= 60) {
      buckets.days60 += balance;
    } else {
      buckets.days90plus += balance;
    }
  }

  return buckets;
}

/* ==================================================================
   7. getBidAnalysisData
   ================================================================== */

export async function getBidAnalysisData(
  supabase: SupabaseClient,
  companyId: string
): Promise<BidAnalysisData> {
  const { data: bids, error } = await supabase
    .from("bids")
    .select("id, status, bid_amount")
    .eq("company_id", companyId);

  if (error) {
    console.error("getBidAnalysisData error:", error);
    return { totalBids: 0, wonBids: 0, lostBids: 0, avgBidAmount: 0, avgWinAmount: 0 };
  }

  const allBids = bids ?? [];
  const totalBids = allBids.length;
  const wonBids = allBids.filter((b) => b.status === "won");
  const lostBids = allBids.filter((b) => b.status === "lost");

  const allAmounts = allBids
    .filter((b) => b.bid_amount != null)
    .map((b) => b.bid_amount as number);
  const winAmounts = wonBids
    .filter((b) => b.bid_amount != null)
    .map((b) => b.bid_amount as number);

  const avgBidAmount =
    allAmounts.length > 0
      ? Math.round(allAmounts.reduce((s, a) => s + a, 0) / allAmounts.length)
      : 0;

  const avgWinAmount =
    winAmounts.length > 0
      ? Math.round(winAmounts.reduce((s, a) => s + a, 0) / winAmounts.length)
      : 0;

  return {
    totalBids,
    wonBids: wonBids.length,
    lostBids: lostBids.length,
    avgBidAmount,
    avgWinAmount,
  };
}

/* ==================================================================
   8. getChangeOrderImpactData
   ================================================================== */

export async function getChangeOrderImpactData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string
): Promise<ChangeOrderImpactData> {
  const [projectRes, cosRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, contract_amount, estimated_cost, actual_cost, completion_pct")
      .eq("company_id", companyId)
      .eq("id", projectId)
      .single(),
    supabase
      .from("change_orders")
      .select("id, co_number, title, status, amount, schedule_impact_days, created_at")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  const project = projectRes.data
    ? {
        id: projectRes.data.id,
        name: projectRes.data.name,
        contract_amount: projectRes.data.contract_amount,
        estimated_cost: projectRes.data.estimated_cost,
        actual_cost: projectRes.data.actual_cost,
        completion_pct: projectRes.data.completion_pct ?? 0,
      }
    : null;

  const changeOrders = (cosRes.data ?? []).map((co) => ({
    id: co.id,
    co_number: co.co_number ?? "",
    title: co.title ?? "",
    status: co.status ?? "",
    amount: co.amount ?? 0,
    schedule_impact_days: co.schedule_impact_days ?? null,
    created_at: co.created_at,
  }));

  const totalApprovedAmount = changeOrders
    .filter((co) => co.status === "approved")
    .reduce((sum, co) => sum + co.amount, 0);

  return {
    project,
    changeOrders,
    totalApprovedAmount,
  };
}

/* ==================================================================
   9. getAIUsageDetails
   ================================================================== */

export async function getAIUsageDetails(
  supabase: SupabaseClient,
  companyId: string
): Promise<AIUsageDetails> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Fetch all logs for current month with provider info
  const { data: logs, error: logError } = await supabase
    .from("ai_usage_log")
    .select("*, ai_provider_configs(provider_name)")
    .eq("company_id", companyId)
    .gte("created_at", startOfMonth)
    .order("created_at", { ascending: false });

  if (logError) {
    console.error("getAIUsageDetails error:", logError);
    return { logs: [], dailyTotals: [], providerBreakdown: [] };
  }

  const allLogs = (logs ?? []) as (AIUsageLogRow & {
    ai_provider_configs: { provider_name: string } | null;
  })[];

  // --- Daily totals ---
  const dailyMap = new Map<string, AIUsageDailyTotal>();
  for (const log of allLogs) {
    const date = log.created_at.split("T")[0];
    const existing = dailyMap.get(date);
    const tokens = (log.input_tokens ?? 0) + (log.output_tokens ?? 0);
    const cost = Number(log.estimated_cost ?? 0);

    if (existing) {
      existing.totalCost += cost;
      existing.totalTokens += tokens;
      existing.requestCount += 1;
    } else {
      dailyMap.set(date, {
        date,
        totalCost: cost,
        totalTokens: tokens,
        requestCount: 1,
      });
    }
  }

  const dailyTotals = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // --- Provider breakdown ---
  const providerMap = new Map<string, AIUsageProviderBreakdown>();
  for (const log of allLogs) {
    const provider = log.ai_provider_configs?.provider_name ?? "unknown";
    const model = log.model_id ?? "unknown";
    const key = `${provider}:${model}`;
    const tokens = (log.input_tokens ?? 0) + (log.output_tokens ?? 0);
    const cost = Number(log.estimated_cost ?? 0);

    const existing = providerMap.get(key);
    if (existing) {
      existing.totalCost += cost;
      existing.totalTokens += tokens;
      existing.requestCount += 1;
    } else {
      providerMap.set(key, {
        provider,
        model,
        totalCost: cost,
        totalTokens: tokens,
        requestCount: 1,
      });
    }
  }

  const providerBreakdown = Array.from(providerMap.values());

  // Strip the joined provider config from the returned logs to match AIUsageLogRow type
  const cleanLogs: AIUsageLogRow[] = allLogs.map(({ ai_provider_configs, ...rest }) => rest);

  return {
    logs: cleanLogs,
    dailyTotals,
    providerBreakdown,
  };
}
