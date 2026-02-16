import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench, Activity, CheckCircle, AlertTriangle, DollarSign, Clock, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEquipmentOverview } from "@/lib/queries/equipment";
import { formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import EquipmentStatusChart from "@/components/charts/EquipmentStatusChart";
import EquipmentTypeChart from "@/components/charts/EquipmentTypeChart";

export const metadata = {
  title: "Equipment Overview - Buildwrk",
};

export default async function EquipmentOverviewPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const overview = await getEquipmentOverview(supabase, userCtx.companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Equipment Overview</h2>
          <p className="fin-header-sub">Fleet overview, utilization, and maintenance tracking.</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/equipment/assignments" className="ui-btn ui-btn-md ui-btn-secondary">Assignments</Link>
          <Link href="/equipment/inventory" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} /> Add Equipment
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Wrench size={18} /></div>
          <span className="fin-kpi-label">Total Equipment</span>
          <span className="fin-kpi-value">{overview.stats.total}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><Activity size={18} /></div>
          <span className="fin-kpi-label">Utilization Rate</span>
          <span className="fin-kpi-value" style={{ color: overview.utilizationRate >= 70 ? "var(--color-green)" : "var(--color-amber)" }}>
            {formatPercent(overview.utilizationRate)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><CheckCircle size={18} /></div>
          <span className="fin-kpi-label">Available</span>
          <span className="fin-kpi-value">{overview.stats.available}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><AlertTriangle size={18} /></div>
          <span className="fin-kpi-label">In Maintenance</span>
          <span className="fin-kpi-value" style={{ color: overview.stats.maintenance > 0 ? "var(--color-red)" : undefined }}>
            {overview.stats.maintenance}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><DollarSign size={18} /></div>
          <span className="fin-kpi-label">Total Asset Value</span>
          <span className="fin-kpi-value">{formatCompactCurrency(overview.totalAssetValue)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><Clock size={18} /></div>
          <span className="fin-kpi-label">Overdue Maintenance</span>
          <span className="fin-kpi-value" style={{ color: overview.overdueMaintenanceCount > 0 ? "var(--color-red)" : undefined }}>
            {overview.overdueMaintenanceCount}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Equipment Status</div>
          <EquipmentStatusChart data={overview.statusBreakdown} total={overview.stats.total} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Equipment by Type</div>
          <EquipmentTypeChart data={overview.typeBreakdown} />
        </div>
      </div>

      {/* Lists */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Maintenance Alerts</div>
          {overview.maintenanceAlerts.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>Equipment</th><th>Type</th><th>Status</th><th>Next Due</th><th>Days</th></tr></thead>
                <tbody>
                  {overview.maintenanceAlerts.map((e) => (
                    <tr key={e.id} style={{ borderLeft: e.daysOverdue > 0 ? "3px solid var(--color-red)" : e.daysOverdue > -7 ? "3px solid var(--color-amber)" : undefined }}>
                      <td style={{ fontWeight: 500 }}>{e.name}</td>
                      <td style={{ textTransform: "capitalize", fontSize: "0.78rem" }}>{e.equipment_type}</td>
                      <td>
                        <span className={`inv-status inv-status-${e.status === "maintenance" ? "overdue" : e.status === "in_use" ? "approved" : "pending"}`}>
                          {e.status.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>
                        {e.next_maintenance_date ? new Date(e.next_maintenance_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td style={{ color: e.daysOverdue > 0 ? "var(--color-red)" : "var(--color-amber)", fontWeight: 600 }}>
                        {e.daysOverdue > 0 ? `${e.daysOverdue}d overdue` : `${Math.abs(e.daysOverdue)}d left`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No maintenance alerts</div>
          )}
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Active Assignments</div>
          {overview.activeAssignments.length > 0 ? (
            <div>
              {overview.activeAssignments.map((a) => (
                <div key={a.id} className="activity-item">
                  <div className="activity-icon"><Wrench size={14} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="activity-text"><strong>{a.equipment_name}</strong></div>
                    <div className="activity-time">
                      {a.project_name} · {a.assigned_to_name}
                      {" · Since "}
                      {new Date(a.assigned_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No active assignments</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/equipment/inventory" className="ui-btn ui-btn-sm ui-btn-secondary">Full Inventory</Link>
        <Link href="/equipment/maintenance" className="ui-btn ui-btn-sm ui-btn-secondary">Maintenance Logs</Link>
        <Link href="/equipment/assignments" className="ui-btn ui-btn-sm ui-btn-secondary">All Assignments</Link>
      </div>
    </div>
  );
}
