import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, UserCheck, HardHat, AlertTriangle, Clock, FileWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPeopleOverview } from "@/lib/queries/people";
import PeopleTypeChart from "@/components/charts/PeopleTypeChart";
import HoursByProjectChart from "@/components/charts/HoursByProjectChart";

export const metadata = {
  title: "People Overview - Buildwrk",
};

export default async function PeopleOverviewPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;
  const overview = await getPeopleOverview(supabase, companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>People Overview</h2>
          <p className="fin-header-sub">Team overview, certifications, and time tracking.</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/people" className="ui-btn ui-btn-md ui-btn-secondary">People Directory</Link>
          <Link href="/people/time" className="ui-btn ui-btn-md ui-btn-secondary">Time Tracking</Link>
          <Link href="/people/certifications" className="ui-btn ui-btn-md ui-btn-secondary">Certifications</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Users size={18} /></div>
          <span className="fin-kpi-label">Total People</span>
          <span className="fin-kpi-value">{overview.totalActive}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><UserCheck size={18} /></div>
          <span className="fin-kpi-label">Employees</span>
          <span className="fin-kpi-value">{overview.employeeCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><HardHat size={18} /></div>
          <span className="fin-kpi-label">Subcontractors</span>
          <span className="fin-kpi-value">{overview.subcontractorCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><AlertTriangle size={18} /></div>
          <span className="fin-kpi-label">Expiring Certs</span>
          <span className="fin-kpi-value" style={{ color: overview.expiringCertCount > 0 ? "var(--color-red)" : undefined }}>
            {overview.expiringCertCount}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Clock size={18} /></div>
          <span className="fin-kpi-label">Hours This Week</span>
          <span className="fin-kpi-value">{overview.hoursThisWeek.toFixed(1)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><FileWarning size={18} /></div>
          <span className="fin-kpi-label">Pending Timesheets</span>
          <span className="fin-kpi-value" style={{ color: overview.pendingTimesheets > 0 ? "var(--color-amber)" : undefined }}>
            {overview.pendingTimesheets}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">People by Type</div>
          <PeopleTypeChart data={overview.typeBreakdown} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Hours by Project (This Week)</div>
          <HoursByProjectChart data={overview.hoursByProject} />
        </div>
      </div>

      {/* Lists */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Expiring Certifications</div>
          {overview.expiringCerts.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>Person</th><th>Certification</th><th>Authority</th><th>Expiry</th><th>Days Left</th></tr></thead>
                <tbody>
                  {overview.expiringCerts.map((c) => {
                    const daysLeft = c.expiry_date
                      ? Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : 999;
                    return (
                      <tr key={c.id} style={{ borderLeft: daysLeft <= 7 ? "3px solid var(--color-red)" : daysLeft <= 30 ? "3px solid var(--color-amber)" : undefined }}>
                        <td style={{ fontWeight: 500 }}>{c.contact_name}</td>
                        <td>{c.cert_name}</td>
                        <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{c.issuing_authority ?? "—"}</td>
                        <td style={{ fontSize: "0.78rem" }}>
                          {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td style={{ color: daysLeft <= 7 ? "var(--color-red)" : "var(--color-amber)", fontWeight: 600 }}>
                          {daysLeft}d
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No expiring certifications</div>
          )}
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Pending Time Approvals</div>
          {overview.pendingEntries.length > 0 ? (
            <div>
              {overview.pendingEntries.map((t) => (
                <div key={t.id} className="activity-item">
                  <div className="activity-icon"><Clock size={14} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="activity-text">
                      <strong>{t.user_profile?.full_name ?? t.user_profile?.email ?? "Unknown"}</strong>
                      {" — "}
                      {t.hours?.toFixed(1) ?? "0"}h
                    </div>
                    <div className="activity-time">
                      {t.project?.name ?? "No project"} ·{" "}
                      {new Date(t.entry_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No pending approvals</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/people" className="ui-btn ui-btn-sm ui-btn-secondary">People Directory</Link>
        <Link href="/people/vendors" className="ui-btn ui-btn-sm ui-btn-secondary">Vendors</Link>
        <Link href="/people/certifications" className="ui-btn ui-btn-sm ui-btn-secondary">All Certifications</Link>
        <Link href="/people/time" className="ui-btn ui-btn-sm ui-btn-secondary">Time Entries</Link>
      </div>
    </div>
  );
}
