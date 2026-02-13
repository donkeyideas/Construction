import Link from "next/link";
import { BarChart3, DollarSign, ClipboardList, TrendingDown, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import type { BudgetLineRow } from "@/lib/queries/financial";

export const metadata = {
  title: "Budget vs Actual - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

function getVarianceClass(budgeted: number, actual: number): string {
  if (budgeted === 0) return "";
  const pctUsed = (actual / budgeted) * 100;
  if (pctUsed > 100) return "variance-negative";
  if (pctUsed >= 90) return "variance-warning";
  return "variance-positive";
}

function getBudgetBarClass(budgeted: number, actual: number): string {
  if (budgeted === 0) return "under";
  const pctUsed = (actual / budgeted) * 100;
  if (pctUsed > 100) return "over";
  if (pctUsed >= 90) return "warning";
  return "under";
}

export default async function BudgetPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><BarChart3 size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access budget tracking.</div>
      </div>
    );
  }

  // Fetch projects that have budget lines (use distinct project_id from budget lines)
  const { data: budgetProjectIds } = await supabase
    .from("project_budget_lines")
    .select("project_id")
    .eq("company_id", userCompany.companyId);

  const uniqueProjectIds = [...new Set((budgetProjectIds ?? []).map((r) => r.project_id))];

  let projects: { id: string; name: string; code: string | null }[] = [];
  if (uniqueProjectIds.length > 0) {
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name, code")
      .in("id", uniqueProjectIds)
      .order("name", { ascending: true });
    projects = (projectsData ?? []) as { id: string; name: string; code: string | null }[];
  }

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

  // Compute KPI totals
  const totalBudget = budgetLines.reduce((sum, l) => sum + (l.budgeted_amount ?? 0), 0);
  const totalCommitted = budgetLines.reduce((sum, l) => sum + (l.committed_amount ?? 0), 0);
  const totalActual = budgetLines.reduce((sum, l) => sum + (l.actual_amount ?? 0), 0);
  const totalVariance = budgetLines.reduce((sum, l) => sum + (l.variance ?? 0), 0);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Budget vs Actual</h2>
          <p className="fin-header-sub">Compare budgeted costs against actual spending by project and division</p>
        </div>
      </div>

      {/* Project Tabs */}
      {projects.length > 0 ? (
        <div className="fin-tab-bar">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/financial/budget?projectId=${project.id}`}
              className={`fin-tab ${selectedProjectId === project.id ? "active" : ""}`}
            >
              {project.code ? `${project.code} - ` : ""}{project.name}
            </Link>
          ))}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BarChart3 size={48} />
            </div>
            <div className="fin-empty-title">No Budget Data</div>
            <div className="fin-empty-desc">
              No projects have budget lines set up yet. Create project budget lines
              to start tracking budget vs actual costs.
            </div>
          </div>
        </div>
      )}

      {selectedProjectId && budgetLines.length > 0 && (
        <>
          {/* KPI Row */}
          <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="fin-kpi">
              <div className="fin-kpi-icon blue">
                <DollarSign size={18} />
              </div>
              <span className="fin-kpi-label">Total Budget</span>
              <span className="fin-kpi-value">
                {formatCompactCurrency(totalBudget)}
              </span>
            </div>

            <div className="fin-kpi">
              <div className="fin-kpi-icon amber">
                <ClipboardList size={18} />
              </div>
              <span className="fin-kpi-label">Total Committed</span>
              <span className="fin-kpi-value">
                {formatCompactCurrency(totalCommitted)}
              </span>
            </div>

            <div className="fin-kpi">
              <div className="fin-kpi-icon red">
                <TrendingDown size={18} />
              </div>
              <span className="fin-kpi-label">Total Actual</span>
              <span className="fin-kpi-value">
                {formatCompactCurrency(totalActual)}
              </span>
            </div>

            <div className="fin-kpi">
              <div className="fin-kpi-icon green">
                <AlertTriangle size={18} />
              </div>
              <span className="fin-kpi-label">Total Variance</span>
              <span className={`fin-kpi-value ${totalVariance >= 0 ? "positive" : "negative"}`}>
                {formatCompactCurrency(totalVariance)}
              </span>
            </div>
          </div>

          {/* Budget Table */}
          <div className="fin-chart-card" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="job-cost-table">
                <thead>
                  <tr>
                    <th>CSI Code</th>
                    <th>Description</th>
                    <th className="num-col">Budgeted</th>
                    <th className="num-col">Committed</th>
                    <th className="num-col">Actual</th>
                    <th className="num-col">Variance</th>
                    <th style={{ width: "160px" }}>Budget Used</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetLines.map((line) => {
                    const pctUsed = line.budgeted_amount > 0
                      ? (line.actual_amount / line.budgeted_amount) * 100
                      : 0;
                    const barClass = getBudgetBarClass(line.budgeted_amount, line.actual_amount);
                    const varianceClass = getVarianceClass(line.budgeted_amount, line.actual_amount);

                    return (
                      <tr key={line.id}>
                        <td style={{ color: "var(--color-blue)", fontWeight: 600 }}>
                          {line.csi_code}
                        </td>
                        <td>{line.description}</td>
                        <td className="num-col">{formatCurrency(line.budgeted_amount)}</td>
                        <td className="num-col">{formatCurrency(line.committed_amount)}</td>
                        <td className="num-col">{formatCurrency(line.actual_amount)}</td>
                        <td className={`num-col ${varianceClass}`} style={{ fontWeight: 600 }}>
                          {line.variance >= 0 ? "" : ""}{formatCurrency(line.variance)}
                        </td>
                        <td>
                          <div className="budget-bar">
                            <div
                              className={`budget-bar-fill ${barClass}`}
                              style={{ width: `${Math.min(pctUsed, 100)}%` }}
                            />
                          </div>
                          <span className={`budget-percent ${varianceClass}`}>
                            {formatPercent(pctUsed)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  <tr className="summary-row">
                    <td colSpan={2} style={{ fontWeight: 700 }}>
                      {selectedProject?.name ?? "Project"} Total
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrency(totalBudget)}
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrency(totalCommitted)}
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrency(totalActual)}
                    </td>
                    <td
                      className={`num-col ${getVarianceClass(totalBudget, totalActual)}`}
                      style={{ fontWeight: 700 }}
                    >
                      {formatCurrency(totalVariance)}
                    </td>
                    <td>
                      <div className="budget-bar">
                        <div
                          className={`budget-bar-fill ${getBudgetBarClass(totalBudget, totalActual)}`}
                          style={{ width: `${Math.min(totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0, 100)}%` }}
                        />
                      </div>
                      <span className={`budget-percent ${getVarianceClass(totalBudget, totalActual)}`}>
                        {formatPercent(totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedProjectId && budgetLines.length === 0 && projects.length > 0 && (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BarChart3 size={48} />
            </div>
            <div className="fin-empty-title">No Budget Lines</div>
            <div className="fin-empty-desc">
              No budget lines have been created for this project yet. Set up your
              project budget to start tracking costs by CSI code.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
