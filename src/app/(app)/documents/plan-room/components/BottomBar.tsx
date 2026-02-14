"use client";

import type { DocumentRow } from "@/lib/queries/documents";

interface BottomBarProps {
  selectedDoc: DocumentRow | null;
  currentPage: number;
  totalPages: number;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BottomBar({
  selectedDoc,
  currentPage,
  totalPages,
}: BottomBarProps) {
  if (!selectedDoc) return null;

  return (
    <div className="plan-room-bottom-bar">
      <div className="plan-room-bottom-bar-left">
        <span>
          <strong>{selectedDoc.name}</strong>
        </span>
        {totalPages > 0 && (
          <span>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>
      <div className="plan-room-bottom-bar-right">
        <span>Last uploaded: {formatDate(selectedDoc.updated_at || selectedDoc.created_at)}</span>
        {selectedDoc.uploader?.full_name && (
          <span>Uploaded by: {selectedDoc.uploader.full_name}</span>
        )}
      </div>
    </div>
  );
}
