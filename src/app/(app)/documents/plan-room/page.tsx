import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPlanRoomDocuments, getDrawingSets } from "@/lib/queries/documents";
import { Map } from "lucide-react";
import PlanRoomClient from "./PlanRoomClient";

export const metadata = {
  title: "Plan Room - Buildwrk",
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

  const { companyId, userId } = userCompany;

  // Parallel fetch: documents, drawing sets, projects, user profile
  const [documents, drawingSets, projectsResult, profileResult] = await Promise.all([
    getPlanRoomDocuments(supabase, companyId),
    getDrawingSets(supabase, companyId),
    supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name"),
    supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", userId)
      .single(),
  ]);

  const projectList: { id: string; name: string }[] = projectsResult.data ?? [];
  const userName = profileResult.data?.full_name ?? "User";

  return (
    <PlanRoomClient
      documents={documents}
      drawingSets={drawingSets}
      projectList={projectList}
      companyId={companyId}
      userId={userId}
      userName={userName}
    />
  );
}
