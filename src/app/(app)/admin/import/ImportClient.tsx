"use client";

import { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  History,
  Database,
  Info,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import {
  generateCSVTemplate,
  downloadCSV,
} from "@/lib/utils/csv-parser";
import { IMPORT_PHASES, type EntityDef } from "./import-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SheetResult {
  sheetName: string;
  entity: string | null;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  skipped: boolean;
}

interface ImportRunRecord {
  id: string;
  run_type: string;
  status: string;
  total_sheets: number;
  processed_sheets: number;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  file_name: string | null;
  sheet_results: SheetResult[] | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ImportProgress {
  [entity: string]: {
    count: number;
    lastImported: string;
  };
}

interface ProjectOption {
  id: string;
  name: string;
  code?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportClient() {
  // State
  const [importProgress, setImportProgress] = useState<ImportProgress>({});
  const [importHistory, setImportHistory] = useState<ImportRunRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    IMPORT_PHASES.forEach((p) => (initial[p.number] = true));
    return initial;
  });
  const [activeImport, setActiveImport] = useState<EntityDef | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Excel upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    totalSheets: number;
    processedSheets: number;
    totalRows: number;
    totalSuccess: number;
    totalErrors: number;
    results: SheetResult[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Data fetching ───────────────────────────────────────────────────

  useEffect(() => {
    fetchImportProgress();
    fetchImportHistory();
    fetchProjects();
  }, []);

  async function fetchImportProgress() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.company?.import_progress) {
          setImportProgress(data.company.import_progress);
        }
      }
    } catch {
      // non-critical
    }
  }

  async function fetchImportHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/import/excel/history");
      if (res.ok) {
        const data = await res.json();
        setImportHistory(data.runs || []);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingHistory(false);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(
          (data.projects || data || []).map((p: { id: string; name: string; code?: string }) => ({
            id: p.id,
            name: p.name,
            code: p.code,
          }))
        );
      }
    } catch {
      // non-critical
    }
  }

  // ─── Handlers ────────────────────────────────────────────────────────

  async function handleEntityImport(rows: Record<string, string>[]) {
    if (!activeImport) throw new Error("No active import");

    const body: Record<string, unknown> = {
      entity: activeImport.key,
      rows,
    };
    if (selectedProjectId) {
      body.project_id = selectedProjectId;
    }

    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");

    fetchImportProgress();
    fetchImportHistory();
    fetchProjects();

    return { success: data.success ?? 0, errors: data.errors ?? [] };
  }

  function handleDownloadTemplate(entity: EntityDef) {
    const csv = generateCSVTemplate(entity.columns, entity.sampleData);
    downloadCSV(csv, `${entity.key}-import-template.csv`);
  }

  async function handleExcelUpload(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setErrorMessage("Please select an Excel file (.xlsx or .xls)");
      return;
    }

    setErrorMessage(null);
    setImportResult(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const res = await fetch("/api/import/excel", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Import failed. Please try again.");
        return;
      }

      const data = await res.json();
      setImportResult({
        totalSheets: data.totalSheets,
        processedSheets: data.processedSheets,
        totalRows: data.totalRows,
        totalSuccess: data.totalSuccess,
        totalErrors: data.totalErrors,
        results: data.results,
      });

      fetchImportHistory();
      fetchImportProgress();
      fetchProjects();
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleExcelUpload(file);
  }

  function togglePhase(num: number) {
    setExpandedPhases((prev) => ({ ...prev, [num]: !prev[num] }));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getPhaseProgress(entities: EntityDef[]) {
    let imported = 0;
    for (const e of entities) {
      if (importProgress[e.key]?.count > 0) imported++;
    }
    return { imported, total: entities.length };
  }

  // Compute global step counter
  let globalStep = 0;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="bulk-import-page">
      {/* Page Header */}
      <div className="bulk-import-header">
        <h1>Data Import</h1>
        <p className="bulk-import-subtitle">
          Import your company data in the correct dependency order. Start with
          Phase 1 (Chart of Accounts) and work your way down. Each phase builds
          on the previous one to ensure all references resolve correctly.
        </p>
      </div>

      {/* ===== Hero: Download & Upload Excel ===== */}
      <div className="import-hero">
        {/* Download Template */}
        <div className="import-hero-card">
          <div className="import-hero-card-icon download">
            <FileSpreadsheet size={22} />
          </div>
          <h3>Download Master Template</h3>
          <p>
            Download the master Excel template with pre-configured sheets for
            all entity types. Fill in your data and upload it to import
            everything at once.
          </p>
          <div>
            <a
              href="/api/import/template"
              download
              className="bulk-import-btn primary"
              style={{ display: "inline-flex", textDecoration: "none", flex: "none" }}
            >
              <Download size={15} />
              Download .xlsx Template
            </a>
          </div>
        </div>

        {/* Upload Template */}
        <div className="import-hero-card">
          <div className="import-hero-card-icon upload">
            <Upload size={22} />
          </div>
          <h3>Upload Master Template</h3>
          <p>
            Upload your filled-in Excel template. All sheets will be imported
            automatically in the correct dependency order.
          </p>
          <div
            className={`import-dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleExcelUpload(file);
              }}
              disabled={uploading}
            />
            <div className="import-dropzone-text">
              {uploading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <Loader2 size={16} className="spin-icon" />
                  Importing...
                </span>
              ) : (
                <>
                  <strong>Click to browse</strong> or drag and drop your .xlsx
                  file
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Error message ===== */}
      {errorMessage && (
        <div className="settings-form-message error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {errorMessage}
        </div>
      )}

      {/* ===== Upload progress ===== */}
      {uploading && (
        <div className="import-upload-status">
          <div className="import-upload-status-header">
            <div className="import-upload-status-title">
              <Loader2 size={16} className="spin-icon" />
              Importing data...
            </div>
            <div className="import-upload-status-meta">
              {Math.round(uploadProgress)}%
            </div>
          </div>
          <div className="import-progress-bar">
            <div
              className="import-progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ===== Import result summary ===== */}
      {importResult && (
        <div className="import-result-summary">
          <div className="import-result-summary-title">
            <Check size={18} style={{ color: "var(--color-green)" }} />
            Import Complete
          </div>
          <div className="import-result-stats">
            <div className="import-result-stat">
              <div className="import-result-stat-label">Sheets</div>
              <div className="import-result-stat-value">
                {importResult.processedSheets}
              </div>
            </div>
            <div className="import-result-stat">
              <div className="import-result-stat-label">Total Rows</div>
              <div className="import-result-stat-value">
                {importResult.totalRows}
              </div>
            </div>
            <div className="import-result-stat">
              <div className="import-result-stat-label">Successful</div>
              <div className="import-result-stat-value success">
                {importResult.totalSuccess}
              </div>
            </div>
            <div className="import-result-stat">
              <div className="import-result-stat-label">Errors</div>
              <div className="import-result-stat-value error">
                {importResult.totalErrors}
              </div>
            </div>
          </div>
          <div className="import-progress-sheets">
            {importResult.results.map((r) => (
              <div
                key={r.sheetName}
                className={`import-progress-sheet-badge ${
                  r.skipped
                    ? "skipped"
                    : r.errorCount > 0 && r.successCount === 0
                      ? "error"
                      : "success"
                }`}
              >
                {r.skipped ? (
                  <span>--</span>
                ) : r.errorCount > 0 && r.successCount === 0 ? (
                  <AlertCircle size={12} />
                ) : (
                  <Check size={12} />
                )}
                {r.sheetName}
                {!r.skipped && (
                  <span>
                    ({r.successCount}/{r.rowCount})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== OR Divider ===== */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        margin: "8px 0 28px",
        color: "var(--muted)",
        fontSize: "0.82rem",
      }}>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        <span>or import individual CSVs below</span>
        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      </div>

      {/* ===== Phase Sections ===== */}
      {IMPORT_PHASES.map((phase) => {
        const { imported, total } = getPhaseProgress(phase.entities);
        const isExpanded = expandedPhases[phase.number];

        return (
          <div key={phase.number} className="bulk-import-phase">
            {/* Phase Header */}
            <div
              className="bulk-import-phase-header"
              onClick={() => togglePhase(phase.number)}
            >
              <span className="bulk-import-phase-badge">
                Phase {phase.number}
              </span>
              <h2>{phase.title}</h2>
              <span className="bulk-import-phase-desc">
                {phase.description}
              </span>
              <span
                className={`bulk-import-phase-progress ${
                  imported === total ? "complete" : ""
                }`}
              >
                {imported}/{total} imported
              </span>
              <ChevronRight
                size={16}
                className={`bulk-import-phase-chevron ${
                  isExpanded ? "expanded" : ""
                }`}
              />
            </div>

            {/* Phase Body */}
            {isExpanded && (
              <div className="bulk-import-phase-body">
                <div className="bulk-import-entity-grid">
                  {phase.entities.map((entity) => {
                    globalStep++;
                    const progress = importProgress[entity.key];
                    const isImported = progress && progress.count > 0;
                    const Icon = entity.icon;

                    const requiredCols = entity.columns.filter((c) => c.required);
                    const optionalCount = entity.columns.length - requiredCols.length;

                    return (
                      <div
                        key={entity.key}
                        className={`bulk-import-entity-card ${
                          isImported ? "imported" : ""
                        }`}
                      >
                        {/* Top: icon + name + step */}
                        <div className="bulk-import-card-top">
                          <div
                            className="bulk-import-card-icon"
                            style={{
                              background: `color-mix(in srgb, ${entity.color} 15%, transparent)`,
                              color: entity.color,
                            }}
                          >
                            <Icon size={20} />
                          </div>
                          <div className="bulk-import-card-info">
                            <div className="bulk-import-card-name">
                              {entity.label}
                            </div>
                            {entity.dependencies && (
                              <div className="bulk-import-card-deps">
                                {entity.dependencies}
                              </div>
                            )}
                          </div>
                          <span className="bulk-import-step-badge">
                            {globalStep}
                          </span>
                        </div>

                        {/* Status row */}
                        <div className="bulk-import-card-status">
                          {isImported ? (
                            <>
                              <Check size={14} style={{ color: "var(--color-green)" }} />
                              <span className="imported-count">
                                {progress.count} records
                              </span>
                              <span className="imported-date">
                                {formatDate(progress.lastImported)}
                              </span>
                            </>
                          ) : (
                            <span>No data imported yet</span>
                          )}
                        </div>

                        {/* Required columns summary */}
                        <div className="bulk-import-card-cols">
                          <strong>Required:</strong>{" "}
                          {requiredCols.length > 0
                            ? requiredCols.map((c) => c.label).join(", ")
                            : "None"}
                          {optionalCount > 0 && (
                            <span> + {optionalCount} optional</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="bulk-import-card-actions">
                          <button
                            className="bulk-import-btn"
                            onClick={() => handleDownloadTemplate(entity)}
                          >
                            <Download size={14} />
                            Template
                          </button>
                          <button
                            className="bulk-import-btn primary"
                            onClick={() => {
                              setSelectedProjectId("");
                              setActiveImport(entity);
                            }}
                          >
                            <Upload size={14} />
                            Import CSV
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ===== Tips ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "16px 20px",
          background: "color-mix(in srgb, var(--color-blue) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-blue) 20%, transparent)",
          borderRadius: "10px",
          margin: "24px 0",
          fontSize: "0.82rem",
          color: "var(--text)",
          lineHeight: "1.6",
        }}
      >
        <Info size={18} style={{ color: "var(--color-blue)", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong>Import Tips:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
            <li>
              Each CSV must include the required columns marked with <strong>*</strong>.
              Optional columns can be left empty.
            </li>
            <li>
              For project-scoped entities, include a <strong>project_name</strong> column
              in your CSV to import across multiple projects at once.
            </li>
            <li>
              Journal entries are auto-generated for invoices, equipment purchases,
              change orders, and leases. Only import the Journal Entries CSV if you
              have pre-crafted entries.
            </li>
            <li>
              You can re-import at any time — existing records are not duplicated
              if the data matches.
            </li>
          </ul>
        </div>
      </div>

      {/* ===== Import History ===== */}
      <div className="import-history">
        <div className="import-history-title">
          <History size={18} />
          Import History
        </div>
        {loadingHistory ? (
          <div className="import-empty">
            <Loader2 size={24} className="spin-icon" />
          </div>
        ) : importHistory.length === 0 ? (
          <div className="import-empty">
            <div className="import-empty-icon">
              <History size={28} />
            </div>
            <div className="import-empty-title">No imports yet</div>
            <div className="import-empty-desc">
              Download a template, fill in your data, and upload it to get
              started.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="import-history-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sheets</th>
                  <th>Rows</th>
                  <th>Success</th>
                  <th>Errors</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((run) => (
                  <tr key={run.id}>
                    <td
                      style={{
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {run.file_name || "--"}
                    </td>
                    <td>
                      {run.run_type === "excel_master"
                        ? "Excel Master"
                        : "CSV Single"}
                    </td>
                    <td>
                      <span className={`import-history-status ${run.status}`}>
                        {run.status === "completed" && <Check size={12} />}
                        {run.status === "processing" && (
                          <Loader2 size={12} className="spin-icon" />
                        )}
                        {run.status === "failed" && <AlertCircle size={12} />}
                        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {run.processed_sheets}/{run.total_sheets}
                    </td>
                    <td>{run.total_rows}</td>
                    <td style={{ color: "var(--color-green)" }}>
                      {run.success_rows}
                    </td>
                    <td
                      style={{
                        color: run.error_rows > 0 ? "var(--color-red)" : "inherit",
                      }}
                    >
                      {run.error_rows}
                    </td>
                    <td>{formatDate(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Import Modal ===== */}
      {activeImport && (
        <ImportModal
          entityName={activeImport.label}
          columns={activeImport.columns}
          sampleData={activeImport.sampleData}
          onImport={handleEntityImport}
          onClose={() => {
            setActiveImport(null);
            setSelectedProjectId("");
          }}
          projects={activeImport.requiresProject ? projects : undefined}
          selectedProjectId={
            activeImport.requiresProject ? selectedProjectId : undefined
          }
          onProjectChange={
            activeImport.requiresProject
              ? (id) => setSelectedProjectId(id)
              : undefined
          }
        />
      )}
    </div>
  );
}
