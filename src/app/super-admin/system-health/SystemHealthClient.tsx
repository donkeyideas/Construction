"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Activity,
  Server,
  Database,
  Users,
  Building2,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import type { SystemHealthData } from "@/lib/queries/system-health";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface Props {
  data: SystemHealthData;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

function formatTableName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCountBadgeStyle(count: number): React.CSSProperties {
  if (count > 1000) {
    return {
      background: "rgba(22, 163, 74, 0.1)",
      color: "var(--color-green)",
    };
  }
  if (count > 100) {
    return {
      background: "rgba(29, 78, 216, 0.1)",
      color: "var(--color-blue)",
    };
  }
  if (count > 0) {
    return {
      background: "var(--surface)",
      color: "var(--muted)",
    };
  }
  return {
    background: "rgba(180, 83, 9, 0.08)",
    color: "var(--color-amber)",
  };
}

function getPlanPillStyle(plan: string): React.CSSProperties {
  switch (plan) {
    case "starter":
      return {
        background: "rgba(29, 78, 216, 0.1)",
        color: "var(--color-blue)",
      };
    case "professional":
      return {
        background: "rgba(180, 83, 9, 0.1)",
        color: "var(--color-amber)",
      };
    case "enterprise":
      return {
        background: "rgba(139, 92, 246, 0.1)",
        color: "#8b5cf6",
      };
    default:
      return {
        background: "var(--surface)",
        color: "var(--muted)",
      };
  }
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export default function SystemHealthClient({ data }: Props) {
  const t = useTranslations("superAdmin");
  const router = useRouter();

  const totalRecords = data.tableStats.reduce(
    (sum, t) => sum + t.row_count,
    0
  );

  const sortedTables = [...data.tableStats].sort(
    (a, b) => b.row_count - a.row_count
  );

  const isOperational = data.uptimeStatus === "operational";

  return (
    <div>
      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h2>{t("systemHealth.title")}</h2>
          <p className="admin-header-sub">
            {t("systemHealth.subtitle")}
          </p>
        </div>
        <button
          className="sa-action-btn"
          onClick={() => router.refresh()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={14} />
          {t("systemHealth.refresh")}
        </button>
      </div>

      {/* ── Status Banner ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 10,
          marginBottom: 20,
          fontWeight: 600,
          fontSize: "0.88rem",
          background: isOperational
            ? "rgba(22, 163, 74, 0.06)"
            : "rgba(180, 83, 9, 0.06)",
          border: isOperational
            ? "1px solid rgba(22, 163, 74, 0.2)"
            : "1px solid rgba(180, 83, 9, 0.2)",
          color: isOperational ? "var(--color-green)" : "var(--color-amber)",
        }}
      >
        {isOperational ? (
          <CheckCircle size={18} />
        ) : (
          <AlertCircle size={18} />
        )}
        {isOperational ? t("systemHealth.allOperational") : t("systemHealth.degraded")}
      </div>

      {/* ── Main KPI Cards ── */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Users size={18} />
          </div>
          <div className="admin-stat-label">{t("systemHealth.totalUsers")}</div>
          <div className="admin-stat-value">{data.userStats.total}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">{t("systemHealth.totalCompanies")}</div>
          <div className="admin-stat-value">{data.companyStats.total}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "rgba(139, 92, 246, 0.08)", color: "#8b5cf6" }}>
            <Database size={18} />
          </div>
          <div className="admin-stat-label">{t("systemHealth.totalRecords")}</div>
          <div className="admin-stat-value">
            {totalRecords.toLocaleString()}
          </div>
        </div>

        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: isOperational
                ? "rgba(22, 163, 74, 0.08)"
                : "rgba(180, 83, 9, 0.08)",
              color: isOperational ? "var(--color-green)" : "var(--color-amber)",
            }}
          >
            <Server size={18} />
          </div>
          <div className="admin-stat-label">{t("systemHealth.systemStatus")}</div>
          <div className="admin-stat-value">
            <span
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 6,
                fontSize: "0.75rem",
                fontWeight: 600,
                background: isOperational
                  ? "rgba(22, 163, 74, 0.1)"
                  : "rgba(180, 83, 9, 0.1)",
                color: isOperational
                  ? "var(--color-green)"
                  : "var(--color-amber)",
              }}
            >
              {isOperational ? t("systemHealth.operational") : t("systemHealth.degradedShort")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-column: Database Stats + Recent Activity ── */}
      <div className="sa-two-col">
        {/* Left: Database Stats */}
        <div className="sa-card">
          <div className="sa-card-title">
            <Database size={18} />
            {t("systemHealth.databaseStatistics")}
          </div>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>{t("systemHealth.thTable")}</th>
                  <th style={{ textAlign: "right" }}>{t("systemHealth.thRowCount")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTables.map((t) => (
                  <tr key={t.table_name}>
                    <td style={{ fontWeight: 500 }}>
                      {formatTableName(t.table_name)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 6,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          minWidth: 48,
                          textAlign: "center",
                          ...getCountBadgeStyle(t.row_count),
                        }}
                      >
                        {t.row_count.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="sa-card">
          <div className="sa-card-title">
            <Activity size={18} />
            {t("systemHealth.recentActivity")}
          </div>
          {data.recentActivity.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              {t("systemHealth.noAuditEntries")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.82rem",
                  }}
                >
                  <Clock
                    size={14}
                    style={{
                      color: "var(--muted)",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>
                      {entry.action}
                      <span
                        style={{
                          marginLeft: 6,
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          background: "var(--surface)",
                          color: "var(--muted)",
                        }}
                      >
                        {entry.entity_type}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.78rem",
                        marginTop: 2,
                      }}
                    >
                      {entry.user_name || entry.user_email || "System"} &middot;{" "}
                      {formatDateTime(entry.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: User Stats, Company Stats, Storage ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginTop: 20,
        }}
      >
        {/* User Stats */}
        <div className="sa-card">
          <div className="sa-card-title">
            <Users size={18} />
            {t("systemHealth.userStatistics")}
          </div>
          <div style={{ padding: "8px 16px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{t("systemHealth.totalUsers")}</span>
              <span style={{ fontWeight: 600 }}>{data.userStats.total}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{t("systemHealth.activeToday")}</span>
              <span style={{ fontWeight: 600, color: "var(--color-green)" }}>
                {data.userStats.activeToday}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{t("systemHealth.newThisMonth")}</span>
              <span style={{ fontWeight: 600, color: "var(--color-blue)" }}>
                {data.userStats.newThisMonth}
              </span>
            </div>
          </div>
        </div>

        {/* Company Stats */}
        <div className="sa-card">
          <div className="sa-card-title">
            <Building2 size={18} />
            {t("systemHealth.companyStatistics")}
          </div>
          <div style={{ padding: "8px 16px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{t("systemHealth.totalCompanies")}</span>
              <span style={{ fontWeight: 600 }}>{data.companyStats.total}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{t("systemHealth.activeCompanies")}</span>
              <span style={{ fontWeight: 600, color: "var(--color-green)" }}>
                {data.companyStats.activeCompanies}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 0 4px",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {t("systemHealth.plansBreakdown")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(
                ["starter", "professional", "enterprise"] as const
              ).map((plan) => (
                <span
                  key={plan}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    ...getPlanPillStyle(plan),
                  }}
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  <span
                    style={{
                      fontWeight: 700,
                      marginLeft: 2,
                    }}
                  >
                    {data.companyStats.byPlan[plan]}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Storage Stats */}
        <div className="sa-card">
          <div className="sa-card-title">
            <HardDrive size={18} />
            {t("systemHealth.storage")}
          </div>
          <div style={{ padding: "8px 16px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{t("systemHealth.totalDocuments")}</span>
              <span style={{ fontWeight: 600 }}>
                {data.storageStats.totalDocuments.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>{t("systemHealth.estimatedSize")}</span>
              <span style={{ fontWeight: 600 }}>
                {data.storageStats.totalSize > 0
                  ? formatBytes(data.storageStats.totalSize)
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
