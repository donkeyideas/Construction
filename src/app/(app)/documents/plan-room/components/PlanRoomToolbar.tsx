"use client";

import type { AnnotationTool, MarkupShape, MarkupColor } from "../types";
import { MARKUP_COLORS } from "../types";

interface PlanRoomToolbarProps {
  // Navigate
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  // Zoom
  zoomLevel: number;
  onZoomPreset: (preset: "fit" | 0.5 | 1 | 2) => void;
  // Tools
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  // Markup shapes
  activeShape: MarkupShape;
  onShapeChange: (shape: MarkupShape) => void;
  // Color
  activeColor: string;
  onColorChange: (color: string) => void;
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function PlanRoomToolbar({
  canPrev,
  canNext,
  onPrev,
  onNext,
  zoomLevel,
  onZoomPreset,
  activeTool,
  onToolChange,
  activeShape,
  onShapeChange,
  activeColor,
  onColorChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: PlanRoomToolbarProps) {
  return (
    <div className="plan-room-toolbar">
      {/* Navigate */}
      <span className="plan-room-tool-label">Navigate</span>
      <div className="plan-room-tool-group">
        <button
          className="plan-room-tool-btn"
          disabled={!canPrev}
          onClick={onPrev}
          title="Previous Sheet"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>
        <button
          className="plan-room-tool-btn"
          disabled={!canNext}
          onClick={onNext}
          title="Next Sheet"
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>

      <div className="plan-room-tool-sep" />

      {/* Zoom */}
      <span className="plan-room-tool-label">Zoom</span>
      <div className="plan-room-tool-group">
        <button
          className={`plan-room-tool-btn${zoomLevel < 0.3 ? " active" : ""}`}
          onClick={() => onZoomPreset("fit")}
        >
          Fit
        </button>
        <button
          className={`plan-room-tool-btn${zoomLevel === 0.5 ? " active" : ""}`}
          onClick={() => onZoomPreset(0.5)}
        >
          50%
        </button>
        <button
          className={`plan-room-tool-btn${zoomLevel === 1 ? " active" : ""}`}
          onClick={() => onZoomPreset(1)}
        >
          100%
        </button>
        <button
          className={`plan-room-tool-btn${zoomLevel === 2 ? " active" : ""}`}
          onClick={() => onZoomPreset(2)}
        >
          200%
        </button>
      </div>

      <div className="plan-room-tool-sep" />

      {/* Tools */}
      <span className="plan-room-tool-label">Tools</span>
      <div className="plan-room-tool-group">
        <button
          className={`plan-room-tool-btn${activeTool === "select" ? " active" : ""}`}
          onClick={() => onToolChange("select")}
          title="Select"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
          Select
        </button>
        <button
          className={`plan-room-tool-btn${activeTool === "pan" ? " active" : ""}`}
          onClick={() => onToolChange("pan")}
          title="Pan"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V5a2 2 0 0 0-4 0v9" /><path d="M18 11a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 17" />
          </svg>
          Pan
        </button>
        <button
          className={`plan-room-tool-btn${activeTool === "markup" ? " active" : ""}`}
          onClick={() => onToolChange("markup")}
          title="Markup"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Markup
        </button>
      </div>

      <div className="plan-room-tool-sep" />

      {/* Markup Shapes */}
      <span className="plan-room-tool-label">Markup</span>
      <div className="plan-room-tool-group">
        <button
          className={`plan-room-tool-btn${activeTool === "markup" && activeShape === "line" ? " active" : ""}`}
          onClick={() => { onToolChange("markup"); onShapeChange("line"); }}
          title="Line"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="5" />
          </svg>
        </button>
        <button
          className={`plan-room-tool-btn${activeTool === "markup" && activeShape === "rectangle" ? " active" : ""}`}
          onClick={() => { onToolChange("markup"); onShapeChange("rectangle"); }}
          title="Rectangle"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>
        <button
          className={`plan-room-tool-btn${activeTool === "markup" && activeShape === "circle" ? " active" : ""}`}
          onClick={() => { onToolChange("markup"); onShapeChange("circle"); }}
          title="Circle"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </button>
        <button
          className={`plan-room-tool-btn${activeTool === "markup" && activeShape === "text" ? " active" : ""}`}
          onClick={() => { onToolChange("markup"); onShapeChange("text"); }}
          title="Text"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>
        <button
          className={`plan-room-tool-btn${activeTool === "markup" && activeShape === "arrow" ? " active" : ""}`}
          onClick={() => { onToolChange("markup"); onShapeChange("arrow"); }}
          title="Arrow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
        <button
          className={`plan-room-tool-btn${activeTool === "markup" && activeShape === "cloud" ? " active" : ""}`}
          onClick={() => { onToolChange("markup"); onShapeChange("cloud"); }}
          title="Cloud / Revision"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
        </button>
      </div>

      <div className="plan-room-tool-sep" />

      {/* Color */}
      <div className="plan-room-tool-group">
        {MARKUP_COLORS.map((c) => (
          <div
            key={c.value}
            className={`plan-room-color-swatch${activeColor === c.value ? " active" : ""}`}
            style={{ background: c.value }}
            title={c.label}
            onClick={() => onColorChange(c.value)}
          />
        ))}
      </div>

      {/* Undo/Redo pushed right */}
      <div className="plan-room-undo-redo">
        <button
          className="plan-room-tool-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          className="plan-room-tool-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
