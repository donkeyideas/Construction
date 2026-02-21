import { SupabaseClient } from "@supabase/supabase-js";

/* =========================================================
   Property Queries
   ========================================================= */

export interface PropertyRow {
  id: string;
  company_id: string;
  name: string;
  property_type: "residential" | "commercial" | "industrial" | "mixed_use";
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  year_built: number | null;
  total_sqft: number | null;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number | null;
  purchase_price: number | null;
  current_value: number | null;
  monthly_revenue: number | null;
  monthly_expenses: number | null;
  noi: number | null;
  manager_id: string | null;
  photos: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UnitRow {
  id: string;
  company_id: string;
  property_id: string;
  unit_number: string;
  unit_type: "studio" | "1br" | "2br" | "3br" | "office" | "retail" | "warehouse";
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_number: number | null;
  market_rent: number | null;
  status: "vacant" | "occupied" | "maintenance" | "reserved";
  current_tenant_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface LeaseRow {
  id: string;
  company_id: string;
  property_id: string;
  unit_id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  tenant_user_id: string | null;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number | null;
  status: "active" | "expired" | "terminated" | "pending";
  auto_renew: boolean;
  units?: { unit_number: string } | null;
}

export interface MaintenanceRequestRow {
  id: string;
  company_id: string;
  property_id: string;
  unit_id: string | null;
  title: string;
  description: string | null;
  category: "plumbing" | "electrical" | "hvac" | "appliance" | "structural" | "general";
  priority: "low" | "medium" | "high" | "emergency";
  status: "submitted" | "assigned" | "in_progress" | "completed" | "closed";
  requested_by: string | null;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_date: string | null;
  completed_at: string | null;
  photos: string[] | null;
  notes: string | null;
  created_at: string;
  units?: { unit_number: string } | null;
  properties?: { name: string } | null;
}

export interface RentPaymentRow {
  id: string;
  company_id: string;
  lease_id: string;
  amount: number;
  payment_date: string | null;
  due_date: string;
  method: string | null;
  status: "paid" | "pending" | "late" | "failed";
  late_fee: number | null;
}

export interface PropertyRentPayment {
  id: string;
  amount: number;
  payment_date: string | null;
  due_date: string;
  method: string | null;
  status: string;
  gateway_provider: string | null;
  gateway_session_id: string | null;
  notes: string | null;
  created_at: string;
  lease_id: string;
  tenant_name: string | null;
  unit_number: string | null;
  je_id: string | null;
  je_number: string | null;
}

/* ---------------------------------------------------------
   getPropertyRentPayments - All rent payments for a property
   --------------------------------------------------------- */

export async function getPropertyRentPayments(
  supabase: SupabaseClient,
  propertyId: string
): Promise<PropertyRentPayment[]> {
  // Get active lease IDs for this property
  const { data: leases } = await supabase
    .from("leases")
    .select("id, tenant_name, units(unit_number)")
    .eq("property_id", propertyId);

  if (!leases || leases.length === 0) return [];

  const leaseIds = leases.map((l) => l.id);
  const leaseMap = new Map(
    leases.map((l) => [
      l.id,
      {
        tenant_name: l.tenant_name as string | null,
        unit_number: (l.units as unknown as { unit_number: string } | null)?.unit_number ?? null,
      },
    ])
  );

  // Get all rent payments for those leases
  const { data: payments } = await supabase
    .from("rent_payments")
    .select("id, amount, payment_date, due_date, method, status, gateway_provider, gateway_session_id, notes, created_at, lease_id")
    .in("lease_id", leaseIds)
    .order("payment_date", { ascending: false });

  if (!payments || payments.length === 0) return [];

  // Find associated journal entries via reference pattern "rent_payment:{id}"
  const paymentIds = payments.map((p) => `rent_payment:${p.id}`);
  const { data: journalEntries } = await supabase
    .from("journal_entries")
    .select("id, entry_number, reference")
    .in("reference", paymentIds);

  const jeMap = new Map<string, { id: string; entry_number: string }>();
  if (journalEntries) {
    for (const je of journalEntries) {
      if (je.reference) {
        jeMap.set(je.reference, { id: je.id, entry_number: je.entry_number });
      }
    }
  }

  return payments.map((p) => {
    const leaseInfo = leaseMap.get(p.lease_id);
    const je = jeMap.get(`rent_payment:${p.id}`);
    return {
      id: p.id,
      amount: p.amount,
      payment_date: p.payment_date,
      due_date: p.due_date,
      method: p.method,
      status: p.status,
      gateway_provider: p.gateway_provider ?? null,
      gateway_session_id: p.gateway_session_id ?? null,
      notes: p.notes ?? null,
      created_at: p.created_at,
      lease_id: p.lease_id,
      tenant_name: leaseInfo?.tenant_name ?? null,
      unit_number: leaseInfo?.unit_number ?? null,
      je_id: je?.id ?? null,
      je_number: je?.entry_number ?? null,
    };
  });
}

/* ---------------------------------------------------------
   getProperties - List all properties with summary stats
   --------------------------------------------------------- */

export async function getProperties(
  supabase: SupabaseClient,
  companyId: string
): Promise<PropertyRow[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) throw error;
  const properties = (data ?? []) as PropertyRow[];

  // Recalculate stats from live units/leases data for each property
  if (properties.length > 0) {
    const [unitsRes, leasesRes] = await Promise.all([
      supabase
        .from("units")
        .select("id, property_id, status")
        .eq("company_id", companyId),
      supabase
        .from("leases")
        .select("property_id, monthly_rent, status")
        .eq("company_id", companyId)
        .eq("status", "active"),
    ]);
    const allUnits = unitsRes.data ?? [];
    const activeLeases = leasesRes.data ?? [];

    for (const prop of properties) {
      const propUnits = allUnits.filter((u) => u.property_id === prop.id);
      const propLeases = activeLeases.filter((l) => l.property_id === prop.id);
      // When unit records exist, use their count as the source of truth.
      // Only fall back to stored total_units when no unit records exist (legacy data).
      const totalUnits = propUnits.length > 0 ? propUnits.length : (prop.total_units ?? 0);
      const occupiedCount = propUnits.filter((u) => u.status === "occupied").length;
      const monthlyRevenue = propLeases.reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0);
      const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;

      prop.total_units = totalUnits;
      prop.occupied_units = occupiedCount;
      prop.occupancy_rate = occupancyRate;
      prop.monthly_revenue = monthlyRevenue;
      prop.noi = monthlyRevenue;
    }
  }

