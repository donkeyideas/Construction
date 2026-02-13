"use client";

import { useState, useRef } from "react";
import { Upload, X, Download, AlertTriangle, CheckCircle } from "lucide-react";
import {
  parseCSV,
  readFileAsText,
  generateCSVTemplate,
  downloadCSV,
  autoMapColumns,
  mapRowsToObjects,
  type ImportColumn,
} from "@/lib/utils/csv-parser";

interface ImportModalProps {
  entityName: string;
  columns: ImportColumn[];
  sampleData?: Record<string, string>[];
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; errors: string[] }>;
  onClose: () => void;
}

export default function ImportModal({
  entityName,
  columns,
  sampleData,
  onImport,
  onClose,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Steps: upload -> preview -> importing -> done
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");

  // File data
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});

  // Results
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate(columns, sampleData);
    downloadCSV(csv, `${entityName.toLowerCase().replace(/\s/g, "-")}-import-template.csv`);
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a CSV file (.csv)");
      return;
    }

    try {
      setError(null);
      const text = await readFileAsText(file);
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0) {
        setError("CSV file appears to be empty");
        return;
      }

      if (parsed.rows.length === 0) {
        setError("CSV file has headers but no data rows");
        return;
      }

      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);

      // Auto-map columns
      const mapping = autoMapColumns(parsed.headers, columns);
      setColumnMapping(mapping);

      // Validate
      const { errors } = mapRowsToObjects(parsed.headers, parsed.rows, columns, mapping);
      setValidationErrors(errors);

      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleMappingChange = (colKey: string, headerIdx: number) => {
    const newMapping = { ...columnMapping, [colKey]: headerIdx };
    if (headerIdx === -1) {
      delete newMapping[colKey];
    }
    setColumnMapping(newMapping);

    // Re-validate
    const { errors } = mapRowsToObjects(headers, rows, columns, newMapping);
    setValidationErrors(errors);
  };

  const handleImport = async () => {
    setStep("importing");
    setError(null);

    try {
      const { data, errors } = mapRowsToObjects(headers, rows, columns, columnMapping);

      if (data.length === 0) {
        setError("No valid rows to import. Please fix the errors and try again.");
        setStep("preview");
        return;
      }

      const result = await onImport(data);
      setImportResult(result);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  };

  const requiredUnmapped = columns.filter(
    (c) => c.required && columnMapping[c.key] === undefined
  );

  return (
    <div
      className="ticket-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ticket-modal" style={{ maxWidth: "680px" }}>
        <div className="ticket-modal-header">
          <h3>Import {entityName}</h3>
          <button className="ticket-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="ticket-form-error">{error}</div>}

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <button
                className="btn btn-ghost"
                onClick={handleDownloadTemplate}
                style={{ fontSize: "0.85rem" }}
              >
                <Download size={14} />
                Download CSV Template
              </button>
            </div>

            <div
              className={`doc-upload-dropzone ${isDragOver ? "doc-upload-dropzone-active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <div style={{ textAlign: "center" }}>
                <Upload
                  size={32}
                  style={{ color: "var(--muted)", marginBottom: "8px" }}
                />
                <div style={{ fontWeight: 500 }}>
                  Drop CSV file here or click to browse
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  Accepts .csv files
                </div>
              </div>
            </div>

            <div className="ticket-form-actions" style={{ marginTop: "16px" }}>
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Column Mapping */}
        {step === "preview" && (
          <div>
            <div style={{ marginBottom: "12px", fontSize: "0.85rem", color: "var(--muted)" }}>
              File: <strong>{fileName}</strong> — {rows.length} row{rows.length !== 1 ? "s" : ""} found
            </div>

            {/* Column Mapping */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
                Column Mapping
              </div>
              <div className="import-mapping-grid">
                {columns.map((col) => (
                  <div key={col.key} className="import-mapping-row">
                    <span className="import-mapping-label">
                      {col.label}
                      {col.required && <span style={{ color: "var(--color-red)" }}> *</span>}
                    </span>
                    <select
                      className="ticket-form-select"
                      value={columnMapping[col.key] ?? -1}
                      onChange={(e) =>
                        handleMappingChange(col.key, parseInt(e.target.value))
                      }
                    >
                      <option value={-1}>— Skip —</option>
                      {headers.map((h, idx) => (
                        <option key={idx} value={idx}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Preview (first 5 rows) */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>
                Preview (first 5 rows)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      {columns
                        .filter((c) => columnMapping[c.key] !== undefined)
                        .map((c) => (
                          <th key={c.key}>{c.label}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {columns
                          .filter((c) => columnMapping[c.key] !== undefined)
                          .map((c) => (
                            <td key={c.key}>
                              {row[columnMapping[c.key]] ?? ""}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="import-validation-errors">
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <AlertTriangle size={16} style={{ color: "var(--color-amber)" }} />
                  <span style={{ fontWeight: 600 }}>
                    {validationErrors.length} validation warning{validationErrors.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "0.85rem" }}>
                  {validationErrors.slice(0, 10).map((err, i) => (
                    <div key={i} style={{ color: "var(--color-amber)", marginBottom: "2px" }}>
                      {err}
                    </div>
                  ))}
                  {validationErrors.length > 10 && (
                    <div style={{ color: "var(--muted)" }}>
                      ...and {validationErrors.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {requiredUnmapped.length > 0 && (
              <div className="ticket-form-error">
                Missing required columns: {requiredUnmapped.map((c) => c.label).join(", ")}
              </div>
            )}

            <div className="ticket-form-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setStep("upload");
                  setHeaders([]);
                  setRows([]);
                }}
              >
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={requiredUnmapped.length > 0}
              >
                Import {rows.length - validationErrors.length} Row{rows.length - validationErrors.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              className="import-spinner"
              style={{ margin: "0 auto 16px" }}
            />
            <div style={{ fontWeight: 500 }}>Importing {entityName}...</div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "4px" }}>
              Please wait, this may take a moment.
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <CheckCircle
              size={48}
              style={{ color: "var(--color-green)", marginBottom: "16px" }}
            />
            <div style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "8px" }}>
              Import Complete
            </div>
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "var(--color-green)", fontWeight: 600 }}>
                {importResult.success}
              </span>{" "}
              {entityName.toLowerCase()} imported successfully.
            </div>

            {importResult.errors.length > 0 && (
              <div className="import-validation-errors" style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  {importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""}:
                </div>
                {importResult.errors.slice(0, 5).map((err, i) => (
                  <div key={i} style={{ fontSize: "0.85rem", color: "var(--color-red)" }}>
                    {err}
                  </div>
                ))}
              </div>
            )}

            <div className="ticket-form-actions" style={{ marginTop: "20px" }}>
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
