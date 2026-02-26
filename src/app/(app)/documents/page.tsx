import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  Upload,
  Search,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocuments, getFolderTree, type FolderNode } from "@/lib/queries/documents";
import { getProjects } from "@/lib/queries/projects";
import { getProperties } from "@/lib/queries/properties";
import DocumentsClient from "./DocumentsClient";

export const metadata = {
  title: "Document Library - Buildwrk",
};

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
          <DocumentsClient
            documents={documents}
            hasFilters={hasFilters}
            currentFolder={params.folder}
            projects={projects}
            properties={properties}
            showUpload={params.upload === "true"}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   FolderTreeNodes Component
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
