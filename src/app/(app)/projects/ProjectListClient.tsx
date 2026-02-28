"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  LayoutGrid,
  List,
  HardHat,
  Upload,
  Plus,
  Users,
  X,
  CheckSquare,
  Trash2,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type { ProjectRow } from "@/lib/queries/projects";
import { formatDateSafe, toDateStr } from "@/lib/utils/format";

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

function completionClass(pct: number) {
  if (pct >= 75) return "high";
  if (pct <= 25) return "low";
  return "";
}

interface MemberOption {
  id: string;
  name: string;
  role: string;
}

interface ProjectListClientProps {
  projects: ProjectRow[];
  memberOptions: MemberOption[];
}

export default function ProjectListClient({ projects, memberOptions }: ProjectListClientProps) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();
  const [view, setView] = useState<"card" | "list">("card");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  // Bulk-assign state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkField, setBulkField] = useState<"project_manager_id" | "superintendent_id">("project_manager_id");
  const [bulkUserId, setBulkUserId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Delete project
  const [deleteProject, setDeleteProject] = useState<ProjectRow | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    all: t("statusAll"),
    pre_construction: t("statusPreConstruction"),
    active: t("statusActive"),
    on_hold: t("statusOnHold"),
    completed: t("statusCompleted"),
    closed: t("statusClosed"),
  };

  function formatCurrency(amount: number | null) {
    if (amount == null) return "--";
    return new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return formatDateSafe(toDateStr(date));
  }

  function statusLabel(status: string) {
    return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkAssign() {
    if (!bulkUserId || selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const res = await fetch("/api/projects/bulk-assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectIds: Array.from(selectedIds),
          field: bulkField,
          userId: bulkUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("bulkAssignFailed"));
      setShowBulkAssign(false);
      setSelectedIds(new Set());
      setBulkUserId("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("bulkAssignFailed"));
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "projects", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  async function handleDeleteProject() {
    if (!deleteProject) return;
    setDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${deleteProject.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteProject(null);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete project.");
      }
    } catch {
      alert("Failed to delete project.");
    } finally {
      setDeletingProject(false);
    }
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
          <h2>{t("title")}</h2>
          <p className="projects-header-sub">
            {t("projectCount", { count: projects.length })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <Link href="/projects/new" className="btn-primary">
            <Plus size={16} />
            {t("newProject")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="projects-filters">
        <div className="projects-search">
          <Search size={16} className="projects-search-icon" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
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
            title={t("cardView")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`view-toggle-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            title={t("listView")}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Bulk-assign toolbar */}
      {selectedIds.size > 0 && (
        <div className="bulk-toolbar">
          <div className="bulk-toolbar-left">
            <CheckSquare size={16} />
            <span>{t("projectsSelected", { count: selectedIds.size })}</span>
            <button className="bulk-toolbar-clear" onClick={clearSelection}>
              <X size={14} /> {t("clear")}
            </button>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowBulkAssign(true)}
          >
            <Users size={16} />
            {t("assignPmSuperintendent")}
          </button>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="projects-empty">
          <div className="projects-empty-icon">
            <HardHat size={28} />
          </div>
          {projects.length === 0 ? (
            <>
              <h3>{t("noProjectsYet")}</h3>
              <p>{t("createFirstProject")}</p>
              <Link href="/projects/new" className="btn-primary">
                {t("newProject")}
              </Link>
            </>
          ) : (
            <>
              <h3>{t("noMatchingProjects")}</h3>
              <p>{t("adjustSearchOrFilter")}</p>
            </>
          )}
        </div>
      )}

      {/* Card View */}
      {filtered.length > 0 && view === "card" && (
        <div className="projects-grid">
          {filtered.map((project) => (
              <div key={project.id} className="project-card" style={{ position: "relative" }}>
                {/* Delete button */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteProject(project); }}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--muted)", padding: "4px", borderRadius: "4px",
                    display: "flex", alignItems: "center",
                  }}
                  title="Delete project"
                >
                  <Trash2 size={14} />
                </button>
                <Link href={`/projects/${project.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="project-card-header" style={{ paddingRight: 28 }}>
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
                    <span>{t("percentComplete", { pct: project.completion_pct })}</span>
                    {project.project_manager?.full_name && (
                      <span>{t("pmLabel", { name: project.project_manager.full_name })}</span>
                    )}
                  </div>
                </div>
                </Link>
              </div>
          ))}
        </div>
      )}

      {/* List View */}
      {filtered.length > 0 && view === "list" && (
        <div className="projects-table-wrap">
          <table className="projects-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>{t("columnCode")}</th>
                <th>{t("columnName")}</th>
                <th>{t("columnClient")}</th>
                <th>{t("columnStatus")}</th>
                <th>{t("columnContractValue")}</th>
                <th>{t("columnCompletion")}</th>
                <th>{t("columnPm")}</th>
                <th>{t("columnEndDate")}</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id} className={selectedIds.has(project.id) ? "row-selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(project.id)}
                      onChange={() => toggleSelect(project.id)}
                    />
                  </td>
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
                  <td>
                    <button
                      onClick={() => setDeleteProject(project)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px", display: "flex", alignItems: "center" }}
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Project Confirmation */}
      {deleteProject && (
        <div className="modal-overlay" onClick={() => setDeleteProject(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Project</h3>
              <button className="modal-close" onClick={() => setDeleteProject(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "0.88rem", marginBottom: 12 }}>
                Are you sure you want to delete <strong>{deleteProject.name}</strong>?
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--color-red)" }}>
                This will permanently delete the project and all associated data. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteProject(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--color-red)", border: "none" }}
                onClick={handleDeleteProject}
                disabled={deletingProject}
              >
                <Trash2 size={14} />
                {deletingProject ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("title")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="modal-overlay" onClick={() => setShowBulkAssign(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("bulkAssignTitle", { count: selectedIds.size })}</h3>
              <button className="modal-close" onClick={() => setShowBulkAssign(false)}>&times;</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">{t("assignmentType")}</label>
                <select
                  className="form-select"
                  value={bulkField}
                  onChange={(e) => setBulkField(e.target.value as "project_manager_id" | "superintendent_id")}
                >
                  <option value="project_manager_id">{t("projectManager")}</option>
                  <option value="superintendent_id">{t("superintendent")}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {bulkField === "project_manager_id" ? t("projectManager") : t("superintendent")}
                </label>
                <select
                  className="form-select"
                  value={bulkUserId}
                  onChange={(e) => setBulkUserId(e.target.value)}
                >
                  <option value="">{t("selectTeamMember")}</option>
                  {memberOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bulk-assign-projects-list">
                <label className="form-label">{t("selectedProjects")}</label>
                <ul className="bulk-project-names">
                  {filtered
                    .filter((p) => selectedIds.has(p.id))
                    .map((p) => (
                      <li key={p.id}>{p.name} <span className="bulk-project-code">{p.code}</span></li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowBulkAssign(false)}>
                {t("cancel")}
              </button>
              <button
                className="btn-primary"
                disabled={!bulkUserId || bulkSaving}
                onClick={handleBulkAssign}
              >
                {bulkSaving ? t("saving") : t("assignToProjects", { count: selectedIds.size })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
