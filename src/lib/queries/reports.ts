import { SupabaseClient } from "@supabase/supabase-js";
import { paginatedQuery } from "@/lib/utils/paginated-query";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface ProjectPerformanceRow {
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
  actual_end_date: string | null;
  budget_variance: number;
  budget_variance_pct: number;
  schedule_status: "on_track" | "at_risk" | "behind" | "ahead";
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalAR: number;
  totalAP: number;
  invoicesPaid: number;
  invoicesOutstanding: number;
}

export interface PropertyPortfolioRow {
  id: string;
  name: string;
  property_type: string;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number;
  monthly_revenue: number;
  monthly_expenses: number;
  noi: number;
  current_value: number | null;
  cap_rate: number | null;
}

export interface PropertyPortfolioSummary {
  properties: PropertyPortfolioRow[];
  totalProperties: number;
  totalUnits: number;
  totalOccupied: number;
  avgOccupancy: number;
  totalMonthlyRevenue: number;
  totalMonthlyExpenses: number;
  totalNOI: number;
}

export interface AgingInvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: "payable" | "receivable";
  vendor_name: string | null;
  client_name: string | null;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  aging_days: number;
  aging_bucket: string;
}

export interface AgingBucketSummary {
  label: string;
  amount: number;
  count: number;
}

export interface AgingReportData {
  invoices: AgingInvoiceRow[];
  buckets: AgingBucketSummary[];
  total: number;
}

/* ------------------------------------------------------------------
   getProjectPerformanceReport
   Returns all active projects with budget variance and schedule status.
   ------------------------------------------------------------------ */

export async function getProjectPerformanceReport(
  supabase: SupabaseClient,
  companyId: string
): Promise<ProjectPerformanceRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, estimated_end_date, actual_end_date"
    )
    .eq("company_id", companyId)
    .in("status", ["active", "pre_construction", "on_hold"])
    .order("name", { ascending: true });

  if (error) {
    console.error("getProjectPerformanceReport error:", error);
    return [];
  }

  const now = new Date();

  return (data ?? []).map((p) => {
    const contractAmount = p.contract_amount ?? 0;
    const actualCost = p.actual_cost ?? 0;
    const estimatedCost = p.estimated_cost ?? contractAmount;
    const budgetVariance = estimatedCost - actualCost;
    const budgetVariancePct =
      estimatedCost > 0 ? (budgetVariance / estimatedCost) * 100 : 0;

    // Schedule status based on completion % vs expected progress
    let scheduleStatus: "on_track" | "at_risk" | "behind" | "ahead" =
      "on_track";

    if (p.start_date && p.estimated_end_date) {
      const start = new Date(p.start_date).getTime();
      const end = new Date(p.estimated_end_date).getTime();
      const totalDuration = end - start;

      if (totalDuration > 0) {
        const elapsed = now.getTime() - start;
        const expectedPct = Math.min(
          Math.max((elapsed / totalDuration) * 100, 0),
          100
        );
        const diff = p.completion_pct - expectedPct;

        if (diff >= 5) {
          scheduleStatus = "ahead";
        } else if (diff >= -5) {
          scheduleStatus = "on_track";
        } else if (diff >= -15) {
          scheduleStatus = "at_risk";
        } else {
          scheduleStatus = "behind";
        }
      }
    }

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      contract_amount: contractAmount,
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      completion_pct: p.completion_pct,
      start_date: p.start_date,
      estimated_end_date: p.estimated_end_date,
      actual_end_date: p.actual_end_date,
      budget_variance: budgetVariance,
      budget_variance_pct: budgetVariancePct,
      schedule_status: scheduleStatus,
    };
  });
}

/* ------------------------------------------------------------------
   getFinancialSummaryReport
   Returns total revenue, expenses, net income, AR/AP totals.
   ------------------------------------------------------------------ */

