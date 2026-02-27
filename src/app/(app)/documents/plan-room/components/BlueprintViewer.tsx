"use client";

import { useRef, useCallback, type MouseEvent, type WheelEvent } from "react";
import { useTranslations } from "next-intl";
import type { DocumentRow } from "@/lib/queries/documents";
import type { AnnotationTool, MarkupShape } from "../types";
import PdfRenderer from "./PdfRenderer";
import AnnotationCanvas from "./AnnotationCanvas";
import type { AnnotationRow } from "../hooks/useAnnotations";

interface BlueprintViewerProps {
  document: DocumentRow | null;
  fileUrl: string | null;
  isLoading: boolean;
  error?: string | null;
  // PDF state
  currentPage: number;
  zoomLevel: number;
  onLoadSuccess: (numPages: number) => void;
  onPageDimensions: (width: number, height: number) => void;
  pageDimensions: { width: number; height: number } | null;
  onZoom: (level: number) => void;
  // Annotation state
  activeTool: AnnotationTool;
  activeShape: MarkupShape;
  activeColor: string;
  annotations: AnnotationRow[];
  selectedAnnotationId: string | null;
  onAnnotationCreated: (annotation: Omit<AnnotationRow, "id" | "created_at" | "updated_at" | "created_by" | "created_by_name">) => void;
  onAnnotationSelected: (id: string | null) => void;
  onAnnotationUpdated: (id: string, updates: Partial<AnnotationRow>) => void;
}

function normalizeFileType(fileType: string): string {
  const t = (fileType || "").toLowerCase();
  if (t.includes("/")) {
    const sub = t.split("/").pop() || "";
    return sub;
  }
  return t;
}

function isPreviewable(fileType: string): "pdf" | "image" | false {
  const t = normalizeFileType(fileType);
  if (t === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(t)) return "image";
  return false;
}

export default function BlueprintViewer({
  document: doc,
  fileUrl,
  isLoading,
  error,
  currentPage,
  zoomLevel,
  onLoadSuccess,
  onPageDimensions,
  pageDimensions,
  onZoom,
  activeTool,
  activeShape,
  activeColor,
  annotations,
  selectedAnnotationId,
  onAnnotationCreated,
  onAnnotationSelected,
  onAnnotationUpdated,
}: BlueprintViewerProps) {
  const t = useTranslations("documents");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        onZoom(Math.max(0.25, Math.min(zoomLevel + delta, 4)));
      }
    },
    [zoomLevel, onZoom]
  );

  // Empty states
  if (!doc) {
    return (
      <div className="plan-room-viewer">
        <div className="plan-room-viewer-content">
          <div className="plan-room-viewer-empty">
            <p>{t("planRoom.viewer.selectSheet")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="plan-room-viewer">
        <div className="plan-room-viewer-content">
          <div className="plan-room-viewer-loading">
            <div className="plan-room-spinner" />
            <p>{t("planRoom.viewer.loadingDocument")}</p>
          </div>
        </div>
      </div>
    );
  }

  const previewType = isPreviewable(doc.file_type);

  if (!fileUrl || !previewType) {
    return (
      <div className="plan-room-viewer">
        <div className="plan-room-viewer-content">
          <div className="plan-room-unsupported">
            <h3>{doc.name}</h3>
            <p className="plan-room-unsupported-meta">
              {normalizeFileType(doc.file_type).toUpperCase()} {t("planRoom.viewer.file")}
            </p>
            <p className="plan-room-unsupported-hint">
              {error && (error.includes("not found") || error.includes("not uploaded"))
                ? t("planRoom.viewer.reUploadHint")
                : error
                ? t("planRoom.viewer.errorLoadingPreview", { error })
                : !previewType
                ? t("planRoom.viewer.previewNotAvailable")
                : t("planRoom.viewer.couldNotLoad")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cursorClass =
    activeTool === "pan"
      ? "cursor-grab"
      : activeTool === "markup"
      ? "cursor-crosshair"
      : "";

  return (
    <div className="plan-room-viewer">
      <div
        ref={containerRef}
        className={`plan-room-viewer-content plan-room-blueprint-area ${cursorClass}`}
        onWheel={handleWheel}
      >
        <div
          className="plan-room-blueprint-page"
          style={{ position: "relative", display: "inline-block" }}
        >
          {previewType === "pdf" && (
            <PdfRenderer
              fileUrl={fileUrl}
              pageNumber={currentPage}
              scale={zoomLevel}
              onLoadSuccess={onLoadSuccess}
              onPageDimensions={onPageDimensions}
            />
          )}
          {previewType === "image" && (
            <img
              src={fileUrl}
              alt={doc.name}
              className="plan-room-img-viewer"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
              onLoad={(e) => {
                const img = e.currentTarget;
                onPageDimensions(img.naturalWidth, img.naturalHeight);
              }}
            />
          )}
          {/* Annotation SVG overlay */}
          {pageDimensions && (
            <AnnotationCanvas
              pageWidth={pageDimensions.width * zoomLevel}
              pageHeight={pageDimensions.height * zoomLevel}
              scale={zoomLevel}
              annotations={annotations}
              selectedAnnotationId={selectedAnnotationId}
              activeTool={activeTool}
              activeShape={activeShape}
              activeColor={activeColor}
              onAnnotationCreated={onAnnotationCreated}
              onAnnotationSelected={onAnnotationSelected}
              onAnnotationUpdated={onAnnotationUpdated}
              pageNumber={currentPage}
              documentId={doc.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
