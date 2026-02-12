import Link from "next/link";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getJobCostingSummary,
  getProjects,
} from "@/lib/queries/financial";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { BudgetLineRow } from "@/lib/queries/financial";

export const metadata = {
  title: "Job Costing - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

/** CSI Division names (first 2 digits of the code) */
const csiDivisions: Record<string, string> = {
  "01": "General Requirements",
  "02": "Existing Conditions",
  "03": "Concrete",
  "04": "Masonry",
  "05": "Metals",
  "06": "Wood, Plastics, Composites",
  "07": "Thermal & Moisture Protection",
  "08": "Openings",
  "09": "Finishes",
  "10": "Specialties",
  "11": "Equipment",
  "12": "Furnishings",
  "13": "Special Construction",
  "14": "Conveying Equipment",
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "28": "Electronic Safety & Security",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

function getDivisionCode(csiCode: string): string {
  return csiCode.replace(/\s/g, "").substring(0, 2);
}

function getDivisionName(divCode: string): string {
  return csiDivisions[divCode] ?? `Division ${divCode}`;
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

function groupByDivision(
  lines: BudgetLineRow[]
): Map<string, BudgetLineRow[]> {
  const map = new Map<string, BudgetLineRow[]>();
  for (const line of lines) {
    const div = getDivisionCode(line.csi_code);
    if (!map.has(div)) {
      map.set(div, []);
    }
    map.get(div)!.push(line);
  }
  return map;
}

export default async function JobCostingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <BarChart3 size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to start tracking job costs.
        </div>
      </div>
    );
  }

  const projects = await getProjects(supabase, userCompany.companyId);
  const selectedProjectId = params.projectId || (projects.length > 0 ? projects[0].id : null);

  let summary = null;
  if (selectedProjectId) {
    summary = await getJobCostingSummary(
      supabase,
      userCompany.companyId,
      selectedProjectId
    );
  }

  // Earned Value Metrics
  const bcws = summary?.totalBudgeted ?? 0; // Budgeted Cost of Work Scheduled
  const bcwp = summary
    ? summary.lines.reduce((sum, l) => {
        // BCWP = budgeted amount * (actual/budgeted) ratio, capped at budgeted
        if (l.budgeted_amount === 0) return sum;
        const earnedRatio = Math.min(l.actual_amount / l.budgeted_amount, 1);
        return sum + l.budgeted_amount * earnedRatio;
      }, 0)
    : 0;
  const acwp = summary?.totalActual ?? 0; // Actual Cost of Work Performed
  const cpi = acwp > 0 ? bcwp / acwp : 0; // Cost Performance Index
  const spi = bcws > 0 ? bcwp / bcws : 0; // Schedule Performance Index

  const divisions = summary ? groupByDivision(summary.lines) : new Map();

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Job Costing</h2>
          <p className="fin-header-sub">
            Track budget vs actual costs by CSI division.
          </p>
        </div>
      </div>

      {/* Project Selector */}
      <div className="job-cost-header">
        <div className="job-cost-selector">
          <label>Project:</label>
          {projects.length > 0 ? (
            <form>
              <select
                name="projectId"
                className="fin-filter-select"
                defaultValue={selectedProjectId ?? ""}
                onChange={(e) => {
                  // Navigate via form submission with JS
                  const url = `/financial/job-costing?projectId=${e.target.value}`;
                  window.location.href = url;
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </form>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              No projects found
            </span>
          )}
        </div>
      </div>

      {selectedProjectId && summary && summary.lines.length > 0 ? (
        <>
          {/* Earned Value Metrics */}
          <div className="ev-metrics">
            <div className="ev-metric">
              <div className="ev-metric-label">BCWP</div>
              <div className="ev-metric-value">{formatCurrency(bcwp)}</div>
              <div className="ev-metric-desc">Budgeted Cost Work Performed</div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">BCWS</div>
              <div className="ev-metric-value">{formatCurrency(bcws)}</div>
              <div className="ev-metric-desc">Budgeted Cost Work Scheduled</div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">ACWP</div>
              <div className="ev-metric-value">{formatCurrency(acwp)}</div>
              <div className="ev-metric-desc">Actual Cost Work Performed</div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">CPI</div>
              <div
                className="ev-metric-value"
                style={{
                  color:
                    cpi >= 1
                      ? "var(--color-green)"
                      : cpi >= 0.9
                      ? "var(--color-amber)"
                      : "var(--color-red)",
                }}
              >
                {cpi.toFixed(2)}
              </div>
              <div className="ev-metric-desc">Cost Performance Index</div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">SPI</div>
              <div
                className="ev-metric-value"
                style={{
                  color:
                    spi >= 1
                      ? "var(--color-green)"
                      : spi >= 0.9
                      ? "var(--color-amber)"
                      : "var(--color-red)",
                }}
              >
                {spi.toFixed(2)}
              </div>
              <div className="ev-metric-desc">Schedule Performance Index</div>
            </div>
          </div>

          {/* Job Cost Table */}
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
                    <th style={{ width: "140px" }}>% Used</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(divisions.entries()).map(([divCode, divLines]) => {
                    const divBudget = divLines.reduce((s: number, l: BudgetLineRow) => s + l.budgeted_amount, 0);
                    const divCommitted = divLines.reduce((s: number, l: BudgetLineRow) => s + l.committed_amount, 0);
                    const divActual = divLines.reduce((s: number, l: BudgetLineRow) => s + l.actual_amount, 0);
                    const divVariance = divLines.reduce((s: number, l: BudgetLineRow) => s + l.variance, 0);

                    return (
                      <DivisionGroup
                        key={divCode}
                        divCode={divCode}
                        lines={divLines}
                        totals={{
                          budgeted: divBudget,
                          committed: divCommitted,
                          actual: divActual,
                          variance: divVariance,
                        }}
                      />
                    );
                  })}

                  {/* Summary Row */}
                  <tr className="summary-row">
                    <td colSpan={2} style={{ fontWeight: 700 }}>
                      Project Total
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrency(summary.totalBudgeted)}
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrency(summary.totalCommitted)}
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrency(summary.totalActual)}
                    </td>
                    <td
                      className={`num-col ${getVarianceClass(summary.totalBudgeted, summary.totalActual)}`}
                      style={{ fontWeight: 700 }}
                    >
                      {formatCurrency(summary.totalVariance)}
                    </td>
                    <td>
                      <BudgetBarCell
                        budgeted={summary.totalBudgeted}
                        actual={summary.totalActual}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : selectedProjectId && summary && summary.lines.length === 0 ? (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BarChart3 size={48} />
            </div>
            <div className="fin-empty-title">No Budget Lines</div>
            <div className="fin-empty-desc">
              No budget lines have been created for this project yet. Set up
              your project budget to start tracking job costs by CSI division.
            </div>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BarChart3 size={48} />
            </div>
            <div className="fin-empty-title">Select a Project</div>
            <div className="fin-empty-desc">
              {projects.length === 0
                ? "Create a project first to start tracking job costs."
                : "Choose a project from the dropdown above to view its budget and cost breakdown."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DivisionGroup({
  divCode,
  lines,
  totals,
}: {
  divCode: string;
  lines: BudgetLineRow[];
  totals: {
    budgeted: number;
    committed: number;
    actual: number;
    variance: number;
  };
}) {
  return (
    <>
      {/* Division header row */}
      <tr className="division-row">
        <td colSpan={2} style={{ fontWeight: 700 }}>
          Division {divCode} -- {getDivisionName(divCode)}
        </td>
        <td className="num-col">{formatCurrency(totals.budgeted)}</td>
        <td className="num-col">{formatCurrency(totals.committed)}</td>
        <td className="num-col">{formatCurrency(totals.actual)}</td>
        <td className={`num-col ${getVarianceClass(totals.budgeted, totals.actual)}`}>
          {formatCurrency(totals.variance)}
        </td>
        <td>
          <BudgetBarCell budgeted={totals.budgeted} actual={totals.actual} />
        </td>
      </tr>
      {/* Individual lines */}
      {lines.map((line) => (
        <tr key={line.id}>
          <td style={{ paddingLeft: "28px", color: "var(--color-blue)", fontWeight: 500 }}>
            {line.csi_code}
          </td>
          <td>{line.description}</td>
          <td className="num-col">{formatCurrency(line.budgeted_amount)}</td>
          <td className="num-col">{formatCurrency(line.committed_amount)}</td>
          <td className="num-col">{formatCurrency(line.actual_amount)}</td>
          <td className={`num-col ${getVarianceClass(line.budgeted_amount, line.actual_amount)}`}>
            {formatCurrency(line.variance)}
          </td>
          <td>
            <BudgetBarCell
              budgeted={line.budgeted_amount}
              actual={line.actual_amount}
            />
          </td>
        </tr>
      ))}
    </>
  );
}

function BudgetBarCell({
  budgeted,
  actual,
}: {
  budgeted: number;
  actual: number;
}) {
  const pctUsed = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  const barClass = getBudgetBarClass(budgeted, actual);
  const varianceClass = getVarianceClass(budgeted, actual);

  return (
    <div>
      <div className="budget-bar">
        <div
          className={`budget-bar-fill ${barClass}`}
          style={{ width: `${Math.min(pctUsed, 100)}%` }}
        />
      </div>
      <span className={`budget-percent ${varianceClass}`}>
        {formatPercent(pctUsed)}
      </span>
    </div>
  );
}
