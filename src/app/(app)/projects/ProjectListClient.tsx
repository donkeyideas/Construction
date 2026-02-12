"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  LayoutGrid,
  List,
  HardHat,
} from "lucide-react";
import type { ProjectRow } from "@/lib/queries/projects";

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  pre_construction: "Pre-Construction",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  closed: "Closed",
};

function formatCurrency(amount: number | null) {
  if (amount == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function completionClass(pct: number) {
  if (pct >= 75) return "high";
  if (pct <= 25) return "low";
  return "";
}

interface ProjectListClientProps {
  projects: ProjectRow[];
}

export default function ProjectListClient({ projects }: ProjectListClientProps) {
  const [view, setView] = useState<"card" | "list">("card");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = projects;

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term)
      );
    }

    return result;
  }, [projects, statusFilter, search]);

  return (
    <>
      {/* Filters */}
      <div className="projects-filters">
        <div className="projects-search">
          <Search size={16} className="projects-search-icon" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="status-filters">
          {Object.keys(STATUS_LABELS).map((key) => (
            <button
              key={key}
              className={`status-filter-btn ${statusFilter === key ? "active" : ""}`}
              onClick={() => setStatusFilter(key)}
            >
              {STATUS_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === "card" ? "active" : ""}`}
            onClick={() => setView("card")}
            title="Card view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`view-toggle-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="projects-empty">
          <div className="projects-empty-icon">
            <HardHat size={28} />
          </div>
          {projects.length === 0 ? (
            <>
              <h3>No projects yet</h3>
              <p>Create your first project to get started.</p>
              <Link href="/projects/new" className="btn-primary">
                New Project
              </Link>
            </>
          ) : (
            <>
              <h3>No matching projects</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      )}

      {/* Card View */}
      {filtered.length > 0 && view === "card" && (
        <div className="projects-grid">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="project-card"
            >
              <div className="project-card-header">
                <div>
                  <div className="project-card-name">{project.name}</div>
                  <div className="project-card-code">{project.code}</div>
                </div>
                <span className={`badge badge-${project.status}`}>
                  {statusLabel(project.status)}
                </span>
              </div>

              {project.client_name && (
                <div className="project-card-client">{project.client_name}</div>
              )}

              <div className="project-card-row">
                <span className="project-card-amount">
                  {formatCurrency(project.contract_amount)}
                </span>
                <span className="project-card-dates">
                  {formatDate(project.start_date)} - {formatDate(project.estimated_end_date)}
                </span>
              </div>

              <div>
                <div className="completion-bar">
                  <div
                    className={`completion-bar-fill ${completionClass(project.completion_pct)}`}
                    style={{ width: `${project.completion_pct}%` }}
                  />
                </div>
                <div className="completion-info">
                  <span>{project.completion_pct}% complete</span>
                  {project.project_manager?.full_name && (
                    <span>PM: {project.project_manager.full_name}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* List View */}
      {filtered.length > 0 && view === "list" && (
        <div className="projects-table-wrap">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Client</th>
                <th>Status</th>
                <th>Contract Value</th>
                <th>Completion</th>
                <th>PM</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id}>
                  <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                    {project.code}
                  </td>
                  <td className="project-name-cell">
                    <Link href={`/projects/${project.id}`}>{project.name}</Link>
                  </td>
                  <td>{project.client_name ?? "--"}</td>
                  <td>
                    <span className={`badge badge-${project.status}`}>
                      {statusLabel(project.status)}
                    </span>
                  </td>
                  <td className="amount-cell">
                    {formatCurrency(project.contract_amount)}
                  </td>
                  <td>
                    <div className="table-completion-bar">
                      <div className="completion-bar">
                        <div
                          className={`completion-bar-fill ${completionClass(project.completion_pct)}`}
                          style={{ width: `${project.completion_pct}%` }}
                        />
                      </div>
                      <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {project.completion_pct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: "0.82rem" }}>
                    {project.project_manager?.full_name ?? "--"}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                    {formatDate(project.estimated_end_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
