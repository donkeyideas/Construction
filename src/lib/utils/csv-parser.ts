/**
 * CSV Parser utilities for importing data into Buildwrk.
 * Handles parsing, template generation, and download.
 */

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
}

/**
 * Parse a CSV file into headers and rows.
 */
export function parseCSV(text: string): CSVParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Read a File as text.
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Column definition for import mapping.
 */
export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  type?: "string" | "number" | "date" | "email";
}

/**
 * Generate a CSV template string from column definitions and sample data.
 */
export function generateCSVTemplate(
  columns: ImportColumn[],
  sampleRows?: Record<string, string>[]
): string {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const rows =
    sampleRows?.map((row) =>
      columns.map((c) => `"${row[c.key] ?? ""}"`).join(",")
    ) ?? [];
  return [header, ...rows].join("\n");
}

/**
 * Trigger a CSV download in the browser.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Auto-map CSV headers to expected columns (case-insensitive, fuzzy).
 */
export function autoMapColumns(
  csvHeaders: string[],
  expectedColumns: ImportColumn[]
): Record<string, number> {
  const mapping: Record<string, number> = {};

  for (const col of expectedColumns) {
    const normalizedKey = col.key.toLowerCase().replace(/_/g, " ");
    const normalizedLabel = col.label.toLowerCase();

    const idx = csvHeaders.findIndex((h) => {
      const nh = h.toLowerCase().trim();
      return (
        nh === normalizedKey ||
        nh === normalizedLabel ||
        nh === col.key.toLowerCase() ||
        nh.replace(/[_\s-]/g, "") === normalizedKey.replace(/[_\s-]/g, "")
      );
    });

    if (idx >= 0) {
      mapping[col.key] = idx;
    }
  }

  return mapping;
}

/**
 * Convert parsed CSV rows into structured objects using column mapping.
 */
export function mapRowsToObjects(
  headers: string[],
  rows: string[][],
  columns: ImportColumn[],
  mapping: Record<string, number>
): { data: Record<string, string>[]; errors: string[] } {
  const data: Record<string, string>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    let rowValid = true;

    for (const col of columns) {
      const colIdx = mapping[col.key];
      const value = colIdx !== undefined ? (row[colIdx] ?? "").trim() : "";

      if (col.required && !value) {
        errors.push(`Row ${i + 2}: Missing required field "${col.label}"`);
        rowValid = false;
      }

      obj[col.key] = value;
    }

    if (rowValid) {
      data.push(obj);
    }
  }

  return { data, errors };
}
