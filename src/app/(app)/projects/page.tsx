import { createClient } from "@/lib/supabase/server";
import {
  getProjects,
  getCurrentUserCompany,
  getCompanyMembers,
} from "@/lib/queries/projects";
import ProjectListClient from "./ProjectListClient";

export const metadata = {
  title: "Projects - Buildwrk",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let memberOptions: { id: string; name: string; role: string }[] = [];

  if (userCtx) {
    const [proj, members] = await Promise.all([
      getProjects(supabase, userCtx.companyId),
      getCompanyMembers(supabase, userCtx.companyId),
    ]);
    projects = proj;
    memberOptions = members
      .map((m) => {
        const u = m.user as unknown as {
          id: string;
          full_name: string;
          email: string;
        } | null;
        return {
          id: u?.id ?? "",
          name: u?.full_name || u?.email || "Unknown",
          role: m.role,
        };
      })
      .filter((m) => m.id);
  }

  return (
    <div>
      {/* Client component handles header + filters + grid/table */}
      <ProjectListClient projects={projects} memberOptions={memberOptions} />
    </div>
  );
}
