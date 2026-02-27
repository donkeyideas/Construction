import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, UserCheck, HardHat, AlertTriangle, Clock, FileWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPeopleOverview } from "@/lib/queries/people";
import PeopleTypeChart from "@/components/charts/PeopleTypeChart";
import HoursByProjectChart from "@/components/charts/HoursByProjectChart";
import { getTranslations } from "next-intl/server";


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
  const t = await getTranslations("people");

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("overviewTitle")}</h2>
          <p className="fin-header-sub">{t("overviewSubtitle")}</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/people" className="ui-btn ui-btn-md ui-btn-secondary">{t("peopleDirectory")}</Link>
          <Link href="/people/time" className="ui-btn ui-btn-md ui-btn-secondary">{t("timeTracking")}</Link>
          <Link href="/people/certifications" className="ui-btn ui-btn-md ui-btn-secondary">{t("certifications")}</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Users size={18} /></div>
          <span className="fin-kpi-label">{t("totalPeople")}</span>
          <span className="fin-kpi-value">{overview.totalActive}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><UserCheck size={18} /></div>
          <span className="fin-kpi-label">{t("employees")}</span>
          <span className="fin-kpi-value">{overview.employeeCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><HardHat size={18} /></div>
          <span className="fin-kpi-label">{t("subcontractors")}</span>
          <span className="fin-kpi-value">{overview.subcontractorCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><AlertTriangle size={18} /></div>
          <span className="fin-kpi-label">{t("expiringCerts")}</span>
          <span className="fin-kpi-value" style={{ color: overview.expiringCertCount > 0 ? "var(--color-red)" : undefined }}>
            {overview.expiringCertCount}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Clock size={18} /></div>
          <span className="fin-kpi-label">{t("hoursThisWeek")}</span>
          <span className="fin-kpi-value">{overview.hoursThisWeek.toFixed(1)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><FileWarning size={18} /></div>
          <span className="fin-kpi-label">{t("pendingTimesheets")}</span>
          <span className="fin-kpi-value" style={{ color: overview.pendingTimesheets > 0 ? "var(--color-amber)" : undefined }}>
            {overview.pendingTimesheets}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("peopleByType")}</div>
          <PeopleTypeChart data={overview.typeBreakdown} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("hoursByProject")}</div>
          <HoursByProjectChart data={overview.hoursByProject} />
        </div>
      </div>

      {/* Lists */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("expiringCertifications")}</div>
          {overview.expiringCerts.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>{t("thPerson")}</th><th>{t("thCertification")}</th><th>{t("thAuthority")}</th><th>{t("thExpiry")}</th><th>{t("thDaysLeft")}</th></tr></thead>
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
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>{t("noExpiringCerts")}</div>
          )}
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("pendingTimeApprovals")}</div>
          {overview.pendingEntries.length > 0 ? (
            <div>
              {overview.pendingEntries.map((entry) => (
                <div key={entry.id} className="activity-item">
                  <div className="activity-icon"><Clock size={14} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="activity-text">
                      <strong>{entry.user_profile?.full_name ?? entry.user_profile?.email ?? "Unknown"}</strong>
                      {" — "}
                      {entry.hours?.toFixed(1) ?? "0"}h
                    </div>
                    <div className="activity-time">
                      {entry.project?.name ?? "No project"} ·{" "}
                      {new Date(entry.entry_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>{t("noPendingApprovals")}</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/people" className="ui-btn ui-btn-sm ui-btn-secondary">{t("peopleDirectory")}</Link>
        <Link href="/people/vendors" className="ui-btn ui-btn-sm ui-btn-secondary">{t("vendors")}</Link>
        <Link href="/people/certifications" className="ui-btn ui-btn-sm ui-btn-secondary">{t("allCertifications")}</Link>
        <Link href="/people/time" className="ui-btn ui-btn-sm ui-btn-secondary">{t("timeEntries")}</Link>
      </div>

    </div>
  );
}
