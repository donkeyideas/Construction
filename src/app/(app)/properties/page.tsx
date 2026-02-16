import Link from "next/link";
import { Building2, Home, Users, DollarSign, TrendingUp, Wrench, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPropertiesOverview } from "@/lib/queries/properties";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import PropertiesImport from "./PropertiesImport";
import OccupancyChart from "@/components/charts/OccupancyChart";
import PropertyRevenueChart from "@/components/charts/PropertyRevenueChart";

export const metadata = {
  title: "Properties - Buildwrk",
};

function OccupancyRing({ rate }: { rate: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, rate));
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 90 ? "var(--color-green)" : clamped >= 70 ? "var(--color-amber)" : "var(--color-red)";
  return (
    <div className="occupancy-ring">
      <svg viewBox="0 0 44 44">
        <circle className="occupancy-ring-track" cx="22" cy="22" r={radius} />
        <circle className="occupancy-ring-fill" cx="22" cy="22" r={radius} stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="occupancy-ring-text">{Math.round(clamped)}%</span>
    </div>
  );
}

function PropertyTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = { residential: "Residential", commercial: "Commercial", industrial: "Industrial", mixed_use: "Mixed Use" };
  const variants: Record<string, string> = { residential: "badge-green", commercial: "badge-blue", industrial: "badge-amber", mixed_use: "badge-red" };
  return <span className={`badge ${variants[type] ?? "badge-blue"}`}>{labels[type] ?? type}</span>;
}

export default async function PropertiesPage() {
  const supabase = await createClient();
  const ctx = await getCurrentUserCompany(supabase);

  if (!ctx) {
    return (
      <div className="properties-empty">
        <div className="properties-empty-title">Not Authorized</div>
        <div className="properties-empty-desc">Please log in and join a company to view properties.</div>
      </div>
    );
  }

  const overview = await getPropertiesOverview(supabase, ctx.companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Properties</h2>
          <p className="fin-header-sub">Manage your real estate portfolio.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <PropertiesImport />
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
        <Link href="/properties/leases" className="ui-btn ui-btn-sm ui-btn-secondary">All Leases</Link>
        <Link href="/properties/maintenance" className="ui-btn ui-btn-sm ui-btn-secondary">All Maintenance</Link>
      </div>

      {/* Property Cards Grid */}
      {overview.properties.length === 0 ? (
        <div className="properties-empty">
          <div className="properties-empty-icon"><Building2 size={48} /></div>
          <div className="properties-empty-title">No properties yet</div>
          <div className="properties-empty-desc">Add your first property to start managing your real estate portfolio.</div>
          <Link href="/properties/new" className="ui-btn ui-btn-md ui-btn-primary"><Plus size={16} /> Add Property</Link>
        </div>
      ) : (
        <div className="properties-grid">
          {overview.properties.map((property) => {
            const occupancy = property.occupancy_rate ?? (property.total_units > 0 ? (property.occupied_units / property.total_units) * 100 : 0);
            return (
              <Link key={property.id} href={`/properties/${property.id}`} className="card property-card">
                <div className="property-card-top">
                  <div className="property-card-info">
                    <div className="property-card-name">{property.name}</div>
                    <div className="property-card-address">{property.address_line1}, {property.city}, {property.state} {property.zip}</div>
                  </div>
                  <div className="property-card-type"><PropertyTypeBadge type={property.property_type} /></div>
                </div>
                <div className="property-card-stats">
                  <div className="property-card-stat">
                    <span className="property-card-stat-label">Units</span>
                    <span className="property-card-stat-value">{property.occupied_units}/{property.total_units}</span>
                  </div>
                  <div className="property-card-stat">
                    <span className="property-card-stat-label">Monthly NOI</span>
                    <span className="property-card-stat-value">{formatCurrency(property.noi ?? 0)}</span>
                  </div>
                </div>
                <div className="property-card-footer">
                  <div className="property-card-occupancy">
                    <OccupancyRing rate={occupancy} />
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Occupancy</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
