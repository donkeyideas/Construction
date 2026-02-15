import { createAdminClient } from "@/lib/supabase/admin";

export interface OnboardingChecks {
  has_users: boolean;
  has_projects: boolean;
  has_properties: boolean;
  has_financial_data: boolean;
  has_documents: boolean;
}

export interface CompanyOnboardingStatus {
  company_id: string;
  company_name: string;
  plan: string;
  created_at: string;
  checks: OnboardingChecks;
  completion_pct: number;
}

/**
 * For each company, derive onboarding status from existing data.
 * No new tables required -- checks company_members, projects, properties,
 * invoices, budgets, and documents.
 */
export async function getCompanyOnboardingStatus(): Promise<
  CompanyOnboardingStatus[]
> {
  const supabase = createAdminClient();

  // Fetch all companies
  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, name, subscription_plan, created_at")
    .order("created_at", { ascending: false });

  if (compErr || !companies) {
    console.error("getCompanyOnboardingStatus companies error:", compErr);
    return [];
  }

  // Fetch counts per company in parallel
  const [
    membersResult,
    projectsResult,
    propertiesResult,
    invoicesResult,
    budgetsResult,
    documentsResult,
  ] = await Promise.all([
    supabase.from("company_members").select("company_id"),
    supabase.from("projects").select("company_id"),
    supabase.from("properties").select("company_id"),
    supabase.from("invoices").select("company_id"),
    supabase.from("budgets").select("company_id"),
    supabase.from("documents").select("company_id"),
  ]);

  // Build count maps
  function buildCountMap(
    data: { company_id: string }[] | null
  ): Record<string, number> {
    const map: Record<string, number> = {};
    if (!data) return map;
    for (const row of data) {
      map[row.company_id] = (map[row.company_id] || 0) + 1;
    }
    return map;
  }

  const memberCounts = buildCountMap(membersResult.data);
  const projectCounts = buildCountMap(projectsResult.data);
  const propertyCounts = buildCountMap(propertiesResult.data);
  const invoiceCounts = buildCountMap(invoicesResult.data);
  const budgetCounts = buildCountMap(budgetsResult.data);
  const documentCounts = buildCountMap(documentsResult.data);

  return companies.map((c) => {
    const has_users = (memberCounts[c.id] || 0) > 1;
    const has_projects = (projectCounts[c.id] || 0) > 0;
    const has_properties = (propertyCounts[c.id] || 0) > 0;
    const has_financial_data =
      (invoiceCounts[c.id] || 0) > 0 || (budgetCounts[c.id] || 0) > 0;
    const has_documents = (documentCounts[c.id] || 0) > 0;

    const checks: OnboardingChecks = {
      has_users,
      has_projects,
      has_properties,
      has_financial_data,
      has_documents,
    };

    const total = Object.values(checks).length;
    const passed = Object.values(checks).filter(Boolean).length;
    const completion_pct = Math.round((passed / total) * 100);

    return {
      company_id: c.id,
      company_name: c.name,
      plan: c.subscription_plan,
      created_at: c.created_at,
      checks,
      completion_pct,
    };
  });
}
