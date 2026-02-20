import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAIProviders, getAIUsageSummary, maskApiKey } from "@/lib/queries/ai";
import AIProvidersClient from "./AIProvidersClient";

export const metadata = {
  title: "AI Provider Configuration - Buildwrk",
};

export default async function AIProvidersPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId, role: currentUserRole } = userCompany;

  // Only owners and admins can manage AI providers
  if (currentUserRole !== "owner" && currentUserRole !== "admin") {
    redirect("/dashboard");
  }

  const [providers, usageSummary] = await Promise.all([
    getAIProviders(supabase, companyId),
    getAIUsageSummary(supabase, companyId),
  ]);

  // Build a usage map keyed by provider_name for easy lookup
  const usageMap = new Map(
    usageSummary.map((u) => [u.provider_name, u])
  );

  // Prepare providers for the client (mask API keys)
  const maskedProviders = providers.map((p) => ({
    id: p.id,
    provider_name: p.provider_name,
    api_key_masked: maskApiKey(p.api_key_encrypted),
    model_id: p.model_id,
    is_active: p.is_active,
    use_for_chat: p.use_for_chat,
    use_for_documents: p.use_for_documents,
    use_for_predictions: p.use_for_predictions,
    is_default: p.is_default,
    monthly_budget_limit: p.monthly_budget_limit,
    current_month_usage: p.current_month_usage,
    created_at: p.created_at,
  }));

  // Calculate summary stats
  const activeCount = providers.filter((p) => p.is_active).length;
  const totalBudget = providers.reduce(
    (sum, p) => sum + (p.monthly_budget_limit ? Number(p.monthly_budget_limit) : 0),
    0
  );
  const totalUsage = providers.reduce(
    (sum, p) => sum + (p.current_month_usage ? Number(p.current_month_usage) : 0),
    0
  );
  const totalRequests = usageSummary.reduce(
    (sum, u) => sum + u.total_requests,
    0
  );

  return (
    <AIProvidersClient
      providers={maskedProviders}
      usageMap={Object.fromEntries(usageMap)}
      stats={{
        activeCount,
        totalBudget,
        totalUsage,
        totalRequests,
      }}
    />
  );
}
