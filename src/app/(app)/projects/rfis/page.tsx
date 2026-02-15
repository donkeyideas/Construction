import {
  MessageSquareMore,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import RfisClient from "./RfisClient";

export const metadata = {
  title: "RFIs - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function RfisPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><MessageSquareMore size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access RFIs.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;

  // Build query
  let query = supabase
    .from("rfis")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  // Fetch RFIs, KPI data, projects, and company members in parallel
  const [rfisResult, allRfisResult, projectsResult, membersResult] =
    await Promise.all([
      query,
      supabase
        .from("rfis")
        .select("id, status")
        .eq("company_id", userCompany.companyId),
      supabase
        .from("projects")
        .select("id, name, code")
        .eq("company_id", userCompany.companyId)
        .order("name"),
      supabase
        .from("company_members")
        .select("user_id, role, user:user_profiles!company_members_user_profile_fkey(full_name, email)")
        .eq("company_id", userCompany.companyId)
        .eq("is_active", true),
    ]);

  const rows = rfisResult.data ?? [];
  const all = allRfisResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const members = (membersResult.data ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    user: m.user as unknown as { full_name: string | null; email: string | null } | null,
  }));

  // KPI calculations
  const totalCount = all.length;
  const openCount = all.filter((r) => r.status === "open").length;
  const answeredCount = all.filter((r) => r.status === "answered").length;
  const closedCount = all.filter((r) => r.status === "closed").length;

  // User name lookup
  const userIds = new Set<string>();
  for (const rfi of rows) {
    if (rfi.submitted_by) userIds.add(rfi.submitted_by);
    if (rfi.assigned_to) userIds.add(rfi.assigned_to);
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
    <RfisClient
      rows={rows}
      kpi={{ totalCount, openCount, answeredCount, closedCount }}
      userMap={userMap}
      projects={projects}
      members={members}
      activeStatus={activeStatus}
    />
  );
}
