"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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
import { formatDateSafe, formatDateShort } from "@/lib/utils/format";

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
  const t = useTranslations("safety");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // ---------------------------------------------------------------------------
  // Constants (translated)
  // ---------------------------------------------------------------------------

  const STATUS_LABELS: Record<IncidentStatus, string> = {
    reported: t("statusReported"),
    investigating: t("statusInvestigating"),
    corrective_action: t("statusCorrectiveAction"),
    closed: t("statusClosed"),
  };

  const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
    low: t("severityLow"),
    medium: t("severityMedium"),
    high: t("severityHigh"),
    critical: t("severityCritical"),
  };

  const TYPE_LABELS: Record<IncidentType, string> = {
    near_miss: t("typeNearMiss"),
    first_aid: t("typeFirstAid"),
    recordable: t("typeRecordable"),
    lost_time: t("typeLostTime"),
    fatality: t("typeFatality"),
    property_damage: t("typePropertyDamage"),
  };

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "title", label: t("title"), required: true },
    { key: "description", label: t("description"), required: false },
    { key: "incident_type", label: t("incidentType"), required: false },
    { key: "severity", label: t("severity"), required: false },
    { key: "incident_date", label: t("incidentDate"), required: false, type: "date" },
    { key: "location", label: t("location"), required: false },
    { key: "osha_recordable", label: t("oshaRecordable"), required: false },
    { key: "project_name", label: "Project Name", required: false },
  ];

  const IMPORT_SAMPLE: Record<string, string>[] = [
    { title: "Slip and fall near excavation", description: "Worker slipped on wet surface near trench", incident_type: "near_miss", severity: "low", incident_date: "2026-01-20", location: "Building A excavation", osha_recordable: "false" },
    { title: "Ladder tip-over on 3rd floor", description: "Extension ladder slipped on polished concrete causing 6 ft fall", incident_type: "recordable", severity: "high", incident_date: "2026-01-22", location: "Building B - 3rd floor", osha_recordable: "true" },
    { title: "Struck by falling pipe fitting", description: "Pipe fitting dropped from overhead rough-in and struck worker on shoulder", incident_type: "first_aid", severity: "medium", incident_date: "2026-01-25", location: "Mechanical room", osha_recordable: "false" },
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return formatDateSafe(dateStr);
  }

  function formatDateShort(dateStr: string | null) {
    if (!dateStr) return "--";
    return formatDateShort(dateStr);
  }

  function getUserName(
    user: { id: string; full_name: string; email: string } | null | undefined
  ): string {
    if (!user) return t("unassigned");
    return user.full_name || user.email || t("unknown");
  }

  // Projects - initialize from SSR prop, then refresh client-side for freshness
  const [projectList, setProjectList] = useState<{ id: string; name: string }[]>(projects);
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { id: string; name: string }[]) => {
        if (Array.isArray(data) && data.length > 0) setProjectList(data);
      })
      .catch(() => {/* keep SSR prop */});
  }, []);

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
  const [importProjectId, setImportProjectId] = useState("");

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
        throw new Error(data.error || t("failedToCreateIncident"));
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
      setCreateError(err instanceof Error ? err.message : t("failedToCreateIncident"));
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
        throw new Error(data.error || t("failedToUpdateIncident"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToUpdateIncident"));
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
        throw new Error(data.error || t("failedToDeleteIncident"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDeleteIncident"));
    } finally {
      setSaving(false);
    }
  }

  // Import handler
  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "safety_incidents", rows, project_id: importProjectId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <div className="safety-page">
      {/* Header */}
      <div className="safety-header">
        <div>
          <h2>{t("safetyIncidents")}</h2>
          <p className="safety-header-sub">
            {t("incidentsTotalCount", { count: stats.total })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("reportIncident")}
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
            <span className="safety-stat-label">{t("statusReported")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-investigating">
          <div className="safety-stat-icon">
            <Search size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.investigating}</span>
            <span className="safety-stat-label">{t("statusInvestigating")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-corrective">
          <div className="safety-stat-icon">
            <ClipboardCheck size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.corrective_action}</span>
            <span className="safety-stat-label">{t("statusCorrectiveAction")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-closed">
          <div className="safety-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.closed}</span>
            <span className="safety-stat-label">{t("statusClosed")}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="safety-filters">
        <div className="safety-search">
          <Search size={16} className="safety-search-icon" />
          <input
            type="text"
            placeholder={t("searchIncidents")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="safety-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "all")}
        >
          <option value="all">{t("allStatus")}</option>
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
          <option value="all">{t("allSeverity")}</option>
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
          <option value="all">{t("allTypes")}</option>
          {(Object.keys(TYPE_LABELS) as IncidentType[]).map((tp) => (
            <option key={tp} value={tp}>
              {TYPE_LABELS[tp]}
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
              <h3>{t("noIncidentsReported")}</h3>
              <p>{t("reportFirstIncidentDesc")}</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                {t("reportIncident")}
              </button>
            </>
          ) : (
            <>
              <h3>{t("noMatchingIncidents")}</h3>
              <p>{t("tryAdjustingFilters")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="safety-table-wrap">
          <table className="safety-table">
            <thead>
              <tr>
                <th>{t("incidentNumber")}</th>
                <th>{t("title")}</th>
                <th>{t("type")}</th>
                <th>{t("severity")}</th>
                <th>{t("status")}</th>
                <th>{t("project")}</th>
                <th>{t("reportedBy")}</th>
                <th>{t("date")}</th>
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
              <h3>{t("reportNewIncident")}</h3>
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
                <label className="safety-form-label">{t("titleRequired")}</label>
                <input
                  type="text"
                  className="safety-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("briefIncidentDescription")}
                  required
                />
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">{t("description")}</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("provideMoreDetails")}
                  rows={4}
                />
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">{t("incidentType")}</label>
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
                    {(Object.keys(TYPE_LABELS) as IncidentType[]).map((tp) => (
                      <option key={tp} value={tp}>
                        {TYPE_LABELS[tp]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("severity")}</label>
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
                  <label className="safety-form-label">{t("project")}</label>
                  <select
                    className="safety-form-select"
                    value={formData.project_id}
                    onChange={(e) =>
                      setFormData({ ...formData, project_id: e.target.value })
                    }
                  >
                    <option value="">{t("noProject")}</option>
                    {projectList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("assignTo")}</label>
                  <select
                    className="safety-form-select"
                    value={formData.assigned_to}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to: e.target.value })
                    }
                  >
                    <option value="">{t("unassigned")}</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user?.full_name || m.user?.email || t("unknown")} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">{t("incidentDate")}</label>
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
                  <label className="safety-form-label">{t("location")}</label>
                  <input
                    type="text"
                    className="safety-form-input"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder={t("locationPlaceholder")}
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
                  {t("oshaRecordable")}
                </label>
              </div>

              <div className="safety-form-actions">
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
                  disabled={creating || !formData.title.trim()}
                >
                  {creating ? t("reporting") : t("reportIncident")}
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
                  ? t("editIncidentNumber", { number: selectedIncident.incident_number })
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
                    <h3>{t("deleteIncident")}</h3>
                    <button
                      className="safety-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("deleteIncidentConfirm", { number: selectedIncident.incident_number })}
                    </p>
                  </div>
                  <div className="safety-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? t("deleting") : t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only detail view */}
            {!isEditing && (
              <div style={{ padding: "1.25rem", pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="detail-group">
                  <label className="detail-label">{t("title")}</label>
                  <div className="detail-value">{selectedIncident.title}</div>
                </div>

                {selectedIncident.description && (
                  <div className="detail-group">
                    <label className="detail-label">{t("description")}</label>
                    <div className="detail-value--multiline">{selectedIncident.description}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("status")}</label>
                    <div className="detail-value">
                      <span className={`safety-status-badge status-${selectedIncident.status}`}>
                        {STATUS_LABELS[selectedIncident.status] ?? selectedIncident.status}
                      </span>
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("severity")}</label>
                    <div className="detail-value">
                      <span className={`safety-severity-badge severity-${selectedIncident.severity}`}>
                        {SEVERITY_LABELS[selectedIncident.severity] ?? selectedIncident.severity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("type")}</label>
                    <div className="detail-value">
                      {TYPE_LABELS[selectedIncident.incident_type] ?? selectedIncident.incident_type}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("project")}</label>
                    <div className="detail-value">{selectedIncident.project?.name || "--"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("assignedTo")}</label>
                    <div className="detail-value">{getUserName(selectedIncident.assignee)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("location")}</label>
                    <div className="detail-value">{selectedIncident.location || "--"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("incidentDate")}</label>
                    <div className="detail-value">{formatDate(selectedIncident.incident_date)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("oshaRecordable")}</label>
                    <div className="detail-value">{selectedIncident.osha_recordable ? t("yes") : t("no")}</div>
                  </div>
                </div>

                {selectedIncident.corrective_actions && (
                  <div className="detail-group">
                    <label className="detail-label">{t("correctiveActions")}</label>
                    <div className="detail-value--multiline">{selectedIncident.corrective_actions}</div>
                  </div>
                )}

                {selectedIncident.root_cause && (
                  <div className="detail-group">
                    <label className="detail-label">{t("rootCause")}</label>
                    <div className="detail-value--multiline">{selectedIncident.root_cause}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("reported")}</label>
                    <div className="detail-value">{formatDate(selectedIncident.created_at)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("reportedBy")}</label>
                    <div className="detail-value">{getUserName(selectedIncident.reporter)}</div>
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
                    {t("delete")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    {t("close")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    {t("edit")}
                  </button>
                </div>
              </div>
            )}

            {/* Edit view */}
            {isEditing && (
              <div className="safety-form">
                <div className="safety-form-group">
                  <label className="safety-form-label">{t("titleRequired")}</label>
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
                  <label className="safety-form-label">{t("description")}</label>
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
                    <label className="safety-form-label">{t("status")}</label>
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
                    <label className="safety-form-label">{t("severity")}</label>
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
                    <label className="safety-form-label">{t("incidentType")}</label>
                    <select
                      className="safety-form-select"
                      value={(editData.incident_type as string) || "near_miss"}
                      onChange={(e) =>
                        setEditData({ ...editData, incident_type: e.target.value })
                      }
                    >
                      {(Object.keys(TYPE_LABELS) as IncidentType[]).map((tp) => (
                        <option key={tp} value={tp}>
                          {TYPE_LABELS[tp]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("project")}</label>
                    <select
                      className="safety-form-select"
                      value={(editData.project_id as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, project_id: e.target.value })
                      }
                    >
                      <option value="">{t("noProject")}</option>
                      {projectList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("assignTo")}</label>
                    <select
                      className="safety-form-select"
                      value={(editData.assigned_to as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, assigned_to: e.target.value })
                      }
                    >
                      <option value="">{t("unassigned")}</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user?.full_name || m.user?.email || t("unknown")} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("location")}</label>
                    <input
                      type="text"
                      className="safety-form-input"
                      value={(editData.location as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, location: e.target.value })
                      }
                      placeholder={t("locationPlaceholder")}
                    />
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("incidentDate")}</label>
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
                      {t("oshaRecordable")}
                    </label>
                  </div>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("correctiveActions")}</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.corrective_actions as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, corrective_actions: e.target.value })
                    }
                    placeholder={t("describeCorrectiveActions")}
                    rows={3}
                  />
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("rootCause")}</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.root_cause as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, root_cause: e.target.value })
                    }
                    placeholder={t("describeRootCause")}
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
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !(editData.title as string)?.trim()}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("safetyIncidentEntity")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); setImportProjectId(""); router.refresh(); }}
          projects={projectList}
          selectedProjectId={importProjectId}
          onProjectChange={setImportProjectId}
        />
      )}
    </div>
  );
}
