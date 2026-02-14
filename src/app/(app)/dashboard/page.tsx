import { redirect } from "next/navigation";
import {
  DollarSign,
  Briefcase,
  FileWarning,
  Clock,
  Rocket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getDashboardKPIs,
  getProjectStatusBreakdown,
  getMonthlyBilling,
  getPendingApprovals,
  getRecentActivity,
} from "@/lib/queries/dashboard";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatRelativeTime,
} from "@/lib/utils/format";

export const metadata = {
  title: "Dashboard - ConstructionERP",
};

// Which dashboard sections each role can see
const ROLE_SECTIONS: Record<string, { kpis: boolean; charts: boolean; financials: boolean; approvals: boolean; activity: boolean; insights: boolean }> = {
  owner:           { kpis: true,  charts: true,  financials: true,  approvals: true,  activity: true,  insights: true  },
  admin:           { kpis: true,  charts: true,  financials: true,  approvals: true,  activity: true,  insights: true  },
  project_manager: { kpis: true,  charts: true,  financials: false, approvals: true,  activity: true,  insights: true  },
  superintendent:  { kpis: true,  charts: true,  financials: false, approvals: true,  activity: true,  insights: false },
  accountant:      { kpis: true,  charts: true,  financials: true,  approvals: false, activity: true,  insights: true  },
  field_worker:    { kpis: true,  charts: false, financials: false, approvals: false, activity: true,  insights: false },
  viewer:          { kpis: true,  charts: false, financials: false, approvals: false, activity: true,  insights: false },
};

