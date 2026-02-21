/**
 * Combines all CSV files into a single .xlsx master template.
 * Sheet names match the SHEET_ENTITY_MAP in xlsx-parser.ts exactly.
 *
 * IMPORTANT: All cells are forced to string type to prevent xlsx
 * from converting dates like "2020-03-15" to serial numbers (43904).
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;

// CSV file -> sheet name (must match SHEET_ENTITY_MAP in xlsx-parser.ts)
const SHEETS = [
  { csv: "01_chart_of_accounts.csv", sheet: "Chart of Accounts" },
  { csv: "02_bank_accounts.csv", sheet: "Bank Accounts" },
  { csv: "03_contacts.csv", sheet: "Contacts" },
  { csv: "04_vendors.csv", sheet: "Vendors" },
  { csv: "05_equipment.csv", sheet: "Equipment" },
  { csv: "06_projects.csv", sheet: "Projects" },
  { csv: "07_properties.csv", sheet: "Properties" },
  { csv: "08_opportunities.csv", sheet: "Opportunities" },
  { csv: "09_bids.csv", sheet: "Bids" },
  { csv: "10_contracts.csv", sheet: "Contracts" },
  { csv: "11_phases.csv", sheet: "Phases" },
  { csv: "12_tasks.csv", sheet: "Tasks" },
  { csv: "13_budget_lines.csv", sheet: "Budget Lines" },
  { csv: "14_daily_logs.csv", sheet: "Daily Logs" },
  { csv: "15_rfis.csv", sheet: "RFIs" },
  { csv: "16_change_orders.csv", sheet: "Change Orders" },
  { csv: "17_submittals.csv", sheet: "Submittals" },
  { csv: "18_safety_incidents.csv", sheet: "Safety Incidents" },
  { csv: "19_safety_inspections.csv", sheet: "Safety Inspections" },
  { csv: "20_toolbox_talks.csv", sheet: "Toolbox Talks" },
  { csv: "21_certifications.csv", sheet: "Certifications" },
  { csv: "22_time_entries.csv", sheet: "Time Entries" },
  { csv: "23_equipment_maintenance.csv", sheet: "Equipment Maintenance" },
  { csv: "24_invoices.csv", sheet: "Invoices" },
  { csv: "25_journal_entries.csv", sheet: "Journal Entries" },
  { csv: "26_leases.csv", sheet: "Leases" },
  { csv: "27_maintenance.csv", sheet: "Maintenance" },
  { csv: "28_property_expenses.csv", sheet: "Property Expenses" },
  { csv: "29_equipment_assignments.csv", sheet: "Equipment Assignments" },
  { csv: "30_estimates.csv", sheet: "Estimates" },
];

/**
 * Simple CSV parser that handles quoted fields with commas.
 * Returns array of arrays (rows x columns), all values as strings.
 */
function parseCSV(text) {
  const rows = [];
  let i = 0;
  while (i < text.length) {
    const row = [];
    while (i < text.length) {
      if (text[i] === '"') {
        // Quoted field
        i++;
        let val = "";
        while (i < text.length) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              val += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            val += text[i];
            i++;
          }
        }
        row.push(val);
        if (text[i] === ",") i++;
        else if (text[i] === "\r" || text[i] === "\n") break;
      } else {
        // Unquoted field
        let val = "";
        while (i < text.length && text[i] !== "," && text[i] !== "\r" && text[i] !== "\n") {
          val += text[i];
          i++;
        }
        row.push(val);
        if (text[i] === ",") i++;
        else break;
      }
    }
    // Skip line ending
    if (text[i] === "\r") i++;
    if (text[i] === "\n") i++;
    if (row.length > 0 && row.some((v) => v.trim() !== "")) {
      rows.push(row);
    }
  }
  return rows;
}

const workbook = XLSX.utils.book_new();

for (const { csv, sheet } of SHEETS) {
  const filePath = path.join(DIR, csv);
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP: ${csv} not found`);
    continue;
  }

  const csvText = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(csvText);

  // Create worksheet with all string cells (no type auto-detection)
  const ws = {};
  const range = { s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 0 } };
  for (let R = 0; R < rows.length; R++) {
    for (let C = 0; C < rows[R].length; C++) {
      if (C > range.e.c) range.e.c = C;
      ws[XLSX.utils.encode_cell({ r: R, c: C })] = {
        t: "s",
        v: rows[R][C],
      };
    }
  }
  ws["!ref"] = XLSX.utils.encode_range(range);

  XLSX.utils.book_append_sheet(workbook, ws, sheet);
  console.log(`  + ${sheet} (${rows.length - 1} rows from ${csv})`);
}

const outPath = path.join(DIR, "Meridian_Development_Group_Master.xlsx");
XLSX.writeFile(workbook, outPath);
console.log(`\nCreated: ${outPath}`);
console.log(`Sheets: ${workbook.SheetNames.length}`);
