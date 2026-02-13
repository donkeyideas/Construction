"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Wrench,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Edit3,
  Trash2,
} from "lucide-react";
import type {
  MaintenanceLogRow,
  EquipmentRow,
  MaintenanceType,
  MaintenanceStatus,
} from "@/lib/queries/equipment";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: "Preventive",
  corrective: "Corrective",
  inspection: "Inspection",
  emergency: "Emergency",
};

const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EquipmentMaintenanceClientProps {
  logs: MaintenanceLogRow[];
  equipmentList: EquipmentRow[];
  userId: string;
  companyId: string;
}

export default function EquipmentMaintenanceClient({
  logs,
  equipmentList,
  userId,
  companyId,
}: EquipmentMaintenanceClientProps) {
  const router = useRouter();

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    equipment_id: "",
    maintenance_type: "" as string,
    title: "",
    description: "",
    maintenance_date: "",
    cost: "",
    performed_by: "",
    vendor_name: "",
    status: "scheduled",
    next_due_date: "",
  });

  // Detail / Edit / Delete modal state
  const [selectedLog, setSelectedLog] = useState<MaintenanceLogRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Counts
  const scheduledCount = logs.filter((l) => l.status === "scheduled").length;
  const inProgressCount = logs.filter((l) => l.status === "in_progress").length;
  const completedCount = logs.filter((l) => l.status === "completed").length;

  // Filtered logs
  const filtered = useMemo(() => {
    let result = logs;

    if (typeFilter !== "all") {
      result = result.filter((l) => l.maintenance_type === typeFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (equipmentFilter !== "all") {
      result = result.filter((l) => l.equipment_id === equipmentFilter);
    }

    return result;
  }, [logs, typeFilter, statusFilter, equipmentFilter]);

  // Create handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/equipment/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: formData.equipment_id,
          maintenance_type: formData.maintenance_type,
          title: formData.title,
          description: formData.description || undefined,
          maintenance_date: formData.maintenance_date || undefined,
          cost: formData.cost ? Number(formData.cost) : undefined,
          performed_by: formData.performed_by || undefined,
          vendor_name: formData.vendor_name || undefined,
          status: formData.status,
          next_due_date: formData.next_due_date || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create maintenance log");
      }

      setFormData({
        equipment_id: "",
        maintenance_type: "",
        title: "",
        description: "",
        maintenance_date: "",
        cost: "",
        performed_by: "",
        vendor_name: "",
        status: "scheduled",
        next_due_date: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create maintenance log"
      );
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(log: MaintenanceLogRow) {
    setSelectedLog(log);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedLog(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedLog) return;
    setEditData({
      title: selectedLog.title,
      description: selectedLog.description || "",
      maintenance_type: selectedLog.maintenance_type,
      maintenance_date: selectedLog.maintenance_date || "",
      cost: selectedLog.cost ?? "",
      performed_by: selectedLog.performed_by || "",
      vendor_name: selectedLog.vendor_name || "",
      status: selectedLog.status,
      next_due_date: selectedLog.next_due_date || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  // Cancel edit
  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  // Save edits
  async function handleSave() {
    if (!selectedLog) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.title !== selectedLog.title) payload.title = editData.title;
      if (editData.description !== (selectedLog.description || ""))
        payload.description = editData.description || null;
      if (editData.maintenance_type !== selectedLog.maintenance_type)
        payload.maintenance_type = editData.maintenance_type;
      if (editData.maintenance_date !== (selectedLog.maintenance_date || ""))
        payload.maintenance_date = editData.maintenance_date || null;
      if (String(editData.cost) !== String(selectedLog.cost ?? ""))
        payload.cost = editData.cost ? Number(editData.cost) : null;
      if (editData.performed_by !== (selectedLog.performed_by || ""))
        payload.performed_by = editData.performed_by || null;
      if (editData.vendor_name !== (selectedLog.vendor_name || ""))
        payload.vendor_name = editData.vendor_name || null;
      if (editData.status !== selectedLog.status)
        payload.status = editData.status;
      if (editData.next_due_date !== (selectedLog.next_due_date || ""))
        payload.next_due_date = editData.next_due_date || null;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/equipment/maintenance/${selectedLog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update maintenance log");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update maintenance log"
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete handler
  async function handleDelete() {
    if (!selectedLog) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/equipment/maintenance/${selectedLog.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete maintenance log");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to delete maintenance log"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h2>Equipment Maintenance</h2>
          <p className="equipment-header-sub">
            {logs.length} maintenance record{logs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Maintenance Log
        </button>
      </div>

      {/* KPI Stats */}
      <div className="equipment-stats">
        <div className="equipment-stat-card stat-in-use">
          <div className="equipment-stat-icon">
            <Clock size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{scheduledCount}</span>
            <span className="equipment-stat-label">Scheduled</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-maintenance">
          <div className="equipment-stat-icon">
            <Wrench size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{inProgressCount}</span>
            <span className="equipment-stat-label">In Progress</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{completedCount}</span>
            <span className="equipment-stat-label">Completed</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-retired">
          <div className="equipment-stat-icon">
            <Settings size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{logs.length}</span>
            <span className="equipment-stat-label">Total Records</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="equipment-filters">
        <select
          className="equipment-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map((t) => (
            <option key={t} value={t}>
              {MAINTENANCE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          className="equipment-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          {(Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]).map(
            (s) => (
              <option key={s} value={s}>
                {MAINTENANCE_STATUS_LABELS[s]}
              </option>
            )
          )}
        </select>

        <select
          className="equipment-filter-select"
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value)}
        >
          <option value="all">All Equipment</option>
          {equipmentList.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="equipment-empty">
          <div className="equipment-empty-icon">
            <Wrench size={28} />
          </div>
          {logs.length === 0 ? (
            <>
              <h3>No maintenance records yet</h3>
              <p>Create your first maintenance log to get started.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                New Maintenance Log
              </button>
            </>
          ) : (
            <>
              <h3>No matching records</h3>
              <p>Try adjusting your filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="equipment-table-wrap">
          <table className="equipment-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Type</th>
                <th>Title</th>
                <th>Date</th>
                <th>Cost</th>
                <th>Performed By</th>
                <th>Status</th>
                <th>Next Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => openDetail(log)}
                  className="equipment-table-row"
                >
                  <td className="equipment-name-cell">
                    {log.equipment?.name || "--"}
                  </td>
                  <td className="equipment-type-cell">
                    <span
                      className={`equipment-maint-type-badge maint-${log.maintenance_type}`}
                    >
                      {MAINTENANCE_TYPE_LABELS[
                        log.maintenance_type as MaintenanceType
                      ] ?? log.maintenance_type}
                    </span>
                  </td>
                  <td className="equipment-title-cell">{log.title}</td>
                  <td className="equipment-date-cell">
                    {formatDateShort(log.maintenance_date)}
                  </td>
                  <td className="equipment-cost-cell">
                    {formatCurrency(log.cost)}
                  </td>
                  <td className="equipment-assignee-cell">
                    {log.performed_by || "--"}
                  </td>
                  <td>
                    <span
                      className={`equipment-status-badge status-${
                        log.status === "completed"
                          ? "available"
                          : log.status === "in_progress"
                          ? "in_use"
                          : log.status === "scheduled"
                          ? "maintenance"
                          : "retired"
                      }`}
                    >
                      {MAINTENANCE_STATUS_LABELS[
                        log.status as MaintenanceStatus
                      ] ?? log.status}
                    </span>
                  </td>
                  <td className="equipment-date-cell">
                    {formatDateShort(log.next_due_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Maintenance Modal */}
      {showCreate && (
        <div
          className="equipment-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>New Maintenance Log</h3>
              <button
                className="equipment-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="equipment-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="equipment-form">
              <div className="equipment-form-group">
                <label className="equipment-form-label">Equipment *</label>
                <select
                  className="equipment-form-select"
                  value={formData.equipment_id}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select equipment...</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.equipment_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">
                    Maintenance Type *
                  </label>
                  <select
                    className="equipment-form-select"
                    value={formData.maintenance_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maintenance_type: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select type...</option>
                    {(
                      Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]
                    ).map((t) => (
                      <option key={t} value={t}>
                        {MAINTENANCE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Status</label>
                  <select
                    className="equipment-form-select"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    {(
                      Object.keys(
                        MAINTENANCE_STATUS_LABELS
                      ) as MaintenanceStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {MAINTENANCE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Title *</label>
                <input
                  type="text"
                  className="equipment-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of the maintenance"
                  required
                />
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Description</label>
                <textarea
                  className="equipment-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed notes about the maintenance..."
                  rows={3}
                />
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">
                    Maintenance Date
                  </label>
                  <input
                    type="date"
                    className="equipment-form-input"
                    value={formData.maintenance_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maintenance_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Cost ($)</label>
                  <input
                    type="number"
                    className="equipment-form-input"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Performed By</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.performed_by}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        performed_by: e.target.value,
                      })
                    }
                    placeholder="Technician / team"
                  />
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Vendor Name</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.vendor_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        vendor_name: e.target.value,
                      })
                    }
                    placeholder="Service provider"
                  />
                </div>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Next Due Date</label>
                <input
                  type="date"
                  className="equipment-form-input"
                  value={formData.next_due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, next_due_date: e.target.value })
                  }
                />
              </div>

              <div className="equipment-form-actions">
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
                    !formData.equipment_id ||
                    !formData.maintenance_type ||
                    !formData.title.trim()
                  }
                >
                  {creating ? "Creating..." : "Create Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedLog && (
        <div className="equipment-modal-overlay" onClick={closeDetail}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>{isEditing ? "Edit Maintenance Log" : selectedLog.title}</h3>
              <button className="equipment-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="equipment-form-error">{saveError}</div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div
                className="equipment-modal-overlay"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  borderRadius: "inherit",
                }}
              >
                <div
                  className="equipment-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 440 }}
                >
                  <div className="equipment-modal-header">
                    <h3>Delete Maintenance Log</h3>
                    <button
                      className="equipment-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      Are you sure you want to delete{" "}
                      <strong>{selectedLog.title}</strong>? This action cannot be
                      undone.
                    </p>
                  </div>
                  <div className="equipment-form-actions">
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
                      style={{
                        backgroundColor: "var(--color-danger, #dc2626)",
                      }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only detail */}
            {!isEditing && (
              <div
                className="equipment-form"
                style={{
                  pointerEvents: showDeleteConfirm ? "none" : "auto",
                }}
              >
                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Equipment</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {selectedLog.equipment?.name || "--"}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Type</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {MAINTENANCE_TYPE_LABELS[
                        selectedLog.maintenance_type as MaintenanceType
                      ] ?? selectedLog.maintenance_type}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-group">
                  <label className="equipment-form-label">Title</label>
                  <div
                    className="equipment-form-input"
                    style={{
                      background: "var(--surface)",
                      cursor: "default",
                    }}
                  >
                    {selectedLog.title}
                  </div>
                </div>

                <div className="equipment-form-group">
                  <label className="equipment-form-label">Description</label>
                  <div
                    className="equipment-form-textarea"
                    style={{
                      background: "var(--surface)",
                      cursor: "default",
                      minHeight: 60,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedLog.description || "--"}
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Date</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {formatDate(selectedLog.maintenance_date)}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Status</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {MAINTENANCE_STATUS_LABELS[
                        selectedLog.status as MaintenanceStatus
                      ] ?? selectedLog.status}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Cost</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {formatCurrency(selectedLog.cost)}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Performed By</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {selectedLog.performed_by || "--"}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Vendor</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {selectedLog.vendor_name || "--"}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Next Due</label>
                    <div
                      className="equipment-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {formatDate(selectedLog.next_due_date)}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-danger, #dc2626)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
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
                    <Edit3 size={16} />
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Edit view */}
            {isEditing && (
              <div className="equipment-form">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Title *</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={(editData.title as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="equipment-form-group">
                  <label className="equipment-form-label">Description</label>
                  <textarea
                    className="equipment-form-textarea"
                    value={(editData.description as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">
                      Maintenance Type
                    </label>
                    <select
                      className="equipment-form-select"
                      value={(editData.maintenance_type as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          maintenance_type: e.target.value,
                        })
                      }
                    >
                      {(
                        Object.keys(
                          MAINTENANCE_TYPE_LABELS
                        ) as MaintenanceType[]
                      ).map((t) => (
                        <option key={t} value={t}>
                          {MAINTENANCE_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Status</label>
                    <select
                      className="equipment-form-select"
                      value={(editData.status as string) || "scheduled"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {(
                        Object.keys(
                          MAINTENANCE_STATUS_LABELS
                        ) as MaintenanceStatus[]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {MAINTENANCE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">
                      Maintenance Date
                    </label>
                    <input
                      type="date"
                      className="equipment-form-input"
                      value={(editData.maintenance_date as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          maintenance_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Cost ($)</label>
                    <input
                      type="number"
                      className="equipment-form-input"
                      value={String(editData.cost ?? "")}
                      onChange={(e) =>
                        setEditData({ ...editData, cost: e.target.value })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Performed By</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.performed_by as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          performed_by: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Vendor Name</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.vendor_name as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          vendor_name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="equipment-form-group">
                  <label className="equipment-form-label">Next Due Date</label>
                  <input
                    type="date"
                    className="equipment-form-input"
                    value={(editData.next_due_date as string) || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        next_due_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="equipment-form-actions">
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
                    disabled={saving || !(editData.title as string)?.trim()}
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
