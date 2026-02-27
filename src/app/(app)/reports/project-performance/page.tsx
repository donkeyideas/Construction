import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HardHat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProjectPerformanceReport } from "@/lib/queries/reports";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import ExportButton from "@/components/reports/ExportButton";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Project Performance Report - Buildwrk",
};

function getVarianceClass(variancePct: number): string {
  if (variancePct >= 5) return "variance-positive";
  if (variancePct >= -5) return "variance-warning";
  return "variance-negative";
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

  const t = await getTranslations("reports");

  const projects = await getProjectPerformanceReport(
    supabase,
    userCompany.companyId
  );

  // Schedule label helper using translated strings
  function getScheduleLabel(status: string): { label: string; className: string } {
    switch (status) {
      case "ahead":
        return { label: t("schedAhead"), className: "badge badge-green" };
      case "on_track":
        return { label: t("schedOnTrack"), className: "badge badge-blue" };
      case "at_risk":
        return { label: t("schedAtRisk"), className: "badge badge-amber" };
      case "behind":
        return { label: t("schedBehind"), className: "badge badge-red" };
      default:
        return { label: status, className: "badge badge-gray" };
    }
  }

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
            {t("centerTitle")}
          </Link>
        </div>
        <div className="report-page-title-row">
          <div>
            <h2>{t("perfTitle")}</h2>
            <p className="report-page-sub">
              {t("perfSubtitle")}
            </p>
          </div>
          <div className="report-page-actions">
            <ExportButton
              reportType="project-performance"
              reportTitle={t("perfTitle")}
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
                { key: "name", label: t("thProject") },
                { key: "code", label: t("thCode") },
                { key: "status", label: "Status" },
                { key: "contract_amount", label: t("thContractValue") },
                { key: "estimated_cost", label: t("thEstimatedCost") },
                { key: "actual_cost", label: t("thActualCost") },
                { key: "budget_variance", label: t("thBudgetVariance") },
                { key: "budget_variance_pct", label: t("thBudgetVariance") + " %" },
                { key: "completion_pct", label: t("thCompletion") + " %" },
                { key: "schedule_status", label: t("thSchedule") },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Report Table */}
      {projects.length === 0 ? (
        <div className="report-empty">
          <HardHat size={48} style={{ color: "var(--border)" }} />
          <div className="report-empty-title">{t("noActiveProjects")}</div>
          <div className="report-empty-desc">
            {t("createProjectForReport")}
          </div>
          <Link href="/projects" className="ui-btn ui-btn-primary ui-btn-md" style={{ marginTop: "12px" }}>
            {t("goToProjects")}
          </Link>
        </div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>{t("thProject")}</th>
                <th>{t("thCode")}</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>{t("thContractValue")}</th>
                <th style={{ textAlign: "right" }}>{t("thEstimatedCost")}</th>
                <th style={{ textAlign: "right" }}>{t("thActualCost")}</th>
                <th style={{ textAlign: "right" }}>{t("thBudgetVariance")}</th>
                <th style={{ textAlign: "center" }}>{t("thCompletion")}</th>
                <th style={{ textAlign: "center" }}>{t("thSchedule")}</th>
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
