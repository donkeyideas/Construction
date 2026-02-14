"use client";

import type { DocumentRow } from "@/lib/queries/documents";

interface PlanRoomHeaderProps {
  selectedDoc: DocumentRow | null;
  projectList: { id: string; name: string }[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  onUploadClick: () => void;
}

export default function PlanRoomHeader({
  selectedDoc,
  projectList,
  selectedProjectId,
  onProjectChange,
  onUploadClick,
}: PlanRoomHeaderProps) {
  const projectName = selectedProjectId
    ? projectList.find((p) => p.id === selectedProjectId)?.name
    : null;

  return (
    <div className="plan-room-page-header">
      <div className="plan-room-page-header-left">
        <h2 className="plan-room-page-title">Plan Room</h2>
        {selectedDoc && (
          <div className="plan-room-active-sheet-info">
            <span className="plan-room-active-sheet-name">{selectedDoc.name}</span>
            {selectedDoc.revision_label && (
              <span className="plan-room-rev-badge">
                Rev {selectedDoc.revision_label}
              </span>
            )}
            {!selectedDoc.revision_label && selectedDoc.version > 1 && (
              <span className="plan-room-rev-badge">
                v{selectedDoc.version}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="plan-room-page-header-right">
        <select
          className="plan-room-filter-select"
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
        >
          <option value="">All Projects</option>
          {projectList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {projectName && (
          <span className="plan-room-project-label">{projectName}</span>
        )}
        <button className="plan-room-upload-btn" onClick={onUploadClick}>
          Upload
        </button>
      </div>
    </div>
  );
}
