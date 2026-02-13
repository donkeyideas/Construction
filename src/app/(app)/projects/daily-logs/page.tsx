import {
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import DailyLogsClient from "./DailyLogsClient";

export const metadata = {
  title: "Daily Logs - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DailyLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><ClipboardList size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access daily logs.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;

  // Build query
  let query = supabase
    .from("daily_logs")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("log_date", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  // Fetch daily logs, KPI data, and projects in parallel
  const [dailyLogsResult, allLogsResult, projectsResult] = await Promise.all([
    query,
    supabase
      .from("daily_logs")
      .select("id, status")
      .eq("company_id", userCompany.companyId),
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("company_id", userCompany.companyId)
      .order("name"),
  ]);

  const rows = dailyLogsResult.data ?? [];
  const all = allLogsResult.data ?? [];
  const projects = projectsResult.data ?? [];

  // KPI calculations
  const totalCount = all.length;
  const pendingReview = all.filter((l) => l.status === "submitted").length;
  const approvedCount = all.filter((l) => l.status === "approved").length;

  // User name lookup
  const userIds = new Set<string>();
  for (const log of rows) {
    if (log.created_by) userIds.add(log.created_by);
    if (log.approved_by) userIds.add(log.approved_by);
  }

  const userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", Array.from(userIds));

    for (const p of profiles ?? []) {
      userMap[p.id] = p.full_name || p.email || "Unknown";
    }
  }

  return (
    <DailyLogsClient
      rows={rows}
      kpi={{ totalCount, pendingReview, approvedCount }}
      userMap={userMap}
      projects={projects}
      activeStatus={activeStatus}
    />
  );
}
