"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Upload,
  Plus,
  FolderOpen,
  X,
  AlertTriangle,
  Download,
  Trash2,
} from "lucide-react";
import type { DocumentRow, DrawingSetRow } from "@/lib/queries/documents";
import type { AnnotationTool, MarkupShape } from "./types";
import { DISCIPLINES } from "./types";
import PlanRoomUploadModal from "./PlanRoomUploadModal";

// Components
import PlanRoomHeader from "./components/PlanRoomHeader";
import PlanRoomToolbar from "./components/PlanRoomToolbar";
import BlueprintViewer from "./components/BlueprintViewer";
import RightPanel, { PanelSection } from "./components/RightPanel";
import SheetIndex from "./components/SheetIndex";
import MarkupsList from "./components/MarkupsList";
import RevisionsPanel from "./components/RevisionsPanel";
import BottomBar from "./components/BottomBar";

// Hooks
import { usePdfViewer } from "./hooks/usePdfViewer";
import { useAnnotations } from "./hooks/useAnnotations";
import type { AnnotationRow } from "./hooks/useAnnotations";
import { usePresence, useRealtimeSubscription } from "@/lib/supabase/realtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanRoomClientProps {
  documents: DocumentRow[];
  drawingSets: DrawingSetRow[];
  projectList: { id: string; name: string }[];
  companyId: string;
  userId: string;
  userName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanRoomClient({
  documents,
  drawingSets,
  projectList,
  companyId,
  userId,
  userName,
}: PlanRoomClientProps) {
  const router = useRouter();
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // ------- Selection & Filtering -------
  const [selectedId, setSelectedId] = useState<string | null>(
    documents[0]?.id ?? null
  );
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");

  // ------- Modal state -------
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewSetModal, setShowNewSetModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ------- New set form -------
  const [newSetName, setNewSetName] = useState("");
  const [newSetDesc, setNewSetDesc] = useState("");
  const [newSetDiscipline, setNewSetDiscipline] = useState("");
  const [newSetProject, setNewSetProject] = useState("");
  const [newSetLoading, setNewSetLoading] = useState(false);

  // ------- Revision form -------
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionLabel, setRevisionLabel] = useState("");
  const [revisionLoading, setRevisionLoading] = useState(false);

  // ------- Delete -------
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ------- Viewer state -------
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ------- Tools & Markup -------
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeShape, setActiveShape] = useState<MarkupShape>("rectangle");
  const [activeColor, setActiveColor] = useState("#dc2626");

  // ------- PDF Viewer Hook -------
  const pdfViewer = usePdfViewer();

  // ------- Annotations Hook -------
  const annotationsHook = useAnnotations({ companyId, userId, userName });

  // ------- Presence: show who's viewing -------
  const presenceUsers = usePresence(
    selectedId ? `plan-room:${selectedId}` : "plan-room:lobby",
    { userId, name: userName }
  );

  // ------- Real-time annotation sync -------
  useRealtimeSubscription<Record<string, unknown>>(
    "plan_room_annotations",
    { column: "document_id", value: selectedId || "" },
    useCallback(
      (newRow: Record<string, unknown>) => {
        if (newRow.created_by !== userId) {
          annotationsHook.mergeRemoteAnnotation(newRow as unknown as AnnotationRow);
        }
      },
      [userId, annotationsHook.mergeRemoteAnnotation]
    ),
    useCallback(
      (updatedRow: Record<string, unknown>) => {
        if (updatedRow.created_by !== userId) {
          annotationsHook.updateRemoteAnnotation(updatedRow as unknown as AnnotationRow);
        }
      },
      [userId, annotationsHook.updateRemoteAnnotation]
    ),
    useCallback(
      (deletedRow: Record<string, unknown>) => {
        annotationsHook.removeRemoteAnnotation(deletedRow.id as string);
      },
      [annotationsHook.removeRemoteAnnotation]
    )
  );

  // ------- Filtered documents -------
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (projectFilter && doc.project_id !== projectFilter) return false;
      if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [documents, projectFilter, search]);

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;

  // ------- Version history -------
  const versionHistory = useMemo(() => {
    if (!selectedDoc) return [];
    return documents
      .filter(
        (d) =>
          d.name === selectedDoc.name &&
          d.project_id === selectedDoc.project_id &&
          d.drawing_set_id === selectedDoc.drawing_set_id
      )
      .sort((a, b) => b.version - a.version);
  }, [selectedDoc, documents]);

  // ------- Sorted document list for navigation -------
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const currentIndex = sortedFiltered.findIndex((d) => d.id === selectedId);

  // ------- Fetch preview URL when doc changes -------
  useEffect(() => {
    if (!selectedDoc) {
      setPreviewUrl(null);
      return;
    }

    if (!selectedDoc.file_path || selectedDoc.file_path === "pending-upload") {
      setPreviewUrl(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    pdfViewer.resetForNewDoc();

    fetch(`/api/documents/plan-room/${selectedDoc.id}/download`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.url) {
          setPreviewUrl(data.url);
        } else {
          setPreviewUrl(null);
          setPreviewError(data.error || t("fileNotAvailable"));
        }
      })
      .catch((err) => {
        console.error("Download network error:", err);
        setPreviewUrl(null);
        setPreviewError(err.message || t("networkError"));
      })
      .finally(() => setPreviewLoading(false));

    // Fetch annotations
    annotationsHook.fetchAnnotations(selectedDoc.id);
  }, [selectedDoc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------- Handlers -------

  const handleSelectDoc = useCallback((doc: DocumentRow) => {
    setSelectedId(doc.id);
    annotationsHook.setSelectedId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrevSheet = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedId(sortedFiltered[currentIndex - 1].id);
    }
  }, [currentIndex, sortedFiltered]);

  const handleNextSheet = useCallback(() => {
    if (currentIndex < sortedFiltered.length - 1) {
      setSelectedId(sortedFiltered[currentIndex + 1].id);
    }
  }, [currentIndex, sortedFiltered]);

  const handleDownload = useCallback(async () => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/documents/plan-room/${selectedDoc.id}/download`);
      const data = await res.json();
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = selectedDoc.name;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  }, [selectedDoc]);

  const handleCreateSet = useCallback(async () => {
    if (!newSetName.trim()) return;
    setNewSetLoading(true);
    try {
      await fetch("/api/documents/plan-room/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSetName.trim(),
          description: newSetDesc.trim() || null,
          discipline: newSetDiscipline || null,
          project_id: newSetProject || null,
        }),
      });
      setShowNewSetModal(false);
      setNewSetName("");
      setNewSetDesc("");
      setNewSetDiscipline("");
      setNewSetProject("");
      router.refresh();
    } catch (err) {
      console.error("Create set error:", err);
    } finally {
      setNewSetLoading(false);
    }
  }, [newSetName, newSetDesc, newSetDiscipline, newSetProject, router]);

  const handleUploadRevision = useCallback(async () => {
    if (!revisionFile || !selectedDoc) return;
    setRevisionLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", revisionFile);
      if (revisionLabel.trim()) formData.append("revision_label", revisionLabel.trim());

      await fetch(`/api/documents/plan-room/${selectedDoc.id}/revision`, {
        method: "POST",
        body: formData,
      });

      setShowRevisionModal(false);
      setRevisionFile(null);
      setRevisionLabel("");
      router.refresh();
    } catch (err) {
      console.error("Upload revision error:", err);
    } finally {
      setRevisionLoading(false);
    }
  }, [revisionFile, revisionLabel, selectedDoc, router]);

  const handleDelete = useCallback(async () => {
    if (!selectedDoc) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/documents/plan-room/${selectedDoc.id}`, {
        method: "DELETE",
      });
      setShowDeleteConfirm(false);
      setSelectedId(null);
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedDoc, router]);

  const handleAnnotationCreated = useCallback(
    (annotation: Parameters<typeof annotationsHook.addAnnotation>[0]) => {
      annotationsHook.addAnnotation(annotation);
    },
    [annotationsHook.addAnnotation] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ------- Keyboard shortcuts -------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" && annotationsHook.selectedId) {
        annotationsHook.deleteAnnotation(annotationsHook.selectedId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        annotationsHook.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        annotationsHook.redo();
      }
      if (e.key === "Escape") {
        annotationsHook.setSelectedId(null);
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [annotationsHook]);

  // ------- Empty state -------
  if (documents.length === 0) {
    return (
      <div className="plan-room-shell">
        <PlanRoomHeader
          selectedDoc={null}
          projectList={projectList}
          selectedProjectId={projectFilter}
          onProjectChange={setProjectFilter}
          onUploadClick={() => setShowUploadModal(true)}
          presenceUsers={presenceUsers}
        />
        <div className="plan-room-body">
          <div className="plan-room-empty-state">
            <FolderOpen size={48} />
            <h3>{t("noDocumentsYet")}</h3>
            <p>{t("uploadPlansToGetStarted")}</p>
            <button
              className="plan-room-upload-btn lg"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} />
              {t("uploadYourFirstDocument")}
            </button>
          </div>
        </div>
        {showUploadModal && (
          <PlanRoomUploadModal
            projectList={projectList}
            drawingSets={drawingSets}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  // ------- Page annotations for badge count -------
  const pageAnnotations = annotationsHook.annotations.filter(
    (a) => a.page_number === pdfViewer.currentPage
  );

  // ------- Main render -------
  return (
    <div className="plan-room-shell">
      {/* Page Header */}
      <PlanRoomHeader
        selectedDoc={selectedDoc}
        projectList={projectList}
        selectedProjectId={projectFilter}
        onProjectChange={setProjectFilter}
        onUploadClick={() => setShowUploadModal(true)}
        presenceUsers={presenceUsers}
      />

      {/* Toolbar */}
      <PlanRoomToolbar
        canPrev={currentIndex > 0}
        canNext={currentIndex < sortedFiltered.length - 1}
        onPrev={handlePrevSheet}
        onNext={handleNextSheet}
        zoomLevel={pdfViewer.zoomLevel}
        onZoomPreset={(preset) => pdfViewer.setZoomPreset(preset)}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        activeShape={activeShape}
        onShapeChange={setActiveShape}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        canUndo={annotationsHook.canUndo}
        canRedo={annotationsHook.canRedo}
        onUndo={annotationsHook.undo}
        onRedo={annotationsHook.redo}
      />

      {/* Main Content */}
      <div className="plan-room-content">
        {/* Blueprint Viewer */}
        <BlueprintViewer
          document={selectedDoc}
          fileUrl={previewUrl}
          isLoading={previewLoading}
          error={previewError}
          currentPage={pdfViewer.currentPage}
          zoomLevel={pdfViewer.zoomLevel}
          onLoadSuccess={pdfViewer.setTotalPages}
          onPageDimensions={pdfViewer.setPageDimensions}
          pageDimensions={pdfViewer.pageDimensions}
          onZoom={pdfViewer.setZoom}
          activeTool={activeTool}
          activeShape={activeShape}
          activeColor={activeColor}
          annotations={annotationsHook.annotations}
          selectedAnnotationId={annotationsHook.selectedId}
          onAnnotationCreated={handleAnnotationCreated}
          onAnnotationSelected={annotationsHook.setSelectedId}
          onAnnotationUpdated={annotationsHook.updateAnnotation}
        />

        {/* Right Panel */}
        <RightPanel>
          <PanelSection title={t("sheetIndex")}>
            <div className="plan-room-search-inline">
              <input
                type="text"
                placeholder={t("searchSheets")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="plan-room-search-input"
              />
            </div>
            <SheetIndex
              documents={filtered}
              selectedDocId={selectedId}
              onSelectDoc={handleSelectDoc}
            />
          </PanelSection>

          <PanelSection title={t("markups")} badge={pageAnnotations.length}>
            <MarkupsList
              annotations={annotationsHook.annotations}
              pageNumber={pdfViewer.currentPage}
              selectedAnnotationId={annotationsHook.selectedId}
              onSelectAnnotation={annotationsHook.setSelectedId}
              onDeleteAnnotation={annotationsHook.deleteAnnotation}
            />
          </PanelSection>

          <PanelSection title={t("revisions")}>
            <RevisionsPanel
              versions={versionHistory}
              currentDocId={selectedId}
              onSelectVersion={(doc) => setSelectedId(doc.id)}
            />
            {selectedDoc && (
              <div className="plan-room-rev-actions">
                <button
                  className="plan-room-tool-btn"
                  onClick={() => setShowRevisionModal(true)}
                >
                  <Upload size={12} />
                  {t("uploadRevision")}
                </button>
                <button
                  className="plan-room-tool-btn"
                  onClick={handleDownload}
                >
                  <Download size={12} />
                  {t("download")}
                </button>
                <button
                  className="plan-room-tool-btn plan-room-tool-btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={12} />
                  {t("delete")}
                </button>
              </div>
            )}
          </PanelSection>
        </RightPanel>
      </div>

      {/* Bottom Bar */}
      <BottomBar
        selectedDoc={selectedDoc}
        currentPage={pdfViewer.currentPage}
        totalPages={pdfViewer.totalPages}
      />

      {/* ===== Modals ===== */}

      {/* Upload Modal */}
      {showUploadModal && (
        <PlanRoomUploadModal
          projectList={projectList}
          drawingSets={drawingSets}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            router.refresh();
          }}
        />
      )}

      {/* New Drawing Set Modal */}
      {showNewSetModal && (
        <div className="plan-room-modal-overlay" onClick={() => setShowNewSetModal(false)}>
          <div className="plan-room-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plan-room-modal-header">
              <h3>{t("newDrawingSet")}</h3>
              <button className="plan-room-modal-close" onClick={() => setShowNewSetModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="plan-room-modal-body">
              <div className="plan-room-form-group">
                <label>{t("nameRequired")}</label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder={t("drawingSetNamePlaceholder")}
                />
              </div>
              <div className="plan-room-form-group">
                <label>{t("description")}</label>
                <textarea
                  value={newSetDesc}
                  onChange={(e) => setNewSetDesc(e.target.value)}
                  placeholder={t("optionalDescription")}
                  rows={2}
                />
              </div>
              <div className="plan-room-form-row">
                <div className="plan-room-form-group">
                  <label>{t("discipline")}</label>
                  <select value={newSetDiscipline} onChange={(e) => setNewSetDiscipline(e.target.value)}>
                    <option value="">{t("none")}</option>
                    {DISCIPLINES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="plan-room-form-group">
                  <label>{t("project")}</label>
                  <select value={newSetProject} onChange={(e) => setNewSetProject(e.target.value)}>
                    <option value="">{t("none")}</option>
                    {projectList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="plan-room-modal-footer">
              <button className="plan-room-btn-secondary" onClick={() => setShowNewSetModal(false)}>
                {t("cancel")}
              </button>
              <button
                className="plan-room-btn-primary"
                onClick={handleCreateSet}
                disabled={!newSetName.trim() || newSetLoading}
              >
                {newSetLoading ? t("creating") : t("createSet")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Upload Modal */}
      {showRevisionModal && selectedDoc && (
        <div className="plan-room-modal-overlay" onClick={() => setShowRevisionModal(false)}>
          <div className="plan-room-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plan-room-modal-header">
              <h3>{t("uploadNewRevision")}</h3>
              <button className="plan-room-modal-close" onClick={() => setShowRevisionModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="plan-room-modal-body">
              <p className="plan-room-modal-hint">
                {t("uploadingRevisionOf", { name: selectedDoc.name, version: selectedDoc.version })}
              </p>
              <div className="plan-room-form-group">
                <label>{t("fileRequired")}</label>
                <div
                  className={`plan-room-dropzone ${revisionFile ? "has-file" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files[0];
                    if (f) setRevisionFile(f);
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.onchange = (e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) setRevisionFile(f);
                    };
                    input.click();
                  }}
                >
                  {revisionFile ? (
                    <span>{revisionFile.name} ({formatBytes(revisionFile.size)})</span>
                  ) : (
                    <span>{t("dropFileHereOrBrowse")}</span>
                  )}
                </div>
              </div>
              <div className="plan-room-form-group">
                <label>{t("revisionLabel")}</label>
                <input
                  type="text"
                  value={revisionLabel}
                  onChange={(e) => setRevisionLabel(e.target.value)}
                  placeholder={`e.g., Rev ${String.fromCharCode(65 + selectedDoc.version)}`}
                />
              </div>
            </div>
            <div className="plan-room-modal-footer">
              <button className="plan-room-btn-secondary" onClick={() => setShowRevisionModal(false)}>
                {t("cancel")}
              </button>
              <button
                className="plan-room-btn-primary"
                onClick={handleUploadRevision}
                disabled={!revisionFile || revisionLoading}
              >
                {revisionLoading ? t("uploading") : t("uploadRevision")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedDoc && (
        <div className="plan-room-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="plan-room-modal sm" onClick={(e) => e.stopPropagation()}>
            <div className="plan-room-modal-header">
              <h3>{t("deleteDocument")}</h3>
              <button className="plan-room-modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="plan-room-modal-body">
              <div className="plan-room-delete-warning">
                <AlertTriangle size={20} />
                <p>
                  {t("confirmDeleteDocument", { name: selectedDoc.name })}
                </p>
              </div>
            </div>
            <div className="plan-room-modal-footer">
              <button className="plan-room-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                {t("cancel")}
              </button>
              <button
                className="plan-room-btn-danger"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
