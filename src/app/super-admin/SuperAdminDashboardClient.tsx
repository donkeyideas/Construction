"use client";

import Link from "next/link";
import {
  DollarSign, Building2, Users, Activity,
} from "lucide-react";
import type { PlatformStats, PlatformCompany } from "@/lib/queries/super-admin";

interface Props {
  stats: PlatformStats;
  companies: (PlatformCompany & { member_count: number })[];
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    target_audience: string;
    is_active: boolean;
    published_at: string | null;
    created_at: string;
  }>;
  subscriptionEvents: Array<{
    id: string;
    event_type: string;
    plan_from: string | null;
    plan_to: string | null;
    amount: number | null;
    created_at: string;
    company_name?: string;
  }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPlanBadgeClass(plan: string): string {
  switch (plan) {
    case "enterprise":
      return "sa-plan-enterprise";
    case "professional":
      return "sa-plan-professional";
    default:
      return "sa-plan-starter";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "sa-status-active";
    case "trial":
      return "sa-status-trial";
    case "canceled":
      return "sa-status-canceled";
    case "past_due":
      return "sa-status-past_due";
    default:
      return "";
  }
}

export default function SuperAdminDashboardClient({
  stats,
  companies,
  announcements,
  subscriptionEvents,
}: Props) {
  const recentCompanies = companies.slice(0, 5);
  const activeAnnouncements = announcements.filter((a) => a.is_active);

  const totalEnterprise = stats.planDistribution["enterprise"] || 0;
  const totalProfessional = stats.planDistribution["professional"] || 0;
  const totalStarter = stats.planDistribution["starter"] || 0;
  const totalPlans = totalEnterprise + totalProfessional + totalStarter;

  const enterprisePct = totalPlans > 0 ? ((totalEnterprise / totalPlans) * 100).toFixed(1) : "0";
  const professionalPct = totalPlans > 0 ? ((totalProfessional / totalPlans) * 100).toFixed(1) : "0";
  const starterPct = totalPlans > 0 ? ((totalStarter / totalPlans) * 100).toFixed(1) : "0";

  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Platform Overview</h2>
          <p className="admin-header-sub">
            ConstructionERP SaaS Management
          </p>
        </div>
        <div className="admin-header-actions">
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">Total Companies</span>
            <span className="sa-kpi-value">{stats.totalCompanies}</span>
            <span className="sa-kpi-trend up">
              {stats.activeCompanies} active
            </span>
          </div>
          <div className="sa-kpi-icon">
            <Building2 size={22} />
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">Total Users</span>
            <span className="sa-kpi-value">{stats.totalUsers}</span>
            <span className="sa-kpi-trend up">Across all companies</span>
          </div>
          <div className="sa-kpi-icon">
            <Users size={22} />
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">Trial Companies</span>
            <span className="sa-kpi-value">{stats.trialCompanies}</span>
            <span className="sa-kpi-trend" style={{ color: "var(--color-amber)" }}>
              Pending conversion
            </span>
          </div>
          <div className="sa-kpi-icon">
            <Activity size={22} />
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">Enterprise Accounts</span>
            <span className="sa-kpi-value">{totalEnterprise}</span>
            <span className="sa-kpi-trend up">
              {enterprisePct}% of total
            </span>
          </div>
          <div className="sa-kpi-icon">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* Plan Distribution + Announcements */}
      <div className="sa-two-col">
        <div className="sa-card">
          <div className="sa-card-title">Plan Distribution</div>
          <div className="sa-stacked-bar">
            {totalPlans > 0 && (
              <>
                <div
                  style={{
                    width: `${enterprisePct}%`,
                    background: "var(--color-blue)",
                  }}
                />
                <div
                  style={{
                    width: `${professionalPct}%`,
                    background: "#3b82f6",
                  }}
                />
                <div
                  style={{
                    width: `${starterPct}%`,
                    background: "var(--color-amber)",
                  }}
                />
              </>
            )}
          </div>
          <div className="sa-stacked-legend">
            <div className="sa-legend-item">
              <span className="sa-legend-dot" style={{ background: "var(--color-blue)" }} />
              Enterprise ({totalEnterprise})
            </div>
            <div className="sa-legend-item">
              <span className="sa-legend-dot" style={{ background: "#3b82f6" }} />
              Professional ({totalProfessional})
            </div>
            <div className="sa-legend-item">
              <span className="sa-legend-dot" style={{ background: "var(--color-amber)" }} />
              Starter ({totalStarter})
            </div>
          </div>

          {/* Subscription Events */}
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "10px" }}>
              Recent Subscription Events
            </div>
            {subscriptionEvents.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                No subscription events yet.
              </div>
            ) : (
              subscriptionEvents.slice(0, 5).map((event) => (
                <div key={event.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "0.82rem",
                }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{event.company_name}</span>
                    <span style={{ color: "var(--muted)", marginLeft: "8px" }}>{event.event_type}</span>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                    {formatDate(event.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sa-card">
          <div className="sa-card-title">
            Active Announcements
            <span className="sa-badge sa-badge-green">{activeAnnouncements.length}</span>
          </div>
          {announcements.length === 0 ? (
            <div className="sa-empty">
              <div className="sa-empty-title">No Announcements</div>
              <div className="sa-empty-desc">
                Create announcements to notify platform users.
              </div>
            </div>
          ) : (
            announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="sa-announcement-item">
                <span className={`sa-announcement-dot ${a.is_active ? "active" : "inactive"}`} />
                <div className="sa-announcement-info">
                  <div className="sa-announcement-title">{a.title}</div>
                  <div className="sa-announcement-meta">
                    {a.target_audience === "all" ? "All users" : a.target_audience} &middot; {formatDate(a.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
          <Link href="/super-admin/announcements" className="sa-view-all">
            Manage Announcements &rarr;
          </Link>
        </div>
      </div>

      {/* Company Activity Table */}
      <div className="sa-card" style={{ marginBottom: "24px" }}>
        <div className="sa-card-title">Company Activity</div>
        {recentCompanies.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-title">No Companies Yet</div>
            <div className="sa-empty-desc">
              Companies will appear here once users register.
            </div>
          </div>
        ) : (
          <div className="sa-table-wrap" style={{ border: "none", marginBottom: 0 }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Users</th>
                  <th>Industry</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentCompanies.map((company) => (
                  <tr key={company.id}>
                    <td style={{ fontWeight: 500 }}>{company.name}</td>
                    <td>
                      <span className={`sa-plan-badge ${getPlanBadgeClass(company.subscription_plan)}`}>
                        {company.subscription_plan}
                      </span>
                    </td>
                    <td>
                      <span className={`sa-status-badge ${getStatusBadgeClass(company.subscription_status)}`}>
                        <span className="sa-status-dot" />
                        {company.subscription_status}
                      </span>
                    </td>
                    <td>{company.member_count}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {company.industry_type || "-"}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {formatDate(company.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href="/super-admin/companies" className="sa-view-all">
          View All Companies &rarr;
        </Link>
      </div>
    </>
  );
}
