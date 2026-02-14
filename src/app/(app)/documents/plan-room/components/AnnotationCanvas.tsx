"use client";

import { useRef, useState, useCallback, type MouseEvent } from "react";
import type { AnnotationTool, MarkupShape } from "../types";
import { useViewerTransform } from "../hooks/useViewerTransform";
import type { AnnotationRow } from "../hooks/useAnnotations";

interface AnnotationCanvasProps {
  pageWidth: number;
  pageHeight: number;
  scale: number;
  annotations: AnnotationRow[];
  selectedAnnotationId: string | null;
  activeTool: AnnotationTool;
  activeShape: MarkupShape;
  activeColor: string;
  onAnnotationCreated: (
    annotation: Omit<AnnotationRow, "id" | "created_at" | "updated_at" | "created_by" | "created_by_name">
  ) => void;
  onAnnotationSelected: (id: string | null) => void;
  onAnnotationUpdated: (id: string, updates: Partial<AnnotationRow>) => void;
  pageNumber: number;
  documentId: string;
}

interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function generateCloudPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  if (w < 4 || h < 4) return "";

  const bumps = Math.max(3, Math.floor(Math.max(w, h) / 30));
  const points: string[] = [];
  const segW = w / bumps;
  const segH = h / bumps;
  const bumpSize = Math.min(segW, segH) * 0.35;

  // Top edge
  for (let i = 0; i < bumps; i++) {
    const cx = minX + segW * (i + 0.5);
    const cy = minY;
    points.push(
      `Q ${cx} ${cy - bumpSize} ${minX + segW * (i + 1)} ${minY}`
    );
  }
  // Right edge
  for (let i = 0; i < bumps; i++) {
    const cx = minX + w;
    const cy = minY + segH * (i + 0.5);
    points.push(
      `Q ${cx + bumpSize} ${cy} ${minX + w} ${minY + segH * (i + 1)}`
    );
  }
  // Bottom edge (right to left)
  for (let i = bumps - 1; i >= 0; i--) {
    const cx = minX + segW * (i + 0.5);
    const cy = minY + h;
    points.push(
      `Q ${cx} ${cy + bumpSize} ${minX + segW * i} ${minY + h}`
    );
  }
  // Left edge (bottom to top)
  for (let i = bumps - 1; i >= 0; i--) {
    const cx = minX;
    const cy = minY + segH * (i + 0.5);
    points.push(
      `Q ${cx - bumpSize} ${cy} ${minX} ${minY + segH * i}`
    );
  }

  return `M ${minX} ${minY} ${points.join(" ")} Z`;
}

