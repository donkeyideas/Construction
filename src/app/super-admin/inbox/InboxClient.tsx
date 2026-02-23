"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  MailOpen,
  Archive,
  Filter,
  X,
  FileText,
  Briefcase,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContactSubmission {
  id: string;
  type: "contact" | "custom_plan";
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  company_size: string | null;
  modules_interested: string[];
  budget_range: string | null;
  subject: string | null;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SubmissionStats {
  total: number;
  newCount: number;
  read: number;
  archived: number;
}

interface Props {
  submissions: ContactSubmission[];
  stats: SubmissionStats;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "new":
      return "sa-badge sa-badge-blue";
    case "read":
      return "sa-badge sa-badge-amber";
    case "replied":
      return "sa-badge sa-badge-green";
    case "archived":
      return "sa-badge sa-badge-gray";
    default:
      return "sa-badge";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "new":
      return "New";
    case "read":
      return "Read";
    case "replied":
      return "Replied";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function typeBadgeClass(type: string): string {
  return type === "custom_plan"
    ? "sa-badge sa-badge-purple"
    : "sa-badge sa-badge-blue";
}

function typeLabel(type: string): string {
  return type === "custom_plan" ? "Custom Plan" : "Contact";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InboxClient({ submissions, stats }: Props) {
  const router = useRouter();

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filteredItems, setFilteredItems] = useState(submissions);
  const [loading, setLoading] = useState(false);

  // Detail modal
  const [selected, setSelected] = useState<ContactSubmission | null>(null);

  // Admin notes
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Status change
  const [newStatus, setNewStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---- Apply filters ---- */
  const applyFilters = useCallback(async () => {
    const hasFilters = filterStatus || filterType;
    if (!hasFilters) {
      setFilteredItems(submissions);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("type", filterType);

      const res = await fetch(
        `/api/super-admin/inbox?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setFilteredItems(data.submissions);
      }
    } catch {
      // Fall back to client-side filtering
      let result = [...submissions];
      if (filterStatus)
        result = result.filter((s) => s.status === filterStatus);
      if (filterType)
        result = result.filter((s) => s.type === filterType);
      setFilteredItems(result);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, submissions]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  /* ---- Open detail ---- */
  function openDetail(submission: ContactSubmission) {
    setSelected(submission);
    setAdminNotes(submission.admin_notes || "");
    setNewStatus(submission.status);
    setError("");
    setSuccess("");

    // Auto-mark as read if new
    if (submission.status === "new") {
      markAsRead(submission.id);
    }
  }

  /* ---- Close detail ---- */
  function closeDetail() {
    setSelected(null);
    setAdminNotes("");
    setNewStatus("");
    setError("");
    setSuccess("");
  }

  /* ---- Mark as read ---- */
  async function markAsRead(id: string) {
    try {
      await fetch("/api/super-admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "read" }),
      });
      router.refresh();
    } catch {
      // silent
    }
  }

  /* ---- Update status ---- */
  async function handleStatusChange(status: string) {
    if (!selected || status === selected.status) return;

    setStatusUpdating(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update status.");
        return;
      }

      setNewStatus(status);
      setSelected({ ...selected, status: status as ContactSubmission["status"] });
      router.refresh();
      setSuccess("Status updated.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error updating status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  /* ---- Save admin notes ---- */
  async function handleSaveNotes() {
    if (!selected) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          admin_notes: adminNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save notes.");
        return;
      }

      setSelected({ ...selected, admin_notes: adminNotes });
      setSuccess("Notes saved.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error saving notes.");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Clear filters ---- */
  function clearFilters() {
    setFilterStatus("");
    setFilterType("");
  }

  const hasActiveFilters = filterStatus || filterType;

  return (
    <>
      {/* ---- Header ---- */}
      <div className="admin-header">
        <div>
          <h2>Inbox</h2>
          <p className="admin-header-sub">
            Contact form submissions and custom plan requests
          </p>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <div
        className="admin-stats"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Mail size={18} />
          </div>
          <div className="admin-stat-label">Total Submissions</div>
          <div className="admin-stat-value">{stats.total}</div>
        </div>
        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "rgba(59,130,246,0.1)",
              color: "var(--color-blue)",
            }}
          >
            <FileText size={18} />
          </div>
          <div className="admin-stat-label">New</div>
          <div className="admin-stat-value">{stats.newCount}</div>
        </div>
        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "rgba(245,158,11,0.1)",
              color: "var(--color-amber)",
            }}
          >
            <MailOpen size={18} />
          </div>
          <div className="admin-stat-label">Read</div>
          <div className="admin-stat-value">{stats.read}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Archive size={18} />
          </div>
          <div className="admin-stat-label">Archived</div>
          <div className="admin-stat-value">{stats.archived}</div>
        </div>
      </div>

      {/* ---- Feedback Messages ---- */}
      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      {/* ---- Filter Bar ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Filter size={16} style={{ color: "var(--muted)" }} />

        <select
          className="ticket-form-input"
          style={{
            width: "auto",
            minWidth: 140,
            padding: "6px 10px",
            fontSize: "0.82rem",
          }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
          <option value="archived">Archived</option>
        </select>

        <select
          className="ticket-form-input"
          style={{
            width: "auto",
            minWidth: 140,
            padding: "6px 10px",
            fontSize: "0.82rem",
          }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="contact">Contact</option>
          <option value="custom_plan">Custom Plan</option>
        </select>

        {hasActiveFilters && (
          <button
            className="sa-action-btn"
            onClick={clearFilters}
            style={{ fontSize: "0.78rem", padding: "5px 10px" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ---- Submissions Table ---- */}
      <div className="sa-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
        <table className="sa-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Subject / Message</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--muted)",
                  }}
                >
                  No submissions found.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    cursor: "pointer",
                    fontWeight: item.status === "new" ? 600 : 400,
                  }}
                  onClick={() => openDetail(item)}
                >
                  <td>
                    <span className={typeBadgeClass(item.type)}>
                      {item.type === "custom_plan" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Briefcase size={11} />
                          {typeLabel(item.type)}
                        </span>
                      ) : (
                        typeLabel(item.type)
                      )}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ fontSize: "0.82rem" }}>{item.email}</td>
                  <td style={{ fontSize: "0.82rem" }}>
                    {item.company_name || "--"}
                  </td>
                  <td style={{ fontSize: "0.82rem", maxWidth: 260 }}>
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.subject || item.message}
                    </div>
                  </td>
                  <td>
                    <span className={statusBadgeClass(item.status)}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(item.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Detail Modal ---- */}
      {selected && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 640,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className={typeBadgeClass(selected.type)}>
                    {typeLabel(selected.type)}
                  </span>
                  <span className={statusBadgeClass(newStatus || selected.status)}>
                    {statusLabel(newStatus || selected.status)}
                  </span>
                </div>
                <button className="ticket-modal-close" onClick={closeDetail}>
                  <X size={18} />
                </button>
              </div>

              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                {selected.subject || "Custom Plan Request"}
              </h3>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}
              >
                From {selected.name} ({selected.email})
                {selected.company_name && (
                  <> &middot; {selected.company_name}</>
                )}
                {" "}&middot; {formatDateTime(selected.created_at)}
              </div>
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                minHeight: 0,
              }}
            >
              {/* Contact details */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px 24px",
                  marginBottom: 20,
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 2,
                    }}
                  >
                    Name
                  </div>
                  <div>{selected.name}</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 2,
                    }}
                  >
                    Email
                  </div>
                  <div>{selected.email}</div>
                </div>
                {selected.phone && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 2,
                      }}
                    >
                      Phone
                    </div>
                    <div>{selected.phone}</div>
                  </div>
                )}
                {selected.company_name && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 2,
                      }}
                    >
                      Company
                    </div>
                    <div>{selected.company_name}</div>
                  </div>
                )}
                {selected.company_size && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 2,
                      }}
                    >
                      Company Size
                    </div>
                    <div>{selected.company_size} employees</div>
                  </div>
                )}
                {selected.budget_range && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 2,
                      }}
                    >
                      Budget Range
                    </div>
                    <div>{selected.budget_range}</div>
                  </div>
                )}
              </div>

              {/* Modules interested */}
              {selected.modules_interested &&
                selected.modules_interested.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 8,
                      }}
                    >
                      Modules Interested
                    </div>
                    <div
                      style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                    >
                      {selected.modules_interested.map((mod) => (
                        <span
                          key={mod}
                          className="sa-badge sa-badge-blue"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Message */}
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 8,
                  }}
                >
                  Message
                </div>
                <div
                  style={{
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    padding: "12px 16px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  {selected.message}
                </div>
              </div>

              {/* Status control */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Status
                  </label>
                  <select
                    className="ticket-form-input"
                    style={{
                      width: "auto",
                      minWidth: 130,
                      padding: "5px 8px",
                      fontSize: "0.8rem",
                    }}
                    value={newStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusUpdating}
                  >
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Admin notes */}
              <div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 8,
                  }}
                >
                  Admin Notes
                </div>
                <textarea
                  className="ticket-form-input"
                  placeholder="Add private notes about this submission..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    minHeight: 60,
                    marginBottom: 10,
                  }}
                />
                <button
                  className="sa-action-btn primary"
                  onClick={handleSaveNotes}
                  disabled={saving}
                  style={{ fontSize: "0.82rem" }}
                >
                  {saving ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
