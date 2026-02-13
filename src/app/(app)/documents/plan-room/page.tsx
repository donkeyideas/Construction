import Link from "next/link";
import {
  Map,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Ruler,
  FolderOpen,
  HardDrive,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export const metadata = {
  title: "Plan Room - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    project?: string;
  }>;
}

/* ------------------------------------------------------------------
   File helpers
   ------------------------------------------------------------------ */

function getFileIcon(fileType: string) {
  const ext = (fileType ?? "").toLowerCase();
  if (ext.includes("pdf")) return <FileText size={20} />;
  if (ext.includes("image") || ext.includes("jpg") || ext.includes("jpeg") || ext.includes("png"))
    return <Image size={20} />;
  if (ext.includes("spreadsheet") || ext.includes("xlsx") || ext.includes("csv"))
    return <FileSpreadsheet size={20} />;
  if (ext.includes("dwg") || ext.includes("cad") || ext.includes("dxf"))
    return <Ruler size={20} />;
  return <File size={20} />;
}

function getFileIconClass(fileType: string): string {
  const ext = (fileType ?? "").toLowerCase();
  if (ext.includes("pdf")) return "file-icon file-icon-pdf";
  if (ext.includes("image") || ext.includes("jpg") || ext.includes("jpeg") || ext.includes("png"))
    return "file-icon file-icon-img";
  if (ext.includes("spreadsheet") || ext.includes("xlsx") || ext.includes("csv"))
    return "file-icon file-icon-xls";
  if (ext.includes("dwg") || ext.includes("cad") || ext.includes("dxf"))
    return "file-icon file-icon-dwg";
  return "file-icon file-icon-default";
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatTotalSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* ------------------------------------------------------------------
   Page Component
   ------------------------------------------------------------------ */

export default async function PlanRoomPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Map size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access the plan room.</div>
      </div>
    );
  }

  const { companyId } = userCompany;
  const activeProject = params.project || "all";

  // Fetch plan and spec documents with project info and uploader
  let query = supabase
    .from("documents")
    .select("*, projects:project_id(id, name), uploader:uploaded_by(full_name, email)")
    .eq("company_id", companyId)
    .in("category", ["plan", "spec"])
    .order("created_at", { ascending: false });

  if (activeProject !== "all") {
    query = query.eq("project_id", activeProject);
  }

  const [{ data: documents }, { data: allDocsRaw }] = await Promise.all([
    query,
    supabase
      .from("documents")
      .select("id, category, file_size, project_id")
      .eq("company_id", companyId)
      .in("category", ["plan", "spec"]),
  ]);

  const allDocs = documents ?? [];
  const allForKpis = allDocsRaw ?? [];

  // KPIs (from full unfiltered set)
  const totalPlans = allForKpis.filter((d) => d.category === "plan").length;
  const totalSpecs = allForKpis.filter((d) => d.category === "spec").length;
  const totalFileSize = allForKpis.reduce((sum, d) => sum + (d.file_size ?? 0), 0);

  // Get unique projects for filter tabs
  const projectIds = [...new Set(allForKpis.map((d) => d.project_id).filter(Boolean))];
  let projectList: { id: string; name: string }[] = [];
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds)
      .order("name");
    projectList = projects ?? [];
  }

  // Group documents by project
  type DocWithProject = (typeof allDocs)[number];
  const grouped: Record<string, { projectName: string; docs: DocWithProject[] }> = {};
  const ungrouped: DocWithProject[] = [];

  for (const doc of allDocs) {
    const project = doc.projects as { id: string; name: string } | null;
    if (project) {
      if (!grouped[project.id]) {
        grouped[project.id] = { projectName: project.name, docs: [] };
      }
      grouped[project.id].docs.push(doc);
    } else {
      ungrouped.push(doc);
    }
  }

  // Sort groups by project name
  const sortedGroups = Object.entries(grouped).sort((a, b) =>
    a[1].projectName.localeCompare(b[1].projectName)
  );

  function buildUrl(projectId: string): string {
    if (projectId === "all") return "/documents/plan-room";
    return `/documents/plan-room?project=${projectId}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Plan Room</h2>
          <p className="fin-header-sub">
            View and manage construction drawings, blueprints, and specifications
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Map size={18} />
          </div>
          <span className="fin-kpi-label">Total Plans</span>
          <span className="fin-kpi-value">{totalPlans}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <FileText size={18} />
          </div>
          <span className="fin-kpi-label">Total Specs</span>
          <span className="fin-kpi-value">{totalSpecs}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <HardDrive size={18} />
          </div>
          <span className="fin-kpi-label">Total File Size</span>
          <span className="fin-kpi-value">{formatTotalSize(totalFileSize)}</span>
        </div>
      </div>

      {/* Project Filter Tabs */}
      {projectList.length > 0 && (
        <div className="fin-filters">
          <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
            Project:
          </label>
          <Link
            href={buildUrl("all")}
            className={`ui-btn ui-btn-sm ${
              activeProject === "all" ? "ui-btn-primary" : "ui-btn-outline"
            }`}
          >
            All Projects
          </Link>
          {projectList.map((p) => (
            <Link
              key={p.id}
              href={buildUrl(p.id)}
              className={`ui-btn ui-btn-sm ${
                activeProject === p.id ? "ui-btn-primary" : "ui-btn-outline"
              }`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {/* Document Grid, grouped by project */}
      {allDocs.length > 0 ? (
        <div>
          {sortedGroups.map(([projectId, group]) => (
            <div key={projectId} style={{ marginBottom: "24px" }}>
              <div style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--text)",
              }}>
                <FolderOpen size={18} style={{ color: "var(--color-blue)" }} />
                {group.projectName}
                <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>
                  ({group.docs.length} document{group.docs.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="doc-grid">
                {group.docs.map((doc) => (
                  <PlanCard key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--text)",
              }}>
                <FolderOpen size={18} style={{ color: "var(--muted)" }} />
                Unassigned
                <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>
                  ({ungrouped.length} document{ungrouped.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="doc-grid">
                {ungrouped.map((doc) => (
                  <PlanCard key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <Map size={48} />
            </div>
            <div className="fin-empty-title">No Plans or Specs Found</div>
            <div className="fin-empty-desc">
              {activeProject !== "all"
                ? "No plans or specifications found for this project. Try selecting a different project."
                : "Upload construction plans and specifications to view them here. Supported formats include PDF, DWG, and image files."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Plan Document Card
   ------------------------------------------------------------------ */

function PlanCard({ doc }: { doc: Record<string, unknown> }) {
  const uploaderData = doc.uploader as { full_name: string; email: string } | null;
  const uploaderName = uploaderData?.full_name ?? uploaderData?.email ?? "Unknown";
  const fileType = (doc.file_type as string) ?? "";
  const category = (doc.category as string) ?? "";

  return (
    <div className="doc-card">
      <div className="doc-card-header">
        <div className={getFileIconClass(fileType)}>
          {getFileIcon(fileType)}
        </div>
        <div className="doc-card-info">
          <div className="doc-card-name">{doc.name as string}</div>
          <div className="doc-card-meta">
            {formatFileSize((doc.file_size as number) ?? 0)}
            {(doc.version as number) > 1 && <span> -- v{doc.version as number}</span>}
          </div>
        </div>
      </div>

      <div className="doc-card-details">
        <div className="doc-card-detail">
          <span className="doc-card-label">Type</span>
          <span>{fileType || "--"}</span>
        </div>
        <div className="doc-card-detail">
          <span className="doc-card-label">Uploaded by</span>
          <span>{uploaderName}</span>
        </div>
        <div className="doc-card-detail">
          <span className="doc-card-label">Date</span>
          <span>
            {doc.created_at
              ? new Date(doc.created_at as string).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "--"}
          </span>
        </div>
        {(doc.version as number) > 1 && (
          <div className="doc-card-detail">
            <span className="doc-card-label">Version</span>
            <span>v{doc.version as number}</span>
          </div>
        )}
      </div>

      <div className="doc-card-footer">
        <span
          className={
            category === "plan" ? "badge badge-blue" : "badge badge-amber"
          }
        >
          {category === "plan" ? "Plan" : "Specification"}
        </span>
      </div>
    </div>
  );
}
