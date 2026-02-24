import { SupabaseClient } from "@supabase/supabase-js";
import { toTzDateStr, addDaysToDateStr } from "@/lib/utils/timezone";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContactType =
  | "employee"
  | "subcontractor"
  | "vendor"
  | "client"
  | "tenant";

export type TimeEntryStatus = "pending" | "approved" | "rejected";

export interface Contact {
  id: string;
  company_id: string;
  contact_type: ContactType;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  expiring_certs_count?: number;
}

export interface TimeEntry {
  id: string;
  company_id: string;
  user_id: string;
  project_id: string | null;
  entry_date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours: number | null;
  break_minutes: number | null;
  work_type: string | null;
  cost_code: string | null;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  status: TimeEntryStatus;
  approved_by: string | null;
  created_at: string;
  // Joined
  user_profile?: { full_name: string | null; email: string | null } | null;
  project?: { name: string | null; code: string | null } | null;
}

export interface Equipment {
  id: string;
  company_id: string;
  name: string;
  equipment_type: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  status: "available" | "in_use" | "maintenance" | "retired";
  current_project_id: string | null;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  hourly_rate: number | null;
  total_hours: number | null;
  created_at: string;
}

export interface Certification {
  id: string;
  company_id: string;
  contact_id: string;
  cert_type: string | null;
  cert_name: string;
  issuing_authority: string | null;
  cert_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  status: string | null;
  created_at: string;
}

export interface ContactFilters {
  type?: ContactType;
  search?: string;
}

export interface TimeEntryFilters {
  userId?: string;
  projectId?: string;
  dateRange?: { start: string; end: string };
  status?: TimeEntryStatus;
}

// ---------------------------------------------------------------------------
// Contact Queries
// ---------------------------------------------------------------------------

export async function getContacts(
  supabase: SupabaseClient,
  companyId: string,
  filters?: ContactFilters
): Promise<Contact[]> {
  let query = supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("last_name", { ascending: true });

  if (filters?.type) {
    query = query.eq("contact_type", filters.type);
  }

  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getContacts error:", error);
    return [];
  }

  return data ?? [];
}

export async function getContactById(
  supabase: SupabaseClient,
  id: string
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function createContact(
  supabase: SupabaseClient,
  companyId: string,
  data: Partial<Contact>
): Promise<{ contact: Contact | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from("contacts")
    .insert({
      company_id: companyId,
      contact_type: data.contact_type || "employee",
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      company_name: data.company_name,
      job_title: data.job_title,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      notes: data.notes,
      is_active: data.is_active ?? true,
      user_id: data.user_id,
    })
    .select()
    .single();

  if (error) {
    return { contact: null, error: error.message };
  }

  return { contact: result, error: null };
}

// ---------------------------------------------------------------------------
// Time Entry Queries
// ---------------------------------------------------------------------------

export async function getTimeEntries(
  supabase: SupabaseClient,
  companyId: string,
  filters?: TimeEntryFilters
): Promise<TimeEntry[]> {
  let query = supabase
    .from("time_entries")
    .select(
      "*, user_profiles!time_entries_user_profile_fkey(full_name, email), projects!time_entries_project_id_fkey(name, code)"
    )
    .eq("company_id", companyId)
    .order("entry_date", { ascending: false });

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.dateRange) {
    query = query
      .gte("entry_date", filters.dateRange.start)
      .lte("entry_date", filters.dateRange.end);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTimeEntries error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    user_profile: row.user_profiles as unknown as {
      full_name: string | null;
      email: string | null;
    } | null,
    project: row.projects as unknown as {
      name: string | null;
      code: string | null;
    } | null,
  }));
}

/**
 * Build TimeEntry records from clock_events by pairing clock_in/clock_out
 * per user per day. This fills the gap where the clock system writes to
 * clock_events but the Time & Attendance page reads time_entries.
 */
