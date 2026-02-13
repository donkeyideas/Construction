"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  ChevronDown,
  ChevronRight,
  Upload,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  History,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import type { DocumentRow, DrawingSetRow } from "@/lib/queries/documents";
import PlanRoomUploadModal from "./PlanRoomUploadModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanRoomClientProps {
  documents: DocumentRow[];
  drawingSets: DrawingSetRow[];
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
  const t = (fileType || "").toLowerCase();
  if (t === "pdf") return { Icon: FileText, cls: "file-icon-pdf" };
  if (["jpg", "jpeg", "png", "gif", "bmp", "tiff", "svg", "webp"].includes(t))
    return { Icon: FileImage, cls: "file-icon-img" };
  if (["xls", "xlsx", "csv"].includes(t))
    return { Icon: FileSpreadsheet, cls: "file-icon-xls" };
  if (["dwg", "dxf", "rvt"].includes(t))
    return { Icon: Layers, cls: "file-icon-dwg" };
  return { Icon: File, cls: "file-icon-default" };
}

function isPreviewable(fileType: string): "pdf" | "image" | false {
  const t = (fileType || "").toLowerCase();
  if (t === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(t)) return "image";
  return false;
}

const DISCIPLINES = [
  { value: "architectural", label: "Architectural" },
  { value: "structural", label: "Structural" },
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "civil", label: "Civil" },
  { value: "landscape", label: "Landscape" },
  { value: "other", label: "Other" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanRoomClient({
  documents,
  drawingSets,
  projectList,
}: PlanRoomClientProps) {
  const router = useRouter();

  // State
  const [selectedId, setSelectedId] = useState<string | null>(
    documents[0]?.id ?? null
  );
  const [projectFilter, setProjectFilter] = useState("all");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [setFilter, setSetFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({
    ungrouped: true,
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewSetModal, setShowNewSetModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Viewer state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  // Version history
  const [versionHistory, setVersionHistory] = useState<DocumentRow[]>([]);

  // New drawing set form
  const [newSetName, setNewSetName] = useState("");
  const [newSetDesc, setNewSetDesc] = useState("");
  const [newSetDiscipline, setNewSetDiscipline] = useState("");
  const [newSetProject, setNewSetProject] = useState("");
  const [newSetLoading, setNewSetLoading] = useState(false);

  // Revision form
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionLabel, setRevisionLabel] = useState("");
  const [revisionLoading, setRevisionLoading] = useState(false);

  // Deleting
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (projectFilter !== "all" && doc.project_id !== projectFilter) return false;
      if (disciplineFilter !== "all" && doc.discipline !== disciplineFilter) return false;
      if (setFilter !== "all") {
        if (setFilter === "ungrouped") {
          if (doc.drawing_set_id) return false;
        } else {
          if (doc.drawing_set_id !== setFilter) return false;
        }
      }
      if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [documents, projectFilter, disciplineFilter, setFilter, search]);

  // Group by drawing set
  const grouped = useMemo(() => {
    const setGroups: Record<string, { set: DrawingSetRow | null; docs: DocumentRow[] }> = {};

    // Initialize groups for known sets
    for (const s of drawingSets) {
      setGroups[s.id] = { set: s, docs: [] };
    }

    const ungrouped: DocumentRow[] = [];

    for (const doc of filtered) {
      if (doc.drawing_set_id && setGroups[doc.drawing_set_id]) {
        setGroups[doc.drawing_set_id].docs.push(doc);
      } else {
        ungrouped.push(doc);
      }
    }

    return { setGroups, ungrouped };
  }, [filtered, drawingSets]);

  // Auto-expand sets that have documents
  useEffect(() => {
    const expanded: Record<string, boolean> = { ungrouped: true };
    for (const [setId, group] of Object.entries(grouped.setGroups)) {
      if (group.docs.length > 0) expanded[setId] = true;
    }
    setExpandedSets(expanded);
  }, [grouped]);

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;

  // Fetch preview URL when document changes
  useEffect(() => {
    if (!selectedDoc) {
      setPreviewUrl(null);
      setVersionHistory([]);
      return;
    }

    const previewType = isPreviewable(selectedDoc.file_type);
    if (!previewType || !selectedDoc.file_path || selectedDoc.file_path === "pending-upload") {
      setPreviewUrl(null);
    } else {
      setPreviewLoading(true);
      fetch(`/api/documents/plan-room/${selectedDoc.id}/download`)
        .then((res) => res.json())
        .then((data) => {
          if (data.url) setPreviewUrl(data.url);
          else setPreviewUrl(null);
        })
        .catch(() => setPreviewUrl(null))
        .finally(() => setPreviewLoading(false));
    }

    setImageZoom(1);
  }, [selectedDoc]);

  function toggleSet(setId: string) {
    setExpandedSets((prev) => ({ ...prev, [setId]: !prev[setId] }));
  }

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/documents/plan-room/${selectedDoc.id}/download`);
      const data = await res.json();
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = selectedDoc.name;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  }, [selectedDoc]);

  // Create drawing set
  const handleCreateSet = useCallback(async () => {
    if (!newSetName.trim()) return;
    setNewSetLoading(true);
    try {
      await fetch("/api/documents/plan-room/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSetName.trim(),
          description: newSetDesc.trim() || null,
          discipline: newSetDiscipline || null,
          project_id: newSetProject || null,
        }),
      });
      setShowNewSetModal(false);
      setNewSetName("");
      setNewSetDesc("");
      setNewSetDiscipline("");
      setNewSetProject("");
      router.refresh();
    } catch (err) {
      console.error("Create set error:", err);
    } finally {
      setNewSetLoading(false);
    }
  }, [newSetName, newSetDesc, newSetDiscipline, newSetProject, router]);

  // Upload revision
  const handleUploadRevision = useCallback(async () => {
    if (!revisionFile || !selectedDoc) return;
    setRevisionLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", revisionFile);
      if (revisionLabel.trim()) formData.append("revision_label", revisionLabel.trim());

      await fetch(`/api/documents/plan-room/${selectedDoc.id}/revision`, {
        method: "POST",
        body: formData,
      });

      setShowRevisionModal(false);
      setRevisionFile(null);
      setRevisionLabel("");
      router.refresh();
    } catch (err) {
      console.error("Upload revision error:", err);
    } finally {
      setRevisionLoading(false);
    }
  }, [revisionFile, revisionLabel, selectedDoc, router]);

  // Delete document
  const handleDelete = useCallback(async () => {
    if (!selectedDoc) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/documents/plan-room/${selectedDoc.id}`, {
        method: "DELETE",
      });
      setShowDeleteConfirm(false);
      setSelectedId(null);
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedDoc, router]);

  // Fetch version history when a document is selected
  useEffect(() => {
    if (!selectedDoc) {
      setVersionHistory([]);
      return;
    }
    // Fetch all versions with same name from the documents list
    const versions = documents
      .filter(
        (d) =>
          d.name === selectedDoc.name &&
          d.project_id === selectedDoc.project_id &&
          d.drawing_set_id === selectedDoc.drawing_set_id
      )
      .sort((a, b) => b.version - a.version);

    if (versions.length > 1) {
      setVersionHistory(versions);
    } else {
      setVersionHistory([]);
    }
  }, [selectedDoc, documents]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderDocItem(doc: DocumentRow) {
    const { Icon, cls } = getFileIcon(doc.file_type);
    const isActive = doc.id === selectedId;
    return (
      <div
        key={doc.id}
        className={`plan-room-sheet-item ${isActive ? "active" : ""}`}
        onClick={() => setSelectedId(doc.id)}
      >
        <div className="plan-room-sheet-top">
          <span className={`plan-room-sheet-number ${isActive ? "active" : ""}`}>
            <Icon size={12} className={cls} />
            <span>{(doc.file_type || "FILE").toUpperCase()}</span>
          </span>
          <span className="plan-room-sheet-badges">
            {doc.revision_label && (
              <span className="plan-room-sheet-badge rev">{doc.revision_label}</span>
            )}
            {!doc.revision_label && doc.version > 1 && (
              <span className="plan-room-sheet-badge rev">v{doc.version}</span>
            )}
          </span>
        </div>
        <div className={`plan-room-sheet-name ${isActive ? "active" : ""}`}>
          {doc.name}
        </div>
        {doc.discipline && (
          <div className="plan-room-sheet-discipline">{doc.discipline}</div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (documents.length === 0) {
    return (
      <div className="plan-room-shell">
        <div className="plan-room-header">
          <div className="plan-room-header-left">
            <Map size={20} className="plan-room-icon" />
            <span className="plan-room-project-name">Plan Room</span>
          </div>
          <div className="plan-room-header-right">
            <button
              className="plan-room-upload-btn"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={14} />
              Upload Documents
            </button>
          </div>
        </div>
        <div className="plan-room-body">
          <div className="plan-room-empty-state">
            <FolderOpen size={48} />
            <h3>No Documents Yet</h3>
            <p>Upload construction plans and specifications to get started.</p>
            <button
              className="plan-room-upload-btn lg"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} />
              Upload Your First Document
            </button>
          </div>
        </div>
        {showUploadModal && (
          <PlanRoomUploadModal
            projectList={projectList}
            drawingSets={drawingSets}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const previewType = selectedDoc ? isPreviewable(selectedDoc.file_type) : false;

  return (
    <div className="plan-room-shell">
      {/* Header Bar */}
      <div className="plan-room-header">
        <div className="plan-room-header-left">
          <Map size={20} className="plan-room-icon" />
          <span className="plan-room-project-name">Plan Room</span>
          <span className="plan-room-doc-count">
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="plan-room-header-right">
          <select
            className="plan-room-filter-select"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="plan-room-filter-select"
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
          >
            <option value="all">All Disciplines</option>
            {DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <select
            className="plan-room-filter-select"
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
          >
            <option value="all">All Sets</option>
            <option value="ungrouped">Ungrouped</option>
            {drawingSets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            className="plan-room-header-btn"
            onClick={() => setShowNewSetModal(true)}
            title="New Drawing Set"
          >
            <Plus size={14} />
            New Set
          </button>
          <button
            className="plan-room-upload-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="plan-room-body">
        {/* LEFT: Document List */}
        <div className="plan-room-sidebar">
          <div className="plan-room-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Drawing Set Groups */}
          {Object.entries(grouped.setGroups).map(([setId, group]) => {
            if (group.docs.length === 0) return null;
            return (
              <div key={setId} className="plan-room-set-group">
                <div
                  className="plan-room-set-header"
                  onClick={() => toggleSet(setId)}
                >
                  {expandedSets[setId] ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  <Layers size={12} />
                  <span className="plan-room-set-name">
                    {group.set?.name ?? "Set"}
                  </span>
                  <span className="plan-room-set-count">{group.docs.length}</span>
                </div>
                {expandedSets[setId] &&
                  group.docs.map((doc) => renderDocItem(doc))}
              </div>
            );
          })}

          {/* Ungrouped */}
          {grouped.ungrouped.length > 0 && (
            <div className="plan-room-set-group">
              <div
                className="plan-room-set-header"
                onClick={() => toggleSet("ungrouped")}
              >
                {expandedSets.ungrouped ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
                <span className="plan-room-set-name">Ungrouped</span>
                <span className="plan-room-set-count">{grouped.ungrouped.length}</span>
              </div>
              {expandedSets.ungrouped &&
                grouped.ungrouped.map((doc) => renderDocItem(doc))}
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
            <>
              {/* Viewer Toolbar */}
              <div className="plan-room-viewer-toolbar">
                <div className="plan-room-toolbar-left">
                  <span className="plan-room-toolbar-name">{selectedDoc.name}</span>
                  {selectedDoc.revision_label && (
                    <span className="plan-room-toolbar-badge">{selectedDoc.revision_label}</span>
                  )}
                </div>
                <div className="plan-room-toolbar-right">
                  {previewType === "image" && (
                    <>
                      <button
                        className="plan-room-toolbar-btn"
                        onClick={() => setImageZoom((z) => Math.max(0.25, z - 0.25))}
                        title="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="plan-room-toolbar-zoom">{Math.round(imageZoom * 100)}%</span>
                      <button
                        className="plan-room-toolbar-btn"
                        onClick={() => setImageZoom((z) => Math.min(4, z + 0.25))}
                        title="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        className="plan-room-toolbar-btn"
                        onClick={() => setImageZoom(1)}
                        title="Fit to Page"
                      >
                        <Maximize2 size={14} />
                      </button>
                      <div className="plan-room-toolbar-divider" />
                    </>
                  )}
                  <button
                    className="plan-room-toolbar-btn"
                    onClick={() => setShowRevisionModal(true)}
                    title="Upload New Revision"
                  >
                    <History size={14} />
                    Revision
                  </button>
                  <button
                    className="plan-room-toolbar-btn primary"
                    onClick={handleDownload}
                    title="Download"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>

              {/* Viewer Content */}
              <div className="plan-room-viewer-content">
                {previewLoading ? (
                  <div className="plan-room-viewer-loading">
                    <div className="plan-room-spinner" />
                    <p>Loading preview...</p>
                  </div>
                ) : previewType === "pdf" && previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="plan-room-pdf-frame"
                    title={selectedDoc.name}
                  />
                ) : previewType === "image" && previewUrl ? (
                  <div className="plan-room-img-container">
                    <img
                      src={previewUrl}
                      alt={selectedDoc.name}
                      className="plan-room-img-viewer"
                      style={{ transform: `scale(${imageZoom})` }}
                    />
                  </div>
                ) : (
                  <div className="plan-room-unsupported">
                    <div className={`plan-room-doc-icon ${getFileIcon(selectedDoc.file_type).cls}`}>
                      {(() => {
                        const { Icon } = getFileIcon(selectedDoc.file_type);
                        return <Icon size={48} />;
                      })()}
                    </div>
                    <h3>{selectedDoc.name}</h3>
                    <p className="plan-room-unsupported-meta">
                      {(selectedDoc.file_type || "").toUpperCase()} &middot;{" "}
                      {formatBytes(selectedDoc.file_size)}
                    </p>
                    <p className="plan-room-unsupported-hint">
                      Preview not available for this file type. Download to view.
                    </p>
                    <button
                      className="plan-room-upload-btn"
                      onClick={handleDownload}
                    >
                      <Download size={14} />
                      Download File
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="plan-room-viewer-content">
              <div className="plan-room-viewer-empty">
                <FolderOpen size={40} />
                <p>Select a document from the sidebar to view it</p>
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
                <span className="plan-room-info-value">{selectedDoc.name}</span>
              </div>
              <div className="plan-room-info-row">
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Type</span>
                  <span className="plan-room-info-value sm">
                    {(selectedDoc.file_type || "--").toUpperCase()}
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
                    {selectedDoc.category === "plan" ? "Plan" : "Specification"}
                  </span>
                </div>
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Version</span>
                  <span className="plan-room-info-value sm">
                    {selectedDoc.revision_label || `v${selectedDoc.version}`}
                  </span>
                </div>
              </div>
              {selectedDoc.discipline && (
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Discipline</span>
                  <span className="plan-room-info-value sm">
                    {DISCIPLINES.find((d) => d.value === selectedDoc.discipline)?.label || selectedDoc.discipline}
                  </span>
                </div>
              )}
              {selectedDoc.drawing_set && (
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Drawing Set</span>
                  <span className="plan-room-info-value sm">
                    {selectedDoc.drawing_set.name}
                  </span>
                </div>
              )}
            </div>

            {/* Version History */}
            {versionHistory.length > 1 && (
              <div className="plan-room-info-section">
                <div className="plan-room-info-section-title">
                  <History size={10} style={{ marginRight: 4 }} />
                  Version History
                </div>
                <div className="plan-room-version-list">
                  {versionHistory.map((v) => (
                    <div
                      key={v.id}
                      className={`plan-room-version-item ${v.id === selectedDoc.id ? "current" : ""}`}
                      onClick={() => setSelectedId(v.id)}
                    >
                      <span className="plan-room-version-label">
                        {v.revision_label || `v${v.version}`}
                      </span>
                      <span className="plan-room-version-date">
                        {formatDate(v.created_at)}
                      </span>
                      {v.is_current && (
                        <span className="plan-room-version-current-badge">Current</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            {selectedDoc.project && (
              <div className="plan-room-info-section">
                <div className="plan-room-info-section-title">Project</div>
                <div className="plan-room-info-field">
                  <span className="plan-room-info-value sm">
                    {selectedDoc.project.name}
                  </span>
                </div>
              </div>
            )}

            {/* Tags */}
            {selectedDoc.tags && selectedDoc.tags.length > 0 && (
              <div className="plan-room-info-section">
                <div className="plan-room-info-section-title">Tags</div>
                <div className="plan-room-tags">
                  {selectedDoc.tags.map((tag, i) => (
                    <span key={i} className="plan-room-tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="plan-room-info-section plan-room-info-actions">
              <button
                className="plan-room-action-btn danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} />
                Delete Document
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <PlanRoomUploadModal
          projectList={projectList}
          drawingSets={drawingSets}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            router.refresh();
          }}
        />
      )}

      {/* New Drawing Set Modal */}
      {showNewSetModal && (
        <div className="plan-room-modal-overlay" onClick={() => setShowNewSetModal(false)}>
          <div className="plan-room-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plan-room-modal-header">
              <h3>New Drawing Set</h3>
              <button className="plan-room-modal-close" onClick={() => setShowNewSetModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="plan-room-modal-body">
              <div className="plan-room-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="e.g., Structural Set Rev C"
                />
              </div>
              <div className="plan-room-form-group">
                <label>Description</label>
                <textarea
                  value={newSetDesc}
                  onChange={(e) => setNewSetDesc(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="plan-room-form-row">
                <div className="plan-room-form-group">
                  <label>Discipline</label>
                  <select value={newSetDiscipline} onChange={(e) => setNewSetDiscipline(e.target.value)}>
                    <option value="">None</option>
                    {DISCIPLINES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="plan-room-form-group">
                  <label>Project</label>
                  <select value={newSetProject} onChange={(e) => setNewSetProject(e.target.value)}>
                    <option value="">None</option>
                    {projectList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="plan-room-modal-footer">
              <button className="plan-room-btn-secondary" onClick={() => setShowNewSetModal(false)}>
                Cancel
              </button>
              <button
                className="plan-room-btn-primary"
                onClick={handleCreateSet}
                disabled={!newSetName.trim() || newSetLoading}
              >
                {newSetLoading ? "Creating..." : "Create Set"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Upload Modal */}
      {showRevisionModal && selectedDoc && (
        <div className="plan-room-modal-overlay" onClick={() => setShowRevisionModal(false)}>
          <div className="plan-room-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plan-room-modal-header">
              <h3>Upload New Revision</h3>
              <button className="plan-room-modal-close" onClick={() => setShowRevisionModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="plan-room-modal-body">
              <p className="plan-room-modal-hint">
                Uploading a new revision of <strong>{selectedDoc.name}</strong>
                {" "}(currently v{selectedDoc.version})
              </p>
              <div className="plan-room-form-group">
                <label>File *</label>
                <div
                  className={`plan-room-dropzone ${revisionFile ? "has-file" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files[0];
                    if (f) setRevisionFile(f);
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.onchange = (e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) setRevisionFile(f);
                    };
                    input.click();
                  }}
                >
                  {revisionFile ? (
                    <span>{revisionFile.name} ({formatBytes(revisionFile.size)})</span>
                  ) : (
                    <span>Drop file here or click to browse</span>
                  )}
                </div>
              </div>
              <div className="plan-room-form-group">
                <label>Revision Label</label>
                <input
                  type="text"
                  value={revisionLabel}
                  onChange={(e) => setRevisionLabel(e.target.value)}
                  placeholder={`e.g., Rev ${String.fromCharCode(65 + selectedDoc.version)}`}
                />
              </div>
            </div>
            <div className="plan-room-modal-footer">
              <button className="plan-room-btn-secondary" onClick={() => setShowRevisionModal(false)}>
                Cancel
              </button>
              <button
                className="plan-room-btn-primary"
                onClick={handleUploadRevision}
                disabled={!revisionFile || revisionLoading}
              >
                {revisionLoading ? "Uploading..." : "Upload Revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedDoc && (
        <div className="plan-room-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="plan-room-modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="plan-room-modal-header">
              <h3>Delete Document</h3>
              <button className="plan-room-modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="plan-room-modal-body">
              <div className="plan-room-delete-warning">
                <AlertTriangle size={20} />
                <p>
                  Are you sure you want to delete <strong>{selectedDoc.name}</strong>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="plan-room-modal-footer">
              <button className="plan-room-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="plan-room-btn-danger"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
