import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  DollarSign,
  Wrench,
  Megaphone,
  CalendarDays,
  Home,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantDashboard } from "@/lib/queries/tenant-portal";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "Tenant Portal - ConstructionERP",
};

export default async function TenantDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const dashboard = await getTenantDashboard(supabase, user.id);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Tenant Portal</h2>
          <p className="fin-header-sub">
            Welcome back. Here is an overview of your tenancy.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="tenant-kpi-grid">
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Monthly Rent</span>
            <span className="kpi-value">
              {dashboard.lease
                ? formatCurrency(dashboard.lease.monthly_rent)
                : "--"}
            </span>
          </div>
          <div className="kpi-icon">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Next Due Date</span>
            <span className="kpi-value">
              {dashboard.lease
                ? new Date(dashboard.lease.end_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "--"}
            </span>
          </div>
          <div className="kpi-icon">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Open Maintenance</span>
            <span className={`kpi-value ${dashboard.openMaintenanceCount > 0 ? "amber" : ""}`}>
              {dashboard.openMaintenanceCount}
            </span>
          </div>
          <div className="kpi-icon">
            <Wrench size={22} />
          </div>
        </div>

        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Announcements</span>
            <span className="kpi-value">{dashboard.announcementCount}</span>
          </div>
          <div className="kpi-icon">
            <Megaphone size={22} />
          </div>
        </div>
      </div>

      {/* Lease Info Card */}
      {dashboard.lease ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">
            <Home size={18} />
            Current Lease
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Property</div>
              <div style={{ fontWeight: 600 }}>{dashboard.lease.property_name}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Unit</div>
              <div style={{ fontWeight: 600 }}>{dashboard.lease.unit_name}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Lease Period</div>
              <div style={{ fontWeight: 600 }}>
                {new Date(dashboard.lease.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" - "}
                {new Date(dashboard.lease.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Status</div>
              <span className="badge badge-green">{dashboard.lease.status}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><LayoutDashboard size={48} /></div>
            <div className="fin-empty-title">No Active Lease</div>
            <div className="fin-empty-desc">
              You do not have an active lease on file. Please contact your property manager for assistance.
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <Link href="/tenant/maintenance/new" className="card" style={{ textDecoration: "none", color: "var(--text)" }}>
          <div className="card-title">
            <Wrench size={18} style={{ color: "var(--color-amber)" }} />
            Submit Request
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Report a maintenance issue for your unit.
          </p>
        </Link>
        <Link href="/tenant/payments" className="card" style={{ textDecoration: "none", color: "var(--text)" }}>
          <div className="card-title">
            <DollarSign size={18} style={{ color: "var(--color-blue)" }} />
            Payment History
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            View your rent payment history and receipts.
          </p>
        </Link>
        <Link href="/tenant/announcements" className="card" style={{ textDecoration: "none", color: "var(--text)" }}>
          <div className="card-title">
            <Megaphone size={18} style={{ color: "var(--color-green)" }} />
            Announcements
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Stay up to date with property announcements.
          </p>
        </Link>
      </div>
    </div>
  );
}
