"use client";

import { useState } from "react";
import { FolderOpen, FileText, Download, X, ExternalLink } from "lucide-react";
import type { TenantDocument } from "@/lib/queries/tenant-portal";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCategoryLabel(cat: string | null): string {
  switch (cat) {
    case "plan":
      return "Plan / Drawing";
    case "spec":
      return "Specification";
    case "contract":
      return "Contract";
    case "photo":
      return "Photo";
    case "report":
      return "Report";
    case "correspondence":
      return "Correspondence";
    default:
      return cat || "General";
  }
}

function getFileIcon(fileType: string | null): string {
  if (!fileType) return "DOC";
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return "PDF";
  if (t.includes("xls") || t.includes("spreadsheet")) return "XLS";
  if (t.includes("doc") || t.includes("word")) return "DOC";
  if (t.includes("jpg") || t.includes("jpeg") || t.includes("png") || t.includes("image")) return "IMG";
  if (t.includes("dwg") || t.includes("cad")) return "DWG";
  return "DOC";
}

export default function DocumentsClient({
  documents,
}: {
  documents: TenantDocument[];
}) {
  const [selected, setSelected] = useState<TenantDocument | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  function openModal(doc: TenantDocument) {
    setSelected(doc);
    setDownloadError("");
  }

  function closeModal() {
    setSelected(null);
    setDownloadError("");
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
        setDownloadError(data.error || "Failed to get download link");
        return;
      }

      window.open(data.url, "_blank");
    } catch {
      setDownloadError("Something went wrong. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Documents</h2>
          <p className="fin-header-sub">
            Access documents shared with you by your property manager.
          </p>
        </div>
      </div>

      {documents.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="card maint-card"
              style={{ padding: 20, cursor: "pointer" }}
              onClick={() => openModal(doc)}
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
                      <span>Shared {formatDate(doc.shared_at)}</span>
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
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <FolderOpen size={48} />
            </div>
            <div className="fin-empty-title">No Documents</div>
            <div className="fin-empty-desc">
              No documents have been shared with you yet. Documents from your
              property manager will appear here.
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selected && (
        <div className="maint-modal-overlay" onClick={closeModal}>
          <div className="maint-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="maint-modal-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <FileText size={20} style={{ color: "var(--color-blue)", flexShrink: 0 }} />
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
                className="maint-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {downloadError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.1)",
                  color: "var(--color-red)",
                  fontSize: "0.85rem",
                  marginBottom: 16,
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {downloadError}
              </div>
            )}

            <div className="maint-detail-row">
              <span className="maint-detail-label">File Name</span>
              <span className="maint-detail-value">{selected.doc_name}</span>
            </div>

            <div className="maint-detail-row">
              <span className="maint-detail-label">Type</span>
              <span className="maint-detail-value">
                {selected.file_type?.toUpperCase() || "--"}
              </span>
            </div>

            <div className="maint-detail-row">
              <span className="maint-detail-label">Category</span>
              <span className="maint-detail-value">
                {getCategoryLabel(selected.category)}
              </span>
            </div>

            <div className="maint-detail-row">
              <span className="maint-detail-label">File Size</span>
              <span className="maint-detail-value">
                {formatFileSize(selected.file_size)}
              </span>
            </div>

            <div className="maint-detail-row">
              <span className="maint-detail-label">Shared On</span>
              <span className="maint-detail-value">
                {selected.shared_at
                  ? new Date(selected.shared_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "--"}
              </span>
            </div>

            <div className="maint-detail-row" style={{ borderBottom: "none" }}>
              <span className="maint-detail-label">Created</span>
              <span className="maint-detail-value">
                {formatDate(selected.doc_created_at)}
              </span>
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
                Close
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
                  "Downloading..."
                ) : (
                  <>
                    <ExternalLink size={15} />
                    Open / Download
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
