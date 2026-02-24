import { SupabaseClient } from "@supabase/supabase-js";
import type {
  MarketFeasibilityData,
  OfferingMemorandumData,
  BasisOfDesignData,
  PropertySummary,
  UnitMixItem,
  LeaseItem,
  ProjectSummary,
  BudgetLineItem,
  ChangeOrderItem,
  SubmittalItem,
  EquipmentItem,
  TaskItem,
} from "@/types/authoritative-reports";

/* =========================================================
   Authoritative Reports – Data Aggregation
   Composes data from multiple tables for each report type.
   ========================================================= */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPropertySummary(p: Record<string, unknown>): PropertySummary {
  const monthlyRevenue = (p.monthly_revenue as number) ?? 0;
  const monthlyExpenses = (p.monthly_expenses as number) ?? 0;
  const totalUnits = (p.total_units as number) ?? 0;
  const occupiedUnits = (p.occupied_units as number) ?? 0;

  return {
    id: p.id as string,
    name: p.name as string,
    property_type: p.property_type as string,
    address: (p.address_line1 as string) ?? "",
    city: (p.city as string) ?? "",
    state: (p.state as string) ?? "",
    zip: (p.zip as string) ?? "",
    year_built: (p.year_built as number) ?? null,
    total_sqft: (p.total_sqft as number) ?? null,
    total_units: totalUnits,
    occupied_units: occupiedUnits,
    occupancy_rate:
      (p.occupancy_rate as number) ??
      (totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0),
    purchase_price: (p.purchase_price as number) ?? null,
    current_value: (p.current_value as number) ?? null,
    monthly_revenue: monthlyRevenue,
    monthly_expenses: monthlyExpenses,
    noi: (p.noi as number) ?? monthlyRevenue - monthlyExpenses,
  };
}

// ---------------------------------------------------------------------------
// getMarketFeasibilityData
// ---------------------------------------------------------------------------

