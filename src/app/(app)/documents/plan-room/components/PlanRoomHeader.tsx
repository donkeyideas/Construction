"use client";

import { useTranslations } from "next-intl";
import type { DocumentRow } from "@/lib/queries/documents";
import PresenceIndicator from "@/components/PresenceIndicator";

interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  online_at: string;
}

interface PlanRoomHeaderProps {
  selectedDoc: DocumentRow | null;
  projectList: { id: string; name: string }[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  onUploadClick: () => void;
  presenceUsers?: PresenceUser[];
}

export default function PlanRoomHeader({
  selectedDoc,
  projectList,
  selectedProjectId,
  onProjectChange,
  onUploadClick,
  presenceUsers,
}: PlanRoomHeaderProps) {
  const t = useTranslations("documents");
  const projectName = selectedProjectId
    ? projectList.find((p) => p.id === selectedProjectId)?.name
    : null;

  return (
    <div className="plan-room-page-header">
      <div className="plan-room-page-header-left">
        <h2 className="plan-room-page-title">{t("planRoom.header.title")}</h2>
        {selectedDoc && (
          <div className="plan-room-active-sheet-info">
            <span className="plan-room-active-sheet-name">{selectedDoc.name}</span>
            {selectedDoc.revision_label && (
              <span className="plan-room-rev-badge">
                {t("planRoom.header.rev", { label: selectedDoc.revision_label })}
              </span>
            )}
            {!selectedDoc.revision_label && selectedDoc.version > 1 && (
              <span className="plan-room-rev-badge">
                {t("planRoom.header.version", { version: selectedDoc.version })}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="plan-room-page-header-right">
        {presenceUsers && presenceUsers.length > 0 && (
          <PresenceIndicator users={presenceUsers} maxShow={4} />
        )}
        <select
          className="plan-room-filter-select"
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
        >
          <option value="">{t("planRoom.header.allProjects")}</option>
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
          {t("planRoom.header.upload")}
        </button>
      </div>
    </div>
  );
}
