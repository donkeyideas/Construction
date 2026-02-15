import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HardHat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProjectPerformanceReport } from "@/lib/queries/reports";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import ExportButton from "@/components/reports/ExportButton";

export const metadata = {
  title: "Project Performance Report - Buildwrk",
};

function getVarianceClass(variancePct: number): string {
  if (variancePct >= 5) return "variance-positive";
  if (variancePct >= -5) return "variance-warning";
  return "variance-negative";
}

function getScheduleLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "ahead":
      return { label: "Ahead", className: "badge badge-green" };
    case "on_track":
      return { label: "On Track", className: "badge badge-blue" };
    case "at_risk":
      return { label: "At Risk", className: "badge badge-amber" };
    case "behind":
      return { label: "Behind", className: "badge badge-red" };
    default:
      return { label: status, className: "badge badge-gray" };
  }
}

function getStatusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Active", className: "badge badge-green" };
    case "pre_construction":
      return { label: "Pre-Construction", className: "badge badge-amber" };
    case "on_hold":
      return { label: "On Hold", className: "badge badge-red" };
    default:
      return { label: status, className: "badge badge-gray" };
  }
}

export default async function ProjectPerformancePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const projects = await getProjectPerformanceReport(
    supabase,
    userCompany.companyId
  );

  // Compute summary totals
  const totalContractAmount = projects.reduce(
    (s, p) => s + (p.contract_amount ?? 0),
    0
  );
  const totalActualCost = projects.reduce(
    (s, p) => s + (p.actual_cost ?? 0),
    0
  );
  const totalEstimatedCost = projects.reduce(
    (s, p) => s + (p.estimated_cost ?? 0),
    0
  );
  const totalVariance = totalEstimatedCost - totalActualCost;
  const totalVariancePct =
    totalEstimatedCost > 0
      ? (totalVariance / totalEstimatedCost) * 100
      : 0;
  const avgCompletion =
    projects.length > 0
      ? projects.reduce((s, p) => s + p.completion_pct, 0) / projects.length
      : 0;

  return (
    <div>
      {/* Header */}
      <div className="report-page-header">
        <div className="report-page-nav">
          <Link href="/reports" className="report-back-link">
            <ArrowLeft size={16} />
            Reports Center
          </Link>
        </div>
        <div className="report-page-title-row">
          <div>
            <h2>Project Performance Summary</h2>
            <p className="report-page-sub">
              Budget variance, schedule status, and completion tracking for all active projects.
            </p>
          </div>
          <div className="report-page-actions">
            <ExportButton
              reportType="project-performance"
              reportTitle="Project Performance Summary"
              data={projects.map((p) => ({
                name: p.name,
                code: p.code,
                status: p.status,
                contract_amount: p.contract_amount,
                estimated_cost: p.estimated_cost,
                actual_cost: p.actual_cost,
                budget_variance: p.budget_variance,
                budget_variance_pct: p.budget_variance_pct,
                completion_pct: p.completion_pct,
                schedule_status: p.schedule_status,
              }))}
              columns={[
                { key: "name", label: "Project" },
                { key: "code", label: "Code" },
                { key: "status", label: "Status" },
                { key: "contract_amount", label: "Contract Value" },
                { key: "estimated_cost", label: "Estimated Cost" },
                { key: "actual_cost", label: "Actual Cost" },
                { key: "budget_variance", label: "Budget Variance" },
                { key: "budget_variance_pct", label: "Variance %" },
                { key: "completion_pct", label: "Completion %" },
                { key: "schedule_status", label: "Schedule Status" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Report Table */}
      {projects.length === 0 ? (
        <div className="report-empty">
          <HardHat size={48} style={{ color: "var(--border)" }} />
          <div className="report-empty-title">No Active Projects</div>
          <div className="report-empty-desc">
            Create a project to see performance data in this report.
          </div>
          <Link href="/projects" className="ui-btn ui-btn-primary ui-btn-md" style={{ marginTop: "12px" }}>
            Go to Projects
          </Link>
        </div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Code</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Contract Value</th>
                <th style={{ textAlign: "right" }}>Estimated Cost</th>
                <th style={{ textAlign: "right" }}>Actual Cost</th>
                <th style={{ textAlign: "right" }}>Budget Variance</th>
                <th style={{ textAlign: "center" }}>Completion</th>
                <th style={{ textAlign: "center" }}>Schedule</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const varClass = getVarianceClass(p.budget_variance_pct);
                const schedule = getScheduleLabel(p.schedule_status);
                const status = getStatusLabel(p.status);

                return (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/projects/${p.id}`}
                        className="report-project-link"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="report-code">{p.code}</td>
                    <td>
                      <span className={status.className}>{status.label}</span>
                    </td>
                    <td className="report-num">
                      {formatCurrency(p.contract_amount ?? 0)}
                    </td>
                    <td className="report-num">
                      {formatCurrency(p.estimated_cost ?? 0)}
                    </td>
                    <td className="report-num">
                      {formatCurrency(p.actual_cost ?? 0)}
                    </td>
                    <td className={`report-num ${varClass}`}>
                      {p.budget_variance >= 0 ? "+" : ""}
                      {formatCurrency(p.budget_variance)}
                      <div className="report-variance-pct">
                        {p.budget_variance_pct >= 0 ? "+" : ""}
                        {formatPercent(p.budget_variance_pct)}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div className="report-completion">
                        <div className="report-completion-bar">
                          <div
                            className="report-completion-fill"
                            style={{ width: `${Math.min(p.completion_pct, 100)}%` }}
                          />
                        </div>
                        <span className="report-completion-label">
                          {formatPercent(p.completion_pct)}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={schedule.className}>
                        {schedule.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="report-summary-row">
                <td colSpan={3}>
                  <strong>
                    Total ({projects.length} project
                    {projects.length !== 1 ? "s" : ""})
                  </strong>
                </td>
                <td className="report-num">
                  <strong>{formatCurrency(totalContractAmount)}</strong>
                </td>
                <td className="report-num">
                  <strong>{formatCurrency(totalEstimatedCost)}</strong>
                </td>
                <td className="report-num">
                  <strong>{formatCurrency(totalActualCost)}</strong>
                </td>
                <td
                  className={`report-num ${getVarianceClass(totalVariancePct)}`}
                >
                  <strong>
                    {totalVariance >= 0 ? "+" : ""}
                    {formatCurrency(totalVariance)}
                  </strong>
                </td>
                <td style={{ textAlign: "center" }}>
                  <strong>{formatPercent(avgCompletion)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
