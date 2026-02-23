"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  FileText,
  ShieldAlert,
  Camera,
  HelpCircle,
  ClipboardList,
  Award,
  DollarSign,
  CheckCircle2,
  X,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type {
  EmployeeDashboardData,
  ClockEvent,
} from "@/lib/queries/employee-portal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type TFunc = (key: string, values?: Record<string, string | number>) => string;

function formatRelativeTime(isoString: string, t: TFunc): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("daysAgo", { count: days });
}

function activityText(event: ClockEvent, t: TFunc): string {
  const action =
    event.event_type === "clock_in" ? t("clockedInAction") : t("clockedOutAction");
  const project = event.project_name ? ` at ${event.project_name}` : "";
  return `${action}${project}`;
}

// Inline styles for form elements (Tailwind v4 strips CSS classes on inputs)
const S = {
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    background: "var(--surface)",
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
  } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    background: "var(--surface)",
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer",
  } as React.CSSProperties,
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "0.85rem",
    background: "var(--surface)",
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical" as const,
    minHeight: "80px",
  } as React.CSSProperties,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ModalType = "daily-log" | "safety" | "photo" | "rfi"
  | "view-daily-log" | "view-safety" | "view-rfi"
  | null;

const ITEMS_PER_PAGE = 3;

function PaginationControls({
  currentPage,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("employeeDashboard");
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  if (totalPages <= 1) return null;
  return (
    <div className="emp-pagination">
      <button
        className="emp-pagination-btn"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="emp-pagination-info">
        {t("page", { current: currentPage + 1, total: totalPages })}
      </span>
      <button
        className="emp-pagination-btn"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default function EmployeeDashboardClient({
  dashboard,
}: {
  dashboard: EmployeeDashboardData;
}) {
  const t = useTranslations("employeeDashboard");

  // Clock state
  const [isClockedIn, setIsClockedIn] = useState(
    dashboard.clockStatus.isClockedIn
  );
  const [lastEvent, setLastEvent] = useState<ClockEvent | null>(
    dashboard.clockStatus.lastEvent
  );
  const [todayEvents, setTodayEvents] = useState<ClockEvent[]>(
    dashboard.clockStatus.todayEvents
  );
  const [elapsed, setElapsed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Local copies of server data so we can update after client-side submissions
  const [recentDailyLogs, setRecentDailyLogs] = useState(dashboard.recentDailyLogs);
  const [recentSafetyIncidents, setRecentSafetyIncidents] = useState(dashboard.recentSafetyIncidents);
  const [recentRfis, setRecentRfis] = useState(dashboard.recentRfis);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalMsg, setModalMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Photo upload form
  const [photoProject, setPhotoProject] = useState("");
  const [photoActivity, setPhotoActivity] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Pagination state
  const [dailyLogPage, setDailyLogPage] = useState(0);
  const [safetyPage, setSafetyPage] = useState(0);
  const [rfiPage, setRfiPage] = useState(0);

  // Detail modal state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detailData, setDetailData] = useState<Record<string, any> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Daily Log form
  const [dlProject, setDlProject] = useState("");
  const [dlDate, setDlDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dlWork, setDlWork] = useState("");
  const [dlWeather, setDlWeather] = useState("clear");
  const [dlCrewSize, setDlCrewSize] = useState("");

  // Safety Check form
  const [saProject, setSaProject] = useState("");
  const [saTitle, setSaTitle] = useState("");
  const [saDescription, setSaDescription] = useState("");
  const [saSeverity, setSaSeverity] = useState("low");

  // RFI form
  const [rfiProject, setRfiProject] = useState("");
  const [rfiSubject, setRfiSubject] = useState("");
  const [rfiQuestion, setRfiQuestion] = useState("");
  const [rfiPriority, setRfiPriority] = useState("medium");

  // Calculate elapsed time since last clock-in
  const updateElapsed = useCallback(() => {
    if (!isClockedIn || !lastEvent) {
      setElapsed("0h 00m");
      return;
    }
    const ms = Date.now() - new Date(lastEvent.timestamp).getTime();
    setElapsed(formatDuration(ms));
  }, [isClockedIn, lastEvent]);

  useEffect(() => {
    updateElapsed();
    const interval = setInterval(updateElapsed, 15000);
    return () => clearInterval(interval);
  }, [updateElapsed]);

  // Clock in/out handler
  async function handleClock() {
    setLoading(true);
    setError("");

    const newEventType = isClockedIn ? "clock_out" : "clock_in";

    // Optimistic update
    const optimisticEvent: ClockEvent = {
      id: `temp-${Date.now()}`,
      company_id: lastEvent?.company_id ?? "",
      user_id: lastEvent?.user_id ?? "",
      event_type: newEventType,
      timestamp: new Date().toISOString(),
      project_id: null,
      notes: null,
    };

    setIsClockedIn(!isClockedIn);
    setLastEvent(optimisticEvent);
    setTodayEvents((prev) => [optimisticEvent, ...prev]);

    try {
      const res = await fetch("/api/employee/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: newEventType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record clock event");
      }

      const serverEvent: ClockEvent = await res.json();
      setLastEvent(serverEvent);
      setTodayEvents((prev) =>
        prev.map((e) => (e.id === optimisticEvent.id ? serverEvent : e))
      );
    } catch (err) {
      setIsClockedIn(isClockedIn);
      setLastEvent(lastEvent);
      setTodayEvents((prev) =>
        prev.filter((e) => e.id !== optimisticEvent.id)
      );
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Calculate today's hours from clock events
  const sortedEvents = [...todayEvents].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let todayTotalMs = 0;
  let pendingClockIn: Date | null = null;
  for (const event of sortedEvents) {
    if (event.event_type === "clock_in") {
      pendingClockIn = new Date(event.timestamp);
    } else if (event.event_type === "clock_out" && pendingClockIn) {
      todayTotalMs +=
        new Date(event.timestamp).getTime() - pendingClockIn.getTime();
      pendingClockIn = null;
    }
  }
  if (pendingClockIn) {
    todayTotalMs += Date.now() - pendingClockIn.getTime();
  }
  const todayHours = Math.round((todayTotalMs / 3_600_000) * 100) / 100;

  // Open modal
  function openModal(type: ModalType) {
    setActiveModal(type);
    setModalMsg(null);
    setModalSubmitting(false);
    // Reset forms
    setDlProject("");
    setDlDate(new Date().toISOString().split("T")[0]);
    setDlWork("");
    setDlWeather("clear");
    setDlCrewSize("");
    setSaProject("");
    setSaTitle("");
    setSaDescription("");
    setSaSeverity("low");
    setRfiProject("");
    setRfiSubject("");
    setRfiQuestion("");
    setRfiPriority("medium");
    setPhotoProject("");
    setPhotoActivity("");
    setPhotoFile(null);
  }

  // Submit Daily Log
  async function submitDailyLog() {
    if (!dlProject || !dlWork.trim()) {
      setModalMsg({
        type: "error",
        text: t("dailyLogValidation"),
      });
      return;
    }
    setModalSubmitting(true);
    setModalMsg(null);
    try {
      const res = await fetch("/api/projects/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: dlProject,
          log_date: dlDate,
          work_performed: dlWork.trim(),
          weather_conditions: dlWeather,
          crew_size: dlCrewSize ? parseInt(dlCrewSize, 10) : null,
        }),
      });
      if (res.ok) {
        const newLog = await res.json();
        const projectName = dashboard.projects.find(p => p.id === dlProject)?.name ?? null;
        setRecentDailyLogs(prev => [{
          id: newLog.id ?? `temp-${Date.now()}`,
          log_date: dlDate,
          project_name: projectName,
          work_performed: dlWork.trim(),
        }, ...prev].slice(0, 5));
        setDailyLogPage(0);
        setModalMsg({
          type: "success",
          text: t("dailyLogSuccess"),
        });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        const data = await res.json();
        setModalMsg({
          type: "error",
          text: data.error || t("failedSubmitDailyLog"),
        });
      }
    } catch {
      setModalMsg({ type: "error", text: t("networkError") });
    } finally {
      setModalSubmitting(false);
    }
  }

  // Submit Safety Check
  async function submitSafetyCheck() {
    if (!saTitle.trim() || !saDescription.trim()) {
      setModalMsg({
        type: "error",
        text: t("safetyValidation"),
      });
      return;
    }
    setModalSubmitting(true);
    setModalMsg(null);
    try {
      const res = await fetch("/api/safety/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saTitle.trim(),
          description: saDescription.trim(),
          severity: saSeverity,
          project_id: saProject || null,
        }),
      });
      if (res.ok) {
        const newInc = await res.json();
        const projectName = saProject ? dashboard.projects.find(p => p.id === saProject)?.name ?? null : null;
        setRecentSafetyIncidents(prev => [{
          id: newInc.id ?? `temp-${Date.now()}`,
          title: saTitle.trim(),
          severity: saSeverity,
          created_at: new Date().toISOString(),
          project_name: projectName,
        }, ...prev].slice(0, 5));
        setSafetyPage(0);
        setModalMsg({
          type: "success",
          text: t("safetySuccess"),
        });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        const data = await res.json();
        setModalMsg({
          type: "error",
          text: data.error || t("failedSubmitSafety"),
        });
      }
    } catch {
      setModalMsg({ type: "error", text: t("networkError") });
    } finally {
      setModalSubmitting(false);
    }
  }

  // View detail modal
  async function viewDetail(type: "view-daily-log" | "view-safety" | "view-rfi", id: string) {
    setActiveModal(type);
    setDetailLoading(true);
    setDetailData(null);
    const endpoints: Record<string, string> = {
      "view-daily-log": `/api/employee/daily-log?id=${id}`,
      "view-safety": `/api/employee/safety-incident?id=${id}`,
      "view-rfi": `/api/employee/rfi?id=${id}`,
    };
    try {
      const res = await fetch(endpoints[type]);
      if (res.ok) setDetailData(await res.json());
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  }

  // Submit Photo to Document Library
  async function submitPhoto() {
    if (!photoFile) {
      setModalMsg({ type: "error", text: t("photoValidation") });
      return;
    }
    setModalSubmitting(true);
    setModalMsg(null);
    try {
      const projectName = photoProject
        ? dashboard.projects.find(p => p.id === photoProject)?.name ?? "Project"
        : "General";
      const docName = [projectName, photoActivity, photoFile.name]
        .filter(Boolean)
        .join(" - ");

      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("name", docName);
      formData.append("category", "photos");
      if (photoProject) formData.append("project_id", photoProject);
      if (photoActivity) {
        formData.append("tags", JSON.stringify([photoActivity]));
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setModalMsg({ type: "success", text: t("photoSuccess") });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        const data = await res.json();
        setModalMsg({ type: "error", text: data.error || t("failedUploadPhoto") });
      }
    } catch {
      setModalMsg({ type: "error", text: t("networkError") });
    } finally {
      setModalSubmitting(false);
    }
  }

  // Submit RFI
  async function submitRfi() {
    if (!rfiProject || !rfiSubject.trim() || !rfiQuestion.trim()) {
      setModalMsg({
        type: "error",
        text: t("rfiValidation"),
      });
      return;
    }
    setModalSubmitting(true);
    setModalMsg(null);
    try {
      const res = await fetch("/api/projects/rfis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: rfiProject,
          subject: rfiSubject.trim(),
          question: rfiQuestion.trim(),
          priority: rfiPriority,
        }),
      });
      if (res.ok) {
        const newRfi = await res.json();
        const projectName = dashboard.projects.find(p => p.id === rfiProject)?.name ?? null;
        setRecentRfis(prev => [{
          id: newRfi.id ?? `temp-${Date.now()}`,
          subject: rfiSubject.trim(),
          priority: rfiPriority,
          status: "open",
          created_at: new Date().toISOString(),
          project_name: projectName,
        }, ...prev].slice(0, 5));
        setRfiPage(0);
        setModalMsg({
          type: "success",
          text: t("rfiSuccess"),
        });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        const data = await res.json();
        setModalMsg({
          type: "error",
          text: data.error || t("failedSubmitRfi"),
        });
      }
    } catch {
      setModalMsg({ type: "error", text: t("networkError") });
    } finally {
      setModalSubmitting(false);
    }
  }

  // Format short date for tables — timezone-safe (no Date constructor)
  function fmtDate(iso: string): string {
    const parts = iso.split("T")[0].split("-");
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[m - 1]} ${d}`;
  }

  return (
    <div>
      {/* ===== Welcome Banner ===== */}
      <div className="vendor-welcome-card">
        <h2>{t("welcome", { name: dashboard.employeeName })}</h2>
        <p>
          {dashboard.companyName} &mdash;{" "}
          {dashboard.role.charAt(0).toUpperCase() + dashboard.role.slice(1)}
        </p>
        <div className="vendor-welcome-details">
          <div className="vendor-welcome-detail" suppressHydrationWarning>
            <Clock size={16} />
            {t("hoursToday", { hours: todayHours.toFixed(1) })}
          </div>
          <div className="vendor-welcome-detail">
            <Building2 size={16} />
            {dashboard.projects.length !== 1
              ? t("activeProjectsPlural", { count: dashboard.projects.length })
              : t("activeProjects", { count: dashboard.projects.length })}
          </div>
          {isClockedIn ? (
            <span className="vendor-welcome-badge" style={{ background: "var(--color-green)" }}>
              {t("clockedIn")}
            </span>
          ) : (
            <span className="vendor-welcome-badge" style={{ background: "var(--muted)" }}>
              {t("clockedOut")}
            </span>
          )}
        </div>
      </div>

      {/* ===== Two-Column Layout ===== */}
      <div className="vendor-two-col">
        {/* --- Left Column --- */}
        <div>
          {/* Time Clock Card */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <Clock size={18} />
              {t("timeClock")}
            </div>
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div
                className={`emp-clock-status ${isClockedIn ? "clocked-in" : "clocked-out"}`}
              >
                {isClockedIn ? t("clockedIn") : t("clockedOut")}
              </div>
              <div className="emp-clock-time" suppressHydrationWarning>{elapsed}</div>
              {isClockedIn && lastEvent && (
                <div className="emp-clock-duration" suppressHydrationWarning>
                  {t("startedAt", { time: formatTime(lastEvent.timestamp) })}
                </div>
              )}
              {!isClockedIn && lastEvent && (
                <div className="emp-clock-duration" suppressHydrationWarning>
                  {t("lastClockedOut", { time: formatTime(lastEvent.timestamp) })}
                </div>
              )}
              {!isClockedIn && !lastEvent && (
                <div className="emp-clock-duration">{t("noClockEvents")}</div>
              )}
              {error && <div className="emp-clock-error">{error}</div>}
              <button
                className={`emp-btn-clock ${isClockedIn ? "emp-btn-clock-out" : "emp-btn-clock-in"}`}
                onClick={handleClock}
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading
                  ? t("processing")
                  : isClockedIn
                    ? t("clockOut")
                    : t("clockIn")}
              </button>
            </div>

            {/* Today's Timeline */}
            {todayEvents.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
                <div className="emp-section-title">
                  <ClipboardList size={16} /> {t("todaysTimeline")}
                </div>
                <div className="emp-timeline">
                  {todayEvents.slice(0, 6).map((event) => (
                    <div key={event.id} className="emp-timeline-item">
                      <div
                        className={`emp-timeline-dot ${event.event_type === "clock_in" ? "emp-timeline-dot-in" : "emp-timeline-dot-out"}`}
                      />
                      <div className="emp-timeline-content">
                        <div className="emp-timeline-time" suppressHydrationWarning>
                          {formatTime(event.timestamp)}
                        </div>
                        <div className="emp-timeline-label">
                          {event.event_type === "clock_in"
                            ? t("clockedIn")
                            : t("clockedOut")}
                          {event.project_name && (
                            <span className="emp-timeline-project">
                              {" "}
                              &middot; {event.project_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Logs Card */}
          <div className="vendor-card">
            <div className="vendor-card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={18} /> {t("dailyLogs")}
              </span>
              <button className="vendor-btn-upload" onClick={() => openModal("daily-log")}>
                {t("newLog")}
              </button>
            </div>
            {recentDailyLogs.length > 0 ? (
              <>
                <div className="emp-activity-list">
                  {recentDailyLogs
                    .slice(dailyLogPage * ITEMS_PER_PAGE, (dailyLogPage + 1) * ITEMS_PER_PAGE)
                    .map((log) => (
                    <div key={log.id} className="emp-assignment-item emp-clickable" onClick={() => viewDetail("view-daily-log", log.id)}>
                      <div className="emp-assignment-dot" style={{ background: "var(--color-blue)" }} />
                      <div className="emp-assignment-info">
                        <div className="emp-assignment-task">
                          {log.work_performed
                            ? log.work_performed.length > 60
                              ? log.work_performed.slice(0, 60) + "..."
                              : log.work_performed
                            : t("dailyLogEntry")}
                        </div>
                        <div className="emp-assignment-project">
                          {log.project_name || t("noProject")} &middot; {fmtDate(log.log_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls currentPage={dailyLogPage} totalItems={recentDailyLogs.length} onPageChange={setDailyLogPage} />
              </>
            ) : (
              <div className="vendor-empty">{t("noDailyLogs")}</div>
            )}
          </div>

          {/* Safety Check Card */}
          <div className="vendor-card">
            <div className="vendor-card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={18} /> {t("safetyReports")}
              </span>
              <button className="vendor-btn-upload" onClick={() => openModal("safety")}>
                {t("newReport")}
              </button>
            </div>
            {recentSafetyIncidents.length > 0 ? (
              <>
                <div className="emp-activity-list">
                  {recentSafetyIncidents
                    .slice(safetyPage * ITEMS_PER_PAGE, (safetyPage + 1) * ITEMS_PER_PAGE)
                    .map((inc) => {
                    const sevColor =
                      inc.severity === "critical" || inc.severity === "high"
                        ? "var(--color-red)"
                        : inc.severity === "medium"
                          ? "var(--color-amber)"
                          : "var(--color-green)";
                    return (
                      <div key={inc.id} className="emp-assignment-item emp-clickable" onClick={() => viewDetail("view-safety", inc.id)}>
                        <div className="emp-assignment-dot" style={{ background: sevColor }} />
                        <div className="emp-assignment-info">
                          <div className="emp-assignment-task">{inc.title}</div>
                          <div className="emp-assignment-project">
                            {inc.project_name || t("general")} &middot; {fmtDate(inc.created_at)}
                          </div>
                        </div>
                        <span
                          className="badge"
                          style={{
                            background: sevColor,
                            color: "#fff",
                            fontSize: "0.68rem",
                            padding: "2px 8px",
                            borderRadius: 4,
                            textTransform: "capitalize",
                          }}
                        >
                          {inc.severity}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <PaginationControls currentPage={safetyPage} totalItems={recentSafetyIncidents.length} onPageChange={setSafetyPage} />
              </>
            ) : (
              <div className="vendor-empty">{t("noSafetyReports")}</div>
            )}
          </div>

          {/* Pay & Certifications Summary */}
          <div className="emp-summary-row">
            {dashboard.recentPayslip && (
              <div className="card emp-summary-card">
                <div className="emp-summary-icon">
                  <DollarSign size={18} />
                </div>
                <div className="emp-summary-label">{t("lastPaycheck")}</div>
                <div className="emp-summary-value">
                  $
                  {dashboard.recentPayslip.net_pay.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="emp-summary-meta">
                  {dashboard.recentPayslip.period}
                </div>
              </div>
            )}
            {dashboard.certifications.total > 0 && (
              <div className="card emp-summary-card">
                <div className="emp-summary-icon">
                  <Award size={18} />
                </div>
                <div className="emp-summary-label">{t("certifications")}</div>
                <div className="emp-summary-value">
                  {dashboard.certifications.total}
                </div>
                {dashboard.certifications.expiring > 0 && (
                  <div className="emp-summary-meta emp-summary-warning">
                    {t("expiringSoon", { count: dashboard.certifications.expiring })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Right Column --- */}
        <div>
          {/* KPI Stats */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <Briefcase size={18} />
              {t("overview")}
            </div>
            <div className="emp-kpi-row">
              <div className="emp-kpi">
                <div className="emp-kpi-label">{t("today")}</div>
                <div className="emp-kpi-value" suppressHydrationWarning>{todayHours.toFixed(1)}h</div>
              </div>
              <div className="emp-kpi">
                <div className="emp-kpi-label">{t("thisWeek")}</div>
                <div className="emp-kpi-value">
                  {dashboard.hoursThisWeek.toFixed(1)}h
                </div>
              </div>
              <div className="emp-kpi">
                <div className="emp-kpi-label">{t("pending")}</div>
                <div className="emp-kpi-value">
                  {dashboard.pendingTimesheets}
                </div>
              </div>
              {dashboard.certifications.expiring > 0 && (
                <div className="emp-kpi emp-kpi-alert">
                  <div className="emp-kpi-label">{t("expiringCerts")}</div>
                  <div className="emp-kpi-value">
                    {dashboard.certifications.expiring}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Assignments */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <ClipboardList size={18} />
              {t("todaysAssignments")}
            </div>
            <div className="emp-assignments-list">
              <div className="emp-assignment-item">
                <div
                  className="emp-assignment-dot"
                  style={{ background: "var(--color-green)" }}
                />
                <div className="emp-assignment-info">
                  <div className="emp-assignment-task">
                    {t("noAssignments")}
                  </div>
                  <div className="emp-assignment-project">
                    {t("assignmentsHint")}
                  </div>
                </div>
                <span className="badge badge-blue">{t("info")}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <Clock size={18} />
              {t("recentActivity")}
            </div>
            {todayEvents.length > 0 ? (
              <div className="emp-activity-list">
                {todayEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="emp-activity-item">
                    <div className="emp-activity-icon">
                      <Clock size={14} />
                    </div>
                    <div>
                      <div className="emp-activity-text">
                        {activityText(event, t)}
                      </div>
                      <div className="emp-activity-time" suppressHydrationWarning>
                        {formatRelativeTime(event.timestamp, t)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="emp-empty-state">
                <Clock
                  size={32}
                  style={{ color: "var(--muted)", marginBottom: 8 }}
                />
                <p>{t("noActivity")}</p>
                <p className="emp-empty-sub">
                  {t("clockInPrompt")}
                </p>
              </div>
            )}
          </div>

          {/* Photo Upload Card */}
          <div className="vendor-card">
            <div className="vendor-card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={18} /> {t("photos")}
              </span>
              <button className="vendor-btn-upload" onClick={() => openModal("photo")}>
                {t("upload")}
              </button>
            </div>
            <div className="vendor-empty">
              {t("photosHint")}
            </div>
          </div>

          {/* RFI Card */}
          <div className="vendor-card">
            <div className="vendor-card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <HelpCircle size={18} /> {t("rfis")}
              </span>
              <button className="vendor-btn-upload" onClick={() => openModal("rfi")}>
                {t("newRfi")}
              </button>
            </div>
            {recentRfis.length > 0 ? (
              <>
                <div className="emp-activity-list">
                  {recentRfis
                    .slice(rfiPage * ITEMS_PER_PAGE, (rfiPage + 1) * ITEMS_PER_PAGE)
                    .map((rfi) => {
                    const prioColor =
                      rfi.priority === "urgent" || rfi.priority === "high"
                        ? "var(--color-red)"
                        : rfi.priority === "medium"
                          ? "var(--color-amber)"
                          : "var(--color-blue)";
                    const statusColor =
                      rfi.status === "closed" || rfi.status === "answered"
                        ? "var(--color-green)"
                        : "var(--color-amber)";
                    return (
                      <div key={rfi.id} className="emp-assignment-item emp-clickable" onClick={() => viewDetail("view-rfi", rfi.id)}>
                        <div className="emp-assignment-dot" style={{ background: prioColor }} />
                        <div className="emp-assignment-info">
                          <div className="emp-assignment-task">{rfi.subject}</div>
                          <div className="emp-assignment-project">
                            {rfi.project_name || t("noProject")} &middot; {fmtDate(rfi.created_at)}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: statusColor,
                            color: "#fff",
                            textTransform: "capitalize",
                          }}
                        >
                          {rfi.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <PaginationControls currentPage={rfiPage} totalItems={recentRfis.length} onPageChange={setRfiPage} />
              </>
            ) : (
              <div className="vendor-empty">{t("noRfis")}</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Daily Log Modal ===== */}
      {activeModal === "daily-log" && (
        <div
          className="vendor-modal-overlay"
          onClick={() => setActiveModal(null)}
        >
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>{t("submitDailyLog")}</h3>
              <button
                className="vendor-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              {modalMsg && (
                <div
                  className={
                    modalMsg.type === "success"
                      ? "vendor-msg-success"
                      : "vendor-msg-error"
                  }
                >
                  {modalMsg.type === "success" && (
                    <CheckCircle2
                      size={14}
                      style={{ marginRight: 6, verticalAlign: "middle" }}
                    />
                  )}
                  {modalMsg.text}
                </div>
              )}
              <div className="vendor-modal-field">
                <label>{t("project")}</label>
                <select
                  style={S.select}
                  value={dlProject}
                  onChange={(e) => setDlProject(e.target.value)}
                >
                  <option value="">{t("selectProject")}</option>
                  {dashboard.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>{t("date")}</label>
                <input
                  type="date"
                  style={S.input}
                  value={dlDate}
                  onChange={(e) => setDlDate(e.target.value)}
                />
              </div>
              <div className="vendor-modal-field">
                <label>{t("workPerformed")}</label>
                <textarea
                  style={S.textarea}
                  value={dlWork}
                  onChange={(e) => setDlWork(e.target.value)}
                  placeholder={t("workPerformedPlaceholder")}
                  rows={4}
                />
              </div>
              <div className="vendor-modal-field">
                <label>{t("weather")}</label>
                <select
                  style={S.select}
                  value={dlWeather}
                  onChange={(e) => setDlWeather(e.target.value)}
                >
                  <option value="clear">{t("weatherClear")}</option>
                  <option value="cloudy">{t("weatherCloudy")}</option>
                  <option value="rain">{t("weatherRain")}</option>
                  <option value="snow">{t("weatherSnow")}</option>
                  <option value="windy">{t("weatherWindy")}</option>
                  <option value="extreme_heat">{t("weatherExtremeHeat")}</option>
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>{t("crewSize")}</label>
                <input
                  type="number"
                  style={S.input}
                  value={dlCrewSize}
                  onChange={(e) => setDlCrewSize(e.target.value)}
                  placeholder={t("crewSizePlaceholder")}
                  min="0"
                />
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                {t("cancel")}
              </button>
              <button
                className="vendor-modal-btn-submit"
                disabled={modalSubmitting}
                onClick={submitDailyLog}
              >
                {modalSubmitting ? t("submitting") : t("submitDailyLog")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Safety Check Modal ===== */}
      {activeModal === "safety" && (
        <div
          className="vendor-modal-overlay"
          onClick={() => setActiveModal(null)}
        >
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>{t("reportSafetyIssue")}</h3>
              <button
                className="vendor-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              {modalMsg && (
                <div
                  className={
                    modalMsg.type === "success"
                      ? "vendor-msg-success"
                      : "vendor-msg-error"
                  }
                >
                  {modalMsg.type === "success" && (
                    <CheckCircle2
                      size={14}
                      style={{ marginRight: 6, verticalAlign: "middle" }}
                    />
                  )}
                  {modalMsg.text}
                </div>
              )}
              <div className="vendor-modal-field">
                <label>{t("projectOptional")}</label>
                <select
                  style={S.select}
                  value={saProject}
                  onChange={(e) => setSaProject(e.target.value)}
                >
                  <option value="">{t("selectProject")}</option>
                  {dashboard.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>{t("title")}</label>
                <input
                  type="text"
                  style={S.input}
                  value={saTitle}
                  onChange={(e) => setSaTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                />
              </div>
              <div className="vendor-modal-field">
                <label>{t("description")}</label>
                <textarea
                  style={S.textarea}
                  value={saDescription}
                  onChange={(e) => setSaDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={4}
                />
              </div>
              <div className="vendor-modal-field">
                <label>{t("severity")}</label>
                <select
                  style={S.select}
                  value={saSeverity}
                  onChange={(e) => setSaSeverity(e.target.value)}
                >
                  <option value="low">{t("low")}</option>
                  <option value="medium">{t("medium")}</option>
                  <option value="high">{t("high")}</option>
                  <option value="critical">{t("critical")}</option>
                </select>
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                {t("cancel")}
              </button>
              <button
                className="vendor-modal-btn-submit"
                disabled={modalSubmitting}
                onClick={submitSafetyCheck}
              >
                {modalSubmitting ? t("submitting") : t("submitReport")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Photo Upload Modal ===== */}
      {activeModal === "photo" && (
        <div
          className="vendor-modal-overlay"
          onClick={() => setActiveModal(null)}
        >
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>{t("uploadPhoto")}</h3>
              <button
                className="vendor-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              {modalMsg && (
                <div
                  className={
                    modalMsg.type === "success"
                      ? "vendor-msg-success"
                      : "vendor-msg-error"
                  }
                >
                  {modalMsg.type === "success" && (
                    <CheckCircle2
                      size={14}
                      style={{ marginRight: 6, verticalAlign: "middle" }}
                    />
                  )}
                  {modalMsg.text}
                </div>
              )}
              <div className="vendor-modal-field">
                <label>{t("project")}</label>
                <select
                  style={S.select}
                  value={photoProject}
                  onChange={(e) => setPhotoProject(e.target.value)}
                >
                  <option value="">{t("generalNoProject")}</option>
                  {dashboard.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>{t("activityDescription")}</label>
                <input
                  type="text"
                  style={S.input}
                  value={photoActivity}
                  onChange={(e) => setPhotoActivity(e.target.value)}
                  placeholder={t("activityPlaceholder")}
                />
              </div>
              <div className="vendor-modal-field">
                <label>{t("photo")}</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={S.input}
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {photoFile && (
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 4 }}>
                  {photoFile.name} ({(photoFile.size / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                {t("cancel")}
              </button>
              <button
                className="vendor-modal-btn-submit"
                onClick={submitPhoto}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? t("uploading") : t("uploadPhoto")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RFI Modal ===== */}
      {activeModal === "rfi" && (
        <div
          className="vendor-modal-overlay"
          onClick={() => setActiveModal(null)}
        >
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>{t("submitRfi")}</h3>
              <button
                className="vendor-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              {modalMsg && (
                <div
                  className={
                    modalMsg.type === "success"
                      ? "vendor-msg-success"
                      : "vendor-msg-error"
                  }
                >
                  {modalMsg.type === "success" && (
                    <CheckCircle2
                      size={14}
                      style={{ marginRight: 6, verticalAlign: "middle" }}
                    />
                  )}
                  {modalMsg.text}
                </div>
              )}
              <div className="vendor-modal-field">
                <label>{t("project")}</label>
                <select
                  style={S.select}
                  value={rfiProject}
                  onChange={(e) => setRfiProject(e.target.value)}
                >
                  <option value="">{t("selectProject")}</option>
                  {dashboard.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>{t("subject")}</label>
                <input
                  type="text"
                  style={S.input}
                  value={rfiSubject}
                  onChange={(e) => setRfiSubject(e.target.value)}
                  placeholder={t("subjectPlaceholder")}
                />
              </div>
              <div className="vendor-modal-field">
                <label>{t("questionDetails")}</label>
                <textarea
                  style={S.textarea}
                  value={rfiQuestion}
                  onChange={(e) => setRfiQuestion(e.target.value)}
                  placeholder={t("questionPlaceholder")}
                  rows={4}
                />
              </div>
              <div className="vendor-modal-field">
                <label>{t("priority")}</label>
                <select
                  style={S.select}
                  value={rfiPriority}
                  onChange={(e) => setRfiPriority(e.target.value)}
                >
                  <option value="low">{t("low")}</option>
                  <option value="medium">{t("medium")}</option>
                  <option value="high">{t("high")}</option>
                  <option value="urgent">{t("urgent")}</option>
                </select>
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                {t("cancel")}
              </button>
              <button
                className="vendor-modal-btn-submit"
                disabled={modalSubmitting}
                onClick={submitRfi}
              >
                {modalSubmitting ? t("submitting") : t("submitRfi")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Daily Log Detail Modal ===== */}
      {activeModal === "view-daily-log" && (
        <div className="vendor-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="vendor-modal-header">
              <h3>Daily Log Details</h3>
              <button className="vendor-modal-close" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="vendor-modal-body">
              {detailLoading && (
                <div className="emp-detail-loading"><Loader2 size={24} className="emp-spin" /> Loading...</div>
              )}
              {!detailLoading && !detailData && (
                <div className="vendor-empty">Could not load daily log details.</div>
              )}
              {!detailLoading && detailData && (
                <div className="emp-detail-grid">
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Project</span>
                    <span className="emp-detail-value">{detailData.project_name || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Date</span>
                    <span className="emp-detail-value">{detailData.log_date}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Status</span>
                    <span className="emp-detail-value" style={{ textTransform: "capitalize" }}>{detailData.status || "draft"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Weather</span>
                    <span className="emp-detail-value" style={{ textTransform: "capitalize" }}>{detailData.weather_conditions || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Crew Size</span>
                    <span className="emp-detail-value">{detailData.crew_size ?? "N/A"}</span>
                  </div>
                  <div className="emp-detail-row emp-detail-full">
                    <span className="emp-detail-label">Work Performed</span>
                    <span className="emp-detail-value">{detailData.work_performed || "N/A"}</span>
                  </div>
                  {detailData.materials_received && (
                    <div className="emp-detail-row emp-detail-full">
                      <span className="emp-detail-label">Materials Received</span>
                      <span className="emp-detail-value">{detailData.materials_received}</span>
                    </div>
                  )}
                  {detailData.delays && (
                    <div className="emp-detail-row emp-detail-full">
                      <span className="emp-detail-label">Delays</span>
                      <span className="emp-detail-value">{detailData.delays}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="vendor-modal-footer">
              <button className="vendor-modal-btn-cancel" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Safety Incident Detail Modal ===== */}
      {activeModal === "view-safety" && (
        <div className="vendor-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="vendor-modal-header">
              <h3>Safety Incident Details</h3>
              <button className="vendor-modal-close" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="vendor-modal-body">
              {detailLoading && (
                <div className="emp-detail-loading"><Loader2 size={24} className="emp-spin" /> Loading...</div>
              )}
              {!detailLoading && !detailData && (
                <div className="vendor-empty">Could not load incident details.</div>
              )}
              {!detailLoading && detailData && (
                <div className="emp-detail-grid">
                  <div className="emp-detail-row emp-detail-full">
                    <span className="emp-detail-label">Title</span>
                    <span className="emp-detail-value">{detailData.title}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Incident Number</span>
                    <span className="emp-detail-value">{detailData.incident_number || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Project</span>
                    <span className="emp-detail-value">{detailData.project?.name || "General"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Severity</span>
                    <span className="emp-detail-value" style={{ textTransform: "capitalize" }}>{detailData.severity}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Status</span>
                    <span className="emp-detail-value" style={{ textTransform: "capitalize" }}>{detailData.status}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Incident Date</span>
                    <span className="emp-detail-value">{detailData.incident_date || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Location</span>
                    <span className="emp-detail-value">{detailData.location || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">OSHA Recordable</span>
                    <span className="emp-detail-value">{detailData.osha_recordable ? "Yes" : "No"}</span>
                  </div>
                  <div className="emp-detail-row emp-detail-full">
                    <span className="emp-detail-label">Description</span>
                    <span className="emp-detail-value">{detailData.description || "N/A"}</span>
                  </div>
                  {detailData.corrective_actions && (
                    <div className="emp-detail-row emp-detail-full">
                      <span className="emp-detail-label">Corrective Actions</span>
                      <span className="emp-detail-value">{detailData.corrective_actions}</span>
                    </div>
                  )}
                  {detailData.root_cause && (
                    <div className="emp-detail-row emp-detail-full">
                      <span className="emp-detail-label">Root Cause</span>
                      <span className="emp-detail-value">{detailData.root_cause}</span>
                    </div>
                  )}
                  {detailData.witnesses && (
                    <div className="emp-detail-row emp-detail-full">
                      <span className="emp-detail-label">Witnesses</span>
                      <span className="emp-detail-value">{detailData.witnesses}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="vendor-modal-footer">
              <button className="vendor-modal-btn-cancel" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RFI Detail Modal ===== */}
      {activeModal === "view-rfi" && (
        <div className="vendor-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="vendor-modal-header">
              <h3>RFI Details</h3>
              <button className="vendor-modal-close" onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <div className="vendor-modal-body">
              {detailLoading && (
                <div className="emp-detail-loading"><Loader2 size={24} className="emp-spin" /> Loading...</div>
              )}
              {!detailLoading && !detailData && (
                <div className="vendor-empty">Could not load RFI details.</div>
              )}
              {!detailLoading && detailData && (
                <div className="emp-detail-grid">
                  <div className="emp-detail-row emp-detail-full">
                    <span className="emp-detail-label">Subject</span>
                    <span className="emp-detail-value">{detailData.subject}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">RFI Number</span>
                    <span className="emp-detail-value">{detailData.rfi_number || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Project</span>
                    <span className="emp-detail-value">{detailData.project_name || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Priority</span>
                    <span className="emp-detail-value" style={{ textTransform: "capitalize" }}>{detailData.priority}</span>
                  </div>
                  <div className="emp-detail-row">
                    <span className="emp-detail-label">Status</span>
                    <span className="emp-detail-value" style={{ textTransform: "capitalize" }}>{detailData.status}</span>
                  </div>
                  {detailData.due_date && (
                    <div className="emp-detail-row">
                      <span className="emp-detail-label">Due Date</span>
                      <span className="emp-detail-value">{detailData.due_date}</span>
                    </div>
                  )}
                  {detailData.cost_impact != null && (
                    <div className="emp-detail-row">
                      <span className="emp-detail-label">Cost Impact</span>
                      <span className="emp-detail-value">${Number(detailData.cost_impact).toLocaleString()}</span>
                    </div>
                  )}
                  {detailData.schedule_impact_days != null && (
                    <div className="emp-detail-row">
                      <span className="emp-detail-label">Schedule Impact</span>
                      <span className="emp-detail-value">{detailData.schedule_impact_days} days</span>
                    </div>
                  )}
                  <div className="emp-detail-row emp-detail-full">
                    <span className="emp-detail-label">Question</span>
                    <span className="emp-detail-value">{detailData.question || "N/A"}</span>
                  </div>
                  <div className="emp-detail-row emp-detail-full">
                    <span className="emp-detail-label">Answer</span>
                    <span className="emp-detail-value">{detailData.answer || "Not yet answered"}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="vendor-modal-footer">
              <button className="vendor-modal-btn-cancel" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
