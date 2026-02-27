"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getLocalToday } from "@/lib/utils/timezone";
import {
  Clock,
  LogIn,
  LogOut,
  Timer,
  CalendarDays,
} from "lucide-react";
import type { ClockEvent } from "@/lib/queries/employee-portal";

interface ClockClientProps {
  isClockedIn: boolean;
  lastEvent: ClockEvent | null;
  todayEvents: ClockEvent[];
  weeklyHours: Record<string, number>;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ClockClient({
  isClockedIn: initialClockedIn,
  lastEvent: initialLastEvent,
  todayEvents: initialEvents,
  weeklyHours,
}: ClockClientProps) {
  const t = useTranslations("employeeDashboard");
  const router = useRouter();
  const [clockedIn, setClockedIn] = useState(initialClockedIn);
  const [lastEvent, setLastEvent] = useState(initialLastEvent);
  const [todayEvents, setTodayEvents] = useState(initialEvents);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate elapsed time since last clock_in
  const updateElapsed = useCallback(() => {
    if (!clockedIn || !lastEvent) {
      setElapsed("00:00:00");
      return;
    }
    const start = new Date(lastEvent.timestamp).getTime();
    const diff = Math.max(0, Date.now() - start);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setElapsed(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    );
  }, [clockedIn, lastEvent]);

  useEffect(() => {
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [updateElapsed]);

  // Fetch fresh data from API
  async function refreshData() {
    try {
      const res = await fetch("/api/employee/clock");
      if (res.ok) {
        const data = await res.json();
        setClockedIn(data.isClockedIn);
        setLastEvent(data.lastEvent);
        setTodayEvents(data.todayEvents ?? []);
      }
    } catch {
      // Silently fail refresh
    }
  }

  async function handleClock(eventType: "clock_in" | "clock_out") {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/employee/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record clock event");
        return;
      }

      // Update local state immediately
      setClockedIn(eventType === "clock_in");
      setLastEvent(data);
      await refreshData();
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  // Calculate total hours worked today from events
  function calculateTodayHours(): number {
    const sorted = [...todayEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let totalMs = 0;
    let pendingClockIn: Date | null = null;

    for (const event of sorted) {
      if (event.event_type === "clock_in") {
        pendingClockIn = new Date(event.timestamp);
      } else if (event.event_type === "clock_out" && pendingClockIn) {
        totalMs += new Date(event.timestamp).getTime() - pendingClockIn.getTime();
        pendingClockIn = null;
      }
    }
    if (pendingClockIn) {
      totalMs += Date.now() - pendingClockIn.getTime();
    }
    return Math.round((totalMs / 3600000) * 100) / 100;
  }

  const todayHours = calculateTodayHours();
  const weekDates = Object.keys(weeklyHours).sort();
  const totalWeekHours = Object.values(weeklyHours).reduce((s, h) => s + h, 0);

  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("clock.title")}</h2>
          <p className="fin-header-sub">{t("clock.subtitle")}</p>
        </div>
      </div>

      <div className="emp-clock-layout">
        {/* Main Clock Section */}
        <div className="emp-clock-main">
          <div className="fin-chart-card emp-clock-card">
            {/* Timer Display */}
            <div className="emp-timer-display">
              <Clock size={32} style={{ color: clockedIn ? "var(--color-green)" : "var(--muted)" }} />
              <div className="emp-timer-time">{elapsed}</div>
              <div className="emp-timer-label">
                {clockedIn ? t("clock.onTheClock") : t("clock.readyToStart")}
              </div>
              {clockedIn && lastEvent && (
                <div className="emp-timer-since">
                  {t("clock.clockedInAt", { time: formatTime(lastEvent.timestamp) })}
                  {lastEvent.project_name && (
                    <span> on {lastEvent.project_name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Clock Button */}
            <div className="emp-clock-btn-wrap">
              {clockedIn ? (
                <button
                  className="emp-clock-btn emp-clock-btn-out"
                  onClick={() => handleClock("clock_out")}
                  disabled={loading}
                >
                  <LogOut size={22} />
                  {loading ? t("clock.clockingOut") : t("clockOut")}
                </button>
              ) : (
                <button
                  className="emp-clock-btn emp-clock-btn-in"
                  onClick={() => handleClock("clock_in")}
                  disabled={loading}
                >
                  <LogIn size={22} />
                  {loading ? t("clock.clockingIn") : t("clockIn")}
                </button>
              )}
            </div>

            {error && (
              <p className="emp-clock-error">{error}</p>
            )}

            {todayHours > 0 && (
              <div className="emp-today-hours">
                <Timer size={15} />
                {t("clock.totalToday", { hours: todayHours.toFixed(1) })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="emp-clock-sidebar">
          {/* Today's Timeline */}
          <div className="fin-chart-card">
            <h3 className="emp-section-title">
              <Clock size={16} />
              {t("todaysTimeline")}
            </h3>

            {todayEvents.length > 0 ? (
              <div className="emp-timeline">
                {[...todayEvents]
                  .sort(
                    (a, b) =>
                      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  )
                  .map((event) => (
                    <div key={event.id} className="emp-timeline-item">
                      <div
                        className={`emp-timeline-dot ${
                          event.event_type === "clock_in"
                            ? "emp-timeline-dot-in"
                            : "emp-timeline-dot-out"
                        }`}
                      />
                      <div className="emp-timeline-content">
                        <div className="emp-timeline-time">
                          {formatTime(event.timestamp)}
                        </div>
                        <div className="emp-timeline-label">
                          {event.event_type === "clock_in" ? t("clock.clockedInEvent") : t("clock.clockedOutEvent")}
                          {event.project_name && (
                            <span className="emp-timeline-project">
                              {" "}
                              - {event.project_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="emp-empty-small">
                {t("noClockEvents")}
              </div>
            )}
          </div>

          {/* Weekly Summary */}
          <div className="fin-chart-card">
            <h3 className="emp-section-title">
              <CalendarDays size={16} />
              {t("thisWeek")}
              <span className="emp-week-total">{totalWeekHours.toFixed(1)}h</span>
            </h3>

            <div className="emp-week-grid">
              {weekDates.map((date, i) => {
                const hours = weeklyHours[date] ?? 0;
                const isToday = date === getLocalToday();
                return (
                  <div
                    key={date}
                    className={`emp-week-day ${isToday ? "emp-week-day-today" : ""}`}
                  >
                    <div className="emp-week-day-label">{DAY_LABELS[i]}</div>
                    <div className="emp-week-day-bar-wrap">
                      <div
                        className="emp-week-day-bar"
                        style={{
                          height: `${Math.min(100, (hours / 10) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="emp-week-day-hours">
                      {hours > 0 ? `${hours.toFixed(1)}h` : "--"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
