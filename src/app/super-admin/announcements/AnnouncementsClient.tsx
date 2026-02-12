"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, X } from "lucide-react";

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

  const activeCount = announcements.filter((a) => a.is_active).length;

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
                  style={{ opacity: toggling === a.id ? 0.5 : 1 }}
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
                      onClick={() => toggleActive(a.id, a.is_active)}
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

      {showCreate && (
        <>
          <div className="invite-modal-overlay" onClick={() => setShowCreate(false)} />
          <div className="invite-modal">
            <button className="invite-modal-close" onClick={() => setShowCreate(false)}>
              <X size={18} />
            </button>
            <div className="invite-modal-title">New Announcement</div>
            <div className="invite-modal-desc">
              This announcement will be shown to platform users based on the selected audience.
            </div>
            <form onSubmit={handleCreate}>
              <div className="invite-form-group">
                <label className="invite-form-label">Title</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="Announcement title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">Content</label>
                <textarea
                  className="invite-form-input"
                  placeholder="Announcement content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">Target Audience</label>
                <select
                  className="invite-form-select"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="enterprise">Enterprise Only</option>
                  <option value="professional">Professional Only</option>
                  <option value="starter">Starter Only</option>
                </select>
              </div>
              <div className="invite-modal-footer">
                <button
                  type="button"
                  className="sa-action-btn"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sa-action-btn primary"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
