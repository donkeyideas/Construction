"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

interface ReportExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
}

function escapeCsvValue(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function ReportExportButton({
  data,
  columns,
  filename,
}: ReportExportButtonProps) {
  const t = useTranslations("common");
  function handleExport() {
    const headers = columns.map((c) => escapeCsvValue(c.label)).join(",");
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const raw = row[c.key];
          const val = c.format ? c.format(raw) : raw;
          return escapeCsvValue(val);
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (data.length === 0) {
    return (
      <button className="export-btn" disabled title={t("reportExport.noData")}>
        <Download size={16} />
        {t("reportExport.exportCsv")}
      </button>
    );
  }

  return (
    <button className="export-btn" onClick={handleExport}>
      <Download size={16} />
      {t("reportExport.exportCsv")}
    </button>
  );
}
