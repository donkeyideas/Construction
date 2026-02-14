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
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

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

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "subject", label: "Subject", required: true },
  { key: "question", label: "Question", required: true },
  { key: "priority", label: "Priority", required: false },
  { key: "due_date", label: "Due Date", required: false, type: "date" },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { subject: "Footing depth clarification", question: "What is the required depth for the north footing?", priority: "high", due_date: "2026-02-01" },
];

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

  const [showImport, setShowImport] = useState(false);

  // Detail / Edit / Delete modal state
  const [selectedRfi, setSelectedRfi] = useState<Rfi | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "rfis", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // ---- Create handler ----
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

  // ---- Detail modal helpers ----
  function openDetail(rfi: Rfi) {
    setSelectedRfi(rfi);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function closeDetail() {
    setSelectedRfi(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function startEditing() {
    if (!selectedRfi) return;
    setIsEditing(true);
    setSaveError("");
    setEditData({
      subject: selectedRfi.subject,
      question: selectedRfi.question,
      answer: selectedRfi.answer ?? "",
      status: selectedRfi.status,
      priority: selectedRfi.priority ?? "medium",
      assigned_to: selectedRfi.assigned_to ?? "",
      due_date: selectedRfi.due_date ?? "",
      cost_impact: selectedRfi.cost_impact ?? "",
      schedule_impact_days: selectedRfi.schedule_impact_days ?? "",
    });
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError("");
    setEditData({});
  }

  // ---- Save (PATCH) handler ----
  async function handleSave() {
    if (!selectedRfi) return;
    setSaving(true);
    setSaveError("");

    try {
      const changes: Record<string, unknown> = { id: selectedRfi.id };

      if (editData.subject !== selectedRfi.subject) changes.subject = editData.subject;
      if (editData.question !== selectedRfi.question) changes.question = editData.question;
      if ((editData.answer ?? "") !== (selectedRfi.answer ?? "")) changes.answer = editData.answer || null;
      if (editData.status !== selectedRfi.status) changes.status = editData.status;
      if (editData.priority !== (selectedRfi.priority ?? "medium")) changes.priority = editData.priority;
      if ((editData.assigned_to ?? "") !== (selectedRfi.assigned_to ?? "")) changes.assigned_to = editData.assigned_to || null;
      if ((editData.due_date ?? "") !== (selectedRfi.due_date ?? "")) changes.due_date = editData.due_date || null;

      const costVal = editData.cost_impact === "" || editData.cost_impact === null ? null : Number(editData.cost_impact);
      if (costVal !== selectedRfi.cost_impact) changes.cost_impact = costVal;

      const schedVal = editData.schedule_impact_days === "" || editData.schedule_impact_days === null ? null : Number(editData.schedule_impact_days);
      if (schedVal !== selectedRfi.schedule_impact_days) changes.schedule_impact_days = schedVal;

      // Only call API if there are actual changes
      if (Object.keys(changes).length <= 1) {
        // No changes besides id
        setIsEditing(false);
        return;
      }

      const res = await fetch("/api/projects/rfis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update RFI");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update RFI"
      );
    } finally {
      setSaving(false);
    }
  }

  // ---- Delete handler ----
  async function handleDelete() {
    if (!selectedRfi) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/projects/rfis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedRfi.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete RFI");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to delete RFI"
      );
    } finally {
      setSaving(false);
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
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New RFI
          </button>
        </div>
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
                      onClick={() => openDetail(rfi)}
                      style={{ cursor: "pointer" }}
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

      {/* ================================================================= */}
      {/* Create RFI Modal                                                  */}
      {/* ================================================================= */}
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

      {/* ================================================================= */}
      {/* Detail / Edit / Delete Modal                                      */}
      {/* ================================================================= */}
      {selectedRfi && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            {/* Modal Header */}
            <div className="ticket-modal-header">
              <h3>
                {selectedRfi.rfi_number}
                {!isEditing && (
                  <span
                    className={statusBadge[selectedRfi.status] ?? "inv-status"}
                    style={{ marginLeft: 10, fontSize: "0.78rem" }}
                  >
                    {selectedRfi.status}
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button
                      className="ticket-modal-close"
                      onClick={startEditing}
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ticket-modal-close"
                      onClick={() => setShowDeleteConfirm(true)}
                      title="Delete"
                      style={{ color: "var(--color-red)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button className="ticket-modal-close" onClick={closeDetail}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {/* ---- Delete Confirmation ---- */}
            {showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <p style={{ marginBottom: 16, fontWeight: 500 }}>
                  Are you sure you want to delete RFI{" "}
                  <strong>{selectedRfi.rfi_number}</strong>? This action cannot
                  be undone.
                </p>
                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: "var(--color-red)" }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? "Deleting..." : "Delete RFI"}
                  </button>
                </div>
              </div>
            )}

            {/* ---- Edit Mode ---- */}
            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Subject</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={(editData.subject as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, subject: e.target.value })
                    }
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Question</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={(editData.question as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, question: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Answer</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={(editData.answer as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, answer: e.target.value })
                    }
                    rows={3}
                    placeholder="Provide an answer to this RFI..."
                  />
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Status</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.status as string) ?? "open"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Priority</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.priority as string) ?? "medium"}
                      onChange={(e) =>
                        setEditData({ ...editData, priority: e.target.value })
                      }
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Assigned To</label>
                    <select
                      className="ticket-form-select"
                      value={(editData.assigned_to as string) ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
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

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Due Date</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={(editData.due_date as string) ?? ""}
                      onChange={(e) =>
                        setEditData({ ...editData, due_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Cost Impact ($)</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={(editData.cost_impact as string | number) ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          cost_impact: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">
                      Schedule Impact (days)
                    </label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={
                        (editData.schedule_impact_days as string | number) ?? ""
                      }
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          schedule_impact_days: e.target.value,
                        })
                      }
                      placeholder="0"
                      step="1"
                    />
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ---- View Mode ---- */}
            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                {/* Subject & Project */}
                <div className="detail-group" style={{ marginBottom: 4 }}>
                  <label className="detail-label">Subject</label>
                  <div className="detail-value">{selectedRfi.subject}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Project</label>
                  <div className="detail-value">
                    {selectedRfi.projects
                      ? `${selectedRfi.projects.code} - ${selectedRfi.projects.name}`
                      : "--"}
                  </div>
                </div>

                {/* Question */}
                <div className="detail-section">
                  <div className="detail-section-title">Question</div>
                  <div className="detail-section-box">{selectedRfi.question}</div>
                </div>

                {/* Answer */}
                <div className="detail-section">
                  <div className="detail-section-title">Answer</div>
                  {selectedRfi.answer ? (
                    <div className="detail-section-box">{selectedRfi.answer}</div>
                  ) : (
                    <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.88rem" }}>
                      Not yet answered
                    </span>
                  )}
                </div>

                {/* Priority & Status */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Priority</label>
                    <div className="detail-value">
                      {selectedRfi.priority ? (
                        <span className={`badge ${priorityBadge[selectedRfi.priority] ?? "badge-blue"}`}>
                          {selectedRfi.priority}
                        </span>
                      ) : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Status</label>
                    <div className="detail-value">
                      <span className={statusBadge[selectedRfi.status] ?? "inv-status"}>
                        {selectedRfi.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submitted By & Assigned To */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Submitted By</label>
                    <div className="detail-value">
                      {selectedRfi.submitted_by ? userMap[selectedRfi.submitted_by] ?? "--" : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Assigned To</label>
                    <div className="detail-value">
                      {selectedRfi.assigned_to ? userMap[selectedRfi.assigned_to] ?? "--" : "--"}
                    </div>
                  </div>
                </div>

                {/* Due Date & Cost Impact */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Due Date</label>
                    <div className="detail-value">
                      {selectedRfi.due_date ? formatDate(selectedRfi.due_date) : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Cost Impact</label>
                    <div className="detail-value">
                      {selectedRfi.cost_impact != null ? formatCurrency(selectedRfi.cost_impact) : "--"}
                    </div>
                  </div>
                </div>

                {/* Schedule Impact & Created */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Schedule Impact</label>
                    <div className="detail-value">
                      {selectedRfi.schedule_impact_days != null
                        ? `${selectedRfi.schedule_impact_days} day${selectedRfi.schedule_impact_days !== 1 ? "s" : ""}`
                        : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Created</label>
                    <div className="detail-value">{formatDate(selectedRfi.created_at)}</div>
                  </div>
                </div>

                {selectedRfi.answered_at && (
                  <div className="detail-row">
                    <div className="detail-group">
                      <label className="detail-label">Answered At</label>
                      <div className="detail-value">{formatDate(selectedRfi.answered_at)}</div>
                    </div>
                  </div>
                )}

                {/* Footer actions */}
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeDetail}>
                    Close
                  </button>
                  <button type="button" className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} />
                    Edit RFI
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName="RFIs"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
