"use client";

import { useTranslations } from "next-intl";
import type { AnnotationRow } from "../hooks/useAnnotations";
import { formatDateSafe } from "@/lib/utils/format";

interface MarkupsListProps {
  annotations: AnnotationRow[];
  pageNumber: number;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onDeleteAnnotation: (id: string) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return formatDateSafe(dateStr);
}

export default function MarkupsList({
  annotations,
  pageNumber,
  selectedAnnotationId,
  onSelectAnnotation,
  onDeleteAnnotation,
}: MarkupsListProps) {
  const t = useTranslations("documents");
  const pageAnnotations = annotations.filter((a) => a.page_number === pageNumber);

  const TYPE_LABELS: Record<string, string> = {
    line: t("planRoom.markups.typeLine"),
    rectangle: t("planRoom.markups.typeRectangle"),
    circle: t("planRoom.markups.typeCircle"),
    text: t("planRoom.markups.typeTextNote"),
    arrow: t("planRoom.markups.typeArrowAnnotation"),
    cloud: t("planRoom.markups.typeRevisionCloud"),
  };

  if (pageAnnotations.length === 0) {
    return (
      <div className="plan-room-mu-empty">
        {t("planRoom.markups.noMarkups")}
      </div>
    );
  }

  return (
    <div className="plan-room-mu-list">
      {pageAnnotations.map((a) => (
        <div
          key={a.id}
          className={`plan-room-mu-item${a.id === selectedAnnotationId ? " selected" : ""}`}
          onClick={() => onSelectAnnotation(a.id)}
        >
          <div className="plan-room-mu-type" style={{ color: a.color }}>
            <span
              className="plan-room-mu-dot"
              style={{ background: a.color }}
            />
            {TYPE_LABELS[a.annotation_type] || a.annotation_type}
          </div>
          {a.text_content && (
            <div className="plan-room-mu-desc">{a.text_content}</div>
          )}
          <div className="plan-room-mu-meta">
            {a.created_by_name || t("planRoom.markups.unknown")} &mdash; {formatDate(a.created_at)}
            <button
              className="plan-room-mu-delete"
              title={t("planRoom.markups.deleteMarkup")}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAnnotation(a.id);
              }}
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
