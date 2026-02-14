import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectById,
  getProjectStats,
  getCurrentUserCompany,
} from "@/lib/queries/projects";
import ProjectDetailClient from "./ProjectDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await getProjectById(supabase, id);
  if (!result) {
    return { title: "Project Not Found - ConstructionERP" };
  }
  return {
    title: `${result.project.name} - ConstructionERP`,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    notFound();
  }

  const result = await getProjectById(supabase, id);

  if (!result) {
    notFound();
  }

  // Verify the project belongs to the user's company
  if (result.project.company_id !== userCtx.companyId) {
    notFound();
  }

  const stats = await getProjectStats(supabase, id);

  // Build userMap for resolving UUIDs to names
  const userIds = new Set<string>();
  for (const co of result.changeOrders) {
    if (co.requested_by) userIds.add(co.requested_by);
    if (co.approved_by) userIds.add(co.approved_by);
  }
  for (const rfi of result.rfis) {
    if (rfi.submitted_by) userIds.add(rfi.submitted_by);
    if (rfi.assigned_to) userIds.add(rfi.assigned_to);
  }
  for (const log of result.dailyLogs) {
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
    <ProjectDetailClient
      project={result.project}
      phases={result.phases}
      tasks={result.tasks}
      dailyLogs={result.dailyLogs}
      rfis={result.rfis}
      changeOrders={result.changeOrders}
      stats={stats}
      userMap={userMap}
    />
  );
}
