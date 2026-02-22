import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanResource = "users" | "projects" | "properties" | "storage_gb";

export interface LimitResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  resource: PlanResource;
  planName: string;
}

// ---------------------------------------------------------------------------
// Friendly labels for error messages
// ---------------------------------------------------------------------------

const RESOURCE_LABELS: Record<PlanResource, string> = {
  users: "team members",
  projects: "projects",
  properties: "properties",
  storage_gb: "GB of storage",
};

// ---------------------------------------------------------------------------
// checkPlanLimit — call from API routes before creating a resource
// ---------------------------------------------------------------------------

export async function checkPlanLimit(
  supabase: SupabaseClient,
  companyId: string,
  resource: PlanResource,
): Promise<LimitResult> {
  const unlimited: LimitResult = {
    allowed: true,
    current: 0,
    limit: null,
    resource,
    planName: "unknown",
  };

  // 1. Get company's subscription plan
  const { data: company } = await supabase
    .from("companies")
    .select("subscription_plan")
    .eq("id", companyId)
    .single();

  const planName = company?.subscription_plan || "starter";
  unlimited.planName = planName;

  // 2. Get matching pricing tier (case-insensitive)
  const { data: tier } = await supabase
    .from("pricing_tiers")
    .select("max_users, max_projects, max_properties, max_storage_gb")
    .ilike("name", planName)
    .single();

  // No tier found → treat as unlimited (custom/legacy plan)
  if (!tier) return unlimited;

  // 3. Read the relevant limit
  const limitMap: Record<PlanResource, number | null> = {
    users: tier.max_users,
    projects: tier.max_projects,
    properties: tier.max_properties,
    storage_gb: tier.max_storage_gb,
  };

  const limit = limitMap[resource];

  // null limit = unlimited
  if (limit === null || limit === undefined) {
    return { ...unlimited, limit: null };
  }

  // 4. Count current usage
  const current = await countUsage(supabase, companyId, resource);

  return {
    allowed: current < limit,
    current,
    limit,
    resource,
    planName,
  };
}

// ---------------------------------------------------------------------------
// countUsage — count how many of a resource the company currently has
// ---------------------------------------------------------------------------

async function countUsage(
  supabase: SupabaseClient,
  companyId: string,
  resource: PlanResource,
): Promise<number> {
  switch (resource) {
    case "users": {
      const { count } = await supabase
        .from("company_members")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("is_active", true);
      return count ?? 0;
    }

    case "projects": {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      return count ?? 0;
    }

    case "properties": {
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      return count ?? 0;
    }

    case "storage_gb": {
      const { data } = await supabase
        .from("documents")
        .select("file_size")
        .eq("company_id", companyId);

      if (!data || data.length === 0) return 0;

      const totalBytes = data.reduce(
        (sum: number, doc: { file_size: number }) => sum + (doc.file_size || 0),
        0,
      );
      // Convert bytes to GB (rounded up to 1 decimal)
      return Math.round((totalBytes / 1_000_000_000) * 10) / 10;
    }

    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// planLimitError — return a 403 NextResponse when the limit is exceeded
// ---------------------------------------------------------------------------

export function planLimitError(result: LimitResult): NextResponse {
  const label = RESOURCE_LABELS[result.resource];
  const planDisplay = result.planName.charAt(0).toUpperCase() + result.planName.slice(1);

  return NextResponse.json(
    {
      error: `You've reached the maximum of ${result.limit} ${label} on the ${planDisplay} plan. Upgrade your plan to add more.`,
      code: "PLAN_LIMIT_EXCEEDED",
      resource: result.resource,
      current: result.current,
      limit: result.limit,
    },
    { status: 403 },
  );
}
