import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EquipmentStatus = "available" | "in_use" | "maintenance" | "retired";
export type EquipmentType =
  | "excavator"
  | "loader"
  | "crane"
  | "truck"
  | "generator"
  | "compressor"
  | "scaffold"
  | "tools"
  | "other";

export type MaintenanceType =
  | "preventive"
  | "corrective"
  | "inspection"
  | "emergency";

export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type AssignmentStatus = "active" | "returned";

export interface EquipmentRow {
  id: string;
  company_id: string;
  name: string;
  equipment_type: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  status: EquipmentStatus;
  current_project_id: string | null;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  hourly_rate: number | null;
  total_hours: number | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  project?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string; email: string } | null;
}

export interface EquipmentStats {
  available: number;
  in_use: number;
  maintenance: number;
  retired: number;
  total: number;
}

export interface MaintenanceLogRow {
  id: string;
  company_id: string;
  equipment_id: string;
  maintenance_type: string;
  title: string;
  description: string | null;
  maintenance_date: string | null;
  cost: number | null;
  performed_by: string | null;
  vendor_name: string | null;
  status: string;
  next_due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  equipment?: { id: string; name: string; equipment_type: string } | null;
}

export interface EquipmentAssignmentRow {
  id: string;
  company_id: string;
  equipment_id: string;
  project_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_date: string;
  returned_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  equipment?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string; email: string } | null;
}

export interface CreateEquipmentData {
  name: string;
  equipment_type: string;
  make?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  hourly_rate?: number;
}

export interface UpdateEquipmentData {
  name?: string;
  equipment_type?: string;
  make?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status?: EquipmentStatus;
  current_project_id?: string | null;
  assigned_to?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  hourly_rate?: number | null;
  total_hours?: number | null;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;
}

export interface CreateMaintenanceData {
  equipment_id: string;
  maintenance_type: string;
  title: string;
  description?: string;
  maintenance_date?: string;
  cost?: number;
  performed_by?: string;
  vendor_name?: string;
  status?: string;
  next_due_date?: string;
  notes?: string;
}

export interface CreateAssignmentData {
  equipment_id: string;
  project_id?: string;
  assigned_to?: string;
  notes?: string;
}

export interface EquipmentFilters {
  status?: EquipmentStatus;
  equipment_type?: string;
  search?: string;
}

export interface MaintenanceFilters {
  maintenance_type?: string;
  status?: string;
  equipment_id?: string;
}

export interface AssignmentFilters {
  status?: AssignmentStatus;
  equipment_id?: string;
  project_id?: string;
}

// ---------------------------------------------------------------------------
// getEquipmentList -- list all equipment for a company with project/assignee
// ---------------------------------------------------------------------------

