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

  // Fetch provider info and conversations in parallel
  const [providersRes, conversationsRes] = await Promise.all([
    supabase
      .from("ai_provider_configs")
      .select("id, provider_name, is_active")
      .eq("company_id", userCompany.companyId)
      .eq("is_active", true)
      .limit(1),
    supabase
      .from("ai_conversations")
      .select("id, title, created_at, updated_at")
      .eq("company_id", userCompany.companyId)
      .eq("user_id", userCompany.userId)
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const hasProvider = (providersRes.data?.length ?? 0) > 0;
  const providerName = providersRes.data?.[0]?.provider_name ?? null;

  // Get user initials from profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", userCompany.userId)
    .single();

  const fullName = profile?.full_name ?? "User";
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AIChatClient
      companyId={userCompany.companyId}
      userId={userCompany.userId}
      userName={fullName}
      userInitials={initials}
      hasProvider={hasProvider}
      providerName={providerName}
      initialConversations={conversationsRes.data ?? []}
    />
  );
}
