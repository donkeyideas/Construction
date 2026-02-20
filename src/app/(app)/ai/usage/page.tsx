import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import UsageClient from "./UsageClient";

export const metadata = { title: "API Usage - Buildwrk" };

export default async function UsagePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const companyId = userCompany.companyId;

  // Get current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Fetch in parallel: provider configs, usage logs for current month
  const [providersRes, usageLogsRes] = await Promise.all([
    supabase
      .from("ai_provider_configs")
      .select("id, provider_name, model_id, is_active, monthly_budget_limit, current_month_usage")
      .eq("company_id", companyId),
    supabase
      .from("ai_usage_log")
      .select("id, provider_config_id, user_id, action_type, model_id, input_tokens, output_tokens, estimated_cost, created_at")
      .eq("company_id", companyId)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return (
    <UsageClient
      providers={providersRes.data ?? []}
      usageLogs={usageLogsRes.data ?? []}
      companyId={companyId}
    />
  );
}
