"use client";

import { formatDateSafe, formatDateShort } from "@/lib/utils/format";
import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  ShieldCheck,
  AlertTriangle,
  Search as SearchIcon,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";
import type {
  SafetyIncidentRow,
  SafetyStats,
  ToolboxTalkRow,
} from "@/lib/queries/safety";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTopicLabel(topic: unknown): string {
  if (!topic) return "--";
  if (typeof topic === "string") return topic;
  if (typeof topic === "object" && topic !== null) {
    const obj = topic as Record<string, unknown>;
    return (obj.name as string) || JSON.stringify(topic);
  }
  return String(topic);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SafetyDashboardClientProps {
  incidents: SafetyIncidentRow[];
  stats: SafetyStats;
  toolboxTalks: ToolboxTalkRow[];
}

export default function SafetyDashboardClient({
  incidents,
  stats,
  toolboxTalks,
}: SafetyDashboardClientProps) {
  const t = useTranslations("safety");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [selectedIncident, setSelectedIncident] = useState<SafetyIncidentRow | null>(null);
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalkRow | null>(null);

  // ---------------------------------------------------------------------------
  // Constants (translated)
  // ---------------------------------------------------------------------------

  const STATUS_LABELS: Record<string, string> = {
    reported: t("statusReported"),
    investigating: t("statusInvestigating"),
    corrective_action: t("statusCorrectiveAction"),
    closed: t("statusClosed"),
  };

  const SEVERITY_LABELS: Record<string, string> = {
    low: t("severityLow"),
    medium: t("severityMedium"),
    high: t("severityHigh"),
    critical: t("severityCritical"),
  };

  const TYPE_LABELS: Record<string, string> = {
    near_miss: t("typeNearMiss"),
    first_aid: t("typeFirstAid"),
    recordable: t("typeRecordable"),
    lost_time: t("typeLostTime"),
    fatality: t("typeFatality"),
    property_damage: t("typePropertyDamage"),
  };

  const TALK_STATUS_LABELS: Record<string, string> = {
    scheduled: t("talkStatusScheduled"),
    completed: t("talkStatusCompleted"),
    cancelled: t("talkStatusCancelled"),
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDateShort(dateStr: string | null) {
    if (!dateStr) return "--";
    return formatDateShort(dateStr);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return formatDateSafe(dateStr);
  }

  function getUserName(
    user: { id: string; full_name: string; email: string } | null | undefined
  ): string {
    if (!user) return t("unassigned");
    return user.full_name || user.email || t("unknown");
  }

  return (
    <div className="safety-page">
      {/* Header */}
      <div className="safety-header">
        <div>
          <h2>{t("safety")}</h2>
          <p className="safety-header-sub">
            {t("safetyManagementDashboard")}
          </p>
        </div>
        <div className="safety-header-actions">
          <Link href="/safety/incidents" className="btn-secondary">
            <AlertTriangle size={16} />
            {t("viewIncidents")}
          </Link>
          <Link href="/safety/inspections" className="btn-secondary">
            <ShieldCheck size={16} />
            {t("inspections")}
          </Link>
          <Link href="/safety/toolbox-talks" className="btn-secondary">
            <ClipboardList size={16} />
            {t("toolboxTalks")}
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="safety-stats">
        <div className="safety-stat-card stat-total">
          <div className="safety-stat-icon">
            <ShieldCheck size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.total}</span>
            <span className="safety-stat-label">{t("totalIncidentsYtd")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-reported">
          <div className="safety-stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.reported}</span>
            <span className="safety-stat-label">{t("statusReported")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-investigating">
          <div className="safety-stat-icon">
            <SearchIcon size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.investigating}</span>
            <span className="safety-stat-label">{t("statusInvestigating")}</span>
          </div>
        </div>
        <div className="safety-stat-card stat-closed">
          <div className="safety-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.closed}</span>
            <span className="safety-stat-label">{t("statusClosed")}</span>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="safety-section">
        <div className="safety-section-header">
          <h3>{t("recentIncidents")}</h3>
          <Link href="/safety/incidents" className="safety-section-link">
            {t("viewAll")} <ArrowRight size={14} />
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="safety-empty">
            <div className="safety-empty-icon">
              <ShieldCheck size={28} />
            </div>
            <h3>{t("noIncidentsReported")}</h3>
            <p>{t("noIncidentsReportedDesc")}</p>
          </div>
        ) : (
          <div className="safety-table-wrap">
            <table className="safety-table">
              <thead>
                <tr>
                  <th>{t("incidentNumber")}</th>
                  <th>{t("title")}</th>
                  <th>{t("type")}</th>
                  <th>{t("severity")}</th>
                  <th>{t("status")}</th>
                  <th>{t("reportedBy")}</th>
                  <th>{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="safety-table-row"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <td className="safety-number-cell">{incident.incident_number}</td>
                    <td className="safety-title-cell">{incident.title}</td>
                    <td className="safety-type-cell">
                      {TYPE_LABELS[incident.incident_type] ?? incident.incident_type}
                    </td>
                    <td>
                      <span className={`safety-severity-badge severity-${incident.severity}`}>
                        {SEVERITY_LABELS[incident.severity] ?? incident.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`safety-status-badge status-${incident.status}`}>
                        {STATUS_LABELS[incident.status] ?? incident.status}
                      </span>
                    </td>
                    <td className="safety-person-cell">
                      {getUserName(incident.reporter)}
                    </td>
                    <td className="safety-date-cell">
                      {formatDateShort(incident.incident_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Toolbox Talks */}
      <div className="safety-section">
        <div className="safety-section-header">
          <h3>{t("recentToolboxTalks")}</h3>
          <Link href="/safety/toolbox-talks" className="safety-section-link">
            {t("viewAll")} <ArrowRight size={14} />
          </Link>
        </div>

        {toolboxTalks.length === 0 ? (
          <div className="safety-empty">
            <div className="safety-empty-icon">
              <ClipboardList size={28} />
            </div>
            <h3>{t("noToolboxTalksYet")}</h3>
            <p>{t("noToolboxTalksYetDesc")}</p>
          </div>
        ) : (
          <div className="safety-table-wrap">
            <table className="safety-table">
              <thead>
                <tr>
                  <th>{t("talkNumber")}</th>
                  <th>{t("title")}</th>
                  <th>{t("topic")}</th>
                  <th>{t("status")}</th>
                  <th>{t("conductedBy")}</th>
                  <th>{t("date")}</th>
                  <th>{t("attendees")}</th>
                </tr>
              </thead>
              <tbody>
                {toolboxTalks.map((talk) => (
                  <tr
                    key={talk.id}
                    className="safety-table-row"
                    onClick={() => setSelectedTalk(talk)}
                  >
                    <td className="safety-number-cell">{talk.talk_number}</td>
                    <td className="safety-title-cell">{talk.title}</td>
                    <td className="safety-type-cell">{getTopicLabel(talk.topic)}</td>
                    <td>
                      <span className={`safety-status-badge status-${talk.status}`}>
                        {TALK_STATUS_LABELS[talk.status] ?? talk.status}
                      </span>
                    </td>
                    <td className="safety-person-cell">
                      {getUserName(talk.conductor)}
                    </td>
                    <td className="safety-date-cell">
                      {formatDateShort(talk.scheduled_date || talk.conducted_date)}
                    </td>
                    <td className="safety-attendees-cell">
                      {talk.attendee_count || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="safety-modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>{selectedIncident.incident_number}</h3>
              <button
                className="safety-modal-close"
                onClick={() => setSelectedIncident(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "1.25rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("title")}</label>
                  <div className="detail-value">{selectedIncident.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("status")}</label>
                  <div className="detail-value">
                    <span className={`safety-status-badge status-${selectedIncident.status}`}>
                      {STATUS_LABELS[selectedIncident.status] ?? selectedIncident.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("type")}</label>
                  <div className="detail-value">
                    {TYPE_LABELS[selectedIncident.incident_type] ?? selectedIncident.incident_type}
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("severity")}</label>
                  <div className="detail-value">
                    <span className={`safety-severity-badge severity-${selectedIncident.severity}`}>
                      {SEVERITY_LABELS[selectedIncident.severity] ?? selectedIncident.severity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("date")}</label>
                  <div className="detail-value">{formatDate(selectedIncident.incident_date)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("reportedBy")}</label>
                  <div className="detail-value">{getUserName(selectedIncident.reporter)}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("project")}</label>
                  <div className="detail-value">{selectedIncident.project?.name || "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("location")}</label>
                  <div className="detail-value">{selectedIncident.location || "--"}</div>
                </div>
              </div>

              {selectedIncident.description && (
                <div className="detail-group">
                  <label className="detail-label">{t("description")}</label>
                  <div className="detail-value--multiline">{selectedIncident.description}</div>
                </div>
              )}

              {selectedIncident.corrective_actions && (
                <div className="detail-group">
                  <label className="detail-label">{t("correctiveActions")}</label>
                  <div className="detail-value--multiline">{selectedIncident.corrective_actions}</div>
                </div>
              )}

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedIncident(null)}
                >
                  {t("close")}
                </button>
                <Link href="/safety/incidents" className="btn-primary">
                  {t("viewAllIncidents")}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbox Talk Detail Modal */}
      {selectedTalk && (
        <div className="safety-modal-overlay" onClick={() => setSelectedTalk(null)}>
          <div className="safety-modal" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h3>{selectedTalk.talk_number}</h3>
              <button
                className="safety-modal-close"
                onClick={() => setSelectedTalk(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "1.25rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("title")}</label>
                  <div className="detail-value">{selectedTalk.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("status")}</label>
                  <div className="detail-value">
                    <span className={`safety-status-badge status-${selectedTalk.status}`}>
                      {TALK_STATUS_LABELS[selectedTalk.status] ?? selectedTalk.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("topic")}</label>
                  <div className="detail-value">{getTopicLabel(selectedTalk.topic)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("scheduledDate")}</label>
                  <div className="detail-value">{formatDate(selectedTalk.scheduled_date || selectedTalk.conducted_date)}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("conductedBy")}</label>
                  <div className="detail-value">{getUserName(selectedTalk.conductor)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("project")}</label>
                  <div className="detail-value">{selectedTalk.project?.name || "--"}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("attendees")}</label>
                  <div className="detail-value">{selectedTalk.attendee_count || 0}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("created")}</label>
                  <div className="detail-value">{formatDate(selectedTalk.created_at)}</div>
                </div>
              </div>

              {selectedTalk.description && (
                <div className="detail-group">
                  <label className="detail-label">{t("description")}</label>
                  <div className="detail-value--multiline">{selectedTalk.description}</div>
                </div>
              )}

              {selectedTalk.notes && (
                <div className="detail-group">
                  <label className="detail-label">{t("notes")}</label>
                  <div className="detail-value--multiline">{selectedTalk.notes}</div>
                </div>
              )}

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedTalk(null)}
                >
                  {t("close")}
                </button>
                <Link href="/safety/toolbox-talks" className="btn-primary">
                  {t("viewAllTalks")}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
