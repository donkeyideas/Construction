import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getIncidents, getIncidentStats, getToolboxTalks } from "@/lib/queries/safety";
import SafetyDashboardClient from "./SafetyDashboardClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Safety - Buildwrk",
};

export default async function SafetyPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [incidents, stats, toolboxTalks] = await Promise.all([
    getIncidents(supabase, userCtx.companyId),
    getIncidentStats(supabase, userCtx.companyId),
    getToolboxTalks(supabase, userCtx.companyId),
  ]);

  return (
    <SafetyDashboardClient
      incidents={incidents.slice(0, 10)}
      stats={stats}
      toolboxTalks={toolboxTalks.slice(0, 5)}
    />
  );
}
