"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { DocumentRow } from "@/lib/queries/documents";

interface DocumentsClientProps {
  documents: DocumentRow[];
  hasFilters: boolean;
  currentFolder?: string;
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
}: DocumentsClientProps) {
  const router = useRouter();
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
