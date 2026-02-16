"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Plus,
  X,
  ClipboardList,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  ToolboxTalkRow,
  CompanyMember,
  ToolboxTalkStatus,
} from "@/lib/queries/safety";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Constants (non-translated - topics are domain data)
// ---------------------------------------------------------------------------

const TOPICS = [
  "Fall Protection",
  "Electrical Safety",
  "Scaffolding",
  "Excavation Safety",
  "PPE Requirements",
  "Fire Prevention",
  "Hazard Communication",
  "Lockout/Tagout",
  "Confined Spaces",
  "Heat Illness Prevention",
  "Tool Safety",
  "Ladder Safety",
  "Crane Safety",
  "Housekeeping",
  "Emergency Procedures",
  "Other",
];

// ---------------------------------------------------------------------------
// Helpers (non-translated)
// ---------------------------------------------------------------------------

function getTopicLabel(topic: unknown): string {
  if (!topic) return "--";
  if (typeof topic === "string") return topic;
  if (typeof topic === "object" && topic !== null) {
    const obj = topic as Record<string, unknown>;
    return (obj.name as string) || JSON.stringify(topic);
  }
  return String(topic);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ToolboxTalksClientProps {
  talks: ToolboxTalkRow[];
  members: CompanyMember[];
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
}

export default function ToolboxTalksClient({
  talks,
  members,
  projects,
  userId,
  companyId,
}: ToolboxTalksClientProps) {
  const router = useRouter();
  const t = useTranslations("safety");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // ---------------------------------------------------------------------------
  // Constants (translated)
  // ---------------------------------------------------------------------------

  const STATUS_LABELS: Record<ToolboxTalkStatus, string> = {
    scheduled: t("talkStatusScheduled"),
    completed: t("talkStatusCompleted"),
    cancelled: t("talkStatusCancelled"),
  };

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "title", label: t("title"), required: true },
    { key: "description", label: t("description"), required: false },
    { key: "topic", label: t("topic"), required: false },
    { key: "scheduled_date", label: t("scheduledDate"), required: false, type: "date" },
    { key: "attendees_count", label: t("attendeesCount"), required: false, type: "number" },
    { key: "notes", label: t("notes"), required: false },
    { key: "project_name", label: "Project Name", required: false },
  ];

  const IMPORT_SAMPLE: Record<string, string>[] = [
    { title: "Fall Protection Training", description: "Review fall protection procedures and harness inspection", topic: "Fall Protection", scheduled_date: "2026-01-25", attendees_count: "15", notes: "All crew members must attend" },
    { title: "Excavation Safety", description: "Trench safety, shoring requirements, and competent person duties", topic: "Excavation Safety", scheduled_date: "2026-02-01", attendees_count: "8", notes: "Required before excavation starts" },
    { title: "Heat Illness Prevention", description: "Recognizing signs of heat stroke, water-rest-shade protocol", topic: "Heat Illness Prevention", scheduled_date: "2026-02-08", attendees_count: "22", notes: "Summer preparation" },
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

  function formatDateShort(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
    });
  }

  function getUserName(
    user: { id: string; full_name: string; email: string } | null | undefined
  ): string {
    if (!user) return t("unknown");
    return user.full_name || user.email || t("unknown");
  }

  // Filters
  const [statusFilter, setStatusFilter] = useState<ToolboxTalkStatus | "all">("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    topic: "",
    scheduled_date: new Date().toISOString().split("T")[0],
    project_id: "",
    attendees_count: 0,
    attendees: "",
    notes: "",
  });

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importProjectId, setImportProjectId] = useState("");

  // Detail / Edit / Delete modal state
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalkRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Compute summary counts
  const statusCounts = useMemo(() => {
    const counts = { scheduled: 0, completed: 0, cancelled: 0 };
    for (const tl of talks) {
      if (tl.status in counts) {
        counts[tl.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [talks]);

  // Filtered talks
  const filtered = useMemo(() => {
    let result = talks;

    if (statusFilter !== "all") {
      result = result.filter((tl) => tl.status === statusFilter);
    }

    if (topicFilter !== "all") {
      result = result.filter((tl) => getTopicLabel(tl.topic) === topicFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (tl) =>
          tl.title.toLowerCase().includes(term) ||
          tl.talk_number.toLowerCase().includes(term) ||
          (tl.description && tl.description.toLowerCase().includes(term)) ||
          getTopicLabel(tl.topic).toLowerCase().includes(term)
      );
    }

    return result;
  }, [talks, statusFilter, topicFilter, search]);

  // Create talk handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/safety/toolbox-talks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          topic: formData.topic || undefined,
          scheduled_date: formData.scheduled_date || undefined,
          project_id: formData.project_id || undefined,
          attendees_count: formData.attendees_count || undefined,
          attendees: formData.attendees || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateToolboxTalk"));
      }

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        topic: "",
        scheduled_date: new Date().toISOString().split("T")[0],
        project_id: "",
        attendees_count: 0,
        attendees: "",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToCreateToolboxTalk"));
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(talk: ToolboxTalkRow) {
    setSelectedTalk(talk);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedTalk(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedTalk) return;
    setEditData({
      title: selectedTalk.title,
      description: selectedTalk.description || "",
      topic: getTopicLabel(selectedTalk.topic) !== "--" ? getTopicLabel(selectedTalk.topic) : "",
      status: selectedTalk.status,
      scheduled_date: selectedTalk.scheduled_date
        ? selectedTalk.scheduled_date.split("T")[0]
        : "",
      project_id: selectedTalk.project_id || "",
      attendees_count: selectedTalk.attendees_count || 0,
      attendees: selectedTalk.attendees || "",
      notes: selectedTalk.notes || "",
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
    if (!selectedTalk) return;
    setSaving(true);
    setSaveError("");

    try {
      // Build payload with only changed fields
      const payload: Record<string, unknown> = {};
      if (editData.title !== selectedTalk.title) payload.title = editData.title;
      if (editData.description !== (selectedTalk.description || ""))
        payload.description = editData.description;
      const currentTopicLabel = getTopicLabel(selectedTalk.topic) !== "--" ? getTopicLabel(selectedTalk.topic) : "";
      if (editData.topic !== currentTopicLabel)
        payload.topic = editData.topic || null;
      if (editData.status !== selectedTalk.status) payload.status = editData.status;
      if (editData.project_id !== (selectedTalk.project_id || ""))
        payload.project_id = editData.project_id || null;
      if (editData.attendees_count !== (selectedTalk.attendees_count || 0))
        payload.attendees_count = editData.attendees_count;
      if (editData.attendees !== (selectedTalk.attendees || ""))
        payload.attendees = editData.attendees;
      if (editData.notes !== (selectedTalk.notes || ""))
        payload.notes = editData.notes;

      const dateVal = editData.scheduled_date as string;
      const existingDate = selectedTalk.scheduled_date
        ? selectedTalk.scheduled_date.split("T")[0]
        : "";
      if (dateVal !== existingDate) payload.scheduled_date = editData.scheduled_date;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/safety/toolbox-talks/${selectedTalk.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateToolboxTalk"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToUpdateToolboxTalk"));
    } finally {
      setSaving(false);
    }
  }

  // Delete talk via DELETE
  async function handleDelete() {
    if (!selectedTalk) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/safety/toolbox-talks/${selectedTalk.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteToolboxTalk"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDeleteToolboxTalk"));
    } finally {
      setSaving(false);
    }
  }

  // Import handler
  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "toolbox_talks", rows, project_id: importProjectId }),
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
          <h2>{t("toolboxTalks")}</h2>
          <p className="safety-header-sub">
            {t("talksTotalCount", { count: talks.length })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("newToolboxTalk")}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="safety-stats safety-stats-3">
        <div className="safety-stat-card stat-scheduled">
          <div className="safety-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.scheduled}</span>
            <span className="safety-stat-label">{t("talkStatusScheduled")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-completed">
          <div className="safety-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.completed}</span>
            <span className="safety-stat-label">{t("talkStatusCompleted")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-cancelled">
          <div className="safety-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.cancelled}</span>
            <span className="safety-stat-label">{t("talkStatusCancelled")}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="safety-filters">
        <div className="safety-search">
          <Search size={16} className="safety-search-icon" />
          <input
            type="text"
            placeholder={t("searchToolboxTalks")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="safety-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ToolboxTalkStatus | "all")}
        >
          <option value="all">{t("allStatus")}</option>
          {(Object.keys(STATUS_LABELS) as ToolboxTalkStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="safety-filter-select"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="all">{t("allTopics")}</option>
          {TOPICS.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="safety-empty">
          <div className="safety-empty-icon">
            <ClipboardList size={28} />
          </div>
          {talks.length === 0 ? (
            <>
              <h3>{t("noToolboxTalksYet")}</h3>
              <p>{t("noToolboxTalksYetDesc")}</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                {t("newToolboxTalk")}
              </button>
            </>
          ) : (
            <>
              <h3>{t("noMatchingToolboxTalks")}</h3>
              <p>{t("tryAdjustingFilters")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="safety-table-wrap">
          <table className="safety-table">
            <thead>
              <tr>
                <th>{t("talkNumber")}</th>
                <th>{t("title")}</th>
                <th>{t("topic")}</th>
                <th>{t("status")}</th>
                <th>{t("conductedBy")}</th>
                <th>{t("date")}</th>
                <th>{t("attendees")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((talk) => (
                <tr
                  key={talk.id}
                  onClick={() => openDetail(talk)}
                  className="safety-table-row"
                >
                  <td className="safety-number-cell">{talk.talk_number}</td>
                  <td className="safety-title-cell">{talk.title}</td>
                  <td className="safety-type-cell">{getTopicLabel(talk.topic)}</td>
                  <td>
                    <span className={`safety-status-badge status-${talk.status}`}>
                      {STATUS_LABELS[talk.status] ?? talk.status}
                    </span>
                  </td>
                  <td className="safety-person-cell">
                    {getUserName(talk.conductor)}
                  </td>
                  <td className="safety-date-cell">
                    {formatDateShort(talk.scheduled_date)}
                  </td>
                  <td className="safety-attendees-cell">
                    {talk.attendees_count || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Toolbox Talk Modal */}
      {showCreate && (
        <div className="safety-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>{t("newToolboxTalk")}</h3>
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
                  placeholder={t("titleOfToolboxTalk")}
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
                  placeholder={t("briefDescriptionCovered")}
                  rows={3}
                />
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">{t("topic")}</label>
                  <select
                    className="safety-form-select"
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({ ...formData, topic: e.target.value })
                    }
                  >
                    <option value="">{t("selectTopic")}</option>
                    {TOPICS.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("scheduledDate")}</label>
                  <input
                    type="date"
                    className="safety-form-input"
                    value={formData.scheduled_date}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_date: e.target.value })
                    }
                  />
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
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("expectedAttendees")}</label>
                  <input
                    type="number"
                    className="safety-form-input"
                    value={formData.attendees_count}
                    onChange={(e) =>
                      setFormData({ ...formData, attendees_count: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">{t("attendees")}</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.attendees}
                  onChange={(e) =>
                    setFormData({ ...formData, attendees: e.target.value })
                  }
                  placeholder={t("attendeesListPlaceholder")}
                  rows={2}
                />
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">{t("notes")}</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t("additionalNotes")}
                  rows={2}
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
                  disabled={creating || !formData.title.trim()}
                >
                  {creating ? t("creating") : t("createTalk")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedTalk && (
        <div className="safety-modal-overlay" onClick={closeDetail}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>
                {isEditing
                  ? t("editTalkNumber", { number: selectedTalk.talk_number })
                  : selectedTalk.talk_number}
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
                    <h3>{t("deleteToolboxTalk")}</h3>
                    <button
                      className="safety-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("deleteToolboxTalkConfirm", { number: selectedTalk.talk_number })}
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
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("title")}</label>
                    <div className="detail-value">{selectedTalk.title}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("status")}</label>
                    <div className="detail-value">
                      <span className={`safety-status-badge status-${selectedTalk.status}`}>
                        {STATUS_LABELS[selectedTalk.status] ?? selectedTalk.status}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTalk.description && (
                  <div className="detail-group">
                    <label className="detail-label">{t("description")}</label>
                    <div className="detail-value--multiline">{selectedTalk.description}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("topic")}</label>
                    <div className="detail-value">{getTopicLabel(selectedTalk.topic)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("scheduledDate")}</label>
                    <div className="detail-value">{formatDate(selectedTalk.scheduled_date)}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("project")}</label>
                    <div className="detail-value">{selectedTalk.project?.name || "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("conductedBy")}</label>
                    <div className="detail-value">{getUserName(selectedTalk.conductor)}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("attendeesCount")}</label>
                    <div className="detail-value">{selectedTalk.attendees_count || 0}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("created")}</label>
                    <div className="detail-value">{formatDate(selectedTalk.created_at)}</div>
                  </div>
                </div>

                {selectedTalk.attendees && (
                  <div className="detail-group">
                    <label className="detail-label">{t("attendees")}</label>
                    <div className="detail-value--multiline">{selectedTalk.attendees}</div>
                  </div>
                )}

                {selectedTalk.notes && (
                  <div className="detail-group">
                    <label className="detail-label">{t("notes")}</label>
                    <div className="detail-value--multiline">{selectedTalk.notes}</div>
                  </div>
                )}

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
                    rows={3}
                  />
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("status")}</label>
                    <select
                      className="safety-form-select"
                      value={(editData.status as string) || "scheduled"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {(Object.keys(STATUS_LABELS) as ToolboxTalkStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("topic")}</label>
                    <select
                      className="safety-form-select"
                      value={(editData.topic as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, topic: e.target.value })
                      }
                    >
                      <option value="">{t("selectTopic")}</option>
                      {TOPICS.map((tp) => (
                        <option key={tp} value={tp}>
                          {tp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("scheduledDate")}</label>
                    <input
                      type="date"
                      className="safety-form-input"
                      value={(editData.scheduled_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, scheduled_date: e.target.value })
                      }
                    />
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
                    <label className="safety-form-label">{t("attendeesCount")}</label>
                    <input
                      type="number"
                      className="safety-form-input"
                      value={(editData.attendees_count as number) || 0}
                      onChange={(e) =>
                        setEditData({ ...editData, attendees_count: parseInt(e.target.value) || 0 })
                      }
                      min={0}
                    />
                  </div>
                  <div className="safety-form-group">
                    <label className="safety-form-label">{t("attendees")}</label>
                    <input
                      type="text"
                      className="safety-form-input"
                      value={(editData.attendees as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, attendees: e.target.value })
                      }
                      placeholder={t("commaSeparatedNames")}
                    />
                  </div>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">{t("notes")}</label>
                  <textarea
                    className="safety-form-textarea"
                    value={(editData.notes as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, notes: e.target.value })
                    }
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
          entityName={t("toolboxTalkEntity")}
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
