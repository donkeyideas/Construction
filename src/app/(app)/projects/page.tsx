import Link from "next/link";
import { Plus } from "lucide-react";
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
      {/* Header */}
      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p className="projects-header-sub">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in your portfolio
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          <Plus size={16} />
          New Project
        </Link>
      </div>

      {/* Client-side filters, search, view toggle, and project grid/table */}
      <ProjectListClient projects={projects} />
    </div>
  );
}
