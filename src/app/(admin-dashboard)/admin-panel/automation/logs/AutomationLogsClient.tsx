"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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
import { formatDateTimeSafe } from "@/lib/utils/format";

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
  const t = useTranslations("adminPanel");

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
    return formatDateTimeSafe(ts);
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
          <h2>{t("automationLogs.title")}</h2>
          <p className="automation-header-sub">
            {t("automationLogs.subtitle")}
          </p>
        </div>
        <div className="automation-header-actions">
          <Link href="/admin-panel/automation" className="btn-secondary">
            <ArrowLeft size={14} />
            {t("automationLogs.backToRules")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="automation-logs-filters">
        <div className="automation-logs-filter-group">
          <label className="automation-form-label">{t("automationLogs.status")}</label>
          <select
            className="automation-form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">{t("automationLogs.all")}</option>
            <option value="success">{t("automationLogs.success")}</option>
            <option value="failed">{t("automationLogs.failed")}</option>
            <option value="skipped">{t("automationLogs.skipped")}</option>
          </select>
        </div>
        <div className="automation-logs-filter-group">
          <label className="automation-form-label">{t("automationLogs.startDate")}</label>
          <input
            type="date"
            className="automation-form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="automation-logs-filter-group">
          <label className="automation-form-label">{t("automationLogs.endDate")}</label>
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
            {t("automationLogs.clearFilters")}
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
                <th>{t("automationLogs.thRuleName")}</th>
                <th>{t("automationLogs.thEntity")}</th>
                <th>{t("automationLogs.thStatus")}</th>
                <th>{t("automationLogs.thTimestamp")}</th>
                <th>{t("automationLogs.thActionsExecuted")}</th>
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
                              <strong>{t("automationLogs.entityId")}:</strong> {log.entity_id}
                            </div>
                          )}
                          {log.error_message && (
                            <div className="automation-log-detail-row automation-log-error">
                              <strong>{t("automationLogs.error")}:</strong> {log.error_message}
                            </div>
                          )}
                          {log.actions_executed && log.actions_executed.length > 0 && (
                            <div className="automation-log-detail-row">
                              <strong>{t("automationLogs.actions")}:</strong>
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
                              <strong>{t("automationLogs.details")}:</strong>
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
          <div className="automation-empty-title">{t("automationLogs.noLogsFound")}</div>
          <div className="automation-empty-desc">
            {statusFilter !== "all" || startDate || endDate
              ? t("automationLogs.tryAdjustingFilters")
              : t("automationLogs.logsWillAppear")}
          </div>
        </div>
      )}
    </div>
  );
}
