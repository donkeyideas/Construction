"use client";

import { useState } from "react";

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

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
  waitlisted: "#a855f7",
};

export default function BetaApplicationsClient({
  applications: initialApps,
}: {
  applications: BetaApplication[];
}) {
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
      <div className="page-header">
        <h1>Beta Applications</h1>
      </div>

      {/* KPI Cards */}
      <div className="kpi-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <KpiCard label="Total Applications" value={counts.all} color="#6b7280" />
        <KpiCard label="Pending Review" value={counts.pending} color="#f59e0b" />
        <KpiCard label="Approved" value={counts.approved} color="#22c55e" />
        <KpiCard label="Spots Remaining" value={spotsRemaining} color="#3b82f6" />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`ui-btn ui-btn-sm ${filter === f ? "ui-btn-primary" : ""}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#78716c" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>No applications yet</p>
          <p style={{ fontSize: "0.9rem" }}>Share buildwrk.com/beta to start receiving applications.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Company</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
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
                      <div style={{ fontWeight: 600 }}>{app.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#78716c" }}>{app.email}</div>
                    </td>
                    <td>{app.company_name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background: "#f5f5f4",
                          color: "#44403c",
                        }}
                      >
                        {app.company_type}
                      </span>
                    </td>
                    <td>{app.company_size || "—"}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#fff",
                          background: STATUS_COLORS[app.status] || "#6b7280",
                        }}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                        {app.status !== "approved" && (
                          <button
                            className="ui-btn ui-btn-sm"
                            style={{ color: "#22c55e" }}
                            disabled={updating === app.id}
                            onClick={() => updateStatus(app.id, "approved")}
                          >
                            Approve
                          </button>
                        )}
                        {app.status !== "rejected" && (
                          <button
                            className="ui-btn ui-btn-sm"
                            style={{ color: "#ef4444" }}
                            disabled={updating === app.id}
                            onClick={() => updateStatus(app.id, "rejected")}
                          >
                            Reject
                          </button>
                        )}
                        {app.status !== "waitlisted" && app.status !== "approved" && (
                          <button
                            className="ui-btn ui-btn-sm"
                            style={{ color: "#a855f7" }}
                            disabled={updating === app.id}
                            onClick={() => updateStatus(app.id, "waitlisted")}
                          >
                            Waitlist
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === app.id && (
                    <tr key={`${app.id}-detail`}>
                      <td colSpan={7} style={{ background: "#fafaf9", padding: "16px 24px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", fontSize: "0.85rem" }}>
                          <div>
                            <strong>Role:</strong> {app.role || "—"}
                          </div>
                          <div>
                            <strong>Phone:</strong> {app.phone || "—"}
                          </div>
                          <div>
                            <strong>Reviewed:</strong>{" "}
                            {app.reviewed_at
                              ? new Date(app.reviewed_at).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                        {app.biggest_pain && (
                          <div style={{ marginTop: "12px", fontSize: "0.85rem" }}>
                            <strong>Biggest Pain Point:</strong>
                            <p style={{ margin: "4px 0 0", color: "#57534e" }}>{app.biggest_pain}</p>
                          </div>
                        )}
                        {app.notes && (
                          <div style={{ marginTop: "12px", fontSize: "0.85rem" }}>
                            <strong>Notes:</strong>
                            <p style={{ margin: "4px 0 0", color: "#57534e" }}>{app.notes}</p>
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

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: "var(--color-surface, #fff)",
        border: "1px solid var(--color-border, #e7e5e4)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div style={{ fontSize: "0.8rem", color: "#78716c", fontWeight: 500, marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}
