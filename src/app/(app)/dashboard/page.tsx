import { redirect } from "next/navigation";
import {
  DollarSign,
  Briefcase,
  FileWarning,
  Clock,
  Rocket,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getDashboardKPIs,
  getProjectStatusBreakdown,
  getARAPAging,
  getCashFlow,
  getPendingApprovals,
  getRecentActivity,
} from "@/lib/queries/dashboard";
import { getMonthlyIncomeExpenses } from "@/lib/queries/financial";
import { getProjectsOverview } from "@/lib/queries/projects";
import { getSafetyOverview } from "@/lib/queries/safety";
import { getEquipmentOverview } from "@/lib/queries/equipment";
import { formatCompactCurrency, formatCurrency, formatPercent, formatRelativeTime, formatDateLong, toDateStr } from "@/lib/utils/format";
import DashboardFilter from "@/components/DashboardFilter";
import DashboardChartCarousel from "@/components/DashboardChartCarousel";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = {
  title: "Dashboard - Buildwrk",
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

const ROLE_GREETING_KEY: Record<string, string> = {
  owner: "greetingOwner",
  admin: "greetingAdmin",
  project_manager: "greetingProjectManager",
  superintendent: "greetingSuperintendent",
  accountant: "greetingAccountant",
  field_worker: "greetingFieldWorker",
  viewer: "greetingViewer",
};

interface PageProps {
  searchParams: Promise<{ project?: string; start?: string; end?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const { companyId, companyName, role: userRole } = userCompany;
  const sections = ROLE_SECTIONS[userRole] || ROLE_SECTIONS.viewer;
  const greetingKey = ROLE_GREETING_KEY[userRole] || "welcomeBack";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const greeting = (t as any)(greetingKey);

  const selectedProjectId = params.project || undefined;
  const filterStartDate = params.start || undefined;
  const filterEndDate = params.end || undefined;

  // Fetch project list for filter dropdown
  const { data: projectList } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name");

  const projects = (projectList ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  // Build AP/AR queries with optional project + date filter
  let apQuery = supabase
    .from("invoices")
    .select("balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "payable")
    .not("status", "in", '("voided","paid")');
  if (selectedProjectId) apQuery = apQuery.eq("project_id", selectedProjectId);
  if (filterStartDate) apQuery = apQuery.gte("invoice_date", filterStartDate);
  if (filterEndDate) apQuery = apQuery.lte("invoice_date", filterEndDate);

  let arQuery = supabase
    .from("invoices")
    .select("balance_due")
    .eq("company_id", companyId)
    .eq("invoice_type", "receivable")
    .not("status", "in", '("voided","paid")');
  if (selectedProjectId) arQuery = arQuery.eq("project_id", selectedProjectId);
  if (filterStartDate) arQuery = arQuery.gte("invoice_date", filterStartDate);
  if (filterEndDate) arQuery = arQuery.lte("invoice_date", filterEndDate);

  // Fetch all dashboard data in parallel
  const [kpis, projectStatus, agingData, pendingApprovalsResult, recentActivity, outstandingAPRes, outstandingARRes] =
    await Promise.all([
      getDashboardKPIs(supabase, companyId, selectedProjectId),
      getProjectStatusBreakdown(supabase, companyId, selectedProjectId),
      getARAPAging(supabase, companyId, selectedProjectId),
      getPendingApprovals(supabase, companyId, selectedProjectId),
      getRecentActivity(supabase, companyId, selectedProjectId),
      apQuery,
      arQuery,
    ]);

  const outstandingAP = (outstandingAPRes.data ?? []).reduce(
    (sum, r) => sum + (Number(r.balance_due) || 0), 0
  );
  const outstandingAR = (outstandingARRes.data ?? []).reduce(
    (sum, r) => sum + (Number(r.balance_due) || 0), 0
  );

  const { items: pendingApprovals, totalCount: pendingApprovalsTotal } = pendingApprovalsResult;

  // Fetch chart carousel data only if user can see charts
  const [cashFlowData, monthlyIncomeExpenses, projectsOverview, safetyOverview, equipmentOverview] =
    sections.charts
      ? await Promise.all([
          getCashFlow(supabase, companyId, selectedProjectId),
          getMonthlyIncomeExpenses(supabase, companyId),
          getProjectsOverview(supabase, companyId),
          getSafetyOverview(supabase, companyId),
          getEquipmentOverview(supabase, companyId),
        ])
      : [[] as { month: string; cashIn: number; cashOut: number; net: number }[], [] as { month: string; income: number; expenses: number }[], null, null, null];

  const projectCompletionData = (projectsOverview?.projects ?? [])
    .filter((p) => p.status === "active")
    .slice(0, 8)
    .map((p) => ({ name: p.name, completion_pct: Number(p.completion_pct) || 0 }));

  const isNewCompany =
    projectStatus.total === 0 &&
    pendingApprovals.length === 0 &&
    recentActivity.length === 0;

  if (isNewCompany && !selectedProjectId) {
    return <WelcomeState companyName={companyName} t={t} />;
  }

  // Compute donut chart percentages
  const total = projectStatus.total || 1; // avoid division by zero
  const donutSegments = [
    {
      labelKey: "complete" as const,
      count: projectStatus.completed,
      pct: Math.round((projectStatus.completed / total) * 100),
      color: "var(--color-blue)",
    },
    {
      labelKey: "inProgress" as const,
      count: projectStatus.active,
      pct: Math.round((projectStatus.active / total) * 100),
      color: "#3b82f6",
    },
    {
      labelKey: "preConstruction" as const,
      count: projectStatus.pre_construction,
      pct: Math.round((projectStatus.pre_construction / total) * 100),
      color: "var(--color-amber)",
    },
    {
      labelKey: "onHold" as const,
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

  // Find the selected project name for the header
  const selectedProjectName = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)?.name
    : undefined;

  return (
    <div>
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2>{t("title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "2px" }}>
            {selectedProjectName
              ? t("showingDataFor", { projectName: selectedProjectName })
              : greeting}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <DashboardFilter
            projects={projects}
            selectedProjectId={selectedProjectId}
            startDate={filterStartDate}
            endDate={filterEndDate}
          />
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
              {formatDateLong(toDateStr(new Date()))}
            </span>
            <span className="live-dot" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {sections.kpis && (
        <div className="kpi-grid">
          <KpiCard
            label={selectedProjectId ? t("projectValue") : t("activeProjects")}
            value={formatCompactCurrency(kpis.activeProjectsValue)}
            icon={<Briefcase size={22} />}
          />
          {sections.financials && (
            <KpiCard
              label={t("cashPosition")}
              value={formatCompactCurrency(kpis.cashPosition)}
              icon={<DollarSign size={22} />}
            />
          )}
          <KpiCard
            label={t("openChangeOrders")}
            value={String(kpis.openChangeOrders)}
            amber={kpis.openChangeOrders > 0}
            icon={<FileWarning size={22} />}
          />
          <KpiCard
            label={t("schedulePerformance")}
            value={formatPercent(kpis.schedulePerformance)}
            icon={<Clock size={22} />}
          />
        </div>
      )}

      {/* Charts Row */}
      {sections.charts && (
        <div className="charts-row">
          <div className="card dash-chart-carousel">
            <DashboardChartCarousel
              agingData={agingData}
              cashFlowData={cashFlowData}
              monthlyIncomeExpenses={monthlyIncomeExpenses}
              budgetProjects={projectsOverview?.budgetProjects ?? []}
              projectCompletionData={projectCompletionData}
              incidentTrend={safetyOverview?.monthlyTrend ?? []}
              incidentTypeBreakdown={safetyOverview?.typeBreakdown ?? []}
              safetyKPIs={{
                incidentsYTD: safetyOverview?.incidentsYTD ?? 0,
                daysSinceLastIncident: safetyOverview?.daysSinceLastIncident ?? 0,
                oshaRecordableCount: safetyOverview?.oshaRecordableCount ?? 0,
              }}
              equipmentStatusBreakdown={equipmentOverview?.statusBreakdown ?? []}
              equipmentTotal={equipmentOverview?.stats?.total ?? 0}
              equipmentTypeBreakdown={equipmentOverview?.typeBreakdown ?? []}
              equipmentUtilizationRate={equipmentOverview?.utilizationRate ?? 0}
              showFinancials={sections.financials}
            />
          </div>

          <div className="card">
            <div className="card-title">{t("projectStatus")}</div>
            <div className="donut-wrap">
              <div className="donut" style={{ background: conicGradient }}>
                <div className="donut-hole">
                  <strong>{projectStatus.total}</strong>
                  <span>{projectStatus.total === 1 ? t("project") : t("projects")}</span>
                </div>
              </div>
              <div className="legend">
                {donutSegments.map((seg) => (
                  <div key={seg.labelKey} className="legend-item">
                    <span className="legend-dot" style={{ background: seg.color }} />
                    {t(seg.labelKey)} {seg.pct}%
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Three Cards Row */}
      <div className="three-row">
        {sections.approvals && (
          <div className="card">
            <div className="card-title">
              {t("pendingApprovals")}{" "}
              {pendingApprovalsTotal > 0 && (
                <span className="badge badge-blue">{pendingApprovalsTotal}</span>
              )}
            </div>
            {pendingApprovals.length === 0 ? (
              <EmptyState message={t("noPendingApprovals")} />
            ) : (
              pendingApprovals.map((item) => {
                const href =
                  item.type === "invoice"
                    ? `/financial/invoices/${item.entityId}`
                    : item.type === "change_order"
                      ? "/projects/change-orders"
                      : item.type === "submittal"
                        ? "/projects/submittals"
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

        {sections.activity && (
          <div className="card">
            <div className="card-title">{t("recentActivity")}</div>
            {recentActivity.length === 0 ? (
              <EmptyState message={t("noRecentActivity")} />
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

        {sections.insights && (
          <div className="card">
            <div className="card-title">{t("insights")}</div>
            <DashboardInsights
              t={t}
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

function getActivityHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityType) return null;
  switch (entityType) {
    case "project": return entityId ? `/projects/${entityId}` : "/projects";
    case "invoice": return entityId ? `/financial/invoices/${entityId}` : "/financial/invoices";
    case "change_order": return "/projects/change-orders";
    case "rfi": return "/projects/rfis";
    case "submittal": return "/projects/submittals";
    case "daily_log": return "/projects/daily-logs";
    case "document": return "/documents";
    case "payment": return "/financial";
    default: return null;
  }
}

function KpiCard({ label, value, amber, icon }: { label: string; value: string; amber?: boolean; icon: React.ReactNode }) {
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
    <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", fontSize: "0.85rem" }}>
      {message}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WelcomeState({ companyName, t }: { companyName: string; t: any }) {
  return (
    <div>
      <div className="dash-header">
        <div>
          <h2>{t("welcomeTitle")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "2px" }}>
            {t("welcomeSetup", { companyName })}
          </p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 640, margin: "40px auto", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <Rocket size={48} style={{ color: "var(--color-amber)" }} />
        </div>
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, marginBottom: 8 }}>
          {t("dashboardReady")}
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 24 }}>
          {t("welcomeMessage")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/projects" style={{ padding: "10px 20px", background: "var(--color-blue)", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
            {t("createProject")}
          </a>
          <a href="/financial" style={{ padding: "10px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, color: "var(--text)" }}>
            {t("setUpFinancials")}
          </a>
          <a href="/people" style={{ padding: "10px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, color: "var(--text)" }}>
            {t("inviteTeam")}
          </a>
          <a href="/admin/import" style={{ padding: "10px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Upload size={14} />
            {t("importData")}
          </a>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DashboardInsights({ t, kpis, projectStatus, pendingApprovals, outstandingAP, outstandingAR }: {
  t: any;
  kpis: { activeProjectsValue: number; cashPosition: number; openChangeOrders: number; schedulePerformance: number };
  projectStatus: { on_hold: number; total: number };
  pendingApprovals: number; outstandingAP: number; outstandingAR: number;
}) {
  const insights: { severity: string; label: string; title: string; desc: string }[] = [];

  if (outstandingAP > 0 && kpis.cashPosition > 0) {
    const coverageRatio = kpis.cashPosition / outstandingAP;
    if (coverageRatio < 1) {
      insights.push({ severity: "badge-red", label: t("insightCritical"), title: t("insightCashBelowPayables"),
        desc: t("insightCashBelowPayablesDesc", { cash: formatCompactCurrency(kpis.cashPosition), payables: formatCompactCurrency(outstandingAP) }) });
    } else if (coverageRatio < 2) {
      insights.push({ severity: "badge-amber", label: t("insightWarning"), title: t("insightCashReservesTightening"),
        desc: t("insightCashReservesTighteningDesc", { ratio: coverageRatio.toFixed(1), payables: formatCompactCurrency(outstandingAP) }) });
    }
  }

  if (outstandingAR > 0 && kpis.cashPosition > 0) {
    const arRatio = outstandingAR / (outstandingAR + kpis.cashPosition);
    if (arRatio > 0.7) {
      insights.push({ severity: "badge-amber", label: t("insightAction"), title: t("insightHighReceivables"),
        desc: t("insightHighReceivablesDesc", { amount: formatCompactCurrency(outstandingAR) }) });
    }
  }

  if (kpis.schedulePerformance > 0 && kpis.schedulePerformance < 50) {
    insights.push({ severity: "badge-red", label: t("insightCritical"), title: t("insightScheduleBelowTarget"),
      desc: t("insightScheduleBelowTargetDesc", { percent: formatPercent(kpis.schedulePerformance) }) });
  } else if (kpis.schedulePerformance >= 50 && kpis.schedulePerformance < 75) {
    insights.push({ severity: "badge-amber", label: t("insightMonitor"), title: t("insightScheduleNeedsAttention"),
      desc: t("insightScheduleNeedsAttentionDesc", { percent: formatPercent(kpis.schedulePerformance) }) });
  }

  if (kpis.openChangeOrders > 10) {
    insights.push({ severity: "badge-amber", label: t("insightWarning"), title: t("insightHighChangeOrders"),
      desc: t("insightHighChangeOrdersDesc", { count: kpis.openChangeOrders }) });
  }

  if (projectStatus.on_hold > 0) {
    insights.push({ severity: "badge-amber", label: t("insightWarning"),
      title: projectStatus.on_hold > 1 ? t("insightProjectsOnHoldPlural", { count: projectStatus.on_hold }) : t("insightProjectsOnHold", { count: projectStatus.on_hold }),
      desc: t("insightProjectsOnHoldDesc") });
  }

  if (pendingApprovals >= 5) {
    insights.push({ severity: "badge-amber", label: t("insightAction"), title: t("insightApprovalBacklog"),
      desc: t("insightApprovalBacklogDesc", { count: pendingApprovals }) });
  }

  if (kpis.schedulePerformance >= 90) {
    insights.push({ severity: "badge-green", label: t("insightOpportunity"), title: t("insightStrongSchedule"),
      desc: t("insightStrongScheduleDesc", { percent: formatPercent(kpis.schedulePerformance) }) });
  }

  if (outstandingAP > 0 && kpis.cashPosition / outstandingAP >= 3) {
    insights.push({ severity: "badge-green", label: t("insightGood"), title: t("insightStrongCash"),
      desc: t("insightStrongCashDesc", { cash: formatCompactCurrency(kpis.cashPosition), ratio: (kpis.cashPosition / outstandingAP).toFixed(1) }) });
  }

  if (insights.length === 0) {
    insights.push({ severity: "badge-green", label: t("insightGood"), title: t("insightAllNormal"), desc: t("insightAllNormalDesc") });
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
