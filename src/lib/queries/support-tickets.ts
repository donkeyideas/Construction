import { createAdminClient } from "@/lib/supabase/admin";

export interface SupportTicket {
  id: string;
  ticket_number: number;
  company_id: string | null;
  user_id: string | null;
  subject: string;
  description: string | null;
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "general" | "billing" | "technical" | "feature_request" | "bug_report" | "account";
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_full_name: string | null;
  user_email: string | null;
  company_name: string | null;
  assigned_name: string | null;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  user_id: string | null;
  message: string;
  is_internal: boolean;
  created_at: string;
  user_full_name: string | null;
  user_email: string | null;
}

export interface SupportTicketWithMessages extends SupportTicket {
  messages: SupportTicketMessage[];
}

export interface SupportTicketStats {
  total: number;
  open: number;
  inProgress: number;
  avgResolutionHours: number | null;
}

export interface SupportTicketFilters {
  status?: string;
  priority?: string;
  category?: string;
}

/**
 * Fetch support tickets with optional filters, joined with user_profiles and companies.
 */
export async function getSupportTickets(
  filters: SupportTicketFilters = {}
): Promise<SupportTicket[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("support_tickets")
    .select(
      "id, ticket_number, company_id, user_id, subject, description, status, priority, category, assigned_to, resolved_at, created_at, updated_at, user_profiles!support_tickets_user_id_fkey(full_name, email), companies(name)"
    );

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("getSupportTickets error:", error);
    return [];
  }

  // Fetch assigned user names for tickets that have assigned_to
  const assignedIds = [
    ...new Set(
      (data ?? [])
        .map((t) => t.assigned_to)
        .filter((id): id is string => !!id)
    ),
  ];

  let assignedMap: Record<string, string> = {};
  if (assignedIds.length > 0) {
    const { data: assignedProfiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", assignedIds);

    if (assignedProfiles) {
      for (const p of assignedProfiles) {
        assignedMap[p.id] = p.full_name ?? "Unknown";
      }
    }
  }

  return (data ?? []).map((t) => {
    const profile = t.user_profiles as unknown as {
      full_name: string | null;
      email: string | null;
    } | null;
    const company = t.companies as unknown as { name: string } | null;

    return {
      id: t.id,
      ticket_number: t.ticket_number,
      company_id: t.company_id,
      user_id: t.user_id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      assigned_to: t.assigned_to,
      resolved_at: t.resolved_at,
      created_at: t.created_at,
      updated_at: t.updated_at,
      user_full_name: profile?.full_name ?? null,
      user_email: profile?.email ?? null,
      company_name: company?.name ?? null,
      assigned_name: t.assigned_to ? assignedMap[t.assigned_to] ?? null : null,
    };
  });
}

/**
 * Fetch a single support ticket by ID, including all messages with user info.
 */
export async function getSupportTicketById(
  id: string
): Promise<SupportTicketWithMessages | null> {
  const supabase = createAdminClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(
      "id, ticket_number, company_id, user_id, subject, description, status, priority, category, assigned_to, resolved_at, created_at, updated_at, user_profiles!support_tickets_user_id_fkey(full_name, email), companies(name)"
    )
    .eq("id", id)
    .single();

  if (error || !ticket) {
    console.error("getSupportTicketById error:", error);
    return null;
  }

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from("support_ticket_messages")
    .select(
      "id, ticket_id, user_id, message, is_internal, created_at, user_profiles(full_name, email)"
    )
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("getSupportTicketMessages error:", msgError);
  }

  // Resolve assigned_to name
  let assignedName: string | null = null;
  if (ticket.assigned_to) {
    const { data: assignedProfile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", ticket.assigned_to)
      .single();
    assignedName = assignedProfile?.full_name ?? null;
  }

  const profile = ticket.user_profiles as unknown as {
    full_name: string | null;
    email: string | null;
  } | null;
  const company = ticket.companies as unknown as { name: string } | null;

  return {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    company_id: ticket.company_id,
    user_id: ticket.user_id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    assigned_to: ticket.assigned_to,
    resolved_at: ticket.resolved_at,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    user_full_name: profile?.full_name ?? null,
    user_email: profile?.email ?? null,
    company_name: company?.name ?? null,
    assigned_name: assignedName,
    messages: (messages ?? []).map((m) => {
      const msgProfile = m.user_profiles as unknown as {
        full_name: string | null;
        email: string | null;
      } | null;
      return {
        id: m.id,
        ticket_id: m.ticket_id,
        user_id: m.user_id,
        message: m.message,
        is_internal: m.is_internal,
        created_at: m.created_at,
        user_full_name: msgProfile?.full_name ?? null,
        user_email: msgProfile?.email ?? null,
      };
    }),
  };
}

/**
 * Get aggregate stats for support tickets.
 */
export async function getSupportTicketStats(): Promise<SupportTicketStats> {
  const supabase = createAdminClient();

  const [allResult, openResult, inProgressResult, resolvedResult] =
    await Promise.all([
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_progress"),
      supabase
        .from("support_tickets")
        .select("created_at, resolved_at")
        .not("resolved_at", "is", null),
    ]);

  // Calculate average resolution time
  let avgResolutionHours: number | null = null;
  const resolvedTickets = resolvedResult.data ?? [];
  if (resolvedTickets.length > 0) {
    let totalMs = 0;
    for (const t of resolvedTickets) {
      const created = new Date(t.created_at).getTime();
      const resolved = new Date(t.resolved_at!).getTime();
      totalMs += resolved - created;
    }
    avgResolutionHours = Math.round(totalMs / resolvedTickets.length / 3600000);
  }

  return {
    total: allResult.count ?? 0,
    open: openResult.count ?? 0,
    inProgress: inProgressResult.count ?? 0,
    avgResolutionHours,
  };
}

/**
 * Update a ticket's status. Sets resolved_at when status is resolved or closed.
 */
export async function updateTicketStatus(
  id: string,
  status: string,
  assignedTo?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "resolved" || status === "closed") {
    updateData.resolved_at = new Date().toISOString();
  }

  if (assignedTo !== undefined) {
    updateData.assigned_to = assignedTo;
  }

  const { error } = await supabase
    .from("support_tickets")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("updateTicketStatus error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add a message to a support ticket and update the ticket's updated_at.
 */
export async function addTicketMessage(
  ticketId: string,
  userId: string,
  message: string,
  isInternal: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error: msgError } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      message,
      is_internal: isInternal,
    });

  if (msgError) {
    console.error("addTicketMessage error:", msgError);
    return { success: false, error: msgError.message };
  }

  // Update the ticket's updated_at timestamp
  await supabase
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  return { success: true };
}
