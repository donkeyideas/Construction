import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanDistributionItem {
  plan: string;
  count: number;
  monthlyPrice: number;
}

export interface RevenueStats {
  totalCompanies: number;
  activeSubscriptions: number;
  trialCompanies: number;
  pastDueCompanies: number;
  planDistribution: PlanDistributionItem[];
  estimatedMRR: number;
  estimatedARR: number;
}

export interface SubscriptionEvent {
  id: string;
  company_name: string;
  event_type: string;
  plan_from: string | null;
  plan_to: string | null;
  amount: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get revenue stats by joining companies with pricing_tiers.
 *
 * 1. Count companies by subscription_plan (group by)
 * 2. Count by subscription_status
 * 3. Fetch pricing_tiers for monthly prices
 * 4. Calculate MRR = sum(count * monthly_price for each plan)
 * 5. ARR = MRR * 12
 */
export async function getRevenueStats(
  supabase: SupabaseClient,
): Promise<RevenueStats> {
  const [companiesResult, tiersResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id, subscription_plan, subscription_status"),
    supabase
      .from("pricing_tiers")
      .select("name, monthly_price")
      .order("sort_order", { ascending: true }),
  ]);

  const companies = companiesResult.data ?? [];
  const tiers = tiersResult.data ?? [];

  // Build price lookup (lowercase plan name -> monthly_price)
  const priceByPlan: Record<string, number> = {};
  for (const tier of tiers) {
    priceByPlan[tier.name.toLowerCase()] = tier.monthly_price ?? 0;
  }

  // Count companies by plan (only active subscriptions count for revenue)
  const activePlanCounts: Record<string, number> = {};
  let activeSubscriptions = 0;
  let trialCompanies = 0;
  let pastDueCompanies = 0;

  for (const c of companies) {
    const status = c.subscription_status || "active";
    const plan = (c.subscription_plan || "free").toLowerCase();

    if (status === "active") {
      activeSubscriptions++;
      activePlanCounts[plan] = (activePlanCounts[plan] || 0) + 1;
    } else if (status === "trialing" || status === "trial") {
      trialCompanies++;
    } else if (status === "past_due") {
      pastDueCompanies++;
    }
  }

  // Build plan distribution with prices
  const allPlans = new Set([
    ...Object.keys(activePlanCounts),
    ...Object.keys(priceByPlan),
  ]);

  const planDistribution: PlanDistributionItem[] = [];
  let estimatedMRR = 0;

  for (const plan of allPlans) {
    const count = activePlanCounts[plan] || 0;
    const monthlyPrice = priceByPlan[plan] || 0;
    const monthlyRevenue = count * monthlyPrice;

    planDistribution.push({ plan, count, monthlyPrice });
    estimatedMRR += monthlyRevenue;
  }

  // Sort by monthly price descending (highest-value plans first)
  planDistribution.sort((a, b) => b.monthlyPrice - a.monthlyPrice);

  return {
    totalCompanies: companies.length,
    activeSubscriptions,
    trialCompanies,
    pastDueCompanies,
    planDistribution,
    estimatedMRR,
    estimatedARR: estimatedMRR * 12,
  };
}

/**
 * Get recent subscription events with company names.
 * Joins subscription_events with companies table to get company_name.
 */
export async function getRecentSubscriptionEvents(
  supabase: SupabaseClient,
  limit = 50,
): Promise<SubscriptionEvent[]> {
  const { data, error } = await supabase
    .from("subscription_events")
    .select(
      "id, company_id, event_type, plan_from, plan_to, amount, created_at, companies(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentSubscriptionEvents error:", error);
    return [];
  }

  return (data ?? []).map((e) => ({
    id: e.id,
    company_name:
      (e.companies as unknown as { name: string } | null)?.name ?? "Unknown",
    event_type: e.event_type,
    plan_from: e.plan_from,
    plan_to: e.plan_to,
    amount: e.amount,
    created_at: e.created_at,
  }));
}
