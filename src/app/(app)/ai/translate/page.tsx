import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import TranslateClient from "./TranslateClient";

export const metadata = { title: "AI Translate - Buildwrk" };

export default async function TranslatePage() {
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

  return <TranslateClient companyId={companyId} hasProvider={hasProvider} />;
}
