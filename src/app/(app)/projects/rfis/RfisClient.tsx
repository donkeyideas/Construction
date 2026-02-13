"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquareMore,
  AlertCircle,
  Hash,
  CircleDot,
  CheckCircle2,
  MessageCircle,
  Plus,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Rfi {
  id: string;
  rfi_number: string;
  subject: string;
  question: string;
  answer: string | null;
  status: string;
  priority: string | null;
  submitted_by: string | null;
  assigned_to: string | null;
  due_date: string | null;
  answered_at: string | null;
  cost_impact: number | null;
  schedule_impact_days: number | null;
  created_at: string;
  projects: { name: string; code: string } | null;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface CompanyMember {
  user_id: string;
  role: string;
  user: { full_name: string | null; email: string | null } | null;
}

interface KpiData {
  totalCount: number;
  openCount: number;
  answeredCount: number;
  closedCount: number;
}

interface RfisClientProps {
  rows: Rfi[];
  kpi: KpiData;
  userMap: Record<string, string>;
  projects: Project[];
  members: CompanyMember[];
  activeStatus: string | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const priorityBadge: Record<string, string> = {
  high: "badge-red",
  medium: "badge-amber",
  low: "badge-green",
  urgent: "badge-red",
};

const statusBadge: Record<string, string> = {
  open: "inv-status inv-status-pending",
  answered: "inv-status inv-status-approved",
  closed: "inv-status inv-status-paid",
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statuses = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Answered", value: "answered" },
  { label: "Closed", value: "closed" },
];

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/rfis";
  return `/projects/rfis?status=${status}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RfisClient({
  rows,
  kpi,
  userMap,
  projects,
  members,
  activeStatus,
}: RfisClientProps) {
  const router = useRouter();
  const now = new Date();

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    project_id: "",
    subject: "",
    question: "",
    priority: "medium",
    due_date: "",
    assigned_to: "",
  });

  function daysOpen(
    createdAt: string,
    status: string,
    answeredAt: string | null
  ): number {
    const start = new Date(createdAt);
    const end =
      status === "closed" && answeredAt ? new Date(answeredAt) : now;
    return Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < now;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/projects/rfis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id,
          subject: formData.subject,
          question: formData.question,
          priority: formData.priority || "medium",
          due_date: formData.due_date || undefined,
          assigned_to: formData.assigned_to || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create RFI");
      }

      // Reset form and close modal
      setFormData({
        project_id: "",
        subject: "",
        question: "",
        priority: "medium",
        due_date: "",
        assigned_to: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create RFI"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Requests for Information</h2>
          <p className="fin-header-sub">
            Create, track, and respond to RFIs across all projects
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New RFI
        </button>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">Total RFIs</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <CircleDot size={18} />
          </div>
          <span className="fin-kpi-label">Open</span>
          <span className="fin-kpi-value">{kpi.openCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <MessageCircle size={18} />
          </div>
          <span className="fin-kpi-label">Answered</span>
          <span className="fin-kpi-value">{kpi.answeredCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">Closed</span>
          <span className="fin-kpi-value">{kpi.closedCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            fontWeight: 500,
          }}
        >
          Status:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value || (!activeStatus && s.value === "all")
                ? "ui-btn-primary"
                : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {rows.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>RFI #</th>
                  <th>Subject</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Submitted By</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "right" }}>Days Open</th>
                  <th style={{ textAlign: "right" }}>Cost Impact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rfi) => {
                  const project = rfi.projects;
                  const overdue =
                    rfi.status === "open" && isOverdue(rfi.due_date);
                  const days = daysOpen(
                    rfi.created_at,
                    rfi.status,
                    rfi.answered_at
                  );

                  return (
                    <tr
                      key={rfi.id}
                      className={overdue ? "invoice-row-overdue" : ""}
                    >
                      <td
                        style={{
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rfi.rfi_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {rfi.subject}
                        </div>
                        {rfi.answer && (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--muted)",
                              marginTop: 2,
                              maxWidth: 300,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            A: {rfi.answer}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {project ? (
                          <span style={{ color: "var(--muted)" }}>
                            <strong>{project.code}</strong>
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td>
                        {rfi.priority ? (
                          <span
                            className={`badge ${
                              priorityBadge[rfi.priority] ?? "badge-blue"
                            }`}
                          >
                            {rfi.priority}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {rfi.submitted_by
                          ? userMap[rfi.submitted_by] ?? "--"
                          : "--"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {rfi.assigned_to
                          ? userMap[rfi.assigned_to] ?? "--"
                          : "--"}
                      </td>
                      <td>
                        {rfi.due_date ? (
                          <span
                            style={{
                              color: overdue
                                ? "var(--color-red)"
                                : "var(--text)",
                              fontWeight: overdue ? 600 : 400,
                            }}
                          >
                            {new Date(rfi.due_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                            {overdue && (
                              <AlertCircle
                                size={12}
                                style={{
                                  marginLeft: 4,
                                  verticalAlign: "middle",
                                }}
                              />
                            )}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        <span
                          style={{
                            color:
                              days > 14
                                ? "var(--color-red)"
                                : days > 7
                                ? "var(--color-amber)"
                                : "var(--text)",
                            fontWeight: days > 14 ? 600 : 400,
                          }}
                        >
                          {days}d
                        </span>
                      </td>
                      <td className="amount-col">
                        {rfi.cost_impact != null
                          ? formatCurrency(rfi.cost_impact)
                          : "--"}
                      </td>
                      <td>
                        <span
                          className={
                            statusBadge[rfi.status] ?? "inv-status"
                          }
                        >
                          {rfi.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <MessageSquareMore size={48} />
            </div>
            <div className="fin-empty-title">No RFIs Found</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? "No RFIs match the current filter. Try selecting a different status."
                : "No RFIs have been created yet. RFIs will appear here once submitted."}
            </div>
          </div>
        </div>
      )}

      {/* Create RFI Modal */}
      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>Create New RFI</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="ticket-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">Project *</label>
                <select
                  className="ticket-form-select"
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ` : ""}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Subject *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subject: e.target.value,
                    })
                  }
                  placeholder="Brief subject of the RFI"
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Question *</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      question: e.target.value,
                    })
                  }
                  placeholder="Describe the information you need..."
                  rows={4}
                  required
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Priority</label>
                  <select
                    className="ticket-form-select"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value,
                      })
                    }
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Due Date</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        due_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Assigned To</label>
                <select
                  className="ticket-form-select"
                  value={formData.assigned_to}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assigned_to: e.target.value,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.full_name || m.user?.email || "Unknown"} (
                      {m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    creating ||
                    !formData.subject.trim() ||
                    !formData.question.trim() ||
                    !formData.project_id
                  }
                >
                  {creating ? "Creating..." : "Create RFI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
