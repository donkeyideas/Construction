"use client";

import type { AnnotationRow } from "../hooks/useAnnotations";

interface MarkupsListProps {
  annotations: AnnotationRow[];
  pageNumber: number;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onDeleteAnnotation: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  line: "Line",
  rectangle: "Rectangle",
  circle: "Circle",
  text: "Text Note",
  arrow: "Arrow Annotation",
  cloud: "Revision Cloud",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MarkupsList({
  annotations,
  pageNumber,
  selectedAnnotationId,
  onSelectAnnotation,
  onDeleteAnnotation,
}: MarkupsListProps) {
  const pageAnnotations = annotations.filter((a) => a.page_number === pageNumber);

  if (pageAnnotations.length === 0) {
    return (
      <div className="plan-room-mu-empty">
        No markups on this page yet.
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
            {a.created_by_name || "Unknown"} &mdash; {formatDate(a.created_at)}
            <button
              className="plan-room-mu-delete"
              title="Delete markup"
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
