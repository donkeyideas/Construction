"use client";

import {
  ClipboardCheck,
  Building2,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { CompanyOnboardingStatus } from "@/lib/queries/onboarding";

interface Props {
  statuses: CompanyOnboardingStatus[];
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

function getBarColor(pct: number): string {
  if (pct >= 100) return "var(--color-green)";
  if (pct >= 50) return "var(--color-amber)";
  return "var(--color-red)";
}

export default function OnboardingClient({ statuses }: Props) {
  // Sort by completion % ascending (least complete first)
  const sorted = [...statuses].sort(
    (a, b) => a.completion_pct - b.completion_pct
  );

  const totalCompanies = statuses.length;
  const fullyOnboarded = statuses.filter((s) => s.completion_pct === 100).length;
  const avgCompletion =
    totalCompanies > 0
      ? Math.round(
          statuses.reduce((sum, s) => sum + s.completion_pct, 0) /
            totalCompanies
        )
      : 0;

  const checkLabels: {
    key: keyof CompanyOnboardingStatus["checks"];
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: "has_users", label: "Users", icon: <Users size={14} /> },
    { key: "has_projects", label: "Projects", icon: <Briefcase size={14} /> },
    {
      key: "has_properties",
      label: "Properties",
      icon: <Building2 size={14} />,
    },
    {
      key: "has_financial_data",
      label: "Financial",
      icon: <DollarSign size={14} />,
    },
    { key: "has_documents", label: "Documents", icon: <FileText size={14} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardCheck size={22} />
            Onboarding Checklist
          </h2>
          <p className="admin-header-sub">
            Track company onboarding progress across the platform
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Total Companies</div>
          <div className="admin-stat-value">{totalCompanies}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <CheckCircle size={18} />
          </div>
          <div className="admin-stat-label">Fully Onboarded</div>
          <div className="admin-stat-value">{fullyOnboarded}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <ClipboardCheck size={18} />
          </div>
          <div className="admin-stat-label">Average Completion</div>
          <div className="admin-stat-value">{avgCompletion}%</div>
        </div>
      </div>

      {/* Company Table */}
      <div className="sa-card">
        <div className="sa-card-title">
          <ClipboardCheck size={18} />
          Company Onboarding Status
        </div>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                {checkLabels.map((c) => (
                  <th
                    key={c.key}
                    style={{ textAlign: "center", whiteSpace: "nowrap" }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {c.icon}
                      {c.label}
                    </span>
                  </th>
                ))}
                <th style={{ minWidth: 140 }}>Completion</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--muted)",
                    }}
                  >
                    No companies found.
                  </td>
                </tr>
              ) : (
                sorted.map((s) => (
                  <tr key={s.company_id}>
                    <td style={{ fontWeight: 500 }}>{s.company_name}</td>
                    <td>
                      <span
                        className={`sa-plan-badge ${getPlanBadgeClass(s.plan)}`}
                      >
                        {s.plan}
                      </span>
                    </td>
                    {checkLabels.map((c) => (
                      <td key={c.key} style={{ textAlign: "center" }}>
                        {s.checks[c.key] ? (
                          <CheckCircle
                            size={16}
                            style={{ color: "var(--color-green)" }}
                          />
                        ) : (
                          <XCircle
                            size={16}
                            style={{ color: "var(--muted)", opacity: 0.4 }}
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            background: "var(--surface)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${s.completion_pct}%`,
                              height: "100%",
                              borderRadius: 4,
                              background: getBarColor(s.completion_pct),
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: getBarColor(s.completion_pct),
                            minWidth: 36,
                            textAlign: "right",
                          }}
                        >
                          {s.completion_pct}%
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.82rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
