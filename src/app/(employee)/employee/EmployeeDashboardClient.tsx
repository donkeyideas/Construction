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

function activityIcon(eventType: "clock_in" | "clock_out") {
  if (eventType === "clock_in") {
    return <Clock size={14} />;
  }
  return <Clock size={14} />;
}

function activityText(event: ClockEvent): string {
  const action =
    event.event_type === "clock_in" ? "Clocked in" : "Clocked out";
  const project = event.project_name ? ` at ${event.project_name}` : "";
  return `${action}${project}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmployeeDashboardClient({
  dashboard,
}: {
  dashboard: EmployeeDashboardData;
}) {
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
    const interval = setInterval(updateElapsed, 15000); // update every 15s
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

      // Replace optimistic event with server event
      setLastEvent(serverEvent);
      setTodayEvents((prev) =>
        prev.map((e) => (e.id === optimisticEvent.id ? serverEvent : e))
      );
    } catch (err) {
      // Revert optimistic update
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

  // Quick actions
  const quickActions = [
    {
      label: "Daily Log",
      icon: <FileText size={20} />,
      href: "/daily-logs",
    },
    {
      label: "Safety Check",
      icon: <ShieldAlert size={20} />,
      href: "/safety",
    },
    {
      label: "Photo Upload",
      icon: <Camera size={20} />,
      href: "/documents",
    },
    {
      label: "RFI",
      icon: <HelpCircle size={20} />,
      href: "/rfis",
    },
  ];

  return (
    <div className="emp-dashboard">
      {/* Clock In/Out Card */}
      <div className="card emp-clock-card">
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
        >
          {loading
            ? "Processing..."
            : isClockedIn
              ? "Clock Out"
              : "Clock In"}
        </button>
      </div>

      {/* KPI Row */}
      <div className="emp-kpi-row">
        <div className="emp-kpi">
          <div className="emp-kpi-label">Today</div>
          <div className="emp-kpi-value">{todayHours.toFixed(1)}h</div>
        </div>
        <div className="emp-kpi">
          <div className="emp-kpi-label">This Week</div>
          <div className="emp-kpi-value">{dashboard.hoursThisWeek.toFixed(1)}h</div>
        </div>
        <div className="emp-kpi">
          <div className="emp-kpi-label">Pending</div>
          <div className="emp-kpi-value">{dashboard.pendingTimesheets}</div>
        </div>
        {dashboard.certifications.expiring > 0 && (
          <div className="emp-kpi emp-kpi-alert">
            <div className="emp-kpi-label">Expiring Certs</div>
            <div className="emp-kpi-value">{dashboard.certifications.expiring}</div>
          </div>
        )}
      </div>

      {/* Today's Assignments */}
      <div className="card">
        <div className="card-title">
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

      {/* Quick Actions */}
      <div className="card" style={{ padding: "16px 12px" }}>
        <div className="card-title" style={{ padding: "0 4px" }}>
          Quick Actions
        </div>
        <div className="emp-quick-grid">
          {quickActions.map((action) => (
            <a
              key={action.label}
              className="emp-quick-action"
              href={action.href}
            >
              <div className="emp-quick-icon">{action.icon}</div>
              <span className="emp-quick-label">{action.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-title">
          <Clock size={18} />
          Recent Activity
        </div>
        {todayEvents.length > 0 ? (
          <div className="emp-activity-list">
            {todayEvents.slice(0, 6).map((event) => (
              <div key={event.id} className="emp-activity-item">
                <div className="emp-activity-icon">
                  {activityIcon(event.event_type)}
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

      {/* Pay & Certifications Summary */}
      <div className="emp-summary-row">
        {dashboard.recentPayslip && (
          <div className="card emp-summary-card">
            <div className="emp-summary-icon">
              <DollarSign size={18} />
            </div>
            <div className="emp-summary-label">Last Paycheck</div>
            <div className="emp-summary-value">
              ${dashboard.recentPayslip.net_pay.toLocaleString("en-US", {
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
  );
}
