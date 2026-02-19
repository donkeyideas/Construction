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
import { getProjectTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "Projects Overview - Buildwrk",
};

const STATUS_LABELS: Record<string, string> = {
  pre_construction: "Pre-Construction",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  closed: "Closed",
};

export default async function ProjectsOverviewPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
        Please log in and join a company to view the projects overview.
      </div>
    );
  }

  const overview = await getProjectsOverview(supabase, userCtx.companyId);
  const txnData = await getProjectTransactions(supabase, userCtx.companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Projects Overview</h2>
          <p className="fin-header-sub">
            Portfolio overview and project health at a glance.
          </p>
        </div>
        <div className="fin-header-actions">
          <Link href="/projects" className="ui-btn ui-btn-md ui-btn-secondary">
            All Projects
          </Link>
          <Link href="/projects/gantt" className="ui-btn ui-btn-md ui-btn-secondary">
            Gantt View
          </Link>
          <Link href="/projects/new" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Active Projects</span>
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
              <span className="kpi-label">Total Contract Value</span>
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
              <span className="kpi-label">Avg. Completion</span>
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
              <span className="kpi-label">Open Change Orders</span>
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
          <div className="fin-chart-title">Project Status Distribution</div>
          <ProjectStatusChart
            data={overview.statusBreakdown}
            total={overview.projects.length}
          />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Budget vs Actual</div>
          <ProjectBudgetChart data={overview.budgetProjects} />
        </div>
      </div>

      {/* Lists */}
      {(overview.attentionProjects.length > 0 || overview.upcomingMilestones.length > 0) && (
        <div className="financial-charts-row" style={{ marginBottom: 24 }}>
          <div className="fin-chart-card">
            <div className="fin-chart-title">Projects Needing Attention</div>
            {overview.attentionProjects.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Completion</th>
                      <th>Open RFIs</th>
                      <th>Open COs</th>
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
                All projects on track
              </div>
            )}
          </div>
          <div className="fin-chart-card">
            <div className="fin-chart-title">Upcoming Milestones</div>
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
                No upcoming milestones
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/projects/rfis" className="ui-btn ui-btn-sm ui-btn-secondary">
          All RFIs ({overview.openRFICount} open)
        </Link>
        <Link href="/projects/change-orders" className="ui-btn ui-btn-sm ui-btn-secondary">
          Change Orders ({overview.openCOCount} open)
        </Link>
        <Link href="/projects/submittals" className="ui-btn ui-btn-sm ui-btn-secondary">
          Submittals
        </Link>
        <Link href="/projects/daily-logs" className="ui-btn ui-btn-sm ui-btn-secondary">
          Daily Logs
        </Link>
      </div>

      <SectionTransactions data={txnData} sectionName="Projects" />
    </div>
  );
}
