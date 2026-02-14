"use client";

import type { DocumentRow } from "@/lib/queries/documents";

interface RevisionsPanelProps {
  versions: DocumentRow[];
  currentDocId: string | null;
  onSelectVersion: (doc: DocumentRow) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RevisionsPanel({
  versions,
  currentDocId,
  onSelectVersion,
}: RevisionsPanelProps) {
  if (versions.length === 0) {
    return (
      <div className="plan-room-rev-empty">
        No revision history available.
      </div>
    );
  }

  return (
    <div className="plan-room-rev-list">
      {versions.map((v) => {
        const isCurrent = v.id === currentDocId;
        return (
          <div
            key={v.id}
            className={`plan-room-rev-item${isCurrent ? " current" : ""}`}
            onClick={() => onSelectVersion(v)}
          >
            <div className={`plan-room-rev-num${isCurrent ? " current" : " past"}`}>
              {v.version}
            </div>
            <div className="plan-room-rev-info">
              <div className="plan-room-rev-title">
                {v.revision_label
                  ? `Rev ${v.revision_label}`
                  : `Version ${v.version}`}
              </div>
              <div className="plan-room-rev-date">
                {formatDate(v.created_at)}
                {isCurrent && " — Current"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
