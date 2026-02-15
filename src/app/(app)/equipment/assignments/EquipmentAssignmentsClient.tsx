"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "equipment_id", label: "Equipment ID", required: true },
  { key: "project_id", label: "Project ID", required: false },
  { key: "assigned_to", label: "Assigned To (User ID)", required: false },
  { key: "assigned_date", label: "Assigned Date", required: true, type: "date" },
  { key: "return_date", label: "Return Date", required: false, type: "date" },
  { key: "notes", label: "Notes", required: false },
  { key: "status", label: "Status", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { equipment_id: "uuid-of-equipment", project_id: "uuid-of-project", assigned_to: "", assigned_date: "2026-01-15", return_date: "2026-03-15", notes: "Needed for excavation phase", status: "active" },
  { equipment_id: "uuid-of-equipment-2", project_id: "uuid-of-project", assigned_to: "", assigned_date: "2026-02-01", return_date: "2026-04-01", notes: "Concrete pouring operations", status: "active" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const t = useTranslations("equipment");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
    active: t("assignmentStatusActive"),
    returned: t("assignmentStatusReturned"),
  };

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

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

  // Loading sample data
  const [loadingSamples, setLoadingSamples] = useState(false);

  async function loadSampleData() {
    const available = equipmentList.filter((e) => e.status === "available");
    if (available.length === 0) return;
    setLoadingSamples(true);
    try {
      const sampleNotes = [
        "Needed for foundation excavation - Phase 1",
        "Site grading and earthwork operations",
        "Concrete pour support for Building A",
        "Utility trench work - east side of property",
        "Demolition and site clearing",
        "Steel erection support",
      ];

      // Assign up to 3 available equipment items
      const toAssign = available.slice(0, Math.min(3, available.length));
      for (let i = 0; i < toAssign.length; i++) {
        await fetch("/api/equipment/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipment_id: toAssign[i].id,
            project_id: projects.length > 0 ? projects[i % projects.length].id : undefined,
            assigned_to: members.length > 0 ? members[i % members.length].user_id : undefined,
            notes: sampleNotes[i % sampleNotes.length],
          }),
        });
      }
      router.refresh();
    } catch {
      // silent fail
    } finally {
      setLoadingSamples(false);
    }
  }

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
        throw new Error(data.error || t("errorCreateAssignment"));
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
      setCreateError(err instanceof Error ? err.message : t("errorCreateAssignment"));
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
        throw new Error(data.error || t("errorReturnEquipment"));
      }

      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : t("errorReturnEquipment"));
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
        throw new Error(data.error || t("errorDeleteAssignment"));
      }

      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : t("errorDeleteAssignment"));
    } finally {
      setReturning(null);
    }
  }

  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h2>{t("equipmentAssignments")}</h2>
          <p className="equipment-header-sub">
            {t("activeAndReturned", { active: activeCount, returned: returnedCount })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("assignEquipment")}
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
            <span className="equipment-stat-label">{t("assignmentStatusActive")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{returnedCount}</span>
            <span className="equipment-stat-label">{t("assignmentStatusReturned")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{assignments.length}</span>
            <span className="equipment-stat-label">{t("total")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{availableEquipment.length}</span>
            <span className="equipment-stat-label">{t("availableToAssign")}</span>
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
          <option value="all">{t("allStatus")}</option>
          <option value="active">{t("assignmentStatusActive")}</option>
          <option value="returned">{t("assignmentStatusReturned")}</option>
        </select>

        <select
          className="equipment-filter-select"
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value)}
        >
          <option value="all">{t("allEquipment")}</option>
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
          <option value="all">{t("allProjects")}</option>
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
              <h3>{t("noAssignmentsYet")}</h3>
              <p>{t("assignEquipmentToProjects")}</p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={16} />
                  {t("assignEquipment")}
                </button>
                {availableEquipment.length > 0 && (
                  <button
                    className="btn-secondary"
                    onClick={loadSampleData}
                    disabled={loadingSamples}
                  >
                    {loadingSamples ? t("loading") : t("loadSampleData")}
                  </button>
                )}
              </div>
              {equipmentList.length === 0 && (
                <p style={{ fontSize: "0.82rem", marginTop: "8px" }}>
                  {t("addEquipmentInInventoryFirst")}
                </p>
              )}
            </>
          ) : (
            <>
              <h3>{t("noMatchingAssignments")}</h3>
              <p>{t("tryAdjustingFilters")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="equipment-table-wrap">
          <table className="equipment-table">
            <thead>
              <tr>
                <th>{t("columnEquipment")}</th>
                <th>{t("columnProject")}</th>
                <th>{t("labelAssignedTo")}</th>
                <th>{t("columnAssignedDate")}</th>
                <th>{t("columnReturnedDate")}</th>
                <th>{t("columnStatus")}</th>
                <th>{t("columnActions")}</th>
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
                          title={t("returnEquipment")}
                        >
                          <RotateCcw size={14} />
                          {returning === assignment.id ? "..." : t("return")}
                        </button>
                      )}
                      <button
                        className="equipment-action-btn delete-btn"
                        onClick={() => handleDelete(assignment.id)}
                        disabled={returning === assignment.id}
                        title={t("deleteAssignment")}
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
              <h3>{t("assignEquipment")}</h3>
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
                <label className="equipment-form-label">{t("labelEquipmentRequired")}</label>
                <select
                  className="equipment-form-select"
                  value={formData.equipment_id}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment_id: e.target.value })
                  }
                  required
                >
                  <option value="">{t("selectEquipment")}</option>
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.equipment_type})
                    </option>
                  ))}
                </select>
                {availableEquipment.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "var(--color-amber)", marginTop: 4 }}>
                    {t("noEquipmentAvailable")}
                  </p>
                )}
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">{t("columnProject")}</label>
                <select
                  className="equipment-form-select"
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value })
                  }
                >
                  <option value="">{t("noProject")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">{t("labelAssignTo")}</label>
                <select
                  className="equipment-form-select"
                  value={formData.assigned_to}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_to: e.target.value })
                  }
                >
                  <option value="">{t("unassigned")}</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.full_name || m.user?.email || "Unknown"} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">{t("labelNotes")}</label>
                <textarea
                  className="equipment-form-textarea"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t("placeholderAssignmentNotes")}
                  rows={3}
                />
              </div>

              <div className="equipment-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.equipment_id}
                >
                  {creating ? t("assigning") : t("assignEquipment")}
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
