"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, X, Pencil, Trash2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

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

function formatDate(dateStr: string, loc: string): string {
  return new Date(dateStr).toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AnnouncementsClient({ announcements }: Props) {
  const router = useRouter();
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

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
        setSaveError(data.error || t("failedSave"));
        return;
      }

      setIsEditing(false);
      closeDetail();
      router.refresh();
    } catch {
      setSaveError(t("networkError"));
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
        setSaveError(data.error || t("failedDelete"));
        return;
      }

      closeDetail();
      setSuccess(t("announcementDeleted"));
      router.refresh();
    } catch {
      setSaveError(t("networkError"));
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
        setError(data.error || t("failedCreate"));
        return;
      }

      setSuccess(t("announcementCreated"));
      setTitle("");
      setContent("");
      setTargetAudience("all");
      setShowCreate(false);
      router.refresh();
    } catch {
      setError(t("networkError"));
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
        setError(data.error || t("failedUpdate"));
        return;
      }

      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>{t("platformAnnouncements")}</h2>
          <p className="admin-header-sub">
            {t("manageNotifications")}
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            className="sa-action-btn primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} /> {t("newAnnouncement")}
          </button>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: "400px" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Megaphone size={18} />
          </div>
          <div className="admin-stat-label">{t("total")}</div>
          <div className="admin-stat-value">{announcements.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Megaphone size={18} />
          </div>
          <div className="admin-stat-label">{t("active")}</div>
          <div className="admin-stat-value">{activeCount}</div>
        </div>
      </div>

      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t("title")}</th>
              <th>{t("audience")}</th>
              <th>{t("status")}</th>
              <th>{t("created")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  {t("noAnnouncementsYet")}
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
                      <span className="sa-badge sa-badge-green">{t("active")}</span>
                    ) : (
                      <span className="sa-badge" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                        {t("inactive")}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {formatDate(a.created_at, dateLocale)}
                  </td>
                  <td>
                    <button
                      className={`sa-action-btn ${a.is_active ? "danger" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleActive(a.id, a.is_active); }}
                      disabled={toggling === a.id}
                      style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                    >
                      {a.is_active ? t("deactivate") : t("activate")}
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
              <h3>{t("newAnnouncement")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="ticket-form">
              <div style={{ padding: "1.2rem" }}>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  {t("announcementNote")}
                </p>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("titleRequired")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    placeholder={t("announcementTitle")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("contentRequired")}</label>
                  <textarea
                    className="ticket-form-textarea"
                    placeholder={t("announcementContent")}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={4}
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("targetAudience")}</label>
                  <select
                    className="ticket-form-select"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  >
                    <option value="all">{t("allUsersOption")}</option>
                    <option value="enterprise">{t("enterpriseOnly")}</option>
                    <option value="professional">{t("professionalOnly")}</option>
                    <option value="starter">{t("starterOnly")}</option>
                  </select>
                </div>
              </div>
              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? t("creating") : t("createAnnouncement")}
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
                    {selectedAnn.is_active ? t("active") : t("inactive")}
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button className="ticket-modal-close" onClick={startEditing} title={t("edit")}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ticket-modal-close"
                      onClick={() => setShowDeleteConfirm(true)}
                      title={t("deleteAnnouncement")}
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
                  {t("deleteConfirm", { title: selectedAnn.title })}
                </p>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: "var(--color-red)" }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? t("deleting") : t("deleteAnnouncement")}
                  </button>
                </div>
              </div>
            )}

            {/* ---- Edit Mode ---- */}
            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("title")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={editData.title as string ?? ""}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("contentRequired").replace(/\s*\*$/, "")}</label>
                  <textarea
                    className="ticket-form-textarea"
                    rows={4}
                    value={editData.content as string ?? ""}
                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  />
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("targetAudience")}</label>
                    <select
                      className="ticket-form-select"
                      value={editData.target_audience as string ?? "all"}
                      onChange={(e) => setEditData({ ...editData, target_audience: e.target.value })}
                    >
                      <option value="all">{t("allUsersOption")}</option>
                      <option value="enterprise">{t("enterpriseOnly")}</option>
                      <option value="professional">{t("professionalOnly")}</option>
                      <option value="starter">{t("starterOnly")}</option>
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("active")}</label>
                    <select
                      className="ticket-form-select"
                      value={editData.is_active ? "true" : "false"}
                      onChange={(e) => setEditData({ ...editData, is_active: e.target.value === "true" })}
                    >
                      <option value="true">{t("active")}</option>
                      <option value="false">{t("inactive")}</option>
                    </select>
                  </div>
                </div>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                    {t("cancel")}
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}

            {/* ---- View Mode ---- */}
            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-group" style={{ marginBottom: 4 }}>
                  <label className="detail-label">{t("title")}</label>
                  <div className="detail-value">{selectedAnn.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("contentRequired").replace(/\s*\*$/, "")}</label>
                  <div className="detail-value" style={{ whiteSpace: "pre-wrap" }}>{selectedAnn.content}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("targetAudience")}</label>
                    <div className="detail-value">
                      <span className="sa-badge sa-badge-blue" style={{ textTransform: "capitalize" }}>
                        {selectedAnn.target_audience}
                      </span>
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("status")}</label>
                    <div className="detail-value">
                      {selectedAnn.is_active ? (
                        <span className="sa-badge sa-badge-green">{t("active")}</span>
                      ) : (
                        <span className="sa-badge" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                          {t("inactive")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("created")}</label>
                    <div className="detail-value" style={{ borderBottom: "none" }}>{formatDate(selectedAnn.created_at, dateLocale)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("published")}</label>
                    <div className="detail-value" style={{ borderBottom: "none" }}>
                      {selectedAnn.published_at ? formatDate(selectedAnn.published_at, dateLocale) : "---"}
                    </div>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeDetail}>
                    {t("close")}
                  </button>
                  <button type="button" className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} /> {t("edit")}
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