export async function getMarketFeasibilityData(
  supabase: SupabaseClient,
  companyId: string,
  propertyIds: string[]
): Promise<MarketFeasibilityData> {
  const [propertiesRes, unitsRes, leasesRes, allPropertiesRes, financialRes] =
    await Promise.all([
      // Selected properties
      supabase
        .from("properties")
        .select("*")
        .eq("company_id", companyId)
        .in("id", propertyIds),

      // Units for selected properties
      supabase
        .from("units")
        .select("*")
        .eq("company_id", companyId)
        .in("property_id", propertyIds),

      // Leases for selected properties
      supabase
        .from("leases")
        .select("*, units!inner(unit_number)")
        .eq("company_id", companyId)
        .in("property_id", propertyIds)
        .order("lease_start", { ascending: false }),

      // All properties for comparative analysis
      supabase
        .from("properties")
        .select(
          "id, name, property_type, address_line1, city, state, zip, year_built, total_sqft, total_units, occupied_units, occupancy_rate, purchase_price, current_value, monthly_revenue, monthly_expenses, noi"
        )
        .eq("company_id", companyId),

      // Financial summary (paid invoices)
      supabase
        .from("invoices")
        .select("invoice_type, total_amount, balance_due, status")
        .eq("company_id", companyId),
    ]);

  // Build property summaries
  const properties = (propertiesRes.data ?? []).map(buildPropertySummary);

  // Build unit mix
  const unitRows = unitsRes.data ?? [];
  const unitTypeMap = new Map<string, { count: number; sqft: number; rent: number; occupied: number; vacant: number }>();
  for (const u of unitRows) {
    const key = u.unit_type ?? "unknown";
    const existing = unitTypeMap.get(key) ?? { count: 0, sqft: 0, rent: 0, occupied: 0, vacant: 0 };
    existing.count += 1;
    existing.sqft += u.sqft ?? 0;
    existing.rent += u.market_rent ?? 0;
    if (u.status === "occupied") existing.occupied += 1;
    else existing.vacant += 1;
    unitTypeMap.set(key, existing);
  }
  const unitMix: UnitMixItem[] = Array.from(unitTypeMap.entries()).map(([type, d]) => ({
    unit_type: type,
    count: d.count,
    avg_sqft: d.count > 0 ? Math.round(d.sqft / d.count) : 0,
    avg_market_rent: d.count > 0 ? Math.round(d.rent / d.count) : 0,
    total_market_rent: d.rent,
    occupied: d.occupied,
    vacant: d.vacant,
  }));

  // Build leases
  const leases: LeaseItem[] = (leasesRes.data ?? []).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    unit_number: (l.units as Record<string, unknown>)?.unit_number as string ?? "",
    tenant_name: l.tenant_name as string,
    monthly_rent: (l.monthly_rent as number) ?? 0,
    lease_start: l.lease_start as string,
    lease_end: l.lease_end as string,
    status: l.status as string,
  }));

  // Comps (all properties except selected)
  const portfolioComps = (allPropertiesRes.data ?? [])
    .filter((p: Record<string, unknown>) => !propertyIds.includes(p.id as string))
    .map(buildPropertySummary);

  // Financial summary
  const invoices = financialRes.data ?? [];
  const receivablePaid = invoices.filter(
    (i: Record<string, unknown>) => i.invoice_type === "receivable" && i.status === "paid"
  );
  const payablePaid = invoices.filter(
    (i: Record<string, unknown>) => i.invoice_type === "payable" && i.status === "paid"
  );
  const arOutstanding = invoices.filter(
    (i: Record<string, unknown>) =>
      i.invoice_type === "receivable" && i.status !== "paid" && i.status !== "voided"
  );
  const apOutstanding = invoices.filter(
    (i: Record<string, unknown>) =>
      i.invoice_type === "payable" && i.status !== "paid" && i.status !== "voided"
  );

  const totalRevenue = receivablePaid.reduce((s: number, i: Record<string, unknown>) => s + ((i.total_amount as number) ?? 0), 0);
  const totalExpenses = payablePaid.reduce((s: number, i: Record<string, unknown>) => s + ((i.total_amount as number) ?? 0), 0);

  return {
    properties,
    unitMix,
    leases,
    portfolioComps,
    financialSummary: {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      totalAR: arOutstanding.reduce((s: number, i: Record<string, unknown>) => s + ((i.balance_due as number) ?? 0), 0),
      totalAP: apOutstanding.reduce((s: number, i: Record<string, unknown>) => s + ((i.balance_due as number) ?? 0), 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// getOfferingMemorandumData
// ---------------------------------------------------------------------------

export async function getOfferingMemorandumData(
  supabase: SupabaseClient,
  companyId: string,
  propertyIds: string[]
): Promise<OfferingMemorandumData> {
  const [propertiesRes, unitsRes, leasesRes, financialRes, cashFlowRes, contractsRes] =
    await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .eq("company_id", companyId)
        .in("id", propertyIds),

      supabase
        .from("units")
        .select("*")
        .eq("company_id", companyId)
        .in("property_id", propertyIds),

      supabase
        .from("leases")
        .select("*, units!inner(unit_number)")
        .eq("company_id", companyId)
        .in("property_id", propertyIds)
        .order("lease_start", { ascending: false }),

      supabase
        .from("invoices")
        .select("invoice_type, total_amount, balance_due, status, invoice_date")
        .eq("company_id", companyId),

      // Cash flow: monthly invoices for last 12 months
      supabase
        .from("invoices")
        .select("invoice_type, total_amount, invoice_date, status")
        .eq("company_id", companyId)
        .eq("status", "paid")
        .gte(
          "invoice_date",
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        ),

      supabase
        .from("contracts")
        .select("id, contract_number, contract_type, party_name, contract_amount, status")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const properties = (propertiesRes.data ?? []).map(buildPropertySummary);

  // Unit mix
  const unitRows = unitsRes.data ?? [];
  const unitTypeMap = new Map<string, { count: number; sqft: number; rent: number; occupied: number; vacant: number }>();
  for (const u of unitRows) {
    const key = u.unit_type ?? "unknown";
    const existing = unitTypeMap.get(key) ?? { count: 0, sqft: 0, rent: 0, occupied: 0, vacant: 0 };
    existing.count += 1;
    existing.sqft += u.sqft ?? 0;
    existing.rent += u.market_rent ?? 0;
    if (u.status === "occupied") existing.occupied += 1;
    else existing.vacant += 1;
    unitTypeMap.set(key, existing);
  }
  const unitMix: UnitMixItem[] = Array.from(unitTypeMap.entries()).map(([type, d]) => ({
    unit_type: type,
    count: d.count,
    avg_sqft: d.count > 0 ? Math.round(d.sqft / d.count) : 0,
    avg_market_rent: d.count > 0 ? Math.round(d.rent / d.count) : 0,
    total_market_rent: d.rent,
    occupied: d.occupied,
    vacant: d.vacant,
  }));

  // Leases
  const leases: LeaseItem[] = (leasesRes.data ?? []).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    unit_number: (l.units as Record<string, unknown>)?.unit_number as string ?? "",
    tenant_name: l.tenant_name as string,
    monthly_rent: (l.monthly_rent as number) ?? 0,
    lease_start: l.lease_start as string,
    lease_end: l.lease_end as string,
    status: l.status as string,
  }));

  // Financial summary
  const invoices = financialRes.data ?? [];
  const receivablePaid = invoices.filter((i: Record<string, unknown>) => i.invoice_type === "receivable" && i.status === "paid");
  const payablePaid = invoices.filter((i: Record<string, unknown>) => i.invoice_type === "payable" && i.status === "paid");
  const arOutstanding = invoices.filter((i: Record<string, unknown>) => i.invoice_type === "receivable" && i.status !== "paid" && i.status !== "voided");
  const apOutstanding = invoices.filter((i: Record<string, unknown>) => i.invoice_type === "payable" && i.status !== "paid" && i.status !== "voided");

  const totalRevenue = receivablePaid.reduce((s: number, i: Record<string, unknown>) => s + ((i.total_amount as number) ?? 0), 0);
  const totalExpenses = payablePaid.reduce((s: number, i: Record<string, unknown>) => s + ((i.total_amount as number) ?? 0), 0);

  // Cash flow by month
  const cfRows = cashFlowRes.data ?? [];
  const monthMap = new Map<string, { cashIn: number; cashOut: number }>();
  for (const inv of cfRows) {
    const d = new Date(inv.invoice_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key) ?? { cashIn: 0, cashOut: 0 };
    if (inv.invoice_type === "receivable") {
      existing.cashIn += inv.total_amount ?? 0;
    } else {
      existing.cashOut += inv.total_amount ?? 0;
    }
    monthMap.set(key, existing);
  }
  const cashFlowMonths = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      cashIn: d.cashIn,
      cashOut: d.cashOut,
      net: d.cashIn - d.cashOut,
    }));

  // Contracts
  const contracts = (contractsRes.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    contract_number: (c.contract_number as string) ?? "",
    contract_type: (c.contract_type as string) ?? "",
    party_name: (c.party_name as string) ?? "",
    contract_amount: (c.contract_amount as number) ?? 0,
    status: (c.status as string) ?? "",
  }));

  return {
    properties,
    unitMix,
    leases,
    financialSummary: {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      totalAR: arOutstanding.reduce((s: number, i: Record<string, unknown>) => s + ((i.balance_due as number) ?? 0), 0),
      totalAP: apOutstanding.reduce((s: number, i: Record<string, unknown>) => s + ((i.balance_due as number) ?? 0), 0),
    },
    cashFlowMonths,
    contracts,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// getBasisOfDesignData
// ---------------------------------------------------------------------------

export async function getBasisOfDesignData(
  supabase: SupabaseClient,
  companyId: string,
  projectIds: string[]
): Promise<BasisOfDesignData> {
  const [
    projectsRes,
    budgetRes,
    changeOrdersRes,
    submittalsRes,
    equipmentRes,
    tasksRes,
    inspectionsRes,
  ] = await Promise.all([
    // Projects
    supabase
      .from("projects")
      .select("*")
      .eq("company_id", companyId)
      .in("id", projectIds),

    // Budget lines
    supabase
      .from("project_budget_lines")
      .select("*")
      .eq("company_id", companyId)
      .in("project_id", projectIds)
      .order("csi_code", { ascending: true }),

    // Change orders
    supabase
      .from("change_orders")
      .select("*")
      .eq("company_id", companyId)
      .in("project_id", projectIds)
      .order("created_at", { ascending: false }),

    // Submittals
    supabase
      .from("submittals")
      .select("*")
      .eq("company_id", companyId)
      .in("project_id", projectIds)
      .order("created_at", { ascending: false }),

    // Equipment assigned to projects
    supabase
      .from("equipment")
      .select("*")
      .eq("company_id", companyId)
      .in("current_project_id", projectIds),

    // Tasks with phase names
    supabase
      .from("project_tasks")
      .select("*, phase:project_phases(name)")
      .eq("company_id", companyId)
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true }),

    // Safety inspections
    supabase
      .from("safety_inspections")
      .select("id, inspection_type, status, inspection_date, checklist")
      .eq("company_id", companyId)
      .in("project_id", projectIds)
      .order("inspection_date", { ascending: false }),
  ]);

  // Batch-fetch project manager and superintendent profiles
  const projectRows = projectsRes.data ?? [];
  const pmIds = new Set<string>();
  const supertIds = new Set<string>();
  for (const p of projectRows) {
    if (p.project_manager_id) pmIds.add(p.project_manager_id);
    if (p.superintendent_id) supertIds.add(p.superintendent_id);
  }
  const allProfileIds = [...new Set([...pmIds, ...supertIds])];
  let reportProfileMap = new Map<string, { id: string; full_name: string }>();
  if (allProfileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", allProfileIds);
    reportProfileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p])
    );
  }

  // Projects
  const projects: ProjectSummary[] = projectRows.map(
    (p: Record<string, unknown>) => ({
      id: p.id as string,
      name: p.name as string,
      code: (p.code as string) ?? "",
      status: p.status as string,
      project_type: (p.project_type as string) ?? null,
      address: (p.address_line1 as string) ?? "",
      city: (p.city as string) ?? null,
      state: (p.state as string) ?? null,
      client_name: (p.client_name as string) ?? null,
      contract_amount: (p.contract_amount as number) ?? 0,
      estimated_cost: (p.estimated_cost as number) ?? 0,
      actual_cost: (p.actual_cost as number) ?? 0,
      completion_pct: (p.completion_pct as number) ?? 0,
      start_date: (p.start_date as string) ?? null,
      estimated_end_date: (p.estimated_end_date as string) ?? null,
      project_manager:
        p.project_manager_id ? reportProfileMap.get(p.project_manager_id as string)?.full_name ?? null : null,
      superintendent:
        p.superintendent_id ? reportProfileMap.get(p.superintendent_id as string)?.full_name ?? null : null,
    })
  );

  // Budget lines
  const budgetLines: BudgetLineItem[] = (budgetRes.data ?? []).map(
    (b: Record<string, unknown>) => ({
      id: b.id as string,
      csi_code: (b.csi_code as string) ?? "",
      description: (b.description as string) ?? "",
      budgeted_amount: (b.budgeted_amount as number) ?? 0,
      committed_amount: (b.committed_amount as number) ?? 0,
      actual_amount: (b.actual_amount as number) ?? 0,
      variance:
        (b.variance as number) ??
        ((b.budgeted_amount as number) ?? 0) - ((b.actual_amount as number) ?? 0),
    })
  );

  // Change orders
  const changeOrders: ChangeOrderItem[] = (changeOrdersRes.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: c.id as string,
      title: (c.title as string) ?? "",
      description: (c.description as string) ?? null,
      amount: (c.amount as number) ?? 0,
      status: (c.status as string) ?? "",
      schedule_impact_days: (c.schedule_impact_days as number) ?? null,
      created_at: c.created_at as string,
    })
  );

  // Submittals
  const submittals: SubmittalItem[] = (submittalsRes.data ?? []).map(
    (s: Record<string, unknown>) => ({
      id: s.id as string,
      title: (s.title as string) ?? "",
      spec_section: (s.spec_section as string) ?? null,
      status: (s.status as string) ?? "",
      submitted_date: (s.submitted_date as string) ?? null,
    })
  );

  // Equipment
  const equipment: EquipmentItem[] = (equipmentRes.data ?? []).map(
    (e: Record<string, unknown>) => ({
      id: e.id as string,
      name: (e.name as string) ?? "",
      equipment_type: (e.equipment_type as string) ?? "",
      make: (e.make as string) ?? null,
      model: (e.model as string) ?? null,
      serial_number: (e.serial_number as string) ?? null,
      status: (e.status as string) ?? "",
    })
  );

  // Tasks
  const tasks: TaskItem[] = (tasksRes.data ?? []).map(
    (t: Record<string, unknown>) => ({
      id: t.id as string,
      name: (t.name as string) ?? "",
      phase_name: (t.phase as Record<string, unknown>)?.name as string ?? null,
      status: (t.status as string) ?? "",
      start_date: (t.start_date as string) ?? null,
      end_date: (t.end_date as string) ?? null,
      completion_pct: (t.completion_pct as number) ?? 0,
      is_milestone: (t.is_milestone as boolean) ?? false,
      is_critical_path: (t.is_critical_path as boolean) ?? false,
    })
  );

  // Safety inspections
  const safetyInspections = (inspectionsRes.data ?? []).map(
    (i: Record<string, unknown>) => {
      const checklist = i.checklist as Record<string, unknown>[] | null;
      return {
        id: i.id as string,
        inspection_type: (i.inspection_type as string) ?? "",
        status: (i.status as string) ?? "",
        inspection_date: (i.inspection_date as string) ?? "",
        findings_count: Array.isArray(checklist)
          ? checklist.filter((c) => c.status === "fail" || c.status === "finding").length
          : 0,
      };
    }
  );

  return {
    projects,
    budgetLines,
    changeOrders,
    submittals,
    equipment,
    tasks,
    safetyInspections,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// getSavedReports
// ---------------------------------------------------------------------------

export async function getSavedReports(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data, error } = await supabase
    .from("authoritative_reports")
    .select("id, report_type, title, status, watermark, created_at, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getSavedReports error:", error);
    return [];
  }

  return data ?? [];
}
