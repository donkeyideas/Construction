"use client";

import { useState, useMemo } from "react";
import { Search, ClipboardCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Inspection {
  id: string;
  company_id: string;
  project_id: string | null;
  inspection_date: string | null;
  inspector_id: string | null;
  inspection_type: string | null;
  score: number | null;
  checklist: unknown;
  findings: string | null;
  corrective_actions: string | null;
  status: string | null;
  created_at: string | null;
  projects?: { name: string } | null;
}

type StatusValue = "scheduled" | "in_progress" | "completed" | "failed" | "cancelled";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const TYPE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  pre_task: "Pre-Task",
  site_safety: "Site Safety",
  equipment: "Equipment",
  fire_safety: "Fire Safety",
  electrical: "Electrical",
  scaffolding: "Scaffolding",
  excavation: "Excavation",
  ppe: "PPE",
  housekeeping: "Housekeeping",
  fall_protection: "Fall Protection",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getScoreClass(score: number | null): string {
  if (score === null || score === undefined) return "score-none";
  if (score > 90) return "score-green";
  if (score >= 80) return "score-yellow";
  return "score-red";
}

function getStatusClass(status: string | null): string {
  if (!status) return "";
  return `status-${status}`;
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return "--";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InspectionsClientProps {
  inspections: Inspection[];
}

export default function InspectionsClient({
  inspections,
}: InspectionsClientProps) {
  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusValue | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  // Derive available types from data
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    inspections.forEach((i) => {
      if (i.inspection_type) types.add(i.inspection_type);
    });
    return Array.from(types).sort();
  }, [inspections]);

  // Filtered inspections
  const filtered = useMemo(() => {
    let result = inspections;

    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((i) => i.inspection_type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (i) =>
          (i.findings && i.findings.toLowerCase().includes(term)) ||
          (i.corrective_actions && i.corrective_actions.toLowerCase().includes(term)) ||
          (i.inspection_type && i.inspection_type.toLowerCase().includes(term)) ||
          (i.projects?.name && i.projects.name.toLowerCase().includes(term))
      );
    }

    return result;
  }, [inspections, statusFilter, typeFilter, search]);

  return (
    <div className="safety-page">
      {/* Header */}
      <div className="safety-header">
        <div>
          <h2>
            Safety Inspections{" "}
            <span
              className="safety-status-badge status-scheduled"
              style={{ fontSize: "0.85rem", verticalAlign: "middle" }}
            >
              {inspections.length}
            </span>
          </h2>
          <p className="safety-header-sub">
            {inspections.length} inspection{inspections.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="safety-filters">
        <div className="safety-search">
          <Search size={16} className="safety-search-icon" />
          <input
            type="text"
            placeholder="Search inspections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="safety-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusValue | "all")}
        >
          <option value="all">All Status</option>
          {Object.keys(STATUS_LABELS).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="safety-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="safety-empty">
          <div className="safety-empty-icon">
            <ClipboardCheck size={28} />
          </div>
          {inspections.length === 0 ? (
            <>
              <h3>No inspections recorded</h3>
              <p>Safety inspections will appear here once they are created.</p>
            </>
          ) : (
            <>
              <h3>No matching inspections</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="safety-table-wrap">
          <table className="safety-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Type</th>
                <th>Score</th>
                <th>Findings</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inspection) => (
                <tr key={inspection.id} className="safety-table-row">
                  <td className="safety-date-cell">
                    {formatDate(inspection.inspection_date)}
                  </td>
                  <td className="safety-project-cell">
                    {inspection.projects?.name || "--"}
                  </td>
                  <td className="safety-type-cell">
                    {TYPE_LABELS[inspection.inspection_type ?? ""] ??
                      inspection.inspection_type ??
                      "--"}
                  </td>
                  <td>
                    <span
                      className={`safety-severity-badge ${getScoreClass(inspection.score)}`}
                    >
                      {inspection.score !== null && inspection.score !== undefined
                        ? `${inspection.score}%`
                        : "--"}
                    </span>
                  </td>
                  <td className="safety-title-cell">
                    {truncate(inspection.findings, 60)}
                  </td>
                  <td>
                    <span
                      className={`safety-status-badge ${getStatusClass(inspection.status)}`}
                    >
                      {STATUS_LABELS[inspection.status ?? ""] ??
                        inspection.status ??
                        "--"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
