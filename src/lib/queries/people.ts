import { SupabaseClient } from "@supabase/supabase-js";

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
