import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import SubmittalsClient from "./SubmittalsClient";

export const metadata = { title: "Submittals - Buildwrk" };

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SubmittalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><ClipboardList size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access Submittals.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;

  // Build query
  let query = supabase
    .from("submittals")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  // Fetch data in parallel
  const [submittalsResult, allSubmittalsResult, projectsResult, membersResult] =
    await Promise.all([
      query,
      supabase
        .from("submittals")
        .select("id, status")
        .eq("company_id", userCompany.companyId),
      supabase
        .from("projects")
        .select("id, name, code")
        .eq("company_id", userCompany.companyId)
        .order("name"),
      supabase
        .from("company_members")
        .select("user_id, role")
        .eq("company_id", userCompany.companyId)
        .eq("is_active", true),
    ]);

  const rows = submittalsResult.data ?? [];
  const all = allSubmittalsResult.data ?? [];
  const projects = projectsResult.data ?? [];

  // Batch-fetch user profiles for members
  const subMemberData = membersResult.data ?? [];
  const subMemberUserIds = [...new Set(subMemberData.map((m) => m.user_id).filter(Boolean))] as string[];
  let subMemberProfileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (subMemberUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", subMemberUserIds);
    subMemberProfileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p])
    );
  }
  const members = subMemberData.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    user: m.user_id ? subMemberProfileMap.get(m.user_id) ?? null : null,
  }));

  // KPIs
  const totalCount = all.length;
  const pendingCount = all.filter((s) => s.status === "pending").length;
  const underReviewCount = all.filter((s) => s.status === "under_review").length;
  const approvedCount = all.filter((s) => s.status === "approved").length;
  const rejectedCount = all.filter((s) => s.status === "rejected").length;

  // User name lookup
  const userIds = new Set<string>();
  for (const sub of rows) {
    if (sub.submitted_by) userIds.add(sub.submitted_by);
    if (sub.reviewer_id) userIds.add(sub.reviewer_id);
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
    <SubmittalsClient
      rows={rows}
      kpi={{ totalCount, pendingCount, underReviewCount, approvedCount, rejectedCount }}
      userMap={userMap}
      projects={projects}
      members={members}
      activeStatus={activeStatus}
    />
  );
}
