"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  ClipboardList,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  EquipmentAssignmentRow,
  EquipmentRow,
  AssignmentStatus,
} from "@/lib/queries/equipment";
import type { CompanyMember } from "@/lib/queries/tickets";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  returned: "Returned",
};

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "equipment_id", label: "Equipment ID", required: false },
  { key: "project_id", label: "Project ID", required: false },
  { key: "assigned_to", label: "Assigned To", required: false },
  { key: "assigned_date", label: "Assigned Date", required: false, type: "date" },
  { key: "return_date", label: "Return Date", required: false, type: "date" },
  { key: "notes", label: "Notes", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { equipment_id: "", project_id: "", assigned_to: "", assigned_date: "2026-01-15", return_date: "2026-03-15", notes: "Needed for excavation phase" },
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

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "--";
  return user.full_name || user.email || "Unknown";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EquipmentAssignmentsClientProps {
  assignments: EquipmentAssignmentRow[];
  equipmentList: EquipmentRow[];
  members: CompanyMember[];
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
}

export default function EquipmentAssignmentsClient({
  assignments,
  equipmentList,
  members,
  projects,
  userId,
  companyId,
}: EquipmentAssignmentsClientProps) {
  const router = useRouter();

  // Filters
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    equipment_id: "",
    project_id: "",
    assigned_to: "",
    notes: "",
  });

  // Import modal state
  const [showImport, setShowImport] = useState(false);

  // Return / delete state
  const [returning, setReturning] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Available equipment for assignment (status = 'available')
  const availableEquipment = useMemo(
    () => equipmentList.filter((e) => e.status === "available"),
    [equipmentList]
  );

  // Filtered assignments
  const filtered = useMemo(() => {
    let result = assignments;

    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (equipmentFilter !== "all") {
      result = result.filter((a) => a.equipment_id === equipmentFilter);
    }

    if (projectFilter !== "all") {
      result = result.filter((a) => a.project_id === projectFilter);
    }

    return result;
  }, [assignments, statusFilter, equipmentFilter, projectFilter]);

  // Counts
  const activeCount = assignments.filter((a) => a.status === "active").length;
  const returnedCount = assignments.filter((a) => a.status === "returned").length;

  // Create handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/equipment/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: formData.equipment_id,
          project_id: formData.project_id || undefined,
          assigned_to: formData.assigned_to || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assignment");
      }

      setFormData({
        equipment_id: "",
        project_id: "",
        assigned_to: "",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  }

  // Import handler
  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "equipment_assignments", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // Return equipment handler
  async function handleReturn(assignmentId: string) {
    setReturning(assignmentId);
    setActionError("");

    try {
      const res = await fetch(`/api/equipment/assignments/${assignmentId}`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to return equipment");
      }

      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to return equipment");
    } finally {
      setReturning(null);
    }
  }

  // Delete assignment handler
  async function handleDelete(assignmentId: string) {
    setReturning(assignmentId);
    setActionError("");

    try {
      const res = await fetch(`/api/equipment/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete assignment");
      }

      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete assignment");
    } finally {
      setReturning(null);
    }
  }

  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h2>Equipment Assignments</h2>
          <p className="equipment-header-sub">
            {activeCount} active, {returnedCount} returned
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Assign Equipment
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
            <span className="equipment-stat-value">{activeCount}</span>
            <span className="equipment-stat-label">Active</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{returnedCount}</span>
            <span className="equipment-stat-label">Returned</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{assignments.length}</span>
            <span className="equipment-stat-label">Total</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{availableEquipment.length}</span>
            <span className="equipment-stat-label">Available to Assign</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="equipment-filters">
        <select
          className="equipment-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | "all")}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
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

        <select
          className="equipment-filter-select"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <div className="equipment-form-error" style={{ marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="equipment-empty">
          <div className="equipment-empty-icon">
            <ClipboardList size={28} />
          </div>
          {assignments.length === 0 ? (
            <>
              <h3>No assignments yet</h3>
              <p>Assign equipment to projects and team members.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                Assign Equipment
              </button>
            </>
          ) : (
            <>
              <h3>No matching assignments</h3>
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
                <th>Project</th>
                <th>Assigned To</th>
                <th>Assigned Date</th>
                <th>Returned Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((assignment) => (
                <tr key={assignment.id} className="equipment-table-row">
                  <td className="equipment-name-cell">
                    {assignment.equipment?.name || "--"}
                  </td>
                  <td className="equipment-project-cell">
                    {assignment.project?.name || "--"}
                  </td>
                  <td className="equipment-assignee-cell">
                    {getUserName(assignment.assignee)}
                  </td>
                  <td className="equipment-date-cell">
                    {formatDate(assignment.assigned_date)}
                  </td>
                  <td className="equipment-date-cell">
                    {formatDate(assignment.returned_date)}
                  </td>
                  <td>
                    <span
                      className={`equipment-status-badge status-${
                        assignment.status === "active" ? "in_use" : "available"
                      }`}
                    >
                      {ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status}
                    </span>
                  </td>
                  <td>
                    <div className="equipment-action-btns">
                      {assignment.status === "active" && (
                        <button
                          className="equipment-action-btn return-btn"
                          onClick={() => handleReturn(assignment.id)}
                          disabled={returning === assignment.id}
                          title="Return Equipment"
                        >
                          <RotateCcw size={14} />
                          {returning === assignment.id ? "..." : "Return"}
                        </button>
                      )}
                      <button
                        className="equipment-action-btn delete-btn"
                        onClick={() => handleDelete(assignment.id)}
                        disabled={returning === assignment.id}
                        title="Delete Assignment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Equipment Modal */}
      {showCreate && (
        <div className="equipment-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>Assign Equipment</h3>
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
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.equipment_type})
                    </option>
                  ))}
                </select>
                {availableEquipment.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "var(--color-amber)", marginTop: 4 }}>
                    No equipment available for assignment.
                  </p>
                )}
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Project</label>
                <select
                  className="equipment-form-select"
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value })
                  }
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Assign To</label>
                <select
                  className="equipment-form-select"
                  value={formData.assigned_to}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_to: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.full_name || m.user?.email || "Unknown"} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Notes</label>
                <textarea
                  className="equipment-form-textarea"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Optional notes about this assignment..."
                  rows={3}
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
                  disabled={creating || !formData.equipment_id}
                >
                  {creating ? "Assigning..." : "Assign Equipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          entityName="Equipment Assignments"
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
