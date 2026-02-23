"use client";

import { useState, useEffect, useCallback } from "react";
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

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function activityText(event: ClockEvent): string {
  const action =
    event.event_type === "clock_in" ? "Clocked in" : "Clocked out";
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

type ModalType = "daily-log" | "safety" | "photo" | "rfi" | null;

export default function EmployeeDashboardClient({
  dashboard,
}: {
  dashboard: EmployeeDashboardData;
}) {
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

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalMsg, setModalMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
  }

  // Submit Daily Log
  async function submitDailyLog() {
    if (!dlProject || !dlWork.trim()) {
      setModalMsg({
        type: "error",
        text: "Please select a project and describe the work performed.",
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
        setModalMsg({
          type: "success",
          text: "Daily log submitted successfully!",
        });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        const data = await res.json();
        setModalMsg({
          type: "error",
          text: data.error || "Failed to submit daily log.",
        });
      }
    } catch {
      setModalMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setModalSubmitting(false);
    }
  }

  // Submit Safety Check
  async function submitSafetyCheck() {
    if (!saTitle.trim() || !saDescription.trim()) {
      setModalMsg({
        type: "error",
        text: "Please provide a title and description.",
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
        setModalMsg({
          type: "success",
          text: "Safety report submitted successfully!",
        });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        const data = await res.json();
        setModalMsg({
          type: "error",
          text: data.error || "Failed to submit safety report.",
        });
      }
    } catch {
      setModalMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setModalSubmitting(false);
    }
  }

  // Submit RFI
  async function submitRfi() {
    if (!rfiProject || !rfiSubject.trim() || !rfiQuestion.trim()) {
      setModalMsg({
        type: "error",
        text: "Please select a project, enter a subject, and describe the question.",
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
        setModalMsg({
          type: "success",
          text: "RFI submitted successfully!",
        });
        setTimeout(() => setActiveModal(null), 1200);
      } else {
        const data = await res.json();
        setModalMsg({
          type: "error",
          text: data.error || "Failed to submit RFI.",
        });
      }
    } catch {
      setModalMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setModalSubmitting(false);
    }
  }

  // Quick actions
  const quickActions = [
    {
      label: "Daily Log",
      icon: <FileText size={20} />,
      modal: "daily-log" as ModalType,
    },
    {
      label: "Safety Check",
      icon: <ShieldAlert size={20} />,
      modal: "safety" as ModalType,
    },
    {
      label: "Photo Upload",
      icon: <Camera size={20} />,
      modal: "photo" as ModalType,
    },
    {
      label: "RFI",
      icon: <HelpCircle size={20} />,
      modal: "rfi" as ModalType,
    },
  ];

  return (
    <div>
      {/* ===== Welcome Banner ===== */}
      <div className="vendor-welcome-card">
        <h2>Welcome, {dashboard.employeeName}</h2>
        <p>
          {dashboard.companyName} &mdash;{" "}
          {dashboard.role.charAt(0).toUpperCase() + dashboard.role.slice(1)}
        </p>
        <div className="vendor-welcome-details">
          <div className="vendor-welcome-detail">
            <Clock size={16} />
            {todayHours.toFixed(1)}h today
          </div>
          <div className="vendor-welcome-detail">
            <Building2 size={16} />
            {dashboard.projects.length} Active Project
            {dashboard.projects.length !== 1 ? "s" : ""}
          </div>
          {isClockedIn ? (
            <span className="vendor-welcome-badge" style={{ background: "var(--color-green)" }}>
              Clocked In
            </span>
          ) : (
            <span className="vendor-welcome-badge" style={{ background: "var(--muted)" }}>
              Clocked Out
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
              Time Clock
            </div>
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div
                className={`emp-clock-status ${isClockedIn ? "clocked-in" : "clocked-out"}`}
              >
                {isClockedIn ? "Clocked In" : "Clocked Out"}
              </div>
              <div className="emp-clock-time">{elapsed}</div>
              {isClockedIn && lastEvent && (
                <div className="emp-clock-duration">
                  Started at {formatTime(lastEvent.timestamp)}
                </div>
              )}
              {!isClockedIn && lastEvent && (
                <div className="emp-clock-duration">
                  Last clocked out at {formatTime(lastEvent.timestamp)}
                </div>
              )}
              {!isClockedIn && !lastEvent && (
                <div className="emp-clock-duration">No clock events today</div>
              )}
              {error && <div className="emp-clock-error">{error}</div>}
              <button
                className={`emp-btn-clock ${isClockedIn ? "emp-btn-clock-out" : "emp-btn-clock-in"}`}
                onClick={handleClock}
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading
                  ? "Processing..."
                  : isClockedIn
                    ? "Clock Out"
                    : "Clock In"}
              </button>
            </div>

            {/* Today's Timeline */}
            {todayEvents.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
                <div className="emp-section-title">
                  <ClipboardList size={16} /> Today&apos;s Timeline
                </div>
                <div className="emp-timeline">
                  {todayEvents.slice(0, 6).map((event) => (
                    <div key={event.id} className="emp-timeline-item">
                      <div
                        className={`emp-timeline-dot ${event.event_type === "clock_in" ? "emp-timeline-dot-in" : "emp-timeline-dot-out"}`}
                      />
                      <div className="emp-timeline-content">
                        <div className="emp-timeline-time">
                          {formatTime(event.timestamp)}
                        </div>
                        <div className="emp-timeline-label">
                          {event.event_type === "clock_in"
                            ? "Clocked In"
                            : "Clocked Out"}
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

          {/* Quick Actions */}
          <div className="vendor-card">
            <div className="vendor-card-title">Quick Actions</div>
            <div className="emp-quick-grid">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="emp-quick-action"
                  onClick={() => openModal(action.modal)}
                >
                  <div className="emp-quick-icon">{action.icon}</div>
                  <span className="emp-quick-label">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pay & Certifications Summary */}
          <div className="emp-summary-row">
            {dashboard.recentPayslip && (
              <div className="card emp-summary-card">
                <div className="emp-summary-icon">
                  <DollarSign size={18} />
                </div>
                <div className="emp-summary-label">Last Paycheck</div>
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
                <div className="emp-summary-label">Certifications</div>
                <div className="emp-summary-value">
                  {dashboard.certifications.total}
                </div>
                {dashboard.certifications.expiring > 0 && (
                  <div className="emp-summary-meta emp-summary-warning">
                    {dashboard.certifications.expiring} expiring soon
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
              Overview
            </div>
            <div className="emp-kpi-row">
              <div className="emp-kpi">
                <div className="emp-kpi-label">Today</div>
                <div className="emp-kpi-value">{todayHours.toFixed(1)}h</div>
              </div>
              <div className="emp-kpi">
                <div className="emp-kpi-label">This Week</div>
                <div className="emp-kpi-value">
                  {dashboard.hoursThisWeek.toFixed(1)}h
                </div>
              </div>
              <div className="emp-kpi">
                <div className="emp-kpi-label">Pending</div>
                <div className="emp-kpi-value">
                  {dashboard.pendingTimesheets}
                </div>
              </div>
              {dashboard.certifications.expiring > 0 && (
                <div className="emp-kpi emp-kpi-alert">
                  <div className="emp-kpi-label">Expiring Certs</div>
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
              Today&apos;s Assignments
            </div>
            <div className="emp-assignments-list">
              <div className="emp-assignment-item">
                <div
                  className="emp-assignment-dot"
                  style={{ background: "var(--color-green)" }}
                />
                <div className="emp-assignment-info">
                  <div className="emp-assignment-task">
                    No assignments scheduled
                  </div>
                  <div className="emp-assignment-project">
                    Tasks will appear here when assigned
                  </div>
                </div>
                <span className="badge badge-blue">Info</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <Clock size={18} />
              Recent Activity
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
                        {activityText(event)}
                      </div>
                      <div className="emp-activity-time">
                        {formatRelativeTime(event.timestamp)}
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
                <p>No activity today</p>
                <p className="emp-empty-sub">
                  Clock in to start tracking your time
                </p>
              </div>
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
              <h3>Submit Daily Log</h3>
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
                <label>Project</label>
                <select
                  style={S.select}
                  value={dlProject}
                  onChange={(e) => setDlProject(e.target.value)}
                >
                  <option value="">— Select Project —</option>
                  {dashboard.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>Date</label>
                <input
                  type="date"
                  style={S.input}
                  value={dlDate}
                  onChange={(e) => setDlDate(e.target.value)}
                />
              </div>
              <div className="vendor-modal-field">
                <label>Work Performed</label>
                <textarea
                  style={S.textarea}
                  value={dlWork}
                  onChange={(e) => setDlWork(e.target.value)}
                  placeholder="Describe the work completed today..."
                  rows={4}
                />
              </div>
              <div className="vendor-modal-field">
                <label>Weather</label>
                <select
                  style={S.select}
                  value={dlWeather}
                  onChange={(e) => setDlWeather(e.target.value)}
                >
                  <option value="clear">Clear</option>
                  <option value="cloudy">Cloudy</option>
                  <option value="rain">Rain</option>
                  <option value="snow">Snow</option>
                  <option value="windy">Windy</option>
                  <option value="extreme_heat">Extreme Heat</option>
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>Crew Size (optional)</label>
                <input
                  type="number"
                  style={S.input}
                  value={dlCrewSize}
                  onChange={(e) => setDlCrewSize(e.target.value)}
                  placeholder="e.g., 12"
                  min="0"
                />
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                className="vendor-modal-btn-submit"
                disabled={modalSubmitting}
                onClick={submitDailyLog}
              >
                {modalSubmitting ? "Submitting..." : "Submit Daily Log"}
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
              <h3>Report Safety Issue</h3>
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
                <label>Project (optional)</label>
                <select
                  style={S.select}
                  value={saProject}
                  onChange={(e) => setSaProject(e.target.value)}
                >
                  <option value="">— Select Project —</option>
                  {dashboard.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>Title</label>
                <input
                  type="text"
                  style={S.input}
                  value={saTitle}
                  onChange={(e) => setSaTitle(e.target.value)}
                  placeholder="e.g., Unsecured scaffolding on Level 3"
                />
              </div>
              <div className="vendor-modal-field">
                <label>Description</label>
                <textarea
                  style={S.textarea}
                  value={saDescription}
                  onChange={(e) => setSaDescription(e.target.value)}
                  placeholder="Describe the safety issue in detail..."
                  rows={4}
                />
              </div>
              <div className="vendor-modal-field">
                <label>Severity</label>
                <select
                  style={S.select}
                  value={saSeverity}
                  onChange={(e) => setSaSeverity(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                className="vendor-modal-btn-submit"
                disabled={modalSubmitting}
                onClick={submitSafetyCheck}
              >
                {modalSubmitting ? "Submitting..." : "Submit Report"}
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
              <h3>Photo Upload</h3>
              <button
                className="vendor-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                }}
              >
                <Camera
                  size={48}
                  style={{ color: "var(--muted)", marginBottom: 16 }}
                />
                <p
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: "0 0 8px 0",
                  }}
                >
                  Coming Soon
                </p>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                    margin: 0,
                  }}
                >
                  Photo upload from the field will be available in a future
                  update. Use the Documents page to upload files in the
                  meantime.
                </p>
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                Close
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
              <h3>Submit RFI</h3>
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
                <label>Project</label>
                <select
                  style={S.select}
                  value={rfiProject}
                  onChange={(e) => setRfiProject(e.target.value)}
                >
                  <option value="">— Select Project —</option>
                  {dashboard.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-modal-field">
                <label>Subject</label>
                <input
                  type="text"
                  style={S.input}
                  value={rfiSubject}
                  onChange={(e) => setRfiSubject(e.target.value)}
                  placeholder="e.g., Clarification on foundation spec"
                />
              </div>
              <div className="vendor-modal-field">
                <label>Question / Details</label>
                <textarea
                  style={S.textarea}
                  value={rfiQuestion}
                  onChange={(e) => setRfiQuestion(e.target.value)}
                  placeholder="Describe your question or request for information..."
                  rows={4}
                />
              </div>
              <div className="vendor-modal-field">
                <label>Priority</label>
                <select
                  style={S.select}
                  value={rfiPriority}
                  onChange={(e) => setRfiPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button
                className="vendor-modal-btn-cancel"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                className="vendor-modal-btn-submit"
                disabled={modalSubmitting}
                onClick={submitRfi}
              >
                {modalSubmitting ? "Submitting..." : "Submit RFI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
