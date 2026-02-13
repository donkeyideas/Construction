import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { Map } from "lucide-react";
import PlanRoomClient from "./PlanRoomClient";

export const metadata = {
  title: "Plan Room - ConstructionERP",
};

export default async function PlanRoomPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Map size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access the plan room.</div>
      </div>
    );
  }

  const { companyId } = userCompany;

  // Fetch plan and spec documents with project info and uploader
  const [{ data: documents }, { data: projectIds }] = await Promise.all([
    supabase
      .from("documents")
      .select("*, projects:project_id(id, name), uploader:uploaded_by(full_name, email)")
      .eq("company_id", companyId)
      .in("category", ["plan", "spec"])
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("project_id")
      .eq("company_id", companyId)
      .in("category", ["plan", "spec"])
      .not("project_id", "is", null),
  ]);

  const allDocs = (documents ?? []).map((doc) => ({
    id: doc.id as string,
    name: doc.name as string,
    file_type: (doc.file_type as string) ?? "",
    file_size: (doc.file_size as number) ?? 0,
    category: (doc.category as string) ?? "",
    version: (doc.version as number) ?? 1,
    created_at: (doc.created_at as string) ?? "",
    project_id: doc.project_id as string | null,
    projects: doc.projects as { id: string; name: string } | null,
    uploader: doc.uploader as { full_name: string; email: string } | null,
  }));

  // Get unique project IDs
  const uniqueProjectIds = [
    ...new Set(
      (projectIds ?? []).map((d) => d.project_id).filter(Boolean) as string[]
    ),
  ];

  let projectList: { id: string; name: string }[] = [];
  if (uniqueProjectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", uniqueProjectIds)
      .order("name");
    projectList = projects ?? [];
  }

  return <PlanRoomClient documents={allDocs} projectList={projectList} />;
}
