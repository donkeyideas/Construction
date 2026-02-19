import Link from "next/link";
import { Building2, Home, Users, DollarSign, TrendingUp, Wrench, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPropertiesOverview } from "@/lib/queries/properties";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import OccupancyChart from "@/components/charts/OccupancyChart";
import PropertyRevenueChart from "@/components/charts/PropertyRevenueChart";

export const metadata = {
  title: "Properties Overview - Buildwrk",
};

export default async function PropertiesOverviewPage() {
  const supabase = await createClient();
  const ctx = await getCurrentUserCompany(supabase);

  if (!ctx) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
        Please log in and join a company to view the properties overview.
      </div>
    );
  }

  const overview = await getPropertiesOverview(supabase, ctx.companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Properties Overview</h2>
          <p className="fin-header-sub">Portfolio performance, occupancy, and maintenance at a glance.</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/properties" className="ui-btn ui-btn-md ui-btn-secondary">All Properties</Link>
          <Link href="/properties/new" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} /> Add Property
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi"><div className="fin-kpi-icon blue"><Building2 size={18} /></div><span className="fin-kpi-label">Total Properties</span><span className="fin-kpi-value">{overview.totalProperties}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon blue"><Home size={18} /></div><span className="fin-kpi-label">Total Units</span><span className="fin-kpi-value">{overview.totalUnits}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon green"><Users size={18} /></div><span className="fin-kpi-label">Avg. Occupancy</span><span className="fin-kpi-value">{formatPercent(overview.avgOccupancy)}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon green"><DollarSign size={18} /></div><span className="fin-kpi-label">Monthly Revenue</span><span className="fin-kpi-value">{formatCompactCurrency(overview.totalRevenue)}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon blue"><TrendingUp size={18} /></div><span className="fin-kpi-label">Monthly NOI</span><span className="fin-kpi-value" style={{ color: overview.totalNOI >= 0 ? "var(--color-green)" : "var(--color-red)" }}>{formatCompactCurrency(overview.totalNOI)}</span></div>
        <div className="fin-kpi"><div className="fin-kpi-icon amber"><Wrench size={18} /></div><span className="fin-kpi-label">Open Maintenance</span><span className="fin-kpi-value" style={{ color: overview.openMaintenanceCount > 0 ? "var(--color-amber)" : undefined }}>{overview.openMaintenanceCount}</span></div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Occupancy by Property</div>
          <OccupancyChart data={overview.occupancyByProperty} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Revenue by Property Type</div>
          <PropertyRevenueChart data={overview.revenueByType} />
        </div>
      </div>

      {/* Lists */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Expiring Leases (60 Days)</div>
          {overview.expiringLeases.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>Property</th><th>Unit</th><th>Tenant</th><th>Lease End</th><th>Rent</th></tr></thead>
                <tbody>
                  {overview.expiringLeases.map((l) => {
                    const daysLeft = Math.ceil((new Date(l.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={l.id} style={{ borderLeft: daysLeft <= 30 ? "3px solid var(--color-red)" : undefined }}>
                        <td>{l.property_name}</td>
                        <td>{l.unit_number}</td>
                        <td>{l.tenant_name}</td>
                        <td style={{ color: daysLeft <= 30 ? "var(--color-red)" : "var(--color-amber)", fontWeight: 500 }}>
                          {new Date(l.lease_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No leases expiring soon</div>
          )}
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Open Maintenance Requests</div>
          {overview.openMaintenance.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>Property</th><th>Title</th><th>Priority</th><th>Status</th></tr></thead>
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
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No open maintenance requests</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/properties" className="ui-btn ui-btn-sm ui-btn-secondary">All Properties</Link>
        <Link href="/properties/leases" className="ui-btn ui-btn-sm ui-btn-secondary">All Leases</Link>
        <Link href="/properties/maintenance" className="ui-btn ui-btn-sm ui-btn-secondary">All Maintenance</Link>
      </div>

    </div>
  );
}
