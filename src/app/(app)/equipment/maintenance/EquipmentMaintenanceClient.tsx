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
  Upload,
} from "lucide-react";
import type {
  MaintenanceLogRow,
  EquipmentRow,
  MaintenanceType,
  MaintenanceStatus,
} from "@/lib/queries/equipment";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

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

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "maintenance_type", label: "Type", required: false },
  { key: "description", label: "Description", required: false },
  { key: "maintenance_date", label: "Date", required: false, type: "date" },
  { key: "cost", label: "Cost ($)", required: false, type: "number" },
  { key: "performed_by", label: "Performed By", required: false },
  { key: "vendor_name", label: "Vendor", required: false },
  { key: "next_due_date", label: "Next Due Date", required: false, type: "date" },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Oil change - CAT 320", maintenance_type: "preventive", description: "Regular oil and filter change", maintenance_date: "2026-01-10", cost: "450", performed_by: "Fleet mechanic", vendor_name: "", next_due_date: "2026-04-10" },
];

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

  // Import modal state
  const [showImport, setShowImport] = useState(false);

  // Detail / Edit / Delete modal state
  const [selectedLog, setSelectedLog] = useState<MaintenanceLogRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Loading sample data
  const [loadingSamples, setLoadingSamples] = useState(false);

  async function loadSampleData() {
    if (equipmentList.length === 0) return;
    setLoadingSamples(true);
    try {
      const samples = [
        { equipment_id: equipmentList[0]?.id, title: "Oil & Filter Change", maintenance_type: "preventive", description: "Regular 250-hour oil and filter service", maintenance_date: "2026-01-10", cost: 450, performed_by: "Mike Rivera", vendor_name: "", status: "completed", next_due_date: "2026-04-10" },
        { equipment_id: equipmentList[Math.min(1, equipmentList.length - 1)]?.id, title: "Hydraulic System Inspection", maintenance_type: "inspection", description: "Check hydraulic lines, fittings, and fluid levels", maintenance_date: "2026-01-18", cost: 275, performed_by: "Fleet Team", vendor_name: "", status: "completed", next_due_date: "2026-07-18" },
        { equipment_id: equipmentList[0]?.id, title: "Track Tension Adjustment", maintenance_type: "corrective", description: "Tracks were loose, adjusted tension and inspected for wear", maintenance_date: "2026-02-01", cost: 180, performed_by: "Mike Rivera", vendor_name: "", status: "completed", next_due_date: "" },
        { equipment_id: equipmentList[Math.min(2, equipmentList.length - 1)]?.id, title: "Annual DOT Inspection", maintenance_type: "inspection", description: "Full Department of Transportation compliance inspection", maintenance_date: "2026-02-15", cost: 350, performed_by: "", vendor_name: "ABC Fleet Services", status: "completed", next_due_date: "2027-02-15" },
        { equipment_id: equipmentList[Math.min(1, equipmentList.length - 1)]?.id, title: "Boom Cylinder Seal Replacement", maintenance_type: "corrective", description: "Replaced leaking boom cylinder seals", maintenance_date: "2026-02-20", cost: 1250, performed_by: "", vendor_name: "Heavy Equipment Repair Co.", status: "completed", next_due_date: "" },
        { equipment_id: equipmentList[0]?.id, title: "Scheduled 500-Hour Service", maintenance_type: "preventive", description: "Comprehensive 500-hour service: oil, filters, belts, coolant", maintenance_date: "", cost: 850, performed_by: "Fleet Team", vendor_name: "", status: "scheduled", next_due_date: "2026-03-15" },
        { equipment_id: equipmentList[Math.min(2, equipmentList.length - 1)]?.id, title: "Brake Pad Replacement", maintenance_type: "preventive", description: "Replace front and rear brake pads", maintenance_date: "", cost: 600, performed_by: "", vendor_name: "ABC Fleet Services", status: "scheduled", next_due_date: "2026-03-20" },
        { equipment_id: equipmentList[Math.min(1, equipmentList.length - 1)]?.id, title: "Emergency Hydraulic Line Repair", maintenance_type: "emergency", description: "Burst hydraulic line on job site, emergency repair needed", maintenance_date: "2026-02-10", cost: 2100, performed_by: "", vendor_name: "24/7 Heavy Equipment Repair", status: "in_progress", next_due_date: "" },
      ];

      for (const sample of samples) {
        if (!sample.equipment_id) continue;
        await fetch("/api/equipment/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sample),
        });
      }
      router.refresh();
    } catch {
      // silent fail
    } finally {
      setLoadingSamples(false);
    }
  }

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

  // Import handler
  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "equipment_maintenance", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New Maintenance Log
          </button>
        </div>
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
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={16} />
                  New Maintenance Log
                </button>
                {equipmentList.length > 0 && (
                  <button
                    className="btn-secondary"
                    onClick={loadSampleData}
                    disabled={loadingSamples}
                  >
                    {loadingSamples ? "Loading..." : "Load Sample Data"}
                  </button>
                )}
              </div>
              {equipmentList.length === 0 && (
                <p style={{ fontSize: "0.82rem", marginTop: "8px" }}>
                  Add equipment in Inventory first, then come back to add maintenance logs.
                </p>
              )}
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
              <div style={{ padding: "1.25rem", pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Equipment</label>
                    <div className="detail-value">{selectedLog.equipment?.name || "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Type</label>
                    <div className="detail-value">
                      {MAINTENANCE_TYPE_LABELS[
                        selectedLog.maintenance_type as MaintenanceType
                      ] ?? selectedLog.maintenance_type}
                    </div>
                  </div>
                </div>

                <div className="detail-group">
                  <label className="detail-label">Title</label>
                  <div className="detail-value">{selectedLog.title}</div>
                </div>

                {selectedLog.description && (
                  <div className="detail-group">
                    <label className="detail-label">Description</label>
                    <div className="detail-value--multiline">{selectedLog.description}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Date</label>
                    <div className="detail-value">{formatDate(selectedLog.maintenance_date)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Status</label>
                    <div className="detail-value">
                      {MAINTENANCE_STATUS_LABELS[
                        selectedLog.status as MaintenanceStatus
                      ] ?? selectedLog.status}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Cost</label>
                    <div className="detail-value">{formatCurrency(selectedLog.cost)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Performed By</label>
                    <div className="detail-value">{selectedLog.performed_by || "--"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Vendor</label>
                    <div className="detail-value">{selectedLog.vendor_name || "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Next Due</label>
                    <div className="detail-value">{formatDate(selectedLog.next_due_date)}</div>
                  </div>
                </div>

                <div className="ticket-form-actions">
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

      {showImport && (
        <ImportModal
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          entityName="Equipment Maintenance"
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
