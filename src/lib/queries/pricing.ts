import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PricingTier {
  id: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  is_popular: boolean;
  sort_order: number;
  max_users: number | null;
  max_projects: number | null;
  max_properties: number | null;
  max_storage_gb: number | null;
  max_modules: number | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getPublicPricingTiers(
  supabase: SupabaseClient,
): Promise<PricingTier[]> {
  try {
    const { data, error } = await supabase
      .from("pricing_tiers")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data as PricingTier[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Map DB tiers to the format expected by the homepage PricingSection component */
export function mapTiersToHomepagePlans(tiers: PricingTier[]) {
  return tiers.map((tier) => ({
    name: tier.name,
    description: getDescription(tier),
    price: String(tier.monthly_price),
    period: "/month",
    features: tier.features || [],
    featured: tier.is_popular,
    badge: tier.is_popular ? "Most Popular" : "",
  }));
}

/** Generate a human-readable description from the tier */
function getDescription(tier: PricingTier): string {
  const descriptions: Record<string, string> = {
    Starter: "Perfect for small teams getting started",
    Professional: "For growing companies that need more power",
    Enterprise: "Unlimited scale for large organizations",
    Free: "Get started at no cost",
    Basic: "Essential tools for small teams",
    Growth: "Scale your operations with advanced features",
    Business: "Full-featured plan for established companies",
  };

  return descriptions[tier.name] || `${tier.name} plan`;
}
