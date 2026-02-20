import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import ReportGeneratorClient from "./ReportGeneratorClient";

export const metadata = { title: "AI Report Generator - Buildwrk" };

export default async function ReportGeneratorPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  // Fetch projects and check if AI provider is configured
  const [projectsRes, providerRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, code, status")
      .eq("company_id", userCompany.companyId)
      .order("name"),
    supabase
      .from("ai_provider_configs")
      .select("id, provider_name, is_active")
      .eq("company_id", userCompany.companyId)
      .eq("is_active", true)
      .limit(1),
  ]);

  return (
    <ReportGeneratorClient
      companyId={userCompany.companyId}
      projects={projectsRes.data ?? []}
      hasProvider={(providerRes.data?.length ?? 0) > 0}
    />
  );
}
