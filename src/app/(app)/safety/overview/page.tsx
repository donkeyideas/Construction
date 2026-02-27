import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Calendar, Shield, Search, MessageSquare, Eye, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSafetyOverview } from "@/lib/queries/safety";
import { formatPercent } from "@/lib/utils/format";
import IncidentTrendChart from "@/components/charts/IncidentTrendChart";
import IncidentTypeChart from "@/components/charts/IncidentTypeChart";
import { getTranslations } from "next-intl/server";


export const metadata = {
  title: "Safety Overview - Buildwrk",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "overdue",
  high: "overdue",
  medium: "pending",
  low: "draft",
};

const TYPE_LABELS: Record<string, string> = {
  near_miss: "Near Miss",
  first_aid: "First Aid",
  recordable: "Recordable",
  lost_time: "Lost Time",
  fatality: "Fatality",
  property_damage: "Property Damage",
};

export default async function SafetyOverviewPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const overview = await getSafetyOverview(supabase, userCtx.companyId);
  const t = await getTranslations("safety");

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("overviewTitle")}</h2>
          <p className="fin-header-sub">{t("overviewSubtitle")}</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/safety/inspections" className="ui-btn ui-btn-md ui-btn-secondary">Inspections</Link>
          <Link href="/safety/incidents" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} /> Report Incident
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><AlertTriangle size={18} /></div>
          <span className="fin-kpi-label">{t("totalIncidents")}</span>
          <span className="fin-kpi-value">{overview.incidentsYTD}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><Calendar size={18} /></div>
          <span className="fin-kpi-label">{t("daysSinceLast")}</span>
          <span className="fin-kpi-value" style={{ color: overview.daysSinceLastIncident >= 30 ? "var(--color-green)" : overview.daysSinceLastIncident >= 7 ? "var(--color-amber)" : "var(--color-red)" }}>
            {overview.daysSinceLastIncident >= 999 ? "N/A" : overview.daysSinceLastIncident}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><Shield size={18} /></div>
          <span className="fin-kpi-label">OSHA Recordable</span>
          <span className="fin-kpi-value" style={{ color: overview.oshaRecordableCount > 0 ? "var(--color-red)" : undefined }}>
            {overview.oshaRecordableCount}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><Search size={18} /></div>
          <span className="fin-kpi-label">{t("openInvestigations")}</span>
          <span className="fin-kpi-value" style={{ color: overview.openInvestigations > 0 ? "var(--color-amber)" : undefined }}>
            {overview.openInvestigations}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><MessageSquare size={18} /></div>
          <span className="fin-kpi-label">{t("toolboxTalksMonth")}</span>
          <span className="fin-kpi-value">{overview.toolboxTalksThisMonth}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Eye size={18} /></div>
          <span className="fin-kpi-label">{t("nearMissRatio")}</span>
          <span className="fin-kpi-value">{formatPercent(overview.nearMissRatio)}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("incidentTrend")}</div>
          <IncidentTrendChart data={overview.monthlyTrend} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("incidentsByType")}</div>
          <IncidentTypeChart data={overview.typeBreakdown} />
        </div>
      </div>

      {/* Lists */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("openIncidents")}</div>
          {overview.openIncidents.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>#</th><th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>{t("thDaysOpen")}</th></tr></thead>
                <tbody>
                  {overview.openIncidents.map((inc) => {
                    const daysOpen = Math.floor((Date.now() - new Date(inc.incident_date).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={inc.id} style={{ borderLeft: inc.severity === "critical" ? "3px solid var(--color-red)" : undefined }}>
                        <td>
                          <Link href="/safety/incidents" style={{ color: "var(--color-blue)", textDecoration: "none", fontWeight: 500 }}>
                            {inc.incident_number}
                          </Link>
                        </td>
                        <td>{inc.title}</td>
                        <td style={{ fontSize: "0.78rem" }}>{TYPE_LABELS[inc.incident_type] ?? inc.incident_type}</td>
                        <td>
                          <span className={`inv-status inv-status-${SEVERITY_COLORS[inc.severity] ?? "draft"}`}>
                            {inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)}
                          </span>
                        </td>
                        <td style={{ textTransform: "capitalize", fontSize: "0.78rem" }}>{inc.status.replace("_", " ")}</td>
                        <td style={{ color: daysOpen > 14 ? "var(--color-red)" : daysOpen > 7 ? "var(--color-amber)" : undefined, fontWeight: 500 }}>
                          {daysOpen}d
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>{t("noOpenIncidents")}</div>
          )}
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("upcomingToolboxTalks")}</div>
          {overview.upcomingTalks.length > 0 ? (
            <div>
              {overview.upcomingTalks.map((talk) => (
                <div key={talk.id} className="activity-item">
                  <div className="activity-icon"><MessageSquare size={14} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="activity-text"><strong>{talk.title}</strong></div>
                    <div className="activity-time">
                      {talk.conductor?.full_name ?? "TBD"}
                      {talk.project?.name && ` · ${talk.project.name}`}
                      {" · "}
                      {new Date(talk.scheduled_date || talk.conducted_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>{t("noUpcomingTalks")}</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/safety/incidents" className="ui-btn ui-btn-sm ui-btn-secondary">{t("allIncidents")}</Link>
        <Link href="/safety/toolbox-talks" className="ui-btn ui-btn-sm ui-btn-secondary">Toolbox Talks</Link>
        <Link href="/safety/inspections" className="ui-btn ui-btn-sm ui-btn-secondary">Inspections</Link>
      </div>

    </div>
  );
}
