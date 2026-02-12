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
} from "lucide-react";
import type {
  ProjectRow,
  ProjectPhase,
  ProjectTask,
  DailyLog,
  RFI,
  ChangeOrder,
  ProjectStats,
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
          <Link href={`/projects/${project.id}`} className="btn-secondary">
            <Pencil size={14} />
            Edit Project
          </Link>
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
          <OverviewTab project={project} stats={stats} />
        )}
        {activeTab === "tasks" && (
          <TasksTab phases={phases} tasks={tasks} />
        )}
        {activeTab === "daily-logs" && (
          <DailyLogsTab logs={dailyLogs} />
        )}
        {activeTab === "rfis" && <RFIsTab rfis={rfis} />}
        {activeTab === "change-orders" && (
          <ChangeOrdersTab changeOrders={changeOrders} />
        )}
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
}: {
  project: ProjectRow;
  stats: ProjectStats;
}) {
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Tasks Tab
// ---------------------------------------------------------------------------

function TasksTab({
  phases,
  tasks,
}: {
  phases: ProjectPhase[];
  tasks: ProjectTask[];
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
              <TaskRow key={task.id} task={task} />
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
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </>
  );
}

function TaskRow({ task }: { task: ProjectTask }) {
  return (
    <div className={`task-item ${task.is_milestone ? "milestone" : ""}`}>
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

function DailyLogsTab({ logs }: { logs: DailyLog[] }) {
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
          <div key={log.id} className="daily-log-item">
            <div className="log-date-block">
              <div className="log-date-day">{day}</div>
              <div className="log-date-month">{month}</div>
            </div>
            <div className="log-content">
              <div className="log-meta">
                <span className={`badge badge-${log.status}`}>
                  {statusLabel(log.status)}
                </span>
                {log.weather_condition && (
                  <span className="log-weather">
                    <CloudSun size={13} />
                    {log.weather_condition}
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

function RFIsTab({ rfis }: { rfis: RFI[] }) {
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
            <tr key={rfi.id}>
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
}: {
  changeOrders: ChangeOrder[];
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
            <tr key={co.id}>
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
