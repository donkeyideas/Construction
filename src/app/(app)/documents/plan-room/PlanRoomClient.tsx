"use client";

import { useState, useMemo } from "react";
import {
  Map,
  Search,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Calendar,
  User,
  FolderOpen,
  Layers,
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanDoc {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  category: string;
  version: number;
  created_at: string;
  project_id: string | null;
  projects: { id: string; name: string } | null;
  uploader: { full_name: string; email: string } | null;
}

interface PlanRoomClientProps {
  documents: PlanDoc[];
  projectList: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileIcon(fileType: string) {
  const t = fileType.toLowerCase();
  if (t === "pdf") return { Icon: FileText, cls: "file-icon-pdf" };
  if (["jpg", "jpeg", "png", "gif", "bmp", "tiff", "svg"].includes(t))
    return { Icon: FileImage, cls: "file-icon-img" };
  if (["xls", "xlsx", "csv"].includes(t))
    return { Icon: FileSpreadsheet, cls: "file-icon-xls" };
  if (["dwg", "dxf", "rvt"].includes(t))
    return { Icon: Layers, cls: "file-icon-dwg" };
  return { Icon: File, cls: "file-icon-default" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanRoomClient({
  documents,
  projectList,
}: PlanRoomClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    documents[0]?.id ?? null
  );
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "plan" | "spec">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({ plan: true, spec: true });

  // Filter documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (projectFilter !== "all" && doc.project_id !== projectFilter)
        return false;
      if (categoryFilter !== "all" && doc.category !== categoryFilter)
        return false;
      if (
        search &&
        !doc.name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [documents, projectFilter, categoryFilter, search]);

  // Group by category
  const grouped = useMemo(() => {
    const plans = filtered.filter((d) => d.category === "plan");
    const specs = filtered.filter((d) => d.category === "spec");
    return { plans, specs };
  }, [filtered]);

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="doc-empty" style={{ paddingTop: 100 }}>
        <div className="doc-empty-icon">
          <Map size={48} />
        </div>
        <div className="doc-empty-title">No Plans or Specifications</div>
        <div className="doc-empty-desc">
          Upload construction plans and specifications to your Document Library
          with the category set to &quot;plan&quot; or &quot;spec&quot; and they
          will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="plan-room-shell">
      {/* Header Bar */}
      <div className="plan-room-header">
        <div className="plan-room-header-left">
          <Map size={20} className="plan-room-icon" />
          <span className="plan-room-project-name">Plan Room</span>
          {projectList.length > 0 && (
            <select
              className="plan-room-project-select"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <span className="plan-room-set-info">
            <Layers size={14} />
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="plan-room-header-right">
          <div className="plan-room-filter-group">
            <Filter size={14} />
            <select
              className="plan-room-project-select"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as "all" | "plan" | "spec")
              }
            >
              <option value="all">All Types</option>
              <option value="plan">Plans Only</option>
              <option value="spec">Specs Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="plan-room-body">
        {/* LEFT: Document List */}
        <div className="plan-room-sidebar">
          {/* Search */}
          <div className="plan-room-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Plans Section */}
          {grouped.plans.length > 0 && (
            <div className="plan-room-discipline">
              <div
                className="plan-room-discipline-title clickable"
                onClick={() => toggleCategory("plan")}
              >
                {expandedCategories.plan ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                Plans ({grouped.plans.length})
              </div>
              {expandedCategories.plan &&
                grouped.plans.map((doc) => (
                  <div
                    key={doc.id}
                    className={`plan-room-sheet-item ${doc.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(doc.id)}
                  >
                    <div className="plan-room-sheet-top">
                      <span
                        className={`plan-room-sheet-number ${doc.id === selectedId ? "active" : ""}`}
                      >
                        {doc.file_type?.toUpperCase() || "FILE"}
                      </span>
                      {doc.version > 1 && (
                        <span className="plan-room-sheet-badge rev">
                          v{doc.version}
                        </span>
                      )}
                    </div>
                    <div
                      className={`plan-room-sheet-name ${doc.id === selectedId ? "active" : ""}`}
                    >
                      {doc.name}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Specs Section */}
          {grouped.specs.length > 0 && (
            <div className="plan-room-discipline">
              <div
                className="plan-room-discipline-title clickable"
                onClick={() => toggleCategory("spec")}
              >
                {expandedCategories.spec ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                Specifications ({grouped.specs.length})
              </div>
              {expandedCategories.spec &&
                grouped.specs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`plan-room-sheet-item ${doc.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(doc.id)}
                  >
                    <div className="plan-room-sheet-top">
                      <span
                        className={`plan-room-sheet-number ${doc.id === selectedId ? "active" : ""}`}
                      >
                        {doc.file_type?.toUpperCase() || "FILE"}
                      </span>
                      {doc.version > 1 && (
                        <span className="plan-room-sheet-badge rev">
                          v{doc.version}
                        </span>
                      )}
                    </div>
                    <div
                      className={`plan-room-sheet-name ${doc.id === selectedId ? "active" : ""}`}
                    >
                      {doc.name}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="plan-room-sidebar-empty">
              No documents match your filters.
            </div>
          )}
        </div>

        {/* CENTER: Document Viewer */}
        <div className="plan-room-viewer">
          {selectedDoc ? (
            <div className="plan-room-doc-view">
              <div className="plan-room-doc-card">
                <div
                  className={`plan-room-doc-icon ${getFileIcon(selectedDoc.file_type).cls}`}
                >
                  {(() => {
                    const { Icon } = getFileIcon(selectedDoc.file_type);
                    return <Icon size={48} />;
                  })()}
                </div>
                <h3 className="plan-room-doc-name">{selectedDoc.name}</h3>
                <p className="plan-room-doc-meta">
                  {selectedDoc.file_type?.toUpperCase()} &middot;{" "}
                  {formatBytes(selectedDoc.file_size)} &middot; Version{" "}
                  {selectedDoc.version}
                </p>
                {selectedDoc.projects && (
                  <p className="plan-room-doc-project">
                    {selectedDoc.projects.name}
                  </p>
                )}
                <div className="plan-room-doc-actions">
                  <button className="btn-primary">
                    <Eye size={14} />
                    Preview
                  </button>
                  <button className="btn-secondary">
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="plan-room-doc-view">
              <div className="plan-room-doc-empty">
                <FolderOpen size={40} />
                <p>Select a document from the sidebar to view details</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Info Panel */}
        {selectedDoc && (
          <div className="plan-room-info">
            <div className="plan-room-info-header">
              <span>Document Info</span>
            </div>

            {/* Document Details */}
            <div className="plan-room-info-section">
              <div className="plan-room-info-field">
                <span className="plan-room-info-label">File Name</span>
                <span className="plan-room-info-value">
                  {selectedDoc.name}
                </span>
              </div>
              <div className="plan-room-info-row">
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Type</span>
                  <span className="plan-room-info-value sm">
                    {selectedDoc.file_type?.toUpperCase() || "--"}
                  </span>
                </div>
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Size</span>
                  <span className="plan-room-info-value sm">
                    {formatBytes(selectedDoc.file_size)}
                  </span>
                </div>
              </div>
              <div className="plan-room-info-row">
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Category</span>
                  <span className="plan-room-info-value sm">
                    {selectedDoc.category === "plan"
                      ? "Plan"
                      : "Specification"}
                  </span>
                </div>
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Version</span>
                  <span className="plan-room-info-value sm">
                    v{selectedDoc.version}
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Info */}
            <div className="plan-room-info-section">
              <div className="plan-room-info-section-title">Upload Info</div>
              <div className="plan-room-info-field">
                <span className="plan-room-info-label">
                  <Calendar size={10} style={{ marginRight: 4 }} />
                  Uploaded
                </span>
                <span className="plan-room-info-value sm">
                  {formatDate(selectedDoc.created_at)}
                </span>
              </div>
              <div className="plan-room-info-field">
                <span className="plan-room-info-label">
                  <User size={10} style={{ marginRight: 4 }} />
                  Uploaded By
                </span>
                <span className="plan-room-info-value sm">
                  {selectedDoc.uploader?.full_name || "--"}
                </span>
              </div>
            </div>

            {/* Project Info */}
            {selectedDoc.projects && (
              <div className="plan-room-info-section no-border">
                <div className="plan-room-info-section-title">Project</div>
                <div className="plan-room-info-field">
                  <span className="plan-room-info-value sm">
                    {selectedDoc.projects.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
