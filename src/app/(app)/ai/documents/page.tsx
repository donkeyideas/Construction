import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import DocumentAIClient from "./DocumentAIClient";

export const metadata = { title: "Document AI - Buildwrk" };

export default async function DocumentAIPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { data: providers } = await supabase
    .from("ai_provider_configs")
    .select("id, provider_name, is_active")
    .eq("company_id", userCompany.companyId)
    .eq("is_active", true)
    .limit(1);

  return (
    <DocumentAIClient
      companyId={userCompany.companyId}
      hasProvider={(providers?.length ?? 0) > 0}
    />
  );
}
