"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileEdit,
  Hash,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  X,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangeOrder {
  id: string;
  co_number: string;
  title: string;
  description: string | null;
  status: string;
  reason: string | null;
  amount: number | null;
  schedule_impact_days: number | null;
  requested_by: string | null;
  approved_by: string | null;
  created_at: string;
  projects: { name: string; code: string } | null;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface KpiData {
  totalCount: number;
  pendingValue: number;
  approvedValue: number;
  awaitingApproval: number;
}

interface ChangeOrdersClientProps {
  rows: ChangeOrder[];
  kpi: KpiData;
  userMap: Record<string, string>;
  projects: Project[];
  activeStatus: string | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<string, string> = {
  owner_request: "Owner Request",
  design_change: "Design Change",
  unforeseen_condition: "Unforeseen",
  value_engineering: "Value Eng.",
  scope_change: "Scope Change",
  design_error: "Design Error",
  site_condition: "Site Condition",
  other: "Other",
};

const REASON_BADGE: Record<string, string> = {
  owner_request: "badge-blue",
  design_change: "badge-amber",
  unforeseen_condition: "badge-red",
  value_engineering: "badge-green",
  scope_change: "badge-blue",
  design_error: "badge-amber",
  site_condition: "badge-red",
  other: "badge-blue",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "inv-status inv-status-draft",
  submitted: "inv-status inv-status-pending",
  approved: "inv-status inv-status-approved",
  rejected: "inv-status inv-status-voided",
};

const REASON_OPTIONS = [
  { value: "scope_change", label: "Scope Change" },
  { value: "design_error", label: "Design Error" },
  { value: "site_condition", label: "Site Condition" },
  { value: "owner_request", label: "Owner Request" },
  { value: "value_engineering", label: "Value Engineering" },
  { value: "design_change", label: "Design Change" },
  { value: "unforeseen_condition", label: "Unforeseen Condition" },
  { value: "other", label: "Other" },
];

const statuses = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/change-orders";
  return `/projects/change-orders?status=${status}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChangeOrdersClient({
  rows,
  kpi,
  userMap,
  projects,
  activeStatus,
}: ChangeOrdersClientProps) {
  const router = useRouter();

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    reason: "",
    amount: "",
    schedule_impact_days: "",
  });

  // Detail / Edit / Delete modal state
  const [selectedCo, setSelectedCo] = useState<ChangeOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ------- Handlers -------

  function openDetail(co: ChangeOrder) {
    setSelectedCo(co);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
  }

  function closeDetail() {
    setSelectedCo(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditData({});
    setSaveError("");
  }

  function startEditing() {
    if (!selectedCo) return;
    setEditData({
      title: selectedCo.title,
      description: selectedCo.description || "",
      reason: selectedCo.reason || "",
      status: selectedCo.status,
      amount: selectedCo.amount != null ? String(selectedCo.amount) : "",
      schedule_impact_days:
        selectedCo.schedule_impact_days != null
          ? String(selectedCo.schedule_impact_days)
          : "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedCo) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = { id: selectedCo.id };

      if (editData.title !== undefined) payload.title = editData.title;
      if (editData.description !== undefined)
        payload.description = editData.description;
      if (editData.reason !== undefined) payload.reason = editData.reason;
      if (editData.status !== undefined) payload.status = editData.status;
      if (editData.amount !== undefined && editData.amount !== "")
        payload.amount = Number(editData.amount);
      if (editData.schedule_impact_days !== undefined && editData.schedule_impact_days !== "")
        payload.schedule_impact_days = Number(editData.schedule_impact_days);

      const res = await fetch("/api/projects/change-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update change order");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update change order"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCo) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/projects/change-orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCo.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete change order");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to delete change order"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/projects/change-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id,
          title: formData.title,
          description: formData.description || undefined,
          reason: formData.reason || undefined,
          amount: formData.amount !== "" ? Number(formData.amount) : 0,
          schedule_impact_days:
            formData.schedule_impact_days !== ""
              ? Number(formData.schedule_impact_days)
              : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create change order");
      }

      // Reset form and close modal
      setFormData({
        project_id: "",
        title: "",
        description: "",
        reason: "",
        amount: "",
        schedule_impact_days: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create change order"
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
          <h2>Change Orders</h2>
          <p className="fin-header-sub">
            Track scope changes, cost impact, and schedule adjustments
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Change Order
        </button>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">Total COs</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Pending Value</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(kpi.pendingValue)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">Approved Value</span>
          <span className="fin-kpi-value positive">
            {formatCompactCurrency(kpi.approvedValue)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Awaiting Approval</span>
          <span className="fin-kpi-value">{kpi.awaitingApproval}</span>
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
                  <th>CO #</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Reason</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Schedule Impact</th>
                  <th>Requested By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((co) => {
                  const project = co.projects;
                  const amount = co.amount;
                  const isNegative = amount != null && amount < 0;
                  const isLarge = amount != null && amount > 100000;

                  return (
                    <tr
                      key={co.id}
                      onClick={() => openDetail(co)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {co.co_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{co.title}</div>
                        {co.description && (
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
                            {co.description}
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
                        {co.reason ? (
                          <span
                            className={`badge ${
                              REASON_BADGE[co.reason] ?? "badge-blue"
                            }`}
                          >
                            {REASON_LABELS[co.reason] ?? co.reason}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        {amount != null ? (
                          <span
                            style={{
                              color: isNegative
                                ? "var(--color-green)"
                                : isLarge
                                ? "var(--color-red)"
                                : "var(--text)",
                              fontWeight:
                                isNegative || isLarge ? 600 : 400,
                            }}
                          >
                            {formatCurrency(amount)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        {co.schedule_impact_days != null ? (
                          <span
                            style={{
                              color:
                                co.schedule_impact_days > 0
                                  ? "var(--color-red)"
                                  : co.schedule_impact_days < 0
                                  ? "var(--color-green)"
                                  : "var(--text)",
                              fontWeight:
                                co.schedule_impact_days !== 0 ? 600 : 400,
                            }}
                          >
                            {co.schedule_impact_days > 0 ? "+" : ""}
                            {co.schedule_impact_days}d
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {co.requested_by
                          ? userMap[co.requested_by] ?? "--"
                          : "--"}
                      </td>
                      <td>
                        <span
                          className={
                            STATUS_BADGE[co.status] ?? "inv-status"
                          }
                        >
                          {co.status}
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
              <FileEdit size={48} />
            </div>
            <div className="fin-empty-title">No Change Orders Found</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? "No change orders match the current filter. Try selecting a different status."
                : "No change orders have been created yet. They will appear here once submitted."}
            </div>
          </div>
        </div>
      )}

      {/* Create Change Order Modal */}
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
              <h3>Create New Change Order</h3>
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
                    setFormData({ ...formData, project_id: e.target.value })
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
                <label className="ticket-form-label">Title *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of the change"
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Detailed description of the change order..."
                  rows={3}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Reason</label>
                <select
                  className="ticket-form-select"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                >
                  <option value="">Select reason...</option>
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    Cost Impact ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="ticket-form-input"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00 (negative for savings)"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    Schedule Impact (days)
                  </label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.schedule_impact_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        schedule_impact_days: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
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
                    !formData.title.trim() ||
                    !formData.project_id
                  }
                >
                  {creating ? "Creating..." : "Create Change Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedCo && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>
                {showDeleteConfirm
                  ? "Delete Change Order"
                  : isEditing
                  ? "Edit Change Order"
                  : `Change Order ${selectedCo.co_number}`}
              </h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {/* ---------- Delete Confirmation ---------- */}
            {showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <p style={{ marginBottom: "1.25rem", fontSize: "0.92rem" }}>
                  Are you sure you want to delete change order{" "}
                  <strong>{selectedCo.co_number}</strong>? This action cannot
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
                    style={{ background: "var(--color-red)", borderColor: "var(--color-red)" }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}

            {/* ---------- Edit Mode ---------- */}
            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={(editData.title as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Description</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={(editData.description as string) ?? ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Reason</label>
                  <select
                    className="ticket-form-select"
                    value={(editData.reason as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, reason: e.target.value })
                    }
                  >
                    <option value="">Select reason...</option>
                    {REASON_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Status</label>
                  <select
                    className="ticket-form-select"
                    value={(editData.status as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">
                      Cost Impact ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="ticket-form-input"
                      value={(editData.amount as string) ?? ""}
                      onChange={(e) =>
                        setEditData({ ...editData, amount: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">
                      Schedule Impact (days)
                    </label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={(editData.schedule_impact_days as string) ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          schedule_impact_days: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditing(false)}
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

            {/* ---------- View Mode ---------- */}
            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label className="ticket-form-label">CO Number</label>
                    <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                      {selectedCo.co_number}
                    </div>
                  </div>
                  <div>
                    <label className="ticket-form-label">Status</label>
                    <div>
                      <span
                        className={
                          STATUS_BADGE[selectedCo.status] ?? "inv-status"
                        }
                      >
                        {selectedCo.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title</label>
                  <div style={{ fontSize: "0.92rem" }}>
                    {selectedCo.title}
                  </div>
                </div>

                {selectedCo.description && (
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Description</label>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        color: "var(--muted)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedCo.description}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label className="ticket-form-label">Project</label>
                    <div style={{ fontSize: "0.88rem" }}>
                      {selectedCo.projects
                        ? `${selectedCo.projects.code} - ${selectedCo.projects.name}`
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <label className="ticket-form-label">Reason</label>
                    <div>
                      {selectedCo.reason ? (
                        <span
                          className={`badge ${
                            REASON_BADGE[selectedCo.reason] ?? "badge-blue"
                          }`}
                        >
                          {REASON_LABELS[selectedCo.reason] ??
                            selectedCo.reason}
                        </span>
                      ) : (
                        "--"
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label className="ticket-form-label">Amount</label>
                    <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                      {selectedCo.amount != null
                        ? formatCurrency(selectedCo.amount)
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <label className="ticket-form-label">
                      Schedule Impact
                    </label>
                    <div style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                      {selectedCo.schedule_impact_days != null
                        ? `${selectedCo.schedule_impact_days > 0 ? "+" : ""}${selectedCo.schedule_impact_days} days`
                        : "--"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <label className="ticket-form-label">Requested By</label>
                    <div style={{ fontSize: "0.88rem" }}>
                      {selectedCo.requested_by
                        ? userMap[selectedCo.requested_by] ?? "--"
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <label className="ticket-form-label">Approved By</label>
                    <div style={{ fontSize: "0.88rem" }}>
                      {selectedCo.approved_by
                        ? userMap[selectedCo.approved_by] ?? "--"
                        : "--"}
                    </div>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-red)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
