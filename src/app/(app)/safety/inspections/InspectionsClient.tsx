"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Plus,
  X,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  CalendarCheck,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Inspection {
  id: string;
  company_id: string;
  project_id: string | null;
  inspection_date: string | null;
  inspector_id: string | null;
  inspection_type: string | null;
  score: number | null;
  checklist: unknown;
  findings: string | null;
  corrective_actions: string | null;
  status: string | null;
  created_at: string | null;
  projects?: { name: string } | null;
}

type StatusValue = "scheduled" | "in_progress" | "completed" | "failed" | "cancelled";

// ---------------------------------------------------------------------------
// Helpers (non-translated)
// ---------------------------------------------------------------------------

function getScoreClass(score: number | null): string {
  if (score === null || score === undefined) return "score-none";
  if (score > 90) return "score-green";
  if (score >= 80) return "score-yellow";
  return "score-red";
}

function getStatusClass(status: string | null): string {
  if (!status) return "";
  return `status-${status}`;
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return "--";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InspectionsClientProps {
  inspections: Inspection[];
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
}

export default function InspectionsClient({
  inspections,
  projects,
  userId,
  companyId,
}: InspectionsClientProps) {
  const router = useRouter();
  const t = useTranslations("safety");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // ---------------------------------------------------------------------------
  // Constants (translated)
  // ---------------------------------------------------------------------------

  const STATUS_LABELS: Record<string, string> = {
    scheduled: t("inspectionStatusScheduled"),
    in_progress: t("inspectionStatusInProgress"),
    completed: t("inspectionStatusCompleted"),
    failed: t("inspectionStatusFailed"),
    cancelled: t("inspectionStatusCancelled"),
  };

  const TYPE_LABELS: Record<string, string> = {
    daily: t("inspectionTypeDaily"),
    weekly: t("inspectionTypeWeekly"),
    monthly: t("inspectionTypeMonthly"),
    quarterly: t("inspectionTypeQuarterly"),
    annual: t("inspectionTypeAnnual"),
    pre_task: t("inspectionTypePreTask"),
    site_safety: t("inspectionTypeSiteSafety"),
    equipment: t("inspectionTypeEquipment"),
    fire_safety: t("inspectionTypeFireSafety"),
    electrical: t("inspectionTypeElectrical"),
    scaffolding: t("inspectionTypeScaffolding"),
    excavation: t("inspectionTypeExcavation"),
    ppe: t("inspectionTypePpe"),
    housekeeping: t("inspectionTypeHousekeeping"),
    fall_protection: t("inspectionTypeFallProtection"),
  };

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "inspection_type", label: t("inspectionType"), required: true },
    { key: "inspection_date", label: t("inspectionDate"), required: false, type: "date" },
    { key: "score", label: t("score"), required: false, type: "number" },
    { key: "findings", label: t("findings"), required: false },
    { key: "corrective_actions", label: t("correctiveActions"), required: false },
    { key: "status", label: t("status"), required: false },
  ];

  const IMPORT_SAMPLE: Record<string, string>[] = [
    {
      inspection_type: "site_safety",
      inspection_date: "2026-01-20",
      score: "92",
      findings: "Minor housekeeping issues in staging area; all PPE in compliance",
      corrective_actions: "Cleanup scheduled for end of shift",
      status: "completed",
    },
    {
      inspection_type: "fire_safety",
      inspection_date: "2026-01-27",
      score: "85",
      findings: "Fire extinguisher on 2nd floor expired; exit sign bulb out in stairwell B",
      corrective_actions: "Replace extinguisher and exit sign bulb by 1/30",
      status: "action_required",
    },
    {
      inspection_type: "equipment",
      inspection_date: "2026-02-03",
      score: "97",
      findings: "All equipment in good condition; crane cert current through March",
      corrective_actions: "",
      status: "completed",
    },
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusValue | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    inspection_type: "site_safety",
    project_id: "",
    inspection_date: new Date().toISOString().split("T")[0],
    score: "",
    findings: "",
    corrective_actions: "",
    status: "scheduled",
  });

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importProjectId, setImportProjectId] = useState("");

  // Detail / Edit / Delete modal state
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Compute summary counts
  const statusCounts = useMemo(() => {
    const counts = { scheduled: 0, in_progress: 0, completed: 0, total: 0 };
    for (const i of inspections) {
      counts.total++;
      if (i.status === "scheduled") counts.scheduled++;
      else if (i.status === "in_progress") counts.in_progress++;
      else if (i.status === "completed") counts.completed++;
    }
    return counts;
  }, [inspections]);

  // Derive available types from data
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    inspections.forEach((i) => {
      if (i.inspection_type) types.add(i.inspection_type);
    });
    return Array.from(types).sort();
  }, [inspections]);

  // Filtered inspections
  const filtered = useMemo(() => {
    let result = inspections;

    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((i) => i.inspection_type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (i) =>
          (i.findings && i.findings.toLowerCase().includes(term)) ||
          (i.corrective_actions && i.corrective_actions.toLowerCase().includes(term)) ||
          (i.inspection_type && i.inspection_type.toLowerCase().includes(term)) ||
          (i.projects?.name && i.projects.name.toLowerCase().includes(term))
      );
    }

    return result;
  }, [inspections, statusFilter, typeFilter, search]);

  // Create inspection handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/safety/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspection_type: formData.inspection_type,
          project_id: formData.project_id || undefined,
          inspection_date: formData.inspection_date || undefined,
          score: formData.score ? Number(formData.score) : undefined,
          findings: formData.findings || undefined,
          corrective_actions: formData.corrective_actions || undefined,
          status: formData.status || "scheduled",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateInspection"));
      }

      // Reset form and close modal
      setFormData({
        inspection_type: "site_safety",
        project_id: "",
        inspection_date: new Date().toISOString().split("T")[0],
        score: "",
        findings: "",
        corrective_actions: "",
        status: "scheduled",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToCreateInspection"));
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(inspection: Inspection) {
    setSelectedInspection(inspection);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedInspection(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedInspection) return;
    setEditData({
      inspection_type: selectedInspection.inspection_type || "site_safety",
      project_id: selectedInspection.project_id || "",
      inspection_date: selectedInspection.inspection_date
        ? selectedInspection.inspection_date.split("T")[0]
        : "",
      score: selectedInspection.score !== null && selectedInspection.score !== undefined
        ? String(selectedInspection.score)
        : "",
      findings: selectedInspection.findings || "",
      corrective_actions: selectedInspection.corrective_actions || "",
      status: selectedInspection.status || "scheduled",
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
    if (!selectedInspection) return;
    setSaving(true);
    setSaveError("");

    try {
      // Build payload with only changed fields
      const payload: Record<string, unknown> = {};

      if (editData.inspection_type !== (selectedInspection.inspection_type || "site_safety"))
        payload.inspection_type = editData.inspection_type;
      if (editData.project_id !== (selectedInspection.project_id || ""))
        payload.project_id = (editData.project_id as string) || null;
      if (editData.status !== (selectedInspection.status || "scheduled"))
        payload.status = editData.status;
      if (editData.findings !== (selectedInspection.findings || ""))
        payload.findings = (editData.findings as string) || null;
      if (editData.corrective_actions !== (selectedInspection.corrective_actions || ""))
        payload.corrective_actions = (editData.corrective_actions as string) || null;

      const scoreStr = editData.score as string;
      const existingScore = selectedInspection.score !== null && selectedInspection.score !== undefined
        ? String(selectedInspection.score)
        : "";
      if (scoreStr !== existingScore) {
        payload.score = scoreStr ? Number(scoreStr) : null;
      }

      const dateVal = editData.inspection_date as string;
      const existingDate = selectedInspection.inspection_date
        ? selectedInspection.inspection_date.split("T")[0]
        : "";
      if (dateVal !== existingDate) payload.inspection_date = editData.inspection_date;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/safety/inspections/${selectedInspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateInspection"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToUpdateInspection"));
    } finally {
      setSaving(false);
    }
  }

  // Delete inspection via DELETE
  async function handleDelete() {
    if (!selectedInspection) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/safety/inspections/${selectedInspection.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteInspection"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDeleteInspection"));
    } finally {
      setSaving(false);
    }
  }

  // Import handler
  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "safety_inspections", rows, project_id: importProjectId }),
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
          <h2>{t("safetyInspections")}</h2>
          <p className="safety-header-sub">
            {t("inspectionsTotalCount", { count: inspections.length })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("newInspection")}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="safety-stats">
        <div className="safety-stat-card stat-scheduled">
          <div className="safety-stat-icon">
            <CalendarCheck size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.scheduled}</span>
            <span className="safety-stat-label">{t("inspectionStatusScheduled")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-investigating">
          <div className="safety-stat-icon">
            <Clock size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.in_progress}</span>
            <span className="safety-stat-label">{t("inspectionStatusInProgress")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-completed">
          <div className="safety-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.completed}</span>
            <span className="safety-stat-label">{t("inspectionStatusCompleted")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-closed">
          <div className="safety-stat-icon">
            <ClipboardCheck size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.total}</span>
            <span className="safety-stat-label">{t("total")}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="safety-filters">
        <div className="safety-search">
          <Search size={16} className="safety-search-icon" />
          <input
            type="text"
            placeholder={t("searchInspections")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="safety-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusValue | "all")}
        >
          <option value="all">{t("allStatus")}</option>
          {Object.keys(STATUS_LABELS).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="safety-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">{t("allTypes")}</option>
          {availableTypes.map((tp) => (
            <option key={tp} value={tp}>
              {TYPE_LABELS[tp] ?? tp}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="safety-empty">
          <div className="safety-empty-icon">
            <ClipboardCheck size={28} />
          </div>
          {inspections.length === 0 ? (
            <>
              <h3>{t("noInspectionsRecorded")}</h3>
              <p>{t("createFirstInspectionDesc")}</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                {t("newInspection")}
              </button>
            </>
          ) : (
            <>
              <h3>{t("noMatchingInspections")}</h3>
              <p>{t("tryAdjustingFilters")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="safety-table-wrap">
          <table className="safety-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("project")}</th>
                <th>{t("type")}</th>
                <th>{t("score")}</th>
                <th>{t("findings")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inspection) => (
                <tr
                  key={inspection.id}
                  onClick={() => openDetail(inspection)}
                  className="safety-table-row"
                >
                  <td className="safety-date-cell">
                    {formatDate(inspection.inspection_date)}
                  </td>
                  <td className="safety-project-cell">
                    {inspection.projects?.name || "--"}
                  </td>
                  <td className="safety-type-cell">
                    {TYPE_LABELS[inspection.inspection_type ?? ""] ??
                      inspection.inspection_type ??
                      "--"}
                  </td>
                  <td>
                    <span
                      className={`safety-severity-badge ${getScoreClass(inspection.score)}`}
                    >
                      {inspection.score !== null && inspection.score !== undefined
                        ? `${inspection.score}%`
                        : "--"}
                    </span>
                  </td>
                  <td className="safety-title-cell">
                    {truncate(inspection.findings, 60)}
                  </td>
                  <td>
                    <span
                      className={`safety-status-badge ${getStatusClass(inspection.status)}`}
                    >
                      {STATUS_LABELS[inspection.status ?? ""] ??
                        inspection.status ??
                        "--"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Inspection Modal */}
      {showCreate && (
        <div className="safety-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>{t("newInspection")}</h3>
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
              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">{t("inspectionTypeRequired")}</label>
                  <select
                    className="safety-form-select"
                    value={formData.inspection_type}
                    onChange={(e) =>
                      setFormData({ ...formData, inspection_type: e.target.value })
                    }
                  >
                    {Object.keys(TYPE_LABELS).map((tp) => (
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
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">{t("inspectionDate")}</label>
                  <input
                    type="date"
                    className="safety-form-input"
                    value={formData.inspection_date}
                    onChange={(e) =>
                      setFormData({ ...formData, inspection_date: e.target.value })
                    }
                  />
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("scoreRange")}</label>
                  <input
                    type="number"
                    className="safety-form-input"
                    value={formData.score}
                    onChange={(e) =>
                      setFormData({ ...formData, score: e.target.value })
                    }
                    min={0}
                    max={100}
                    placeholder={t("scorePlaceholder")}
                  />
                </div>
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">{t("status")}</label>
                <select
                  className="safety-form-select"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  {Object.keys(STATUS_LABELS).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">{t("findings")}</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.findings}
                  onChange={(e) =>
                    setFormData({ ...formData, findings: e.target.value })
                  }
                  placeholder={t("describeFindingsPlaceholder")}
                  rows={4}
                />
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">{t("correctiveActions")}</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.corrective_actions}
                  onChange={(e) =>
                    setFormData({ ...formData, corrective_actions: e.target.value })
                  }
                  placeholder={t("describeCorrectiveActionsRequired")}
                  rows={3}
                />
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
                  disabled={creating || !formData.inspection_type}
                >
                  {creating ? t("creating") : t("createInspection")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedInspection && (
        <div className="safety-modal-overlay" onClick={closeDetail}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>
                {isEditing
                  ? t("editInspection")
                  : t("inspectionDetails")}
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
                    <h3>{t("deleteInspection")}</h3>
                    <button
                      className="safety-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("deleteInspectionConfirm")}
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
              <div className="safety-form" style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="detail-group">
                  <div className="detail-row">
                    <span className="detail-label">{t("date")}</span>
                    <span className="detail-value">
                      {formatDate(selectedInspection.inspection_date)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">{t("project")}</span>
                    <span className="detail-value">
                      {selectedInspection.projects?.name || "--"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">{t("type")}</span>
                    <span className="detail-value">
                      {TYPE_LABELS[selectedInspection.inspection_type ?? ""] ??
                        selectedInspection.inspection_type ??
                        "--"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">{t("score")}</span>
                    <span className="detail-value">
                      <span className={`safety-severity-badge ${getScoreClass(selectedInspection.score)}`}>
                        {selectedInspection.score !== null && selectedInspection.score !== undefined
                          ? `${selectedInspection.score}%`
                          : "--"}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">{t("status")}</span>
                    <span className="detail-value">
                      <span className={`safety-status-badge ${getStatusClass(selectedInspection.status)}`}>
                        {STATUS_LABELS[selectedInspection.status ?? ""] ??
                          selectedInspection.status ??
                          "--"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <span className="detail-label">{t("findings")}</span>
                    <span className="detail-value" style={{ whiteSpace: "pre-wrap", marginTop: "0.25rem" }}>
                      {selectedInspection.findings || "--"}
                    </span>
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <span className="detail-label">{t("correctiveActions")}</span>
                    <span className="detail-value" style={{ whiteSpace: "pre-wrap", marginTop: "0.25rem" }}>
                      {selectedInspection.corrective_actions || "--"}
                    </span>
                  </div>
                </div>

                <div className="detail-group">
                  <div className="detail-row">
                    <span className="detail-label">{t("created")}</span>
                    <span className="detail-value">
                      {formatDate(selectedInspection.created_at)}
                    </span>
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
                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("inspectionTypeRequired")}</label>
                    <select
                      className="safety-form-select"
                      value={(editData.inspection_type as string) || "site_safety"}
                      onChange={(e) =>
                        setEditData({ ...editData, inspection_type: e.target.value })
                      }
                    >
                      {Object.keys(TYPE_LABELS).map((tp) => (
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
                    <label className="safety-form-label">{t("inspectionDate")}</label>
                    <input
                      type="date"
                      className="safety-form-input"
                      value={(editData.inspection_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, inspection_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("scoreRange")}</label>
                    <input
                      type="number"
                      className="safety-form-input"
                      value={(editData.score as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, score: e.target.value })
                      }
                      min={0}
                      max={100}
                      placeholder={t("scorePlaceholder")}
                    />
                  </div>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("status")}</label>
                  <select
                    className="safety-form-select"
                    value={(editData.status as string) || "scheduled"}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    {Object.keys(STATUS_LABELS).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("findings")}</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.findings as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, findings: e.target.value })
                    }
                    placeholder={t("describeFindingsPlaceholder")}
                    rows={4}
                  />
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("correctiveActions")}</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.corrective_actions as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, corrective_actions: e.target.value })
                    }
                    placeholder={t("describeCorrectiveActionsRequired")}
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
                    disabled={saving || !(editData.inspection_type as string)?.trim()}
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
          entityName={t("safetyInspectionEntity")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); setImportProjectId(""); router.refresh(); }}
          projects={projects}
          selectedProjectId={importProjectId}
          onProjectChange={setImportProjectId}
        />
      )}
    </div>
  );
}
