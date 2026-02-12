import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { AIChatClient } from "./AIChatClient";

export const metadata = {
  title: "AI Assistant - ConstructionERP",
};

export default async function AIAssistantPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  // Check if company has any active AI provider
  const { data: providers } = await supabase
    .from("ai_provider_configs")
    .select("id")
    .eq("company_id", userCompany.companyId)
    .eq("is_active", true)
    .limit(1);

  const hasProvider = (providers?.length ?? 0) > 0;

  return (
    <AIChatClient
      companyId={userCompany.companyId}
      userId={userCompany.userId}
      userName={userCompany.companyName}
      hasProvider={hasProvider}
    />
  );
}
