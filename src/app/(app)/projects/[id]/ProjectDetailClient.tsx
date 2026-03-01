"use client";

import { formatDateSafe, toDateStr } from "@/lib/utils/format";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  CloudSun,
  Thermometer,
  Droplets,
  Milestone,
  Plus,
  X,
} from "lucide-react";
import type {
  ProjectRow,
  ProjectPhase,
  ProjectTask,
  DailyLog,
  RFI,
  ChangeOrder,
  ProjectStats,
  ProjectStatus,
} from "@/lib/queries/projects";
import type { SectionTransactionSummary } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";

// ---------------------------------------------------------------------------
// Helpers (locale-aware versions are inside components)
// ---------------------------------------------------------------------------

function toInputDate(dateStr: string | null) {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

function completionClass(pct: number) {
  if (pct >= 75) return "high";
  if (pct <= 25) return "low";
  return "";
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = "overview" | "tasks" | "daily-logs" | "rfis" | "change-orders" | "transactions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MemberOption {
  id: string;
  name: string;
  role: string;
}

interface ProjectDetailClientProps {
  project: ProjectRow;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  dailyLogs: DailyLog[];
  rfis: RFI[];
  changeOrders: ChangeOrder[];
  stats: ProjectStats;
  userMap: Record<string, string>;
  memberOptions: MemberOption[];
  transactions: SectionTransactionSummary;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectDetailClient({
  project,
  phases,
  tasks,
  dailyLogs,
  rfis,
  changeOrders,
  stats,
  userMap,
  memberOptions,
  transactions,
}: ProjectDetailClientProps) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Detail / edit modal state
  const [selectedRfi, setSelectedRfi] = useState<RFI | null>(null);
  const [selectedCo, setSelectedCo] = useState<ChangeOrder | null>(null);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function formatCurrency(amount: number | null) {
    if (amount == null) return "--";
    return new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return formatDateSafe(toDateStr(date));
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      pre_construction: t("statusPreConstruction"),
      active: t("statusActive"),
      on_hold: t("statusOnHold"),
      completed: t("statusCompleted"),
      closed: t("statusClosed"),
      draft: t("statusDraft"),
      open: t("statusOpen"),
      submitted: t("statusSubmitted"),
      answered: t("statusAnswered"),
      approved: t("statusApproved"),
      rejected: t("statusRejected"),
      pending: t("statusPending"),
      not_started: t("statusNotStarted"),
      in_progress: t("statusInProgress"),
    };
    return map[status] ?? status.replace(/_/g, " ");
  }

  const TABS = [
    { key: "overview" as TabKey, label: t("tabOverview") },
    { key: "tasks" as TabKey, label: t("tabTasks") },
    { key: "daily-logs" as TabKey, label: t("tabDailyLogs") },
    { key: "rfis" as TabKey, label: t("tabRfis") },
    { key: "change-orders" as TabKey, label: t("tabChangeOrders") },
    { key: "transactions" as TabKey, label: "Transactions" },
  ];

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/projects");
      } else {
        const data = await res.json();
        alert(data.error || t("failedToDeleteProject"));
      }
    } catch {
      alert(t("networkError"));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="project-detail-header">
        <div className="project-detail-title">
          <div style={{ marginBottom: 8 }}>
            <Link
              href="/projects"
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ArrowLeft size={14} /> {t("backToProjects")}
            </Link>
          </div>
          <h2>
            {project.name}
            <span className={`badge badge-${project.status}`}>
              {statusLabel(project.status)}
            </span>
          </h2>
          <div className="project-detail-code">
            {project.code}
            {project.client_name ? ` -- ${project.client_name}` : ""}
          </div>
        </div>
        <div className="project-detail-actions">
          <button
            className="btn-secondary"
            onClick={() => { setEditProjectOpen(true); setEditMode(false); }}
          >
            <Pencil size={14} />
            {t("editProject")}
          </button>
          <button
            className="btn-secondary"
            style={{ color: "var(--color-red)" }}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} />
            {t("delete")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="project-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`project-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === "rfis" && stats.open_rfis > 0 && (
              <span
                className="badge badge-amber"
                style={{ marginLeft: 6, fontSize: "0.65rem" }}
              >
                {stats.open_rfis}
              </span>
            )}
            {tab.key === "change-orders" && stats.open_change_orders > 0 && (
              <span
                className="badge badge-amber"
                style={{ marginLeft: 6, fontSize: "0.65rem" }}
              >
                {stats.open_change_orders}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="project-tab-panel">
        {activeTab === "overview" && (
          <OverviewTab project={project} stats={stats} tasks={tasks} formatCurrency={formatCurrency} formatDate={formatDate} t={t} />
        )}
        {activeTab === "tasks" && (
          <TasksTabWithCreate
            projectId={project.id}
            phases={phases}
            tasks={tasks}
            onSelect={setSelectedTask}
            formatDate={formatDate}
            statusLabel={statusLabel}
            t={t}
          />
        )}
        {activeTab === "daily-logs" && (
          <DailyLogsTab logs={dailyLogs} onSelect={setSelectedLog} dateLocale={dateLocale} statusLabel={statusLabel} t={t} />
        )}
        {activeTab === "rfis" && (
          <RFIsTab rfis={rfis} onSelect={setSelectedRfi} formatDate={formatDate} statusLabel={statusLabel} t={t} />
        )}
        {activeTab === "change-orders" && (
          <ChangeOrdersTab changeOrders={changeOrders} onSelect={setSelectedCo} formatCurrency={formatCurrency} formatDate={formatDate} statusLabel={statusLabel} t={t} />
        )}
        {activeTab === "transactions" && (
          <div style={{ marginTop: "24px" }}>
            <SectionTransactions data={transactions} sectionName="Project" />
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}

      {/* Edit Project Modal */}
      {editProjectOpen && (
        <EditProjectModal
          project={project}
          saving={saving}
          setSaving={setSaving}
          onClose={() => setEditProjectOpen(false)}
          memberOptions={memberOptions}
          t={t}
          statusLabel={statusLabel}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>{t("deleteProject")}</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 8 }}>
                {t("confirmDeleteProject", { name: project.name })}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                {t("deleteProjectWarning")}
              </p>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  {t("cancel")}
                </button>
                <button
                  className="btn-primary"
                  style={{ background: "var(--color-red)" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? t("deleting") : t("deleteProject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFI Detail / Edit Modal */}
      {selectedRfi && (
        <RfiModal
          rfi={selectedRfi}
          editMode={editMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => { setSelectedRfi(null); setEditMode(false); }}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          formatCurrency={formatCurrency}
          statusLabel={statusLabel}
          t={t}
        />
      )}

      {/* Change Order Detail / Edit Modal */}
      {selectedCo && (
        <ChangeOrderModal
          co={selectedCo}
          editMode={editMode}
          saving={saving}
          setSaving={setSaving}
          userMap={userMap}
          onClose={() => { setSelectedCo(null); setEditMode(false); }}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          statusLabel={statusLabel}
          t={t}
        />
      )}

      {/* Daily Log Detail / Edit Modal */}
      {selectedLog && (
        <DailyLogModal
          log={selectedLog}
          editMode={editMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => { setSelectedLog(null); setEditMode(false); }}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          formatDate={formatDate}
          statusLabel={statusLabel}
          t={t}
        />
      )}

      {/* Task Detail / Edit Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={project.id}
          editMode={editMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => { setSelectedTask(null); setEditMode(false); }}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          formatDate={formatDate}
          statusLabel={statusLabel}
          t={t}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Edit Project Modal
// ===========================================================================

function EditProjectModal({
  project,
  saving,
  setSaving,
  onClose,
  memberOptions,
  t,
  statusLabel,
}: {
  project: ProjectRow;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  memberOptions: MemberOption[];
  t: ReturnType<typeof useTranslations>;
  statusLabel: (s: string) => string;
}) {
  const [form, setForm] = useState({
    name: project.name,
    status: project.status,
    completion_pct: project.completion_pct,
    project_type: project.project_type ?? "",
    client_name: project.client_name ?? "",
    description: project.description ?? "",
    address_line1: project.address_line1 ?? "",
    city: project.city ?? "",
    state: project.state ?? "",
    zip: project.zip ?? "",
    contract_amount: project.contract_amount ?? "",
    estimated_cost: project.estimated_cost ?? "",
    actual_cost: project.actual_cost ?? "",
    start_date: toInputDate(project.start_date),
    estimated_end_date: toInputDate(project.estimated_end_date),
    project_manager_id: project.project_manager_id ?? "",
    superintendent_id: project.superintendent_id ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          status: form.status,
          completion_pct: Number(form.completion_pct),
          project_type: form.project_type || null,
          client_name: form.client_name || null,
          description: form.description || null,
          address_line1: form.address_line1 || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          contract_amount: form.contract_amount !== "" ? Number(form.contract_amount) : null,
          estimated_cost: form.estimated_cost !== "" ? Number(form.estimated_cost) : null,
          actual_cost: form.actual_cost !== "" ? Number(form.actual_cost) : null,
          start_date: form.start_date || null,
          estimated_end_date: form.estimated_end_date || null,
          project_manager_id: form.project_manager_id || null,
          superintendent_id: form.superintendent_id || null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateProject"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t("editProject")}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="modal-form-grid">
            <div className="form-group full-width">
              <label className="form-label">{t("projectName")}</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("columnStatus")}</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              >
                <option value="pre_construction">{t("statusPreConstruction")}</option>
                <option value="active">{t("statusActive")}</option>
                <option value="on_hold">{t("statusOnHold")}</option>
                <option value="completed">{t("statusCompleted")}</option>
                <option value="closed">{t("statusClosed")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t("completionPercent")}</label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={100}
                value={form.completion_pct}
                onChange={(e) => setForm({ ...form, completion_pct: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("projectType")}</label>
              <input
                className="form-input"
                value={form.project_type}
                onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                placeholder={t("projectTypePlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("clientName")}</label>
              <input
                className="form-input"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("projectManager")}</label>
              <select
                className="form-select"
                value={form.project_manager_id}
                onChange={(e) => setForm({ ...form, project_manager_id: e.target.value })}
              >
                <option value="">{t("none")}</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t("superintendent")}</label>
              <select
                className="form-select"
                value={form.superintendent_id}
                onChange={(e) => setForm({ ...form, superintendent_id: e.target.value })}
              >
                <option value="">{t("none")}</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label className="form-label">{t("description")}</label>
              <input
                className="form-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">{t("address")}</label>
              <input
                className="form-input"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                placeholder={t("streetAddress")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("city")}</label>
              <input
                className="form-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("state")}</label>
              <input
                className="form-input"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("zip")}</label>
              <input
                className="form-input"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("contractAmount")}</label>
              <input
                className="form-input"
                type="number"
                value={form.contract_amount}
                onChange={(e) => setForm({ ...form, contract_amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("estimatedCost")}</label>
              <input
                className="form-input"
                type="number"
                value={form.estimated_cost}
                onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("actualCost")}</label>
              <input
                className="form-input"
                type="number"
                value={form.actual_cost}
                onChange={(e) => setForm({ ...form, actual_cost: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("startDate")}</label>
              <input
                className="form-input"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("estimatedEndDate")}</label>
              <input
                className="form-input"
                type="date"
                value={form.estimated_end_date}
                onChange={(e) => setForm({ ...form, estimated_end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose} disabled={saving}>
              {t("cancel")}
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// RFI Modal (Detail + Edit)
// ===========================================================================

function RfiModal({
  rfi,
  editMode,
  saving,
  setSaving,
  onClose,
  onEdit,
  onCancelEdit,
  formatDate,
  formatDateTime,
  formatCurrency,
  statusLabel,
  t,
}: {
  rfi: RFI;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  formatDate: (s: string | null) => string;
  formatDateTime: (s: string | null) => string;
  formatCurrency: (a: number | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [form, setForm] = useState({
    status: rfi.status,
    priority: rfi.priority,
    answer: rfi.answer ?? "",
    assigned_to: rfi.assigned_to ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects/rfis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rfi.id,
          status: form.status,
          priority: form.priority,
          answer: form.answer || null,
          assigned_to: form.assigned_to || null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateRfi"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{t("editRfiTitle", { number: rfi.rfi_number, subject: rfi.subject })}</h3>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div className="modal-form-grid">
              <div className="form-group">
                <label className="form-label">{t("columnStatus")}</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="open">{t("statusOpen")}</option>
                  <option value="answered">{t("statusAnswered")}</option>
                  <option value="closed">{t("statusClosed")}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t("priority")}</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">{t("priorityLow")}</option>
                  <option value="medium">{t("priorityMedium")}</option>
                  <option value="high">{t("priorityHigh")}</option>
                  <option value="urgent">{t("priorityUrgent")}</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label className="form-label">{t("answer")}</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder={t("enterAnswerPlaceholder")}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">{t("assignedToUserId")}</label>
                <input
                  className="form-input"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder={t("userIdPlaceholder")}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancelEdit} disabled={saving}>
                {t("cancel")}
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{rfi.rfi_number}: {rfi.subject}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("columnStatus")}</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${rfi.status}`}>{statusLabel(rfi.status)}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("priority")}</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${rfi.priority}`}>{rfi.priority}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("assignedTo")}</span>
            <span className="modal-detail-value">{rfi.assignee?.full_name ?? "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("dueDate")}</span>
            <span className="modal-detail-value">{formatDate(rfi.due_date)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("created")}</span>
            <span className="modal-detail-value">{formatDateTime(rfi.created_at)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("answeredAt")}</span>
            <span className="modal-detail-value">{formatDateTime(rfi.answered_at)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("costImpact")}</span>
            <span className="modal-detail-value">{rfi.cost_impact != null ? formatCurrency(rfi.cost_impact) : "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("scheduleImpact")}</span>
            <span className="modal-detail-value">
              {rfi.schedule_impact_days != null
                ? t("scheduleImpactDays", { count: rfi.schedule_impact_days })
                : "--"}
            </span>
          </div>

          <div className="modal-section-title">{t("question")}</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>
            {rfi.question || "--"}
          </div>

          <div className="modal-section-title">{t("answer")}</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {rfi.answer || "--"}
          </div>

          <div className="modal-actions">
            <button className="btn-primary" onClick={onEdit}>
              <Pencil size={14} /> {t("editRfi")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Change Order Modal (Detail + Edit)
// ===========================================================================

function ChangeOrderModal({
  co,
  editMode,
  saving,
  setSaving,
  userMap,
  onClose,
  onEdit,
  onCancelEdit,
  formatCurrency,
  formatDateTime,
  statusLabel,
  t,
}: {
  co: ChangeOrder;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  userMap: Record<string, string>;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  formatCurrency: (a: number | null) => string;
  formatDateTime: (s: string | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [form, setForm] = useState({
    status: co.status,
    amount: co.amount ?? "",
    schedule_impact_days: co.schedule_impact_days ?? "",
    description: co.description ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects/change-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: co.id,
          status: form.status,
          amount: form.amount !== "" ? Number(form.amount) : null,
          schedule_impact_days: form.schedule_impact_days !== "" ? Number(form.schedule_impact_days) : null,
          description: form.description || null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateChangeOrder"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{t("editCoTitle", { number: co.co_number, title: co.title })}</h3>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div className="modal-form-grid">
              <div className="form-group">
                <label className="form-label">{t("columnStatus")}</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">{t("statusDraft")}</option>
                  <option value="submitted">{t("statusSubmitted")}</option>
                  <option value="approved">{t("statusApproved")}</option>
                  <option value="rejected">{t("statusRejected")}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t("amountDollar")}</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("scheduleImpactDaysLabel")}</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.schedule_impact_days}
                  onChange={(e) => setForm({ ...form, schedule_impact_days: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">{t("description")}</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("describeChangeOrder")}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancelEdit} disabled={saving}>
                {t("cancel")}
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-modal-header">
          <h3>{co.co_number}: {co.title}</h3>
          <button className="ticket-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div style={{ padding: "1.25rem" }}>
          <div className="detail-grid">
            <div className="detail-field">
              <label className="ticket-form-label">{t("columnStatus")}</label>
              <div><span className={`badge badge-${co.status}`}>{statusLabel(co.status)}</span></div>
            </div>
            <div className="detail-field">
              <label className="ticket-form-label">{t("reason")}</label>
              <div className="detail-field-value" style={{ textTransform: "capitalize" }}>
                {co.reason ? co.reason.replace(/_/g, " ") : "--"}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-field">
              <label className="ticket-form-label">{t("amount")}</label>
              <div className="detail-field-value">{formatCurrency(co.amount)}</div>
            </div>
            <div className="detail-field">
              <label className="ticket-form-label">{t("scheduleImpact")}</label>
              <div className="detail-field-value">
                {co.schedule_impact_days != null
                  ? t("scheduleImpactDays", { count: co.schedule_impact_days })
                  : "--"}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-field">
              <label className="ticket-form-label">{t("approvedBy")}</label>
              <div className="detail-field-value">
                {co.approved_by ? userMap[co.approved_by] ?? "--" : "--"}
              </div>
            </div>
            <div className="detail-field">
              <label className="ticket-form-label">{t("approvedAt")}</label>
              <div className="detail-field-value">{formatDateTime(co.approved_at)}</div>
            </div>
          </div>

          {co.description && (
            <div className="detail-section">
              <div className="detail-section-title">{t("description")}</div>
              <div className="detail-section-text">{co.description}</div>
            </div>
          )}

          {co.line_items && co.line_items.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">{t("lineItems")}</div>
              <table className="detail-line-items">
                <thead>
                  <tr>
                    <th>{t("description")}</th>
                    <th>{t("qty")}</th>
                    <th>{t("unit")}</th>
                    <th>{t("total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(co.line_items as Record<string, unknown>[]).map((item, i) => (
                    <tr key={i}>
                      <td>{String(item.description || "--")}</td>
                      <td>{item.quantity != null ? String(item.quantity) : "--"}</td>
                      <td>{String(item.unit || "--")}</td>
                      <td>{item.total != null ? formatCurrency(Number(item.total)) : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="ticket-form-actions">
            <button className="btn-primary" onClick={onEdit}>
              <Pencil size={14} /> {t("editChangeOrder")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Daily Log Modal (Detail + Edit)
// ===========================================================================

function DailyLogModal({
  log,
  editMode,
  saving,
  setSaving,
  onClose,
  onEdit,
  onCancelEdit,
  formatDate,
  statusLabel,
  t,
}: {
  log: DailyLog;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  formatDate: (s: string | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [form, setForm] = useState({
    status: log.status,
    work_performed: log.work_performed ?? "",
    weather_conditions: log.weather_conditions ?? "",
    weather_temp_high: log.weather_temp_high ?? "",
    weather_temp_low: log.weather_temp_low ?? "",
    weather_precipitation: log.weather_precipitation ?? "",
    delays: log.delays ?? "",
    safety_incidents: log.safety_incidents ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects/daily-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: log.id,
          status: form.status,
          work_performed: form.work_performed || null,
          weather_conditions: form.weather_conditions || null,
          weather_temp_high: form.weather_temp_high !== "" ? Number(form.weather_temp_high) : null,
          weather_temp_low: form.weather_temp_low !== "" ? Number(form.weather_temp_low) : null,
          delays: form.delays || null,
          safety_incidents: form.safety_incidents || null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || t("failedToUpdateDailyLog"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{t("editDailyLogTitle", { date: formatDate(log.log_date) })}</h3>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div className="modal-form-grid">
              <div className="form-group">
                <label className="form-label">{t("columnStatus")}</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">{t("statusDraft")}</option>
                  <option value="submitted">{t("statusSubmitted")}</option>
                  <option value="approved">{t("statusApproved")}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t("weatherCondition")}</label>
                <input
                  className="form-input"
                  value={form.weather_conditions}
                  onChange={(e) => setForm({ ...form, weather_conditions: e.target.value })}
                  placeholder={t("weatherConditionPlaceholder")}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("tempHighF")}</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.weather_temp_high}
                  onChange={(e) => setForm({ ...form, weather_temp_high: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("tempLowF")}</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.weather_temp_low}
                  onChange={(e) => setForm({ ...form, weather_temp_low: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">{t("workPerformed")}</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.work_performed}
                  onChange={(e) => setForm({ ...form, work_performed: e.target.value })}
                  placeholder={t("describeWorkPerformed")}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">{t("delays")}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.delays}
                  onChange={(e) => setForm({ ...form, delays: e.target.value })}
                  placeholder={t("delaysPlaceholder")}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">{t("safetyIncidents")}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.safety_incidents}
                  onChange={(e) => setForm({ ...form, safety_incidents: e.target.value })}
                  placeholder={t("safetyIncidentsPlaceholder")}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancelEdit} disabled={saving}>
                {t("cancel")}
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Workforce display
  const workforce = log.workforce as Array<{ trade?: string; headcount?: number; hours?: number }> | null;
  const equipment = log.equipment as Array<{ name?: string; hours?: number }> | null;
  const materialsReceived = log.materials_received;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t("dailyLogTitle", { date: formatDate(log.log_date) })}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("columnStatus")}</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${log.status}`}>{statusLabel(log.status)}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("createdBy")}</span>
            <span className="modal-detail-value">{log.creator?.full_name ?? "--"}</span>
          </div>

          {/* Weather */}
          <div className="modal-section-title">{t("weather")}</div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("condition")}</span>
            <span className="modal-detail-value">{log.weather_conditions ?? "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("temperature")}</span>
            <span className="modal-detail-value">
              {log.weather_temp_high != null
                ? `${log.weather_temp_high}F / ${log.weather_temp_low ?? "--"}F`
                : "--"}
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("precipitation")}</span>
            <span className="modal-detail-value">{log.weather_precipitation ?? "--"}</span>
          </div>

          {/* Work */}
          <div className="modal-section-title">{t("workPerformed")}</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 4 }}>
            {log.work_performed || "--"}
          </div>

          {/* Workforce */}
          {workforce && workforce.length > 0 && (
            <>
              <div className="modal-section-title">{t("workforce")}</div>
              {workforce.map((w, i) => (
                <div key={i} className="modal-detail-row">
                  <span className="modal-detail-label">{w.trade ?? t("trade")}</span>
                  <span className="modal-detail-value">
                    {t("workersHours", { workers: w.headcount ?? 0, hours: w.hours ?? 0 })}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Equipment */}
          {equipment && equipment.length > 0 && (
            <>
              <div className="modal-section-title">{t("equipment")}</div>
              {equipment.map((eq, i) => (
                <div key={i} className="modal-detail-row">
                  <span className="modal-detail-label">{eq.name ?? t("equipment")}</span>
                  <span className="modal-detail-value">{eq.hours ?? 0} {t("hrs")}</span>
                </div>
              ))}
            </>
          )}

          {/* Materials */}
          {materialsReceived && (
            <>
              <div className="modal-section-title">{t("materialsReceived")}</div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {materialsReceived}
              </div>
            </>
          )}

          {/* Delays */}
          <div className="modal-section-title">{t("delays")}</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 4 }}>
            {log.delays || t("noneReported")}
          </div>

          {/* Safety Incidents */}
          <div className="modal-section-title">{t("safetyIncidents")}</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {log.safety_incidents || t("noneReported")}
          </div>

          <div className="modal-actions">
            <button className="btn-primary" onClick={onEdit}>
              <Pencil size={14} /> {t("editDailyLog")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Task Modal (Detail + Edit)
// ===========================================================================

function TaskModal({
  task,
  projectId,
  editMode,
  saving,
  setSaving,
  onClose,
  onEdit,
  onCancelEdit,
  formatDate,
  statusLabel,
  t,
}: {
  task: ProjectTask;
  projectId: string;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  formatDate: (s: string | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [formStatus, setFormStatus] = useState(task.status);
  const [formPriority, setFormPriority] = useState(task.priority);
  const [formCompletion, setFormCompletion] = useState(String(task.completion_pct));
  const [formMilestone, setFormMilestone] = useState(task.is_milestone);
  const [formCriticalPath, setFormCriticalPath] = useState(task.is_critical_path);
  const [formStartDate, setFormStartDate] = useState(toInputDate(task.start_date));
  const [formEndDate, setFormEndDate] = useState(toInputDate(task.end_date));
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formStatus,
          priority: formPriority,
          completion_pct: Number(formCompletion),
          is_milestone: formMilestone,
          is_critical_path: formCriticalPath,
          start_date: formStartDate || null,
          end_date: formEndDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("failedToUpdateTask"));
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{t("editTask")}</h3>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {error && (
              <div style={{ color: "var(--color-red)", fontSize: "0.82rem", marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("name")}</span>
              <span className="modal-detail-value" style={{ fontWeight: 600 }}>{task.name}</span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("columnStatus")}</span>
              <span className="modal-detail-value">
                <select className="modal-select" value={formStatus} onChange={(e) => {
                  setFormStatus(e.target.value);
                  if (e.target.value === "completed") setFormCompletion("100");
                  if (e.target.value === "not_started") setFormCompletion("0");
                }}>
                  <option value="not_started">{t("statusNotStarted")}</option>
                  <option value="in_progress">{t("statusInProgress")}</option>
                  <option value="completed">{t("statusCompleted")}</option>
                  <option value="blocked">{t("statusBlocked")}</option>
                </select>
              </span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("priority")}</span>
              <span className="modal-detail-value">
                <select className="modal-select" value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
                  <option value="low">{t("priorityLow")}</option>
                  <option value="medium">{t("priorityMedium")}</option>
                  <option value="high">{t("priorityHigh")}</option>
                  <option value="critical">{t("priorityCritical")}</option>
                </select>
              </span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("completionPercent")}</span>
              <span className="modal-detail-value" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formCompletion}
                  onChange={(e) => setFormCompletion(e.target.value)}
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: 36, textAlign: "right", fontSize: "0.85rem" }}>{formCompletion}%</span>
              </span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("startDate")}</span>
              <span className="modal-detail-value">
                <input type="date" className="modal-input" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("endDate")}</span>
              <span className="modal-detail-value">
                <input type="date" className="modal-input" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("milestone")}</span>
              <span className="modal-detail-value">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={formMilestone} onChange={(e) => setFormMilestone(e.target.checked)} />
                  {t("markAsMilestone")}
                </label>
              </span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("criticalPath")}</span>
              <span className="modal-detail-value">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={formCriticalPath} onChange={(e) => setFormCriticalPath(e.target.checked)} />
                  {t("onCriticalPath")}
                </label>
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onCancelEdit} disabled={saving}>{t("cancel")}</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("columnStatus")}</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("priority")}</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("columnCompletion")}</span>
            <span className="modal-detail-value">{task.completion_pct}%</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("assignedTo")}</span>
            <span className="modal-detail-value">{task.assignee?.full_name ?? "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("startDate")}</span>
            <span className="modal-detail-value">{formatDate(task.start_date)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("endDate")}</span>
            <span className="modal-detail-value">{formatDate(task.end_date)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("milestone")}</span>
            <span className="modal-detail-value">
              {task.is_milestone ? (
                <span className="badge badge-amber">{t("yes")}</span>
              ) : t("no")}
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">{t("criticalPath")}</span>
            <span className="modal-detail-value">{task.is_critical_path ? t("yes") : t("no")}</span>
          </div>
          {task.description && (
            <div className="modal-detail-row">
              <span className="modal-detail-label">{t("description")}</span>
              <span className="modal-detail-value">{task.description}</span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>{t("close")}</button>
          <button className="btn-primary" onClick={onEdit}>
            <Pencil size={14} />
            {t("editTask")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  project,
  stats,
  tasks,
  formatCurrency,
  formatDate,
  t,
}: {
  project: ProjectRow;
  stats: ProjectStats;
  tasks: ProjectTask[];
  formatCurrency: (a: number | null) => string;
  formatDate: (s: string | null) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const milestones = tasks
    .filter((t) => t.is_milestone)
    .sort((a, b) => {
      const dateA = a.start_date ?? a.end_date ?? "";
      const dateB = b.start_date ?? b.end_date ?? "";
      return dateA.localeCompare(dateB);
    });
  const budgetPct =
    project.contract_amount && project.actual_cost
      ? Math.round((project.actual_cost / project.contract_amount) * 100)
      : 0;

  const budgetClass =
    budgetPct > 100 ? "over" : budgetPct > 85 ? "warning" : "within";

  return (
    <>
      {/* KPI Row */}
      <div className="project-kpi-row">
        <div className="project-kpi-card">
          <div className="project-kpi-label">{t("contractAmount")}</div>
          <div className="project-kpi-value">
            {formatCurrency(project.contract_amount)}
          </div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">{t("actualCost")}</div>
          <div
            className={`project-kpi-value ${budgetPct > 100 ? "red" : ""}`}
          >
            {formatCurrency(project.actual_cost)}
          </div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">{t("columnCompletion")}</div>
          <div className="project-kpi-value">{project.completion_pct}%</div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">{t("openRfis")}</div>
          <div
            className={`project-kpi-value ${stats.open_rfis > 0 ? "amber" : ""}`}
          >
            {stats.open_rfis}
          </div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">{t("openCos")}</div>
          <div
            className={`project-kpi-value ${stats.open_change_orders > 0 ? "amber" : ""}`}
          >
            {stats.open_change_orders}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="project-info-grid">
        <div className="project-info-card">
          <div className="card-title">{t("projectDetails")}</div>
          <div className="info-row">
            <span className="info-label">{t("projectType")}</span>
            <span className="info-value">{project.project_type ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("client")}</span>
            <span className="info-value">{project.client_name ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("projectManager")}</span>
            <span className="info-value">
              {project.project_manager?.full_name ?? "--"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("superintendent")}</span>
            <span className="info-value">
              {project.superintendent?.full_name ?? "--"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("startDate")}</span>
            <span className="info-value">{formatDate(project.start_date)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("estimatedEnd")}</span>
            <span className="info-value">
              {formatDate(project.estimated_end_date)}
            </span>
          </div>
          {project.actual_end_date && (
            <div className="info-row">
              <span className="info-label">{t("actualEnd")}</span>
              <span className="info-value">
                {formatDate(project.actual_end_date)}
              </span>
            </div>
          )}
        </div>

        <div className="project-info-card">
          <div className="card-title">{t("location")}</div>
          <div className="info-row">
            <span className="info-label">{t("address")}</span>
            <span className="info-value">
              {project.address_line1 ?? "--"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("city")}</span>
            <span className="info-value">{project.city ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("state")}</span>
            <span className="info-value">{project.state ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("zip")}</span>
            <span className="info-value">{project.zip ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("tasks")}</span>
            <span className="info-value">
              {t("tasksComplete", { completed: stats.completed_tasks, total: stats.total_tasks })}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("dailyLogs")}</span>
            <span className="info-value">{stats.daily_log_count}</span>
          </div>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="budget-summary">
        <div className="card-title">{t("budgetSummary")}</div>
        <div className="budget-bar-container">
          <div className="budget-bar">
            <div
              className={`budget-bar-fill ${budgetClass}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="budget-labels">
            <span>
              {t("spent", { amount: formatCurrency(project.actual_cost), pct: budgetPct })}
            </span>
            <span>{t("budget", { amount: formatCurrency(project.contract_amount) })}</span>
          </div>
        </div>
      </div>

      {/* Completion Bar */}
      <div className="project-info-card" style={{ marginBottom: 24 }}>
        <div className="card-title">{t("overallProgress")}</div>
        <div className="completion-bar" style={{ height: 10 }}>
          <div
            className={`completion-bar-fill ${completionClass(project.completion_pct)}`}
            style={{ width: `${project.completion_pct}%` }}
          />
        </div>
        <div className="completion-info" style={{ marginTop: 6 }}>
          <span>{t("percentComplete", { pct: project.completion_pct })}</span>
          <span>
            {formatDate(project.start_date)} -{" "}
            {formatDate(project.estimated_end_date)}
          </span>
        </div>
      </div>

      {/* Milestone Timeline */}
      {milestones.length > 0 && (
        <div className="project-info-card" style={{ marginBottom: 24 }}>
          <div className="card-title">
            <Milestone size={18} style={{ color: "var(--color-amber)" }} />
            {t("milestoneTimeline")}
          </div>
          <div className="milestone-timeline">
            {milestones.map((ms, idx) => {
              const isCompleted = ms.status === "completed";
              const isInProgress = ms.status === "in_progress";
              const isLast = idx === milestones.length - 1;
              const msDate = ms.end_date ?? ms.start_date;

              return (
                <div key={ms.id} className="milestone-item">
                  {!isLast && (
                    <div
                      className="milestone-line"
                      style={{
                        background: isCompleted
                          ? "var(--color-green)"
                          : "var(--border)",
                      }}
                    />
                  )}
                  <div
                    className={`milestone-dot ${
                      isCompleted
                        ? "completed"
                        : isInProgress
                          ? "in-progress"
                          : "upcoming"
                    }`}
                  >
                    {isCompleted && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {isInProgress && <div className="milestone-dot-inner" />}
                    {!isCompleted && !isInProgress && (
                      <div className="milestone-dot-inner upcoming" />
                    )}
                  </div>
                  <div className="milestone-content">
                    <div className="milestone-header">
                      <span
                        className={`milestone-name ${
                          !isCompleted && !isInProgress ? "upcoming" : ""
                        }`}
                      >
                        {ms.name}
                      </span>
                      <span className="milestone-date">
                        {msDate
                          ? (isCompleted ? "" : t("est") + " ") + formatDate(msDate)
                          : "--"}
                      </span>
                    </div>
                    <span
                      className={`milestone-status ${
                        isCompleted
                          ? "completed"
                          : isInProgress
                            ? "in-progress"
                            : "upcoming"
                      }`}
                    >
                      {isCompleted
                        ? t("statusCompleted")
                        : isInProgress
                          ? t("statusInProgress")
                          : t("upcoming")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tasks Tab with Create Forms
// ---------------------------------------------------------------------------

const PHASE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

function TasksTabWithCreate({
  projectId,
  phases,
  tasks,
  onSelect,
  formatDate,
  statusLabel,
  t,
}: {
  projectId: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  onSelect: (task: ProjectTask) => void;
  formatDate: (s: string | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Phase form
  const [phaseName, setPhaseName] = useState("");
  const [phaseColor, setPhaseColor] = useState(PHASE_COLORS[0]);
  const [phaseStart, setPhaseStart] = useState("");
  const [phaseEnd, setPhaseEnd] = useState("");

  // Task form
  const [taskName, setTaskName] = useState("");
  const [taskPhaseId, setTaskPhaseId] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskStart, setTaskStart] = useState("");
  const [taskEnd, setTaskEnd] = useState("");
  const [taskMilestone, setTaskMilestone] = useState(false);

  async function handleCreatePhase(e: React.FormEvent) {
    e.preventDefault();
    if (!phaseName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: phaseName.trim(),
          color: phaseColor,
          start_date: phaseStart || null,
          end_date: phaseEnd || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("failedToCreatePhase"));
        return;
      }
      setPhaseName("");
      setPhaseStart("");
      setPhaseEnd("");
      setShowPhaseForm(false);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taskName.trim(),
          phase_id: taskPhaseId || null,
          priority: taskPriority,
          start_date: taskStart || null,
          end_date: taskEnd || null,
          is_milestone: taskMilestone,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("failedToCreateTask"));
        return;
      }
      setTaskName("");
      setTaskPhaseId("");
      setTaskPriority("medium");
      setTaskStart("");
      setTaskEnd("");
      setTaskMilestone(false);
      setShowTaskForm(false);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className="btn-secondary"
          style={{ fontSize: "0.82rem", padding: "6px 14px" }}
          onClick={() => { setShowPhaseForm(!showPhaseForm); setShowTaskForm(false); setError(""); }}
        >
          <Plus size={14} /> {t("addPhase")}
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: "0.82rem", padding: "6px 14px" }}
          onClick={() => { setShowTaskForm(!showTaskForm); setShowPhaseForm(false); setError(""); }}
        >
          <Plus size={14} /> {t("addTask")}
        </button>
      </div>

      {error && (
        <div style={{ color: "var(--color-red)", fontSize: "0.82rem", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Add Phase Form */}
      {showPhaseForm && (
        <form
          onSubmit={handleCreatePhase}
          className="card"
          style={{ marginBottom: 16, padding: 16 }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 12 }}>{t("newPhase")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("phaseNameRequired")}
              </label>
              <input
                type="text"
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
                placeholder={t("phaseNamePlaceholder")}
                required
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("color")}
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                {PHASE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPhaseColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: c,
                      border: phaseColor === c ? "2px solid var(--text)" : "2px solid transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginTop: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("startDate")}
              </label>
              <input
                type="date"
                value={phaseStart}
                onChange={(e) => setPhaseStart(e.target.value)}
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("endDate")}
              </label>
              <input
                type="date"
                value={phaseEnd}
                onChange={(e) => setPhaseEnd(e.target.value)}
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: "8px 20px" }}>
              {saving ? t("saving") : t("createPhase")}
            </button>
          </div>
        </form>
      )}

      {/* Add Task Form */}
      {showTaskForm && (
        <form
          onSubmit={handleCreateTask}
          className="card"
          style={{ marginBottom: 16, padding: 16 }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 12 }}>{t("newTask")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("taskNameRequired")}
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder={t("taskNamePlaceholder")}
                required
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("phase")}
              </label>
              <select
                value={taskPhaseId}
                onChange={(e) => setTaskPhaseId(e.target.value)}
                className="form-input"
                style={{ width: "100%" }}
              >
                <option value="">{t("noPhase")}</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("priority")}
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="form-input"
                style={{ width: "100%" }}
              >
                <option value="low">{t("priorityLow")}</option>
                <option value="medium">{t("priorityMedium")}</option>
                <option value="high">{t("priorityHigh")}</option>
                <option value="critical">{t("priorityCritical")}</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, marginTop: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("startDate")}
              </label>
              <input
                type="date"
                value={taskStart}
                onChange={(e) => setTaskStart(e.target.value)}
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 4 }}>
                {t("endDate")}
              </label>
              <input
                type="date"
                value={taskEnd}
                onChange={(e) => setTaskEnd(e.target.value)}
                className="form-input"
                style={{ width: "100%" }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", cursor: "pointer", paddingBottom: 6 }}>
              <input
                type="checkbox"
                checked={taskMilestone}
                onChange={(e) => setTaskMilestone(e.target.checked)}
              />
              {t("milestone")}
            </label>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: "8px 20px" }}>
              {saving ? t("saving") : t("createTask")}
            </button>
          </div>
        </form>
      )}

      {/* Existing Tasks List */}
      <TasksTab phases={phases} tasks={tasks} onSelect={onSelect} formatDate={formatDate} statusLabel={statusLabel} t={t} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Tasks Tab (display only)
// ---------------------------------------------------------------------------

function TasksTab({
  phases,
  tasks,
  onSelect,
  formatDate,
  statusLabel,
  t,
}: {
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  onSelect: (task: ProjectTask) => void;
  formatDate: (s: string | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (tasks.length === 0) {
    return <div className="tab-empty">{t("noTasksYet")}</div>;
  }

  // Group tasks by phase
  const tasksByPhase = new Map<string | null, ProjectTask[]>();
  for (const task of tasks) {
    const key = task.phase_id;
    if (!tasksByPhase.has(key)) {
      tasksByPhase.set(key, []);
    }
    tasksByPhase.get(key)!.push(task);
  }

  // Build display order: phases first, then unphased tasks
  const phaseOrder = [...phases];
  const unphasedTasks = tasksByPhase.get(null) ?? [];

  function phaseCompletion(phaseTasks: ProjectTask[]) {
    if (phaseTasks.length === 0) return 0;
    const total = phaseTasks.reduce((s, t) => s + t.completion_pct, 0);
    return Math.round(total / phaseTasks.length);
  }

  return (
    <>
      {phaseOrder.map((phase) => {
        const phaseTasks = tasksByPhase.get(phase.id) ?? [];
        if (phaseTasks.length === 0) return null;
        const pct = phaseCompletion(phaseTasks);

        return (
          <div key={phase.id} className="phase-group">
            <div className="phase-header">
              <span
                className="phase-color-dot"
                style={{ background: phase.color ?? "var(--color-blue)" }}
              />
              <span className="phase-name">{phase.name}</span>
              <span className="phase-completion">{t("percentComplete", { pct })}</span>
            </div>
            {phaseTasks.map((task) => (
              <TaskRow key={task.id} task={task} onSelect={onSelect} formatDate={formatDate} statusLabel={statusLabel} />
            ))}
          </div>
        );
      })}

      {unphasedTasks.length > 0 && (
        <div className="phase-group">
          <div className="phase-header">
            <span
              className="phase-color-dot"
              style={{ background: "var(--muted)" }}
            />
            <span className="phase-name">{t("unassignedPhase")}</span>
            <span className="phase-completion">
              {t("percentComplete", { pct: phaseCompletion(unphasedTasks) })}
            </span>
          </div>
          {unphasedTasks.map((task) => (
            <TaskRow key={task.id} task={task} onSelect={onSelect} formatDate={formatDate} statusLabel={statusLabel} />
          ))}
        </div>
      )}
    </>
  );
}

function TaskRow({ task, onSelect, formatDate, statusLabel }: { task: ProjectTask; onSelect: (task: ProjectTask) => void; formatDate: (s: string | null) => string; statusLabel: (s: string) => string }) {
  return (
    <div
      className={`task-item clickable ${task.is_milestone ? "milestone" : ""}`}
      onClick={() => onSelect(task)}
    >
      {task.is_milestone && (
        <Milestone size={14} style={{ color: "var(--color-amber)", flexShrink: 0 }} />
      )}
      <span className={`task-name ${task.is_critical_path ? "critical" : ""}`}>
        {task.name}
      </span>
      <span className={`badge badge-${task.status}`}>
        {statusLabel(task.status)}
      </span>
      <span className={`badge badge-${task.priority}`}>
        {task.priority}
      </span>
      <span className="task-dates">
        {formatDate(task.start_date)} - {formatDate(task.end_date)}
      </span>
      <span className="task-assignee">
        {task.assignee?.full_name ?? ""}
      </span>
      <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
        {task.completion_pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daily Logs Tab
// ---------------------------------------------------------------------------

function DailyLogsTab({
  logs,
  onSelect,
  dateLocale,
  statusLabel,
  t,
}: {
  logs: DailyLog[];
  onSelect: (log: DailyLog) => void;
  dateLocale: string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (logs.length === 0) {
    return <div className="tab-empty">{t("noDailyLogsYet")}</div>;
  }

  return (
    <div>
      {logs.map((log) => {
        const d = new Date(log.log_date);
        const day = d.getDate();
        const month = formatDateSafe(toDateStr(d));

        return (
          <div
            key={log.id}
            className="daily-log-item clickable"
            onClick={() => onSelect(log)}
          >
            <div className="log-date-block">
              <div className="log-date-day">{day}</div>
              <div className="log-date-month">{month}</div>
            </div>
            <div className="log-content">
              <div className="log-meta">
                <span className={`badge badge-${log.status}`}>
                  {statusLabel(log.status)}
                </span>
                {log.weather_conditions && (
                  <span className="log-weather">
                    <CloudSun size={13} />
                    {log.weather_conditions}
                  </span>
                )}
                {log.weather_temp_high != null && (
                  <span className="log-weather">
                    <Thermometer size={13} />
                    {log.weather_temp_high}F / {log.weather_temp_low ?? "--"}F
                  </span>
                )}
                {log.weather_precipitation && (
                  <span className="log-weather">
                    <Droplets size={13} />
                    {log.weather_precipitation}
                  </span>
                )}
                <span>{t("by")} {log.creator?.full_name ?? t("unknown")}</span>
              </div>
              {log.work_performed && (
                <div className="log-work">{log.work_performed}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RFIs Tab
// ---------------------------------------------------------------------------

function RFIsTab({
  rfis,
  onSelect,
  formatDate,
  statusLabel,
  t,
}: {
  rfis: RFI[];
  onSelect: (rfi: RFI) => void;
  formatDate: (s: string | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (rfis.length === 0) {
    return <div className="tab-empty">{t("noRfisYet")}</div>;
  }

  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th>{t("number")}</th>
            <th>{t("subject")}</th>
            <th>{t("columnStatus")}</th>
            <th>{t("priority")}</th>
            <th>{t("assignedTo")}</th>
            <th>{t("date")}</th>
          </tr>
        </thead>
        <tbody>
          {rfis.map((rfi) => (
            <tr
              key={rfi.id}
              className="clickable-row"
              onClick={() => onSelect(rfi)}
            >
              <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                {rfi.rfi_number}
              </td>
              <td>{rfi.subject}</td>
              <td>
                <span className={`badge badge-${rfi.status}`}>
                  {statusLabel(rfi.status)}
                </span>
              </td>
              <td>
                <span className={`badge badge-${rfi.priority}`}>
                  {rfi.priority}
                </span>
              </td>
              <td style={{ fontSize: "0.82rem" }}>
                {rfi.assignee?.full_name ?? "--"}
              </td>
              <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                {formatDate(rfi.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change Orders Tab
// ---------------------------------------------------------------------------

function ChangeOrdersTab({
  changeOrders,
  onSelect,
  formatCurrency,
  formatDate,
  statusLabel,
  t,
}: {
  changeOrders: ChangeOrder[];
  onSelect: (co: ChangeOrder) => void;
  formatCurrency: (a: number | null) => string;
  formatDate: (s: string | null) => string;
  statusLabel: (s: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (changeOrders.length === 0) {
    return (
      <div className="tab-empty">{t("noChangeOrdersYet")}</div>
    );
  }

  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th>{t("number")}</th>
            <th>{t("columnTitle")}</th>
            <th>{t("columnStatus")}</th>
            <th>{t("amount")}</th>
            <th>{t("scheduleImpact")}</th>
            <th>{t("date")}</th>
          </tr>
        </thead>
        <tbody>
          {changeOrders.map((co) => (
            <tr
              key={co.id}
              className="clickable-row"
              onClick={() => onSelect(co)}
            >
              <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                {co.co_number}
              </td>
              <td>{co.title}</td>
              <td>
                <span className={`badge badge-${co.status}`}>
                  {statusLabel(co.status)}
                </span>
              </td>
              <td
                className={
                  co.amount != null
                    ? co.amount >= 0
                      ? "amount-positive"
                      : "amount-negative"
                    : ""
                }
                style={{ fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {formatCurrency(co.amount)}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                {co.schedule_impact_days != null
                  ? t("scheduleImpactDays", { count: co.schedule_impact_days })
                  : "--"}
              </td>
              <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                {formatDate(co.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