export async function getTimeEntriesFromClockEvents(
  supabase: SupabaseClient,
  companyId: string,
  filters?: TimeEntryFilters
): Promise<TimeEntry[]> {
  let query = supabase
    .from("clock_events")
    .select("id, company_id, user_id, event_type, timestamp, project_id, notes, created_at, projects(name)")
    .eq("company_id", companyId)
    .order("timestamp", { ascending: true });

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters?.dateRange) {
    // Buffer end by +1 day so evening events (which are next-day UTC) are captured
    const bufferedEnd = addDaysToDateStr(filters.dateRange.end, 1);
    query = query
      .gte("timestamp", `${filters.dateRange.start}T00:00:00.000Z`)
      .lt("timestamp", `${bufferedEnd}T12:00:00.000Z`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getTimeEntriesFromClockEvents error:", error.message, error.details);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Fetch user profiles for all unique user IDs
  const userIds = [...new Set(data.map((r) => r.user_id as string))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, full_name, email")
    .in("id", userIds);
  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p])
  );

  // Group events by user, pair chronologically (handles cross-midnight),
  // then assign hours to the clock_in date.
  const userEventsMap = new Map<string, typeof data>();
  for (const row of data ?? []) {
    const uid = row.user_id as string;
    if (!userEventsMap.has(uid)) userEventsMap.set(uid, []);
    userEventsMap.get(uid)!.push(row);
  }

  type DayAccum = {
    totalMs: number;
    firstClockIn: string | null;
    lastClockOut: string | null;
    projectId: string | null;
    stillClockedIn: boolean;
    projectName: string | null;
  };

  const entries: TimeEntry[] = [];

  for (const [userId, userEvents] of userEventsMap) {
    const sorted = userEvents.sort(
      (a, b) => new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime()
    );

    const dayTotals = new Map<string, DayAccum>();

    const ensureDay = (ds: string): DayAccum => {
      if (!dayTotals.has(ds)) {
        dayTotals.set(ds, {
          totalMs: 0, firstClockIn: null, lastClockOut: null,
          projectId: null, stillClockedIn: false, projectName: null,
        });
      }
      return dayTotals.get(ds)!;
    };

    let pendingIn: { ts: Date; dateStr: string; projectId: string | null } | null = null;

    for (const evt of sorted) {
      const projJoin = (evt as Record<string, unknown>).projects as { name: string } | null;

      if (evt.event_type === "clock_in") {
        const ds = toTzDateStr(evt.timestamp as string);
        pendingIn = {
          ts: new Date(evt.timestamp as string),
          dateStr: ds,
          projectId: (evt.project_id as string) ?? null,
        };
        const day = ensureDay(ds);
        if (!day.firstClockIn) day.firstClockIn = evt.timestamp as string;
        if (!day.projectId && pendingIn.projectId) day.projectId = pendingIn.projectId;
        if (!day.projectName && projJoin) day.projectName = projJoin.name;
        day.stillClockedIn = true;
      } else if (evt.event_type === "clock_out" && pendingIn) {
        // Assign hours to the clock_in's date (handles cross-midnight)
        const out = new Date(evt.timestamp as string);
        const ms = out.getTime() - pendingIn.ts.getTime();
        const day = ensureDay(pendingIn.dateStr);
        day.totalMs += ms;
        day.lastClockOut = evt.timestamp as string;
        day.stillClockedIn = false;
        pendingIn = null;
      }
    }

    // Convert accumulated day data to TimeEntry objects
    for (const [dateStr, day] of dayTotals) {
      const hours = Math.round((day.totalMs / 3_600_000) * 100) / 100;
      const profile = profileMap.get(userId) ?? null;

      entries.push({
        id: `ce-${userId}-${dateStr}`,
        company_id: companyId,
        user_id: userId,
        project_id: day.projectId,
        entry_date: dateStr,
        clock_in: day.firstClockIn,
        clock_out: day.lastClockOut,
        hours: hours > 0 ? hours : null,
        break_minutes: null,
        work_type: null,
        cost_code: null,
        notes: day.stillClockedIn ? "Still clocked in" : null,
        gps_lat: null,
        gps_lng: null,
        status: "approved" as TimeEntryStatus,
        approved_by: null,
        created_at: day.firstClockIn ?? dateStr,
        user_profile: profile ? { full_name: profile.full_name, email: profile.email } : null,
        project: day.projectName ? { name: day.projectName, code: null } : null,
      });
    }
  }

  return entries.sort(
    (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  );
}

export async function createTimeEntry(
  supabase: SupabaseClient,
  companyId: string,
  data: Partial<TimeEntry>
): Promise<{ entry: TimeEntry | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from("time_entries")
    .insert({
      company_id: companyId,
      user_id: data.user_id,
      project_id: data.project_id,
      entry_date: data.entry_date,
      clock_in: data.clock_in,
      clock_out: data.clock_out,
      hours: data.hours,
      break_minutes: data.break_minutes,
      work_type: data.work_type,
      cost_code: data.cost_code,
      notes: data.notes,
      gps_lat: data.gps_lat,
      gps_lng: data.gps_lng,
      status: data.status || "pending",
    })
    .select()
    .single();

  if (error) {
    return { entry: null, error: error.message };
  }

  return { entry: result, error: null };
}

// ---------------------------------------------------------------------------
// Equipment Queries
// ---------------------------------------------------------------------------

export async function getEquipment(
  supabase: SupabaseClient,
  companyId: string
): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getEquipment error:", error);
    return [];
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Certification Alerts (expiring within 30 days)
// ---------------------------------------------------------------------------

