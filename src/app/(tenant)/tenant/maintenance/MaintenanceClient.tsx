"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Wrench, X, Pencil } from "lucide-react";

interface MaintenanceRequest {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC / Heating & Cooling" },
  { value: "appliance", label: "Appliance" },
  { value: "structural", label: "Structural" },
  { value: "general", label: "General / Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

function getStatusBadge(status: string): string {
  switch (status) {
    case "submitted":
      return "badge badge-blue";
    case "assigned":
    case "in_progress":
      return "badge badge-amber";
    case "completed":
    case "closed":
      return "badge badge-green";
    case "cancelled":
      return "badge badge-red";
    default:
      return "badge badge-blue";
  }
}

function getPriorityBadge(priority: string): string {
  switch (priority) {
    case "emergency":
    case "high":
      return "badge badge-red";
    case "medium":
      return "badge badge-amber";
    case "low":
      return "badge badge-green";
    default:
      return "badge badge-blue";
  }
}

function getCategoryLabel(value: string | null): string {
  return (
    CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "General"
  );
}

function isEditable(status: string): boolean {
  return status === "submitted" || status === "assigned";
}

export default function MaintenanceClient({
  requests,
}: {
  requests: MaintenanceRequest[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [editPriority, setEditPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal(req: MaintenanceRequest) {
    setSelected(req);
    setEditing(false);
    setError("");
  }

  function closeModal() {
    setSelected(null);
    setEditing(false);
    setError("");
  }

  function startEdit() {
    if (!selected) return;
    setEditTitle(selected.title ?? "");
    setEditDescription(selected.description ?? "");
    setEditCategory(selected.category ?? "general");
    setEditPriority(selected.priority ?? "medium");
    setEditing(true);
    setError("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!editTitle.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/tenant/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          title: editTitle,
          description: editDescription,
          category: editCategory,
          priority: editPriority,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update request");
      }

      closeModal();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Maintenance Requests</h2>
          <p className="fin-header-sub">
            Track your maintenance requests and their progress.
          </p>
        </div>
        <Link
          href="/tenant/maintenance/new"
          className="ui-btn ui-btn-md ui-btn-primary"
        >
          <Plus size={16} />
          Submit Request
        </Link>
      </div>

      {requests.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {requests.map((request) => (
            <div
              key={request.id}
              className="card"
              style={{ padding: 20, cursor: "pointer" }}
              onClick={() => openModal(request)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      marginBottom: 6,
                    }}
                  >
                    {request.title ?? "Untitled Request"}
                  </div>
                  {request.description && (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        marginBottom: 8,
                      }}
                    >
                      {request.description.length > 150
                        ? request.description.substring(0, 150) + "..."
                        : request.description}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                    }}
                  >
                    <span>
                      Submitted{" "}
                      {request.created_at
                        ? new Date(request.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "--"}
                    </span>
                    <span>{getCategoryLabel(request.category)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {request.priority && (
                    <span className={getPriorityBadge(request.priority)}>
                      {request.priority}
                    </span>
                  )}
                  <span className={getStatusBadge(request.status)}>
                    {request.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <Wrench size={48} />
            </div>
            <div className="fin-empty-title">No Maintenance Requests</div>
            <div className="fin-empty-desc">
              You have not submitted any maintenance requests. Use the button
              above to report an issue.
            </div>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selected && (
        <div className="tenant-modal-overlay" onClick={closeModal}>
          <div
            className="tenant-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tenant-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                {editing ? "Edit Request" : "Request Details"}
              </h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!editing && isEditable(selected.status) && (
                  <button
                    className="ui-btn ui-btn-sm ui-btn-outline"
                    onClick={startEdit}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                )}
                <button
                  className="tenant-modal-close"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {error && (
              <div className="tenant-alert tenant-alert-error">{error}</div>
            )}

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="tenant-field">
                  <label className="tenant-label">Issue Title *</label>
                  <input
                    type="text"
                    className="invite-form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="tenant-field">
                    <label className="tenant-label">Category</label>
                    <select
                      className="invite-form-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      disabled={saving}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="tenant-field">
                    <label className="tenant-label">Priority</label>
                    <select
                      className="invite-form-select"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      disabled={saving}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="tenant-field">
                  <label className="tenant-label">Description</label>
                  <textarea
                    className="invite-form-input"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    style={{ resize: "vertical" }}
                    disabled={saving}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "flex-end",
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    className="ui-btn ui-btn-md ui-btn-outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ui-btn ui-btn-md ui-btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">Title</span>
                  <span>{selected.title ?? "Untitled"}</span>
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">Status</span>
                  <span className={getStatusBadge(selected.status)}>
                    {selected.status?.replace("_", " ")}
                  </span>
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">Priority</span>
                  {selected.priority ? (
                    <span className={getPriorityBadge(selected.priority)}>
                      {selected.priority}
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>--</span>
                  )}
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">Category</span>
                  <span>{getCategoryLabel(selected.category)}</span>
                </div>
                <div className="tenant-detail-row">
                  <span className="tenant-detail-label">Submitted</span>
                  <span>
                    {selected.created_at
                      ? new Date(selected.created_at).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )
                      : "--"}
                  </span>
                </div>
                {selected.updated_at &&
                  selected.updated_at !== selected.created_at && (
                    <div className="tenant-detail-row">
                      <span className="tenant-detail-label">Last Updated</span>
                      <span>
                        {new Date(selected.updated_at).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  )}

                <div style={{ marginTop: 16 }}>
                  <span className="tenant-detail-label">Description</span>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selected.description || (
                      <span
                        style={{
                          color: "var(--muted)",
                          fontStyle: "italic",
                        }}
                      >
                        No description provided.
                      </span>
                    )}
                  </div>
                </div>

                {!isEditable(selected.status) && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(100,100,100,0.08)",
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                    }}
                  >
                    This request is{" "}
                    <strong>{selected.status?.replace("_", " ")}</strong> and
                    can no longer be edited.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
