"use client";

import { useState } from "react";
import Link from "next/link";
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
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  investigating: "Investigating",
  corrective_action: "Corrective Action",
  closed: "Closed",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const TYPE_LABELS: Record<string, string> = {
  near_miss: "Near Miss",
  first_aid: "First Aid",
  recordable: "Recordable",
  lost_time: "Lost Time",
  fatality: "Fatality",
  property_damage: "Property Damage",
};

const TALK_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "Unassigned";
  return user.full_name || user.email || "Unknown";
}

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
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncidentRow | null>(null);
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalkRow | null>(null);

  return (
    <div className="safety-page">
      {/* Header */}
      <div className="safety-header">
        <div>
          <h2>Safety</h2>
          <p className="safety-header-sub">
            Safety management dashboard
          </p>
        </div>
        <div className="safety-header-actions">
          <Link href="/safety/incidents" className="btn-secondary">
            <AlertTriangle size={16} />
            View Incidents
          </Link>
          <Link href="/safety/inspections" className="btn-secondary">
            <ShieldCheck size={16} />
            Inspections
          </Link>
          <Link href="/safety/toolbox-talks" className="btn-secondary">
            <ClipboardList size={16} />
            Toolbox Talks
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
            <span className="safety-stat-label">Total Incidents (YTD)</span>
          </div>
        </div>
        <div className="safety-stat-card stat-reported">
          <div className="safety-stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.reported}</span>
            <span className="safety-stat-label">Reported</span>
          </div>
        </div>
        <div className="safety-stat-card stat-investigating">
          <div className="safety-stat-icon">
            <SearchIcon size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.investigating}</span>
            <span className="safety-stat-label">Investigating</span>
          </div>
        </div>
        <div className="safety-stat-card stat-closed">
          <div className="safety-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="safety-stat-info">
            <span className="safety-stat-value">{stats.closed}</span>
            <span className="safety-stat-label">Closed</span>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="safety-section">
        <div className="safety-section-header">
          <h3>Recent Incidents</h3>
          <Link href="/safety/incidents" className="safety-section-link">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="safety-empty">
            <div className="safety-empty-icon">
              <ShieldCheck size={28} />
            </div>
            <h3>No incidents reported</h3>
            <p>Great news! No safety incidents have been reported yet.</p>
          </div>
        ) : (
          <div className="safety-table-wrap">
            <table className="safety-table">
              <thead>
                <tr>
                  <th>Incident #</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported By</th>
                  <th>Date</th>
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
          <h3>Recent Toolbox Talks</h3>
          <Link href="/safety/toolbox-talks" className="safety-section-link">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {toolboxTalks.length === 0 ? (
          <div className="safety-empty">
            <div className="safety-empty-icon">
              <ClipboardList size={28} />
            </div>
            <h3>No toolbox talks yet</h3>
            <p>Schedule your first toolbox talk to get started.</p>
          </div>
        ) : (
          <div className="safety-table-wrap">
            <table className="safety-table">
              <thead>
                <tr>
                  <th>Talk #</th>
                  <th>Title</th>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Conducted By</th>
                  <th>Date</th>
                  <th>Attendees</th>
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
                      {formatDateShort(talk.scheduled_date)}
                    </td>
                    <td className="safety-attendees-cell">
                      {talk.attendees_count || 0}
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
                  <label className="detail-label">Title</label>
                  <div className="detail-value">{selectedIncident.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Status</label>
                  <div className="detail-value">
                    <span className={`safety-status-badge status-${selectedIncident.status}`}>
                      {STATUS_LABELS[selectedIncident.status] ?? selectedIncident.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">Type</label>
                  <div className="detail-value">
                    {TYPE_LABELS[selectedIncident.incident_type] ?? selectedIncident.incident_type}
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Severity</label>
                  <div className="detail-value">
                    <span className={`safety-severity-badge severity-${selectedIncident.severity}`}>
                      {SEVERITY_LABELS[selectedIncident.severity] ?? selectedIncident.severity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">Date</label>
                  <div className="detail-value">{formatDate(selectedIncident.incident_date)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Reported By</label>
                  <div className="detail-value">{getUserName(selectedIncident.reporter)}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">Project</label>
                  <div className="detail-value">{selectedIncident.project?.name || "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Location</label>
                  <div className="detail-value">{selectedIncident.location || "--"}</div>
                </div>
              </div>

              {selectedIncident.description && (
                <div className="detail-group">
                  <label className="detail-label">Description</label>
                  <div className="detail-value--multiline">{selectedIncident.description}</div>
                </div>
              )}

              {selectedIncident.corrective_actions && (
                <div className="detail-group">
                  <label className="detail-label">Corrective Actions</label>
                  <div className="detail-value--multiline">{selectedIncident.corrective_actions}</div>
                </div>
              )}

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedIncident(null)}
                >
                  Close
                </button>
                <Link href="/safety/incidents" className="btn-primary">
                  View All Incidents
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
                  <label className="detail-label">Title</label>
                  <div className="detail-value">{selectedTalk.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Status</label>
                  <div className="detail-value">
                    <span className={`safety-status-badge status-${selectedTalk.status}`}>
                      {TALK_STATUS_LABELS[selectedTalk.status] ?? selectedTalk.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">Topic</label>
                  <div className="detail-value">{getTopicLabel(selectedTalk.topic)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Scheduled Date</label>
                  <div className="detail-value">{formatDate(selectedTalk.scheduled_date)}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">Conducted By</label>
                  <div className="detail-value">{getUserName(selectedTalk.conductor)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Project</label>
                  <div className="detail-value">{selectedTalk.project?.name || "--"}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">Attendees</label>
                  <div className="detail-value">{selectedTalk.attendees_count || 0}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Created</label>
                  <div className="detail-value">{formatDate(selectedTalk.created_at)}</div>
                </div>
              </div>

              {selectedTalk.description && (
                <div className="detail-group">
                  <label className="detail-label">Description</label>
                  <div className="detail-value--multiline">{selectedTalk.description}</div>
                </div>
              )}

              {selectedTalk.notes && (
                <div className="detail-group">
                  <label className="detail-label">Notes</label>
                  <div className="detail-value--multiline">{selectedTalk.notes}</div>
                </div>
              )}

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedTalk(null)}
                >
                  Close
                </button>
                <Link href="/safety/toolbox-talks" className="btn-primary">
                  View All Talks
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
