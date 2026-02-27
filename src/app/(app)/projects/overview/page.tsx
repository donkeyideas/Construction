import Link from "next/link";
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  FileWarning,
  CalendarDays,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserCompany,
  getProjectsOverview,
} from "@/lib/queries/projects";
import { formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import ProjectStatusChart from "@/components/charts/ProjectStatusChart";
import ProjectBudgetChart from "@/components/charts/ProjectBudgetChart";
import { getTranslations } from "next-intl/server";


export const metadata = {
  title: "Projects Overview - Buildwrk",
};

export default async function ProjectsOverviewPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  const t = await getTranslations("projects");

  if (!userCtx) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
        {t("loginRequired")}
      </div>
    );
  }

  const overview = await getProjectsOverview(supabase, userCtx.companyId);

  const STATUS_LABELS: Record<string, string> = {
    pre_construction: t("statusPreConstruction"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    completed: t("statusCompleted"),
    closed: t("statusClosed"),
  };

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("overviewTitle")}</h2>
          <p className="fin-header-sub">
            {t("overviewSubtitle")}
          </p>
        </div>
        <div className="fin-header-actions">
          <Link href="/projects" className="ui-btn ui-btn-md ui-btn-secondary">
            {t("allProjects")}
          </Link>
          <Link href="/projects/gantt" className="ui-btn ui-btn-md ui-btn-secondary">
            {t("ganttView")}
          </Link>
          <Link href="/projects/new" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} />
            {t("newProject")}
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("activeProjects")}</span>
              <span className="kpi-value">{overview.activeCount}</span>
            </div>
            <div className="kpi-icon">
              <Briefcase size={20} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("totalContractValue")}</span>
              <span className="kpi-value">
                {formatCompactCurrency(overview.totalContractValue)}
              </span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-green)" }}>
              <DollarSign size={20} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("avgCompletion")}</span>
              <span className="kpi-value">
                {formatPercent(overview.avgCompletion)}
              </span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-blue)" }}>
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">{t("openChangeOrders")}</span>
              <span className="kpi-value" style={{ color: overview.openCOCount > 0 ? "var(--color-amber)" : undefined }}>
                {overview.openCOCount}
              </span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-red)" }}>
              <FileWarning size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("statusDistribution")}</div>
          <ProjectStatusChart
            data={overview.statusBreakdown}
            total={overview.projects.length}
          />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("budgetVsActual")}</div>
          <ProjectBudgetChart data={overview.budgetProjects} />
        </div>
      </div>

      {/* Lists */}
      {(overview.attentionProjects.length > 0 || overview.upcomingMilestones.length > 0) && (
        <div className="financial-charts-row" style={{ marginBottom: 24 }}>
          <div className="fin-chart-card">
            <div className="fin-chart-title">{t("needingAttention")}</div>
            {overview.attentionProjects.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>{t("thProject")}</th>
                      <th>{t("thStatus")}</th>
                      <th>{t("thCompletion")}</th>
                      <th>{t("thOpenRFIs")}</th>
                      <th>{t("thOpenCOs")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.attentionProjects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/projects/${p.id}`} style={{ color: "var(--color-blue)", textDecoration: "none", fontWeight: 500 }}>
                            {p.name}
                          </Link>
                        </td>
                        <td>
                          <span className={`inv-status inv-status-${p.status === "active" ? "approved" : p.status === "on_hold" ? "overdue" : "pending"}`}>
                            {STATUS_LABELS[p.status] ?? p.status}
                          </span>
                        </td>
                        <td>{formatPercent(p.completion_pct)}</td>
                        <td style={{ color: p.openRFIs > 0 ? "var(--color-amber)" : undefined, fontWeight: p.openRFIs > 0 ? 600 : undefined }}>
                          {p.openRFIs}
                        </td>
                        <td style={{ color: p.openCOs > 0 ? "var(--color-red)" : undefined, fontWeight: p.openCOs > 0 ? 600 : undefined }}>
                          {p.openCOs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>
                {t("allOnTrack")}
              </div>
            )}
          </div>
          <div className="fin-chart-card">
            <div className="fin-chart-title">{t("upcomingMilestones")}</div>
            {overview.upcomingMilestones.length > 0 ? (
              <div>
                {overview.upcomingMilestones.map((m) => (
                  <div key={m.id} className="activity-item">
                    <div className="activity-icon">
                      <CalendarDays size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="activity-text"><strong>{m.name}</strong></div>
                      <div className="activity-time">
                        <Link href={`/projects/${m.project_id}`} style={{ color: "var(--color-blue)", textDecoration: "none" }}>
                          {m.project_name}
                        </Link>
                        {" · "}
                        {new Date(m.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>
                {t("noUpcomingMilestones")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/projects/rfis" className="ui-btn ui-btn-sm ui-btn-secondary">
          {t("allRFIs", { count: overview.openRFICount })}
        </Link>
        <Link href="/projects/change-orders" className="ui-btn ui-btn-sm ui-btn-secondary">
          {t("changeOrdersOpen", { count: overview.openCOCount })}
        </Link>
        <Link href="/projects/submittals" className="ui-btn ui-btn-sm ui-btn-secondary">
          {t("submittals")}
        </Link>
        <Link href="/projects/daily-logs" className="ui-btn ui-btn-sm ui-btn-secondary">
          {t("dailyLogs")}
        </Link>
      </div>

    </div>
  );
}
