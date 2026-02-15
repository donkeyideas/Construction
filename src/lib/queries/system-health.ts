import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface TableStat {
  table_name: string;
  row_count: number;
}

export interface UserStats {
  total: number;
  activeToday: number;
  newThisMonth: number;
}

export interface CompanyStats {
  total: number;
  activeCompanies: number;
  byPlan: { starter: number; professional: number; enterprise: number };
}

export interface StorageStats {
  totalDocuments: number;
  totalSize: number;
}

export interface RecentActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

export interface SystemHealthData {
  tableStats: TableStat[];
  userStats: UserStats;
  companyStats: CompanyStats;
  storageStats: StorageStats;
  recentActivity: RecentActivityEntry[];
  uptimeStatus: "operational" | "degraded";
}

/* ------------------------------------------------------------------
   Key tables to monitor
   ------------------------------------------------------------------ */

const KEY_TABLES = [
  "companies",
  "user_profiles",
  "projects",
  "properties",
  "units",
  "leases",
  "maintenance_requests",
  "invoices",
  "documents",
  "messages",
  "notifications",
  "audit_logs",
  "support_tickets",
  "cms_pages",
  "seo_keywords",
] as const;

/* ------------------------------------------------------------------
   Main query
   ------------------------------------------------------------------ */

export async function getSystemHealth(): Promise<SystemHealthData> {
  const supabase = createAdminClient();

  // ── 1. Table row counts (parallel) ──
  const tableCountPromises = KEY_TABLES.map(async (table) => {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error(`getSystemHealth: count error for ${table}:`, error.message);
      return { table_name: table, row_count: 0 };
    }

    return { table_name: table, row_count: count ?? 0 };
  });

  // ── 2. User stats ──
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthISO = monthStart.toISOString();

  const userStatsPromise = Promise.all([
    // Total users
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true }),
    // Active today — users who signed in today via auth.users
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", todayISO),
    // New this month
    supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthISO),
  ]);

  // ── 3. Company stats ──
  const companyStatsPromise = supabase
    .from("companies")
    .select("id, subscription_plan");

  // Active companies — have at least one project or property
  const activeCompaniesPromise = Promise.all([
    supabase.from("projects").select("company_id"),
    supabase.from("properties").select("company_id"),
  ]);

  // ── 4. Storage stats ──
  const storagePromise = supabase
    .from("documents")
    .select("id, file_size");

  // ── 5. Recent activity ──
  const recentActivityPromise = supabase
    .from("audit_logs")
    .select(
      "id, action, entity_type, created_at, user_profiles(full_name, email)"
    )
    .order("created_at", { ascending: false })
    .limit(10);

  // ── Execute all in parallel ──
  const [
    tableStats,
    [totalUsersRes, activeTodayRes, newThisMonthRes],
    companiesRes,
    [projectsRes, propertiesRes],
    storageRes,
    activityRes,
  ] = await Promise.all([
    Promise.all(tableCountPromises),
    userStatsPromise,
    companyStatsPromise,
    activeCompaniesPromise,
    storagePromise,
    recentActivityPromise,
  ]);

  // ── Process user stats ──
  const userStats: UserStats = {
    total: totalUsersRes.count ?? 0,
    activeToday: activeTodayRes.count ?? 0,
    newThisMonth: newThisMonthRes.count ?? 0,
  };

  // ── Process company stats ──
  const companies = companiesRes.data ?? [];
  const byPlan = { starter: 0, professional: 0, enterprise: 0 };
  for (const c of companies) {
    const plan = (c.subscription_plan ?? "starter").toLowerCase();
    if (plan in byPlan) {
      byPlan[plan as keyof typeof byPlan]++;
    }
  }

  // Determine active companies (those with projects or properties)
  const activeCompanyIds = new Set<string>();
  for (const p of projectsRes.data ?? []) {
    if (p.company_id) activeCompanyIds.add(p.company_id);
  }
  for (const p of propertiesRes.data ?? []) {
    if (p.company_id) activeCompanyIds.add(p.company_id);
  }

  const companyStats: CompanyStats = {
    total: companies.length,
    activeCompanies: activeCompanyIds.size,
    byPlan,
  };

  // ── Process storage stats ──
  const docs = storageRes.data ?? [];
  let totalSize = 0;
  for (const doc of docs) {
    totalSize += doc.file_size ?? 0;
  }
  const storageStats: StorageStats = {
    totalDocuments: docs.length,
    totalSize,
  };

  // ── Process recent activity ──
  const recentActivity: RecentActivityEntry[] = (activityRes.data ?? []).map(
    (row) => {
      const profile = row.user_profiles as unknown as {
        full_name: string | null;
        email: string | null;
      } | null;

      return {
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        created_at: row.created_at,
        user_name: profile?.full_name ?? null,
        user_email: profile?.email ?? null,
      };
    }
  );

  return {
    tableStats,
    userStats,
    companyStats,
    storageStats,
    recentActivity,
    uptimeStatus: "operational",
  };
}
