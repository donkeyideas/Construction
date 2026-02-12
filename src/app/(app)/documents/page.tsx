import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Upload,
  Search,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocuments, getFolderTree, type DocumentRow, type FolderNode } from "@/lib/queries/documents";
import { getProjects } from "@/lib/queries/projects";
import { getProperties } from "@/lib/queries/properties";

export const metadata = {
  title: "Document Library - ConstructionERP",
};

/* ------------------------------------------------------------------
   File Type Icon Helpers
   ------------------------------------------------------------------ */

function getFileIcon(fileType: string) {
  const ext = fileType.toLowerCase();
  if (ext.includes("pdf")) return <FileText size={20} />;
  if (ext.includes("image") || ext.includes("jpg") || ext.includes("jpeg") || ext.includes("png") || ext.includes("gif"))
    return <Image size={20} />;
  if (ext.includes("spreadsheet") || ext.includes("xlsx") || ext.includes("xls") || ext.includes("csv"))
    return <FileSpreadsheet size={20} />;
  if (ext.includes("dwg") || ext.includes("cad") || ext.includes("dxf"))
    return <FileText size={20} />;
  return <File size={20} />;
}

function getFileIconClass(fileType: string): string {
  const ext = fileType.toLowerCase();
  if (ext.includes("pdf")) return "file-icon file-icon-pdf";
  if (ext.includes("image") || ext.includes("jpg") || ext.includes("jpeg") || ext.includes("png") || ext.includes("gif"))
    return "file-icon file-icon-img";
  if (ext.includes("spreadsheet") || ext.includes("xlsx") || ext.includes("xls") || ext.includes("csv"))
    return "file-icon file-icon-xls";
  if (ext.includes("dwg") || ext.includes("cad") || ext.includes("dxf"))
    return "file-icon file-icon-dwg";
  if (ext.includes("doc") || ext.includes("word")) return "file-icon file-icon-doc";
  return "file-icon file-icon-default";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const categoryLabels: Record<string, string> = {
  plan: "Plans",
  spec: "Specs",
  contract: "Contracts",
  photo: "Photos",
  report: "Reports",
  correspondence: "Correspondence",
};

const categoryBadgeClass: Record<string, string> = {
  plan: "badge badge-blue",
  spec: "badge badge-amber",
  contract: "badge badge-green",
  photo: "badge badge-blue",
  report: "badge badge-amber",
  correspondence: "badge badge-gray",
};

/* ------------------------------------------------------------------
   Page Component
   ------------------------------------------------------------------ */

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    project?: string;
    property?: string;
    search?: string;
    folder?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;

  const [documents, folderTree, projects, properties] = await Promise.all([
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
  ]);

  const hasFilters = !!(params.category || params.project || params.property || params.search || params.folder);

  return (
    <div>
      {/* Header */}
      <div className="doc-header">
        <div>
          <h2>Document Library</h2>
          <p className="doc-header-sub">
            Manage plans, specifications, contracts, and project files.
          </p>
        </div>
        <div className="doc-header-actions">
          <Link href="/documents?upload=true" className="ui-btn ui-btn-primary ui-btn-md">
            <Upload size={16} />
            Upload
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="doc-filters">
        <form className="doc-search-form" action="/documents" method="GET">
          <div className="doc-search-wrap">
            <Search size={16} className="doc-search-icon" />
            <input
              type="text"
              name="search"
              className="ui-input doc-search-input"
              placeholder="Search documents by name..."
              defaultValue={params.search ?? ""}
            />
          </div>

          {params.category && (
            <input type="hidden" name="category" value={params.category} />
          )}
          {params.project && (
            <input type="hidden" name="project" value={params.project} />
          )}
          {params.property && (
            <input type="hidden" name="property" value={params.property} />
          )}

          <select
            name="category"
            className="fin-filter-select"
            defaultValue={params.category ?? ""}
          >
            <option value="">All Categories</option>
            <option value="plan">Plans</option>
            <option value="spec">Specifications</option>
            <option value="contract">Contracts</option>
            <option value="photo">Photos</option>
            <option value="report">Reports</option>
            <option value="correspondence">Correspondence</option>
          </select>

          <select
            name="project"
            className="fin-filter-select"
            defaultValue={params.project ?? ""}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            name="property"
            className="fin-filter-select"
            defaultValue={params.property ?? ""}
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button type="submit" className="ui-btn ui-btn-secondary ui-btn-sm">
            Filter
          </button>

          {hasFilters && (
            <Link href="/documents" className="ui-btn ui-btn-ghost ui-btn-sm">
              Clear Filters
            </Link>
          )}
        </form>
      </div>

      {/* Layout: Folder Tree + Content */}
      <div className="doc-layout">
        {/* Folder Tree Sidebar */}
        <aside className="folder-tree">
          <div className="folder-tree-title">Folders</div>
          <Link
            href="/documents"
            className={`folder-item ${!params.folder ? "active" : ""}`}
          >
            <FolderOpen size={16} />
            <span>All Documents</span>
          </Link>
          {folderTree.length > 0 ? (
            <FolderTreeNodes nodes={folderTree} activeFolder={params.folder} />
          ) : (
            <div className="folder-empty">
              No folders yet. Documents will be organized into folders as they are uploaded.
            </div>
          )}
        </aside>

        {/* Document Grid */}
        <div className="doc-content">
          {documents.length === 0 ? (
            <div className="doc-empty">
              <div className="doc-empty-icon">
                <FolderOpen size={48} />
              </div>
              <div className="doc-empty-title">No Documents Found</div>
              <div className="doc-empty-desc">
                {hasFilters
                  ? "No documents match your current filters. Try adjusting your search criteria."
                  : "Upload your first document to get started. Plans, specs, contracts, and photos are all supported."}
              </div>
              {!hasFilters && (
                <Link
                  href="/documents?upload=true"
                  className="ui-btn ui-btn-primary ui-btn-md"
                  style={{ marginTop: "12px" }}
                >
                  <Upload size={16} />
                  Upload Document
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="doc-count">
                {documents.length} document{documents.length !== 1 ? "s" : ""}
                {params.folder && (
                  <span className="doc-count-folder"> in /{params.folder}</span>
                )}
              </div>
              <div className="doc-grid">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Sub-components
   ------------------------------------------------------------------ */

function FolderTreeNodes({
  nodes,
  activeFolder,
  depth = 0,
}: {
  nodes: FolderNode[];
  activeFolder?: string;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isActive = activeFolder === node.path;
        const hasChildren = node.children.length > 0;
        return (
          <div key={node.path} style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}>
            <Link
              href={`/documents?folder=${encodeURIComponent(node.path)}`}
              className={`folder-item ${isActive ? "active" : ""}`}
            >
              {hasChildren ? (
                isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              ) : (
                <span style={{ width: 14, display: "inline-block" }} />
              )}
              <FolderOpen size={16} />
              <span>{node.name}</span>
            </Link>
            {hasChildren && (
              <FolderTreeNodes
                nodes={node.children}
                activeFolder={activeFolder}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function DocumentCard({ doc }: { doc: DocumentRow }) {
  const uploaderName =
    (doc.uploader as { full_name: string; email: string } | null)?.full_name ??
    (doc.uploader as { full_name: string; email: string } | null)?.email ??
    "Unknown";

  const projectInfo = doc.project as { id: string; name: string; code: string } | null;
  const propertyInfo = doc.property as { id: string; name: string } | null;

  return (
    <div className="doc-card">
      <div className="doc-card-header">
        <div className={getFileIconClass(doc.file_type)}>
          {getFileIcon(doc.file_type)}
        </div>
        <div className="doc-card-info">
          <div className="doc-card-name">{doc.name}</div>
          <div className="doc-card-meta">
            {formatFileSize(doc.file_size)}
            {doc.version > 1 && <span> -- v{doc.version}</span>}
          </div>
        </div>
      </div>

      <div className="doc-card-details">
        <div className="doc-card-detail">
          <span className="doc-card-label">Uploaded by</span>
          <span>{uploaderName}</span>
        </div>
        <div className="doc-card-detail">
          <span className="doc-card-label">Date</span>
          <span>
            {new Date(doc.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {projectInfo && (
          <div className="doc-card-detail">
            <span className="doc-card-label">Project</span>
            <Link
              href={`/projects/${projectInfo.id}`}
              className="doc-card-link"
            >
              {projectInfo.code} - {projectInfo.name}
            </Link>
          </div>
        )}
        {propertyInfo && (
          <div className="doc-card-detail">
            <span className="doc-card-label">Property</span>
            <Link
              href={`/properties/${propertyInfo.id}`}
              className="doc-card-link"
            >
              {propertyInfo.name}
            </Link>
          </div>
        )}
      </div>

      <div className="doc-card-footer">
        <span className={categoryBadgeClass[doc.category] ?? "badge badge-gray"}>
          {categoryLabels[doc.category] ?? doc.category}
        </span>
        {doc.tags && doc.tags.length > 0 && (
          <div className="doc-card-tags">
            {doc.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="doc-tag">
                {tag}
              </span>
            ))}
            {doc.tags.length > 3 && (
              <span className="doc-tag doc-tag-more">+{doc.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
