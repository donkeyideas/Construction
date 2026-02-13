"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Upload,
  X,
  Trash2,
  Plus,
} from "lucide-react";
import type { DocumentRow } from "@/lib/queries/documents";

interface Project {
  id: string;
  name: string;
}

interface DocumentsClientProps {
  documents: DocumentRow[];
  hasFilters: boolean;
  currentFolder?: string;
  projects?: Project[];
  showUpload?: boolean;
}

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
   DocumentsClient Component
   ------------------------------------------------------------------ */

export default function DocumentsClient({
  documents,
  hasFilters,
  currentFolder,
  projects = [],
  showUpload = false,
}: DocumentsClientProps) {
  const router = useRouter();
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(showUpload);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("plan");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadFolderPath, setUploadFolderPath] = useState(currentFolder || "");
  const [uploadTags, setUploadTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleCardClick = (doc: DocumentRow) => {
    setSelectedDoc(doc);
    setShowDeleteConfirm(false);
    setError(null);
  };

  const handleCloseModal = () => {
    setSelectedDoc(null);
    setShowDeleteConfirm(false);
    setError(null);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setError(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDoc) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete document");
      }

      handleCloseModal();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    if (!uploadName) setUploadName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName || uploadFile.name);
      formData.append("category", uploadCategory);
      if (uploadProjectId) formData.append("project_id", uploadProjectId);
      if (uploadFolderPath) formData.append("folder_path", uploadFolderPath);
      if (uploadTags) {
        formData.append(
          "tags",
          JSON.stringify(
            uploadTags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          )
        );
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload document");
      }

      // Reset and close
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadName("");
      setUploadCategory("plan");
      setUploadProjectId("");
      setUploadFolderPath("");
      setUploadTags("");
      router.refresh();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload document"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadModal = () => {
    setUploadFile(null);
    setUploadName("");
    setUploadCategory("plan");
    setUploadProjectId("");
    setUploadFolderPath(currentFolder || "");
    setUploadTags("");
    setUploadError(null);
    setShowUploadModal(true);
  };

  /* Upload Modal JSX (rendered at end) */
  const uploadModal = showUploadModal ? (
    <div
      className="ticket-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowUploadModal(false);
      }}
    >
      <div className="ticket-modal" style={{ maxWidth: "560px" }}>
        <div className="ticket-modal-header">
          <h3>Upload Document</h3>
          <button
            className="ticket-modal-close"
            onClick={() => setShowUploadModal(false)}
          >
            <X size={18} />
          </button>
        </div>

        <form className="ticket-form" onSubmit={handleUploadSubmit}>
          {uploadError && (
            <div className="ticket-form-error">{uploadError}</div>
          )}

          {/* Drop Zone */}
          <div
            className={`doc-upload-dropzone ${isDragOver ? "doc-upload-dropzone-active" : ""} ${uploadFile ? "doc-upload-dropzone-has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {uploadFile ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600 }}>{uploadFile.name}</div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  {formatFileSize(uploadFile.size)} — Click to change
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <Upload
                  size={32}
                  style={{ color: "var(--muted)", marginBottom: "8px" }}
                />
                <div style={{ fontWeight: 500 }}>
                  Drop file here or click to browse
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  PDF, DWG, XLSX, DOCX, JPG, PNG up to 50MB
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">Document Name</label>
            <input
              className="ticket-form-input"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g. Floor Plan - Level 3"
            />
          </div>

          <div className="ticket-form-row">
            {/* Category */}
            <div className="ticket-form-group">
              <label className="ticket-form-label">Category *</label>
              <select
                className="ticket-form-select"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                <option value="plan">Plans</option>
                <option value="spec">Specifications</option>
                <option value="contract">Contracts</option>
                <option value="photo">Photos</option>
                <option value="report">Reports</option>
                <option value="correspondence">Correspondence</option>
              </select>
            </div>

            {/* Project */}
            <div className="ticket-form-group">
              <label className="ticket-form-label">Project</label>
              <select
                className="ticket-form-select"
                value={uploadProjectId}
                onChange={(e) => setUploadProjectId(e.target.value)}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ticket-form-row">
            {/* Folder */}
            <div className="ticket-form-group">
              <label className="ticket-form-label">Folder Path</label>
              <input
                className="ticket-form-input"
                value={uploadFolderPath}
                onChange={(e) => setUploadFolderPath(e.target.value)}
                placeholder="/Project/Drawings"
              />
            </div>

            {/* Tags */}
            <div className="ticket-form-group">
              <label className="ticket-form-label">Tags</label>
              <input
                className="ticket-form-input"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="structural, rev-c, current"
              />
            </div>
          </div>

          <div className="ticket-form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!uploadFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  if (documents.length === 0) {
    return (
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
          <button
            className="ui-btn ui-btn-primary ui-btn-md"
            style={{ marginTop: "12px" }}
            onClick={openUploadModal}
          >
            <Upload size={16} />
            Upload Document
          </button>
        )}
        {uploadModal}
      </div>
    );
  }

  return (
    <>
      <div className="doc-count">
        {documents.length} document{documents.length !== 1 ? "s" : ""}
        {currentFolder && (
          <span className="doc-count-folder"> in /{currentFolder}</span>
        )}
      </div>
      <div className="doc-grid">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onClick={() => handleCardClick(doc)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {selectedDoc && (
        <div className="ticket-modal-overlay" onClick={handleCloseModal}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="ticket-modal-header">
              <h3>Document Details</h3>
              <button
                onClick={handleCloseModal}
                className="ticket-modal-close"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="ticket-detail-body">
              {/* File Icon & Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div className={getFileIconClass(selectedDoc.file_type)}>
                  {getFileIcon(selectedDoc.file_type)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "18px" }}>
                    {selectedDoc.name}
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {formatFileSize(selectedDoc.file_size)}
                    {selectedDoc.version > 1 && <span> • Version {selectedDoc.version}</span>}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Category</span>
                <span className={categoryBadgeClass[selectedDoc.category] ?? "badge badge-gray"}>
                  {categoryLabels[selectedDoc.category] ?? selectedDoc.category}
                </span>
              </div>

              {/* File Type */}
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">File Type</span>
                <span>{selectedDoc.file_type}</span>
              </div>

              {/* Uploaded By */}
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Uploaded By</span>
                <span>
                  {(selectedDoc.uploader as { full_name: string; email: string } | null)?.full_name ??
                    (selectedDoc.uploader as { full_name: string; email: string } | null)?.email ??
                    "Unknown"}
                </span>
              </div>

              {/* Upload Date */}
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Upload Date</span>
                <span>
                  {new Date(selectedDoc.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Project */}
              {selectedDoc.project && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">Project</span>
                  <Link
                    href={`/projects/${(selectedDoc.project as { id: string; name: string; code: string }).id}`}
                    className="doc-card-link"
                    onClick={handleCloseModal}
                  >
                    {(selectedDoc.project as { id: string; name: string; code: string }).code} -{" "}
                    {(selectedDoc.project as { id: string; name: string; code: string }).name}
                  </Link>
                </div>
              )}

              {/* Property */}
              {selectedDoc.property && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">Property</span>
                  <Link
                    href={`/properties/${(selectedDoc.property as { id: string; name: string }).id}`}
                    className="doc-card-link"
                    onClick={handleCloseModal}
                  >
                    {(selectedDoc.property as { id: string; name: string }).name}
                  </Link>
                </div>
              )}

              {/* Tags */}
              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">Tags</span>
                  <div className="doc-card-tags">
                    {selectedDoc.tags.map((tag) => (
                      <span key={tag} className="doc-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* File Path */}
              {selectedDoc.file_path && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">File Path</span>
                  <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", wordBreak: "break-all" }}>
                    {selectedDoc.file_path}
                  </span>
                </div>
              )}

              {/* Error Message */}
              {error && <div className="ticket-form-error">{error}</div>}

              {/* Delete Confirmation */}
              {showDeleteConfirm && (
                <div className="ticket-delete-confirm">
                  <p>
                    Are you sure you want to delete <strong>{selectedDoc.name}</strong>? This action cannot be undone.
                  </p>
                  <div className="ticket-delete-actions">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="btn-danger"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete Document"}
                    </button>
                  </div>
                </div>
              )}

              {/* Delete Button */}
              {!showDeleteConfirm && (
                <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--color-border)" }}>
                  <button
                    onClick={handleDeleteClick}
                    className="btn-danger-outline"
                    style={{ width: "100%" }}
                  >
                    <Trash2 size={16} />
                    Delete Document
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal}
    </>
  );
}

/* ------------------------------------------------------------------
   DocumentCard Component
   ------------------------------------------------------------------ */

function DocumentCard({
  doc,
  onClick,
}: {
  doc: DocumentRow;
  onClick: () => void;
}) {
  const uploaderName =
    (doc.uploader as { full_name: string; email: string } | null)?.full_name ??
    (doc.uploader as { full_name: string; email: string } | null)?.email ??
    "Unknown";

  const projectInfo = doc.project as { id: string; name: string; code: string } | null;
  const propertyInfo = doc.property as { id: string; name: string } | null;

  return (
    <div className="doc-card" onClick={onClick} style={{ cursor: "pointer" }}>
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
              onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
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
