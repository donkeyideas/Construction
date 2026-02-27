"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Send, ChevronDown, ChevronRight } from "lucide-react";
import type { EmployeeTimesheet } from "@/lib/queries/employee-portal";

interface TimesheetsClientProps {
  timesheets: EmployeeTimesheet[];
}

interface WeekGroup {
  weekLabel: string;
  weekStart: string;
  entries: EmployeeTimesheet[];
  totalHours: number;
  hasPending: boolean;
}

function getISOWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function formatWeekLabel(mondayStr: string): string {
  const monday = new Date(mondayStr + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmtOpts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const monLabel = monday.toLocaleDateString("en-US", fmtOpts);
  const sunLabel = sunday.toLocaleDateString("en-US", {
    ...fmtOpts,
    year: "numeric",
  });
  return `${monLabel} - ${sunLabel}`;
}

function getStatusBadge(status: string, t: (key: string) => string): { label: string; className: string } {
  switch (status) {
    case "approved":
      return { label: t("timesheets.approved"), className: "inv-status inv-status-approved" };
    case "processed":
    case "paid":
      return { label: t("timesheets.processed"), className: "inv-status inv-status-paid" };
    case "rejected":
      return { label: t("timesheets.rejected"), className: "inv-status inv-status-overdue" };
    default:
      return { label: t("timesheets.pending"), className: "inv-status inv-status-pending" };
  }
}

export default function TimesheetsClient({ timesheets }: TimesheetsClientProps) {
  const t = useTranslations("employeeDashboard");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Group timesheets by ISO week
  const weekGroups: WeekGroup[] = (() => {
    const groupMap = new Map<string, EmployeeTimesheet[]>();

    for (const entry of timesheets) {
      const entryDate = new Date(entry.entry_date + "T00:00:00");
      const monday = getISOWeekMonday(entryDate);
      const key = monday.toISOString().slice(0, 10);

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(entry);
    }

    // Sort weeks descending (most recent first)
    const sorted = [...groupMap.entries()].sort((a, b) =>
      b[0].localeCompare(a[0])
    );

    return sorted.map(([weekStart, entries]) => ({
      weekLabel: formatWeekLabel(weekStart),
      weekStart,
      entries: entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
      totalHours: entries.reduce((sum, e) => sum + (e.hours ?? 0), 0),
      hasPending: entries.some((e) => e.status === "pending"),
    }));
  })();

  // Auto-expand the first (most recent) week
  if (weekGroups.length > 0 && expandedWeeks.size === 0) {
    expandedWeeks.add(weekGroups[0].weekStart);
  }

  function toggleWeek(weekStart: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekStart)) {
        next.delete(weekStart);
      } else {
        next.add(weekStart);
      }
      return next;
    });
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTimeRange(clockIn: string | null, clockOut: string | null): string {
    if (!clockIn) return "--";
    const inTime = new Date(clockIn).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    if (!clockOut) return `${inTime} - ongoing`;
    const outTime = new Date(clockOut).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${inTime} - ${outTime}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("timesheets.title")}</h2>
          <p className="fin-header-sub">{t("timesheets.subtitle")}</p>
        </div>
      </div>

      {weekGroups.length > 0 ? (
        <div className="emp-weeks-list">
          {weekGroups.map((week) => {
            const isExpanded = expandedWeeks.has(week.weekStart);
            return (
              <div key={week.weekStart} className="fin-chart-card emp-week-card">
                {/* Week Header */}
                <button
                  className="emp-week-header"
                  onClick={() => toggleWeek(week.weekStart)}
                >
                  <div className="emp-week-header-left">
                    {isExpanded ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                    <Calendar size={16} style={{ color: "var(--color-amber)" }} />
                    <span className="emp-week-label">{week.weekLabel}</span>
                  </div>
                  <div className="emp-week-header-right">
                    <span className="emp-week-hours">
                      <Clock size={14} />
                      {week.totalHours.toFixed(1)}h
                    </span>
                    {week.hasPending && (
                      <span className="inv-status inv-status-pending">{t("timesheets.pending")}</span>
                    )}
                    {!week.hasPending && week.entries.length > 0 && (
                      <span className="inv-status inv-status-approved">{t("timesheets.approved")}</span>
                    )}
                  </div>
                </button>

                {/* Week Entries */}
                {isExpanded && (
                  <div className="emp-week-body">
                    <div style={{ overflowX: "auto" }}>
                      <table className="invoice-table">
                        <thead>
                          <tr>
                            <th>{t("date")}</th>
                            <th>{t("project")}</th>
                            <th>{t("timesheets.time")}</th>
                            <th>{t("timesheets.hours")}</th>
                            <th>{t("timesheets.type")}</th>
                            <th>{t("timesheets.status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {week.entries.map((entry) => {
                            const status = getStatusBadge(entry.status, t);
                            return (
                              <tr key={entry.id}>
                                <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                                  {formatDate(entry.entry_date)}
                                </td>
                                <td>
                                  {entry.project_name || (
                                    <span style={{ color: "var(--muted)" }}>--</span>
                                  )}
                                </td>
                                <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                                  {formatTimeRange(entry.clock_in, entry.clock_out)}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  {entry.hours != null ? `${entry.hours.toFixed(1)}h` : "--"}
                                </td>
                                <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                                  {entry.work_type || "--"}
                                </td>
                                <td>
                                  <span className={status.className}>{status.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Submit button for pending entries */}
                    {week.hasPending && (
                      <div className="emp-week-actions">
                        <button
                          className="ui-btn ui-btn-sm ui-btn-primary"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                          onClick={() => {
                            // In a full implementation, this would submit the timesheet
                            alert(t("timesheets.submittedAlert"));
                          }}
                        >
                          <Send size={14} />
                          {t("timesheets.submitTimesheet")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <Calendar size={48} />
            </div>
            <div className="fin-empty-title">{t("timesheets.noTimesheets")}</div>
            <div className="fin-empty-desc">
              {t("timesheets.noTimesheetsDesc")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
