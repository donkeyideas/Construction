import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getIncidents, getIncidentStats } from "@/lib/queries/safety";
import { getCompanyMembers } from "@/lib/queries/tickets";
import { getProjects } from "@/lib/queries/financial";
import SafetyIncidentsClient from "./SafetyIncidentsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Safety Incidents - Buildwrk",
};

export default async function SafetyIncidentsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [incidents, stats, members, projects] = await Promise.all([
    getIncidents(supabase, userCtx.companyId),
    getIncidentStats(supabase, userCtx.companyId),
    getCompanyMembers(supabase, userCtx.companyId),
    getProjects(supabase, userCtx.companyId),
  ]);

  return (
    <SafetyIncidentsClient
      incidents={incidents}
      stats={stats}
      members={members}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