export async function getFinancialSummaryReport(
  supabase: SupabaseClient,
  companyId: string,
  dateRange?: { start: string; end: string }
): Promise<FinancialSummary> {
  const start =
    dateRange?.start ??
    new Date(new Date().getFullYear(), 0, 1).toISOString();
  const end =
    dateRange?.end ??
    new Date().toISOString();

  // Revenue: paid receivable invoices in date range
  const revenuePromise = supabase
    .from("invoices")
    .select("total_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .eq("status", "paid")
    .gte("invoice_date", start)
    .lte("invoice_date", end);

  // Expenses: paid payable invoices in date range
  const expensePromise = supabase
    .from("invoices")
    .select("total_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .eq("status", "paid")
    .gte("invoice_date", start)
    .lte("invoice_date", end);

  // AR outstanding — includes paid invoices with retainage (balance_due > 0) to match GL
  const arPromise = paginatedQuery<{ balance_due: number }>((from, to) =>
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .not("status", "eq", "voided")
      .gt("balance_due", 0)
      .range(from, to)
  );

  // AP outstanding — includes paid invoices with retainage (balance_due > 0) to match GL
  const apPromise = paginatedQuery<{ balance_due: number }>((from, to) =>
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .not("status", "eq", "voided")
      .gt("balance_due", 0)
      .range(from, to)
  );

  // Count paid and outstanding
  const paidCountPromise = supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "paid")
    .gte("invoice_date", start)
    .lte("invoice_date", end);

  const outstandingCountPromise = supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("status", "eq", "paid")
    .not("status", "eq", "voided")
    .gt("balance_due", 0);

  const [revenueRes, expenseRes, arRows, apRows, paidRes, outstandingRes] =
    await Promise.all([
      revenuePromise,
      expensePromise,
      arPromise,
      apPromise,
      paidCountPromise,
      outstandingCountPromise,
    ]);

  const totalRevenue = (revenueRes.data ?? []).reduce(
    (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0),
    0
  );

  const totalExpenses = (expenseRes.data ?? []).reduce(
    (sum: number, r: { total_amount: number }) => sum + (r.total_amount ?? 0),
    0
  );

  const totalAR = arRows.reduce(
    (sum: number, r: { balance_due: number }) => sum + (r.balance_due ?? 0),
    0
  );

  const totalAP = apRows.reduce(
    (sum: number, r: { balance_due: number }) => sum + (r.balance_due ?? 0),
    0
  );

  return {
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    totalAR,
    totalAP,
    invoicesPaid: paidRes.count ?? 0,
    invoicesOutstanding: outstandingRes.count ?? 0,
  };
}

/* ------------------------------------------------------------------
   getPropertyPortfolioReport
   Returns all properties with occupancy, NOI, revenue.
   ------------------------------------------------------------------ */

export async function getPropertyPortfolioReport(
  supabase: SupabaseClient,
  companyId: string
): Promise<PropertyPortfolioSummary> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, name, property_type, total_units, occupied_units, occupancy_rate, monthly_revenue, monthly_expenses, noi, current_value"
    )
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getPropertyPortfolioReport error:", error);
    return {
      properties: [],
      totalProperties: 0,
      totalUnits: 0,
      totalOccupied: 0,
      avgOccupancy: 0,
      totalMonthlyRevenue: 0,
      totalMonthlyExpenses: 0,
      totalNOI: 0,
    };
  }

  const properties: PropertyPortfolioRow[] = (data ?? []).map((p) => {
    const totalUnits = p.total_units ?? 0;
    const occupiedUnits = p.occupied_units ?? 0;
    const occupancyRate =
      p.occupancy_rate ?? (totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0);
    const monthlyRevenue = p.monthly_revenue ?? 0;
    const monthlyExpenses = p.monthly_expenses ?? 0;
    const noi = p.noi ?? monthlyRevenue - monthlyExpenses;
    const annualNOI = noi * 12;
    const currentValue = p.current_value ?? 0;
    const capRate = currentValue > 0 ? (annualNOI / currentValue) * 100 : null;

    return {
      id: p.id,
      name: p.name,
      property_type: p.property_type,
      total_units: totalUnits,
      occupied_units: occupiedUnits,
      occupancy_rate: occupancyRate,
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      noi,
      current_value: currentValue || null,
      cap_rate: capRate,
    };
  });

  const totalUnits = properties.reduce((s, p) => s + p.total_units, 0);
  const totalOccupied = properties.reduce((s, p) => s + p.occupied_units, 0);
  const avgOccupancy = totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0;
  const totalMonthlyRevenue = properties.reduce(
    (s, p) => s + p.monthly_revenue,
    0
  );
  const totalMonthlyExpenses = properties.reduce(
    (s, p) => s + p.monthly_expenses,
    0
  );
  const totalNOI = properties.reduce((s, p) => s + p.noi, 0);

  return {
    properties,
    totalProperties: properties.length,
    totalUnits,
    totalOccupied,
    avgOccupancy,
    totalMonthlyRevenue,
    totalMonthlyExpenses,
    totalNOI,
  };
}

/* ------------------------------------------------------------------
   getAgingReport
   Returns invoices grouped by aging bucket for receivable or payable.
   ------------------------------------------------------------------ */

export async function getAgingReport(
  supabase: SupabaseClient,
  companyId: string,
  type: "receivable" | "payable"
): Promise<AgingReportData> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_type, vendor_name, client_name, invoice_date, due_date, total_amount, balance_due, status"
    )
    .eq("company_id", companyId)
    .eq("invoice_type", type)
    .not("status", "eq", "voided")
    .not("status", "eq", "paid")
    .gt("balance_due", 0)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("getAgingReport error:", error);
    return {
      invoices: [],
      buckets: [
        { label: "Current", amount: 0, count: 0 },
        { label: "1-30 Days", amount: 0, count: 0 },
        { label: "31-60 Days", amount: 0, count: 0 },
        { label: "61-90 Days", amount: 0, count: 0 },
        { label: "90+ Days", amount: 0, count: 0 },
      ],
      total: 0,
    };
  }

  const now = new Date();
  const buckets: AgingBucketSummary[] = [
    { label: "Current", amount: 0, count: 0 },
    { label: "1-30 Days", amount: 0, count: 0 },
    { label: "31-60 Days", amount: 0, count: 0 },
    { label: "61-90 Days", amount: 0, count: 0 },
    { label: "90+ Days", amount: 0, count: 0 },
  ];

  const invoices: AgingInvoiceRow[] = (data ?? []).map((inv) => {
    const dueDate = new Date(inv.due_date);
    const agingDays = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    let agingBucket: string;
    let bucketIndex: number;

    if (agingDays <= 0) {
      agingBucket = "Current";
      bucketIndex = 0;
    } else if (agingDays <= 30) {
      agingBucket = "1-30 Days";
      bucketIndex = 1;
    } else if (agingDays <= 60) {
      agingBucket = "31-60 Days";
      bucketIndex = 2;
    } else if (agingDays <= 90) {
      agingBucket = "61-90 Days";
      bucketIndex = 3;
    } else {
      agingBucket = "90+ Days";
      bucketIndex = 4;
    }

    buckets[bucketIndex].amount += inv.balance_due ?? 0;
    buckets[bucketIndex].count += 1;

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_type: inv.invoice_type,
      vendor_name: inv.vendor_name,
      client_name: inv.client_name,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      total_amount: inv.total_amount,
      balance_due: inv.balance_due,
      status: inv.status,
      aging_days: agingDays,
      aging_bucket: agingBucket,
    };
  });

  const total = buckets.reduce((s, b) => s + b.amount, 0);

  return { invoices, buckets, total };
}
