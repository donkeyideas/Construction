import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import EstimatingClient from "./EstimatingClient";

export const metadata = {
  title: "Estimating - Buildwrk",
};

export default async function EstimatingPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Calculator size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access estimating.</div>
      </div>
    );
  }

  const [estimatesResult, assembliesResult, projectsResult] = await Promise.all([
    supabase
      .from("estimates")
      .select("*")
      .eq("company_id", userCompany.companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("estimate_assemblies")
      .select("*")
      .eq("company_id", userCompany.companyId)
      .order("name"),
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("company_id", userCompany.companyId)
      .order("name"),
  ]);

  return (
    <EstimatingClient
      estimates={estimatesResult.data ?? []}
      assemblies={assembliesResult.data ?? []}
      projects={projectsResult.data ?? []}
      companyId={userCompany.companyId}
    />
  );
}
