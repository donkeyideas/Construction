import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyMember } from "./tickets";
import { formatDateSafe, toDateStr } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IncidentStatus = "reported" | "investigating" | "corrective_action" | "closed";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentType =
  | "near_miss"
  | "first_aid"
  | "recordable"
  | "lost_time"
  | "fatality"
  | "property_damage";

export type ToolboxTalkStatus = "scheduled" | "completed" | "cancelled";

export interface SafetyIncidentRow {
  id: string;
  company_id: string;
  incident_number: string;
  title: string;
  description: string | null;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  project_id: string | null;
  reported_by: string;
  assigned_to: string | null;
  incident_date: string;
  location: string | null;
  osha_recordable: boolean;
  corrective_actions: string | null;
  root_cause: string | null;
  witnesses: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  reporter?: { id: string; full_name: string; email: string } | null;
  assignee?: { id: string; full_name: string; email: string } | null;
  project?: { id: string; name: string } | null;
}

export interface ToolboxTalkRow {
  id: string;
  company_id: string;
  talk_number: string;
  title: string;
  description: string | null;
  topic: string | null;
  status: ToolboxTalkStatus;
  conducted_by: string;
  project_id: string | null;
  conducted_date: string;
  scheduled_date: string | null;
  attendee_count: number;
  attendees: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  conductor?: { id: string; full_name: string; email: string } | null;
  project?: { id: string; name: string } | null;
}

export interface SafetyStats {
  reported: number;
  investigating: number;
  corrective_action: number;
  closed: number;
  total: number;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  incident_type?: IncidentType;
  search?: string;
}

export interface ToolboxTalkFilters {
  status?: ToolboxTalkStatus;
  topic?: string;
  search?: string;
}

export interface CreateIncidentData {
  title: string;
  description?: string;
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  project_id?: string;
  assigned_to?: string;
  incident_date?: string;
  location?: string;
  osha_recordable?: boolean;
}

export interface UpdateIncidentData {
  title?: string;
  description?: string;
  incident_type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  project_id?: string | null;
  assigned_to?: string | null;
  incident_date?: string;
  location?: string;
  osha_recordable?: boolean;
  corrective_actions?: string;
  root_cause?: string;
  witnesses?: string;
}

export interface CreateToolboxTalkData {
  title: string;
  description?: string;
  topic?: string;
  scheduled_date?: string;
  project_id?: string;
  attendees_count?: number;
  attendees?: string;
  notes?: string;
}

export interface UpdateToolboxTalkData {
  title?: string;
  description?: string;
  topic?: string;
  status?: ToolboxTalkStatus;
  scheduled_date?: string;
  project_id?: string | null;
  attendees_count?: number;
  attendees?: string;
  notes?: string;
}

// Re-export CompanyMember for convenience
export type { CompanyMember };

// ---------------------------------------------------------------------------
// getIncidents — list all incidents for a company with reporter/assignee/project
// ---------------------------------------------------------------------------

export async function getIncidents(
  supabase: SupabaseClient,
  companyId: string,
  filters?: IncidentFilters
) {
  let query = supabase
    .from("safety_incidents")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.severity) {
    query = query.eq("severity", filters.severity);
  }

  if (filters?.incident_type) {
    query = query.eq("incident_type", filters.incident_type);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${term},incident_number.ilike.${term},description.ilike.${term}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getIncidents error:", error);
    return [];
  }

  const incidents = (data ?? []) as SafetyIncidentRow[];

  // Batch-fetch related profiles and projects
  const profileIds = new Set<string>();
  const projectIds = new Set<string>();
  for (const i of incidents) {
    if (i.reported_by) profileIds.add(i.reported_by);
    if (i.assigned_to) profileIds.add(i.assigned_to);
    if (i.project_id) projectIds.add(i.project_id);
  }

  const [profilesRes, projectsRes] = await Promise.all([
    profileIds.size > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", [...profileIds])
      : Promise.resolve({ data: null }),
    projectIds.size > 0
      ? supabase.from("projects").select("id, name").in("id", [...projectIds])
      : Promise.resolve({ data: null }),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));
  const projMap = new Map((projectsRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p]));

  for (const i of incidents) {
    i.reporter = i.reported_by ? profileMap.get(i.reported_by) ?? null : null;
    i.assignee = i.assigned_to ? profileMap.get(i.assigned_to) ?? null : null;
    i.project = i.project_id ? projMap.get(i.project_id) ?? null : null;
  }

  return incidents;
}

// ---------------------------------------------------------------------------
// getIncidentStats — counts by status
// ---------------------------------------------------------------------------

