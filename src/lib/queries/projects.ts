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

  const projects = (data ?? []) as ProjectRow[];

  // -------------------------------------------------------------------------
  // Fill in missing financial data for projects that have null/0 values.
  // Computes actual_cost from linked invoices, contract_amount from matching
  // property. Done in batch to avoid N+1 queries.
  // -------------------------------------------------------------------------
  const needActualCost = projects.filter(
    (p) => !p.actual_cost || p.actual_cost === 0
  );
  const needContract = projects.filter(
    (p) => !p.contract_amount || p.contract_amount === 0
  );

  if (needActualCost.length > 0 || needContract.length > 0) {
    const [invoicesRes, propsRes] = await Promise.all([
      needActualCost.length > 0
        ? supabase
            .from("invoices")
            .select("project_id, total_amount")
            .eq("company_id", companyId)
            .in(
              "project_id",
              needActualCost.map((p) => p.id)
            )
        : Promise.resolve({ data: null }),
      needContract.length > 0
        ? supabase
            .from("properties")
            .select("name, current_value, purchase_price")
            .eq("company_id", companyId)
        : Promise.resolve({ data: null }),
    ]);

    // Sum invoices by project
    if (invoicesRes.data) {
      const costByProject = new Map<string, number>();
      for (const inv of invoicesRes.data) {
        if (inv.project_id) {
          costByProject.set(
            inv.project_id,
            (costByProject.get(inv.project_id) ?? 0) + (inv.total_amount ?? 0)
          );
        }
      }
      for (const p of needActualCost) {
        const computed = costByProject.get(p.id);
        if (computed && computed > 0) p.actual_cost = computed;
      }
    }

    // Match properties by name for contract_amount
    if (propsRes.data) {
      const propByName = new Map<string, { current_value: number | null; purchase_price: number | null }>();
      for (const prop of propsRes.data) {
        propByName.set(prop.name.trim().toLowerCase(), prop);
      }
      for (const p of needContract) {
        const match = propByName.get(p.name.trim().toLowerCase());
        if (match) {
          p.contract_amount =
            match.current_value ?? match.purchase_price ?? null;
        }
      }
    }
  }

  return projects;
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

  // ---------------------------------------------------------------------------
  // Compute missing financial data and completion % from real sources.
  // This ensures projects auto-created during import show real financials.
  // ---------------------------------------------------------------------------
  const proj = project as ProjectRow;
  const taskList = (tasks ?? []) as ProjectTask[];

  // Actual cost from linked invoices
  if (!proj.actual_cost || proj.actual_cost === 0) {
    const { data: invTotals } = await supabase
      .from("invoices")
      .select("total_amount")
      .eq("project_id", projectId);
    if (invTotals && invTotals.length > 0) {
      proj.actual_cost = invTotals.reduce(
        (sum: number, inv: { total_amount: number | null }) =>
          sum + (inv.total_amount ?? 0),
        0
      );
    }
  }

  // Contract amount from matching property
  let matchProp: { current_value: number | null; purchase_price: number | null; occupancy_rate: number | null } | null = null;
  if (!proj.contract_amount || proj.contract_amount === 0 || !proj.completion_pct) {
    const { data: mp } = await supabase
      .from("properties")
      .select("current_value, purchase_price, occupancy_rate")
      .eq("company_id", proj.company_id)
      .ilike("name", proj.name)
      .limit(1)
      .maybeSingle();
    matchProp = mp;
    if (matchProp && (!proj.contract_amount || proj.contract_amount === 0)) {
      proj.contract_amount =
        matchProp.current_value ?? matchProp.purchase_price ?? null;
    }
  }

  // Completion %: use property occupancy, task average, or leave as-is
  if (!proj.completion_pct || proj.completion_pct === 0) {
    // Try property occupancy rate first (property-based projects)
    if (matchProp?.occupancy_rate && matchProp.occupancy_rate > 0) {
      proj.completion_pct = Math.round(matchProp.occupancy_rate);
    }
    // Otherwise compute from task completion average
    else if (taskList.length > 0) {
      const avgCompletion =
        taskList.reduce((sum, t) => sum + (t.completion_pct ?? 0), 0) /
        taskList.length;
      proj.completion_pct = Math.round(avgCompletion);
    }
  }

  return {
    project: proj,
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

// ---------------------------------------------------------------------------
// getProjectsOverview - Overview dashboard data
// ---------------------------------------------------------------------------

export interface ProjectsOverviewData {
  projects: ProjectRow[];
  activeCount: number;
  totalContractValue: number;
  avgCompletion: number;
  openRFICount: number;
  openCOCount: number;
  statusBreakdown: { status: string; count: number }[];
  budgetProjects: { name: string; estimated: number; actual: number }[];
  attentionProjects: {
    id: string;
    name: string;
    status: ProjectStatus;
    completion_pct: number;
    openRFIs: number;
    openCOs: number;
  }[];
  upcomingMilestones: {
    id: string;
    name: string;
    project_name: string;
    project_id: string;
    end_date: string;
  }[];
}

export async function getProjectsOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<ProjectsOverviewData> {
  const [projectsRes, rfisRes, cosRes, phasesRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, estimated_end_date")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rfis")
      .select("id, project_id, status")
      .eq("company_id", companyId)
      .in("status", ["open", "submitted"]),
    supabase
      .from("change_orders")
      .select("id, project_id, status")
      .eq("company_id", companyId)
      .in("status", ["draft", "submitted", "pending"]),
    supabase
      .from("project_phases")
      .select("id, name, project_id, end_date")
      .eq("company_id", companyId)
      .not("end_date", "is", null)
      .gte("end_date", new Date().toISOString().slice(0, 10))
      .order("end_date", { ascending: true })
      .limit(6),
  ]);

  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const rfis = rfisRes.data ?? [];
  const cos = cosRes.data ?? [];
  const phases = phasesRes.data ?? [];

  // Enrich projects missing financial data (same logic as getProjects)
  const needActual = projects.filter((p) => !p.actual_cost || p.actual_cost === 0);
  const needContract = projects.filter((p) => !p.contract_amount || p.contract_amount === 0);
  if (needActual.length > 0 || needContract.length > 0) {
    const [invRes, propRes] = await Promise.all([
      needActual.length > 0
        ? supabase
            .from("invoices")
            .select("project_id, total_amount")
            .eq("company_id", companyId)
            .in("project_id", needActual.map((p) => p.id))
        : Promise.resolve({ data: null }),
      needContract.length > 0
        ? supabase
            .from("properties")
            .select("name, current_value, purchase_price")
            .eq("company_id", companyId)
        : Promise.resolve({ data: null }),
    ]);
    if (invRes.data) {
      const costMap = new Map<string, number>();
      for (const inv of invRes.data) {
        if (inv.project_id) {
          costMap.set(inv.project_id, (costMap.get(inv.project_id) ?? 0) + (inv.total_amount ?? 0));
        }
      }
      for (const p of needActual) {
        const c = costMap.get(p.id);
        if (c && c > 0) p.actual_cost = c;
      }
    }
    if (propRes.data) {
      const propMap = new Map<string, { current_value: number | null; purchase_price: number | null }>();
      for (const pr of propRes.data) propMap.set(pr.name.trim().toLowerCase(), pr);
      for (const p of needContract) {
        const m = propMap.get(p.name.trim().toLowerCase());
        if (m) p.contract_amount = m.current_value ?? m.purchase_price ?? null;
      }
    }
  }

  const activeProjects = projects.filter((p) => p.status === "active");
  const activeCount = activeProjects.length;
  const totalContractValue = activeProjects.reduce(
    (sum, p) => sum + (p.contract_amount ?? 0),
    0
  );
  const avgCompletion =
    activeProjects.length > 0
      ? activeProjects.reduce((sum, p) => sum + (p.completion_pct ?? 0), 0) /
        activeProjects.length
      : 0;

  // Status breakdown
  const statusMap = new Map<string, number>();
  for (const p of projects) {
    statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);
  }
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  // RFI/CO counts per project
  const rfiByProject = new Map<string, number>();
  for (const r of rfis) {
    rfiByProject.set(r.project_id, (rfiByProject.get(r.project_id) ?? 0) + 1);
  }
  const coByProject = new Map<string, number>();
  for (const c of cos) {
    coByProject.set(c.project_id, (coByProject.get(c.project_id) ?? 0) + 1);
  }

  // Budget vs actual (top 8 by contract value)
  const budgetProjects = projects
    .filter((p) => (p.estimated_cost ?? 0) > 0 || (p.actual_cost ?? 0) > 0)
    .sort((a, b) => (b.contract_amount ?? 0) - (a.contract_amount ?? 0))
    .slice(0, 8)
    .map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name,
      estimated: p.estimated_cost ?? 0,
      actual: p.actual_cost ?? 0,
    }));

  // Projects needing attention
  const attentionProjects = projects
    .filter((p) => p.status !== "completed" && p.status !== "closed")
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      completion_pct: p.completion_pct ?? 0,
      openRFIs: rfiByProject.get(p.id) ?? 0,
      openCOs: coByProject.get(p.id) ?? 0,
    }))
    .filter((p) => p.openRFIs > 0 || p.openCOs > 0)
    .sort((a, b) => (b.openRFIs + b.openCOs) - (a.openRFIs + a.openCOs))
    .slice(0, 8);

  // Upcoming milestones
  const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));
  const upcomingMilestones = phases.map((ph) => ({
    id: ph.id,
    name: ph.name,
    project_name: projectNameMap.get(ph.project_id) ?? "Unknown",
    project_id: ph.project_id,
    end_date: ph.end_date!,
  }));

  return {
    projects,
    activeCount,
    totalContractValue,
    avgCompletion,
    openRFICount: rfis.length,
    openCOCount: cos.length,
    statusBreakdown,
    budgetProjects,
    attentionProjects,
    upcomingMilestones,
  };
}
