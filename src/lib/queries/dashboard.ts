import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface DashboardKPIs {
  activeProjectsValue: number;
  cashPosition: number;
  openChangeOrders: number;
  schedulePerformance: number; // average completion_pct of active projects
}

export interface ProjectStatusBreakdown {
  completed: number;
  active: number;
  pre_construction: number;
  on_hold: number;
  closed: number;
  total: number;
}

export interface MonthlyBillingItem {
  month: string; // "Jan", "Feb", etc.
  amount: number;
  yearMonth: string; // "2026-01" for sorting
}

export interface PendingApprovalItem {
  type: "change_order" | "invoice" | "submittal";
  title: string;
  by: string;
  amount: number | null;
  urgency: "high" | "medium" | "low";
  entityId: string;
  createdAt: string;
}

export interface RecentActivityItem {
  user: string;
  action: string;
  ref: string;
  time: string;
  entityType: string | null;
  entityId: string | null;
}

// ---------------------------------------------------------------------------
// KPI Queries
// ---------------------------------------------------------------------------

/**
 * Fetch top-level KPIs for the dashboard.
 */
export async function getDashboardKPIs(
  supabase: SupabaseClient,
  companyId: string
): Promise<DashboardKPIs> {
  // Run all queries concurrently
  const [activeProjectsRes, allActiveRes, changeOrdersRes, bankRes] = await Promise.all([
    // Active + pre_construction for contract value
    supabase
      .from("projects")
      .select("contract_amount, completion_pct, status")
      .eq("company_id", companyId)
      .in("status", ["active", "pre_construction"]),

    // Only 'active' projects for schedule performance (exclude pre_construction which hasn't started)
    supabase
      .from("projects")
      .select("completion_pct")
      .eq("company_id", companyId)
      .eq("status", "active"),

    // Open change orders: status not in ('approved', 'rejected')
    supabase
      .from("change_orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .not("status", "in", '("approved","rejected")'),

    // Cash position: sum of all bank account balances
    supabase
      .from("bank_accounts")
      .select("current_balance")
      .eq("company_id", companyId),
  ]);

  const projects = activeProjectsRes.data ?? [];
  const activeProjectsValue = projects.reduce(
    (sum, p) => sum + (Number(p.contract_amount) || 0),
    0
  );

  // Schedule performance: only active projects (not pre_construction which haven't started)
  const activeOnly = allActiveRes.data ?? [];
  const schedulePerformance =
    activeOnly.length > 0
      ? activeOnly.reduce((sum, p) => sum + (Number(p.completion_pct) || 0), 0) /
        activeOnly.length
      : 0;

  const openChangeOrders = changeOrdersRes.count ?? 0;

  const cashPosition = (bankRes.data ?? []).reduce(
    (sum, b) => sum + (Number(b.current_balance) || 0),
    0
  );

  return {
    activeProjectsValue,
    cashPosition,
    openChangeOrders,
    schedulePerformance,
  };
}

// ---------------------------------------------------------------------------
// Project Status Breakdown (for donut chart)
// ---------------------------------------------------------------------------

export async function getProjectStatusBreakdown(
  supabase: SupabaseClient,
  companyId: string
): Promise<ProjectStatusBreakdown> {
  const { data } = await supabase
    .from("projects")
    .select("status")
    .eq("company_id", companyId);

  const projects = data ?? [];

  const counts: ProjectStatusBreakdown = {
    completed: 0,
    active: 0,
    pre_construction: 0,
    on_hold: 0,
    closed: 0,
    total: projects.length,
  };

  for (const p of projects) {
    const s = p.status as keyof Omit<ProjectStatusBreakdown, "total">;
    if (s in counts) {
      counts[s]++;
    }
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Monthly Billing (bar chart - last 12 months of receivable invoices)
// ---------------------------------------------------------------------------

export async function getMonthlyBilling(
  supabase: SupabaseClient,
  companyId: string
): Promise<MonthlyBillingItem[]> {
  // Build date 12 months ago (first of that month)
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const fromDate = twelveMonthsAgo.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("invoices")
    .select("invoice_date, total_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .gte("invoice_date", fromDate)
    .order("invoice_date", { ascending: true });

  const invoices = data ?? [];

  // Build a map of all 12 months initialized to 0
  const monthMap = new Map<string, number>();
  const monthLabels = new Map<string, string>();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
    monthLabels.set(
      key,
      d.toLocaleDateString("en-US", { month: "short" })
    );
  }

  // Sum invoices into month buckets
  for (const inv of invoices) {
    const d = new Date(inv.invoice_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + (Number(inv.total_amount) || 0));
    }
  }

  const result: MonthlyBillingItem[] = [];
  for (const [yearMonth, amount] of monthMap) {
    result.push({
      month: monthLabels.get(yearMonth) ?? "",
      amount,
      yearMonth,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Pending Approvals
// ---------------------------------------------------------------------------

export async function getPendingApprovals(
  supabase: SupabaseClient,
  companyId: string
): Promise<PendingApprovalItem[]> {
  // Fetch pending change orders, invoices, and submittals in parallel
  const [coRes, invRes, subRes] = await Promise.all([
    supabase
      .from("change_orders")
      .select("id, co_number, title, amount, created_at, requested_by")
      .eq("company_id", companyId)
      .in("status", ["draft", "submitted"])
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("invoices")
      .select("id, invoice_number, vendor_name, client_name, total_amount, created_at, invoice_type")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("submittals")
      .select("id, submittal_number, title, created_at, submitted_by")
      .eq("company_id", companyId)
      .in("status", ["pending", "under_review"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const items: PendingApprovalItem[] = [];

  // Map change orders
  for (const co of coRes.data ?? []) {
    const amt = Number(co.amount) || 0;
    items.push({
      type: "change_order",
      title: `${co.co_number} -- ${co.title}`,
      by: "Change Order",
      amount: amt,
      urgency: amt > 50000 ? "high" : amt > 10000 ? "medium" : "low",
      entityId: co.id,
      createdAt: co.created_at,
    });
  }

  // Map invoices
  for (const inv of invRes.data ?? []) {
    const amt = Number(inv.total_amount) || 0;
    const name =
      inv.invoice_type === "payable"
        ? inv.vendor_name ?? "Vendor"
        : inv.client_name ?? "Client";
    items.push({
      type: "invoice",
      title: `${inv.invoice_number} -- ${name}`,
      by: name,
      amount: amt,
      urgency: amt > 100000 ? "high" : amt > 25000 ? "medium" : "low",
      entityId: inv.id,
      createdAt: inv.created_at,
    });
  }

  // Map submittals
  for (const sub of subRes.data ?? []) {
    items.push({
      type: "submittal",
      title: `${sub.submittal_number} -- ${sub.title}`,
      by: "Submittal",
      amount: null,
      urgency: "medium",
      entityId: sub.id,
      createdAt: sub.created_at,
    });
  }

  // Sort by created_at desc and take top 5
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return items.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Recent Activity (synthesized from real table timestamps)
// ---------------------------------------------------------------------------

export async function getRecentActivity(
  supabase: SupabaseClient,
  companyId: string
): Promise<RecentActivityItem[]> {
  // Pull recent records from multiple tables in parallel and merge by timestamp
  const [projectsRes, invoicesRes, changeOrdersRes, rfisRes, submittalsRes, paymentsRes, dailyLogsRes, documentsRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, status, created_at, updated_at")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("invoices")
        .select("id, invoice_number, invoice_type, status, vendor_name, client_name, total_amount, created_at, updated_at")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("change_orders")
        .select("id, co_number, title, status, amount, created_at, updated_at")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("rfis")
        .select("id, rfi_number, subject, status, created_at, updated_at")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("submittals")
        .select("id, submittal_number, title, status, created_at, updated_at")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("payments")
        .select("id, amount, payment_date, created_at, invoices(invoice_number)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("daily_logs")
        .select("id, log_date, weather, created_at, projects(name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("documents")
        .select("id, name, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const items: RecentActivityItem[] = [];

  // Projects
  for (const p of projectsRes.data ?? []) {
    const isNew = p.created_at === p.updated_at;
    items.push({
      user: "System",
      action: isNew ? "created project" : `updated project (${p.status?.replace(/_/g, " ")})`,
      ref: p.name ?? "",
      time: p.updated_at ?? p.created_at,
      entityType: "project",
      entityId: p.id,
    });
  }

  // Invoices
  for (const inv of invoicesRes.data ?? []) {
    const party = inv.invoice_type === "payable" ? (inv.vendor_name ?? "vendor") : (inv.client_name ?? "client");
    const isNew = inv.created_at === inv.updated_at;
    items.push({
      user: party,
      action: isNew
        ? `submitted ${inv.invoice_type === "payable" ? "bill" : "invoice"}`
        : `invoice ${inv.status}`,
      ref: inv.invoice_number ?? "",
      time: inv.updated_at ?? inv.created_at,
      entityType: "invoice",
      entityId: inv.id,
    });
  }

  // Change Orders
  for (const co of changeOrdersRes.data ?? []) {
    items.push({
      user: "System",
      action: `change order ${co.status?.replace(/_/g, " ") ?? "created"}`,
      ref: `${co.co_number} - ${co.title}`,
      time: co.updated_at ?? co.created_at,
      entityType: "change_order",
      entityId: co.id,
    });
  }

  // RFIs
  for (const rfi of rfisRes.data ?? []) {
    items.push({
      user: "System",
      action: `RFI ${rfi.status?.replace(/_/g, " ") ?? "submitted"}`,
      ref: `${rfi.rfi_number} - ${rfi.subject}`,
      time: rfi.updated_at ?? rfi.created_at,
      entityType: "rfi",
      entityId: rfi.id,
    });
  }

  // Submittals
  for (const sub of submittalsRes.data ?? []) {
    items.push({
      user: "System",
      action: `submittal ${sub.status?.replace(/_/g, " ") ?? "submitted"}`,
      ref: `${sub.submittal_number} - ${sub.title}`,
      time: sub.updated_at ?? sub.created_at,
      entityType: "submittal",
      entityId: sub.id,
    });
  }

  // Payments
  for (const pay of paymentsRes.data ?? []) {
    const invoice = pay.invoices as unknown as { invoice_number: string } | null;
    items.push({
      user: "System",
      action: "recorded payment",
      ref: invoice?.invoice_number ?? "",
      time: pay.created_at,
      entityType: "payment",
      entityId: pay.id,
    });
  }

  // Daily Logs
  for (const log of dailyLogsRes.data ?? []) {
    const project = log.projects as unknown as { name: string } | null;
    items.push({
      user: "System",
      action: "submitted daily log",
      ref: project?.name ?? log.log_date ?? "",
      time: log.created_at,
      entityType: "daily_log",
      entityId: log.id,
    });
  }

  // Documents
  for (const doc of documentsRes.data ?? []) {
    items.push({
      user: "System",
      action: "uploaded document",
      ref: doc.name ?? "",
      time: doc.created_at,
      entityType: "document",
      entityId: doc.id,
    });
  }

  // Sort by time descending, return top 20
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return items.slice(0, 20);
}
