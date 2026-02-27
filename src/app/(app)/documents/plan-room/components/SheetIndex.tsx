"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DocumentRow } from "@/lib/queries/documents";
import { DISCIPLINES } from "../types";

interface SheetIndexProps {
  documents: DocumentRow[];
  selectedDocId: string | null;
  onSelectDoc: (doc: DocumentRow) => void;
}

export default function SheetIndex({
  documents,
  selectedDocId,
  onSelectDoc,
}: SheetIndexProps) {
  const t = useTranslations("documents");
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set());

  // Group documents by discipline
  const grouped = new Map<string, DocumentRow[]>();
  for (const doc of documents) {
    const disc = doc.discipline || "other";
    if (!grouped.has(disc)) grouped.set(disc, []);
    grouped.get(disc)!.push(doc);
  }

  // Sort disciplines to match the DISCIPLINES order
  const orderedKeys: string[] = [];
  for (const d of DISCIPLINES) {
    if (grouped.has(d.value)) orderedKeys.push(d.value);
  }
  // Add any that aren't in the standard list
  for (const key of grouped.keys()) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  }

  const toggleSet = (key: string) => {
    setCollapsedSets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getDisciplineInfo = (key: string) => {
    const info = DISCIPLINES.find((d) => d.value === key);
    return info || { label: key.charAt(0).toUpperCase() + key.slice(1), letter: key.charAt(0).toUpperCase() };
  };

  return (
    <div className="plan-room-sheet-index">
      {orderedKeys.map((discKey) => {
        const docs = grouped.get(discKey) || [];
        const info = getDisciplineInfo(discKey);
        const isCollapsed = collapsedSets.has(discKey);

        return (
          <div key={discKey} className="plan-room-sheet-set">
            <div
              className="plan-room-sheet-set-title"
              onClick={() => toggleSet(discKey)}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                  transition: "transform 0.15s",
                  flexShrink: 0,
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {info.label}
              <span className="plan-room-sheet-set-count">{docs.length}</span>
            </div>
            {!isCollapsed && (
              <div className="plan-room-sheet-set-items">
                {docs.map((doc) => {
                  const isActive = doc.id === selectedDocId;
                  return (
                    <div
                      key={doc.id}
                      className={`plan-room-sheet-item${isActive ? " active" : ""}`}
                      onClick={() => onSelectDoc(doc)}
                    >
                      <div className={`plan-room-sheet-icon${isActive ? " active" : ""}`}>
                        {info.letter}
                      </div>
                      <div className="plan-room-sheet-detail">
                        <div className={`plan-room-sheet-number${isActive ? " active" : ""}`}>
                          {doc.name}
                        </div>
                        {doc.revision_label && (
                          <span className="plan-room-sheet-rev">
                            {t("planRoom.sheetIndex.rev", { label: doc.revision_label })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {documents.length === 0 && (
        <div className="plan-room-sidebar-empty">
          {t("planRoom.sheetIndex.noSheets")}
        </div>
      )}
    </div>
  );
}
