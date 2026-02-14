"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Hash,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Submittal {
  id: string;
  submittal_number: string;
  title: string;
  spec_section: string | null;
  status: string;
  submitted_by: string | null;
  reviewer_id: string | null;
  due_date: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  created_at: string;
  updated_at: string;
  projects: { name: string; code: string } | null;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface CompanyMember {
  user_id: string;
  role: string;
  user: { full_name: string | null; email: string | null } | null;
}

interface KpiData {
  totalCount: number;
  pendingCount: number;
  underReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
}

interface Props {
  rows: Submittal[];
  kpi: KpiData;
  userMap: Record<string, string>;
  projects: Project[];
  members: CompanyMember[];
  activeStatus: string | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusBadge: Record<string, string> = {
  pending: "inv-status inv-status-pending",
  under_review: "inv-status inv-status-draft",
  approved: "inv-status inv-status-paid",
  rejected: "inv-status inv-status-overdue",
  resubmit: "inv-status inv-status-pending",
};

const statuses = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Under Review", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "resubmit", label: "Resubmit" },
];

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/submittals";
  return `/projects/submittals?status=${status}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "spec_section", label: "Spec Section", required: false },
  { key: "due_date", label: "Due Date", required: false, type: "date" },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Structural Steel Shop Drawings", spec_section: "05 12 00", due_date: "2026-03-01" },
  { title: "HVAC Equipment Submittals", spec_section: "23 05 00", due_date: "2026-03-15" },
  { title: "Curtain Wall System", spec_section: "08 44 00", due_date: "2026-04-01" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubmittalsClient({
  rows,
  kpi,
  userMap,
  projects,
  members,
  activeStatus,
}: Props) {
  const router = useRouter();
  const now = new Date();

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    spec_section: "",
    due_date: "",
    reviewer_id: "",
  });

  const [showImport, setShowImport] = useState(false);

  // Detail / Edit / Delete modal
  const [selected, setSelected] = useState<Submittal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function daysOpen(createdAt: string, status: string, reviewedAt: string | null): number {
    const start = new Date(createdAt);
    const end = (status === "approved" || status === "rejected") && reviewedAt ? new Date(reviewedAt) : now;
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  function isOverdue(dueDate: string | null, status: string): boolean {
    if (!dueDate || status === "approved" || status === "rejected") return false;
    return new Date(dueDate) < now;
  }

  async function handleImport(importRows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "submittals", rows: importRows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // ---- Create handler ----
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/projects/submittals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id,
          title: formData.title,
          spec_section: formData.spec_section || undefined,
          due_date: formData.due_date || undefined,
          reviewer_id: formData.reviewer_id || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create submittal");
      }

      setFormData({ project_id: "", title: "", spec_section: "", due_date: "", reviewer_id: "" });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create submittal");
    } finally {
      setCreating(false);
    }
  }

  // ---- Detail modal helpers ----
  function openDetail(sub: Submittal) {
    setSelected(sub);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function closeDetail() {
    setSelected(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function startEditing() {
    if (!selected) return;
    setIsEditing(true);
    setSaveError("");
    setEditData({
      title: selected.title,
      spec_section: selected.spec_section ?? "",
      status: selected.status,
      reviewer_id: selected.reviewer_id ?? "",
      due_date: selected.due_date ?? "",
      review_comments: selected.review_comments ?? "",
    });
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/projects/submittals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...editData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update submittal");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);

    try {
      const res = await fetch("/api/projects/submittals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete submittal");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Submittals</h2>
          <p className="fin-header-sub">
            Track, review, and manage submittals across all projects
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} /> Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Submittal
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Hash size={18} /></div>
          <span className="fin-kpi-label">Total</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><Clock size={18} /></div>
          <span className="fin-kpi-label">Pending</span>
          <span className="fin-kpi-value">{kpi.pendingCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><ClipboardList size={18} /></div>
          <span className="fin-kpi-label">Under Review</span>
          <span className="fin-kpi-value">{kpi.underReviewCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><CheckCircle2 size={18} /></div>
          <span className="fin-kpi-label">Approved</span>
          <span className="fin-kpi-value">{kpi.approvedCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><XCircle size={18} /></div>
          <span className="fin-kpi-label">Rejected</span>
          <span className="fin-kpi-value">{kpi.rejectedCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              (activeStatus || "all") === s.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="fin-chart-card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>SUB #</th>
              <th>TITLE</th>
              <th>PROJECT</th>
              <th>SPEC SECTION</th>
              <th>SUBMITTED BY</th>
              <th>REVIEWER</th>
              <th>DUE DATE</th>
              <th>DAYS OPEN</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                  No submittals found
                </td>
              </tr>
            ) : (
              rows.map((sub) => {
                const overdue = isOverdue(sub.due_date, sub.status);
                return (
                  <tr
                    key={sub.id}
                    onClick={() => openDetail(sub)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 600 }}>{sub.submittal_number}</td>
                    <td>
                      <div>{sub.title}</div>
                    </td>
                    <td>{sub.projects?.code ?? sub.projects?.name ?? "—"}</td>
                    <td style={{ color: "var(--muted)" }}>{sub.spec_section ?? "—"}</td>
                    <td>{sub.submitted_by ? (userMap[sub.submitted_by] ?? "—") : "—"}</td>
                    <td>{sub.reviewer_id ? (userMap[sub.reviewer_id] ?? "—") : "—"}</td>
                    <td style={{ color: overdue ? "var(--color-red)" : undefined }}>
                      {sub.due_date ? formatDate(sub.due_date) : "—"}
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {daysOpen(sub.created_at, sub.status, sub.reviewed_at)}d
                    </td>
                    <td>
                      <span className={statusBadge[sub.status] ?? "inv-status"}>
                        {sub.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Submittal</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Project *</label>
                <select
                  className="form-select"
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Structural Steel Shop Drawings"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Spec Section</label>
                  <input
                    className="form-input"
                    placeholder="e.g. 05 12 00"
                    value={formData.spec_section}
                    onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reviewer</label>
                <select
                  className="form-select"
                  value={formData.reviewer_id}
                  onChange={(e) => setFormData({ ...formData, reviewer_id: e.target.value })}
                >
                  <option value="">Select reviewer...</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.full_name ?? m.user?.email ?? m.user_id}
                    </option>
                  ))}
                </select>
              </div>
              {createError && (
                <p style={{ color: "var(--color-red)", fontSize: "0.85rem" }}>{createError}</p>
              )}
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Submittal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{selected.submittal_number} — {selected.title}</h3>
              <button className="modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {!isEditing ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem", marginBottom: "16px" }}>
                  <div><span style={{ color: "var(--muted)" }}>Project:</span> {selected.projects?.name ?? "—"}</div>
                  <div><span style={{ color: "var(--muted)" }}>Spec Section:</span> {selected.spec_section ?? "—"}</div>
                  <div><span style={{ color: "var(--muted)" }}>Status:</span> <span className={statusBadge[selected.status] ?? ""}>{selected.status.replace(/_/g, " ")}</span></div>
                  <div><span style={{ color: "var(--muted)" }}>Due Date:</span> {selected.due_date ? formatDate(selected.due_date) : "—"}</div>
                  <div><span style={{ color: "var(--muted)" }}>Submitted By:</span> {selected.submitted_by ? (userMap[selected.submitted_by] ?? "—") : "—"}</div>
                  <div><span style={{ color: "var(--muted)" }}>Reviewer:</span> {selected.reviewer_id ? (userMap[selected.reviewer_id] ?? "—") : "—"}</div>
                  <div><span style={{ color: "var(--muted)" }}>Created:</span> {formatDate(selected.created_at)}</div>
                  {selected.reviewed_at && (
                    <div><span style={{ color: "var(--muted)" }}>Reviewed:</span> {formatDate(selected.reviewed_at)}</div>
                  )}
                </div>
                {selected.review_comments && (
                  <div style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
                    <span style={{ color: "var(--muted)" }}>Review Comments:</span>
                    <p style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{selected.review_comments}</p>
                  </div>
                )}
                <div className="modal-footer">
                  <button className="btn" style={{ color: "var(--color-red)" }} onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className="btn btn-primary" onClick={startEditing}>
                    <Pencil size={14} /> Edit
                  </button>
                </div>

                {showDeleteConfirm && (
                  <div style={{ padding: "12px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, marginTop: 12 }}>
                    <p style={{ fontSize: "0.85rem", marginBottom: 8 }}>Are you sure you want to delete this submittal?</p>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                      <button className="btn" style={{ background: "var(--color-red)", color: "#fff", borderColor: "var(--color-red)" }} onClick={handleDelete} disabled={saving}>
                        {saving ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={editData.title as string ?? ""} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editData.status as string ?? ""} onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={editData.due_date as string ?? ""} onChange={(e) => setEditData({ ...editData, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Spec Section</label>
                    <input className="form-input" value={editData.spec_section as string ?? ""} onChange={(e) => setEditData({ ...editData, spec_section: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reviewer</label>
                    <select className="form-select" value={editData.reviewer_id as string ?? ""} onChange={(e) => setEditData({ ...editData, reviewer_id: e.target.value })}>
                      <option value="">Select reviewer...</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user?.full_name ?? m.user?.email ?? m.user_id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Review Comments</label>
                  <textarea className="form-input" rows={3} value={editData.review_comments as string ?? ""} onChange={(e) => setEditData({ ...editData, review_comments: e.target.value })} />
                </div>
                {saveError && (
                  <p style={{ color: "var(--color-red)", fontSize: "0.85rem" }}>{saveError}</p>
                )}
                <div className="modal-footer">
                  <button className="btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          entityName="Submittals"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
