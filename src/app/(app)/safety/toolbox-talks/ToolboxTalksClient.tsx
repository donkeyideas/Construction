"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ToolboxTalkStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", required: false },
  { key: "topic", label: "Topic", required: false },
  { key: "scheduled_date", label: "Scheduled Date", required: false, type: "date" },
  { key: "attendees_count", label: "Attendees Count", required: false, type: "number" },
  { key: "notes", label: "Notes", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Fall Protection Training", description: "Review fall protection procedures and harness inspection", topic: "Fall Protection", scheduled_date: "2026-01-25", attendees_count: "15", notes: "All crew members must attend" },
  { title: "Excavation Safety", description: "Trench safety, shoring requirements, and competent person duties", topic: "Excavation Safety", scheduled_date: "2026-02-01", attendees_count: "8", notes: "Required before excavation starts" },
  { title: "Heat Illness Prevention", description: "Recognizing signs of heat stroke, water-rest-shade protocol", topic: "Heat Illness Prevention", scheduled_date: "2026-02-08", attendees_count: "22", notes: "Summer preparation" },
];

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
  if (!user) return "Unknown";
  return user.full_name || user.email || "Unknown";
}

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
    for (const t of talks) {
      if (t.status in counts) {
        counts[t.status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [talks]);

  // Filtered talks
  const filtered = useMemo(() => {
    let result = talks;

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (topicFilter !== "all") {
      result = result.filter((t) => getTopicLabel(t.topic) === topicFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.talk_number.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term)) ||
          getTopicLabel(t.topic).toLowerCase().includes(term)
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
        throw new Error(data.error || "Failed to create toolbox talk");
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
      setCreateError(err instanceof Error ? err.message : "Failed to create toolbox talk");
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
        throw new Error(data.error || "Failed to update toolbox talk");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update toolbox talk");
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
        throw new Error(data.error || "Failed to delete toolbox talk");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete toolbox talk");
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
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <div className="safety-page">
      {/* Header */}
      <div className="safety-header">
        <div>
          <h2>Toolbox Talks</h2>
          <p className="safety-header-sub">
            {talks.length} talk{talks.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New Toolbox Talk
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
            <span className="safety-stat-label">Scheduled</span>
          </div>
        </div>
        <div className="safety-stat-card stat-completed">
          <div className="safety-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.completed}</span>
            <span className="safety-stat-label">Completed</span>
          </div>
        </div>
        <div className="safety-stat-card stat-cancelled">
          <div className="safety-stat-icon">
            <ClipboardList size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{statusCounts.cancelled}</span>
            <span className="safety-stat-label">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="safety-filters">
        <div className="safety-search">
          <Search size={16} className="safety-search-icon" />
          <input
            type="text"
            placeholder="Search toolbox talks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="safety-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ToolboxTalkStatus | "all")}
        >
          <option value="all">All Status</option>
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
          <option value="all">All Topics</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
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
              <h3>No toolbox talks yet</h3>
              <p>Schedule your first toolbox talk to get started.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                New Toolbox Talk
              </button>
            </>
          ) : (
            <>
              <h3>No matching toolbox talks</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="safety-table-wrap">
          <table className="safety-table">
            <thead>
              <tr>
                <th>Talk #</th>
                <th>Title</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Conducted By</th>
                <th>Date</th>
                <th>Attendees</th>
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
              <h3>New Toolbox Talk</h3>
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
                  placeholder="Title of the toolbox talk"
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
                  placeholder="Brief description of what will be covered..."
                  rows={3}
                />
              </div>

              <div className="safety-form-row">
                <div className="safety-form-group">
                  <label className="safety-form-label">Topic</label>
                  <select
                    className="safety-form-select"
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({ ...formData, topic: e.target.value })
                    }
                  >
                    <option value="">Select topic...</option>
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Scheduled Date</label>
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
                  <label className="safety-form-label">Expected Attendees</label>
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
                <label className="safety-form-label">Attendees</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.attendees}
                  onChange={(e) =>
                    setFormData({ ...formData, attendees: e.target.value })
                  }
                  placeholder="List of attendees (names, comma-separated)..."
                  rows={2}
                />
              </div>

              <div className="safety-form-group">
                <label className="safety-form-label">Notes</label>
                <textarea
                  className="safety-form-textarea"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={2}
                />
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
                  {creating ? "Creating..." : "Create Talk"}
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
                  ? `Edit ${selectedTalk.talk_number}`
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
                    <h3>Delete Toolbox Talk</h3>
                    <button
                      className="safety-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      Are you sure you want to delete toolbox talk{" "}
                      <strong>{selectedTalk.talk_number}</strong>? This action
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
              <div style={{ padding: "1.25rem", pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Title</label>
                    <div className="detail-value">{selectedTalk.title}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Status</label>
                    <div className="detail-value">
                      <span className={`safety-status-badge status-${selectedTalk.status}`}>
                        {STATUS_LABELS[selectedTalk.status] ?? selectedTalk.status}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTalk.description && (
                  <div className="detail-group">
                    <label className="detail-label">Description</label>
                    <div className="detail-value--multiline">{selectedTalk.description}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Topic</label>
                    <div className="detail-value">{getTopicLabel(selectedTalk.topic)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Scheduled Date</label>
                    <div className="detail-value">{formatDate(selectedTalk.scheduled_date)}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Project</label>
                    <div className="detail-value">{selectedTalk.project?.name || "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Conducted By</label>
                    <div className="detail-value">{getUserName(selectedTalk.conductor)}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Attendees Count</label>
                    <div className="detail-value">{selectedTalk.attendees_count || 0}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Created</label>
                    <div className="detail-value">{formatDate(selectedTalk.created_at)}</div>
                  </div>
                </div>

                {selectedTalk.attendees && (
                  <div className="detail-group">
                    <label className="detail-label">Attendees</label>
                    <div className="detail-value--multiline">{selectedTalk.attendees}</div>
                  </div>
                )}

                {selectedTalk.notes && (
                  <div className="detail-group">
                    <label className="detail-label">Notes</label>
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
                    rows={3}
                  />
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Status</label>
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
                    <label className="safety-form-label">Topic</label>
                    <select
                      className="safety-form-select"
                      value={(editData.topic as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, topic: e.target.value })
                      }
                    >
                      <option value="">Select topic...</option>
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="safety-form-row">
                  <div className="safety-form-group">
                    <label className="safety-form-label">Scheduled Date</label>
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
                    <label className="safety-form-label">Attendees Count</label>
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
                    <label className="safety-form-label">Attendees</label>
                    <input
                      type="text"
                      className="safety-form-input"
                      value={(editData.attendees as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, attendees: e.target.value })
                      }
                      placeholder="Comma-separated names..."
                    />
                  </div>
                </div>

                <div className="safety-form-group">
                  <label className="safety-form-label">Notes</label>
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
          entityName="Toolbox Talk"
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
