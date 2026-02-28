"use client";

import { useTranslations } from "next-intl";
import { FileText, FileSpreadsheet, Image, File, CheckSquare, Square } from "lucide-react";
import type { DocumentRow } from "@/lib/queries/documents";
import { formatDateSafe } from "@/lib/utils/format";

interface ThumbnailGridProps {
  documents: DocumentRow[];
  selectedIds: Set<string>;
  onSelect: (docId: string) => void;
  onToggleSelect: (docId: string) => void;
  onOpenDocument: (doc: DocumentRow) => void;
}

function getFileIcon(fileType: string) {
  const ft = fileType?.toLowerCase() || "";
  if (ft === "pdf") return { icon: FileText, className: "file-icon-pdf" };
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ft))
    return { icon: Image, className: "file-icon-img" };
  if (["xls", "xlsx", "csv"].includes(ft))
    return { icon: FileSpreadsheet, className: "file-icon-xls" };
  return { icon: File, className: "file-icon-default" };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return formatDateSafe(dateStr);
}

function getFileTypeBadge(fileType: string): string {
  const ft = fileType?.toUpperCase() || "";
  return ft || "FILE";
}

export default function ThumbnailGrid({
  documents,
  selectedIds,
  onSelect,
  onToggleSelect,
  onOpenDocument,
}: ThumbnailGridProps) {
  const t = useTranslations("documents");

  if (documents.length === 0) {
    return (
      <div className="thumbnail-grid-empty">
        <FileText size={32} />
        <p>{t("planRoom.thumbnailGrid.noDocuments")}</p>
      </div>
    );
  }

  return (
    <div className="thumbnail-grid">
      {documents.map((doc) => {
        const { icon: Icon, className: iconClass } = getFileIcon(doc.file_type);
        const isSelected = selectedIds.has(doc.id);

        return (
          <div
            key={doc.id}
            className={`thumbnail-card ${isSelected ? "thumbnail-card-selected" : ""}`}
            onClick={() => onOpenDocument(doc)}
          >
            {/* Checkbox */}
            <button
              className="thumbnail-card-checkbox"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(doc.id);
              }}
              aria-label={isSelected ? t("planRoom.thumbnailGrid.deselect") : t("planRoom.thumbnailGrid.select")}
            >
              {isSelected ? (
                <CheckSquare size={16} />
              ) : (
                <Square size={16} />
              )}
            </button>

            {/* Thumbnail / Icon */}
            <div className={`thumbnail-card-preview ${iconClass}`}>
              {doc.thumbnail_url ? (
                <img
                  src={doc.thumbnail_url}
                  alt={doc.name}
                  className="thumbnail-card-img"
                />
              ) : (
                <Icon size={36} />
              )}
            </div>

            {/* Info */}
            <div className="thumbnail-card-info">
              <div className="thumbnail-card-name" title={doc.name}>
                {doc.name}
              </div>
              <div className="thumbnail-card-meta">
                <span className="thumbnail-card-type-badge">
                  {getFileTypeBadge(doc.file_type)}
                </span>
                <span className="thumbnail-card-date">
                  {formatDate(doc.created_at)}
                </span>
              </div>
              {doc.discipline && (
                <span className="thumbnail-card-discipline">
                  {doc.discipline}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
