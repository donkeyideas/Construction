"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  LayoutGrid,
  List,
  HardHat,
  Upload,
  Plus,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type { ProjectRow } from "@/lib/queries/projects";

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Project Name", required: true },
  { key: "code", label: "Project Code", required: false },
  { key: "status", label: "Status", required: false },
  { key: "project_type", label: "Project Type", required: false },
  { key: "address", label: "Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "ZIP", required: false },
  { key: "client_name", label: "Client Name", required: false },
  { key: "client_email", label: "Client Email", required: false },
  { key: "client_phone", label: "Client Phone", required: false },
  { key: "budget", label: "Budget ($)", required: false, type: "number" },
  { key: "estimated_cost", label: "Estimated Cost ($)", required: false, type: "number" },
  { key: "start_date", label: "Start Date", required: false, type: "date" },
  { key: "end_date", label: "End Date", required: false, type: "date" },
  { key: "description", label: "Description", required: false },
  { key: "completion_pct", label: "Completion %", required: false, type: "number" },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { name: "Downtown Office Tower", code: "DOT-001", status: "active", project_type: "commercial", address: "123 Main St", city: "Dallas", state: "TX", zip: "75201", client_name: "Metro Properties LLC", client_email: "info@metro.com", client_phone: "214-555-0100", budget: "5000000", estimated_cost: "4800000", start_date: "2026-01-01", end_date: "2027-06-30", description: "12-story office tower renovation", completion_pct: "25" },
  { name: "Riverside Apartments", code: "RSA-002", status: "pre_construction", project_type: "residential", address: "456 River Rd", city: "Austin", state: "TX", zip: "78741", client_name: "Riverside Dev Corp", client_email: "dev@riverside.com", client_phone: "512-555-0200", budget: "12000000", estimated_cost: "11500000", start_date: "2026-04-01", end_date: "2028-03-31", description: "200-unit luxury apartment complex", completion_pct: "0" },
];

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
  const router = useRouter();
  const [view, setView] = useState<"card" | "list">("card");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "projects", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

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
      {/* Header */}
      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p className="projects-header-sub">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in your portfolio
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <Link href="/projects/new" className="btn-primary">
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </div>

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

      {showImport && (
        <ImportModal
          entityName="Projects"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
}
