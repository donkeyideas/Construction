"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  MessageSquareMore,
  AlertCircle,
  Hash,
  CircleDot,
  CheckCircle2,
  MessageCircle,
  Plus,
  X,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { formatCurrency, formatDateSafe } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Rfi {
  id: string;
  rfi_number: string;
  subject: string;
  question: string;
  answer: string | null;
  status: string;
  priority: string | null;
  submitted_by: string | null;
  assigned_to: string | null;
  assigned_to_contact_id: string | null;
  due_date: string | null;
  answered_at: string | null;
  cost_impact: number | null;
  schedule_impact_days: number | null;
  created_at: string;
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

interface PeopleContact {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  contact_type: string;
}

interface KpiData {
  totalCount: number;
  openCount: number;
  answeredCount: number;
  closedCount: number;
}

interface RfisClientProps {
  rows: Rfi[];
  kpi: KpiData;
  userMap: Record<string, string>;
  projects: Project[];
  members: CompanyMember[];
  peopleContacts: PeopleContact[];
  activeStatus: string | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const priorityBadge: Record<string, string> = {
  high: "badge-red",
  medium: "badge-amber",
  low: "badge-green",
  urgent: "badge-red",
};

const statusBadge: Record<string, string> = {
  open: "inv-status inv-status-pending",
  answered: "inv-status inv-status-approved",
  closed: "inv-status inv-status-paid",
};

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/rfis";
  return `/projects/rfis?status=${status}`;
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "subject", label: "Subject", required: true },
  { key: "question", label: "Question", required: true },
  { key: "priority", label: "Priority", required: false },
  { key: "due_date", label: "Due Date", required: false, type: "date" },
  { key: "project_name", label: "Project Name", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { subject: "Footing depth clarification", question: "What is the required depth for the north footing per detail 3/S-201?", priority: "high", due_date: "2026-02-01" },
  { subject: "Window spec substitution", question: "Can we substitute Andersen 400 series for specified Marvin Ultimate?", priority: "medium", due_date: "2026-02-15" },
  { subject: "Electrical panel relocation", question: "Is it acceptable to relocate Panel LP-2 per field conditions?", priority: "low", due_date: "2026-03-01" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RfisClient({
  rows,
  kpi,
  userMap,
  projects,
  members,
  peopleContacts,
  activeStatus,
}: RfisClientProps) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();
  const now = new Date();

  const PRIORITY_OPTIONS = [
    { value: "low", label: t("priorityLow") },
    { value: "medium", label: t("priorityMedium") },
    { value: "high", label: t("priorityHigh") },
    { value: "urgent", label: t("priorityUrgent") },
  ];

  const STATUS_OPTIONS = [
    { value: "open", label: t("statusOpen") },
    { value: "answered", label: t("statusAnswered") },
    { value: "closed", label: t("statusClosed") },
  ];

  const statuses = [
    { label: t("statusAll"), value: "all" },
    { label: t("statusOpen"), value: "open" },
    { label: t("statusAnswered"), value: "answered" },
    { label: t("statusClosed"), value: "closed" },
  ];

  function formatDate(dateStr: string): string {
    return formatDateSafe(dateStr);
  }

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    rfi_number: "",
    project_id: "",
    subject: "",
    question: "",
    answer: "",
    status: "open",
    priority: "medium",
    due_date: "",
    assignee: "",        // "u:{user_id}" or "c:{contact_id}"
    cost_impact: "",
    schedule_impact_days: "",
  });

  const [showImport, setShowImport] = useState(false);
  const [importProjectId, setImportProjectId] = useState("");

  // Detail / Edit / Delete modal state
  const [selectedRfi, setSelectedRfi] = useState<Rfi | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function daysOpen(
    createdAt: string,
    status: string,
    answeredAt: string | null
  ): number {
    const start = new Date(createdAt);
    const end =
      status === "closed" && answeredAt ? new Date(answeredAt) : now;
    return Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < now;
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "rfis", rows, project_id: importProjectId }),
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
      const assignee = formData.assignee;
      const assigned_to = assignee.startsWith("u:") ? assignee.slice(2) : undefined;
      const assigned_to_contact_id = assignee.startsWith("c:") ? assignee.slice(2) : undefined;

      const res = await fetch("/api/projects/rfis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfi_number: formData.rfi_number.trim() || undefined,
          project_id: formData.project_id,
          subject: formData.subject,
          question: formData.question,
          answer: formData.answer || undefined,
          status: formData.status || "open",
          priority: formData.priority || "medium",
          due_date: formData.due_date || undefined,
          assigned_to: assigned_to || undefined,
          assigned_to_contact_id: assigned_to_contact_id || undefined,
          cost_impact: formData.cost_impact ? Number(formData.cost_impact) : undefined,
          schedule_impact_days: formData.schedule_impact_days ? Number(formData.schedule_impact_days) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateRfi"));
      }

      setFormData({
        rfi_number: "",
        project_id: "",
        subject: "",
        question: "",
        answer: "",
        status: "open",
        priority: "medium",
        due_date: "",
        assignee: "",
        cost_impact: "",
        schedule_impact_days: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : t("failedToCreateRfi")
      );
    } finally {
      setCreating(false);
    }
  }

  function openDetail(rfi: Rfi) {
    setSelectedRfi(rfi);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function closeDetail() {
    setSelectedRfi(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function startEditing() {
    if (!selectedRfi) return;
    setIsEditing(true);
    setSaveError("");
    const assignee = selectedRfi.assigned_to
      ? `u:${selectedRfi.assigned_to}`
      : selectedRfi.assigned_to_contact_id
        ? `c:${selectedRfi.assigned_to_contact_id}`
        : "";
    setEditData({
      subject: selectedRfi.subject,
      question: selectedRfi.question,
      answer: selectedRfi.answer ?? "",
      status: selectedRfi.status,
      priority: selectedRfi.priority ?? "medium",
      assignee,
      due_date: selectedRfi.due_date ?? "",
      cost_impact: selectedRfi.cost_impact ?? "",
      schedule_impact_days: selectedRfi.schedule_impact_days ?? "",
    });
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError("");
    setEditData({});
  }

  async function handleSave() {
    if (!selectedRfi) return;
    setSaving(true);
    setSaveError("");

    try {
      const changes: Record<string, unknown> = { id: selectedRfi.id };

      if (editData.subject !== selectedRfi.subject) changes.subject = editData.subject;
      if (editData.question !== selectedRfi.question) changes.question = editData.question;
      if ((editData.answer ?? "") !== (selectedRfi.answer ?? "")) changes.answer = editData.answer || null;
      if (editData.status !== selectedRfi.status) changes.status = editData.status;
      if (editData.priority !== (selectedRfi.priority ?? "medium")) changes.priority = editData.priority;
      if ((editData.due_date ?? "") !== (selectedRfi.due_date ?? "")) changes.due_date = editData.due_date || null;

      // Parse assignee
      const assigneeVal = (editData.assignee as string) ?? "";
      const newAssignedTo = assigneeVal.startsWith("u:") ? assigneeVal.slice(2) : null;
      const newAssignedToContact = assigneeVal.startsWith("c:") ? assigneeVal.slice(2) : null;
      const oldAssignee = selectedRfi.assigned_to ? `u:${selectedRfi.assigned_to}` : selectedRfi.assigned_to_contact_id ? `c:${selectedRfi.assigned_to_contact_id}` : "";
      if (assigneeVal !== oldAssignee) {
        changes.assigned_to = newAssignedTo;
        changes.assigned_to_contact_id = newAssignedToContact;
      }

      const costVal = editData.cost_impact === "" || editData.cost_impact === null ? null : Number(editData.cost_impact);
      if (costVal !== selectedRfi.cost_impact) changes.cost_impact = costVal;

      const schedVal = editData.schedule_impact_days === "" || editData.schedule_impact_days === null ? null : Number(editData.schedule_impact_days);
      if (schedVal !== selectedRfi.schedule_impact_days) changes.schedule_impact_days = schedVal;

      if (Object.keys(changes).length <= 1) {
        setIsEditing(false);
        return;
      }

      const res = await fetch("/api/projects/rfis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateRfi"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToUpdateRfi")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedRfi) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/projects/rfis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedRfi.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteRfi"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToDeleteRfi")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("requestsForInformation")}</h2>
          <p className="fin-header-sub">
            {t("rfisSubtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("newRfi")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">{t("totalRfis")}</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <CircleDot size={18} />
          </div>
          <span className="fin-kpi-label">{t("statusOpen")}</span>
          <span className="fin-kpi-value">{kpi.openCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <MessageCircle size={18} />
          </div>
          <span className="fin-kpi-label">{t("statusAnswered")}</span>
          <span className="fin-kpi-value">{kpi.answeredCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">{t("statusClosed")}</span>
          <span className="fin-kpi-value">{kpi.closedCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          {t("statusLabel")}
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value || (!activeStatus && s.value === "all")
                ? "ui-btn-primary"
                : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {rows.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("rfiNumber")}</th>
                  <th>{t("subject")}</th>
                  <th>{t("project")}</th>
                  <th>{t("priority")}</th>
                  <th>{t("submittedBy")}</th>
                  <th>{t("assignedTo")}</th>
                  <th>{t("dueDate")}</th>
                  <th style={{ textAlign: "right" }}>{t("daysOpen")}</th>
                  <th style={{ textAlign: "right" }}>{t("costImpact")}</th>
                  <th>{t("columnStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rfi) => {
                  const project = rfi.projects;
                  const overdue =
                    rfi.status === "open" && isOverdue(rfi.due_date);
                  const days = daysOpen(
                    rfi.created_at,
                    rfi.status,
                    rfi.answered_at
                  );

                  return (
                    <tr
                      key={rfi.id}
                      className={overdue ? "invoice-row-overdue" : ""}
                      onClick={() => openDetail(rfi)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {rfi.rfi_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{rfi.subject}</div>
                        {rfi.answer && (
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t("answerPrefix")}: {rfi.answer}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {project ? (
                          <span style={{ color: "var(--muted)" }}>
                            <strong>{project.code}</strong>
                          </span>
                        ) : "--"}
                      </td>
                      <td>
                        {rfi.priority ? (
                          <span className={`badge ${priorityBadge[rfi.priority] ?? "badge-blue"}`}>
                            {rfi.priority}
                          </span>
                        ) : "--"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {rfi.submitted_by ? userMap[rfi.submitted_by] ?? "--" : "--"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {rfi.assigned_to
                          ? userMap[rfi.assigned_to] ?? "--"
                          : rfi.assigned_to_contact_id
                            ? userMap[rfi.assigned_to_contact_id] ?? "--"
                            : "--"}
                      </td>
                      <td>
                        {rfi.due_date ? (
                          <span style={{ color: overdue ? "var(--color-red)" : "var(--text)", fontWeight: overdue ? 600 : 400 }}>
                            {formatDateSafe(rfi.due_date)}
                            {overdue && <AlertCircle size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />}
                          </span>
                        ) : "--"}
                      </td>
                      <td className="amount-col">
                        <span style={{ color: days > 14 ? "var(--color-red)" : days > 7 ? "var(--color-amber)" : "var(--text)", fontWeight: days > 14 ? 600 : 400 }}>
                          {days}d
                        </span>
                      </td>
                      <td className="amount-col">
                        {rfi.cost_impact != null ? formatCurrency(rfi.cost_impact) : "--"}
                      </td>
                      <td>
                        <span className={statusBadge[rfi.status] ?? "inv-status"}>
                          {rfi.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <MessageSquareMore size={48} />
            </div>
            <div className="fin-empty-title">{t("noRfisFound")}</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? t("noRfisFilter")
                : t("noRfisEmpty")}
            </div>
          </div>
        </div>
      )}

      {/* Create RFI Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("createNewRfi")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            {createError && <div className="ticket-form-error">{createError}</div>}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("rfiNumber")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.rfi_number}
                    onChange={(e) => setFormData({ ...formData, rfi_number: e.target.value })}
                    placeholder="e.g. RFI-001 (auto if blank)"
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("columnStatus")}</label>
                  <select className="ticket-form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("projectRequired")}</label>
                <select className="ticket-form-select" value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} required>
                  <option value="">{t("selectProject")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ""}{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("subjectRequired")}</label>
                <input type="text" className="ticket-form-input" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder={t("rfiSubjectPlaceholder")} required />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("questionRequired")}</label>
                <textarea className="ticket-form-textarea" value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })} placeholder={t("rfiQuestionPlaceholder")} rows={3} required />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("answer")}</label>
                <textarea className="ticket-form-textarea" value={formData.answer} onChange={(e) => setFormData({ ...formData, answer: e.target.value })} placeholder={t("provideAnswerPlaceholder")} rows={2} />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("priority")}</label>
                  <select className="ticket-form-select" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("dueDate")}</label>
                  <input type="date" className="ticket-form-input" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("costImpactDollar")}</label>
                  <input type="number" className="ticket-form-input" value={formData.cost_impact} onChange={(e) => setFormData({ ...formData, cost_impact: e.target.value })} placeholder="0.00" step="0.01" min="0" />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("scheduleImpactDaysLabel")}</label>
                  <input type="number" className="ticket-form-input" value={formData.schedule_impact_days} onChange={(e) => setFormData({ ...formData, schedule_impact_days: e.target.value })} placeholder="0" step="1" min="0" />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("assignedTo")}</label>
                <select className="ticket-form-select" value={formData.assignee} onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}>
                  <option value="">{t("unassigned")}</option>
                  {members.length > 0 && (
                    <optgroup label="System Users">
                      {members.map((m) => (
                        <option key={m.user_id} value={`u:${m.user_id}`}>
                          {m.user?.full_name || m.user?.email || t("unknown")} ({m.role})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {peopleContacts.length > 0 && (
                    <optgroup label="People Directory">
                      {peopleContacts.map((c) => (
                        <option key={c.id} value={`c:${c.id}`}>
                          {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                          {c.job_title ? ` — ${c.job_title}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>{t("cancel")}</button>
                <button type="submit" className="btn-primary" disabled={creating || !formData.subject.trim() || !formData.question.trim() || !formData.project_id}>
                  {creating ? t("creating") : t("createRfi")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedRfi && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="ticket-modal-header">
              <h3>
                {selectedRfi.rfi_number}
                {!isEditing && (
                  <span className={statusBadge[selectedRfi.status] ?? "inv-status"} style={{ marginLeft: 10, fontSize: "0.78rem" }}>
                    {selectedRfi.status}
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && !showDeleteConfirm && (
                  <>
                    <button className="ticket-modal-close" onClick={startEditing} title={t("edit")}>
                      <Pencil size={16} />
                    </button>
                    <button className="ticket-modal-close" onClick={() => setShowDeleteConfirm(true)} title={t("delete")} style={{ color: "var(--color-red)" }}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button className="ticket-modal-close" onClick={closeDetail}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {saveError && <div className="ticket-form-error">{saveError}</div>}

            {showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <p style={{ marginBottom: 16, fontWeight: 500 }}>
                  {t("confirmDeleteRfi", { number: selectedRfi.rfi_number })}
                </p>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>{t("cancel")}</button>
                  <button type="button" className="btn-primary" style={{ backgroundColor: "var(--color-red)" }} onClick={handleDelete} disabled={saving}>
                    {saving ? t("deleting") : t("deleteRfi")}
                  </button>
                </div>
              </div>
            )}

            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.2rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("subject")}</label>
                  <input type="text" className="ticket-form-input" value={(editData.subject as string) ?? ""} onChange={(e) => setEditData({ ...editData, subject: e.target.value })} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("question")}</label>
                  <textarea className="ticket-form-textarea" value={(editData.question as string) ?? ""} onChange={(e) => setEditData({ ...editData, question: e.target.value })} rows={3} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("answer")}</label>
                  <textarea className="ticket-form-textarea" value={(editData.answer as string) ?? ""} onChange={(e) => setEditData({ ...editData, answer: e.target.value })} rows={3} placeholder={t("provideAnswerPlaceholder")} />
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("columnStatus")}</label>
                    <select className="ticket-form-select" value={(editData.status as string) ?? "open"} onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("priority")}</label>
                    <select className="ticket-form-select" value={(editData.priority as string) ?? "medium"} onChange={(e) => setEditData({ ...editData, priority: e.target.value })}>
                      {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("assignedTo")}</label>
                    <select className="ticket-form-select" value={(editData.assignee as string) ?? ""} onChange={(e) => setEditData({ ...editData, assignee: e.target.value })}>
                      <option value="">{t("unassigned")}</option>
                      {members.length > 0 && (
                        <optgroup label="System Users">
                          {members.map((m) => (
                            <option key={m.user_id} value={`u:${m.user_id}`}>
                              {m.user?.full_name || m.user?.email || t("unknown")} ({m.role})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {peopleContacts.length > 0 && (
                        <optgroup label="People Directory">
                          {peopleContacts.map((c) => (
                            <option key={c.id} value={`c:${c.id}`}>
                              {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                              {c.job_title ? ` — ${c.job_title}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("dueDate")}</label>
                    <input type="date" className="ticket-form-input" value={(editData.due_date as string) ?? ""} onChange={(e) => setEditData({ ...editData, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("costImpactDollar")}</label>
                    <input type="number" className="ticket-form-input" value={(editData.cost_impact as string | number) ?? ""} onChange={(e) => setEditData({ ...editData, cost_impact: e.target.value })} placeholder="0.00" step="0.01" />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("scheduleImpactDaysLabel")}</label>
                    <input type="number" className="ticket-form-input" value={(editData.schedule_impact_days as string | number) ?? ""} onChange={(e) => setEditData({ ...editData, schedule_impact_days: e.target.value })} placeholder="0" step="1" />
                  </div>
                </div>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={cancelEditing} disabled={saving}>{t("cancel")}</button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}

            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-group" style={{ marginBottom: 4 }}>
                  <label className="detail-label">{t("subject")}</label>
                  <div className="detail-value">{selectedRfi.subject}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("project")}</label>
                  <div className="detail-value">{selectedRfi.projects ? `${selectedRfi.projects.code} - ${selectedRfi.projects.name}` : "--"}</div>
                </div>
                <div className="detail-section">
                  <div className="detail-section-title">{t("question")}</div>
                  <div className="detail-section-box">{selectedRfi.question}</div>
                </div>
                <div className="detail-section">
                  <div className="detail-section-title">{t("answer")}</div>
                  {selectedRfi.answer ? (
                    <div className="detail-section-box">{selectedRfi.answer}</div>
                  ) : (
                    <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.88rem" }}>{t("notYetAnswered")}</span>
                  )}
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("priority")}</label>
                    <div className="detail-value">
                      {selectedRfi.priority ? <span className={`badge ${priorityBadge[selectedRfi.priority] ?? "badge-blue"}`}>{selectedRfi.priority}</span> : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("columnStatus")}</label>
                    <div className="detail-value"><span className={statusBadge[selectedRfi.status] ?? "inv-status"}>{selectedRfi.status}</span></div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("submittedBy")}</label>
                    <div className="detail-value">{selectedRfi.submitted_by ? userMap[selectedRfi.submitted_by] ?? "--" : "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("assignedTo")}</label>
                    <div className="detail-value">
                      {selectedRfi.assigned_to
                        ? userMap[selectedRfi.assigned_to] ?? "--"
                        : selectedRfi.assigned_to_contact_id
                          ? userMap[selectedRfi.assigned_to_contact_id] ?? "--"
                          : "--"}
                    </div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("dueDate")}</label>
                    <div className="detail-value">{selectedRfi.due_date ? formatDate(selectedRfi.due_date) : "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("costImpact")}</label>
                    <div className="detail-value">{selectedRfi.cost_impact != null ? formatCurrency(selectedRfi.cost_impact) : "--"}</div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("scheduleImpact")}</label>
                    <div className="detail-value">
                      {selectedRfi.schedule_impact_days != null
                        ? t("scheduleImpactDays", { count: selectedRfi.schedule_impact_days })
                        : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("created")}</label>
                    <div className="detail-value">{formatDate(selectedRfi.created_at)}</div>
                  </div>
                </div>
                {selectedRfi.answered_at && (
                  <div className="detail-row">
                    <div className="detail-group">
                      <label className="detail-label">{t("answeredAt")}</label>
                      <div className="detail-value">{formatDate(selectedRfi.answered_at)}</div>
                    </div>
                  </div>
                )}
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeDetail}>{t("close")}</button>
                  <button type="button" className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} /> {t("editRfi")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("rfis")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); setImportProjectId(""); }}
          projects={projects}
          selectedProjectId={importProjectId}
          onProjectChange={setImportProjectId}
        />
      )}
    </div>
  );
}
