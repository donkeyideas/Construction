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

  return (
    <ProjectDetailClient
      project={result.project}
      phases={result.phases}
      tasks={result.tasks}
      dailyLogs={result.dailyLogs}
      rfis={result.rfis}
      changeOrders={result.changeOrders}
      stats={stats}
    />
  );
}
