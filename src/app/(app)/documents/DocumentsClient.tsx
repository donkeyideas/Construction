"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  FolderOpen,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Upload,
  X,
  Trash2,
  Download,
  Eye,
  ExternalLink,
  Loader2,
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

function isPreviewable(fileType: string): "pdf" | "image" | false {
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return "pdf";
  if (t.includes("image") || t.includes("jpg") || t.includes("jpeg") || t.includes("png") || t.includes("gif") || t.includes("webp") || t.includes("svg"))
    return "image";
  return false;
}

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
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  const categoryLabels: Record<string, string> = {
    plan: t("categoryPlans"),
    spec: t("categorySpecs"),
    contract: t("categoryContracts"),
    photo: t("categoryPhotos"),
    report: t("categoryReports"),
    correspondence: t("categoryCorrespondence"),
  };

  const fetchSignedUrl = useCallback(async (docId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`);
      if (!res.ok) {
        const data = await res.json();
        if (res.status !== 404) {
          console.error("fetchSignedUrl error:", data.error);
        }
        return null;
      }
      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error("fetchSignedUrl network error:", err);
      return null;
    }
  }, []);

  const handleCardClick = async (doc: DocumentRow) => {
    setSelectedDoc(doc);
    setShowDeleteConfirm(false);
    setError(null);
    setPreviewUrl(null);
    setPreviewError(null);
    setShowPreview(false);

    // Auto-fetch preview URL for previewable files
    const previewType = isPreviewable(doc.file_type);
    if (previewType && doc.file_path && doc.file_path !== "pending-upload") {
      setPreviewLoading(true);
      const url = await fetchSignedUrl(doc.id);
      setPreviewLoading(false);
      if (url) {
        setPreviewUrl(url);
        setShowPreview(true);
      } else {
        setPreviewError(t("previewLoadError"));
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedDoc(null);
    setShowDeleteConfirm(false);
    setError(null);
    setPreviewUrl(null);
    setPreviewError(null);
    setShowPreview(false);
    setPreviewLoading(false);
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
        throw new Error(data.error || t("failedToDeleteDocument"));
      }

      handleCloseModal();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToDeleteDocument"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (doc: DocumentRow) => {
    const url = previewUrl || (await fetchSignedUrl(doc.id));
    if (url) {
      window.open(url, "_blank");
    } else {
      setError(t("downloadUrlError"));
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
              .map((tg) => tg.trim())
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
        throw new Error(data.error || t("failedToUploadDocument"));
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
        err instanceof Error ? err.message : t("failedToUploadDocument")
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
          <h3>{t("uploadDocument")}</h3>
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
                  {formatFileSize(uploadFile.size)} — {t("clickToChange")}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <Upload
                  size={32}
                  style={{ color: "var(--muted)", marginBottom: "8px" }}
                />
                <div style={{ fontWeight: 500 }}>
                  {t("dropFileHereOrBrowse")}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  {t("supportedFileTypes")}
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("documentName")}</label>
            <input
              className="ticket-form-input"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder={t("documentNamePlaceholder")}
            />
          </div>

          <div className="ticket-form-row">
            {/* Category */}
            <div className="ticket-form-group">
              <label className="ticket-form-label">{t("categoryRequired")}</label>
              <select
                className="ticket-form-select"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                <option value="plan">{t("categoryPlans")}</option>
                <option value="spec">{t("categorySpecifications")}</option>
                <option value="contract">{t("categoryContracts")}</option>
                <option value="photo">{t("categoryPhotos")}</option>
                <option value="report">{t("categoryReports")}</option>
                <option value="correspondence">{t("categoryCorrespondence")}</option>
              </select>
            </div>

            {/* Project */}
            <div className="ticket-form-group">
              <label className="ticket-form-label">{t("project")}</label>
              <select
                className="ticket-form-select"
                value={uploadProjectId}
                onChange={(e) => setUploadProjectId(e.target.value)}
              >
                <option value="">{t("none")}</option>
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
              <label className="ticket-form-label">{t("folderPath")}</label>
              <input
                className="ticket-form-input"
                value={uploadFolderPath}
                onChange={(e) => setUploadFolderPath(e.target.value)}
                placeholder="/Project/Drawings"
              />
            </div>

            {/* Tags */}
            <div className="ticket-form-group">
              <label className="ticket-form-label">{t("tags")}</label>
              <input
                className="ticket-form-input"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder={t("tagsPlaceholder")}
              />
            </div>
          </div>

          <div className="ticket-form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowUploadModal(false)}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!uploadFile || isUploading}
            >
              {isUploading ? t("uploading") : t("uploadDocument")}
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
        <div className="doc-empty-title">{t("noDocumentsFound")}</div>
        <div className="doc-empty-desc">
          {hasFilters
            ? t("noDocumentsMatchFilters")
            : t("uploadFirstDocumentDesc")}
        </div>
        {!hasFilters && (
          <button
            className="ui-btn ui-btn-primary ui-btn-md"
            style={{ marginTop: "12px" }}
            onClick={openUploadModal}
          >
            <Upload size={16} />
            {t("uploadDocument")}
          </button>
        )}
        {uploadModal}
      </div>
    );
  }

  return (
    <>
      <div className="doc-count">
        {t("documentCount", { count: documents.length })}
        {currentFolder && (
          <span className="doc-count-folder"> {t("inFolder", { folder: currentFolder })}</span>
        )}
      </div>
      <div className="doc-grid">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onClick={() => handleCardClick(doc)}
            categoryLabels={categoryLabels}
            dateLocale={dateLocale}
          />
        ))}
      </div>

      {/* Detail / Preview Modal */}
      {selectedDoc && (
        <div className="ticket-modal-overlay" onClick={handleCloseModal}>
          <div
            className="ticket-modal doc-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                <div className={getFileIconClass(selectedDoc.file_type)} style={{ width: 32, height: 32, borderRadius: 6 }}>
                  {getFileIcon(selectedDoc.file_type)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedDoc.name}
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {formatFileSize(selectedDoc.file_size)}
                    {selectedDoc.version > 1 && <span> &bull; {t("version", { number: selectedDoc.version })}</span>}
                    <span> &bull; {categoryLabels[selectedDoc.category] ?? selectedDoc.category}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="ticket-modal-close"
                aria-label={t("close")}
              >
                <X size={20} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="doc-detail-actions">
              {isPreviewable(selectedDoc.file_type) && (
                <button
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={previewLoading}
                >
                  <Eye size={15} />
                  {showPreview ? t("hidePreview") : t("preview")}
                </button>
              )}
              <button
                className="ui-btn ui-btn-primary ui-btn-sm"
                onClick={() => handleDownload(selectedDoc)}
              >
                <Download size={15} />
                {t("download")}
              </button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn-ghost ui-btn-sm"
                >
                  <ExternalLink size={15} />
                  {t("openInNewTab")}
                </a>
              )}
            </div>

            {/* Preview Area */}
            {previewLoading && (
              <div className="doc-preview-loading">
                <Loader2 size={24} className="doc-spinner" />
                <span>{t("loadingPreview")}</span>
              </div>
            )}

            {previewError && !previewUrl && (
              <div className="doc-preview-error">
                {previewError}
              </div>
            )}

            {showPreview && previewUrl && (
              <div className="doc-preview-container">
                {isPreviewable(selectedDoc.file_type) === "pdf" ? (
                  <iframe
                    src={previewUrl}
                    className="doc-preview-iframe"
                    title={`${t("preview")}: ${selectedDoc.name}`}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={selectedDoc.name}
                    className="doc-preview-image"
                  />
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="ticket-detail-body">
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("category")}</span>
                <span className={categoryBadgeClass[selectedDoc.category] ?? "badge badge-gray"}>
                  {categoryLabels[selectedDoc.category] ?? selectedDoc.category}
                </span>
              </div>

              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("fileType")}</span>
                <span>{selectedDoc.file_type}</span>
              </div>

              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("uploadedBy")}</span>
                <span>
                  {(selectedDoc.uploader as { full_name: string; email: string } | null)?.full_name ??
                    (selectedDoc.uploader as { full_name: string; email: string } | null)?.email ??
                    t("unknown")}
                </span>
              </div>

              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("uploadDate")}</span>
                <span>
                  {new Date(selectedDoc.created_at).toLocaleDateString(dateLocale, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {selectedDoc.project && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("project")}</span>
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

              {selectedDoc.property && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("property")}</span>
                  <Link
                    href={`/properties/${(selectedDoc.property as { id: string; name: string }).id}`}
                    className="doc-card-link"
                    onClick={handleCloseModal}
                  >
                    {(selectedDoc.property as { id: string; name: string }).name}
                  </Link>
                </div>
              )}

              {selectedDoc.folder_path && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("folder")}</span>
                  <span style={{ fontSize: "0.85rem" }}>/{selectedDoc.folder_path}</span>
                </div>
              )}

              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("tags")}</span>
                  <div className="doc-card-tags">
                    {selectedDoc.tags.map((tag) => (
                      <span key={tag} className="doc-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && <div className="ticket-form-error">{error}</div>}

              {/* Delete Confirmation */}
              {showDeleteConfirm && (
                <div className="ticket-delete-confirm">
                  <p>
                    {t("confirmDeleteDocument", { name: selectedDoc.name })}
                  </p>
                  <div className="ticket-delete-actions">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary"
                      disabled={isDeleting}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="btn-danger"
                      disabled={isDeleting}
                    >
                      {isDeleting ? t("deleting") : t("deleteDocument")}
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
                    {t("deleteDocument")}
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
  categoryLabels,
  dateLocale,
}: {
  doc: DocumentRow;
  onClick: () => void;
  categoryLabels: Record<string, string>;
  dateLocale: string;
}) {
  const t = useTranslations("app");
  const uploaderName =
    (doc.uploader as { full_name: string; email: string } | null)?.full_name ??
    (doc.uploader as { full_name: string; email: string } | null)?.email ??
    t("unknown");

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
          <span className="doc-card-label">{t("uploadedBy")}</span>
          <span>{uploaderName}</span>
        </div>
        <div className="doc-card-detail">
          <span className="doc-card-label">{t("date")}</span>
          <span>
            {new Date(doc.created_at).toLocaleDateString(dateLocale, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {projectInfo && (
          <div className="doc-card-detail">
            <span className="doc-card-label">{t("project")}</span>
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
            <span className="doc-card-label">{t("property")}</span>
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
