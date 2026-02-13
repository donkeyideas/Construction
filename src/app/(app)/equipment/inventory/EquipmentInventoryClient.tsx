"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  Package,
  CheckCircle2,
  Clock,
  Wrench,
  Archive,
  Edit3,
  Trash2,
} from "lucide-react";
import type {
  EquipmentRow,
  EquipmentStats,
  EquipmentStatus,
  EquipmentType,
} from "@/lib/queries/equipment";
import type { CompanyMember } from "@/lib/queries/tickets";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Maintenance",
  retired: "Retired",
};

const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: "excavator", label: "Excavator" },
  { value: "loader", label: "Loader" },
  { value: "crane", label: "Crane" },
  { value: "truck", label: "Truck" },
  { value: "generator", label: "Generator" },
  { value: "compressor", label: "Compressor" },
  { value: "scaffold", label: "Scaffold" },
  { value: "tools", label: "Tools" },
  { value: "other", label: "Other" },
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

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "--";
  return user.full_name || user.email || "Unknown";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EquipmentInventoryClientProps {
  equipment: EquipmentRow[];
  stats: EquipmentStats;
  members: CompanyMember[];
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
}

export default function EquipmentInventoryClient({
  equipment,
  stats,
  members,
  projects,
  userId,
  companyId,
}: EquipmentInventoryClientProps) {
  const router = useRouter();

  // Filters
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    equipment_type: "" as string,
    make: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_cost: "",
    hourly_rate: "",
  });

  // Detail / Edit / Delete modal state
  const [selectedItem, setSelectedItem] = useState<EquipmentRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filtered equipment
  const filtered = useMemo(() => {
    let result = equipment;

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((e) => e.equipment_type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          (e.make && e.make.toLowerCase().includes(term)) ||
          (e.model && e.model.toLowerCase().includes(term)) ||
          (e.serial_number && e.serial_number.toLowerCase().includes(term))
      );
    }

    return result;
  }, [equipment, statusFilter, typeFilter, search]);

  // Create handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          equipment_type: formData.equipment_type,
          make: formData.make || undefined,
          model: formData.model || undefined,
          serial_number: formData.serial_number || undefined,
          purchase_date: formData.purchase_date || undefined,
          purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : undefined,
          hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create equipment");
      }

      setFormData({
        name: "",
        equipment_type: "",
        make: "",
        model: "",
        serial_number: "",
        purchase_date: "",
        purchase_cost: "",
        hourly_rate: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create equipment");
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(item: EquipmentRow) {
    setSelectedItem(item);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedItem(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedItem) return;
    setEditData({
      name: selectedItem.name,
      equipment_type: selectedItem.equipment_type,
      make: selectedItem.make || "",
      model: selectedItem.model || "",
      serial_number: selectedItem.serial_number || "",
      status: selectedItem.status,
      purchase_date: selectedItem.purchase_date || "",
      purchase_cost: selectedItem.purchase_cost ?? "",
      hourly_rate: selectedItem.hourly_rate ?? "",
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
    if (!selectedItem) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.name !== selectedItem.name) payload.name = editData.name;
      if (editData.equipment_type !== selectedItem.equipment_type)
        payload.equipment_type = editData.equipment_type;
      if (editData.make !== (selectedItem.make || ""))
        payload.make = editData.make || null;
      if (editData.model !== (selectedItem.model || ""))
        payload.model = editData.model || null;
      if (editData.serial_number !== (selectedItem.serial_number || ""))
        payload.serial_number = editData.serial_number || null;
      if (editData.status !== selectedItem.status)
        payload.status = editData.status;
      if (editData.purchase_date !== (selectedItem.purchase_date || ""))
        payload.purchase_date = editData.purchase_date || null;
      if (String(editData.purchase_cost) !== String(selectedItem.purchase_cost ?? ""))
        payload.purchase_cost = editData.purchase_cost ? Number(editData.purchase_cost) : null;
      if (String(editData.hourly_rate) !== String(selectedItem.hourly_rate ?? ""))
        payload.hourly_rate = editData.hourly_rate ? Number(editData.hourly_rate) : null;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/equipment/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update equipment");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update equipment");
    } finally {
      setSaving(false);
    }
  }

  // Delete handler
  async function handleDelete() {
    if (!selectedItem) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/equipment/${selectedItem.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete equipment");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete equipment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h2>Equipment Inventory</h2>
          <p className="equipment-header-sub">
            {stats.total} item{stats.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Add Equipment
        </button>
      </div>

      {/* KPI Stats */}
      <div className="equipment-stats">
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.available}</span>
            <span className="equipment-stat-label">Available</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-in-use">
          <div className="equipment-stat-icon">
            <Clock size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.in_use}</span>
            <span className="equipment-stat-label">In Use</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-maintenance">
          <div className="equipment-stat-icon">
            <Wrench size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.maintenance}</span>
            <span className="equipment-stat-label">Maintenance</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-retired">
          <div className="equipment-stat-icon">
            <Archive size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.retired}</span>
            <span className="equipment-stat-label">Retired</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="equipment-filters">
        <div className="equipment-search">
          <Search size={16} className="equipment-search-icon" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="equipment-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | "all")}
        >
          <option value="all">All Status</option>
          {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="equipment-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="equipment-empty">
          <div className="equipment-empty-icon">
            <Package size={28} />
          </div>
          {equipment.length === 0 ? (
            <>
              <h3>No equipment yet</h3>
              <p>Add your first piece of equipment to get started.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                Add Equipment
              </button>
            </>
          ) : (
            <>
              <h3>No matching equipment</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="equipment-table-wrap">
          <table className="equipment-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Make / Model</th>
                <th>Serial #</th>
                <th>Status</th>
                <th>Current Project</th>
                <th>Assigned To</th>
                <th>Next Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="equipment-table-row"
                >
                  <td className="equipment-name-cell">{item.name}</td>
                  <td className="equipment-type-cell">
                    {EQUIPMENT_TYPES.find((t) => t.value === item.equipment_type)?.label ??
                      item.equipment_type}
                  </td>
                  <td className="equipment-makemodel-cell">
                    {[item.make, item.model].filter(Boolean).join(" ") || "--"}
                  </td>
                  <td className="equipment-serial-cell">
                    {item.serial_number || "--"}
                  </td>
                  <td>
                    <span className={`equipment-status-badge status-${item.status}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="equipment-project-cell">
                    {item.project?.name || "--"}
                  </td>
                  <td className="equipment-assignee-cell">
                    {getUserName(item.assignee)}
                  </td>
                  <td className="equipment-date-cell">
                    {formatDateShort(item.next_maintenance_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Equipment Modal */}
      {showCreate && (
        <div className="equipment-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>Add New Equipment</h3>
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
                <label className="equipment-form-label">Name *</label>
                <input
                  type="text"
                  className="equipment-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Equipment name"
                  required
                />
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Type *</label>
                  <select
                    className="equipment-form-select"
                    value={formData.equipment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, equipment_type: e.target.value })
                    }
                    required
                  >
                    <option value="">Select type...</option>
                    {EQUIPMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Serial Number</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.serial_number}
                    onChange={(e) =>
                      setFormData({ ...formData, serial_number: e.target.value })
                    }
                    placeholder="S/N"
                  />
                </div>
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Make</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    placeholder="Manufacturer"
                  />
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Model</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="Model name/number"
                  />
                </div>
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Purchase Date</label>
                  <input
                    type="date"
                    className="equipment-form-input"
                    value={formData.purchase_date}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_date: e.target.value })
                    }
                  />
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Purchase Cost ($)</label>
                  <input
                    type="number"
                    className="equipment-form-input"
                    value={formData.purchase_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_cost: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Hourly Rate ($)</label>
                <input
                  type="number"
                  className="equipment-form-input"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourly_rate: e.target.value })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
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
                  disabled={creating || !formData.name.trim() || !formData.equipment_type}
                >
                  {creating ? "Adding..." : "Add Equipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedItem && (
        <div className="equipment-modal-overlay" onClick={closeDetail}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>
                {isEditing ? `Edit ${selectedItem.name}` : selectedItem.name}
              </h3>
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
                    <h3>Delete Equipment</h3>
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
                      <strong>{selectedItem.name}</strong>? This action cannot be
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
                      style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
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
              <div className="equipment-form" style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Name</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {selectedItem.name}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Type</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {EQUIPMENT_TYPES.find((t) => t.value === selectedItem.equipment_type)?.label ??
                        selectedItem.equipment_type}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Make</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {selectedItem.make || "--"}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Model</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {selectedItem.model || "--"}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Serial Number</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {selectedItem.serial_number || "--"}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Status</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      <span className={`equipment-status-badge status-${selectedItem.status}`}>
                        {STATUS_LABELS[selectedItem.status] ?? selectedItem.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Current Project</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {selectedItem.project?.name || "--"}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Assigned To</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {getUserName(selectedItem.assignee)}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Purchase Date</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {formatDate(selectedItem.purchase_date)}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Purchase Cost</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {formatCurrency(selectedItem.purchase_cost)}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Hourly Rate</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {selectedItem.hourly_rate ? `${formatCurrency(selectedItem.hourly_rate)}/hr` : "--"}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Total Hours</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {selectedItem.total_hours ?? "--"}
                    </div>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Last Maintenance</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {formatDate(selectedItem.last_maintenance_date)}
                    </div>
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Next Maintenance</label>
                    <div className="equipment-form-input" style={{ background: "var(--surface)", cursor: "default" }}>
                      {formatDate(selectedItem.next_maintenance_date)}
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
                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Name *</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.name as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Type *</label>
                    <select
                      className="equipment-form-select"
                      value={(editData.equipment_type as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, equipment_type: e.target.value })
                      }
                    >
                      {EQUIPMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Make</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.make as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, make: e.target.value })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Model</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.model as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, model: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Serial Number</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.serial_number as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, serial_number: e.target.value })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Status</label>
                    <select
                      className="equipment-form-select"
                      value={(editData.status as string) || "available"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Purchase Date</label>
                    <input
                      type="date"
                      className="equipment-form-input"
                      value={(editData.purchase_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, purchase_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Purchase Cost ($)</label>
                    <input
                      type="number"
                      className="equipment-form-input"
                      value={String(editData.purchase_cost ?? "")}
                      onChange={(e) =>
                        setEditData({ ...editData, purchase_cost: e.target.value })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="equipment-form-group">
                  <label className="equipment-form-label">Hourly Rate ($)</label>
                  <input
                    type="number"
                    className="equipment-form-input"
                    value={String(editData.hourly_rate ?? "")}
                    onChange={(e) =>
                      setEditData({ ...editData, hourly_rate: e.target.value })
                    }
                    min="0"
                    step="0.01"
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
                    disabled={saving || !(editData.name as string)?.trim()}
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
