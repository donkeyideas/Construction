"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Hash,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Wrench,
  HardHat,
  Thermometer,
  Plus,
  X,
  Edit3,
  Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkforceEntry {
  trade?: string;
  company?: string;
  headcount?: number;
  hours?: number;
}

interface DailyLog {
  id: string;
  log_date: string;
  status: string;
  weather_conditions: string | null;
  weather_temp_high: number | null;
  weather_temp_low: number | null;
  weather_wind_mph: number | null;
  weather_humidity_pct: number | null;
  work_performed: string | null;
  workforce: WorkforceEntry[] | null;
  equipment: Record<string, unknown>[] | null;
  materials_received: string | null;
  safety_incidents: string | null;
  delays: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  projects: { name: string; code: string } | null;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface KpiData {
  totalCount: number;
  pendingReview: number;
  approvedCount: number;
}

interface DailyLogsClientProps {
  rows: DailyLog[];
  kpi: KpiData;
  userMap: Record<string, string>;
  projects: Project[];
  activeStatus: string | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  sunny: <Sun size={16} />,
  clear: <Sun size={16} />,
  cloudy: <Cloud size={16} />,
  overcast: <Cloud size={16} />,
  partly_cloudy: <Cloud size={16} />,
  rain: <CloudRain size={16} />,
  rainy: <CloudRain size={16} />,
  snow: <Snowflake size={16} />,
  snowy: <Snowflake size={16} />,
  windy: <Wind size={16} />,
  storm: <CloudRain size={16} />,
};

function getWeatherIcon(condition: string | null): React.ReactNode {
  if (!condition) return <Sun size={16} />;
  const key = condition.toLowerCase().replace(/\s+/g, "_");
  return WEATHER_ICONS[key] ?? <Cloud size={16} />;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "inv-status inv-status-draft",
  submitted: "inv-status inv-status-pending",
  approved: "inv-status inv-status-approved",
};

const WEATHER_OPTIONS = [
  { value: "sunny", label: "Sunny" },
  { value: "partly_cloudy", label: "Partly Cloudy" },
  { value: "cloudy", label: "Cloudy" },
  { value: "rain", label: "Rain" },
  { value: "snow", label: "Snow" },
  { value: "storm", label: "Storm" },
];

const statuses = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
];

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/daily-logs";
  return `/projects/daily-logs?status=${status}`;
}

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyLogsClient({
  rows,
  kpi,
  userMap,
  projects,
  activeStatus,
}: DailyLogsClientProps) {
  const router = useRouter();

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    project_id: "",
    log_date: getTodayString(),
    weather_conditions: "",
    temperature: "",
    workforce_count: "",
    work_performed: "",
    safety_incidents: "",
    delays: "",
  });

  // Detail/Edit/Delete modal state
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/projects/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id,
          log_date: formData.log_date,
          weather_conditions: formData.weather_conditions || undefined,
          temperature: formData.temperature || undefined,
          workforce_count: formData.workforce_count
            ? Number(formData.workforce_count)
            : undefined,
          work_performed: formData.work_performed || undefined,
          safety_incidents: formData.safety_incidents || undefined,
          delays: formData.delays || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create daily log");
      }

      // Reset form and close modal
      setFormData({
        project_id: "",
        log_date: getTodayString(),
        weather_conditions: "",
        temperature: "",
        workforce_count: "",
        work_performed: "",
        safety_incidents: "",
        delays: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create daily log"
      );
    } finally {
      setCreating(false);
    }
  }

  function openDetail(log: DailyLog) {
    setSelectedLog(log);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
  }

  function closeDetail() {
    setSelectedLog(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditData({});
    setSaveError("");
  }

  function startEditing() {
    if (!selectedLog) return;
    setEditData({
      status: selectedLog.status || "draft",
      weather_conditions: selectedLog.weather_conditions || "",
      weather_temp_high: selectedLog.weather_temp_high?.toString() || "",
      work_performed: selectedLog.work_performed || "",
      safety_incidents: selectedLog.safety_incidents || "",
      delays: selectedLog.delays || "",
      materials_received: selectedLog.materials_received || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedLog) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/projects/daily-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLog.id,
          status: editData.status,
          weather_conditions: editData.weather_conditions || undefined,
          weather_temp_high: editData.weather_temp_high
            ? Number(editData.weather_temp_high)
            : undefined,
          work_performed: editData.work_performed || undefined,
          safety_incidents: editData.safety_incidents || undefined,
          delays: editData.delays || undefined,
          materials_received: editData.materials_received || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update daily log");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update daily log"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedLog) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/projects/daily-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLog.id,
          status: "deleted",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete daily log");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to delete daily log"
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
          <h2>Daily Logs</h2>
          <p className="fin-header-sub">
            Field reports with weather, workforce, equipment, and activity
            tracking
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Daily Log
        </button>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">Total Logs</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Pending Review</span>
          <span className="fin-kpi-value">{kpi.pendingReview}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">Approved</span>
          <span className="fin-kpi-value">{kpi.approvedCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            fontWeight: 500,
          }}
        >
          Status:
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

      {/* Card-based layout */}
      {rows.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {rows.map((log) => {
            const project = log.projects;
            const workforce = (log.workforce ?? []) as WorkforceEntry[];
            const equipment = (log.equipment ?? []) as Record<
              string,
              unknown
            >[];
            const totalWorkers = workforce.reduce(
              (sum, w) => sum + (w.headcount ?? 0),
              0
            );
            const totalManHours = workforce.reduce(
              (sum, w) => sum + (w.headcount ?? 0) * (w.hours ?? 0),
              0
            );
            const hasSafety = !!log.safety_incidents;
            const hasDelays = !!log.delays;

            return (
              <div
                key={log.id}
                className="card"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                onClick={() => openDetail(log)}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{ fontWeight: 600, fontSize: "0.95rem" }}
                    >
                      {new Date(log.log_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={
                        STATUS_BADGE[log.status] ?? "inv-status"
                      }
                    >
                      {log.status}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                    }}
                  >
                    {project && (
                      <span>
                        <strong>{project.code}</strong> {project.name}
                      </span>
                    )}
                    {log.created_by && (
                      <span>
                        by {userMap[log.created_by] ?? "Unknown"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Weather Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontSize: "0.85rem",
                      color: "var(--muted)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {getWeatherIcon(log.weather_conditions)}
                      {log.weather_conditions ?? "N/A"}
                    </span>
                    {(log.weather_temp_high != null ||
                      log.weather_temp_low != null) && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Thermometer size={14} />
                        {log.weather_temp_low != null
                          ? `${log.weather_temp_low}`
                          : "--"}
                        {" / "}
                        {log.weather_temp_high != null
                          ? `${log.weather_temp_high}`
                          : "--"}
                        &deg;F
                      </span>
                    )}
                    {log.weather_wind_mph != null && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Wind size={14} />
                        {log.weather_wind_mph} mph
                      </span>
                    )}
                  </div>

                  {/* Work Performed */}
                  {log.work_performed && (
                    <div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--muted)",
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        Work Performed
                      </div>
                      <div
                        style={{ fontSize: "0.85rem", lineHeight: 1.5 }}
                      >
                        {log.work_performed}
                      </div>
                    </div>
                  )}

                  {/* Stats Row */}
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      flexWrap: "wrap",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Users
                        size={14}
                        style={{ color: "var(--color-blue)" }}
                      />
                      <strong>{totalWorkers}</strong> workers
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <HardHat
                        size={14}
                        style={{ color: "var(--color-blue)" }}
                      />
                      <strong>{totalManHours.toLocaleString()}</strong>{" "}
                      man-hrs
                    </span>
                    {equipment.length > 0 && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Wrench
                          size={14}
                          style={{ color: "var(--color-blue)" }}
                        />
                        <strong>{equipment.length}</strong> equipment
                      </span>
                    )}
                  </div>

                  {/* Safety / Delay flags */}
                  {(hasSafety || hasDelays) && (
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {hasSafety && (
                        <span
                          className="badge badge-red"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertTriangle size={12} />
                          Safety Incident
                        </span>
                      )}
                      {hasDelays && (
                        <span
                          className="badge badge-amber"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Clock size={12} />
                          Delay Reported
                        </span>
                      )}
                    </div>
                  )}

                  {/* Workforce Breakdown */}
                  {workforce.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {workforce.map((w, i) => (
                        <span
                          key={i}
                          className="badge badge-blue"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {w.trade ?? "General"}: {w.headcount ?? 0}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expandable details */}
                  {(log.materials_received ||
                    log.delays ||
                    log.safety_incidents) && (
                    <details
                      style={{
                        borderTop: "1px solid var(--border)",
                        paddingTop: 12,
                        marginTop: 2,
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          color: "var(--color-blue)",
                          userSelect: "none",
                        }}
                      >
                        Additional Details
                      </summary>
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          fontSize: "0.85rem",
                        }}
                      >
                        {log.materials_received && (
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                color: "var(--muted)",
                                marginBottom: 2,
                              }}
                            >
                              Materials Received
                            </div>
                            <div style={{ lineHeight: 1.5 }}>
                              {log.materials_received}
                            </div>
                          </div>
                        )}
                        {log.delays && (
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                color: "var(--color-amber)",
                                marginBottom: 2,
                              }}
                            >
                              Delays
                            </div>
                            <div style={{ lineHeight: 1.5 }}>
                              {log.delays}
                            </div>
                          </div>
                        )}
                        {log.safety_incidents && (
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                color: "var(--color-red)",
                                marginBottom: 2,
                              }}
                            >
                              Safety Incidents
                            </div>
                            <div style={{ lineHeight: 1.5 }}>
                              {log.safety_incidents}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <ClipboardList size={48} />
            </div>
            <div className="fin-empty-title">No Daily Logs Found</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? "No daily logs match the current filter. Try selecting a different status."
                : "No daily logs have been created yet. Field reports will appear here once submitted."}
            </div>
          </div>
        </div>
      )}

      {/* Detail/Edit/Delete Modal */}
      {selectedLog && (
        <div
          className="ticket-modal-overlay"
          onClick={closeDetail}
        >
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>
                {isEditing ? "Edit Daily Log" : "Daily Log Details"}
              </h3>
              <button
                className="ticket-modal-close"
                onClick={closeDetail}
              >
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {showDeleteConfirm ? (
              <div className="ticket-delete-confirm">
                <p style={{ marginBottom: 16 }}>
                  Are you sure you want to delete this daily log? This action
                  cannot be undone.
                </p>
                <div className="ticket-delete-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? "Deleting..." : "Delete Daily Log"}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <form className="ticket-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Status</label>
                  <select
                    className="ticket-form-select"
                    value={editData.status || "draft"}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Weather Conditions</label>
                    <select
                      className="ticket-form-select"
                      value={editData.weather_conditions || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          weather_conditions: e.target.value,
                        })
                      }
                    >
                      <option value="">Select weather...</option>
                      {WEATHER_OPTIONS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Temp High (F)</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={editData.weather_temp_high || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          weather_temp_high: e.target.value,
                        })
                      }
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Work Performed</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={editData.work_performed || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        work_performed: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Safety Incidents</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={editData.safety_incidents || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        safety_incidents: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Delays</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={editData.delays || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        delays: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Materials Received</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={editData.materials_received || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        materials_received: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="ticket-detail-body">
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">Project</span>
                  <span>
                    {selectedLog.projects?.code && (
                      <strong>{selectedLog.projects.code} - </strong>
                    )}
                    {selectedLog.projects?.name || "N/A"}
                  </span>
                </div>

                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">Date</span>
                  <span>
                    {new Date(selectedLog.log_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">Status</span>
                  <span
                    className={
                      STATUS_BADGE[selectedLog.status] ?? "inv-status"
                    }
                  >
                    {selectedLog.status}
                  </span>
                </div>

                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">Weather</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {getWeatherIcon(selectedLog.weather_conditions)}
                    {selectedLog.weather_conditions || "N/A"}
                  </span>
                </div>

                {(selectedLog.weather_temp_high != null ||
                  selectedLog.weather_temp_low != null) && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Temperature</span>
                    <span>
                      {selectedLog.weather_temp_low != null
                        ? `${selectedLog.weather_temp_low}`
                        : "--"}
                      {" / "}
                      {selectedLog.weather_temp_high != null
                        ? `${selectedLog.weather_temp_high}`
                        : "--"}
                      °F
                    </span>
                  </div>
                )}

                {selectedLog.weather_wind_mph != null && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Wind</span>
                    <span>{selectedLog.weather_wind_mph} mph</span>
                  </div>
                )}

                {selectedLog.weather_humidity_pct != null && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Humidity</span>
                    <span>{selectedLog.weather_humidity_pct}%</span>
                  </div>
                )}

                {selectedLog.work_performed && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Work Performed</span>
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {selectedLog.work_performed}
                    </span>
                  </div>
                )}

                {selectedLog.workforce && selectedLog.workforce.length > 0 && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Workforce</span>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {(selectedLog.workforce as WorkforceEntry[]).map((w, i) => (
                        <span key={i} style={{ fontSize: "0.9rem" }}>
                          {w.trade ?? "General"}: {w.headcount ?? 0} workers
                          {w.hours ? ` × ${w.hours} hrs` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.safety_incidents && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label" style={{ color: "var(--color-red)" }}>
                      Safety Incidents
                    </span>
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {selectedLog.safety_incidents}
                    </span>
                  </div>
                )}

                {selectedLog.delays && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label" style={{ color: "var(--color-amber)" }}>
                      Delays
                    </span>
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {selectedLog.delays}
                    </span>
                  </div>
                )}

                {selectedLog.materials_received && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Materials Received</span>
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {selectedLog.materials_received}
                    </span>
                  </div>
                )}

                {selectedLog.created_by && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Created By</span>
                    <span>{userMap[selectedLog.created_by] ?? "Unknown"}</span>
                  </div>
                )}

                {selectedLog.approved_by && (
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Approved By</span>
                    <span>{userMap[selectedLog.approved_by] ?? "Unknown"}</span>
                  </div>
                )}

                <div className="ticket-form-actions">
                  <button
                    className="btn-danger-outline"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Daily Log Modal */}
      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>Create New Daily Log</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="ticket-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Project *</label>
                  <select
                    className="ticket-form-select"
                    value={formData.project_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        project_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `${p.code} - ` : ""}
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Log Date *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.log_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        log_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Weather</label>
                  <select
                    className="ticket-form-select"
                    value={formData.weather_conditions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weather_conditions: e.target.value,
                      })
                    }
                  >
                    <option value="">Select weather...</option>
                    {WEATHER_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    Temperature (high, F)
                  </label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        temperature: e.target.value,
                      })
                    }
                    placeholder="e.g. 72"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  Workforce Count
                </label>
                <input
                  type="number"
                  className="ticket-form-input"
                  value={formData.workforce_count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      workforce_count: e.target.value,
                    })
                  }
                  placeholder="Total headcount on site"
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  Notes / Work Performed
                </label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.work_performed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      work_performed: e.target.value,
                    })
                  }
                  placeholder="Describe work performed today..."
                  rows={3}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  Safety Incidents (optional)
                </label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.safety_incidents}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      safety_incidents: e.target.value,
                    })
                  }
                  placeholder="Describe any safety incidents..."
                  rows={2}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  Delays (optional)
                </label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.delays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delays: e.target.value,
                    })
                  }
                  placeholder="Describe any delays encountered..."
                  rows={2}
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    creating ||
                    !formData.project_id ||
                    !formData.log_date
                  }
                >
                  {creating ? "Creating..." : "Create Daily Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
