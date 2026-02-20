import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import KnowledgeBaseClient from "./KnowledgeBaseClient";

export const metadata = { title: "Knowledge Base - Buildwrk" };

export default async function KnowledgeBasePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId } = userCompany;

  // Check if an active AI provider is configured
  const { data: providerRows } = await supabase
    .from("ai_provider_configs")
    .select("id, provider_name, is_active")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .limit(1);

  const hasProvider = (providerRows?.length ?? 0) > 0;

  return (
    <KnowledgeBaseClient companyId={companyId} hasProvider={hasProvider} />
  );
}
