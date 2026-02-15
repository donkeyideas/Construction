import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getJobCostingSummary,
  getProjects,
} from "@/lib/queries/financial";
import JobCostingClient from "./JobCostingClient";

export const metadata = {
  title: "Job Costing - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function JobCostingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <BarChart3 size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to start tracking job costs.
        </div>
      </div>
    );
  }

  const projects = await getProjects(supabase, userCompany.companyId);
  const selectedProjectId =
    params.projectId || (projects.length > 0 ? projects[0].id : null);

  let summary = null;
  if (selectedProjectId) {
    summary = await getJobCostingSummary(
      supabase,
      userCompany.companyId,
      selectedProjectId
    );
  }

  return (
    <JobCostingClient
      projects={projects}
      selectedProjectId={selectedProjectId}
      summary={summary}
    />
  );
}
