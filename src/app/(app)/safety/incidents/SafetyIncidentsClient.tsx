"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  SafetyIncidentRow,
  SafetyStats,
  CompanyMember,
  IncidentStatus,
  IncidentSeverity,
  IncidentType,
} from "@/lib/queries/safety";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: "Reported",
  investigating: "Investigating",
  corrective_action: "Corrective Action",
  closed: "Closed",
};

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const TYPE_LABELS: Record<IncidentType, string> = {
  near_miss: "Near Miss",
  first_aid: "First Aid",
  recordable: "Recordable",
  lost_time: "Lost Time",
  fatality: "Fatality",
  property_damage: "Property Damage",
};

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", required: false },
  { key: "incident_type", label: "Incident Type", required: false },
  { key: "severity", label: "Severity", required: false },
  { key: "incident_date", label: "Incident Date", required: false, type: "date" },
  { key: "location", label: "Location", required: false },
  { key: "osha_recordable", label: "OSHA Recordable", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Slip and fall near excavation", description: "Worker slipped on wet surface near trench", incident_type: "near_miss", severity: "low", incident_date: "2026-01-20", location: "Building A excavation", osha_recordable: "false" },
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

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "Unassigned";
  return user.full_name || user.email || "Unknown";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SafetyIncidentsClientProps {
  incidents: SafetyIncidentRow[];
  stats: SafetyStats;
  members: CompanyMember[];
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
}

export default function SafetyIncidentsClient({
  incidents,
  stats,
  members,
  projects,
  userId,
  companyId,
}: SafetyIncidentsClientProps) {
  const router = useRouter();

  // Filters
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "all">("all");
  const [typeFilter, setTypeFilter] = useState<IncidentType | "all">("all");
  const [search, setSearch] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    incident_type: "near_miss" as IncidentType,
    severity: "medium" as IncidentSeverity,
    project_id: "",
    assigned_to: "",
    incident_date: new Date().toISOString().split("T")[0],
    location: "",
    osha_recordable: false,
  });

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Detail / Edit / Delete modal state
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncidentRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filtered incidents
  const filtered = useMemo(() => {
    let result = incidents;

    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (severityFilter !== "all") {
      result = result.filter((i) => i.severity === severityFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((i) => i.incident_type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(term) ||
          i.incident_number.toLowerCase().includes(term) ||
          (i.description && i.description.toLowerCase().includes(term))
      );
    }

    return result;
  }, [incidents, statusFilter, severityFilter, typeFilter, search]);

  // Create incident handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/safety/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          incident_type: formData.incident_type,
          severity: formData.severity,
          project_id: formData.project_id || undefined,
          assigned_to: formData.assigned_to || undefined,
          incident_date: formData.incident_date || undefined,
          location: formData.location || undefined,
          osha_recordable: formData.osha_recordable,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create incident");
      }

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        incident_type: "near_miss",
        severity: "medium",
        project_id: "",
        assigned_to: "",
        incident_date: new Date().toISOString().split("T")[0],
        location: "",
        osha_recordable: false,
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create incident");
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(incident: SafetyIncidentRow) {
    setSelectedIncident(incident);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedIncident(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedIncident) return;
    setEditData({
      title: selectedIncident.title,
      description: selectedIncident.description || "",
      status: selectedIncident.status,
      severity: selectedIncident.severity,
      incident_type: selectedIncident.incident_type,
      project_id: selectedIncident.project_id || "",
      assigned_to: selectedIncident.assigned_to || "",
      incident_date: selectedIncident.incident_date
        ? selectedIncident.incident_date.split("T")[0]
        : "",
      location: selectedIncident.location || "",
      osha_recordable: selectedIncident.osha_recordable,
      corrective_actions: selectedIncident.corrective_actions || "",
      root_cause: selectedIncident.root_cause || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  // Cancel edit mode
  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  // Save edits via PATCH
  async function handleSave() {
    if (!selectedIncident) return;
    setSaving(true);
    setSaveError("");

    try {
      // Build payload with only changed fields
      const payload: Record<string, unknown> = {};
      if (editData.title !== selectedIncident.title) payload.title = editData.title;
      if (editData.description !== (selectedIncident.description || ""))
        payload.description = editData.description;
      if (editData.status !== selectedIncident.status) payload.status = editData.status;
      if (editData.severity !== selectedIncident.severity)
        payload.severity = editData.severity;
      if (editData.incident_type !== selectedIncident.incident_type)
        payload.incident_type = editData.incident_type;
      if (editData.project_id !== (selectedIncident.project_id || ""))
        payload.project_id = editData.project_id || null;
      if (editData.assigned_to !== (selectedIncident.assigned_to || ""))
        payload.assigned_to = editData.assigned_to || null;
      if (editData.location !== (selectedIncident.location || ""))
        payload.location = editData.location;
      if (editData.osha_recordable !== selectedIncident.osha_recordable)
        payload.osha_recordable = editData.osha_recordable;
      if (editData.corrective_actions !== (selectedIncident.corrective_actions || ""))
        payload.corrective_actions = editData.corrective_actions;
      if (editData.root_cause !== (selectedIncident.root_cause || ""))
        payload.root_cause = editData.root_cause;

      const dateVal = editData.incident_date as string;
      const existingDate = selectedIncident.incident_date
        ? selectedIncident.incident_date.split("T")[0]
        : "";
      if (dateVal !== existingDate) payload.incident_date = editData.incident_date;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/safety/incidents/${selectedIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update incident");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update incident");
    } finally {
      setSaving(false);
    }
  }

  // Delete incident via DELETE
  async function handleDelete() {
    if (!selectedIncident) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/safety/incidents/${selectedIncident.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete incident");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete incident");
    } finally {
      setSaving(false);
    }
  }

  // Import handler
  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "safety_incidents", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <div className="safety-page">
      {/* Header */}
      <div className="safety-header">
        <div>
          <h2>Safety Incidents</h2>
          <p className="safety-header-sub">
            {stats.total} incident{stats.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Report Incident
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="safety-stats">
        <div className="safety-stat-card stat-reported">
          <div className="safety-stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.reported}</span>
            <span className="safety-stat-label">Reported</span>
          </div>
        </div>
        <div className="safety-stat-card stat-investigating">
          <div className="safety-stat-icon">
            <Search size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.investigating}</span>
            <span className="safety-stat-label">Investigating</span>
          </div>
        </div>
        <div className="safety-stat-card stat-corrective">
          <div className="safety-stat-icon">
            <ClipboardCheck size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.corrective_action}</span>
            <span className="safety-stat-label">Corrective Action</span>
          </div>
        </div>
        <div className="safety-stat-card stat-closed">
          <div className="safety-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.closed}</span>
            <span className="safety-stat-label">Closed</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="safety-filters">
        <div className="safety-search">
          <Search size={16} className="safety-search-icon" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="safety-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "all")}
        >
          <option value="all">All Status</option>
          {(Object.keys(STATUS_LABELS) as IncidentStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="safety-filter-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | "all")}
        >
          <option value="all">All Severity</option>
          {(Object.keys(SEVERITY_LABELS) as IncidentSeverity[]).map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="safety-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as IncidentType | "all")}
        >
          <option value="all">All Types</option>
          {(Object.keys(TYPE_LABELS) as IncidentType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="safety-empty">
          <div className="safety-empty-icon">
            <ShieldCheck size={28} />
          </div>
          {incidents.length === 0 ? (
            <>
              <h3>No incidents reported</h3>
              <p>Report your first safety incident to get started.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                Report Incident
              </button>
            </>
          ) : (
            <>
              <h3>No matching incidents</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="safety-table-wrap">
          <table className="safety-table">
            <thead>
              <tr>
                <th>Incident #</th>
                <th>Title</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Project</th>
                <th>Reported By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => openDetail(incident)}
                  className="safety-table-row"
                >
                  <td className="safety-number-cell">{incident.incident_number}</td>
                  <td className="safety-title-cell">{incident.title}</td>
                  <td className="safety-type-cell">
                    {TYPE_LABELS[incident.incident_type] ?? incident.incident_type}
                  </td>
                  <td>
                    <span className={`safety-severity-badge severity-${incident.severity}`}>
                      {SEVERITY_LABELS[incident.severity] ?? incident.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`safety-status-badge status-${incident.status}`}>
                      {STATUS_LABELS[incident.status] ?? incident.status}
                    </span>
                  </td>
                  <td className="safety-project-cell">
                    {incident.project?.name || "--"}
                  </td>
                  <td className="safety-person-cell">
                    {getUserName(incident.reporter)}
                  </td>
                  <td className="safety-date-cell">
                    {formatDateShort(incident.incident_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Incident Modal */}
      {showCreate && (
        <div className="safety-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>Report New Incident</h3>
              <button
                className="safety-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="safety-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="safety-form">
              <div className="safety-form-group">
                <label className="safety-form-label">Title *</label>
                <input
                  type="text"
                  className="safety-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of the incident"
                  required
                />
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">Description</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Provide more details about the incident..."
                  rows={4}
                />
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">Incident Type</label>
                  <select
                    className="safety-form-select"
                    value={formData.incident_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        incident_type: e.target.value as IncidentType,
                      })
                    }
                  >
                    {(Object.keys(TYPE_LABELS) as IncidentType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Severity</label>
                  <select
                    className="safety-form-select"
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        severity: e.target.value as IncidentSeverity,
                      })
                    }
                  >
                    {(Object.keys(SEVERITY_LABELS) as IncidentSeverity[]).map((s) => (
                      <option key={s} value={s}>
                        {SEVERITY_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">Project</label>
                  <select
                    className="safety-form-select"
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

                <div className="safety-form-group">
                  <label className="safety-form-label">Assign To</label>
                  <select
                    className="safety-form-select"
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
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">Incident Date</label>
                  <input
                    type="date"
                    className="safety-form-input"
                    value={formData.incident_date}
                    onChange={(e) =>
                      setFormData({ ...formData, incident_date: e.target.value })
                    }
                  />
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Location</label>
                  <input
                    type="text"
                    className="safety-form-input"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Building A, Floor 3"
                  />
                </div>
              </div>

              <div className="safety-form-group">
                <label className="safety-form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.osha_recordable}
                    onChange={(e) =>
                      setFormData({ ...formData, osha_recordable: e.target.checked })
                    }
                  />
                  OSHA Recordable
                </label>
              </div>

              <div className="safety-form-actions">
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
                  disabled={creating || !formData.title.trim()}
                >
                  {creating ? "Reporting..." : "Report Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedIncident && (
        <div className="safety-modal-overlay" onClick={closeDetail}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>
                {isEditing
                  ? `Edit ${selectedIncident.incident_number}`
                  : selectedIncident.incident_number}
              </h3>
              <button className="safety-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="safety-form-error">{saveError}</div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div
                className="safety-modal-overlay"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  borderRadius: "inherit",
                }}
              >
                <div
                  className="safety-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 440 }}
                >
                  <div className="safety-modal-header">
                    <h3>Delete Incident</h3>
                    <button
                      className="safety-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      Are you sure you want to delete incident{" "}
                      <strong>{selectedIncident.incident_number}</strong>? This action
                      cannot be undone.
                    </p>
                  </div>
                  <div className="safety-form-actions">
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

            {/* Read-only detail view */}
            {!isEditing && (
              <div className="safety-form" style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="safety-form-group">
                  <label className="safety-form-label">Title</label>
                  <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                    {selectedIncident.title}
                  </div>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Description</label>
                  <div
                    className="safety-form-textarea"
                    style={{
                      background: "var(--color-bg-tertiary, #f3f4f6)",
                      cursor: "default",
                      minHeight: 60,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedIncident.description || "--"}
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Status</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      <span className={`safety-status-badge status-${selectedIncident.status}`}>
                        {STATUS_LABELS[selectedIncident.status] ?? selectedIncident.status}
                      </span>
                    </div>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">Severity</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      <span className={`safety-severity-badge severity-${selectedIncident.severity}`}>
                        {SEVERITY_LABELS[selectedIncident.severity] ?? selectedIncident.severity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Type</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {TYPE_LABELS[selectedIncident.incident_type] ?? selectedIncident.incident_type}
                    </div>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">Project</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedIncident.project?.name || "--"}
                    </div>
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Assigned To</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {getUserName(selectedIncident.assignee)}
                    </div>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">Location</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedIncident.location || "--"}
                    </div>
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Incident Date</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {formatDate(selectedIncident.incident_date)}
                    </div>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">OSHA Recordable</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedIncident.osha_recordable ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                {selectedIncident.corrective_actions && (
                  <div className="safety-form-group">
                    <label className="safety-form-label">Corrective Actions</label>
                    <div
                      className="safety-form-textarea"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                        minHeight: 60,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedIncident.corrective_actions}
                    </div>
                  </div>
                )}

                {selectedIncident.root_cause && (
                  <div className="safety-form-group">
                    <label className="safety-form-label">Root Cause</label>
                    <div
                      className="safety-form-textarea"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                        minHeight: 60,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedIncident.root_cause}
                    </div>
                  </div>
                )}

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Reported</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {formatDate(selectedIncident.created_at)}
                    </div>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">Reported By</label>
                    <div className="safety-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {getUserName(selectedIncident.reporter)}
                    </div>
                  </div>
                </div>

                <div className="safety-form-actions">
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
              <div className="safety-form">
                <div className="safety-form-group">
                  <label className="safety-form-label">Title *</label>
                  <input
                    type="text"
                    className="safety-form-input"
                    value={(editData.title as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Description</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.description as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Status</label>
                    <select
                      className="safety-form-select"
                      value={(editData.status as string) || "reported"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {(Object.keys(STATUS_LABELS) as IncidentStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">Severity</label>
                    <select
                      className="safety-form-select"
                      value={(editData.severity as string) || "medium"}
                      onChange={(e) =>
                        setEditData({ ...editData, severity: e.target.value })
                      }
                    >
                      {(Object.keys(SEVERITY_LABELS) as IncidentSeverity[]).map((s) => (
                        <option key={s} value={s}>
                          {SEVERITY_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Incident Type</label>
                    <select
                      className="safety-form-select"
                      value={(editData.incident_type as string) || "near_miss"}
                      onChange={(e) =>
                        setEditData({ ...editData, incident_type: e.target.value })
                      }
                    >
                      {(Object.keys(TYPE_LABELS) as IncidentType[]).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">Project</label>
                    <select
                      className="safety-form-select"
                      value={(editData.project_id as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, project_id: e.target.value })
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
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Assign To</label>
                    <select
                      className="safety-form-select"
                      value={(editData.assigned_to as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, assigned_to: e.target.value })
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
                  <div className="safety-form-group">
                    <label className="safety-form-label">Location</label>
                    <input
                      type="text"
                      className="safety-form-input"
                      value={(editData.location as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, location: e.target.value })
                      }
                      placeholder="e.g. Building A, Floor 3"
                    />
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Incident Date</label>
                    <input
                      type="date"
                      className="safety-form-input"
                      value={(editData.incident_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, incident_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editData.osha_recordable as boolean) || false}
                        onChange={(e) =>
                          setEditData({ ...editData, osha_recordable: e.target.checked })
                        }
                      />
                      OSHA Recordable
                    </label>
                  </div>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Corrective Actions</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.corrective_actions as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, corrective_actions: e.target.value })
                    }
                    placeholder="Describe corrective actions taken..."
                    rows={3}
                  />
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Root Cause</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.root_cause as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, root_cause: e.target.value })
                    }
                    placeholder="Describe the root cause..."
                    rows={3}
                  />
                </div>

                <div className="safety-form-actions">
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
          entityName="Safety Incident"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
