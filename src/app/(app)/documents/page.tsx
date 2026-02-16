import { redirect } from "next/navigation";
import Link from "next/link";
import { FolderOpen, Upload, Search, ChevronRight, ChevronDown, FileText, Map, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocuments, getFolderTree, getDocumentsOverview, type FolderNode } from "@/lib/queries/documents";
import { getProjects } from "@/lib/queries/projects";
import { getProperties } from "@/lib/queries/properties";
import DocumentsClient from "./DocumentsClient";
import DocCategoryChart from "@/components/charts/DocCategoryChart";
import DocUploadTrendChart from "@/components/charts/DocUploadTrendChart";

export const metadata = {
  title: "Document Library - Buildwrk",
};

const CAT_LABELS: Record<string, string> = {
  plan: "Plan", spec: "Spec", contract: "Contract",
  photo: "Photo", report: "Report", correspondence: "Corr.",
};
const CAT_COLORS: Record<string, string> = {
  plan: "badge-blue", spec: "badge-amber", contract: "badge-green",
  photo: "badge-red", report: "badge-red", correspondence: "badge-blue",
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    project?: string;
    property?: string;
    search?: string;
    folder?: string;
    upload?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;

  const [documents, folderTree, projects, properties, overview] = await Promise.all([
    getDocuments(supabase, companyId, {
      category: params.category,
      projectId: params.project,
      propertyId: params.property,
      search: params.search,
      folderPath: params.folder,
    }),
    getFolderTree(supabase, companyId),
    getProjects(supabase, companyId),
    getProperties(supabase, companyId),
    getDocumentsOverview(supabase, companyId),
  ]);

  const hasFilters = !!(params.category || params.project || params.property || params.search || params.folder);

  return (
    <div>
      {/* Header */}
      <div className="doc-header">
        <div>
          <h2>Document Library</h2>
          <p className="doc-header-sub">Manage plans, specifications, contracts, and project files.</p>
        </div>
        <div className="doc-header-actions">
          <Link href="/documents/plan-room" className="ui-btn ui-btn-secondary ui-btn-md">Plan Room</Link>
          <Link href="/documents?upload=true" className="ui-btn ui-btn-primary ui-btn-md">
            <Upload size={16} /> Upload
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Total Documents</span>
              <span className="kpi-value">{overview.totalCount}</span>
            </div>
            <div className="kpi-icon"><FileText size={20} /></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Plans & Specs</span>
              <span className="kpi-value">{overview.planSpecCount}</span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-blue)" }}><Map size={20} /></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Drawing Sets</span>
              <span className="kpi-value">{overview.drawingSetCount}</span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-blue)" }}><Layers size={20} /></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Uploads (7d)</span>
              <span className="kpi-value" style={{ color: overview.recentUploadCount > 0 ? "var(--color-green)" : undefined }}>
                {overview.recentUploadCount}
              </span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-green)" }}><Upload size={20} /></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Documents by Category</div>
          <DocCategoryChart data={overview.categoryBreakdown} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Upload Activity (12 Weeks)</div>
          <DocUploadTrendChart data={overview.weeklyUploads} />
        </div>
      </div>

      {/* Recent Uploads */}
      {overview.recentDocuments.length > 0 && (
        <div className="fin-chart-card" style={{ marginBottom: 24 }}>
          <div className="fin-chart-title">Recent Uploads</div>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr><th>Name</th><th>Category</th><th>Project</th><th>Date</th><th>Size</th></tr>
              </thead>
              <tbody>
                {overview.recentDocuments.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td>
                      <span className={`badge ${CAT_COLORS[d.category] ?? "badge-blue"}`}>
                        {CAT_LABELS[d.category] ?? d.category}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                      {d.project?.name ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.78rem" }}>
                      {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{formatFileSize(d.file_size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="doc-filters">
        <form className="doc-search-form" action="/documents" method="GET">
          <div className="doc-search-wrap">
            <Search size={16} className="doc-search-icon" />
            <input type="text" name="search" className="ui-input doc-search-input" placeholder="Search documents by name..." defaultValue={params.search ?? ""} />
          </div>
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.project && <input type="hidden" name="project" value={params.project} />}
          {params.property && <input type="hidden" name="property" value={params.property} />}
          <select name="category" className="fin-filter-select" defaultValue={params.category ?? ""}>
            <option value="">All Categories</option>
            <option value="plan">Plans</option>
            <option value="spec">Specifications</option>
            <option value="contract">Contracts</option>
            <option value="photo">Photos</option>
            <option value="report">Reports</option>
            <option value="correspondence">Correspondence</option>
          </select>
          <select name="project" className="fin-filter-select" defaultValue={params.project ?? ""}>
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select name="property" className="fin-filter-select" defaultValue={params.property ?? ""}>
            <option value="">All Properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="submit" className="ui-btn ui-btn-secondary ui-btn-sm">Filter</button>
          {hasFilters && <Link href="/documents" className="ui-btn ui-btn-ghost ui-btn-sm">Clear Filters</Link>}
        </form>
      </div>

      {/* Layout: Folder Tree + Content */}
      <div className="doc-layout">
        <aside className="folder-tree">
          <div className="folder-tree-title">Folders</div>
          <Link href="/documents" className={`folder-item ${!params.folder ? "active" : ""}`}>
            <FolderOpen size={16} /><span>All Documents</span>
          </Link>
          {folderTree.length > 0 ? (
            <FolderTreeNodes nodes={folderTree} activeFolder={params.folder} />
          ) : (
            <div className="folder-empty">No folders yet. Documents will be organized into folders as they are uploaded.</div>
          )}
        </aside>
        <div className="doc-content">
          <DocumentsClient documents={documents} hasFilters={hasFilters} currentFolder={params.folder} projects={projects} showUpload={params.upload === "true"} />
        </div>
      </div>
    </div>
  );
}

function FolderTreeNodes({ nodes, activeFolder, depth = 0 }: { nodes: FolderNode[]; activeFolder?: string; depth?: number }) {
  return (
    <>
      {nodes.map((node) => {
        const isActive = activeFolder === node.path;
        const hasChildren = node.children.length > 0;
        return (
          <div key={node.path} style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}>
            <Link href={`/documents?folder=${encodeURIComponent(node.path)}`} className={`folder-item ${isActive ? "active" : ""}`}>
              {hasChildren ? (isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14, display: "inline-block" }} />}
              <FolderOpen size={16} /><span>{node.name}</span>
            </Link>
            {hasChildren && <FolderTreeNodes nodes={node.children} activeFolder={activeFolder} depth={depth + 1} />}
          </div>
        );
      })}
    </>
  );
}
