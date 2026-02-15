import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProjects } from "@/lib/queries/financial";
import InspectionsClient from "./InspectionsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Safety Inspections - Buildwrk",
};

export default async function SafetyInspectionsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [inspectionsResult, projects] = await Promise.all([
    supabase
      .from("safety_inspections")
      .select("*, projects(name)")
      .eq("company_id", userCtx.companyId)
      .order("inspection_date", { ascending: false }),
    getProjects(supabase, userCtx.companyId),
  ]);

  return (
    <InspectionsClient
      inspections={inspectionsResult.data ?? []}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
