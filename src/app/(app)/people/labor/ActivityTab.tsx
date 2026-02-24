"use client";

import { useState } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Users,
  AlertCircle,
  CheckCircle,
  MinusCircle,
  X,
} from "lucide-react";

interface ClockEvent {
  id: string;
  user_id: string;
  event_type: string;
  timestamp: string;
  notes: string | null;
}

export interface EmployeeActivity {
  userId: string;
  name: string;
  email: string;
  jobTitle: string;
  currentStatus: "clocked_in" | "clocked_out" | "no_activity";
  lastEvent: string | null;
  todayHours: number;
  weekHours: number;
  todayEvents: ClockEvent[];
}

interface ActivityTabProps {
  activities: EmployeeActivity[];
  todayISO: string;
  rateMap: Record<string, number>;
}

function fmtCost(hours: number, rate: number | undefined): string {
  if (!rate) return "--";
  const cost = hours * rate;
  return cost > 0
    ? `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "--";
}

export default function ActivityTab({ activities, rateMap }: ActivityTabProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeActivity | null>(null);
  const [filter, setFilter] = useState<"all" | "clocked_in" | "clocked_out" | "no_activity">("all");

  const clockedInCount = activities.filter((a) => a.currentStatus === "clocked_in").length;
  const clockedOutCount = activities.filter((a) => a.currentStatus === "clocked_out").length;
  const noActivityCount = activities.filter((a) => a.currentStatus === "no_activity").length;

  const filtered = filter === "all" ? activities : activities.filter((a) => a.currentStatus === filter);

  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "clocked_in":
        return (
          <span className="inv-status inv-status-paid">
            <CheckCircle size={12} />
            Clocked In
          </span>
        );
      case "clocked_out":
        return (
          <span className="inv-status inv-status-pending">
            <MinusCircle size={12} />
            Clocked Out
          </span>
        );
      default:
        return (
          <span className="inv-status inv-status-draft">
            <AlertCircle size={12} />
            No Activity
          </span>
        );
    }
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <button
          className={`fin-kpi${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
          style={{ cursor: "pointer", border: filter === "all" ? "1px solid var(--color-amber)" : undefined, textAlign: "left" }}
        >
          <div className="fin-kpi-label">
            <Users size={14} />
            Total Employees
          </div>
          <div className="fin-kpi-value">{activities.length}</div>
        </button>
        <button
          className={`fin-kpi${filter === "clocked_in" ? " active" : ""}`}
          onClick={() => setFilter("clocked_in")}
          style={{ cursor: "pointer", border: filter === "clocked_in" ? "1px solid var(--color-green)" : undefined, textAlign: "left" }}
        >
          <div className="fin-kpi-label">
            <LogIn size={14} style={{ color: "var(--color-green)" }} />
            Clocked In
          </div>
          <div className="fin-kpi-value" style={{ color: "var(--color-green)" }}>{clockedInCount}</div>
        </button>
        <button
          className={`fin-kpi${filter === "clocked_out" ? " active" : ""}`}
          onClick={() => setFilter("clocked_out")}
          style={{ cursor: "pointer", border: filter === "clocked_out" ? "1px solid var(--color-amber)" : undefined, textAlign: "left" }}
        >
          <div className="fin-kpi-label">
            <LogOut size={14} style={{ color: "var(--color-amber)" }} />
            Clocked Out
          </div>
          <div className="fin-kpi-value" style={{ color: "var(--color-amber)" }}>{clockedOutCount}</div>
        </button>
        <button
          className={`fin-kpi${filter === "no_activity" ? " active" : ""}`}
          onClick={() => setFilter("no_activity")}
          style={{ cursor: "pointer", border: filter === "no_activity" ? "1px solid var(--muted)" : undefined, textAlign: "left" }}
        >
          <div className="fin-kpi-label">
            <AlertCircle size={14} style={{ color: "var(--muted)" }} />
            No Activity
          </div>
          <div className="fin-kpi-value" style={{ color: "var(--muted)" }}>{noActivityCount}</div>
        </button>
      </div>

      {/* Table */}
      <div className="fin-chart-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length > 0 ? (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Job Title</th>
                <th>Status</th>
                <th>Last Event</th>
                <th>Today</th>
                <th>Today $</th>
                <th>This Week</th>
                <th>Week $</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((activity) => (
                <tr key={activity.userId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{activity.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{activity.email}</div>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{activity.jobTitle || "--"}</td>
                  <td>{getStatusBadge(activity.currentStatus)}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {activity.lastEvent ? formatDate(activity.lastEvent) : "--"}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{activity.todayHours}h</span>
                  </td>
                  <td style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>
                    {fmtCost(activity.todayHours, rateMap[activity.userId])}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{activity.weekHours}h</span>
                  </td>
                  <td style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>
                    {fmtCost(activity.weekHours, rateMap[activity.userId])}
                  </td>
                  <td>
                    {activity.todayEvents.length > 0 ? (
                      <button
                        className="ui-btn ui-btn-sm ui-btn-ghost"
                        onClick={() => setSelectedEmployee(activity)}
                      >
                        <Clock size={13} />
                        View ({activity.todayEvents.length})
                      </button>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>No events</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="fin-empty" style={{ padding: 48 }}>
            <div className="fin-empty-icon"><Users size={48} /></div>
            <div className="fin-empty-title">No Employees Found</div>
            <div className="fin-empty-desc">
              {filter !== "all"
                ? "No employees match this filter. Try selecting a different status."
                : "No employees with portal access found. Create employee logins from the People Directory."}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEmployee && (
        <div className="fin-modal-overlay" onClick={() => setSelectedEmployee(null)}>
          <div
            className="fin-modal"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fin-modal-header">
              <h3>
                <Clock size={18} style={{ marginRight: 8 }} />
                {selectedEmployee.name} — Today&apos;s Activity
              </h3>
              <button
                className="ui-btn ui-btn-sm ui-btn-ghost"
                onClick={() => setSelectedEmployee(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="fin-modal-body">
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div className="fin-chart-card" style={{ flex: 1, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 4 }}>Status</div>
                  {getStatusBadge(selectedEmployee.currentStatus)}
                </div>
                <div className="fin-chart-card" style={{ flex: 1, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 4 }}>Today</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{selectedEmployee.todayHours}h</div>
                  {rateMap[selectedEmployee.userId] && selectedEmployee.todayHours > 0 && (
                    <div style={{ fontSize: "0.82rem", color: "var(--success, #16a34a)", fontWeight: 600, marginTop: 2 }}>
                      {fmtCost(selectedEmployee.todayHours, rateMap[selectedEmployee.userId])}
                    </div>
                  )}
                </div>
                <div className="fin-chart-card" style={{ flex: 1, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 4 }}>Week</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{selectedEmployee.weekHours}h</div>
                  {rateMap[selectedEmployee.userId] && selectedEmployee.weekHours > 0 && (
                    <div style={{ fontSize: "0.82rem", color: "var(--success, #16a34a)", fontWeight: 600, marginTop: 2 }}>
                      {fmtCost(selectedEmployee.weekHours, rateMap[selectedEmployee.userId])}
                    </div>
                  )}
                </div>
              </div>

              {selectedEmployee.todayEvents.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedEmployee.todayEvents
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((event) => (
                      <div
                        key={event.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          background: "var(--bg-secondary)",
                          borderRadius: 8,
                          fontSize: "0.88rem",
                        }}
                      >
                        {event.event_type === "clock_in" ? (
                          <LogIn size={15} style={{ color: "var(--color-green)" }} />
                        ) : (
                          <LogOut size={15} style={{ color: "var(--color-red)" }} />
                        )}
                        <span style={{ fontWeight: 600 }}>
                          {event.event_type === "clock_in" ? "Clock In" : "Clock Out"}
                        </span>
                        <span style={{ color: "var(--muted)", marginLeft: "auto" }}>
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                  No clock events today.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
