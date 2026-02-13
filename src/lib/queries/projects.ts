import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectStatus =
  | "pre_construction"
  | "active"
  | "on_hold"
  | "completed"
  | "closed";

export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
}

export interface ProjectRow {
  id: string;
  company_id: string;
  name: string;
  code: string;
  description: string | null;
  status: ProjectStatus;
  project_type: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  client_name: string | null;
  contract_amount: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  start_date: string | null;
  estimated_end_date: string | null;
  actual_end_date: string | null;
  completion_pct: number;
  project_manager_id: string | null;
  superintendent_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional, populated by certain queries)
  project_manager?: { id: string; full_name: string } | null;
  superintendent?: { id: string; full_name: string } | null;
}

export interface ProjectPhase {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  sort_order: number;
  color: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ProjectTask {
  id: string;
  company_id: string;
  project_id: string;
  phase_id: string | null;
  parent_task_id: string | null;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  completion_pct: number;
  is_milestone: boolean;
  is_critical_path: boolean;
  dependency_ids: string[] | null;
  sort_order: number;
  assignee?: { id: string; full_name: string } | null;
}

export interface DailyLog {
  id: string;
  company_id: string;
  project_id: string;
  log_date: string;
  created_by: string;
  weather_conditions: string | null;
  weather_temp_high: number | null;
  weather_temp_low: number | null;
  weather_wind_mph: number | null;
  weather_humidity_pct: number | null;
  weather_precipitation: string | null;
  workforce: Record<string, unknown>[] | null;
  equipment: Record<string, unknown>[] | null;
  work_performed: string | null;
  materials_received: string | null;
  safety_incidents: string | null;
  delays: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  creator?: { id: string; full_name: string } | null;
}

export interface RFI {
  id: string;
  company_id: string;
  project_id: string;
  rfi_number: string;
  subject: string;
  question: string | null;
  answer: string | null;
  status: string;
  priority: string;
  submitted_by: string | null;
  assigned_to: string | null;
  due_date: string | null;
  answered_at: string | null;
  answered_by: string | null;
  cost_impact: number | null;
  schedule_impact_days: number | null;
  created_at: string;
  assignee?: { id: string; full_name: string } | null;
}

export interface ChangeOrder {
  id: string;
  company_id: string;
  project_id: string;
  co_number: string;
  title: string;
  description: string | null;
  status: string;
  reason: string | null;
  amount: number | null;
  schedule_impact_days: number | null;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  line_items: Record<string, unknown>[] | null;
  created_at: string;
}

export interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  open_rfis: number;
  open_change_orders: number;
  daily_log_count: number;
  total_co_amount: number;
}

// ---------------------------------------------------------------------------
// Helper: getCurrentUserCompany
// ---------------------------------------------------------------------------

export async function getCurrentUserCompany(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: membership, error: memberError } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (memberError || !membership) {
    return null;
  }

  return {
    userId: user.id,
    companyId: membership.company_id as string,
    role: membership.role as string,
  };
}

// ---------------------------------------------------------------------------
// getProjects - list with optional filters
// ---------------------------------------------------------------------------

