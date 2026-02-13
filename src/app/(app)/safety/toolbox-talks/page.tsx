import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getToolboxTalks } from "@/lib/queries/safety";
import { getCompanyMembers } from "@/lib/queries/tickets";
import { getProjects } from "@/lib/queries/financial";
import ToolboxTalksClient from "./ToolboxTalksClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Toolbox Talks - ConstructionERP",
};

export default async function ToolboxTalksPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [talks, members, projects] = await Promise.all([
    getToolboxTalks(supabase, userCtx.companyId),
    getCompanyMembers(supabase, userCtx.companyId),
    getProjects(supabase, userCtx.companyId),
  ]);

  return (
    <ToolboxTalksClient
      talks={talks}
      members={members}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
