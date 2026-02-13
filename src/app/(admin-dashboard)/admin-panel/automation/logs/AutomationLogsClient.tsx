"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { AutomationLogRow } from "@/lib/queries/automation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AutomationLogsClientProps {
  logs: AutomationLogRow[];
}

type StatusFilter = "all" | "success" | "failed" | "skipped";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AutomationLogsClient({
  logs,
}: AutomationLogsClientProps) {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (startDate) {
      result = result.filter((l) => l.created_at >= startDate);
    }

    if (endDate) {
      const endDateEnd = endDate + "T23:59:59";
      result = result.filter((l) => l.created_at <= endDateEnd);
    }

    return result;
  }, [logs, statusFilter, startDate, endDate]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function formatDate(ts: string): string {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "success":
        return <CheckCircle2 size={12} />;
      case "failed":
        return <XCircle size={12} />;
      case "skipped":
        return <AlertTriangle size={12} />;
      default:
        return null;
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div className="automation-header">
        <div>
          <h2>Automation Logs</h2>
          <p className="automation-header-sub">
            Review execution history for all automation rules.
          </p>
        </div>
        <div className="automation-header-actions">
          <Link href="/admin-panel/automation" className="btn-secondary">
            <ArrowLeft size={14} />
            Back to Rules
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="automation-logs-filters">
        <div className="automation-logs-filter-group">
          <label className="automation-form-label">Status</label>
          <select
            className="automation-form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
        <div className="automation-logs-filter-group">
          <label className="automation-form-label">Start Date</label>
          <input
            type="date"
            className="automation-form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="automation-logs-filter-group">
          <label className="automation-form-label">End Date</label>
          <input
            type="date"
            className="automation-form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {(statusFilter !== "all" || startDate || endDate) && (
          <button
            className="btn-secondary"
            style={{ alignSelf: "flex-end", padding: "6px 12px", fontSize: "0.78rem" }}
            onClick={() => {
              setStatusFilter("all");
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Logs Table */}
      {filteredLogs.length > 0 ? (
        <div className="automation-table-wrap">
          <table className="automation-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>Rule Name</th>
                <th>Entity</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Actions Executed</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="automation-log-row"
                    onClick={() => toggleExpand(log.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      {expandedId === log.id ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </td>
                    <td className="automation-rule-name">{log.rule_name}</td>
                    <td className="automation-muted">{log.trigger_entity}</td>
                    <td>
                      <span className={`automation-status-badge ${log.status}`}>
                        {getStatusIcon(log.status)}
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                    <td className="automation-muted">{formatDate(log.created_at)}</td>
                    <td className="automation-muted">
                      {log.actions_executed?.length ?? 0} action(s)
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-detail`} className="automation-log-detail">
                      <td colSpan={6}>
                        <div className="automation-log-detail-content">
                          {log.entity_id && (
                            <div className="automation-log-detail-row">
                              <strong>Entity ID:</strong> {log.entity_id}
                            </div>
                          )}
                          {log.error_message && (
                            <div className="automation-log-detail-row automation-log-error">
                              <strong>Error:</strong> {log.error_message}
                            </div>
                          )}
                          {log.actions_executed && log.actions_executed.length > 0 && (
                            <div className="automation-log-detail-row">
                              <strong>Actions:</strong>
                              <ul className="automation-log-actions-list">
                                {log.actions_executed.map((action, idx) => (
                                  <li key={idx}>
                                    {action.type}
                                    {Object.keys(action.config).length > 0 && (
                                      <span className="automation-muted">
                                        {" "}
                                        ({JSON.stringify(action.config)})
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {log.details && (
                            <div className="automation-log-detail-row">
                              <strong>Details:</strong>
                              <pre className="automation-log-json">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="automation-empty">
          <FileText size={32} />
          <div className="automation-empty-title">No logs found</div>
          <div className="automation-empty-desc">
            {statusFilter !== "all" || startDate || endDate
              ? "Try adjusting your filters."
              : "Automation execution logs will appear here."}
          </div>
        </div>
      )}
    </div>
  );
}
