import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import type { BudgetLineRow } from "@/lib/queries/financial";
import BudgetClient from "./BudgetClient";

export const metadata = {
  title: "Budget vs Actual - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function BudgetPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  // Fetch ALL projects (not just those with budget data)
  const { data: allProjects } = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("company_id", userCompany.companyId)
    .order("name", { ascending: true });

  const projects = (allProjects ?? []) as { id: string; name: string; code: string | null }[];

  const selectedProjectId = params.projectId || (projects.length > 0 ? projects[0].id : null);

  // Fetch budget lines for the selected project
  let budgetLines: BudgetLineRow[] = [];
  if (selectedProjectId) {
    const { data: linesData } = await supabase
      .from("project_budget_lines")
      .select("*")
      .eq("company_id", userCompany.companyId)
      .eq("project_id", selectedProjectId)
      .order("csi_code", { ascending: true });
    budgetLines = (linesData ?? []) as BudgetLineRow[];
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Budget vs Actual</h2>
          <p className="fin-header-sub">Compare budgeted costs against actual spending by project and CSI division</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BarChart3 size={48} />
            </div>
            <div className="fin-empty-title">No Projects Found</div>
            <div className="fin-empty-desc">
              Create a project first, then you can set up budget lines here
              to track budget vs actual costs.
            </div>
          </div>
        </div>
      ) : (
        <BudgetClient
          projects={projects}
          selectedProjectId={selectedProjectId}
          budgetLines={budgetLines}
        />
      )}
    </div>
  );
}
