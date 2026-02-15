"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Eye, EyeOff, X, Pencil } from "lucide-react";

interface CmsPage {
  id: string;
  page_slug: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string;
}

interface Props {
  pages: CmsPage[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContentClient({ pages }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedPage, setSelectedPage] = useState<CmsPage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{ title: string; status: string }>({ title: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status === "draft").length;

  async function toggleStatus(slug: string, currentStatus: string) {
    setUpdating(slug);
    setError("");
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const res = await fetch(`/api/super-admin/content/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update page status.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  function closeDetail() {
    setSelectedPage(null);
    setIsEditing(false);
    setEditData({ title: "", status: "" });
    setSaveError("");
  }

  function startEditing() {
    if (!selectedPage) return;
    setEditData({ title: selectedPage.title, status: selectedPage.status });
    setIsEditing(true);
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedPage) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/super-admin/content/${selectedPage.page_slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editData.title, status: editData.status }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Failed to save changes.");
        return;
      }

      setIsEditing(false);
      setSelectedPage(null);
      router.refresh();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>CMS Pages</h2>
          <p className="admin-header-sub">
            Manage marketing pages for the platform website
          </p>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <FileText size={18} />
          </div>
          <div className="admin-stat-label">Total Pages</div>
          <div className="admin-stat-value">{pages.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Eye size={18} />
          </div>
          <div className="admin-stat-label">Published</div>
          <div className="admin-stat-value">{publishedCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <EyeOff size={18} />
          </div>
          <div className="admin-stat-label">Draft</div>
          <div className="admin-stat-value">{draftCount}</div>
        </div>
      </div>

      {error && <div className="invite-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Published</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No CMS pages found
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr
                  key={page.id}
                  style={{ opacity: updating === page.page_slug ? 0.5 : 1, cursor: "pointer" }}
                  onClick={() => setSelectedPage(page)}
                >
                  <td style={{ fontWeight: 500 }}>{page.title}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                    /{page.page_slug}
                  </td>
                  <td>
                    <span className={`sa-cms-status ${page.status === "published" ? "sa-cms-published" : "sa-cms-draft"}`}>
                      {page.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {page.published_at ? formatDate(page.published_at) : "-"}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {formatDate(page.updated_at)}
                  </td>
                  <td>
                    <button
                      className={`sa-action-btn ${page.status === "published" ? "" : "primary"}`}
                      onClick={(e) => { e.stopPropagation(); toggleStatus(page.page_slug, page.status); }}
                      disabled={updating === page.page_slug}
                      style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                    >
                      {page.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail / Edit Modal */}
      {selectedPage && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            {/* Modal Header */}
            <div className="ticket-modal-header">
              <h3>{selectedPage.title}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && (
                  <button className="ticket-modal-close" onClick={startEditing} title="Edit">
                    <Pencil size={16} />
                  </button>
                )}
                <button className="ticket-modal-close" onClick={closeDetail} title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {/* View Mode */}
            {!isEditing && (
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-group">
                  <label className="detail-label">Slug</label>
                  <div className="detail-value" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    /{selectedPage.page_slug}
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Status</label>
                  <div className="detail-value">
                    <span className={`sa-cms-status ${selectedPage.status === "published" ? "sa-cms-published" : "sa-cms-draft"}`}>
                      {selectedPage.status}
                    </span>
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Published At</label>
                  <div className="detail-value">
                    {selectedPage.published_at ? formatDate(selectedPage.published_at) : "—"}
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Last Updated</label>
                  <div className="detail-value">{formatDate(selectedPage.updated_at)}</div>
                </div>

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

            {/* Edit Mode */}
            {isEditing && (
              <div style={{ padding: "1.25rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Status</label>
                  <select
                    className="ticket-form-select"
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
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
          </div>
        </div>
      )}
    </>
  );
}
