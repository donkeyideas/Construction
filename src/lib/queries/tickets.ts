import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory =
  | "IT"
  | "HR"
  | "Operations"
  | "Finance"
  | "Safety"
  | "Equipment"
  | "General";

export interface TicketRow {
  id: string;
  company_id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  created_by: string;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  entity_type: string | null;
  entity_id: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  creator?: { id: string; full_name: string; email: string } | null;
  assignee?: { id: string; full_name: string; email: string } | null;
  resolver?: { id: string; full_name: string; email: string } | null;
}

export interface TicketComment {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  // Joined
  user?: { id: string; full_name: string; email: string } | null;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

export interface CompanyMember {
  user_id: string;
  role: string;
  user: { id: string; full_name: string; email: string } | null;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
  search?: string;
}

export interface CreateTicketData {
  title: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
  assigned_to?: string;
  tags?: string[];
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assigned_to?: string | null;
  tags?: string[];
  resolved_by?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// getTickets — list all tickets for a company with creator/assignee names
// ---------------------------------------------------------------------------

export async function getTickets(
  supabase: SupabaseClient,
  companyId: string,
  filters?: TicketFilters
) {
  let query = supabase
    .from("tickets")
    .select(
      `
      *,
      creator:user_profiles!tickets_created_by_fkey(id, full_name, email),
      assignee:user_profiles!tickets_assigned_to_fkey(id, full_name, email)
    `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${term},ticket_number.ilike.${term},description.ilike.${term}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getTickets error:", error);
    return [];
  }

  return (data ?? []) as TicketRow[];
}

// ---------------------------------------------------------------------------
// getTicketStats — counts by status
// ---------------------------------------------------------------------------

export async function getTicketStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<TicketStats> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("company_id", companyId);

  if (error) {
    console.error("getTicketStats error:", error);
    return { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
  }

  const tickets = data ?? [];
  const stats: TicketStats = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    total: tickets.length,
  };

  for (const t of tickets) {
    const s = t.status as TicketStatus;
    if (s in stats) {
      stats[s]++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// getTicketById — single ticket with full details + creator/assignee profiles
// ---------------------------------------------------------------------------

export async function getTicketById(
  supabase: SupabaseClient,
  ticketId: string
) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      *,
      creator:user_profiles!tickets_created_by_fkey(id, full_name, email),
      assignee:user_profiles!tickets_assigned_to_fkey(id, full_name, email),
      resolver:user_profiles!tickets_resolved_by_fkey(id, full_name, email)
    `
    )
    .eq("id", ticketId)
    .single();

  if (error) {
    console.error("getTicketById error:", error);
    return null;
  }

  return data as TicketRow;
}

// ---------------------------------------------------------------------------
// getTicketComments — comments for a ticket
// ---------------------------------------------------------------------------

export async function getTicketComments(
  supabase: SupabaseClient,
  ticketId: string
) {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      user:user_profiles!comments_user_id_fkey(id, full_name, email)
    `
    )
    .eq("entity_type", "ticket")
    .eq("entity_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getTicketComments error:", error);
    return [];
  }

  return (data ?? []) as TicketComment[];
}

// ---------------------------------------------------------------------------
// createTicket — insert ticket, auto-generate ticket_number (TKT-001...)
// ---------------------------------------------------------------------------

export async function createTicket(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateTicketData
) {
  // Get the next ticket number for this company
  const { data: lastTicket } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastTicket?.ticket_number) {
    const match = lastTicket.ticket_number.match(/TKT-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const ticketNumber = `TKT-${String(nextNumber).padStart(3, "0")}`;

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      company_id: companyId,
      created_by: userId,
      ticket_number: ticketNumber,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? "medium",
      category: data.category ?? null,
      assigned_to: data.assigned_to ?? null,
      tags: data.tags ?? [],
      entity_type: data.entity_type ?? null,
      entity_id: data.entity_id ?? null,
      metadata: data.metadata ?? {},
      status: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("createTicket error:", error);
    return { ticket: null, error: error.message };
  }

  return { ticket, error: null };
}

// ---------------------------------------------------------------------------
// updateTicket — update status/priority/assignee/etc.
// ---------------------------------------------------------------------------

export async function updateTicket(
  supabase: SupabaseClient,
  ticketId: string,
  data: UpdateTicketData
) {
  const updatePayload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

  const { data: ticket, error } = await supabase
    .from("tickets")
    .update(updatePayload)
    .eq("id", ticketId)
    .select()
    .single();

  if (error) {
    console.error("updateTicket error:", error);
    return { ticket: null, error: error.message };
  }

  return { ticket, error: null };
}

// ---------------------------------------------------------------------------
// addTicketComment — insert comment with entity_type='ticket'
// ---------------------------------------------------------------------------

export async function addTicketComment(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  ticketId: string,
  body: string
) {
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      company_id: companyId,
      user_id: userId,
      entity_type: "ticket",
      entity_id: ticketId,
      body,
    })
    .select()
    .single();

  if (error) {
    console.error("addTicketComment error:", error);
    return { comment: null, error: error.message };
  }

  return { comment, error: null };
}

// ---------------------------------------------------------------------------
// getCompanyMembers — get members for assignee dropdown
// ---------------------------------------------------------------------------

export async function getCompanyMembers(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      user_id,
      role,
      user:user_profiles!company_members_user_id_fkey(id, full_name, email)
    `
    )
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("role", { ascending: true });

  if (error) {
    console.error("getCompanyMembers error:", error);
    return [];
  }

  return (data ?? []) as unknown as CompanyMember[];
}
