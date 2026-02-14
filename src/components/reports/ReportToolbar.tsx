"use client";

import { Sparkles, RefreshCw, Download, Save } from "lucide-react";
import type { WatermarkType } from "@/types/authoritative-reports";

interface ReportToolbarProps {
  onGenerate: () => void;
  onUpdateData: () => void;
  onDownloadPDF: () => void;
  onSave: () => void;
  isGenerating: boolean;
  isDownloading: boolean;
  isSaving: boolean;
  hasData: boolean;
  watermark: WatermarkType;
  onWatermarkChange: (w: WatermarkType) => void;
}

export function ReportToolbar({
  onGenerate,
  onUpdateData,
  onDownloadPDF,
  onSave,
  isGenerating,
  isDownloading,
  isSaving,
  hasData,
  watermark,
  onWatermarkChange,
}: ReportToolbarProps) {
  return (
    <div className="report-toolbar">
      <button
        className="report-toolbar-btn primary"
        onClick={onGenerate}
        disabled={isGenerating}
        type="button"
      >
        <Sparkles size={14} />
        {isGenerating ? "Generating..." : "Generate Report"}
      </button>

      {hasData && (
        <>
          <button
            className="report-toolbar-btn"
            onClick={onUpdateData}
            type="button"
          >
            <RefreshCw size={14} />
            Update Data
          </button>

          <select
            className="watermark-select"
            value={watermark ?? ""}
            onChange={(e) =>
              onWatermarkChange(
                (e.target.value || null) as WatermarkType
              )
            }
          >
            <option value="">No Watermark</option>
            <option value="draft">DRAFT</option>
            <option value="confidential">CONFIDENTIAL</option>
          </select>

          <div className="report-toolbar-spacer" />

          <button
            className="report-toolbar-btn"
            onClick={onSave}
            disabled={isSaving}
            type="button"
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save Draft"}
          </button>

          <button
            className="report-toolbar-btn primary"
            onClick={onDownloadPDF}
            disabled={isDownloading}
            type="button"
          >
            <Download size={14} />
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </>
      )}
    </div>
  );
}
