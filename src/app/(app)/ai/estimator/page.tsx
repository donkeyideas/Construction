import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import CostEstimatorClient from "./CostEstimatorClient";

export const metadata = { title: "AI Cost Estimator - Buildwrk" };

export default async function CostEstimatorPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId } = userCompany;

  // Fetch provider status and projects in parallel
  const [providerRes, projectsRes] = await Promise.all([
    supabase
      .from("ai_provider_configs")
      .select("id, provider_name, is_active")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .limit(1),
    supabase
      .from("projects")
      .select("id, name, code, status, contract_amount, project_type")
      .eq("company_id", companyId)
      .order("name"),
  ]);

  const hasProvider = (providerRes.data?.length ?? 0) > 0;

  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    code: (p.code ?? "") as string,
    status: (p.status ?? "") as string,
    contractAmount: Number(p.contract_amount) || 0,
    projectType: (p.project_type ?? "") as string,
  }));

  return (
    <CostEstimatorClient
      companyId={companyId}
      hasProvider={hasProvider}
      projects={projects}
    />
  );
}