export async function getCertificationAlerts(
  supabase: SupabaseClient,
  companyId: string
): Promise<Certification[]> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  );
  const cutoff = thirtyDaysFromNow.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .eq("company_id", companyId)
    .not("expiry_date", "is", null)
    .lte("expiry_date", cutoff)
    .gte("expiry_date", now.toISOString().slice(0, 10))
    .order("expiry_date", { ascending: true });

  if (error) {
    console.error("getCertificationAlerts error:", error);
    return [];
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Helper: Get contacts with their expiring cert counts
// ---------------------------------------------------------------------------

export async function getContactsWithCertAlerts(
  supabase: SupabaseClient,
  companyId: string,
  filters?: ContactFilters
): Promise<Contact[]> {
  const [contacts, certAlerts] = await Promise.all([
    getContacts(supabase, companyId, filters),
    getCertificationAlerts(supabase, companyId),
  ]);

  // Build a map of contact_id -> count of expiring certs
  const alertMap = new Map<string, number>();
  for (const cert of certAlerts) {
    alertMap.set(cert.contact_id, (alertMap.get(cert.contact_id) || 0) + 1);
  }

  return contacts.map((c) => ({
    ...c,
    expiring_certs_count: alertMap.get(c.id) || 0,
  }));
}

// ---------------------------------------------------------------------------
// getPeopleOverview - Overview dashboard data
// ---------------------------------------------------------------------------

export interface PeopleOverviewData {
  totalActive: number;
  employeeCount: number;
  subcontractorCount: number;
  expiringCertCount: number;
  hoursThisWeek: number;
  pendingTimesheets: number;
  typeBreakdown: { type: string; count: number }[];
  hoursByProject: { projectName: string; hours: number }[];
  expiringCerts: (Certification & { contact_name: string })[];
  pendingEntries: TimeEntry[];
}

export async function getPeopleOverview(
  supabase: SupabaseClient,
  companyId: string
): Promise<PeopleOverviewData> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [contactsRes, certsRes, timeRes, pendingRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, contact_type, is_active")
      .eq("company_id", companyId)
      .eq("is_active", true),
    getCertificationAlerts(supabase, companyId),
    supabase
      .from("time_entries")
      .select("id, hours, project_id, project:projects!time_entries_project_id_fkey(name)")
      .eq("company_id", companyId)
      .gte("entry_date", weekStartStr),
    supabase
      .from("time_entries")
      .select("*, user_profile:user_profiles!time_entries_user_id_fkey(full_name, email), project:projects!time_entries_project_id_fkey(name, code)")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("entry_date", { ascending: false })
      .limit(6),
  ]);

  const contacts = contactsRes.data ?? [];
  const certs = certsRes;
  const timeEntries = timeRes.data ?? [];
  const pendingEntries = (pendingRes.data ?? []) as TimeEntry[];

  const totalActive = contacts.length;
  const employeeCount = contacts.filter(
    (c) => c.contact_type === "employee"
  ).length;
  const subcontractorCount = contacts.filter(
    (c) => c.contact_type === "subcontractor"
  ).length;
  const expiringCertCount = certs.length;

  const hoursThisWeek = timeEntries.reduce(
    (sum, t) => sum + (t.hours ?? 0),
    0
  );
  const pendingTimesheets = pendingEntries.length;

  // Type breakdown
  const typeMap = new Map<string, number>();
  for (const c of contacts) {
    typeMap.set(c.contact_type, (typeMap.get(c.contact_type) ?? 0) + 1);
  }
  const typeBreakdown = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
  }));

  // Hours by project
  const projectHoursMap = new Map<string, number>();
  for (const t of timeEntries) {
    const projName = (t.project as { name?: string } | null)?.name ?? "Unassigned";
    projectHoursMap.set(
      projName,
      (projectHoursMap.get(projName) ?? 0) + (t.hours ?? 0)
    );
  }
  const hoursByProject = Array.from(projectHoursMap.entries())
    .map(([projectName, hours]) => ({ projectName, hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  // Expiring certs with contact names
  const { data: contactNames } = await supabase
    .from("contacts")
    .select("id, first_name, last_name")
    .eq("company_id", companyId);
  const nameMap = new Map(
    (contactNames ?? []).map((c) => [
      c.id,
      `${c.first_name} ${c.last_name}`.trim(),
    ])
  );
  const expiringCerts = certs.slice(0, 8).map((c) => ({
    ...c,
    contact_name: nameMap.get(c.contact_id) ?? "Unknown",
  }));

  return {
    totalActive,
    employeeCount,
    subcontractorCount,
    expiringCertCount,
    hoursThisWeek,
    pendingTimesheets,
    typeBreakdown,
    hoursByProject,
    expiringCerts,
    pendingEntries,
  };
}