export async function getProjects(
  supabase: SupabaseClient,
  companyId: string,
  filters?: ProjectFilters
) {
  let query = supabase
    .from("projects")
    .select(
      `
      *,
      project_manager:user_profiles!projects_pm_profile_fkey(id, full_name),
      superintendent:user_profiles!projects_super_profile_fkey(id, full_name)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term},code.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getProjects error:", error);
    return [];
  }

  return (data ?? []) as ProjectRow[];
}

// ---------------------------------------------------------------------------
// getProjectById - full project with phases, tasks, stats
// ---------------------------------------------------------------------------

export async function getProjectById(
  supabase: SupabaseClient,
  projectId: string
) {
  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
      *,
      project_manager:user_profiles!projects_pm_profile_fkey(id, full_name),
      superintendent:user_profiles!projects_super_profile_fkey(id, full_name)
    `
    )
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("getProjectById error:", projectError);
    return null;
  }

  // Fetch phases
  const { data: phases } = await supabase
    .from("project_phases")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select(
      `
      *,
      assignee:user_profiles!project_tasks_assignee_profile_fkey(id, full_name)
    `
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  // Fetch daily logs
  const { data: dailyLogs } = await supabase
    .from("daily_logs")
    .select(
      `
      *,
      creator:user_profiles!daily_logs_creator_profile_fkey(id, full_name)
    `
    )
    .eq("project_id", projectId)
    .order("log_date", { ascending: false });

  // Fetch RFIs
  const { data: rfis } = await supabase
    .from("rfis")
    .select(
      `
      *,
      assignee:user_profiles!rfis_assignee_profile_fkey(id, full_name)
    `
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Fetch Change Orders
  const { data: changeOrders } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return {
    project: project as ProjectRow,
    phases: (phases ?? []) as ProjectPhase[],
    tasks: (tasks ?? []) as ProjectTask[],
    dailyLogs: (dailyLogs ?? []) as DailyLog[],
    rfis: (rfis ?? []) as RFI[],
    changeOrders: (changeOrders ?? []) as ChangeOrder[],
  };
}

// ---------------------------------------------------------------------------
// getProjectStats - aggregated counts
// ---------------------------------------------------------------------------

export async function getProjectStats(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectStats> {
  const [tasksRes, rfisRes, cosRes, logsRes] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id, status", { count: "exact" })
      .eq("project_id", projectId),
    supabase
      .from("rfis")
      .select("id, status", { count: "exact" })
      .eq("project_id", projectId),
    supabase
      .from("change_orders")
      .select("id, status, amount", { count: "exact" })
      .eq("project_id", projectId),
    supabase
      .from("daily_logs")
      .select("id", { count: "exact" })
      .eq("project_id", projectId),
  ]);

  const tasks = tasksRes.data ?? [];
  const rfis = rfisRes.data ?? [];
  const cos = cosRes.data ?? [];

  const completedTasks = tasks.filter(
    (t: { status: string }) => t.status === "completed"
  ).length;

  const openRfis = rfis.filter(
    (r: { status: string }) => r.status === "open" || r.status === "submitted"
  ).length;

  const openCos = cos.filter(
    (c: { status: string }) =>
      c.status === "pending" || c.status === "submitted" || c.status === "draft"
  ).length;

  const totalCoAmount = cos.reduce(
    (sum: number, c: { amount: number | null }) => sum + (c.amount ?? 0),
    0
  );

  return {
    total_tasks: tasks.length,
    completed_tasks: completedTasks,
    open_rfis: openRfis,
    open_change_orders: openCos,
    daily_log_count: logsRes.count ?? 0,
    total_co_amount: totalCoAmount,
  };
}

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

export interface CreateProjectData {
  name: string;
  code: string;
  description?: string;
  project_type?: string;
  client_name?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip?: string;
  contract_amount?: number;
  estimated_cost?: number;
  start_date?: string;
  estimated_end_date?: string;
  project_manager_id?: string;
  superintendent_id?: string;
  metadata?: Record<string, unknown>;
}

export async function createProject(
  supabase: SupabaseClient,
  companyId: string,
  data: CreateProjectData
) {
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      project_type: data.project_type ?? null,
      client_name: data.client_name ?? null,
      address_line1: data.address_line1 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip: data.zip ?? null,
      contract_amount: data.contract_amount ?? null,
      estimated_cost: data.estimated_cost ?? null,
      start_date: data.start_date ?? null,
      estimated_end_date: data.estimated_end_date ?? null,
      project_manager_id: data.project_manager_id ?? null,
      superintendent_id: data.superintendent_id ?? null,
      metadata: data.metadata ?? null,
      status: "pre_construction",
      completion_pct: 0,
      actual_cost: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("createProject error:", error);
    return { project: null, error: error.message };
  }

  return { project, error: null };
}

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  data: Partial<CreateProjectData> & {
    status?: ProjectStatus;
    completion_pct?: number;
    actual_cost?: number;
    actual_end_date?: string;
  }
) {
  const { data: project, error } = await supabase
    .from("projects")
    .update(data)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    console.error("updateProject error:", error);
    return { project: null, error: error.message };
  }

  return { project, error: null };
}

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string
) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("deleteProject error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// getCompanyMembers - for dropdowns
// ---------------------------------------------------------------------------

export async function getCompanyMembers(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      user_id,
      role,
      user:user_profiles!company_members_user_profile_fkey(id, full_name, email)
    `
    )
    .eq("company_id", companyId)
    .order("role", { ascending: true });

  if (error) {
    console.error("getCompanyMembers error:", error);
    return [];
  }

  return data ?? [];
}