export default function AnnotationCanvas({
  pageWidth,
  pageHeight,
  scale,
  annotations,
  selectedAnnotationId,
  activeTool,
  activeShape,
  activeColor,
  onAnnotationCreated,
  onAnnotationSelected,
  onAnnotationUpdated,
  pageNumber,
  documentId,
}: AnnotationCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    normX: number;
    normY: number;
    visible: boolean;
    value: string;
    forArrow?: { x1: number; y1: number; x2: number; y2: number };
  } | null>(null);

  const { screenToNormalized } = useViewerTransform(
    pageWidth / scale,
    pageHeight / scale,
    scale
  );

  const getSvgCoords = useCallback(
    (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (activeTool !== "markup") {
        if (activeTool === "select") {
          onAnnotationSelected(null);
        }
        return;
      }
      e.preventDefault();
      const { x, y } = getSvgCoords(e);

      if (activeShape === "text") {
        const norm = screenToNormalized(x, y);
        setTextInput({ x, y, normX: norm.x, normY: norm.y, visible: true, value: "" });
        return;
      }

      setDrawing({ isDrawing: true, startX: x, startY: y, currentX: x, currentY: y });
    },
    [activeTool, activeShape, getSvgCoords, screenToNormalized, onAnnotationSelected]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!drawing?.isDrawing) return;
      const { x, y } = getSvgCoords(e);
      setDrawing((d) => (d ? { ...d, currentX: x, currentY: y } : null));
    },
    [drawing, getSvgCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing?.isDrawing) return;

    const norm1 = screenToNormalized(drawing.startX, drawing.startY);
    const norm2 = screenToNormalized(drawing.currentX, drawing.currentY);

    // Minimum drag threshold
    const dist = Math.hypot(drawing.currentX - drawing.startX, drawing.currentY - drawing.startY);
    if (dist < 5) {
      setDrawing(null);
      return;
    }

    if (activeShape === "arrow") {
      // Show text input for arrow label
      setTextInput({
        x: drawing.currentX,
        y: drawing.currentY,
        normX: norm2.x,
        normY: norm2.y,
        visible: true,
        value: "",
        forArrow: { x1: norm1.x, y1: norm1.y, x2: norm2.x, y2: norm2.y },
      });
      setDrawing(null);
      return;
    }

    onAnnotationCreated({
      document_id: documentId,
      page_number: pageNumber,
      annotation_type: activeShape,
      color: activeColor,
      stroke_width: 2,
      geometry: { x1: norm1.x, y1: norm1.y, x2: norm2.x, y2: norm2.y },
      text_content: null,
    });

    setDrawing(null);
  }, [drawing, screenToNormalized, activeShape, activeColor, onAnnotationCreated, documentId, pageNumber]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }

    if (textInput.forArrow) {
      onAnnotationCreated({
        document_id: documentId,
        page_number: pageNumber,
        annotation_type: "arrow",
        color: activeColor,
        stroke_width: 2,
        geometry: textInput.forArrow,
        text_content: textInput.value.trim(),
      });
    } else {
      onAnnotationCreated({
        document_id: documentId,
        page_number: pageNumber,
        annotation_type: "text",
        color: activeColor,
        stroke_width: 2,
        geometry: { x1: textInput.normX, y1: textInput.normY },
        text_content: textInput.value.trim(),
      });
    }

    setTextInput(null);
  }, [textInput, activeColor, onAnnotationCreated, documentId, pageNumber]);

  const handleAnnotationClick = useCallback(
    (e: MouseEvent, id: string) => {
      e.stopPropagation();
      if (activeTool === "select") {
        onAnnotationSelected(id);
      }
    },
    [activeTool, onAnnotationSelected]
  );

  // Render a single annotation
  const renderAnnotation = (a: AnnotationRow, isPreview = false) => {
    const g = a.geometry;
    const w = pageWidth;
    const h = pageHeight;
    const opacity = isPreview ? 0.6 : 1;
    const selected = a.id === selectedAnnotationId;
    const strokeWidth = a.stroke_width * (selected ? 1.5 : 1);

    const commonProps = {
      stroke: a.color,
      strokeWidth,
      fill: "transparent",
      opacity,
      style: { cursor: activeTool === "select" ? "pointer" : "default" },
      onClick: isPreview ? undefined : (e: MouseEvent<SVGElement>) => handleAnnotationClick(e as unknown as MouseEvent, a.id),
    };

    switch (a.annotation_type) {
      case "line":
        return (
          <line
            key={a.id}
            x1={g.x1 * w}
            y1={g.y1 * h}
            x2={(g.x2 ?? g.x1) * w}
            y2={(g.y2 ?? g.y1) * h}
            {...commonProps}
          />
        );
      case "rectangle":
        return (
          <rect
            key={a.id}
            x={Math.min(g.x1, g.x2 ?? g.x1) * w}
            y={Math.min(g.y1, g.y2 ?? g.y1) * h}
            width={Math.abs((g.x2 ?? g.x1) - g.x1) * w}
            height={Math.abs((g.y2 ?? g.y1) - g.y1) * h}
            rx={2}
            {...commonProps}
          />
        );
      case "circle": {
        const cx = ((g.x1 + (g.x2 ?? g.x1)) / 2) * w;
        const cy = ((g.y1 + (g.y2 ?? g.y1)) / 2) * h;
        const rx = (Math.abs((g.x2 ?? g.x1) - g.x1) / 2) * w;
        const ry = (Math.abs((g.y2 ?? g.y1) - g.y1) / 2) * h;
        return (
          <ellipse key={a.id} cx={cx} cy={cy} rx={rx} ry={ry} {...commonProps} />
        );
      }
      case "text":
        return (
          <text
            key={a.id}
            x={g.x1 * w}
            y={g.y1 * h}
            fill={a.color}
            fontSize={14}
            fontWeight={600}
            fontFamily="var(--font-sans)"
            opacity={opacity}
            style={{ cursor: activeTool === "select" ? "pointer" : "default" }}
            onClick={
              isPreview
                ? undefined
                : (e) => handleAnnotationClick(e as unknown as MouseEvent, a.id)
            }
          >
            {a.text_content}
          </text>
        );
      case "arrow": {
        const markerId = `arrow-${a.id}`;
        return (
          <g key={a.id} opacity={opacity}>
            <defs>
              <marker
                id={markerId}
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={a.color} />
              </marker>
            </defs>
            <line
              x1={g.x1 * w}
              y1={g.y1 * h}
              x2={(g.x2 ?? g.x1) * w}
              y2={(g.y2 ?? g.y1) * h}
              stroke={a.color}
              strokeWidth={strokeWidth}
              markerEnd={`url(#${markerId})`}
              style={{ cursor: activeTool === "select" ? "pointer" : "default" }}
              onClick={
                isPreview
                  ? undefined
                  : (e) => handleAnnotationClick(e as unknown as MouseEvent, a.id)
              }
            />
            {a.text_content && (
              <text
                x={(g.x2 ?? g.x1) * w + 8}
                y={(g.y2 ?? g.y1) * h}
                fill={a.color}
                fontSize={12}
                fontWeight={600}
                fontFamily="var(--font-sans)"
              >
                {a.text_content}
              </text>
            )}
          </g>
        );
      }
      case "cloud": {
        const path = generateCloudPath(
          Math.min(g.x1, g.x2 ?? g.x1) * w,
          Math.min(g.y1, g.y2 ?? g.y1) * h,
          Math.max(g.x1, g.x2 ?? g.x1) * w,
          Math.max(g.y1, g.y2 ?? g.y1) * h
        );
        return (
          <g key={a.id} opacity={opacity}>
            <path
              d={path}
              stroke={a.color}
              strokeWidth={strokeWidth}
              fill="transparent"
              style={{ cursor: activeTool === "select" ? "pointer" : "default" }}
              onClick={
                isPreview
                  ? undefined
                  : (e) => handleAnnotationClick(e as unknown as MouseEvent, a.id)
              }
            />
            {a.text_content && (
              <text
                x={((Math.min(g.x1, g.x2 ?? g.x1) + Math.max(g.x1, g.x2 ?? g.x1)) / 2) * w}
                y={((Math.min(g.y1, g.y2 ?? g.y1) + Math.max(g.y1, g.y2 ?? g.y1)) / 2) * h}
                fill={a.color}
                fontSize={12}
                fontWeight={600}
                fontFamily="var(--font-sans)"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {a.text_content}
              </text>
            )}
          </g>
        );
      }
      default:
        return null;
    }
  };

  // Preview shape while drawing
  const renderPreview = () => {
    if (!drawing?.isDrawing) return null;
    const norm1 = screenToNormalized(drawing.startX, drawing.startY);
    const norm2 = screenToNormalized(drawing.currentX, drawing.currentY);
    const preview: AnnotationRow = {
      id: "preview",
      document_id: documentId,
      page_number: pageNumber,
      annotation_type: activeShape,
      color: activeColor,
      stroke_width: 2,
      geometry: { x1: norm1.x, y1: norm1.y, x2: norm2.x, y2: norm2.y },
      text_content: null,
      created_by: "",
      created_at: "",
      updated_at: "",
    };
    return renderAnnotation(preview, true);
  };

  return (
    <>
      <svg
        ref={svgRef}
        className="plan-room-annotation-svg"
        width={pageWidth}
        height={pageHeight}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: activeTool === "select" || activeTool === "markup" ? "auto" : "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Existing annotations */}
        {annotations
          .filter((a) => a.page_number === pageNumber)
          .map((a) => renderAnnotation(a))}

        {/* Drawing preview */}
        {renderPreview()}

        {/* Selection highlight */}
        {selectedAnnotationId && (
          <rect
            x={0}
            y={0}
            width={0}
            height={0}
            style={{ display: "none" }}
          />
        )}
      </svg>

      {/* Text input overlay */}
      {textInput?.visible && (
        <div
          className="plan-room-annotation-text-input"
          style={{
            position: "absolute",
            left: textInput.x,
            top: textInput.y,
            zIndex: 10,
          }}
        >
          <input
            type="text"
            autoFocus
            value={textInput.value}
            onChange={(e) => setTextInput((t) => (t ? { ...t, value: e.target.value } : null))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
              if (e.key === "Escape") setTextInput(null);
            }}
            onBlur={handleTextSubmit}
            placeholder={textInput.forArrow ? "Arrow label..." : "Type annotation..."}
            style={{
              border: `2px solid ${activeColor}`,
              borderRadius: 4,
              padding: "4px 8px",
              fontSize: 13,
              fontWeight: 600,
              color: activeColor,
              background: "rgba(255,255,255,0.95)",
              outline: "none",
              minWidth: 160,
            }}
          />
        </div>
      )}
    </>
  );
}