export async function getEquipmentList(
  supabase: SupabaseClient,
  companyId: string,
  filters?: EquipmentFilters
) {
  let query = supabase
    .from("equipment")
    .select(
      `
      *,
      project:projects!equipment_current_project_id_fkey(id, name),
      assignee:user_profiles!equipment_assignee_profile_fkey(id, full_name, email)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.equipment_type) {
    query = query.eq("equipment_type", filters.equipment_type);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${term},make.ilike.${term},model.ilike.${term},serial_number.ilike.${term}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getEquipmentList error:", error);
    return [];
  }

  return (data ?? []) as EquipmentRow[];
}

// ---------------------------------------------------------------------------
// getEquipmentStats -- counts by status
// ---------------------------------------------------------------------------

export async function getEquipmentStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<EquipmentStats> {
  const { data, error } = await supabase
    .from("equipment")
    .select("id, status")
    .eq("company_id", companyId);

  if (error) {
    console.error("getEquipmentStats error:", error);
    return { available: 0, in_use: 0, maintenance: 0, retired: 0, total: 0 };
  }

  const items = data ?? [];
  const stats: EquipmentStats = {
    available: 0,
    in_use: 0,
    maintenance: 0,
    retired: 0,
    total: items.length,
  };

  for (const item of items) {
    const s = item.status as EquipmentStatus;
    if (s in stats) {
      stats[s]++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// createEquipment -- insert equipment record
// ---------------------------------------------------------------------------

export async function createEquipment(
  supabase: SupabaseClient,
  companyId: string,
  data: CreateEquipmentData
) {
  const { data: equipment, error } = await supabase
    .from("equipment")
    .insert({
      company_id: companyId,
      name: data.name,
      equipment_type: data.equipment_type,
      make: data.make ?? null,
      model: data.model ?? null,
      serial_number: data.serial_number ?? null,
      purchase_date: data.purchase_date ?? null,
      purchase_cost: data.purchase_cost ?? null,
      hourly_rate: data.hourly_rate ?? null,
      status: "available",
    })
    .select()
    .single();

  if (error) {
    console.error("createEquipment error:", error);
    return { equipment: null, error: error.message };
  }

  return { equipment, error: null };
}

// ---------------------------------------------------------------------------
// updateEquipment -- update equipment fields
// ---------------------------------------------------------------------------

export async function updateEquipment(
  supabase: SupabaseClient,
  equipmentId: string,
  data: UpdateEquipmentData
) {
  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: equipment, error } = await supabase
    .from("equipment")
    .update(updatePayload)
    .eq("id", equipmentId)
    .select()
    .single();

  if (error) {
    console.error("updateEquipment error:", error);
    return { equipment: null, error: error.message };
  }

  return { equipment, error: null };
}

// ---------------------------------------------------------------------------
// getEquipmentById -- single equipment with project/assignee joins
// ---------------------------------------------------------------------------

export async function getEquipmentById(
  supabase: SupabaseClient,
  equipmentId: string
) {
  const { data, error } = await supabase
    .from("equipment")
    .select(
      `
      *,
      project:projects!equipment_current_project_id_fkey(id, name),
      assignee:user_profiles!equipment_assignee_profile_fkey(id, full_name, email)
    `
    )
    .eq("id", equipmentId)
    .single();

  if (error) {
    console.error("getEquipmentById error:", error);
    return null;
  }

  return data as EquipmentRow;
}

// ---------------------------------------------------------------------------
// getMaintenanceLogs -- list maintenance logs with equipment join
// ---------------------------------------------------------------------------

export async function getMaintenanceLogs(
  supabase: SupabaseClient,
  companyId: string,
  filters?: MaintenanceFilters
) {
  let query = supabase
    .from("equipment_maintenance_logs")
    .select(
      `
      *,
      equipment:equipment(id, name, equipment_type)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.maintenance_type) {
    query = query.eq("maintenance_type", filters.maintenance_type);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.equipment_id) {
    query = query.eq("equipment_id", filters.equipment_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getMaintenanceLogs error:", error);
    return [];
  }

  return (data ?? []) as MaintenanceLogRow[];
}

// ---------------------------------------------------------------------------
// createMaintenanceLog -- insert maintenance log
// ---------------------------------------------------------------------------

export async function createMaintenanceLog(
  supabase: SupabaseClient,
  companyId: string,
  data: CreateMaintenanceData
) {
  const { data: log, error } = await supabase
    .from("equipment_maintenance_logs")
    .insert({
      company_id: companyId,
      equipment_id: data.equipment_id,
      maintenance_type: data.maintenance_type,
      title: data.title,
      description: data.description ?? null,
      maintenance_date: data.maintenance_date ?? null,
      cost: data.cost ?? null,
      performed_by: data.performed_by ?? null,
      vendor_name: data.vendor_name ?? null,
      status: data.status ?? "scheduled",
      next_due_date: data.next_due_date ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createMaintenanceLog error:", error);
    return { log: null, error: error.message };
  }

  return { log, error: null };
}

// ---------------------------------------------------------------------------
// updateMaintenanceLog -- update a maintenance log
// ---------------------------------------------------------------------------

export async function updateMaintenanceLog(
  supabase: SupabaseClient,
  logId: string,
  data: Record<string, unknown>
) {
  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: log, error } = await supabase
    .from("equipment_maintenance_logs")
    .update(updatePayload)
    .eq("id", logId)
    .select()
    .single();

  if (error) {
    console.error("updateMaintenanceLog error:", error);
    return { log: null, error: error.message };
  }

  return { log, error: null };
}

// ---------------------------------------------------------------------------
// getAssignments -- list assignments with equipment/project/assignee joins
// ---------------------------------------------------------------------------

export async function getAssignments(
  supabase: SupabaseClient,
  companyId: string,
  filters?: AssignmentFilters
) {
  let query = supabase
    .from("equipment_assignments")
    .select(
      `
      *,
      equipment:equipment(id, name),
      project:projects(id, name),
      assignee:user_profiles!equip_assignments_assignee_profile_fkey(id, full_name, email)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.equipment_id) {
    query = query.eq("equipment_id", filters.equipment_id);
  }

  if (filters?.project_id) {
    query = query.eq("project_id", filters.project_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAssignments error:", error);
    return [];
  }

  return (data ?? []) as EquipmentAssignmentRow[];
}

// ---------------------------------------------------------------------------
// createAssignment -- assign equipment to a project/person, update equipment
// ---------------------------------------------------------------------------

export async function createAssignment(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateAssignmentData
) {
  // Insert assignment record
  const { data: assignment, error } = await supabase
    .from("equipment_assignments")
    .insert({
      company_id: companyId,
      equipment_id: data.equipment_id,
      project_id: data.project_id ?? null,
      assigned_to: data.assigned_to ?? null,
      assigned_by: userId,
      assigned_date: new Date().toISOString(),
      status: "active",
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createAssignment error:", error);
    return { assignment: null, error: error.message };
  }

  // Update equipment status, project, and assignee
  const { error: updateError } = await supabase
    .from("equipment")
    .update({
      status: "in_use",
      current_project_id: data.project_id ?? null,
      assigned_to: data.assigned_to ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.equipment_id);

  if (updateError) {
    console.error("createAssignment - equipment update error:", updateError);
  }

  return { assignment, error: null };
}

// ---------------------------------------------------------------------------
// returnEquipment -- set returned_date, status='returned', reset equipment
// ---------------------------------------------------------------------------

export async function returnEquipment(
  supabase: SupabaseClient,
  assignmentId: string
) {
  // Get the assignment to find the equipment_id
  const { data: assignment, error: fetchError } = await supabase
    .from("equipment_assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();

  if (fetchError || !assignment) {
    console.error("returnEquipment fetch error:", fetchError);
    return { assignment: null, error: fetchError?.message ?? "Assignment not found" };
  }

  // Update assignment to returned
  const { data: updated, error: updateError } = await supabase
    .from("equipment_assignments")
    .update({
      returned_date: new Date().toISOString(),
      status: "returned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .select()
    .single();

  if (updateError) {
    console.error("returnEquipment update error:", updateError);
    return { assignment: null, error: updateError.message };
  }

  // Reset equipment to available
  const { error: equipError } = await supabase
    .from("equipment")
    .update({
      status: "available",
      current_project_id: null,
      assigned_to: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignment.equipment_id);

  if (equipError) {
    console.error("returnEquipment - equipment reset error:", equipError);
  }

  return { assignment: updated, error: null };
}

// ---------------------------------------------------------------------------
// getEquipmentOverview - Overview dashboard data
// ---------------------------------------------------------------------------

export interface EquipmentOverviewData {
  stats: EquipmentStats;
  utilizationRate: number;
  totalAssetValue: number;
  totalMaintenanceCost: number;
  overdueMaintenanceCount: number;
  statusBreakdown: { status: string; count: number }[];
  typeBreakdown: { type: string; count: number }[];
  maintenanceAlerts: (EquipmentRow & { daysOverdue: number })[];
  activeAssignments: {
    id: string;
    equipment_name: string;
    project_name: string;
    assigned_to_name: string;
    assigned_date: string;
  }[];
}

export async function getEquipmentOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<EquipmentOverviewData> {
  const now = new Date();
  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [equipRes, statsRes, assignRes, maintCostRes, maintLogsRes] = await Promise.all([
    supabase
      .from("equipment")
      .select("*")
      .eq("company_id", companyId)
      .order("name"),
    getEquipmentStats(supabase, companyId),
    supabase
      .from("equipment_assignments")
      .select(`
        id, equipment_id, assigned_date,
        equipment:equipment(name),
        project:projects(name),
        assignee:user_profiles!equip_assignments_assignee_profile_fkey(full_name)
      `)
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("assigned_date", { ascending: false })
      .limit(20),
    supabase
      .from("equipment_maintenance_logs")
      .select("cost")
      .eq("company_id", companyId)
      .not("cost", "is", null)
      .gt("cost", 0),
    supabase
      .from("equipment_maintenance_logs")
      .select("equipment_id, next_due_date")
      .eq("company_id", companyId)
      .not("next_due_date", "is", null)
      .order("next_due_date", { ascending: false }),
  ]);

  const equipment = (equipRes.data ?? []) as EquipmentRow[];
  const stats = statsRes;
  const assignments = assignRes.data ?? [];

  // Build a map of equipment_id -> nearest next_due_date from maintenance logs
  const maintNextDueMap = new Map<string, string>();
  for (const log of maintLogsRes.data ?? []) {
    const eid = log.equipment_id as string;
    const d = log.next_due_date as string;
    if (!maintNextDueMap.has(eid) || d < maintNextDueMap.get(eid)!) {
      maintNextDueMap.set(eid, d);
    }
  }

  // Count distinct equipment with active assignments as "in use"
  const assignedEquipIds = new Set(
    assignments.map((a: Record<string, unknown>) => a.equipment_id as string)
  );
  const assignedInUse = assignedEquipIds.size;
  const effectiveInUse = Math.max(stats.in_use, assignedInUse);
  const nonRetired = stats.total - stats.retired;
  const utilizationRate = nonRetired > 0 ? (effectiveInUse / nonRetired) * 100 : 0;

  const totalAssetValue = equipment
    .filter((e) => e.status !== "retired")
    .reduce((sum, e) => sum + (e.purchase_cost ?? 0), 0);

  const totalMaintenanceCost = (maintCostRes.data ?? [])
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  // Status breakdown for chart
  const statusBreakdown = [
    { status: "available", count: stats.available },
    { status: "in_use", count: stats.in_use },
    { status: "maintenance", count: stats.maintenance },
    { status: "retired", count: stats.retired },
  ].filter((s) => s.count > 0);

  // Type breakdown
  const typeMap = new Map<string, number>();
  for (const e of equipment) {
    const t = e.equipment_type || "other";
    typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
  }
  const typeBreakdown = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  // Maintenance alerts (overdue + upcoming)
  // Use equipment.next_maintenance_date first, fallback to maintenance log next_due_date
  const todayStr = now.toISOString().slice(0, 10);
  const equipmentWithDates = equipment.map((e) => ({
    ...e,
    next_maintenance_date: e.next_maintenance_date || maintNextDueMap.get(e.id) || null,
  }));

  const maintenanceAlerts = equipmentWithDates
    .filter(
      (e) =>
        e.status !== "retired" &&
        e.next_maintenance_date &&
        e.next_maintenance_date <= fourteenDaysOut
    )
    .map((e) => ({
      ...e,
      daysOverdue: Math.floor(
        (now.getTime() - new Date(e.next_maintenance_date!).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 8);

  const overdueMaintenanceCount = equipmentWithDates.filter(
    (e) =>
      e.status !== "retired" &&
      e.next_maintenance_date &&
      e.next_maintenance_date < todayStr
  ).length;

  const activeAssignments = assignments.slice(0, 6).map((a: Record<string, unknown>) => ({
    id: a.id as string,
    equipment_name: (a.equipment as { name?: string } | null)?.name ?? "Unknown",
    project_name: (a.project as { name?: string } | null)?.name ?? "Unassigned",
    assigned_to_name: (a.assignee as { full_name?: string } | null)?.full_name ?? "Unknown",
    assigned_date: a.assigned_date as string,
  }));

  return {
    stats,
    utilizationRate,
    totalAssetValue,
    totalMaintenanceCost,
    overdueMaintenanceCount,
    statusBreakdown,
    typeBreakdown,
    maintenanceAlerts,
    activeAssignments,
  };
}
