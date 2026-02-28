"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Clock, CheckCircle, Users } from "lucide-react";
import { formatDateSafe } from "@/lib/utils/format";

interface BetaApplication {
  id: string;
  name: string;
  email: string;
  company_name: string;
  company_type: string;
  company_size: string | null;
  role: string | null;
  biggest_pain: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const FILTERS = ["all", "pending", "approved", "waitlisted", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_BADGE: Record<string, string> = {
  pending: "sa-badge-amber",
  approved: "sa-badge-green",
  rejected: "sa-badge-red",
  waitlisted: "sa-badge-purple",
};

export default function BetaApplicationsClient({
  applications: initialApps,
}: {
  applications: BetaApplication[];
}) {
  const t = useTranslations("superAdmin");
  const [applications, setApplications] = useState(initialApps);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    waitlisted: applications.filter((a) => a.status === "waitlisted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  const spotsRemaining = Math.max(0, 30 - counts.approved);

  const filtered =
    filter === "all" ? applications : applications.filter((a) => a.status === filter);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch("/api/beta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status, reviewed_at: new Date().toISOString() }
              : a,
          ),
        );
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>{t("betaApps.title")}</h2>
          <p className="admin-header-sub">{t("betaApps.subtitle")}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">{t("betaApps.totalApplications")}</span>
            <span className="sa-kpi-value">{counts.all}</span>
          </div>
          <div className="sa-kpi-icon">
            <FileText size={22} />
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">{t("betaApps.pendingReview")}</span>
            <span className="sa-kpi-value" style={{ color: "var(--color-amber)" }}>{counts.pending}</span>
          </div>
          <div className="sa-kpi-icon">
            <Clock size={22} />
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">{t("betaApps.approved")}</span>
            <span className="sa-kpi-value" style={{ color: "var(--color-green)" }}>{counts.approved}</span>
          </div>
          <div className="sa-kpi-icon">
            <CheckCircle size={22} />
          </div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">{t("betaApps.spotsRemaining")}</span>
            <span className="sa-kpi-value" style={{ color: "var(--color-blue)" }}>{spotsRemaining}</span>
          </div>
          <div className="sa-kpi-icon">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="settings-tabs" style={{ marginBottom: "20px" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`settings-tab ${filter === f ? "active" : ""}`}
          >
            {t(`betaApps.filter_${f}`)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="sa-empty">
          <p className="sa-empty-title">{t("betaApps.noApplicationsYet")}</p>
          <p className="sa-empty-desc">{t("betaApps.shareHint")}</p>
        </div>
      ) : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t("betaApps.thApplicant")}</th>
                <th>{t("betaApps.thCompany")}</th>
                <th>{t("betaApps.thType")}</th>
                <th>{t("betaApps.thSize")}</th>
                <th>{t("betaApps.thStatus")}</th>
                <th>{t("betaApps.thApplied")}</th>
                <th>{t("betaApps.thActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <>
                  <tr
                    key={app.id}
                    onClick={() =>
                      setExpandedId(expandedId === app.id ? null : app.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{app.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{app.email}</div>
                    </td>
                    <td>{app.company_name}</td>
                    <td>
                      <span className="sa-plan-badge sa-plan-starter">
                        {app.company_type}
                      </span>
                    </td>
                    <td>{app.company_size || "—"}</td>
                    <td>
                      <span className={`sa-status-badge sa-status-${app.status === "approved" ? "active" : app.status === "rejected" ? "canceled" : app.status === "waitlisted" ? "trial" : "trial"}`}>
                        <span className="sa-status-dot" />
                        {app.status}
                      </span>
                    </td>
                    <td>
                      {formatDateSafe(app.created_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                        {app.status !== "approved" && (
                          <button
                            className="sa-action-btn"
                            style={{ color: "var(--color-green)" }}
                            disabled={updating === app.id}
                            onClick={() => updateStatus(app.id, "approved")}
                          >
                            {t("betaApps.approve")}
                          </button>
                        )}
                        {app.status !== "rejected" && (
                          <button
                            className="sa-action-btn"
                            style={{ color: "var(--color-red)" }}
                            disabled={updating === app.id}
                            onClick={() => updateStatus(app.id, "rejected")}
                          >
                            {t("betaApps.reject")}
                          </button>
                        )}
                        {app.status !== "waitlisted" && app.status !== "approved" && (
                          <button
                            className="sa-action-btn"
                            style={{ color: "#7c3aed" }}
                            disabled={updating === app.id}
                            onClick={() => updateStatus(app.id, "waitlisted")}
                          >
                            {t("betaApps.waitlist")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === app.id && (
                    <tr key={`${app.id}-detail`}>
                      <td colSpan={7} style={{ background: "var(--surface)", padding: "16px 24px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", fontSize: "0.85rem" }}>
                          <div>
                            <strong>{t("betaApps.role")}:</strong> {app.role || "—"}
                          </div>
                          <div>
                            <strong>{t("betaApps.phone")}:</strong> {app.phone || "—"}
                          </div>
                          <div>
                            <strong>{t("betaApps.reviewed")}:</strong>{" "}
                            {app.reviewed_at
                              ? formatDateSafe(app.reviewed_at)
                              : "—"}
                          </div>
                        </div>
                        {app.biggest_pain && (
                          <div style={{ marginTop: "12px", fontSize: "0.85rem" }}>
                            <strong>{t("betaApps.biggestPainPoint")}:</strong>
                            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{app.biggest_pain}</p>
                          </div>
                        )}
                        {app.notes && (
                          <div style={{ marginTop: "12px", fontSize: "0.85rem" }}>
                            <strong>{t("betaApps.notes")}:</strong>
                            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{app.notes}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
