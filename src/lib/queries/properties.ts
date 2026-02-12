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
  return (data ?? []) as PropertyRow[];
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

  return {
    property: property as PropertyRow,
    units: (unitsRes.data ?? []) as UnitRow[],
    leases: (leasesRes.data ?? []) as LeaseRow[],
    maintenanceRequests: (maintRes.data ?? []) as MaintenanceRequestRow[],
  };
}

/* ---------------------------------------------------------
   getPropertyFinancials - Revenue, expenses, NOI, rent rate
   --------------------------------------------------------- */

export interface PropertyFinancials {
  monthlyRevenue: number;
  monthlyExpenses: number;
  noi: number;
  rentCollectionRate: number;
  totalPaid: number;
  totalDue: number;
}

export async function getPropertyFinancials(
  supabase: SupabaseClient,
  propertyId: string
): Promise<PropertyFinancials> {
  // Get the property's base financials
  const { data: property } = await supabase
    .from("properties")
    .select("monthly_revenue, monthly_expenses, noi")
    .eq("id", propertyId)
    .single();

  const monthlyRevenue = property?.monthly_revenue ?? 0;
  const monthlyExpenses = property?.monthly_expenses ?? 0;
  const noi = property?.noi ?? monthlyRevenue - monthlyExpenses;

  // Get active leases for this property to compute rent collection
  const { data: leases } = await supabase
    .from("leases")
    .select("id, monthly_rent")
    .eq("property_id", propertyId)
    .eq("status", "active");

  const leaseIds = (leases ?? []).map((l) => l.id);
  let totalPaid = 0;
  let totalDue = 0;

  if (leaseIds.length > 0) {
    // Current month payments
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const { data: payments } = await supabase
      .from("rent_payments")
      .select("amount, status, due_date")
      .in("lease_id", leaseIds)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd);

    for (const p of payments ?? []) {
      totalDue += p.amount;
      if (p.status === "paid") {
        totalPaid += p.amount;
      }
    }
  }

  const rentCollectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 100;

  return {
    monthlyRevenue,
    monthlyExpenses,
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
