import { createClient } from "@/lib/supabase/server";
import { getProjects, getCurrentUserCompany } from "@/lib/queries/projects";
import ProjectListClient from "./ProjectListClient";

export const metadata = {
  title: "Projects - ConstructionERP",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  let projects: Awaited<ReturnType<typeof getProjects>> = [];

  if (userCtx) {
    projects = await getProjects(supabase, userCtx.companyId);
  }

  return (
    <div>
      {/* Client component handles header + filters + grid/table */}
      <ProjectListClient projects={projects} />
    </div>
  );
}
