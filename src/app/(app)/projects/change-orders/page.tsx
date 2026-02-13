import {
  FileEdit,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import ChangeOrdersClient from "./ChangeOrdersClient";

export const metadata = {
  title: "Change Orders - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ChangeOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileEdit size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access change orders.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;

  // Fetch change orders, KPI data, and projects in parallel
  let query = supabase
    .from("change_orders")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const [changeOrdersResult, allCosResult, projectsResult] = await Promise.all([
    query,
    supabase
      .from("change_orders")
      .select("id, status, amount")
      .eq("company_id", userCompany.companyId),
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("company_id", userCompany.companyId)
      .order("name"),
  ]);

  const rows = changeOrdersResult.data ?? [];
  const all = allCosResult.data ?? [];
  const projects = projectsResult.data ?? [];

  // KPI calculations
  const totalCount = all.length;
  const pendingValue = all
    .filter((co) => co.status === "submitted" || co.status === "draft")
    .reduce((sum, co) => sum + (co.amount ?? 0), 0);
  const approvedValue = all
    .filter((co) => co.status === "approved")
    .reduce((sum, co) => sum + (co.amount ?? 0), 0);
  const awaitingApproval = all.filter((co) => co.status === "submitted").length;

  // User name lookup
  const userIds = new Set<string>();
  for (const co of rows) {
    if (co.requested_by) userIds.add(co.requested_by);
    if (co.approved_by) userIds.add(co.approved_by);
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
    <ChangeOrdersClient
      rows={rows}
      kpi={{ totalCount, pendingValue, approvedValue, awaitingApproval }}
      userMap={userMap}
      projects={projects}
      activeStatus={activeStatus}
    />
  );
}
