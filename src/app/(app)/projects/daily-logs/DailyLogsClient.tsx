"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
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
  Upload,
  CloudDownload,
  Loader2,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import { formatDateSafe } from "@/lib/utils/format";

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
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
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

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/daily-logs";
  return `/projects/daily-logs?status=${status}`;
}

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "log_date", label: "Log Date", required: true, type: "date" },
  { key: "weather_conditions", label: "Weather", required: false },
  { key: "temperature", label: "Temperature (F)", required: false, type: "number" },
  { key: "work_performed", label: "Work Performed", required: false },
  { key: "safety_incidents", label: "Safety Incidents", required: false },
  { key: "delays", label: "Delays", required: false },
  { key: "project_name", label: "Project Name", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { log_date: "2026-01-15", weather_conditions: "sunny", temperature: "72", work_performed: "Foundation pour - Phase 1", safety_incidents: "", delays: "" },
  { log_date: "2026-01-16", weather_conditions: "partly_cloudy", temperature: "65", work_performed: "Framing - 2nd floor east wing", safety_incidents: "Near miss - falling debris", delays: "" },
  { log_date: "2026-01-17", weather_conditions: "rainy", temperature: "58", work_performed: "Interior electrical rough-in", safety_incidents: "", delays: "Rain delay - exterior work postponed 2 hours" },
];

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
  const t = useTranslations("projects");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();

  const WEATHER_OPTIONS = [
    { value: "sunny", label: t("weatherSunny") },
    { value: "partly_cloudy", label: t("weatherPartlyCloudy") },
    { value: "cloudy", label: t("weatherCloudy") },
    { value: "rain", label: t("weatherRain") },
    { value: "snow", label: t("weatherSnow") },
    { value: "storm", label: t("weatherStorm") },
  ];

  const statuses = [
    { label: t("statusAll"), value: "all" },
    { label: t("statusDraft"), value: "draft" },
    { label: t("statusSubmitted"), value: "submitted" },
    { label: t("statusApproved"), value: "approved" },
  ];

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

  const [showImport, setShowImport] = useState(false);
  const [importProjectId, setImportProjectId] = useState("");
  const [fetchingWeather, setFetchingWeather] = useState(false);

  async function handleAutoFillWeather() {
    if (!formData.project_id) return;
    const project = projects.find((p) => p.id === formData.project_id);
    if (!project) return;

    setFetchingWeather(true);
    try {
      const params = new URLSearchParams();
      if (project.latitude && project.longitude) {
        params.set("lat", String(project.latitude));
        params.set("lon", String(project.longitude));
      } else if (project.city) {
        params.set("city", project.city);
        if (project.state) params.set("state", project.state);
      } else {
        setCreateError(t("noLocationData"));
        setFetchingWeather(false);
        return;
      }

      const res = await fetch(`/api/weather?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToFetchWeather"));
      }
      const weather = await res.json();
      setFormData((prev) => ({
        ...prev,
        weather_conditions: weather.weather_conditions || prev.weather_conditions,
        temperature: String(weather.weather_temp_high ?? prev.temperature),
      }));
      setCreateError("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToAutoFillWeather"));
    } finally {
      setFetchingWeather(false);
    }
  }

  // Detail/Edit/Delete modal state
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "daily_logs", rows, project_id: importProjectId }),
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
        throw new Error(data.error || t("failedToCreateDailyLog"));
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
        err instanceof Error ? err.message : t("failedToCreateDailyLog")
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
        throw new Error(data.error || t("failedToUpdateDailyLog"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToUpdateDailyLog")
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
        throw new Error(data.error || t("failedToDeleteDailyLog"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToDeleteDailyLog")
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
          <h2>{t("dailyLogs")}</h2>
          <p className="fin-header-sub">
            {t("dailyLogsSubtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("newDailyLog")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">{t("totalLogs")}</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">{t("pendingReview")}</span>
          <span className="fin-kpi-value">{kpi.pendingReview}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">{t("statusApproved")}</span>
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
                      suppressHydrationWarning
                    >
                      {formatDateSafe(log.log_date + "T00:00:00")}
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
                        {t("by")} {userMap[log.created_by] ?? t("unknown")}
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
                      {log.weather_conditions ?? t("na")}
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
                        {log.weather_wind_mph} {t("mph")}
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
                        {t("workPerformed")}
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
                      <strong>{totalWorkers}</strong> {t("workers")}
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
                      {t("manHrs")}
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
                        <strong>{equipment.length}</strong> {t("equipment")}
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
                          {t("safetyIncident")}
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
                          {t("delayReported")}
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
                          {w.trade ?? t("general")}: {w.headcount ?? 0}
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
                        {t("additionalDetails")}
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
                              {t("materialsReceived")}
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
                              {t("delays")}
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
                              {t("safetyIncidents")}
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
            <div className="fin-empty-title">{t("noDailyLogsFound")}</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? t("noDailyLogsFilter")
                : t("noDailyLogsEmpty")}
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
                {isEditing ? t("editDailyLog") : t("dailyLogDetails")}
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
              <div style={{ padding: "1rem 1.5rem" }}>
                <p style={{ marginBottom: 16 }}>
                  {t("confirmDeleteDailyLog")}
                </p>
                <div className="ticket-form-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    className="btn-primary"
                    style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? t("deleting") : t("deleteDailyLog")}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <form className="ticket-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("columnStatus")}</label>
                  <select
                    className="ticket-form-select"
                    value={editData.status || "draft"}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    <option value="draft">{t("statusDraft")}</option>
                    <option value="submitted">{t("statusSubmitted")}</option>
                    <option value="approved">{t("statusApproved")}</option>
                  </select>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("weatherConditions")}</label>
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
                      <option value="">{t("selectWeather")}</option>
                      {WEATHER_OPTIONS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("tempHighF")}</label>
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
                      placeholder={t("tempPlaceholder")}
                    />
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("workPerformed")}</label>
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
                  <label className="ticket-form-label">{t("safetyIncidents")}</label>
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
                  <label className="ticket-form-label">{t("delays")}</label>
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
                  <label className="ticket-form-label">{t("materialsReceived")}</label>
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
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ padding: "1.25rem" }}>
                {/* Project & Date */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("project")}</label>
                    <div className="detail-value">
                      {selectedLog.projects?.code && (
                        <strong>{selectedLog.projects.code} - </strong>
                      )}
                      {selectedLog.projects?.name || t("na")}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("date")}</label>
                    <div className="detail-value" suppressHydrationWarning>
                      {formatDateSafe(selectedLog.log_date + "T00:00:00")}
                    </div>
                  </div>
                </div>

                {/* Status & Weather */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("columnStatus")}</label>
                    <div className="detail-value">
                      <span className={STATUS_BADGE[selectedLog.status] ?? "inv-status"}>
                        {selectedLog.status}
                      </span>
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("weather")}</label>
                    <div className="detail-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {getWeatherIcon(selectedLog.weather_conditions)}
                      {selectedLog.weather_conditions || t("na")}
                    </div>
                  </div>
                </div>

                {/* Temperature, Wind, Humidity */}
                {(selectedLog.weather_temp_high != null ||
                  selectedLog.weather_temp_low != null ||
                  selectedLog.weather_wind_mph != null ||
                  selectedLog.weather_humidity_pct != null) && (
                  <div className="detail-row">
                    {(selectedLog.weather_temp_high != null || selectedLog.weather_temp_low != null) && (
                      <div className="detail-group">
                        <label className="detail-label">{t("temperature")}</label>
                        <div className="detail-value">
                          {selectedLog.weather_temp_low != null ? `${selectedLog.weather_temp_low}` : "--"}
                          {" / "}
                          {selectedLog.weather_temp_high != null ? `${selectedLog.weather_temp_high}` : "--"}
                          °F
                        </div>
                      </div>
                    )}
                    {selectedLog.weather_wind_mph != null && (
                      <div className="detail-group">
                        <label className="detail-label">{t("wind")}</label>
                        <div className="detail-value">{selectedLog.weather_wind_mph} {t("mph")}</div>
                      </div>
                    )}
                    {selectedLog.weather_humidity_pct != null && (
                      <div className="detail-group">
                        <label className="detail-label">{t("humidity")}</label>
                        <div className="detail-value">{selectedLog.weather_humidity_pct}%</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Work Performed */}
                {selectedLog.work_performed && (
                  <div className="detail-group">
                    <label className="detail-label">{t("workPerformed")}</label>
                    <div className="detail-value--multiline">{selectedLog.work_performed}</div>
                  </div>
                )}

                {/* Workforce */}
                {selectedLog.workforce && selectedLog.workforce.length > 0 && (
                  <div className="detail-group">
                    <label className="detail-label">{t("workforce")}</label>
                    <div className="detail-value--multiline">
                      {(selectedLog.workforce as WorkforceEntry[]).map((w, i) => (
                        <div key={i}>
                          {w.trade ?? t("general")}: {w.headcount ?? 0} {t("workers")}
                          {w.hours ? ` × ${w.hours} ${t("hrs")}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials Received */}
                {selectedLog.materials_received && (
                  <div className="detail-group">
                    <label className="detail-label">{t("materialsReceived")}</label>
                    <div className="detail-value--multiline">{selectedLog.materials_received}</div>
                  </div>
                )}

                {/* Safety Incidents */}
                {selectedLog.safety_incidents && (
                  <div className="detail-group">
                    <label className="detail-label" style={{ color: "var(--color-red)" }}>
                      {t("safetyIncidents")}
                    </label>
                    <div className="detail-value--multiline">{selectedLog.safety_incidents}</div>
                  </div>
                )}

                {/* Delays */}
                {selectedLog.delays && (
                  <div className="detail-group">
                    <label className="detail-label" style={{ color: "var(--color-amber)" }}>
                      {t("delays")}
                    </label>
                    <div className="detail-value--multiline">{selectedLog.delays}</div>
                  </div>
                )}

                {/* Created / Approved By */}
                <div className="detail-row">
                  {selectedLog.created_by && (
                    <div className="detail-group">
                      <label className="detail-label">{t("createdBy")}</label>
                      <div className="detail-value">{userMap[selectedLog.created_by] ?? t("unknown")}</div>
                    </div>
                  )}
                  {selectedLog.approved_by && (
                    <div className="detail-group">
                      <label className="detail-label">{t("approvedBy")}</label>
                      <div className="detail-value">{userMap[selectedLog.approved_by] ?? t("unknown")}</div>
                    </div>
                  )}
                </div>

                <div className="ticket-form-actions">
                  <button
                    className="btn-secondary"
                    style={{ color: "var(--color-danger, #dc2626)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    {t("edit")}
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
              <h3>{t("createNewDailyLog")}</h3>
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
                  <label className="ticket-form-label">{t("projectRequired")}</label>
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
                    <option value="">{t("selectProject")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code ? `${p.code} - ` : ""}
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("logDateRequired")}</label>
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
                  <label className="ticket-form-label">{t("weather")}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="ticket-form-select"
                      style={{ flex: 1 }}
                      value={formData.weather_conditions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weather_conditions: e.target.value,
                        })
                      }
                    >
                      <option value="">{t("selectWeather")}</option>
                      {WEATHER_OPTIONS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAutoFillWeather}
                      disabled={!formData.project_id || fetchingWeather}
                      title={t("autoFillWeatherTitle")}
                      style={{ whiteSpace: "nowrap", padding: "6px 10px" }}
                    >
                      {fetchingWeather ? <Loader2 size={14} className="spin" /> : <CloudDownload size={14} />}
                      {fetchingWeather ? ` ${t("fetching")}` : ` ${t("autoFill")}`}
                    </button>
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    {t("temperatureHighF")}
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
                    placeholder={t("tempPlaceholder")}
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  {t("workforceCount")}
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
                  placeholder={t("totalHeadcountPlaceholder")}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  {t("notesWorkPerformed")}
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
                  placeholder={t("describeWorkPerformed")}
                  rows={3}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  {t("safetyIncidentsOptional")}
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
                  placeholder={t("describeSafetyIncidents")}
                  rows={2}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  {t("delaysOptional")}
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
                  placeholder={t("describeDelays")}
                  rows={2}
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("cancel")}
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
                  {creating ? t("creating") : t("createDailyLog")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("dailyLogs")}
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
