"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Activity,
  Users,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import type { AuditLog, AuditLogStats } from "@/lib/queries/audit-logs";

interface Props {
  logs: AuditLog[];
  stats: AuditLogStats;
}

const PAGE_SIZE = 25;

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getActionBadgeStyle(action: string): React.CSSProperties {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("insert")) {
    return {
      background: "rgba(22, 163, 74, 0.1)",
      color: "var(--color-green, #16a34a)",
    };
  }
  if (lower.includes("update") || lower.includes("edit") || lower.includes("modify")) {
    return {
      background: "rgba(29, 78, 216, 0.1)",
      color: "var(--color-blue, #1d4ed8)",
    };
  }
  if (lower.includes("delete") || lower.includes("remove")) {
    return {
      background: "rgba(220, 38, 38, 0.1)",
      color: "var(--color-red, #dc2626)",
    };
  }
  if (lower.includes("login") || lower.includes("auth") || lower.includes("sign")) {
    return {
      background: "rgba(139, 92, 246, 0.1)",
      color: "#8b5cf6",
    };
  }
  return {
    background: "var(--surface, #f3f4f6)",
    color: "var(--muted, #6b7280)",
  };
}

function formatActionLabel(action: string): string {
  return action
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogsClient({ logs: initialLogs, stats }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Expanded row
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Extract unique actions and entity types from initial logs for dropdown options
  const uniqueActions = Array.from(
    new Set(initialLogs.map((l) => l.action))
  ).sort();
  const uniqueEntityTypes = Array.from(
    new Set(initialLogs.map((l) => l.entity_type).filter(Boolean))
  ).sort();

  const fetchFilteredLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (entityTypeFilter) params.set("entity_type", entityTypeFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(
        `/api/super-admin/audit-logs?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setCurrentPage(1);
        setExpandedRow(null);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityTypeFilter, dateFrom, dateTo]);

  // Re-fetch when filters change
  useEffect(() => {
    // Only fetch if any filter is actually set (skip initial mount with no filters)
    const hasFilters = actionFilter || entityTypeFilter || dateFrom || dateTo;
    if (hasFilters) {
      fetchFilteredLogs();
    } else {
      // Reset to initial data
      setLogs(initialLogs);
      setCurrentPage(1);
      setExpandedRow(null);
    }
  }, [actionFilter, entityTypeFilter, dateFrom, dateTo, fetchFilteredLogs, initialLogs]);

  // Client-side user search filter
  const filteredLogs = userSearch
    ? logs.filter(
        (l) =>
          (l.user_name &&
            l.user_name.toLowerCase().includes(userSearch.toLowerCase())) ||
          (l.user_email &&
            l.user_email.toLowerCase().includes(userSearch.toLowerCase()))
      )
    : logs;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const topActionLabel =
    stats.topActions.length > 0
      ? formatActionLabel(stats.topActions[0].action)
      : "N/A";

  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Audit Logs</h2>
          <p className="admin-header-sub">
            Track all platform activity and user actions across companies.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Shield size={18} />
          </div>
          <div className="admin-stat-label">Total Events</div>
          <div className="admin-stat-value">
            {stats.totalLogs.toLocaleString()}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Activity size={18} />
          </div>
          <div className="admin-stat-label">Events Today</div>
          <div className="admin-stat-value">
            {stats.logsToday.toLocaleString()}
          </div>
        </div>
        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "rgba(139, 92, 246, 0.08)",
              color: "#8b5cf6",
            }}
          >
            <Users size={18} />
          </div>
          <div className="admin-stat-label">Active Users Today</div>
          <div className="admin-stat-value">{stats.uniqueUsersToday}</div>
        </div>
        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "rgba(180, 83, 9, 0.08)",
              color: "var(--color-amber, #b45309)",
            }}
          >
            <Clock size={18} />
          </div>
          <div className="admin-stat-label">Top Action</div>
          <div
            className="admin-stat-value"
            style={{ fontSize: "1rem" }}
          >
            {topActionLabel}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--muted)",
            fontSize: "0.82rem",
            fontWeight: 600,
          }}
        >
          <Filter size={14} />
          Filters
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {formatActionLabel(a)}
            </option>
          ))}
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="">All Entity Types</option>
          {uniqueEntityTypes.map((et) => (
            <option key={et} value={et}>
              {formatActionLabel(et)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="invite-form-input"
          style={{ width: "150px" }}
          title="From date"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="invite-form-input"
          style={{ width: "150px" }}
          title="To date"
        />

        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "240px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search by user..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="invite-form-input"
            style={{ paddingLeft: "32px", width: "100%" }}
          />
        </div>

        {(actionFilter || entityTypeFilter || dateFrom || dateTo || userSearch) && (
          <button
            className="sa-action-btn"
            onClick={() => {
              setActionFilter("");
              setEntityTypeFilter("");
              setDateFrom("");
              setDateTo("");
              setUserSearch("");
            }}
            style={{ fontSize: "0.78rem", padding: "4px 10px" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            color: "var(--muted)",
            fontSize: "0.85rem",
          }}
        >
          Loading...
        </div>
      )}

      {/* Table */}
      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Company</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th style={{ width: "40px" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--muted)",
                  }}
                >
                  No audit logs found.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const isExpanded = expandedRow === log.id;
                return (
                  <tr key={log.id} style={{ cursor: "pointer" }}>
                    <td
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                    >
                      {log.user_name || log.user_email ? (
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                            {log.user_name || "Unknown"}
                          </div>
                          {log.user_email && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--muted)",
                              }}
                            >
                              {log.user_email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>System</span>
                      )}
                    </td>
                    <td
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                      style={{ fontSize: "0.85rem" }}
                    >
                      {log.company_name || (
                        <span style={{ color: "var(--muted)" }}>--</span>
                      )}
                    </td>
                    <td
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          ...getActionBadgeStyle(log.action),
                        }}
                      >
                        {formatActionLabel(log.action)}
                      </span>
                    </td>
                    <td
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                      style={{ fontSize: "0.85rem" }}
                    >
                      {log.entity_type ? (
                        formatActionLabel(log.entity_type)
                      ) : (
                        <span style={{ color: "var(--muted)" }}>--</span>
                      )}
                    </td>
                    <td
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--muted)",
                        fontFamily: "monospace",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={log.entity_id || undefined}
                    >
                      {log.entity_id || "--"}
                    </td>
                    <td
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                      style={{ textAlign: "center" }}
                    >
                      {log.details ? (
                        isExpanded ? (
                          <ChevronUp
                            size={16}
                            style={{ color: "var(--muted)" }}
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            style={{ color: "var(--muted)" }}
                          />
                        )
                      ) : (
                        <span style={{ color: "var(--muted)" }}>--</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Details Panel (rendered below table for the expanded row) */}
      {expandedRow &&
        (() => {
          const log = paginatedLogs.find((l) => l.id === expandedRow);
          if (!log || !log.details) return null;

          return (
            <div
              style={{
                background: "var(--surface, #f9fafb)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "16px",
                marginTop: "-1px",
                marginBottom: "16px",
                fontSize: "0.82rem",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "var(--foreground)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Event Details</span>
                <button
                  onClick={() => setExpandedRow(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    padding: "2px",
                  }}
                >
                  <ChevronUp size={16} />
                </button>
              </div>

              {log.ip_address && (
                <div style={{ marginBottom: 4, color: "var(--muted)" }}>
                  <strong>IP:</strong> {log.ip_address}
                </div>
              )}
              {log.user_agent && (
                <div
                  style={{
                    marginBottom: 8,
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    wordBreak: "break-all",
                  }}
                >
                  <strong>User Agent:</strong> {log.user_agent}
                </div>
              )}

              <pre
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "12px",
                  overflow: "auto",
                  maxHeight: "300px",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                  margin: 0,
                  color: "var(--foreground)",
                }}
              >
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          );
        })()}

      {/* Pagination */}
      {filteredLogs.length > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            fontSize: "0.82rem",
            color: "var(--muted)",
          }}
        >
          <div>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}
            {" - "}
            {Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of{" "}
            {filteredLogs.length} events
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="sa-action-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                fontSize: "0.78rem",
                padding: "4px 10px",
                opacity: currentPage <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="sa-action-btn"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              style={{
                fontSize: "0.78rem",
                padding: "4px 10px",
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
