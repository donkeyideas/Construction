"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

interface ExportButtonProps {
  reportType: string;
  reportTitle: string;
  data: Record<string, unknown>[];
  columns?: { key: string; label: string }[];
}

export default function ExportButton({
  reportType,
  reportTitle,
  data,
  columns,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleExportPdf() {
    setExporting("pdf");
    setOpen(false);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reportType, title: reportTitle, data, columns }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore */ }
    setExporting(null);
  }

  async function handleExportXlsx() {
    setExporting("xlsx");
    setOpen(false);
    try {
      // Dynamic import xlsx for client-side Excel export
      const XLSX = await import("xlsx");
      const cols = columns || (data.length > 0 ? Object.keys(data[0]).map((k) => ({ key: k, label: k })) : []);

      const wsData = [
        cols.map((c) => c.label),
        ...data.map((row) => cols.map((c) => {
          const val = row[c.key];
          return val !== null && val !== undefined ? String(val) : "";
        })),
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, reportTitle.substring(0, 31));
      XLSX.writeFile(wb, `${reportTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch { /* ignore */ }
    setExporting(null);
  }

  async function handleExportCsv() {
    setExporting("csv");
    setOpen(false);
    try {
      const cols = columns || (data.length > 0 ? Object.keys(data[0]).map((k) => ({ key: k, label: k })) : []);
      const header = cols.map((c) => `"${c.label}"`).join(",");
      const rows = data.map((row) =>
        cols.map((c) => {
          const val = row[c.key];
          const str = val !== null && val !== undefined ? String(val).replace(/"/g, '""') : "";
          return `"${str}"`;
        }).join(",")
      );
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(null);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary"
        disabled={!!exporting}
        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
      >
        {exporting ? <Loader2 size={14} className="spin-icon" /> : <Download size={14} />}
        Export
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            minWidth: "180px",
            overflow: "hidden",
          }}>
            <button
              onClick={handleExportPdf}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.85rem",
                color: "var(--foreground)",
                textAlign: "left",
              }}
            >
              <FileText size={16} style={{ color: "var(--color-red)" }} />
              Export as PDF
            </button>
            <button
              onClick={handleExportXlsx}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "none",
                borderTop: "1px solid var(--border)",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.85rem",
                color: "var(--foreground)",
                textAlign: "left",
              }}
            >
              <FileSpreadsheet size={16} style={{ color: "var(--color-green)" }} />
              Export as Excel
            </button>
            <button
              onClick={handleExportCsv}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "none",
                borderTop: "1px solid var(--border)",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.85rem",
                color: "var(--foreground)",
                textAlign: "left",
              }}
            >
              <FileText size={16} style={{ color: "var(--color-blue)" }} />
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