const ROLE_GREETING: Record<string, string> = {
  owner: "Here is your company overview.",
  admin: "Here is your company overview.",
  project_manager: "Here are your project updates.",
  superintendent: "Here are your field operations.",
  accountant: "Here is your financial overview.",
  field_worker: "Here are your assignments for today.",
  viewer: "Here is a snapshot of current activity.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId, companyName, role: userRole } = userCompany;
  const sections = ROLE_SECTIONS[userRole] || ROLE_SECTIONS.viewer;
  const greeting = ROLE_GREETING[userRole] || "Welcome back.";

  // Fetch all dashboard data in parallel
  const [kpis, projectStatus, monthlyBilling, pendingApprovalsResult, recentActivity, outstandingAPRes, outstandingARRes] =
    await Promise.all([
      getDashboardKPIs(supabase, companyId),
      getProjectStatusBreakdown(supabase, companyId),
      getMonthlyBilling(supabase, companyId),
      getPendingApprovals(supabase, companyId),
      getRecentActivity(supabase, companyId),
      // Outstanding AP (what we owe)
      supabase
        .from("invoices")
        .select("balance_due")
        .eq("company_id", companyId)
        .eq("invoice_type", "payable")
        .not("status", "in", '("voided","paid")'),
      // Outstanding AR (what we're owed)
      supabase
        .from("invoices")
        .select("balance_due")
        .eq("company_id", companyId)
        .eq("invoice_type", "receivable")
        .not("status", "in", '("voided","paid")'),
    ]);

  const outstandingAP = (outstandingAPRes.data ?? []).reduce(
    (sum, r) => sum + (Number(r.balance_due) || 0), 0
  );
  const outstandingAR = (outstandingARRes.data ?? []).reduce(
    (sum, r) => sum + (Number(r.balance_due) || 0), 0
  );

  const { items: pendingApprovals, totalCount: pendingApprovalsTotal } = pendingApprovalsResult;

  const isNewCompany =
    projectStatus.total === 0 &&
    pendingApprovals.length === 0 &&
    recentActivity.length === 0;

  if (isNewCompany) {
    return <WelcomeState companyName={companyName} />;
  }

  // Compute donut chart percentages
  const total = projectStatus.total || 1; // avoid division by zero
  const donutSegments = [
    {
      label: "Complete",
      count: projectStatus.completed,
      pct: Math.round((projectStatus.completed / total) * 100),
      color: "var(--color-blue)",
    },
    {
      label: "In Progress",
      count: projectStatus.active,
      pct: Math.round((projectStatus.active / total) * 100),
      color: "#3b82f6",
    },
    {
      label: "Pre-Construction",
      count: projectStatus.pre_construction,
      pct: Math.round((projectStatus.pre_construction / total) * 100),
      color: "var(--color-amber)",
    },
    {
      label: "On Hold",
      count: projectStatus.on_hold,
      pct: Math.round((projectStatus.on_hold / total) * 100),
      color: "var(--color-red)",
    },
  ];

  // Build conic-gradient string from real percentages
  let conicParts: string[] = [];
  let cumulative = 0;
  for (const seg of donutSegments) {
    if (seg.pct === 0) continue;
    const start = cumulative;
    cumulative += seg.pct;
    conicParts.push(`${seg.color} ${start}% ${cumulative}%`);
  }
  // If nothing, show a neutral ring
  const conicGradient =
    conicParts.length > 0
      ? `conic-gradient(${conicParts.join(", ")})`
      : "conic-gradient(var(--border) 0% 100%)";

  // Compute bar chart heights relative to the max billing month
  const maxBilling = Math.max(...monthlyBilling.map((m) => m.amount), 1);
  const bars = monthlyBilling.map((m) => ({
    label: m.month,
    height: Math.max(Math.round((m.amount / maxBilling) * 100), 4), // min 4% so bar is visible
    amount: m.amount,
  }));

  return (
    <div>
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2>Dashboard</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "2px" }}>
            {greeting}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.875rem",
            color: "var(--muted)",
          }}
        >
          <span>
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="live-dot" />
        </div>
      </div>

      {/* KPI Cards */}
      {sections.kpis && (
        <div className="kpi-grid">
          <KpiCard
            label="Active Projects"
            value={formatCompactCurrency(kpis.activeProjectsValue)}
            icon={<Briefcase size={22} />}
          />
          {sections.financials && (
            <KpiCard
              label="Cash Position"
              value={formatCompactCurrency(kpis.cashPosition)}
              icon={<DollarSign size={22} />}
            />
          )}
          <KpiCard
            label="Open Change Orders"
            value={String(kpis.openChangeOrders)}
            amber={kpis.openChangeOrders > 0}
            icon={<FileWarning size={22} />}
          />
          <KpiCard
            label="Schedule Performance"
            value={formatPercent(kpis.schedulePerformance)}
            icon={<Clock size={22} />}
          />
        </div>
      )}

      {/* Charts Row */}
      {sections.charts && (
        <div className="charts-row">
          {/* Monthly Billing Bar Chart - only for financial roles */}
          {sections.financials && (
            <div className="card">
              <div className="card-title">Monthly Billing</div>
              {bars.every((b) => b.amount === 0) ? (
                <EmptyState message="No billing data yet" />
              ) : (
                <div className="bar-chart">
                  {bars.map((m) => (
                    <div key={m.label} className="bar-col">
                      <div className="bar" style={{ height: `${m.height}%` }} />
                      <div className="bar-label">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project Status Donut */}
          <div className="card">
            <div className="card-title">Project Status</div>
            <div className="donut-wrap">
              <div className="donut" style={{ background: conicGradient }}>
                <div className="donut-hole">
                  <strong>{projectStatus.total}</strong>
                  <span>{projectStatus.total === 1 ? "Project" : "Projects"}</span>
                </div>
              </div>
              <div className="legend">
                {donutSegments.map((seg) => (
                  <div key={seg.label} className="legend-item">
                    <span className="legend-dot" style={{ background: seg.color }} />
                    {seg.label} {seg.pct}%
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Three Cards Row */}
      <div className="three-row">
        {/* Pending Approvals */}
        {sections.approvals && (
          <div className="card">
            <div className="card-title">
              Pending Approvals{" "}
              {pendingApprovalsTotal > 0 && (
                <span className="badge badge-blue">{pendingApprovalsTotal}</span>
              )}
            </div>
            {pendingApprovals.length === 0 ? (
              <EmptyState message="No pending approvals" />
            ) : (
              pendingApprovals.map((item) => {
                const href =
                  item.type === "invoice"
                    ? `/financial/invoices/${item.entityId}`
                    : item.type === "change_order"
                      ? "/projects/change-orders"
                      : item.type === "submittal"
                        ? "/projects/rfis"
                        : "#";
                return (
                  <a
                    key={item.entityId}
                    href={href}
                    className="approval-item"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <span
                      className="urgency-dot"
                      style={{
                        background:
                          item.urgency === "high"
                            ? "var(--color-red)"
                            : item.urgency === "medium"
                              ? "var(--color-amber)"
                              : "var(--color-green)",
                      }}
                    />
                    <div className="approval-info">
                      <div className="approval-title">{item.title}</div>
                      <div className="approval-meta">{item.by}</div>
                    </div>
                    <div className="approval-amount">
                      {item.amount != null ? formatCurrency(item.amount) : "--"}
                    </div>
                  </a>
                );
              })
            )}
          </div>
        )}

        {/* Recent Activity */}
        {sections.activity && (
          <div className="card">
            <div className="card-title">Recent Activity</div>
            {recentActivity.length === 0 ? (
              <EmptyState message="No recent activity" />
            ) : (
              recentActivity.slice(0, 5).map((item, i) => {
                const activityHref = getActivityHref(item.entityType, item.entityId);
                const Tag = activityHref ? "a" : "div";
                return (
                  <Tag
                    key={i}
                    {...(activityHref ? { href: activityHref } : {})}
                    className="activity-item"
                    style={activityHref ? { textDecoration: "none", color: "inherit", cursor: "pointer" } : undefined}
                  >
                    <div className="activity-icon">
                      <Clock size={14} />
                    </div>
                    <div>
                      <div className="activity-text">
                        <strong>{item.user}</strong> {item.action}{" "}
                        {item.ref && <span>{item.ref}</span>}
                      </div>
                      <div className="activity-time">
                        {formatRelativeTime(item.time)}
                      </div>
                    </div>
                  </Tag>
                );
              })
            )}
          </div>
        )}

        {/* Insights */}
        {sections.insights && (
          <div className="card">
            <div className="card-title">
              Insights
            </div>
            <DashboardInsights
              kpis={kpis}
              projectStatus={projectStatus}
              pendingApprovals={pendingApprovalsTotal}
              outstandingAP={outstandingAP}
              outstandingAR={outstandingAR}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActivityHref(
  entityType: string | null,
  entityId: string | null
): string | null {
  if (!entityType) return null;
  switch (entityType) {
    case "project":
      return entityId ? `/projects/${entityId}` : "/projects";
    case "invoice":
      return entityId ? `/financial/invoices/${entityId}` : "/financial/invoices";
    case "change_order":
      return "/projects/change-orders";
    case "rfi":
      return "/projects/rfis";
    case "submittal":
      return "/projects/rfis";
    case "daily_log":
      return "/projects/daily-logs";
    case "document":
      return "/documents";
    case "payment":
      return "/financial";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  amber,
  icon,
}: {
  label: string;
  value: string;
  amber?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="card kpi">
      <div className="kpi-info">
        <span className="kpi-label">{label}</span>
        <span className={`kpi-value ${amber ? "amber" : ""}`}>{value}</span>
      </div>
      <div className="kpi-icon">{icon}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 16px",
        color: "var(--muted)",
        fontSize: "0.85rem",
      }}
    >
      {message}
    </div>
  );
}

function WelcomeState({ companyName }: { companyName: string }) {
  return (
    <div>
      <div className="dash-header">
        <div>
          <h2>Welcome to ConstructionERP</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "2px" }}>
            Let&apos;s get {companyName} set up.
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, margin: "40px auto", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <Rocket size={48} style={{ color: "var(--color-amber)" }} />
        </div>
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Your dashboard is ready
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 24 }}>
          Start by creating your first project, adding bank accounts, or inviting team members.
          Your KPIs, charts, and activity feed will populate automatically as you add data.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/projects"
            style={{
              padding: "10px 20px",
              background: "var(--color-blue)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Create a Project
          </a>
          <a
            href="/financial"
            style={{
              padding: "10px 20px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            Set Up Financials
          </a>
          <a
            href="/people"
            style={{
              padding: "10px 20px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            Invite Team
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate contextual insights based on real dashboard data.
 * These are deterministic rules, not LLM calls -- instant and free.
 */
function DashboardInsights({
  kpis,
  projectStatus,
  pendingApprovals,
  outstandingAP,
  outstandingAR,
}: {
  kpis: {
    activeProjectsValue: number;
    cashPosition: number;
    openChangeOrders: number;
    schedulePerformance: number;
  };
  projectStatus: { on_hold: number; total: number };
  pendingApprovals: number;
  outstandingAP: number;
  outstandingAR: number;
}) {
  const insights: {
    severity: string;
    label: string;
    title: string;
    desc: string;
  }[] = [];

  // Cash coverage: can we cover outstanding payables?
  if (outstandingAP > 0 && kpis.cashPosition > 0) {
    const coverageRatio = kpis.cashPosition / outstandingAP;
    if (coverageRatio < 1) {
      insights.push({
        severity: "badge-red",
        label: "Critical",
        title: "Cash Below Outstanding Payables",
        desc: `Cash (${formatCompactCurrency(kpis.cashPosition)}) does not cover outstanding payables (${formatCompactCurrency(outstandingAP)}). Accelerate collections or arrange bridge financing.`,
      });
    } else if (coverageRatio < 2) {
      insights.push({
        severity: "badge-amber",
        label: "Warning",
        title: "Cash Reserves Tightening",
        desc: `Cash covers ${coverageRatio.toFixed(1)}x of outstanding payables (${formatCompactCurrency(outstandingAP)}). Monitor closely and consider accelerating receivable collections.`,
      });
    }
  }

  // Outstanding receivables alert
  if (outstandingAR > 0 && kpis.cashPosition > 0) {
    const arRatio = outstandingAR / (outstandingAR + kpis.cashPosition);
    if (arRatio > 0.7) {
      insights.push({
        severity: "badge-amber",
        label: "Action",
        title: "High Receivables Outstanding",
        desc: `${formatCompactCurrency(outstandingAR)} in outstanding receivables. Follow up on aging invoices to improve cash flow.`,
      });
    }
  }

  // Schedule performance
  if (kpis.schedulePerformance > 0 && kpis.schedulePerformance < 50) {
    insights.push({
      severity: "badge-red",
      label: "Critical",
      title: "Schedule Performance Below Target",
      desc: `Average completion across active projects is ${formatPercent(kpis.schedulePerformance)}. Review project timelines and resource allocation.`,
    });
  } else if (kpis.schedulePerformance >= 50 && kpis.schedulePerformance < 75) {
    insights.push({
      severity: "badge-amber",
      label: "Monitor",
      title: "Schedule Performance Needs Attention",
      desc: `Average completion is ${formatPercent(kpis.schedulePerformance)}. Projects are progressing -- monitor for delays on critical path items.`,
    });
  }

  // Too many open change orders
  if (kpis.openChangeOrders > 10) {
    insights.push({
      severity: "badge-amber",
      label: "Warning",
      title: "High Change Order Volume",
      desc: `${kpis.openChangeOrders} open change orders pending review. Consider scheduling a dedicated review session to clear the backlog.`,
    });
  }

  // On-hold projects
  if (projectStatus.on_hold > 0) {
    insights.push({
      severity: "badge-amber",
      label: "Warning",
      title: `${projectStatus.on_hold} Project${projectStatus.on_hold > 1 ? "s" : ""} On Hold`,
      desc: "On-hold projects may tie up committed resources and affect cash flow forecasting. Review for reactivation or closure.",
    });
  }

  // Pending approvals backlog
  if (pendingApprovals >= 5) {
    insights.push({
      severity: "badge-amber",
      label: "Action",
      title: "Approval Queue Backlog",
      desc: `${pendingApprovals} items awaiting approval. Delayed approvals can bottleneck subcontractor payments and project progress.`,
    });
  }

  // Good news: high schedule performance
  if (kpis.schedulePerformance >= 90) {
    insights.push({
      severity: "badge-green",
      label: "Opportunity",
      title: "Strong Schedule Performance",
      desc: `Projects are averaging ${formatPercent(kpis.schedulePerformance)} completion. Team execution is on track -- consider pursuing new opportunities.`,
    });
  }

  // Good news: strong cash position
  if (outstandingAP > 0 && kpis.cashPosition / outstandingAP >= 3) {
    insights.push({
      severity: "badge-green",
      label: "Good",
      title: "Strong Cash Position",
      desc: `Cash reserves (${formatCompactCurrency(kpis.cashPosition)}) provide ${(kpis.cashPosition / outstandingAP).toFixed(1)}x coverage of outstanding obligations.`,
    });
  }

  // Fallback if nothing triggered
  if (insights.length === 0) {
    insights.push({
      severity: "badge-green",
      label: "Good",
      title: "All Systems Normal",
      desc: "No critical issues detected. Continue monitoring your projects and financials from this dashboard.",
    });
  }

  return (
    <>
      {insights.slice(0, 3).map((item, i) => (
        <div key={i} className="insight-item">
          <div className="insight-header">
            <span className={`badge ${item.severity}`}>{item.label}</span>
            <span className="insight-title">{item.title}</span>
          </div>
          <div className="insight-desc">{item.desc}</div>
        </div>
      ))}
    </>
  );
}
