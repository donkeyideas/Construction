import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditLog {
  id: string;
  user_id: string | null;
  company_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  company_name: string | null;
}

export interface AuditLogStats {
  totalLogs: number;
  logsToday: number;
  uniqueUsersToday: number;
  topActions: { action: string; count: number }[];
}

export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  user_id?: string;
  company_id?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Fetch audit logs with optional filters.
 * Joins user_profiles (full_name, email) and companies (name).
 */
export async function getAuditLogs(
  filters: AuditLogFilters
): Promise<AuditLog[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("audit_logs")
    .select(
      "id, user_id, company_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at, user_profiles(full_name, email), companies(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }
  if (filters.user_id) {
    query = query.eq("user_id", filters.user_id);
  }
  if (filters.company_id) {
    query = query.eq("company_id", filters.company_id);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    // Add time to include the full day
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAuditLogs error:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = row.user_profiles as unknown as {
      full_name: string | null;
      email: string | null;
    } | null;
    const company = row.companies as unknown as {
      name: string | null;
    } | null;

    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      details: row.details as Record<string, unknown> | null,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at,
      user_name: profile?.full_name ?? null,
      user_email: profile?.email ?? null,
      company_name: company?.name ?? null,
    };
  });
}

/**
 * Get audit log statistics:
 * - Total logs
 * - Logs today
 * - Unique users today
 * - Top 5 most common actions
 */
export async function getAuditLogStats(): Promise<AuditLogStats> {
  const supabase = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [totalResult, todayResult, allLogsResult] = await Promise.all([
    // Total logs count
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true }),
    // Logs today
    supabase
      .from("audit_logs")
      .select("id, user_id")
      .gte("created_at", todayISO),
    // All logs for action counting (limited to recent 10000)
    supabase
      .from("audit_logs")
      .select("action")
      .limit(10000),
  ]);

  const totalLogs = totalResult.count ?? 0;
  const todayLogs = todayResult.data ?? [];
  const logsToday = todayLogs.length;

  // Unique users today
  const uniqueUserIds = new Set(
    todayLogs
      .map((log) => log.user_id)
      .filter(Boolean)
  );
  const uniqueUsersToday = uniqueUserIds.size;

  // Top 5 actions
  const actionCounts: Record<string, number> = {};
  for (const row of allLogsResult.data ?? []) {
    actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
  }

  const topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalLogs,
    logsToday,
    uniqueUsersToday,
    topActions,
  };
}

/**
 * Insert a new audit log event.
 */
export async function logAuditEvent(
  userId: string | null,
  companyId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> | null = null,
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("audit_logs").insert({
    user_id: userId,
    company_id: companyId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    console.error("logAuditEvent error:", error);
  }
}
