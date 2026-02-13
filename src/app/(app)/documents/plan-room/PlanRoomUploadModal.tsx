"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import type { DrawingSetRow } from "@/lib/queries/documents";

interface PlanRoomUploadModalProps {
  projectList: { id: string; name: string }[];
  drawingSets: DrawingSetRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const DISCIPLINES = [
  { value: "architectural", label: "Architectural" },
  { value: "structural", label: "Structural" },
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "civil", label: "Civil" },
  { value: "landscape", label: "Landscape" },
  { value: "other", label: "Other" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function PlanRoomUploadModal({
  projectList,
  drawingSets,
  onClose,
  onSuccess,
}: PlanRoomUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("plan");
  const [discipline, setDiscipline] = useState("");
  const [drawingSetId, setDrawingSetId] = useState("");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function handleFileSelect(selectedFiles: FileList | null) {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFiles]);
    if (!name && newFiles.length === 1) {
      const fileName = newFiles[0].name.replace(/\.[^/.]+$/, "");
      setName(fileName);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", files.length === 1 && name ? name : file.name.replace(/\.[^/.]+$/, ""));
        formData.append("category", category);
        if (projectId) formData.append("project_id", projectId);
        if (discipline) formData.append("discipline", discipline);
        if (drawingSetId) formData.append("drawing_set_id", drawingSetId);
        if (revisionLabel) formData.append("revision_label", revisionLabel);
        if (tags) formData.append("tags", tags);

        const res = await fetch("/api/documents/plan-room", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="plan-room-modal-overlay" onClick={onClose}>
      <div className="plan-room-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="plan-room-modal-header">
          <h3>Upload Documents</h3>
          <button className="plan-room-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="plan-room-modal-body">
          {error && (
            <div className="plan-room-form-error">{error}</div>
          )}

          {/* File Drop Zone */}
          <div
            className={`plan-room-dropzone ${isDragging ? "dragging" : ""} ${files.length > 0 ? "has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              handleFileSelect(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.svg,.dwg,.dxf,.xlsx,.xls,.csv,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <Upload size={24} />
            <span className="plan-room-dropzone-text">
              Drop files here or click to browse
            </span>
            <span className="plan-room-dropzone-hint">
              PDF, Images, DWG, Excel, Word
            </span>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="plan-room-file-list">
              {files.map((file, index) => (
                <div key={index} className="plan-room-file-item">
                  <FileText size={14} />
                  <span className="plan-room-file-name">{file.name}</span>
                  <span className="plan-room-file-size">{formatBytes(file.size)}</span>
                  <button
                    className="plan-room-file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form Fields */}
          <div className="plan-room-form-group">
            <label>Document Name {files.length <= 1 && "(optional)"}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Defaults to filename"
              disabled={files.length > 1}
            />
            {files.length > 1 && (
              <span className="plan-room-form-hint">Each file will use its own filename</span>
            )}
          </div>

          <div className="plan-room-form-row">
            <div className="plan-room-form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="plan">Plan</option>
                <option value="spec">Specification</option>
              </select>
            </div>
            <div className="plan-room-form-group">
              <label>Discipline</label>
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                <option value="">None</option>
                {DISCIPLINES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="plan-room-form-row">
            <div className="plan-room-form-group">
              <label>Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">None</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="plan-room-form-group">
              <label>Drawing Set</label>
              <select value={drawingSetId} onChange={(e) => setDrawingSetId(e.target.value)}>
                <option value="">None</option>
                {drawingSets.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="plan-room-form-row">
            <div className="plan-room-form-group">
              <label>Revision Label</label>
              <input
                type="text"
                value={revisionLabel}
                onChange={(e) => setRevisionLabel(e.target.value)}
                placeholder="e.g., Rev A"
              />
            </div>
            <div className="plan-room-form-group">
              <label>Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma separated"
              />
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="plan-room-upload-progress">
              <div className="plan-room-progress-bar">
                <div
                  className="plan-room-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="plan-room-progress-text">
                Uploading... {uploadProgress}%
              </span>
            </div>
          )}
        </div>

        <div className="plan-room-modal-footer">
          <button className="plan-room-btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className="plan-room-btn-primary"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? "Uploading..." : `Upload ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
