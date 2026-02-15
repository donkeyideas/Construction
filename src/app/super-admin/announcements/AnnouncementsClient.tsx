"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, X, Pencil, Trash2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  is_active: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  announcements: Announcement[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AnnouncementsClient({ announcements }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");

  // Detail modal state
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeCount = announcements.filter((a) => a.is_active).length;

  function openDetail(a: Announcement) {
    setSelectedAnn(a);
    setIsEditing(false);
    setEditData({});
    setSaveError("");
    setShowDeleteConfirm(false);
  }

  function closeDetail() {
    setSelectedAnn(null);
    setIsEditing(false);
    setEditData({});
    setSaveError("");
    setShowDeleteConfirm(false);
  }

  function startEditing() {
    if (!selectedAnn) return;
    setEditData({
      title: selectedAnn.title,
      content: selectedAnn.content,
      target_audience: selectedAnn.target_audience,
      is_active: selectedAnn.is_active,
    });
    setIsEditing(true);
    setSaveError("");
    setShowDeleteConfirm(false);
  }

  async function handleSave() {
    if (!selectedAnn) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/super-admin/announcements/${selectedAnn.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Failed to save changes.");
        return;
      }

      setIsEditing(false);
      closeDetail();
      router.refresh();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedAnn) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/super-admin/announcements/${selectedAnn.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Failed to delete announcement.");
        return;
      }

      closeDetail();
      setSuccess("Announcement deleted.");
      router.refresh();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/super-admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, target_audience: targetAudience }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create announcement.");
        return;
      }

      setSuccess("Announcement created successfully.");
      setTitle("");
      setContent("");
      setTargetAudience("all");
      setShowCreate(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    setToggling(id);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update announcement.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>Platform Announcements</h2>
          <p className="admin-header-sub">
            Manage notifications shown to all platform users
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            className="sa-action-btn primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} /> New Announcement
          </button>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: "400px" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Megaphone size={18} />
          </div>
          <div className="admin-stat-label">Total</div>
          <div className="admin-stat-value">{announcements.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Megaphone size={18} />
          </div>
          <div className="admin-stat-label">Active</div>
          <div className="admin-stat-value">{activeCount}</div>
        </div>
      </div>

      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Audience</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No announcements yet
                </td>
              </tr>
            ) : (
              announcements.map((a) => (
                <tr
                  key={a.id}
                  style={{ opacity: toggling === a.id ? 0.5 : 1, cursor: "pointer" }}
                  onClick={() => openDetail(a)}
                >
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.content}
                    </div>
                  </td>
                  <td>
                    <span className="sa-badge sa-badge-blue" style={{ textTransform: "capitalize" }}>
                      {a.target_audience}
                    </span>
                  </td>
                  <td>
                    {a.is_active ? (
                      <span className="sa-badge sa-badge-green">Active</span>
                    ) : (
                      <span className="sa-badge" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {formatDate(a.created_at)}
                  </td>
                  <td>
                    <button
                      className={`sa-action-btn ${a.is_active ? "danger" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleActive(a.id, a.is_active); }}
                      disabled={toggling === a.id}
                      style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                    >
                      {a.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>New Announcement</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="ticket-form">
              <div style={{ padding: "1.2rem" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  This announcement will be shown to platform users based on the selected audience.
                </p>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    placeholder="Announcement title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Content *</label>
                  <textarea
                    className="ticket-form-textarea"
                    placeholder="Announcement content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={4}
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Target Audience</label>
                  <select
                    className="ticket-form-select"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  >
                    <option value="all">All Users</option>
                    <option value="enterprise">Enterprise Only</option>
                    <option value="professional">Professional Only</option>
                    <option value="starter">Starter Only</option>
                  </select>
                </div>
              </div>
              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAnn && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            {/* Modal Header */}
            <div className="ticket-modal-header">
              <h3>
                {selectedAnn.title}
                {!isEditing && (
                  <span
                    className={selectedAnn.is_active ? "sa-badge sa-badge-green" : "sa-badge"}
                    style={{
                      marginLeft: 10,
                      fontSize: "0.78rem",
                      ...(!selectedAnn.is_active ? { background: "var(--surface)", color: "var(--muted)" } : {}),
                    }}
                  >
                    {selectedAnn.is_active ? "Active" : "Inactive"}
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button className="ticket-modal-close" onClick={startEditing} title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ticket-modal-close"
                      onClick={() => setShowDeleteConfirm(true)}
                      title="Delete"
                      style={{ color: "var(--color-red)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button className="ticket-modal-close" onClick={closeDetail}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {/* ---- Delete Confirmation ---- */}
            {showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <p style={{ marginBottom: 16, fontWeight: 500 }}>
                  Are you sure you want to delete announcement{" "}
                  <strong>{selectedAnn.title}</strong>? This action cannot be undone.
                </p>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: "var(--color-red)" }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? "Deleting..." : "Delete Announcement"}
                  </button>
                </div>
              </div>
            )}

            {/* ---- Edit Mode ---- */}
            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={editData.title as string ?? ""}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Content</label>
                  <textarea
                    className="ticket-form-textarea"
                    rows={4}
                    value={editData.content as string ?? ""}
                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  />
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Target Audience</label>
                    <select
                      className="ticket-form-select"
                      value={editData.target_audience as string ?? "all"}
                      onChange={(e) => setEditData({ ...editData, target_audience: e.target.value })}
                    >
                      <option value="all">All Users</option>
                      <option value="enterprise">Enterprise Only</option>
                      <option value="professional">Professional Only</option>
                      <option value="starter">Starter Only</option>
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Active</label>
                    <select
                      className="ticket-form-select"
                      value={editData.is_active ? "true" : "false"}
                      onChange={(e) => setEditData({ ...editData, is_active: e.target.value === "true" })}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ---- View Mode ---- */}
            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-group" style={{ marginBottom: 4 }}>
                  <label className="detail-label">Title</label>
                  <div className="detail-value">{selectedAnn.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Content</label>
                  <div className="detail-value" style={{ whiteSpace: "pre-wrap" }}>{selectedAnn.content}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Target Audience</label>
                    <div className="detail-value">
                      <span className="sa-badge sa-badge-blue" style={{ textTransform: "capitalize" }}>
                        {selectedAnn.target_audience}
                      </span>
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Status</label>
                    <div className="detail-value">
                      {selectedAnn.is_active ? (
                        <span className="sa-badge sa-badge-green">Active</span>
                      ) : (
                        <span className="sa-badge" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Created</label>
                    <div className="detail-value">{formatDate(selectedAnn.created_at)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Published</label>
                    <div className="detail-value">
                      {selectedAnn.published_at ? formatDate(selectedAnn.published_at) : "---"}
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeDetail}>
                    Close
                  </button>
                  <button type="button" className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} /> Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
