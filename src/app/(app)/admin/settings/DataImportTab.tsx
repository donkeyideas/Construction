"use client";

import { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Database,
  Building2,
  Users,
  Truck,
  Receipt,
  Landmark,
  ClipboardList,
  HardHat,
  FileText,
  Calendar,
  Briefcase,
  ShieldCheck,
  Wrench,
  BookOpen,
  FolderOpen,
  BarChart3,
  ListChecks,
  Layers,
  History,
} from "lucide-react";

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

// ---------------------------------------------------------------------------
// Entity display config
// ---------------------------------------------------------------------------

const ENTITY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  chart_of_accounts: { label: "Chart of Accounts", icon: BookOpen, color: "var(--color-blue)" },
  bank_accounts: { label: "Bank Accounts", icon: Landmark, color: "var(--color-green)" },
  projects: { label: "Projects", icon: Building2, color: "var(--color-amber)" },
  contacts: { label: "Contacts", icon: Users, color: "var(--color-blue)" },
  vendors: { label: "Vendors", icon: Users, color: "var(--color-purple, #7c3aed)" },
  equipment: { label: "Equipment", icon: Truck, color: "var(--color-amber)" },
  invoices: { label: "Invoices", icon: Receipt, color: "var(--color-green)" },
  time_entries: { label: "Time Entries", icon: Clock, color: "var(--color-blue)" },
  change_orders: { label: "Change Orders", icon: ClipboardList, color: "var(--color-amber)" },
  tasks: { label: "Tasks", icon: ListChecks, color: "var(--color-blue)" },
  project_budget_lines: { label: "Budget Items", icon: BarChart3, color: "var(--color-green)" },
  daily_logs: { label: "Daily Logs", icon: Calendar, color: "var(--color-blue)" },
  rfis: { label: "RFIs", icon: FileText, color: "var(--color-amber)" },
  contracts: { label: "Contracts", icon: Briefcase, color: "var(--color-blue)" },
  phases: { label: "Phases", icon: Layers, color: "var(--color-green)" },
  safety_incidents: { label: "Safety Incidents", icon: ShieldCheck, color: "var(--color-red)" },
  safety_inspections: { label: "Safety Inspections", icon: HardHat, color: "var(--color-amber)" },
  toolbox_talks: { label: "Toolbox Talks", icon: HardHat, color: "var(--color-green)" },
  certifications: { label: "Certifications", icon: ShieldCheck, color: "var(--color-blue)" },
  opportunities: { label: "Opportunities", icon: Briefcase, color: "var(--color-amber)" },
  bids: { label: "Bids", icon: FolderOpen, color: "var(--color-green)" },
  properties: { label: "Properties", icon: Building2, color: "var(--color-blue)" },
  leases: { label: "Leases", icon: FileText, color: "var(--color-green)" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "var(--color-amber)" },
  submittals: { label: "Submittals", icon: FileText, color: "var(--color-blue)" },
  journal_entries: { label: "Journal Entries", icon: BookOpen, color: "var(--color-green)" },
  equipment_assignments: { label: "Equipment Assignments", icon: Truck, color: "var(--color-amber)" },
  equipment_maintenance: { label: "Equipment Maintenance", icon: Wrench, color: "var(--color-blue)" },
};

// All entity keys for the grid
const ENTITY_KEYS = Object.keys(ENTITY_CONFIG);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DataImportTab() {
  // State
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
  const [importProgress, setImportProgress] = useState<ImportProgress>({});
  const [importHistory, setImportHistory] = useState<ImportRunRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch import history and progress on mount
  useEffect(() => {
    fetchImportHistory();
    fetchImportProgress();
  }, []);

  async function fetchImportHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/import/excel/history");
      if (res.ok) {
        const data = await res.json();
        setImportHistory(data.runs || []);
      }
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setLoadingHistory(false);
    }
  }

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
      // Silently fail
    }
  }

  async function handleFileUpload(file: File) {
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

      // Simulate progress during upload
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

      // Refresh data
      fetchImportHistory();
      fetchImportProgress();
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
    if (file) handleFileUpload(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

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

  function formatEntityLabel(entity: string): string {
    return (
      ENTITY_CONFIG[entity]?.label ||
      entity
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
  }

  return (
    <div>
      {/* ===== Hero: Download & Upload ===== */}
      <div className="import-hero">
        {/* Download Template */}
        <div className="import-hero-card">
          <div className="import-hero-card-icon download">
            <FileSpreadsheet size={22} />
          </div>
          <h3>Download Template</h3>
          <p>
            Download the master Excel template with pre-configured sheets for all
            entity types. Fill in your data and upload it back to import everything
            at once.
          </p>
          <div>
            <a
              href="/api/import/template"
              download
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              <Download size={15} />
              Download Template
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
              onChange={handleFileChange}
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
                  <strong>Click to browse</strong> or drag and drop your .xlsx file
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

      {/* ===== Entity cards grid ===== */}
      <div className="import-entity-section-title">
        <Database size={18} />
        Data Entities
      </div>
      <div className="import-entity-grid">
        {ENTITY_KEYS.map((entity) => {
          const config = ENTITY_CONFIG[entity];
          const progress = importProgress[entity];
          const Icon = config.icon;
          return (
            <div key={entity} className="import-entity-card">
              <div className="import-entity-card-header">
                <div
                  className="import-entity-card-icon"
                  style={{
                    background: `${config.color}15`,
                    color: config.color,
                  }}
                >
                  <Icon size={17} />
                </div>
                <div className="import-entity-card-name">{config.label}</div>
              </div>
              <div className="import-entity-card-stats">
                {progress ? (
                  <>
                    <div className="import-entity-card-count">
                      <strong>{progress.count}</strong> imported
                    </div>
                    <div className="import-entity-card-date">
                      {formatDate(progress.lastImported)}
                    </div>
                  </>
                ) : (
                  <div className="import-entity-card-count">
                    No data imported yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Import history ===== */}
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
              Download the template, fill in your data, and upload it to get started.
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
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                    <td style={{ color: run.error_rows > 0 ? "var(--color-red)" : "inherit" }}>
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
    </div>
  );
}
