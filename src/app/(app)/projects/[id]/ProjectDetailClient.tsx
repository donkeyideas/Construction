"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  CloudSun,
  Thermometer,
  Droplets,
  Milestone,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | null) {
  if (amount == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toInputDate(dateStr: string | null) {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pre_construction: "Pre-Construction",
    active: "Active",
    on_hold: "On Hold",
    completed: "Completed",
    closed: "Closed",
    draft: "Draft",
    open: "Open",
    submitted: "Submitted",
    answered: "Answered",
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending",
    not_started: "Not Started",
    in_progress: "In Progress",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

function completionClass(pct: number) {
  if (pct >= 75) return "high";
  if (pct <= 25) return "low";
  return "";
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "daily-logs", label: "Daily Logs" },
  { key: "rfis", label: "RFIs" },
  { key: "change-orders", label: "Change Orders" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectDetailClientProps {
  project: ProjectRow;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  dailyLogs: DailyLog[];
  rfis: RFI[];
  changeOrders: ChangeOrder[];
  stats: ProjectStats;
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
}: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Detail / edit modal state
  const [selectedRfi, setSelectedRfi] = useState<RFI | null>(null);
  const [selectedCo, setSelectedCo] = useState<ChangeOrder | null>(null);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
              <ArrowLeft size={14} /> Back to Projects
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
            Edit Project
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
          <OverviewTab project={project} stats={stats} tasks={tasks} />
        )}
        {activeTab === "tasks" && (
          <TasksTab phases={phases} tasks={tasks} onSelect={setSelectedTask} />
        )}
        {activeTab === "daily-logs" && (
          <DailyLogsTab logs={dailyLogs} onSelect={setSelectedLog} />
        )}
        {activeTab === "rfis" && (
          <RFIsTab rfis={rfis} onSelect={setSelectedRfi} />
        )}
        {activeTab === "change-orders" && (
          <ChangeOrdersTab changeOrders={changeOrders} onSelect={setSelectedCo} />
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
        />
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
        />
      )}

      {/* Change Order Detail / Edit Modal */}
      {selectedCo && (
        <ChangeOrderModal
          co={selectedCo}
          editMode={editMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => { setSelectedCo(null); setEditMode(false); }}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
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
        />
      )}

      {/* Task Detail Modal (view only) */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
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
}: {
  project: ProjectRow;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    status: project.status,
    completion_pct: project.completion_pct,
    project_type: project.project_type ?? "",
    client_name: project.client_name ?? "",
    contract_amount: project.contract_amount ?? "",
    actual_cost: project.actual_cost ?? "",
    start_date: toInputDate(project.start_date),
    estimated_end_date: toInputDate(project.estimated_end_date),
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
          contract_amount: form.contract_amount !== "" ? Number(form.contract_amount) : null,
          actual_cost: form.actual_cost !== "" ? Number(form.actual_cost) : null,
          start_date: form.start_date || null,
          estimated_end_date: form.estimated_end_date || null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update project.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Project</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="modal-form-grid">
            <div className="form-group full-width">
              <label className="form-label">Project Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              >
                <option value="pre_construction">Pre-Construction</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Completion %</label>
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
              <label className="form-label">Project Type</label>
              <input
                className="form-input"
                value={form.project_type}
                onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                placeholder="e.g. Commercial, Residential"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input
                className="form-input"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contract Amount</label>
              <input
                className="form-input"
                type="number"
                value={form.contract_amount}
                onChange={(e) => setForm({ ...form, contract_amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Actual Cost</label>
              <input
                className="form-input"
                type="number"
                value={form.actual_cost}
                onChange={(e) => setForm({ ...form, actual_cost: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                className="form-input"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated End Date</label>
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
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
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
}: {
  rfi: RFI;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
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
        setError(data.error || "Failed to update RFI.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Edit {rfi.rfi_number}: {rfi.subject}</h3>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div className="modal-form-grid">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Answer</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="Enter the answer to this RFI..."
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Assigned To (User ID)</label>
                <input
                  className="form-input"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  placeholder="User ID"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancelEdit} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
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
            <span className="modal-detail-label">Status</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${rfi.status}`}>{statusLabel(rfi.status)}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Priority</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${rfi.priority}`}>{rfi.priority}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Assigned To</span>
            <span className="modal-detail-value">{rfi.assignee?.full_name ?? "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Due Date</span>
            <span className="modal-detail-value">{formatDate(rfi.due_date)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Created</span>
            <span className="modal-detail-value">{formatDateTime(rfi.created_at)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Answered At</span>
            <span className="modal-detail-value">{formatDateTime(rfi.answered_at)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Cost Impact</span>
            <span className="modal-detail-value">{rfi.cost_impact != null ? formatCurrency(rfi.cost_impact) : "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Schedule Impact</span>
            <span className="modal-detail-value">
              {rfi.schedule_impact_days != null
                ? `${rfi.schedule_impact_days} day${rfi.schedule_impact_days !== 1 ? "s" : ""}`
                : "--"}
            </span>
          </div>

          <div className="modal-section-title">Question</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>
            {rfi.question || "--"}
          </div>

          <div className="modal-section-title">Answer</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {rfi.answer || "--"}
          </div>

          <div className="modal-actions">
            <button className="btn-primary" onClick={onEdit}>
              <Pencil size={14} /> Edit RFI
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
  onClose,
  onEdit,
  onCancelEdit,
}: {
  co: ChangeOrder;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
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
        setError(data.error || "Failed to update change order.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Edit {co.co_number}: {co.title}</h3>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div className="modal-form-grid">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Schedule Impact (days)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.schedule_impact_days}
                  onChange={(e) => setForm({ ...form, schedule_impact_days: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the change order..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancelEdit} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
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
          <h3>{co.co_number}: {co.title}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-detail-row">
            <span className="modal-detail-label">Status</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${co.status}`}>{statusLabel(co.status)}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Amount</span>
            <span className="modal-detail-value" style={{ fontWeight: 600 }}>
              {formatCurrency(co.amount)}
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Schedule Impact</span>
            <span className="modal-detail-value">
              {co.schedule_impact_days != null
                ? `${co.schedule_impact_days} day${co.schedule_impact_days !== 1 ? "s" : ""}`
                : "--"}
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Reason</span>
            <span className="modal-detail-value">{co.reason || "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Created</span>
            <span className="modal-detail-value">{formatDateTime(co.created_at)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Approved By</span>
            <span className="modal-detail-value">{co.approved_by || "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Approved At</span>
            <span className="modal-detail-value">{formatDateTime(co.approved_at)}</span>
          </div>

          {co.description && (
            <>
              <div className="modal-section-title">Description</div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {co.description}
              </div>
            </>
          )}

          {co.line_items && co.line_items.length > 0 && (
            <>
              <div className="modal-section-title">Line Items</div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(co.line_items, null, 2)}
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="btn-primary" onClick={onEdit}>
              <Pencil size={14} /> Edit Change Order
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
}: {
  log: DailyLog;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
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
        setError(data.error || "Failed to update daily log.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Edit Daily Log - {formatDate(log.log_date)}</h3>
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div className="modal-form-grid">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Weather Condition</label>
                <input
                  className="form-input"
                  value={form.weather_conditions}
                  onChange={(e) => setForm({ ...form, weather_conditions: e.target.value })}
                  placeholder="e.g. Sunny, Cloudy, Rain"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temp High (F)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.weather_temp_high}
                  onChange={(e) => setForm({ ...form, weather_temp_high: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temp Low (F)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.weather_temp_low}
                  onChange={(e) => setForm({ ...form, weather_temp_low: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Work Performed</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={form.work_performed}
                  onChange={(e) => setForm({ ...form, work_performed: e.target.value })}
                  placeholder="Describe work performed today..."
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Delays</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.delays}
                  onChange={(e) => setForm({ ...form, delays: e.target.value })}
                  placeholder="Any delays encountered..."
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Safety Incidents</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.safety_incidents}
                  onChange={(e) => setForm({ ...form, safety_incidents: e.target.value })}
                  placeholder="Any safety incidents..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onCancelEdit} disabled={saving}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
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
          <h3>Daily Log - {formatDate(log.log_date)}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-detail-row">
            <span className="modal-detail-label">Status</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${log.status}`}>{statusLabel(log.status)}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Created By</span>
            <span className="modal-detail-value">{log.creator?.full_name ?? "--"}</span>
          </div>

          {/* Weather */}
          <div className="modal-section-title">Weather</div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Condition</span>
            <span className="modal-detail-value">{log.weather_conditions ?? "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Temperature</span>
            <span className="modal-detail-value">
              {log.weather_temp_high != null
                ? `${log.weather_temp_high}F / ${log.weather_temp_low ?? "--"}F`
                : "--"}
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Precipitation</span>
            <span className="modal-detail-value">{log.weather_precipitation ?? "--"}</span>
          </div>

          {/* Work */}
          <div className="modal-section-title">Work Performed</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 4 }}>
            {log.work_performed || "--"}
          </div>

          {/* Workforce */}
          {workforce && workforce.length > 0 && (
            <>
              <div className="modal-section-title">Workforce</div>
              {workforce.map((w, i) => (
                <div key={i} className="modal-detail-row">
                  <span className="modal-detail-label">{w.trade ?? "Trade"}</span>
                  <span className="modal-detail-value">
                    {w.headcount ?? 0} workers, {w.hours ?? 0} hrs
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Equipment */}
          {equipment && equipment.length > 0 && (
            <>
              <div className="modal-section-title">Equipment</div>
              {equipment.map((eq, i) => (
                <div key={i} className="modal-detail-row">
                  <span className="modal-detail-label">{eq.name ?? "Equipment"}</span>
                  <span className="modal-detail-value">{eq.hours ?? 0} hrs</span>
                </div>
              ))}
            </>
          )}

          {/* Materials */}
          {materialsReceived && (
            <>
              <div className="modal-section-title">Materials Received</div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {materialsReceived}
              </div>
            </>
          )}

          {/* Delays */}
          <div className="modal-section-title">Delays</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 4 }}>
            {log.delays || "None reported"}
          </div>

          {/* Safety Incidents */}
          <div className="modal-section-title">Safety Incidents</div>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {log.safety_incidents || "None reported"}
          </div>

          <div className="modal-actions">
            <button className="btn-primary" onClick={onEdit}>
              <Pencil size={14} /> Edit Daily Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Task Modal (Detail only)
// ===========================================================================

function TaskModal({
  task,
  onClose,
}: {
  task: ProjectTask;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{task.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="modal-detail-row">
            <span className="modal-detail-label">Status</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${task.status}`}>{statusLabel(task.status)}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Priority</span>
            <span className="modal-detail-value">
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Completion</span>
            <span className="modal-detail-value">{task.completion_pct}%</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Assigned To</span>
            <span className="modal-detail-value">{task.assignee?.full_name ?? "--"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Start Date</span>
            <span className="modal-detail-value">{formatDate(task.start_date)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">End Date</span>
            <span className="modal-detail-value">{formatDate(task.end_date)}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Milestone</span>
            <span className="modal-detail-value">{task.is_milestone ? "Yes" : "No"}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Critical Path</span>
            <span className="modal-detail-value">{task.is_critical_path ? "Yes" : "No"}</span>
          </div>
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
}: {
  project: ProjectRow;
  stats: ProjectStats;
  tasks: ProjectTask[];
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
          <div className="project-kpi-label">Contract Amount</div>
          <div className="project-kpi-value">
            {formatCurrency(project.contract_amount)}
          </div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">Actual Cost</div>
          <div
            className={`project-kpi-value ${budgetPct > 100 ? "red" : ""}`}
          >
            {formatCurrency(project.actual_cost)}
          </div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">Completion</div>
          <div className="project-kpi-value">{project.completion_pct}%</div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">Open RFIs</div>
          <div
            className={`project-kpi-value ${stats.open_rfis > 0 ? "amber" : ""}`}
          >
            {stats.open_rfis}
          </div>
        </div>
        <div className="project-kpi-card">
          <div className="project-kpi-label">Open COs</div>
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
          <div className="card-title">Project Details</div>
          <div className="info-row">
            <span className="info-label">Project Type</span>
            <span className="info-value">{project.project_type ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Client</span>
            <span className="info-value">{project.client_name ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Project Manager</span>
            <span className="info-value">
              {project.project_manager?.full_name ?? "--"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Superintendent</span>
            <span className="info-value">
              {project.superintendent?.full_name ?? "--"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Start Date</span>
            <span className="info-value">{formatDate(project.start_date)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Estimated End</span>
            <span className="info-value">
              {formatDate(project.estimated_end_date)}
            </span>
          </div>
          {project.actual_end_date && (
            <div className="info-row">
              <span className="info-label">Actual End</span>
              <span className="info-value">
                {formatDate(project.actual_end_date)}
              </span>
            </div>
          )}
        </div>

        <div className="project-info-card">
          <div className="card-title">Location</div>
          <div className="info-row">
            <span className="info-label">Address</span>
            <span className="info-value">
              {project.address_line1 ?? "--"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">City</span>
            <span className="info-value">{project.city ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">State</span>
            <span className="info-value">{project.state ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">ZIP</span>
            <span className="info-value">{project.zip ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Tasks</span>
            <span className="info-value">
              {stats.completed_tasks} / {stats.total_tasks} complete
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Daily Logs</span>
            <span className="info-value">{stats.daily_log_count}</span>
          </div>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="budget-summary">
        <div className="card-title">Budget Summary</div>
        <div className="budget-bar-container">
          <div className="budget-bar">
            <div
              className={`budget-bar-fill ${budgetClass}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="budget-labels">
            <span>
              Spent: {formatCurrency(project.actual_cost)} (
              {budgetPct}%)
            </span>
            <span>Budget: {formatCurrency(project.contract_amount)}</span>
          </div>
        </div>
      </div>

      {/* Completion Bar */}
      <div className="project-info-card" style={{ marginBottom: 24 }}>
        <div className="card-title">Overall Progress</div>
        <div className="completion-bar" style={{ height: 10 }}>
          <div
            className={`completion-bar-fill ${completionClass(project.completion_pct)}`}
            style={{ width: `${project.completion_pct}%` }}
          />
        </div>
        <div className="completion-info" style={{ marginTop: 6 }}>
          <span>{project.completion_pct}% complete</span>
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
            Milestone Timeline
          </div>
          <div className="milestone-timeline">
            {milestones.map((ms, idx) => {
              const isCompleted = ms.status === "completed";
              const isInProgress = ms.status === "in_progress";
              const isLast = idx === milestones.length - 1;
              const msDate = ms.end_date ?? ms.start_date;

              return (
                <div key={ms.id} className="milestone-item">
                  {/* Vertical line (except for last item) */}
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
                  {/* Dot */}
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
                  {/* Content */}
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
                          ? (isCompleted ? "" : "Est. ") + formatDate(msDate)
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
                        ? "Completed"
                        : isInProgress
                          ? "In Progress"
                          : "Upcoming"}
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
// Tasks Tab
// ---------------------------------------------------------------------------

function TasksTab({
  phases,
  tasks,
  onSelect,
}: {
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  onSelect: (task: ProjectTask) => void;
}) {
  if (tasks.length === 0) {
    return <div className="tab-empty">No tasks have been created for this project yet.</div>;
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
              <span className="phase-completion">{pct}% complete</span>
            </div>
            {phaseTasks.map((task) => (
              <TaskRow key={task.id} task={task} onSelect={onSelect} />
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
            <span className="phase-name">Unassigned Phase</span>
            <span className="phase-completion">
              {phaseCompletion(unphasedTasks)}% complete
            </span>
          </div>
          {unphasedTasks.map((task) => (
            <TaskRow key={task.id} task={task} onSelect={onSelect} />
          ))}
        </div>
      )}
    </>
  );
}

function TaskRow({ task, onSelect }: { task: ProjectTask; onSelect: (task: ProjectTask) => void }) {
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
}: {
  logs: DailyLog[];
  onSelect: (log: DailyLog) => void;
}) {
  if (logs.length === 0) {
    return <div className="tab-empty">No daily logs have been submitted for this project yet.</div>;
  }

  return (
    <div>
      {logs.map((log) => {
        const d = new Date(log.log_date);
        const day = d.getDate();
        const month = d.toLocaleDateString("en-US", { month: "short" });

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
                <span>by {log.creator?.full_name ?? "Unknown"}</span>
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
}: {
  rfis: RFI[];
  onSelect: (rfi: RFI) => void;
}) {
  if (rfis.length === 0) {
    return <div className="tab-empty">No RFIs have been created for this project yet.</div>;
  }

  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th>Number</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assigned To</th>
            <th>Date</th>
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
}: {
  changeOrders: ChangeOrder[];
  onSelect: (co: ChangeOrder) => void;
}) {
  if (changeOrders.length === 0) {
    return (
      <div className="tab-empty">No change orders have been created for this project yet.</div>
    );
  }

  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th>Number</th>
            <th>Title</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Schedule Impact</th>
            <th>Date</th>
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
                  ? `${co.schedule_impact_days} day${co.schedule_impact_days !== 1 ? "s" : ""}`
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