  return properties;
}

/* ---------------------------------------------------------
   getPropertyById - Full property with units, leases, maint
   --------------------------------------------------------- */

export async function getPropertyById(
  supabase: SupabaseClient,
  propertyId: string
): Promise<{
  property: PropertyRow;
  units: UnitRow[];
  leases: LeaseRow[];
  maintenanceRequests: MaintenanceRequestRow[];
} | null> {
  const { data: property, error: propError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (propError || !property) return null;

  const [unitsRes, leasesRes, maintRes] = await Promise.all([
    supabase
      .from("units")
      .select("*")
      .eq("property_id", propertyId)
      .order("unit_number", { ascending: true }),
    supabase
      .from("leases")
      .select("*, units(unit_number)")
      .eq("property_id", propertyId)
      .order("lease_end", { ascending: true }),
    supabase
      .from("maintenance_requests")
      .select("*, units(unit_number)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const units = (unitsRes.data ?? []) as UnitRow[];
  const leases = (leasesRes.data ?? []) as LeaseRow[];

  // Auto-recalculate denormalized stats from live data
  const occupiedCount = units.filter((u) => u.status === "occupied").length;
  const activeLeases = leases.filter((l) => l.status === "active");
  const monthlyRevenue = activeLeases.reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0);
  // When unit records exist, use their count as the source of truth.
  // Only fall back to stored total_units when no unit records exist (legacy data).
  const totalUnits = units.length > 0 ? units.length : (property.total_units ?? 0);
  const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;

  const freshProperty = {
    ...property,
    total_units: totalUnits,
    occupied_units: occupiedCount,
    occupancy_rate: occupancyRate,
    monthly_revenue: monthlyRevenue,
    noi: monthlyRevenue,
  } as PropertyRow;

  // Update the stored stats in the background (fire and forget)
  supabase
    .from("properties")
    .update({
      total_units: totalUnits,
      occupied_units: occupiedCount,
      occupancy_rate: occupancyRate,
      monthly_revenue: monthlyRevenue,
      noi: monthlyRevenue,
    })
    .eq("id", propertyId)
    .then(() => {});

  return {
    property: freshProperty,
    units,
    leases,
    maintenanceRequests: (maintRes.data ?? []) as MaintenanceRequestRow[],
  };
}

/* ---------------------------------------------------------
   getPropertyFinancials - Revenue, expenses, NOI, rent rate
   --------------------------------------------------------- */

export interface PropertyFinancials {
  monthlyRevenue: number;
  monthlyExpenses: number;
  maintenanceCost: number;
  operatingExpenses: number;
  expenseBreakdown: { type: string; monthlyAmount: number }[];
  noi: number;
  rentCollectionRate: number;
  totalPaid: number;
  totalDue: number;
}

export async function getPropertyFinancials(
  supabase: SupabaseClient,
  propertyId: string
): Promise<PropertyFinancials> {
  // Fetch all expense sources in parallel
  const [leasesRes, maintRes, propExpRes] = await Promise.all([
    supabase
      .from("leases")
      .select("id, monthly_rent")
      .eq("property_id", propertyId)
      .eq("status", "active"),
    supabase
      .from("maintenance_requests")
      .select("estimated_cost, actual_cost, status")
      .eq("property_id", propertyId)
      .in("status", ["submitted", "assigned", "in_progress", "completed"]),
    supabase
      .from("property_expenses")
      .select("expense_type, amount, frequency, effective_date, end_date")
      .eq("property_id", propertyId)
  ]);

  const activeLeases = leasesRes.data ?? [];
  const maintRequests = maintRes.data ?? [];
  const propExpenses = (propExpRes as { data: { expense_type: string; amount: number; frequency: string; effective_date: string | null; end_date: string | null }[] | null }).data ?? [];

  // Fetch rent_payments via lease_ids (rent_payments doesn't have property_id)
  const leaseIdsForPayments = activeLeases.map((l) => l.id);
  let paymentsData: { amount: number; status: string; due_date: string; lease_id: string }[] = [];
  if (leaseIdsForPayments.length > 0) {
    const { data } = await supabase
      .from("rent_payments")
      .select("amount, status, due_date, lease_id")
      .in("lease_id", leaseIdsForPayments);
    paymentsData = data ?? [];
  }

  // Revenue = sum of active lease rents
  const monthlyRevenue = activeLeases.reduce(
    (sum, l) => sum + (l.monthly_rent ?? 0),
    0
  );

  // Maintenance expenses
  const maintenanceCost = maintRequests.reduce((sum, m) => {
    const cost =
      m.status === "completed"
        ? (m.actual_cost ?? m.estimated_cost ?? 0)
        : (m.estimated_cost ?? 0);
    return sum + cost;
  }, 0);

  // Operating expenses (CAM, taxes, insurance, utilities, mgmt fees, etc.)
  // Convert each to a monthly equivalent based on frequency
  const now = new Date();
  let operatingExpenses = 0;
  const byType = new Map<string, number>();
  for (const exp of propExpenses) {
    if (exp.end_date && new Date(exp.end_date) < now) continue;
    if (exp.effective_date && new Date(exp.effective_date) > now) continue;

    const amount = Number(exp.amount) || 0;
    let monthly = 0;
    switch (exp.frequency) {
      case "monthly":      monthly = amount; break;
      case "quarterly":    monthly = amount / 3; break;
      case "semi_annual":  monthly = amount / 6; break;
      case "annual":       monthly = amount / 12; break;
      case "one_time":     break;
    }
    operatingExpenses += monthly;
    if (monthly > 0) {
      const t = (exp as { expense_type?: string }).expense_type ?? "other";
      byType.set(t, (byType.get(t) ?? 0) + monthly);
    }
  }

  // Build sorted expense breakdown
  const expenseBreakdown: { type: string; monthlyAmount: number }[] = [];
  if (maintenanceCost > 0) {
    expenseBreakdown.push({ type: "maintenance", monthlyAmount: maintenanceCost });
  }
  for (const [type, monthlyAmount] of byType) {
    expenseBreakdown.push({ type, monthlyAmount });
  }
  expenseBreakdown.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const monthlyExpenses = maintenanceCost + operatingExpenses;

  const noi = monthlyRevenue - monthlyExpenses;

  // Rent collection for current month
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const leaseIds = activeLeases.map((l) => l.id);
  const monthPayments = paymentsData.filter(
    (p) =>
      leaseIds.includes(p.lease_id) &&
      p.due_date >= monthStart &&
      p.due_date <= monthEnd
  );

  let totalPaid = 0;
  let totalDue = 0;
  for (const p of monthPayments) {
    totalDue += p.amount;
    if (p.status === "paid") {
      totalPaid += p.amount;
    }
  }

  if (totalDue === 0 && monthlyRevenue > 0) {
    totalDue = monthlyRevenue;
  }

  const rentCollectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 100;

  return {
    monthlyRevenue,
    monthlyExpenses,
    maintenanceCost,
    operatingExpenses,
    expenseBreakdown,
    noi,
    rentCollectionRate,
    totalPaid,
    totalDue,
  };
}

/* ---------------------------------------------------------
   getUnits - All units for a property with tenant/lease info
   --------------------------------------------------------- */

export interface UnitWithTenant extends UnitRow {
  tenant_name?: string | null;
  lease_monthly_rent?: number | null;
  lease_end?: string | null;
}

export async function getUnits(
  supabase: SupabaseClient,
  propertyId: string
): Promise<UnitWithTenant[]> {
  const { data: units, error } = await supabase
    .from("units")
    .select("*")
    .eq("property_id", propertyId)
    .order("unit_number", { ascending: true });

  if (error) throw error;
  if (!units || units.length === 0) return [];

  // Get active leases for these units
  const unitIds = units.map((u) => u.id);
  const { data: leases } = await supabase
    .from("leases")
    .select("unit_id, tenant_name, monthly_rent, lease_end")
    .in("unit_id", unitIds)
    .eq("status", "active");

  const leaseMap = new Map<string, { tenant_name: string; monthly_rent: number; lease_end: string }>();
  for (const lease of leases ?? []) {
    leaseMap.set(lease.unit_id, {
      tenant_name: lease.tenant_name,
      monthly_rent: lease.monthly_rent,
      lease_end: lease.lease_end,
    });
  }

  return units.map((unit) => {
    const lease = leaseMap.get(unit.id);
    return {
      ...unit,
      tenant_name: lease?.tenant_name ?? null,
      lease_monthly_rent: lease?.monthly_rent ?? null,
      lease_end: lease?.lease_end ?? null,
    } as UnitWithTenant;
  });
}

/* ---------------------------------------------------------
   getMaintenanceRequests - filtered by property/status/priority
   --------------------------------------------------------- */

export interface MaintenanceFilters {
  propertyId?: string;
  status?: string;
  priority?: string;
}

export async function getMaintenanceRequests(
  supabase: SupabaseClient,
  companyId: string,
  filters?: MaintenanceFilters
): Promise<MaintenanceRequestRow[]> {
  let query = supabase
    .from("maintenance_requests")
    .select("*, units(unit_number), properties(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.propertyId) {
    query = query.eq("property_id", filters.propertyId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MaintenanceRequestRow[];
}

/* ---------------------------------------------------------
   createProperty
   --------------------------------------------------------- */

export interface CreatePropertyData {
  name: string;
  property_type: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  year_built?: number | null;
  total_sqft?: number | null;
  total_units?: number;
  purchase_price?: number | null;
  current_value?: number | null;
}

export async function createProperty(
  supabase: SupabaseClient,
  companyId: string,
  data: CreatePropertyData
): Promise<PropertyRow> {
  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      company_id: companyId,
      name: data.name,
      property_type: data.property_type,
      address_line1: data.address_line1,
      city: data.city,
      state: data.state,
      zip: data.zip,
      year_built: data.year_built ?? null,
      total_sqft: data.total_sqft ?? null,
      total_units: data.total_units ?? 0,
      occupied_units: 0,
      purchase_price: data.purchase_price ?? null,
      current_value: data.current_value ?? null,
      monthly_revenue: 0,
      monthly_expenses: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return property as PropertyRow;
}

/* ---------------------------------------------------------
   createUnit
   --------------------------------------------------------- */

export interface CreateUnitData {
  unit_number: string;
  unit_type: string;
  sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor_number?: number | null;
  market_rent?: number | null;
  status?: string;
}

export async function createUnit(
  supabase: SupabaseClient,
  companyId: string,
  propertyId: string,
  data: CreateUnitData
): Promise<UnitRow> {
  const { data: unit, error } = await supabase
    .from("units")
    .insert({
      company_id: companyId,
      property_id: propertyId,
      unit_number: data.unit_number,
      unit_type: data.unit_type,
      sqft: data.sqft ?? null,
      bedrooms: data.bedrooms ?? null,
      bathrooms: data.bathrooms ?? null,
      floor_number: data.floor_number ?? null,
      market_rent: data.market_rent ?? null,
      status: data.status ?? "vacant",
    })
    .select()
    .single();

  if (error) throw error;
  return unit as UnitRow;
}

/* ---------------------------------------------------------
   createMaintenanceRequest
   --------------------------------------------------------- */

export interface CreateMaintenanceData {
  property_id: string;
  unit_id?: string | null;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  requested_by?: string | null;
  estimated_cost?: number | null;
  scheduled_date?: string | null;
}

export async function createMaintenanceRequest(
  supabase: SupabaseClient,
  companyId: string,
  data: CreateMaintenanceData
): Promise<MaintenanceRequestRow> {
  const { data: request, error } = await supabase
    .from("maintenance_requests")
    .insert({
      company_id: companyId,
      property_id: data.property_id,
      unit_id: data.unit_id ?? null,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      priority: data.priority,
      status: "submitted",
      requested_by: data.requested_by ?? null,
      estimated_cost: data.estimated_cost ?? null,
      scheduled_date: data.scheduled_date ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return request as MaintenanceRequestRow;
}

/* ---------------------------------------------------------
   syncPropertyFinancials - Auto-generate rent payments,
   invoices, and recalculate property stats.
   Called automatically after imports.
   --------------------------------------------------------- */

export async function syncPropertyFinancials(
  supabase: SupabaseClient,
  companyId: string,
  propertyId?: string | null
): Promise<{
  rentPaymentsCreated: number;
  invoicesCreated: number;
  propertiesUpdated: number;
}> {
  let rentPaymentsCreated = 0;
  let invoicesCreated = 0;
  let propertiesUpdated = 0;

  // ── 1. Fetch active leases ──
  let leasesQuery = supabase
    .from("leases")
    .select("id, property_id, tenant_name, monthly_rent, lease_start, lease_end, unit_id")
    .eq("company_id", companyId)
    .eq("status", "active");
  if (propertyId) {
    leasesQuery = leasesQuery.eq("property_id", propertyId);
  }
  const { data: leases } = await leasesQuery;

  // ── 2. Fetch existing rent_payments to avoid duplicates ──
  const leaseIds = (leases ?? []).map((l) => l.id);
  let existingPayments: { lease_id: string; due_date: string }[] = [];
  if (leaseIds.length > 0) {
    const { data } = await supabase
      .from("rent_payments")
      .select("lease_id, due_date")
      .eq("company_id", companyId)
      .in("lease_id", leaseIds);
    existingPayments = data ?? [];
  }
  const existingPaymentSet = new Set(
    existingPayments.map((p) => `${p.lease_id}|${p.due_date}`)
  );

  // ── 3. Generate rent_payments for each lease (current + next 3 months) ──
  const now = new Date();
  const rentPaymentRows: Record<string, unknown>[] = [];

  for (const lease of leases ?? []) {
    const leaseEnd = lease.lease_end
      ? new Date(lease.lease_end)
      : new Date(now.getFullYear() + 1, now.getMonth(), 1);

    const startMonth = lease.lease_start
      ? new Date(lease.lease_start)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const earliest = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const genStart =
      startMonth.getTime() > earliest.getTime() ? startMonth : earliest;
    const maxFuture = new Date(now.getFullYear(), now.getMonth() + 4, 1);
    const genEnd =
      leaseEnd.getTime() < maxFuture.getTime() ? leaseEnd : maxFuture;

    const cursor = new Date(genStart.getFullYear(), genStart.getMonth(), 1);
    while (cursor.getTime() <= genEnd.getTime()) {
      const dueDate = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-01`;
      const key = `${lease.id}|${dueDate}`;

      if (!existingPaymentSet.has(key)) {
        const isPast =
          cursor.getFullYear() < now.getFullYear() ||
          (cursor.getFullYear() === now.getFullYear() &&
            cursor.getMonth() < now.getMonth());

        rentPaymentRows.push({
          company_id: companyId,
          lease_id: lease.id,
          amount: lease.monthly_rent,
          due_date: dueDate,
          payment_date: isPast ? dueDate : dueDate,
          status: isPast ? "paid" : "pending",
          method: isPast ? "ach" : null,
        });
        existingPaymentSet.add(key);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  // Insert rent_payments in batches
  if (rentPaymentRows.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < rentPaymentRows.length; i += batchSize) {
      const batch = rentPaymentRows.slice(i, i + batchSize);
      const { error } = await supabase.from("rent_payments").insert(batch);
      if (!error) {
        rentPaymentsCreated += batch.length;
      }
    }
  }

  // ── 4. Create receivable invoices for active leases (current month) ──
  // Look up GL accounts for proper accounting
  const { data: coaAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number, name, account_type")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const findAccount = (type: string, namePattern: string) =>
    (coaAccounts ?? []).find(
      (a) => a.account_type === type && a.name.toLowerCase().includes(namePattern.toLowerCase())
    )?.id ?? null;

  // Find key accounts: Rental Income (revenue), Accounts Receivable (asset), Repairs (expense), AP (liability)
  const rentalIncomeId = findAccount("revenue", "rent") ?? findAccount("revenue", "income");
  const arAccountId = findAccount("asset", "receivable");
  const repairsExpenseId = findAccount("expense", "repair") ?? findAccount("expense", "maintenance");
  const apAccountId = findAccount("liability", "accounts payable") ?? findAccount("liability", "payable");

  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: existingInvoices } = await supabase
    .from("invoices")
    .select("id, notes")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .like("notes", `%auto-rent-${currentMonthStr}%`);
  const existingInvoiceNotes = new Set(
    (existingInvoices ?? []).map((i) => i.notes)
  );

  // Collect new invoices for batch JE generation
  const newRentInvoices: { id: string; amount: number; tenant: string; propertyId: string }[] = [];

  for (const lease of leases ?? []) {
    const noteTag = `auto-rent-${currentMonthStr}-${lease.id}`;
    if (existingInvoiceNotes.has(noteTag)) continue;

    const invNum = `RENT-${currentMonthStr}-${lease.tenant_name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
    const dueDate = `${currentMonthStr}-01`;

    const { data: inserted, error } = await supabase.from("invoices").insert({
      company_id: companyId,
      invoice_number: invNum,
      invoice_type: "receivable",
      client_name: lease.tenant_name,
      property_id: lease.property_id,
      invoice_date: dueDate,
      due_date: dueDate,
      subtotal: lease.monthly_rent,
      tax_amount: 0,
      total_amount: lease.monthly_rent,
      amount_paid: 0,
      status: "pending",
      gl_account_id: rentalIncomeId,
      line_items: [
        {
          description: `Monthly Rent - ${lease.tenant_name}`,
          quantity: 1,
          unit_price: lease.monthly_rent,
          amount: lease.monthly_rent,
        },
      ],
      notes: noteTag,
    }).select("id").single();
    if (!error && inserted) {
      invoicesCreated++;
      newRentInvoices.push({
        id: inserted.id,
        amount: lease.monthly_rent,
        tenant: lease.tenant_name,
        propertyId: lease.property_id,
      });
    }
  }

  // Create a single batch JE for all new rent invoices (DR AR, CR Revenue)
  if (newRentInvoices.length > 0 && arAccountId && rentalIncomeId) {
    const totalRent = newRentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id ?? null;

    const { data: jeEntry } = await supabase.from("journal_entries").insert({
      company_id: companyId,
      entry_number: `AUTO-RENT-${currentMonthStr}`,
      entry_date: `${currentMonthStr}-01`,
      description: `Monthly Rent Charges - ${currentMonthStr} (${newRentInvoices.length} leases)`,
      reference: `auto-rent-batch-${currentMonthStr}`,
      status: "posted",
      created_by: userId,
    }).select("id").single();

    if (jeEntry) {
      await supabase.from("journal_entry_lines").insert([
        {
          company_id: companyId,
          journal_entry_id: jeEntry.id,
          account_id: arAccountId,
          debit: totalRent,
          credit: 0,
          description: `Accounts Receivable - ${newRentInvoices.length} rent invoices`,
        },
        {
          company_id: companyId,
          journal_entry_id: jeEntry.id,
          account_id: rentalIncomeId,
          debit: 0,
          credit: totalRent,
          description: `Rental Income - ${currentMonthStr}`,
        },
      ]);
    }
  }

  // ── 5. Create payable invoices for maintenance requests ──
  let maintQuery = supabase
    .from("maintenance_requests")
    .select("id, property_id, title, estimated_cost, actual_cost, status, category")
    .eq("company_id", companyId)
    .in("status", ["submitted", "assigned", "in_progress", "completed"]);
  if (propertyId) {
    maintQuery = maintQuery.eq("property_id", propertyId);
  }
  const { data: maintRequests } = await maintQuery;

  const { data: existingMaintInvoices } = await supabase
    .from("invoices")
    .select("id, notes")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .like("notes", "auto-maint-%");
  const existingMaintSet = new Set(
    (existingMaintInvoices ?? []).map((i) => i.notes)
  );

  const newMaintInvoices: { id: string; amount: number; title: string; propertyId: string }[] = [];

  for (const m of maintRequests ?? []) {
    const cost = m.actual_cost ?? m.estimated_cost;
    if (!cost || cost <= 0) continue;

    const noteTag = `auto-maint-${m.id}`;
    if (existingMaintSet.has(noteTag)) continue;

    const invNum = `MAINT-${m.title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase()}`;
    const today = now.toISOString().slice(0, 10);

    const { data: inserted, error } = await supabase.from("invoices").insert({
      company_id: companyId,
      invoice_number: invNum,
      invoice_type: "payable",
      vendor_name: `Maintenance - ${m.category || "General"}`,
      property_id: m.property_id,
      invoice_date: today,
      due_date: today,
      subtotal: cost,
      tax_amount: 0,
      total_amount: cost,
      amount_paid: m.status === "completed" ? cost : 0,
      status: m.status === "completed" ? "paid" : "pending",
      gl_account_id: repairsExpenseId,
      line_items: [
        {
          description: m.title,
          quantity: 1,
          unit_price: cost,
          amount: cost,
        },
      ],
      notes: noteTag,
    }).select("id").single();
    if (!error && inserted) {
      invoicesCreated++;
      newMaintInvoices.push({ id: inserted.id, amount: cost, title: m.title, propertyId: m.property_id });
    }
  }

  // Create batch JE for maintenance invoices (DR Expense, CR AP)
  if (newMaintInvoices.length > 0 && repairsExpenseId && apAccountId) {
    const totalMaint = newMaintInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id ?? null;

    const { data: jeEntry } = await supabase.from("journal_entries").insert({
      company_id: companyId,
      entry_number: `AUTO-MAINT-${currentMonthStr}`,
      entry_date: now.toISOString().slice(0, 10),
      description: `Maintenance Expenses - ${newMaintInvoices.length} work orders`,
      reference: `auto-maint-batch-${currentMonthStr}`,
      status: "posted",
      created_by: userId,
    }).select("id").single();

    if (jeEntry) {
      await supabase.from("journal_entry_lines").insert([
        {
          company_id: companyId,
          journal_entry_id: jeEntry.id,
          account_id: repairsExpenseId,
          debit: totalMaint,
          credit: 0,
          description: `Maintenance expenses - ${newMaintInvoices.length} work orders`,
        },
        {
          company_id: companyId,
          journal_entry_id: jeEntry.id,
          account_id: apAccountId,
          debit: 0,
          credit: totalMaint,
          description: `Accounts Payable - maintenance`,
        },
      ]);
    }
  }

  // ── 6. Recalculate property stats ──
  let propsQuery = supabase
    .from("properties")
    .select("id")
    .eq("company_id", companyId);
  if (propertyId) {
    propsQuery = propsQuery.eq("id", propertyId);
  }
  const { data: properties } = await propsQuery;

  for (const prop of properties ?? []) {
    const [propRes, unitsRes, activeLeasesRes] = await Promise.all([
      supabase
        .from("properties")
        .select("total_units")
        .eq("id", prop.id)
        .single(),
      supabase
        .from("units")
        .select("id, status")
        .eq("company_id", companyId)
        .eq("property_id", prop.id),
      supabase
        .from("leases")
        .select("monthly_rent")
        .eq("company_id", companyId)
        .eq("property_id", prop.id)
        .eq("status", "active"),
    ]);

    const storedTotal = propRes.data?.total_units ?? 0;
    const units = unitsRes.data ?? [];
    const propLeases = activeLeasesRes.data ?? [];
    // Use the greater of unit records or stored total_units so properties
    // with vacant units (no unit record) still show correct capacity.
    const totalUnits = Math.max(units.length, storedTotal);
    const occupiedCount = units.filter((u) => u.status === "occupied").length;
    const monthlyRevenue = propLeases.reduce(
      (sum, l) => sum + (l.monthly_rent ?? 0),
      0
    );
    const occupancyRate =
      totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;

    await supabase
      .from("properties")
      .update({
        total_units: totalUnits,
        occupied_units: occupiedCount,
        occupancy_rate: occupancyRate,
        monthly_revenue: monthlyRevenue,
        noi: monthlyRevenue,
      })
      .eq("id", prop.id);

    propertiesUpdated++;
  }

  return { rentPaymentsCreated, invoicesCreated, propertiesUpdated };
}

// ---------------------------------------------------------------------------
// getPropertiesOverview - Overview dashboard data
// ---------------------------------------------------------------------------

export interface PropertiesOverviewData {
  properties: PropertyRow[];
  totalProperties: number;
  totalUnits: number;
  totalOccupied: number;
  avgOccupancy: number;
  totalRevenue: number;
  totalNOI: number;
  openMaintenanceCount: number;
  occupancyByProperty: { name: string; rate: number }[];
  revenueByType: { type: string; revenue: number }[];
  expiringLeases: (LeaseRow & { property_name?: string; unit_number?: string })[];
  openMaintenance: (MaintenanceRequestRow & { property_name?: string })[];
}

export async function getPropertiesOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<PropertiesOverviewData> {
  const now = new Date();
  const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [propsRes, maintRes, leasesRes, allUnitsRes, allActiveLeasesRes] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("company_id", companyId)
      .order("name"),
    supabase
      .from("maintenance_requests")
      .select("*, property:properties!maintenance_requests_property_id_fkey(name)")
      .eq("company_id", companyId)
      .in("status", ["submitted", "assigned", "in_progress"])
      .order("priority", { ascending: true })
      .limit(10),
    supabase
      .from("leases")
      .select("*, property:properties!leases_property_id_fkey(name), units!leases_unit_id_fkey(unit_number)")
      .eq("company_id", companyId)
      .eq("status", "active")
      .lte("lease_end", sixtyDaysOut)
      .gte("lease_end", now.toISOString().slice(0, 10))
      .order("lease_end", { ascending: true })
      .limit(8),
    // Fetch all units to recalculate occupancy from live data
    supabase
      .from("units")
      .select("id, property_id, status")
      .eq("company_id", companyId),
    // Fetch all active leases to recalculate revenue from live data
    supabase
      .from("leases")
      .select("property_id, monthly_rent, status")
      .eq("company_id", companyId)
      .eq("status", "active"),
  ]);

  const properties = (propsRes.data ?? []) as PropertyRow[];
  const maint = maintRes.data ?? [];
  const leases = leasesRes.data ?? [];
  const allUnits = allUnitsRes.data ?? [];
  const allActiveLeases = allActiveLeasesRes.data ?? [];

  // Recalculate stats from live units/leases data (stored values may be stale)
  for (const prop of properties) {
    const propUnits = allUnits.filter((u) => u.property_id === prop.id);
    const propLeases = allActiveLeases.filter((l) => l.property_id === prop.id);
    const totalUnits = Math.max(propUnits.length, prop.total_units ?? 0);
    const occupiedCount = propUnits.filter((u) => u.status === "occupied").length;
    const monthlyRevenue = propLeases.reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0);
    const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;

    prop.total_units = totalUnits;
    prop.occupied_units = occupiedCount;
    prop.occupancy_rate = occupancyRate;
    prop.monthly_revenue = monthlyRevenue;
    prop.noi = monthlyRevenue;
  }

  const totalProperties = properties.length;
  const totalUnits = properties.reduce((s, p) => s + (p.total_units ?? 0), 0);
  const totalOccupied = properties.reduce((s, p) => s + (p.occupied_units ?? 0), 0);
  const avgOccupancy = totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0;
  const totalRevenue = properties.reduce((s, p) => s + (p.monthly_revenue ?? 0), 0);
  const totalNOI = properties.reduce((s, p) => s + (p.noi ?? 0), 0);

  const occupancyByProperty = properties.map((p) => ({
    name: p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name,
    rate: p.total_units > 0
      ? (p.occupied_units / p.total_units) * 100
      : 0,
  }));

  const typeMap = new Map<string, number>();
  for (const p of properties) {
    const t = p.property_type || "other";
    typeMap.set(t, (typeMap.get(t) ?? 0) + (p.monthly_revenue ?? 0));
  }
  const revenueByType = Array.from(typeMap.entries()).map(([type, revenue]) => ({
    type,
    revenue,
  }));

  const expiringLeases = leases.map((l: Record<string, unknown>) => ({
    ...l,
    property_name: (l.property as { name?: string } | null)?.name ?? "",
    unit_number: (l.units as { unit_number?: string } | null)?.unit_number ?? "",
  })) as (LeaseRow & { property_name?: string; unit_number?: string })[];

  const openMaintenance = maint.map((m: Record<string, unknown>) => ({
    ...m,
    property_name: (m.property as { name?: string } | null)?.name ?? "",
  })) as (MaintenanceRequestRow & { property_name?: string })[];

  return {
    properties,
    totalProperties,
    totalUnits,
    totalOccupied,
    avgOccupancy,
    totalRevenue,
    totalNOI,
    openMaintenanceCount: maint.length,
    occupancyByProperty,
    revenueByType,
    expiringLeases,
    openMaintenance,
  };
}

/* =========================================================
   Property Announcements
   ========================================================= */

export interface AnnouncementRow {
  id: string;
  company_id: string;
  property_id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  published_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPropertyAnnouncements(
  supabase: SupabaseClient,
  propertyId: string
): Promise<AnnouncementRow[]> {
  const { data } = await supabase
    .from("tenant_announcements")
    .select("*")
    .eq("property_id", propertyId)
    .order("published_at", { ascending: false });

  return (data ?? []) as AnnouncementRow[];
}
