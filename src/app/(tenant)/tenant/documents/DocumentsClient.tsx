"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, FileText, Download, X, ExternalLink, Upload } from "lucide-react";
import type { TenantDocument } from "@/lib/queries/tenant-portal";
import { useTranslations, useLocale } from "next-intl";
import { formatDateSafe } from "@/lib/utils/format";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null): string {
  if (!fileType) return "DOC";
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return "PDF";
  if (t.includes("xls") || t.includes("spreadsheet")) return "XLS";
  if (t.includes("doc") || t.includes("word")) return "DOC";
  if (
    t.includes("jpg") ||
    t.includes("jpeg") ||
    t.includes("png") ||
    t.includes("image")
  )
    return "IMG";
  if (t.includes("dwg") || t.includes("cad")) return "DWG";
  return "DOC";
}

export default function DocumentsClient({
  documents,
}: {
  documents: TenantDocument[];
}) {
  const t = useTranslations("tenant");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const router = useRouter();

  const [selected, setSelected] = useState<TenantDocument | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "--";
    return formatDateSafe(dateStr);
  }

  function getCategoryLabel(cat: string | null): string {
    switch (cat) {
      case "plan":
        return t("catPlan");
      case "spec":
        return t("catSpec");
      case "contract":
        return t("catContract");
      case "photo":
        return t("catPhoto");
      case "report":
        return t("catReport");
      case "correspondence":
        return t("catCorrespondence");
      default:
        return cat || t("catGeneralDoc");
    }
  }

  function closeModal() {
    setSelected(null);
    setDownloadError("");
  }

  function openUploadModal() {
    setUploadFile(null);
    setUploadName("");
    setUploadError("");
    setShowUploadModal(true);
  }

  function closeUploadModal() {
    setShowUploadModal(false);
    setUploadError("");
    setUploadFile(null);
    setUploadName("");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadName(file.name);
      setUploadError("");
    }
  }

  async function handleUpload() {
    if (!uploadFile) {
      setUploadError(t("noFileSelected"));
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName || uploadFile.name);

      const res = await fetch("/api/tenant/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("failedUpload"));
      }

      closeUploadModal();
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: TenantDocument) {
    setDownloading(true);
    setDownloadError("");

    try {
      const res = await fetch(
        `/api/tenant/documents/${doc.document_id}/download`
      );
      const data = await res.json();

      if (!res.ok) {
        setDownloadError(data.error || t("failedDownload"));
        return;
      }

      window.open(data.url, "_blank");
    } catch {
      setDownloadError(t("downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, margin: 0 }}>
            {t("documentsTitle")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 2 }}>
            {t("documentsSubtitle")}
          </p>
        </div>
        <button
          className="ui-btn ui-btn-md ui-btn-primary"
          onClick={openUploadModal}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Upload size={16} />
          {t("uploadDocument")}
        </button>
      </div>

      {documents.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="card"
              style={{ padding: 20, cursor: "pointer" }}
              onClick={() => {
                setSelected(doc);
                setDownloadError("");
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "var(--surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-blue)",
                      flexShrink: 0,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {doc.doc_name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--muted)",
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{getCategoryLabel(doc.category)}</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{t("shared", { date: formatDate(doc.shared_at) })}</span>
                    </div>
                  </div>
                </div>
                <button
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(doc);
                  }}
                  disabled={downloading}
                >
                  <Download size={14} />
                  {t("download")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: "var(--muted)", marginBottom: 12 }}>
            <FolderOpen size={48} />
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 600, marginBottom: 6 }}>
            {t("noDocuments")}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            {t("noDocumentsDesc")}
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="tenant-modal-overlay" onClick={closeUploadModal}>
          <div className="tenant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                {t("uploadDocument")}
              </h3>
              <button
                className="tenant-modal-close"
                onClick={closeUploadModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 16px 0" }}>
              {t("uploadDocumentDesc")}
            </p>

            {uploadError && (
              <div className="tenant-alert tenant-alert-error">{uploadError}</div>
            )}

            <div className="tenant-field">
              <label className="tenant-label">{t("selectFile")}</label>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: 8,
                  padding: uploadFile ? "12px 16px" : "32px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                {uploadFile ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-blue)",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getFileIcon(uploadFile.type)}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {uploadFile.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {formatFileSize(uploadFile.size)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={24} style={{ color: "var(--muted)", marginBottom: 8 }} />
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      {t("clickToSelectFile")}
                    </div>
                  </>
                )}
              </div>
            </div>

            {uploadFile && (
              <div className="tenant-field">
                <label className="tenant-label">{t("documentName")}</label>
                <input
                  type="text"
                  className="tenant-form-input"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  disabled={uploading}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                className="ui-btn ui-btn-md ui-btn-outline"
                onClick={closeUploadModal}
                disabled={uploading}
              >
                {t("cancel")}
              </button>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {uploading ? t("uploading") : (
                  <>
                    <Upload size={15} />
                    {t("uploadDocument")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selected && (
        <div className="tenant-modal-overlay" onClick={closeModal}>
          <div className="tenant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tenant-modal-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <FileText
                  size={20}
                  style={{ color: "var(--color-blue)", flexShrink: 0 }}
                />
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.05rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selected.doc_name}
                </h3>
              </div>
              <button
                className="tenant-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {downloadError && (
              <div className="tenant-alert tenant-alert-error">
                {downloadError}
              </div>
            )}

            <div className="tenant-detail-row">
              <span className="tenant-detail-label">{t("fileName")}</span>
              <span>{selected.doc_name}</span>
            </div>
            <div className="tenant-detail-row">
              <span className="tenant-detail-label">{t("type")}</span>
              <span>{selected.file_type?.toUpperCase() || "--"}</span>
            </div>
            <div className="tenant-detail-row">
              <span className="tenant-detail-label">{t("category")}</span>
              <span>{getCategoryLabel(selected.category)}</span>
            </div>
            <div className="tenant-detail-row">
              <span className="tenant-detail-label">{t("fileSize")}</span>
              <span>{formatFileSize(selected.file_size)}</span>
            </div>
            <div className="tenant-detail-row">
              <span className="tenant-detail-label">{t("sharedOn")}</span>
              <span>
                {selected.shared_at
                  ? formatDateSafe(selected.shared_at)
                  : "--"}
              </span>
            </div>
            <div
              className="tenant-detail-row"
              style={{ borderBottom: "none" }}
            >
              <span className="tenant-detail-label">{t("created")}</span>
              <span>{formatDate(selected.doc_created_at)}</span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="ui-btn ui-btn-md ui-btn-outline"
                onClick={closeModal}
              >
                {t("close")}
              </button>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                onClick={() => handleDownload(selected)}
                disabled={downloading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {downloading ? (
                  t("downloading")
                ) : (
                  <>
                    <ExternalLink size={15} />
                    {t("openDownload")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
