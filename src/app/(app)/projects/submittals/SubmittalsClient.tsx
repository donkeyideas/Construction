"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
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

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/submittals";
  return `/projects/submittals?status=${status}`;
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "project_name", label: "Project Name", required: false },
  { key: "spec_section", label: "Spec Section", required: false },
  { key: "due_date", label: "Due Date", required: false, type: "date" },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Structural Steel Shop Drawings", project_name: "Riverside Luxury Apartments", spec_section: "05 12 00", due_date: "2026-03-01" },
  { title: "HVAC Equipment Submittals", project_name: "Downtown Office Tower Renovation", spec_section: "23 05 00", due_date: "2026-03-15" },
  { title: "Curtain Wall System", project_name: "Riverside Luxury Apartments", spec_section: "08 44 00", due_date: "2026-04-01" },
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
  const t = useTranslations("projects");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();
  const now = new Date();

  const statuses = [
    { label: t("statusAll"), value: "all" },
    { label: t("statusPending"), value: "pending" },
    { label: t("statusUnderReview"), value: "under_review" },
    { label: t("statusApproved"), value: "approved" },
    { label: t("statusRejected"), value: "rejected" },
  ];

  const STATUS_OPTIONS = [
    { value: "pending", label: t("statusPending") },
    { value: "under_review", label: t("statusUnderReview") },
    { value: "approved", label: t("statusApproved") },
    { value: "rejected", label: t("statusRejected") },
    { value: "resubmit", label: t("statusResubmit") },
  ];

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

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
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

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
        throw new Error(data.error || t("failedToCreateSubmittal"));
      }

      setFormData({ project_id: "", title: "", spec_section: "", due_date: "", reviewer_id: "" });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToCreateSubmittal"));
    } finally {
      setCreating(false);
    }
  }

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
        throw new Error(data.error || t("failedToUpdateSubmittal"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToSave"));
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
        throw new Error(data.error || t("failedToDeleteSubmittal"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDelete"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("submittals")}</h2>
          <p className="fin-header-sub">{t("submittalsSubtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} /> {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {t("newSubmittal")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Hash size={18} /></div>
          <span className="fin-kpi-label">{t("total")}</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><Clock size={18} /></div>
          <span className="fin-kpi-label">{t("statusPending")}</span>
          <span className="fin-kpi-value">{kpi.pendingCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><ClipboardList size={18} /></div>
          <span className="fin-kpi-label">{t("statusUnderReview")}</span>
          <span className="fin-kpi-value">{kpi.underReviewCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><CheckCircle2 size={18} /></div>
          <span className="fin-kpi-label">{t("statusApproved")}</span>
          <span className="fin-kpi-value">{kpi.approvedCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><XCircle size={18} /></div>
          <span className="fin-kpi-label">{t("statusRejected")}</span>
          <span className="fin-kpi-value">{kpi.rejectedCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>{t("statusLabel")}</label>
        {statuses.map((s) => (
          <Link key={s.value} href={buildUrl(s.value)} className={`ui-btn ui-btn-sm ${(activeStatus || "all") === s.value ? "ui-btn-primary" : "ui-btn-outline"}`}>
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
              <th>{t("subNumber")}</th>
              <th>{t("columnTitle")}</th>
              <th>{t("project")}</th>
              <th>{t("specSection")}</th>
              <th>{t("submittedBy")}</th>
              <th>{t("reviewer")}</th>
              <th>{t("dueDate")}</th>
              <th>{t("daysOpen")}</th>
              <th>{t("columnStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                  {t("noSubmittalsFound")}
                </td>
              </tr>
            ) : (
              rows.map((sub) => {
                const overdue = isOverdue(sub.due_date, sub.status);
                return (
                  <tr key={sub.id} onClick={() => openDetail(sub)} style={{ cursor: "pointer" }}>
                    <td style={{ fontWeight: 600 }}>{sub.submittal_number}</td>
                    <td><div>{sub.title}</div></td>
                    <td>{sub.projects?.code ?? sub.projects?.name ?? "\u2014"}</td>
                    <td style={{ color: "var(--muted)" }}>{sub.spec_section ?? "\u2014"}</td>
                    <td>{sub.submitted_by ? (userMap[sub.submitted_by] ?? "\u2014") : "\u2014"}</td>
                    <td>{sub.reviewer_id ? (userMap[sub.reviewer_id] ?? "\u2014") : "\u2014"}</td>
                    <td style={{ color: overdue ? "var(--color-red)" : undefined }}>
                      {sub.due_date ? formatDate(sub.due_date) : "\u2014"}
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
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("newSubmittal")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            {createError && <div className="ticket-form-error">{createError}</div>}
            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("projectRequired")}</label>
                <select className="ticket-form-select" required value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}>
                  <option value="">{t("selectProjectEllipsis")}</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} - ${p.name}` : p.name}</option>)}
                </select>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("titleRequired")}</label>
                <input type="text" className="ticket-form-input" required placeholder={t("submittalTitlePlaceholder")} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("specSection")}</label>
                  <input type="text" className="ticket-form-input" placeholder={t("specSectionPlaceholder")} value={formData.spec_section} onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("dueDate")}</label>
                  <input type="date" className="ticket-form-input" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("reviewer")}</label>
                <select className="ticket-form-select" value={formData.reviewer_id} onChange={(e) => setFormData({ ...formData, reviewer_id: e.target.value })}>
                  <option value="">{t("selectReviewer")}</option>
                  {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.full_name ?? m.user?.email ?? m.user_id}</option>)}
                </select>
              </div>
              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>{t("cancel")}</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? t("creating") : t("createSubmittal")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="ticket-modal-header">
              <h3>
                {selected.submittal_number}
                {!isEditing && (
                  <span className={statusBadge[selected.status] ?? "inv-status"} style={{ marginLeft: 10, fontSize: "0.78rem" }}>
                    {selected.status.replace(/_/g, " ")}
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button className="ticket-modal-close" onClick={startEditing} title={t("edit")}><Pencil size={16} /></button>
                    <button className="ticket-modal-close" onClick={() => setShowDeleteConfirm(true)} title={t("delete")} style={{ color: "var(--color-red)" }}><Trash2 size={16} /></button>
                  </>
                )}
                <button className="ticket-modal-close" onClick={closeDetail}><X size={18} /></button>
              </div>
            </div>
            {saveError && <div className="ticket-form-error">{saveError}</div>}

            {showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <p style={{ marginBottom: 16, fontWeight: 500 }}>
                  {t("confirmDeleteSubmittal", { number: selected.submittal_number })}
                </p>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>{t("cancel")}</button>
                  <button type="button" className="btn-primary" style={{ backgroundColor: "var(--color-red)" }} onClick={handleDelete} disabled={saving}>
                    {saving ? t("deleting") : t("deleteSubmittal")}
                  </button>
                </div>
              </div>
            )}

            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("columnTitle")}</label>
                  <input type="text" className="ticket-form-input" value={editData.title as string ?? ""} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("columnStatus")}</label>
                    <select className="ticket-form-select" value={editData.status as string ?? ""} onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("dueDate")}</label>
                    <input type="date" className="ticket-form-input" value={editData.due_date as string ?? ""} onChange={(e) => setEditData({ ...editData, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("specSection")}</label>
                    <input type="text" className="ticket-form-input" value={editData.spec_section as string ?? ""} onChange={(e) => setEditData({ ...editData, spec_section: e.target.value })} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("reviewer")}</label>
                    <select className="ticket-form-select" value={editData.reviewer_id as string ?? ""} onChange={(e) => setEditData({ ...editData, reviewer_id: e.target.value })}>
                      <option value="">{t("selectReviewer")}</option>
                      {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user?.full_name ?? m.user?.email ?? m.user_id}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("reviewComments")}</label>
                  <textarea className="ticket-form-textarea" rows={3} value={editData.review_comments as string ?? ""} onChange={(e) => setEditData({ ...editData, review_comments: e.target.value })} />
                </div>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>{t("cancel")}</button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}

            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-group" style={{ marginBottom: 4 }}>
                  <label className="detail-label">{t("columnTitle")}</label>
                  <div className="detail-value">{selected.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("project")}</label>
                  <div className="detail-value">{selected.projects ? `${selected.projects.code} - ${selected.projects.name}` : "\u2014"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("specSection")}</label>
                  <div className="detail-value">{selected.spec_section ?? "\u2014"}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("columnStatus")}</label>
                    <div className="detail-value"><span className={statusBadge[selected.status] ?? "inv-status"}>{selected.status.replace(/_/g, " ")}</span></div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("dueDate")}</label>
                    <div className="detail-value">{selected.due_date ? formatDate(selected.due_date) : "\u2014"}</div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("submittedBy")}</label>
                    <div className="detail-value">{selected.submitted_by ? (userMap[selected.submitted_by] ?? "\u2014") : "\u2014"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("reviewer")}</label>
                    <div className="detail-value">{selected.reviewer_id ? (userMap[selected.reviewer_id] ?? "\u2014") : "\u2014"}</div>
                  </div>
                </div>
                {selected.review_comments && (
                  <div className="detail-section">
                    <div className="detail-section-title">{t("reviewComments")}</div>
                    <div className="detail-section-box">{selected.review_comments}</div>
                  </div>
                )}
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeDetail}>{t("close")}</button>
                  <button type="button" className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} /> {t("edit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal entityName={t("submittals")} columns={IMPORT_COLUMNS} sampleData={IMPORT_SAMPLE} onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
