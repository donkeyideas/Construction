import { createAdminClient } from "@/lib/supabase/admin";

export interface ContactSubmission {
  id: string;
  type: "contact" | "custom_plan";
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  company_size: string | null;
  modules_interested: string[];
  budget_range: string | null;
  subject: string | null;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactSubmissionStats {
  total: number;
  newCount: number;
  read: number;
  archived: number;
}

export interface ContactSubmissionFilters {
  status?: string;
  type?: string;
}

/**
 * Insert a new contact submission (used by the public API).
 */
export async function createContactSubmission(
  data: Omit<ContactSubmission, "id" | "status" | "admin_notes" | "created_at" | "updated_at">
): Promise<{ submission: ContactSubmission | null; error?: string }> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("contact_submissions")
    .insert({
      type: data.type,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company_name: data.company_name || null,
      company_size: data.company_size || null,
      modules_interested: data.modules_interested || [],
      budget_range: data.budget_range || null,
      subject: data.subject || null,
      message: data.message,
    })
    .select()
    .single();

  if (error) {
    console.error("createContactSubmission error:", error);
    return { submission: null, error: error.message };
  }

  return { submission: row as ContactSubmission };
}

/**
 * Fetch contact submissions with optional filters.
 */
export async function getContactSubmissions(
  filters: ContactSubmissionFilters = {}
): Promise<ContactSubmission[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("contact_submissions")
    .select("*");

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("getContactSubmissions error:", error);
    return [];
  }

  return (data ?? []) as ContactSubmission[];
}

/**
 * Fetch a single contact submission by ID.
 */
export async function getContactSubmissionById(
  id: string
): Promise<ContactSubmission | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getContactSubmissionById error:", error);
    return null;
  }

  return data as ContactSubmission;
}

/**
 * Update a submission's status and/or admin notes.
 */
export async function updateContactSubmission(
  id: string,
  updates: { status?: string; admin_notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) {
    updateData.status = updates.status;
  }
  if (updates.admin_notes !== undefined) {
    updateData.admin_notes = updates.admin_notes;
  }

  const { error } = await supabase
    .from("contact_submissions")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("updateContactSubmission error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get aggregate stats for contact submissions.
 */
export async function getContactSubmissionStats(): Promise<ContactSubmissionStats> {
  const supabase = createAdminClient();

  const [allResult, newResult, readResult, archivedResult] =
    await Promise.all([
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "read"),
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "archived"),
    ]);

  return {
    total: allResult.count ?? 0,
    newCount: newResult.count ?? 0,
    read: readResult.count ?? 0,
    archived: archivedResult.count ?? 0,
  };
}
