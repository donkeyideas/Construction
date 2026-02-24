import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Sheet name -> entity type mapping
// ---------------------------------------------------------------------------

const SHEET_ENTITY_MAP: Record<string, string> = {
  // Primary names (exact match)
  "chart of accounts": "chart_of_accounts",
  "coa": "chart_of_accounts",
  "accounts": "chart_of_accounts",
  "projects": "projects",
  "contacts": "contacts",
  "vendors": "vendors",
  "invoices": "invoices",
  "bank accounts": "bank_accounts",
  "banks": "bank_accounts",
  "equipment": "equipment",
  "time entries": "time_entries",
  "timesheets": "time_entries",
  "change orders": "change_orders",
  "tasks": "tasks",
  "budget items": "project_budget_lines",
  "budget lines": "project_budget_lines",
  "budget": "project_budget_lines",
  "daily logs": "daily_logs",
  "rfis": "rfis",
  "contracts": "contracts",
  "leases": "leases",
  "maintenance": "maintenance",
  "safety incidents": "safety_incidents",
  "toolbox talks": "toolbox_talks",
  "equipment assignments": "equipment_assignments",
  "equipment maintenance": "equipment_maintenance",
  "units": "units",
  "certifications": "certifications",
  "opportunities": "opportunities",
  "bids": "bids",
  "safety inspections": "safety_inspections",
  "journal entries": "journal_entries",
  "submittals": "submittals",
  "properties": "properties",
  "phases": "phases",
  "property expenses": "property_expenses",
  "estimates": "estimates",
  // Supplementary sheets (may overlap with invoices / journal_entries)
  "accounts receivable": "accounts_receivable",
  "accounts payable": "accounts_payable",
  "opening balances": "opening_balances",
};

// ---------------------------------------------------------------------------
// Dependency ordering
// ---------------------------------------------------------------------------

/** Entities earlier in this list must be imported before those later. */
const DEPENDENCY_ORDER: string[] = [
  "chart_of_accounts",
  "bank_accounts",
  "properties",
  "units",
  "projects",
  "contacts",
  "vendors",
  "equipment",
  "phases",
  "certifications",
  "opportunities",
  "bids",
  "contracts",
  "leases",
  "maintenance",
  "project_budget_lines",
  "invoices",
  "journal_entries",
  "time_entries",
  "change_orders",
  "daily_logs",
  "rfis",
  "safety_incidents",
  "safety_inspections",
  "toolbox_talks",
  "equipment_assignments",
  "equipment_maintenance",
  "submittals",
  "tasks",
  "property_expenses",
  "estimates",
  // Supplementary — processed only if parent entity absent
  "accounts_receivable",
  "accounts_payable",
  "opening_balances",
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an Excel file buffer into an array of sheet objects.
 * Each sheet contains the sheet name, detected headers, and rows as
 * key-value objects (header -> cell value as string).
 *
 * Uses cellDates to properly handle date cells from Excel (which store
 * dates as serial numbers internally). Without this, dates appear as
 * numbers like "43904.83333" instead of "2020-03-15".
 */
export function parseXlsxFile(buffer: ArrayBuffer): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert to array-of-arrays, raw values as strings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
      rawNumbers: false,
    });

    if (raw.length < 2) continue; // Need at least header + 1 data row

    // First row is headers
    const headers = raw[0].map((h: unknown) => normalizeHeader(String(h)));
    const dataRows = raw.slice(1);

    const rows: Record<string, string>[] = [];
    for (const row of dataRows) {
      // Skip entirely empty rows
      if (row.every((cell: unknown) => String(cell).trim() === "")) continue;

      const record: Record<string, string> = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        if (!key) continue;
        record[key] = cellToString(row[c]);
      }
      rows.push(record);
    }

    if (rows.length > 0) {
      sheets.push({ name: sheetName, headers, rows });
    }
  }

  return sheets;
}

/**
 * Convert a cell value to a trimmed string.
 * Handles Date objects (from cellDates: true) by converting to ISO date.
 */
function cellToString(val: unknown): string {
  if (val == null) return "";
  if (val instanceof Date) {
    // Convert Date objects to YYYY-MM-DD format
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).trim();
}

/**
 * Map an Excel sheet name to an import entity type.
 * Returns null if the sheet name does not match any known entity.
 *
 * Handles numbered prefixes (e.g. "01_chart_of_accounts" -> "chart of accounts")
 * and underscore/snake_case variants (e.g. "chart_of_accounts" -> "chart of accounts").
 */
export function mapSheetToEntity(sheetName: string): string | null {
  const normalized = sheetName.trim().toLowerCase();

  // Direct match
  if (SHEET_ENTITY_MAP[normalized]) return SHEET_ENTITY_MAP[normalized];

  // Strip numeric prefix like "01_", "02_" etc.
  const stripped = normalized.replace(/^\d+[_\-.\s]+/, "");
  if (SHEET_ENTITY_MAP[stripped]) return SHEET_ENTITY_MAP[stripped];

  // Replace underscores with spaces (e.g. "chart_of_accounts" -> "chart of accounts")
  const spaced = stripped.replace(/_/g, " ");
  if (SHEET_ENTITY_MAP[spaced]) return SHEET_ENTITY_MAP[spaced];

  return null;
}

/**
 * Sort sheet names by import dependency order so that prerequisite
 * entities (e.g. chart_of_accounts, projects) are processed first.
 * Sheets not found in the dependency list go to the end.
 */
export function sortSheetsByDependency(sheets: ParsedSheet[]): ParsedSheet[] {
  return [...sheets].sort((a, b) => {
    const entityA = mapSheetToEntity(a.name);
    const entityB = mapSheetToEntity(b.name);
    const idxA = entityA ? DEPENDENCY_ORDER.indexOf(entityA) : -1;
    const idxB = entityB ? DEPENDENCY_ORDER.indexOf(entityB) : -1;
    // Unmapped sheets go to the end
    const posA = idxA === -1 ? DEPENDENCY_ORDER.length : idxA;
    const posB = idxB === -1 ? DEPENDENCY_ORDER.length : idxB;
    return posA - posB;
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a human-readable header like "Account Number" to snake_case
 * ("account_number") for direct mapping to database columns.
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
