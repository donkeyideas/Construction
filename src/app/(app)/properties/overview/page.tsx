import Link from "next/link";
import { Building2, Home, Users, DollarSign, TrendingUp, Wrench, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPropertiesOverview } from "@/lib/queries/properties";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import { formatLocalDate } from "@/lib/utils/date";
import OccupancyChart from "@/components/charts/OccupancyChart";
import PropertyRevenueChart from "@/components/charts/PropertyRevenueChart";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Properties Overview - Buildwrk",
};

export default async function PropertiesOverviewPage() {
  const supabase = await createClient();
  const ctx = await getCurrentUserCompany(supabase);
  const t = await getTranslations("properties");

  if (!ctx) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
        {t("loginToViewOverview")}
      </div>
    );
  }
  const overview = await getPropertiesOverview(supabase, ctx.companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("overviewTitle")}</h2>
          <p className="fin-header-sub">{t("overviewSubtitle")}</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/properties" className="ui-btn ui-btn-md ui-btn-secondary">{t("allProperties")}</Link>
          <Link href="/properties/new" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} /> {t("addProperty")}
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi"><div className="fin-kpi-icon blue"><Building2 size={18} /></div><span className="fin-kpi-label">{t("totalProperties")}</span><span className="fin-kpi-value">{overview.totalProperties}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon blue"><Home size={18} /></div><span className="fin-kpi-label">{t("totalUnits")}</span><span className="fin-kpi-value">{overview.totalUnits}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon green"><Users size={18} /></div><span className="fin-kpi-label">{t("avgOccupancy")}</span><span className="fin-kpi-value">{formatPercent(overview.avgOccupancy)}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon green"><DollarSign size={18} /></div><span className="fin-kpi-label">{t("monthlyRevenue")}</span><span className="fin-kpi-value">{formatCompactCurrency(overview.totalRevenue)}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon blue"><TrendingUp size={18} /></div><span className="fin-kpi-label">{t("monthlyNOI")}</span><span className="fin-kpi-value" style={{ color: overview.totalNOI >= 0 ? "var(--color-green)" : "var(--color-red)" }}>{formatCompactCurrency(overview.totalNOI)}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon amber"><Wrench size={18} /></div><span className="fin-kpi-label">{t("openMaintenance")}</span><span className="fin-kpi-value" style={{ color: overview.openMaintenanceCount > 0 ? "var(--color-amber)" : undefined }}>{overview.openMaintenanceCount}</span></div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("occupancyByProperty")}</div>
          <OccupancyChart data={overview.occupancyByProperty} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("revenueByPropertyType")}</div>
          <PropertyRevenueChart data={overview.revenueByType} />
        </div>
      </div>

      {/* Lists */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("expiringLeases")}</div>
          {overview.expiringLeases.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>{t("thProperty")}</th><th>{t("thUnit")}</th><th>{t("thTenant")}</th><th>{t("thLeaseEnd")}</th><th>{t("thRent")}</th></tr></thead>
                <tbody>
                  {overview.expiringLeases.map((l) => {
                    const daysLeft = Math.ceil((new Date(l.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={l.id} style={{ borderLeft: daysLeft <= 30 ? "3px solid var(--color-red)" : undefined }}>
                        <td>{l.property_name}</td>
                        <td>{l.unit_number}</td>
                        <td>{l.tenant_name}</td>
                        <td style={{ color: daysLeft <= 30 ? "var(--color-red)" : "var(--color-amber)", fontWeight: 500 }}>
                          {formatLocalDate(l.lease_end)}
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: 4 }}>({daysLeft}d)</span>
                        </td>
                        <td className="amount-col">{formatCurrency(l.monthly_rent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>{t("noLeasesExpiring")}</div>
          )}
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("openMaintenanceRequests")}</div>
          {overview.openMaintenance.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>{t("thProperty")}</th><th>{t("thTitle")}</th><th>{t("thPriority")}</th><th>{t("thStatus")}</th></tr></thead>
                <tbody>
                  {overview.openMaintenance.map((m) => (
                    <tr key={m.id}>
                      <td>{m.property_name}</td>
                      <td>{m.title}</td>
                      <td>
                        <span className={`inv-status inv-status-${m.priority === "emergency" || m.priority === "high" ? "overdue" : m.priority === "medium" ? "pending" : "draft"}`}>
                          {m.priority.charAt(0).toUpperCase() + m.priority.slice(1)}
                        </span>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>{m.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>{t("noOpenMaintenanceRequests")}</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/properties" className="ui-btn ui-btn-sm ui-btn-secondary">{t("allProperties")}</Link>
        <Link href="/properties/leases" className="ui-btn ui-btn-sm ui-btn-secondary">{t("allLeases")}</Link>
        <Link href="/properties/maintenance" className="ui-btn ui-btn-sm ui-btn-secondary">{t("allMaintenance")}</Link>
      </div>

    </div>
  );
}
