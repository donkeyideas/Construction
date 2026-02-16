import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyMember } from "./tickets";

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
  scheduled_date: string;
  attendees_count: number;
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
    .select(
      `
      *,
      reporter:user_profiles!safety_incidents_reporter_profile_fkey(id, full_name, email),
      assignee:user_profiles!safety_incidents_assignee_profile_fkey(id, full_name, email),
      project:projects(id, name)
    `
    )
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

  return (data ?? []) as SafetyIncidentRow[];
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
    .select(
      `
      *,
      reporter:user_profiles!safety_incidents_reporter_profile_fkey(id, full_name, email),
      assignee:user_profiles!safety_incidents_assignee_profile_fkey(id, full_name, email),
      project:projects(id, name)
    `
    )
    .eq("id", incidentId)
    .single();

  if (error) {
    console.error("getIncidentById error:", error);
    return null;
  }

  return data as SafetyIncidentRow;
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
    .select(
      `
      *,
      conductor:user_profiles!toolbox_talks_conductor_profile_fkey(id, full_name, email),
      project:projects(id, name)
    `
    )
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

  return (data ?? []) as ToolboxTalkRow[];
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
    .select(
      `
      *,
      conductor:user_profiles!toolbox_talks_conductor_profile_fkey(id, full_name, email),
      project:projects(id, name)
    `
    )
    .eq("id", talkId)
    .single();

  if (error) {
    console.error("getToolboxTalkById error:", error);
    return null;
  }

  return data as ToolboxTalkRow;
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
      scheduled_date: data.scheduled_date ?? new Date().toISOString(),
      project_id: data.project_id ?? null,
      attendees_count: data.attendees_count ?? 0,
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
  const yearStart = `${now.getFullYear()}-01-01`;
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [incidentsRes, talksRes, allIncidentsRes] = await Promise.all([
    supabase
      .from("safety_incidents")
      .select("id, incident_type, severity, status, incident_date, osha_recordable, title, incident_number, project_id, reporter:user_profiles!safety_incidents_reported_by_fkey(id, full_name, email), assignee:user_profiles!safety_incidents_assigned_to_fkey(id, full_name, email), project:projects!safety_incidents_project_id_fkey(id, name)")
      .eq("company_id", companyId)
      .gte("incident_date", yearStart)
      .order("incident_date", { ascending: false }),
    supabase
      .from("toolbox_talks")
      .select("*, conductor:user_profiles!toolbox_talks_conducted_by_fkey(id, full_name, email), project:projects!toolbox_talks_project_id_fkey(id, name)")
      .eq("company_id", companyId)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("safety_incidents")
      .select("incident_date, osha_recordable")
      .eq("company_id", companyId)
      .order("incident_date", { ascending: false })
      .limit(1),
  ]);

  const incidents = (incidentsRes.data ?? []) as unknown as SafetyIncidentRow[];
  const talks = (talksRes.data ?? []) as unknown as ToolboxTalkRow[];
  const latestIncident = allIncidentsRes.data?.[0];

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
    (t) => t.status === "completed" && t.scheduled_date >= monthStart
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
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    monthlyMap.set(key, { count: 0, oshaCount: 0 });
  }
  for (const inc of incidents) {
    const d = new Date(inc.incident_date);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
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

  // Upcoming talks
  const upcomingTalks = talks
    .filter(
      (t) =>
        t.status === "scheduled" &&
        t.scheduled_date >= now.toISOString().slice(0, 10)
    )
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