export async function getIncidentStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<SafetyStats> {
  const { data, error } = await supabase
    .from("safety_incidents")
    .select("id, status")
    .eq("company_id", companyId);

  if (error) {
    console.error("getIncidentStats error:", error);
    return { reported: 0, investigating: 0, corrective_action: 0, closed: 0, total: 0 };
  }

  const incidents = data ?? [];
  const stats: SafetyStats = {
    reported: 0,
    investigating: 0,
    corrective_action: 0,
    closed: 0,
    total: incidents.length,
  };

  for (const i of incidents) {
    const s = i.status as IncidentStatus;
    if (s in stats) {
      stats[s]++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// getIncidentById — single incident with full details
// ---------------------------------------------------------------------------

export async function getIncidentById(
  supabase: SupabaseClient,
  incidentId: string
) {
  const { data, error } = await supabase
    .from("safety_incidents")
    .select("*")
    .eq("id", incidentId)
    .single();

  if (error) {
    console.error("getIncidentById error:", error);
    return null;
  }

  const incident = data as SafetyIncidentRow;

  // Fetch related profiles and project
  const idProfileIds = [incident.reported_by, incident.assigned_to].filter(Boolean) as string[];
  const [profilesRes, projRes] = await Promise.all([
    idProfileIds.length > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", idProfileIds)
      : Promise.resolve({ data: null }),
    incident.project_id
      ? supabase.from("projects").select("id, name").eq("id", incident.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));
  incident.reporter = incident.reported_by ? profileMap.get(incident.reported_by) ?? null : null;
  incident.assignee = incident.assigned_to ? profileMap.get(incident.assigned_to) ?? null : null;
  incident.project = projRes.data ?? null;

  return incident;
}

// ---------------------------------------------------------------------------
// createIncident — insert incident, auto-generate incident_number (INC-001...)
// ---------------------------------------------------------------------------

export async function createIncident(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateIncidentData
) {
  // Get the next incident number for this company
  const { data: lastIncident } = await supabase
    .from("safety_incidents")
    .select("incident_number")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastIncident?.incident_number) {
    const match = lastIncident.incident_number.match(/INC-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const incidentNumber = `INC-${String(nextNumber).padStart(3, "0")}`;

  const { data: incident, error } = await supabase
    .from("safety_incidents")
    .insert({
      company_id: companyId,
      reported_by: userId,
      incident_number: incidentNumber,
      title: data.title,
      description: data.description ?? null,
      incident_type: data.incident_type ?? "near_miss",
      severity: data.severity ?? "medium",
      status: "reported",
      project_id: data.project_id ?? null,
      assigned_to: data.assigned_to ?? null,
      incident_date: data.incident_date ?? new Date().toISOString(),
      location: data.location ?? null,
      osha_recordable: data.osha_recordable ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("createIncident error:", error);
    return { incident: null, error: error.message };
  }

  return { incident, error: null };
}

// ---------------------------------------------------------------------------
// updateIncident — update status/severity/assignee/etc.
// ---------------------------------------------------------------------------

export async function updateIncident(
  supabase: SupabaseClient,
  incidentId: string,
  data: UpdateIncidentData
) {
  const updatePayload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

  const { data: incident, error } = await supabase
    .from("safety_incidents")
    .update(updatePayload)
    .eq("id", incidentId)
    .select()
    .single();

  if (error) {
    console.error("updateIncident error:", error);
    return { incident: null, error: error.message };
  }

  return { incident, error: null };
}

// ---------------------------------------------------------------------------
// getToolboxTalks — list all toolbox talks for a company
// ---------------------------------------------------------------------------

export async function getToolboxTalks(
  supabase: SupabaseClient,
  companyId: string,
  filters?: ToolboxTalkFilters
) {
  let query = supabase
    .from("toolbox_talks")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.topic) {
    query = query.eq("topic", filters.topic);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${term},talk_number.ilike.${term},description.ilike.${term}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getToolboxTalks error:", error);
    return [];
  }

  const talks = (data ?? []) as ToolboxTalkRow[];

  // Batch-fetch conductor profiles and projects
  const conductorIds = new Set<string>();
  const talkProjectIds = new Set<string>();
  for (const t of talks) {
    if (t.conducted_by) conductorIds.add(t.conducted_by);
    if (t.project_id) talkProjectIds.add(t.project_id);
  }

  const [conductorRes, talkProjRes] = await Promise.all([
    conductorIds.size > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", [...conductorIds])
      : Promise.resolve({ data: null }),
    talkProjectIds.size > 0
      ? supabase.from("projects").select("id, name").in("id", [...talkProjectIds])
      : Promise.resolve({ data: null }),
  ]);

  const conductorMap = new Map((conductorRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));
  const talkProjMap = new Map((talkProjRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p]));

  for (const t of talks) {
    t.conductor = t.conducted_by ? conductorMap.get(t.conducted_by) ?? null : null;
    t.project = t.project_id ? talkProjMap.get(t.project_id) ?? null : null;
  }

  return talks;
}

// ---------------------------------------------------------------------------
// getToolboxTalkById — single toolbox talk with full details
// ---------------------------------------------------------------------------

export async function getToolboxTalkById(
  supabase: SupabaseClient,
  talkId: string
) {
  const { data, error } = await supabase
    .from("toolbox_talks")
    .select("*")
    .eq("id", talkId)
    .single();

  if (error) {
    console.error("getToolboxTalkById error:", error);
    return null;
  }

  const talk = data as ToolboxTalkRow;

  // Fetch conductor and project
  const [conductorRes, projRes] = await Promise.all([
    talk.conducted_by
      ? supabase.from("user_profiles").select("id, full_name, email").eq("id", talk.conducted_by).maybeSingle()
      : Promise.resolve({ data: null }),
    talk.project_id
      ? supabase.from("projects").select("id, name").eq("id", talk.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  talk.conductor = conductorRes.data ?? null;
  talk.project = projRes.data ?? null;

  return talk;
}

// ---------------------------------------------------------------------------
// createToolboxTalk — insert toolbox talk, auto-generate talk_number (TBT-001...)
// ---------------------------------------------------------------------------

export async function createToolboxTalk(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateToolboxTalkData
) {
  // Get the next talk number for this company
  const { data: lastTalk } = await supabase
    .from("toolbox_talks")
    .select("talk_number")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastTalk?.talk_number) {
    const match = lastTalk.talk_number.match(/TBT-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const talkNumber = `TBT-${String(nextNumber).padStart(3, "0")}`;

  const dateVal = data.scheduled_date ?? new Date().toISOString().split("T")[0];

  const { data: talk, error } = await supabase
    .from("toolbox_talks")
    .insert({
      company_id: companyId,
      conducted_by: userId,
      talk_number: talkNumber,
      title: data.title,
      description: data.description ?? null,
      topic: data.topic ?? null,
      status: "scheduled",
      scheduled_date: dateVal,
      conducted_date: dateVal,
      project_id: data.project_id ?? null,
      attendee_count: data.attendees_count ?? 0,
      attendees: data.attendees ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("createToolboxTalk error:", error);
    return { talk: null, error: error.message };
  }

  return { talk, error: null };
}

// ---------------------------------------------------------------------------
// updateToolboxTalk — update status/topic/etc.
// ---------------------------------------------------------------------------

export async function updateToolboxTalk(
  supabase: SupabaseClient,
  talkId: string,
  data: UpdateToolboxTalkData
) {
  const updatePayload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

  const { data: talk, error } = await supabase
    .from("toolbox_talks")
    .update(updatePayload)
    .eq("id", talkId)
    .select()
    .single();

  if (error) {
    console.error("updateToolboxTalk error:", error);
    return { talk: null, error: error.message };
  }

  return { talk, error: null };
}

// ---------------------------------------------------------------------------
// getSafetyOverview - Overview dashboard data
// ---------------------------------------------------------------------------

export interface SafetyOverviewData {
  incidentsYTD: number;
  daysSinceLastIncident: number;
  oshaRecordableCount: number;
  openInvestigations: number;
  toolboxTalksThisMonth: number;
  nearMissRatio: number;
  monthlyTrend: { month: string; count: number; oshaCount: number }[];
  typeBreakdown: { type: string; count: number }[];
  openIncidents: SafetyIncidentRow[];
  upcomingTalks: ToolboxTalkRow[];
}

export async function getSafetyOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<SafetyOverviewData> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  // 12-month lookback for the trend chart (not just YTD)
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const trendStartStr = `${trendStart.getFullYear()}-${String(trendStart.getMonth() + 1).padStart(2, "0")}-01`;

  const [incidentsRes, talksRes, allIncidentsRes] = await Promise.all([
    supabase
      .from("safety_incidents")
      .select("id, incident_type, severity, status, incident_date, osha_recordable, title, incident_number, project_id, reported_by, assigned_to")
      .eq("company_id", companyId)
      .order("incident_date", { ascending: false }),
    supabase
      .from("toolbox_talks")
      .select("*")
      .eq("company_id", companyId)
      .order("conducted_date", { ascending: true }),
    supabase
      .from("safety_incidents")
      .select("incident_date, osha_recordable")
      .eq("company_id", companyId)
      .order("incident_date", { ascending: false })
      .limit(1),
  ]);

  const rawIncidents = incidentsRes.data ?? [];
  const rawTalks = talksRes.data ?? [];

  // Batch-fetch profiles and projects for incidents and talks
  const ovProfileIds = new Set<string>();
  const ovProjectIds = new Set<string>();
  for (const i of rawIncidents) {
    if (i.reported_by) ovProfileIds.add(i.reported_by);
    if (i.assigned_to) ovProfileIds.add(i.assigned_to);
    if (i.project_id) ovProjectIds.add(i.project_id);
  }
  for (const t of rawTalks) {
    if (t.conducted_by) ovProfileIds.add(t.conducted_by);
    if (t.project_id) ovProjectIds.add(t.project_id);
  }

  const [ovProfilesRes, ovProjectsRes] = await Promise.all([
    ovProfileIds.size > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", [...ovProfileIds])
      : Promise.resolve({ data: null }),
    ovProjectIds.size > 0
      ? supabase.from("projects").select("id, name").in("id", [...ovProjectIds])
      : Promise.resolve({ data: null }),
  ]);

  const ovProfileMap = new Map((ovProfilesRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));
  const ovProjMap = new Map((ovProjectsRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p]));

  const incidents = rawIncidents.map((i) => ({
    ...i,
    reporter: i.reported_by ? ovProfileMap.get(i.reported_by) ?? null : null,
    assignee: i.assigned_to ? ovProfileMap.get(i.assigned_to) ?? null : null,
    project: i.project_id ? ovProjMap.get(i.project_id) ?? null : null,
  })) as unknown as SafetyIncidentRow[];

  const talks = rawTalks.map((t) => ({
    ...t,
    conductor: t.conducted_by ? ovProfileMap.get(t.conducted_by) ?? null : null,
    project: t.project_id ? ovProjMap.get(t.project_id) ?? null : null,
  })) as unknown as ToolboxTalkRow[];
  const latestIncident = allIncidentsRes.data?.[0];

  // Count all incidents (not just YTD — matches Dashboard behaviour)
  const incidentsYTD = incidents.length;
  const oshaRecordableCount = incidents.filter((i) => i.osha_recordable).length;
  const openInvestigations = incidents.filter(
    (i) => i.status !== "closed"
  ).length;

  const daysSinceLastIncident = latestIncident?.incident_date
    ? Math.floor(
        (now.getTime() - new Date(latestIncident.incident_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  const toolboxTalksThisMonth = talks.filter(
    (t) => (t.scheduled_date ?? t.conducted_date) >= monthStart
  ).length;

  const nearMissCount = incidents.filter(
    (i) => i.incident_type === "near_miss"
  ).length;
  const nearMissRatio =
    incidentsYTD > 0 ? (nearMissCount / incidentsYTD) * 100 : 0;

  // Monthly trend (12 months)
  const monthlyMap = new Map<string, { count: number; oshaCount: number }>();
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const key = formatDateSafe(toDateStr(d));
    monthlyMap.set(key, { count: 0, oshaCount: 0 });
  }
  for (const inc of incidents) {
    const d = new Date(inc.incident_date);
    const key = formatDateSafe(toDateStr(d));
    const entry = monthlyMap.get(key);
    if (entry) {
      entry.count++;
      if (inc.osha_recordable) entry.oshaCount++;
    }
  }
  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  // Type breakdown
  const typeMap = new Map<string, number>();
  for (const inc of incidents) {
    typeMap.set(inc.incident_type, (typeMap.get(inc.incident_type) ?? 0) + 1);
  }
  const typeBreakdown = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  // Open incidents sorted by severity
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const openIncidents = incidents
    .filter((i) => i.status !== "closed")
    .sort(
      (a, b) =>
        (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
    )
    .slice(0, 8);

  // Upcoming / next scheduled talks — show nearest-future first, then most-recent
  const today = now.toISOString().slice(0, 10);
  const upcomingTalks = talks
    .filter((t) => t.status === "scheduled")
    .sort((a, b) => {
      const aDate = a.scheduled_date ?? a.conducted_date ?? "";
      const bDate = b.scheduled_date ?? b.conducted_date ?? "";
      const aFuture = aDate >= today;
      const bFuture = bDate >= today;
      // Future talks first (ascending by date), then past talks (descending by date)
      if (aFuture && !bFuture) return -1;
      if (!aFuture && bFuture) return 1;
      return aFuture ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
    })
    .slice(0, 5);

  return {
    incidentsYTD,
    daysSinceLastIncident,
    oshaRecordableCount,
    openInvestigations,
    toolboxTalksThisMonth,
    nearMissRatio,
    monthlyTrend,
    typeBreakdown,
    openIncidents,
    upcomingTalks,
  };
}
