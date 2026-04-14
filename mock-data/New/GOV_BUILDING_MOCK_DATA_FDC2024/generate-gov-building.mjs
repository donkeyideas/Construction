/**
 * Generate FDC2024 Federal District Courthouse mock data as a single XLSX file.
 *
 * Usage: node generate-gov-building.mjs
 * Output: FDC2024_Federal_Courthouse.xlsx
 *
 * This file is designed for the Buildwrk master template bulk import.
 * Critical rules followed:
 *   - Equipment purchase_cost = 0 (prevents auto-JE double-counting)
 *   - Change order status = "draft" (prevents auto-JE)
 *   - Manual JEs only for NON-invoice items (grants, G&A, depreciation, etc.)
 *   - Invoice auto-JEs handle AR/AP/Revenue/Expense booking
 *   - Paid invoices trigger auto-payment JEs (DR Cash / CR AR or DR AP / CR Cash)
 */

import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_NAME = "Federal District Courthouse & Public Safety Complex";

// ============================================================================
// Sheet 1: Chart of Accounts (51 rows)
// ============================================================================
const chartOfAccounts = [
  // Assets
  ["1000", "Cash & Equivalents", "asset", "current_asset", "Operating cash and short-term deposits"],
  ["1005", "Grant Funds - Federal", "asset", "current_asset", "Federal grant funds received and held"],
  ["1006", "Grant Funds - State", "asset", "current_asset", "State appropriation funds held"],
  ["1010", "Accounts Receivable", "asset", "current_asset", "Amounts owed by government clients"],
  ["1015", "Government Contract Receivable", "asset", "current_asset", "Amounts due under government prime contracts"],
  ["1020", "Retainage Receivable", "asset", "current_asset", "Retained amounts held by government owner"],
  ["1025", "Sales Tax Receivable", "asset", "current_asset", "Recoverable input tax on purchases"],
  ["1030", "Costs in Excess of Billings", "asset", "current_asset", "Underbillings on government contracts"],
  ["1040", "Prepaid Expenses", "asset", "current_asset", "Prepaid insurance bonds and permits"],
  ["1050", "Inventory & Materials on Site", "asset", "current_asset", "Stored materials approved for payment"],
  ["1100", "Property & Equipment", "asset", "fixed_asset", "Construction equipment and vehicles"],
  ["1110", "Accumulated Depreciation", "asset", "fixed_asset", "Contra account for accumulated depreciation"],
  ["1200", "Deposits", "asset", "other_asset", "Security deposits and bid bonds"],
  // Liabilities
  ["2000", "Accounts Payable", "liability", "current_liability", "Amounts owed to vendors and subcontractors"],
  ["2010", "Subcontractor Payable", "liability", "current_liability", "Amounts owed to subcontractors"],
  ["2020", "Retainage Payable", "liability", "current_liability", "Amounts withheld from subcontractors"],
  ["2030", "Billings in Excess of Costs", "liability", "current_liability", "Overbillings on government contracts"],
  ["2040", "Accrued Wages & Benefits", "liability", "current_liability", "Payroll and benefits accrued not yet paid"],
  ["2050", "Accrued Taxes", "liability", "current_liability", "Federal state and payroll taxes payable"],
  ["2055", "Sales Tax Payable", "liability", "current_liability", "Sales and use tax collected"],
  ["2060", "Performance Bond Liability", "liability", "current_liability", "Performance and payment bond obligations"],
  ["2070", "Workers Comp Reserve", "liability", "current_liability", "Self-insured workers compensation reserve"],
  ["2080", "Notes Payable - Equipment", "liability", "long_term_liability", "Equipment financing notes"],
  ["2090", "Deferred Revenue - Grants", "liability", "long_term_liability", "Grant funding received but not yet earned"],
  // Equity
  ["3000", "Common Stock", "equity", "equity", "Common stock issued"],
  ["3010", "Retained Earnings", "equity", "equity", "Cumulative retained earnings"],
  ["3020", "Current Year Net Income", "equity", "equity", "Current year net income"],
  // Revenue
  ["4000", "Contract Revenue - Government", "revenue", "revenue", "Prime contract revenue from government projects"],
  ["4010", "Federal Grant Revenue", "revenue", "revenue", "Revenue recognized from federal grants"],
  ["4020", "State Appropriation Revenue", "revenue", "revenue", "Revenue recognized from state appropriations"],
  ["4030", "Change Order Revenue", "revenue", "revenue", "Approved change order revenue"],
  ["4040", "Bond Premium Revenue", "revenue", "revenue", "Premium on performance and payment bonds"],
  ["4050", "Equipment Rental Revenue", "revenue", "revenue", "Revenue from equipment rental to project"],
  // Direct Costs (Cost of Revenue)
  ["5000", "Direct Labor", "expense", "cost_of_revenue", "Field labor wages and burden"],
  ["5010", "Subcontractor Costs", "expense", "cost_of_revenue", "Payments to subcontractors"],
  ["5020", "Materials & Supplies", "expense", "cost_of_revenue", "Direct materials incorporated into project"],
  ["5030", "Equipment Costs", "expense", "cost_of_revenue", "Equipment rental and depreciation on project"],
  ["5040", "Other Direct Costs", "expense", "cost_of_revenue", "Permits fees testing and inspections"],
  ["5050", "Davis-Bacon Compliance Costs", "expense", "cost_of_revenue", "Prevailing wage compliance and reporting"],
  ["5060", "Section 3 Compliance Costs", "expense", "cost_of_revenue", "HUD Section 3 compliance and reporting"],
  // Operating Expenses (G&A)
  ["6000", "Project Management", "expense", "operating_expense", "PM superintendent and field staff salaries"],
  ["6010", "General & Administrative", "expense", "operating_expense", "Office salaries overhead and admin"],
  ["6020", "Insurance", "expense", "operating_expense", "General liability umbrella workers comp premiums"],
  ["6030", "Bonds", "expense", "operating_expense", "Performance payment and bid bond premiums"],
  ["6040", "Depreciation", "expense", "operating_expense", "Depreciation on company owned equipment"],
  ["6050", "Professional Fees", "expense", "operating_expense", "Legal accounting and consulting"],
  ["6060", "Marketing & Business Development", "expense", "operating_expense", "Proposal costs and business development"],
  ["6070", "Office & Facilities", "expense", "operating_expense", "Rent utilities and office expenses"],
  ["6080", "Vehicle & Travel", "expense", "operating_expense", "Company vehicles and travel expenses"],
  ["6090", "IT & Software", "expense", "operating_expense", "Technology and software subscriptions"],
  // Other
  ["7000", "Interest Expense", "expense", "other_expense", "Interest on equipment notes and credit lines"],
];

// ============================================================================
// Sheet 2: Bank Accounts (6 rows)
// ============================================================================
const bankAccounts = [
  ["General Operating", "Bank of America", "checking", "4421", "0560", 3850000],
  ["Payroll Account", "Bank of America", "checking", "4422", "0560", 925000],
  ["Federal Grant Restricted - GSA", "Bank of America", "checking", "4423", "0560", 2200000],
  ["State Appropriation Restricted", "Wells Fargo", "checking", "7751", "1210", 4100000],
  ["CDBG Grant Restricted", "Wells Fargo", "checking", "7752", "1210", 350000],
  ["Retainage Reserve", "Bank of America", "savings", "4424", "0560", 3490000],
];

// ============================================================================
// Sheet 3: Projects (1 row)
// ============================================================================
const projects = [
  [
    PROJECT_NAME,
    "FDC-2024",
    "active",
    "government",
    "1500 Constitution Ave NW",
    "Washington",
    "DC",
    "20001",
    "U.S. General Services Administration",
    "t.jefferson@gsa.gov",
    "202-555-0201",
    68500000,
    64200000,
    "2024-02-01",
    "2026-09-30",
    "New 12-story federal courthouse with 24 courtrooms district attorney and public defender suites secure holding facility and 850-space parking structure. Funded through GSA appropriations CDBG grant and state public safety bond. Davis-Bacon prevailing wage and Section 3 hiring requirements apply. LEED Gold certification target.",
    52,
  ],
];

// ============================================================================
// Sheet 4: Contacts (32 rows) — employees + clients + architect
// ============================================================================
const contacts = [
  // 25 FCD Employees
  ["James", "Whitfield", "employee", "j.whitfield@fcdgov.com", "202-555-0101", "Federal Construction Dynamics", "CEO & President"],
  ["Sandra", "Okafor", "employee", "s.okafor@fcdgov.com", "202-555-0102", "Federal Construction Dynamics", "Chief Financial Officer"],
  ["Marcus", "Delaney", "employee", "m.delaney@fcdgov.com", "202-555-0103", "Federal Construction Dynamics", "VP of Operations"],
  ["Patricia", "Nguyen", "employee", "p.nguyen@fcdgov.com", "202-555-0104", "Federal Construction Dynamics", "Project Executive"],
  ["Warren", "Collins", "employee", "w.collins@fcdgov.com", "202-555-0105", "Federal Construction Dynamics", "Project Executive"],
  ["Daniel", "Hargrove", "employee", "d.hargrove@fcdgov.com", "202-555-0106", "Federal Construction Dynamics", "Senior Project Manager"],
  ["Linda", "Castillo", "employee", "l.castillo@fcdgov.com", "202-555-0107", "Federal Construction Dynamics", "Project Manager"],
  ["Kevin", "Osei", "employee", "k.osei@fcdgov.com", "202-555-0108", "Federal Construction Dynamics", "Senior Superintendent"],
  ["Raymond", "Torres", "employee", "r.torres@fcdgov.com", "202-555-0109", "Federal Construction Dynamics", "Safety Director"],
  ["Angela", "Petrov", "employee", "a.petrov@fcdgov.com", "202-555-0110", "Federal Construction Dynamics", "Project Controller"],
  ["Brenda", "Walsh", "employee", "b.walsh@fcdgov.com", "202-555-0111", "Federal Construction Dynamics", "Compliance Officer"],
  ["Derek", "Simmons", "employee", "d.simmons@fcdgov.com", "202-555-0112", "Federal Construction Dynamics", "Quality Control Manager"],
  ["Amara", "Nwosu", "employee", "a.nwosu@fcdgov.com", "202-555-0113", "Federal Construction Dynamics", "BIM/VDC Coordinator"],
  ["Carlos", "Reyes", "employee", "c.reyes@fcdgov.com", "202-555-0114", "Federal Construction Dynamics", "Project Engineer - Structural"],
  ["Jennifer", "Pak", "employee", "j.pak@fcdgov.com", "202-555-0115", "Federal Construction Dynamics", "Project Engineer - MEP"],
  ["Gregory", "Hoffman", "employee", "g.hoffman@fcdgov.com", "202-555-0116", "Federal Construction Dynamics", "Assistant Superintendent"],
  ["Tamika", "Robinson", "employee", "t.robinson@fcdgov.com", "202-555-0117", "Federal Construction Dynamics", "Office Manager"],
  ["Michael", "Brennan", "employee", "m.brennan@fcdgov.com", "202-555-0118", "Federal Construction Dynamics", "Field Supervisor - Concrete"],
  ["Russell", "Yamamoto", "employee", "r.yamamoto@fcdgov.com", "202-555-0119", "Federal Construction Dynamics", "Field Supervisor - Steel"],
  ["Antonio", "Delgado", "employee", "a.delgado@fcdgov.com", "202-555-0120", "Federal Construction Dynamics", "Field Supervisor - MEP"],
  ["Diane", "Washington", "employee", "d.washington@fcdgov.com", "202-555-0121", "Federal Construction Dynamics", "Field Supervisor - Finishes"],
  ["Robert", "Kim", "employee", "r.kim@fcdgov.com", "202-555-0122", "Federal Construction Dynamics", "Field Supervisor - Enclosure"],
  ["Nicole", "Andersen", "employee", "n.andersen@fcdgov.com", "202-555-0123", "Federal Construction Dynamics", "Document Control Specialist"],
  ["Terrence", "Ogundimu", "employee", "t.ogundimu@fcdgov.com", "202-555-0124", "Federal Construction Dynamics", "Section 3 Outreach Coordinator"],
  ["Sharon", "Levine", "employee", "s.levine@fcdgov.com", "202-555-0125", "Federal Construction Dynamics", "Cost Estimator"],
  // 6 Government Client Contacts
  ["Thomas", "Jefferson", "client", "t.jefferson@gsa.gov", "202-555-0201", "U.S. General Services Administration", "Contracting Officer"],
  ["Diane", "Kaminski", "client", "d.kaminski@gsa.gov", "202-555-0202", "U.S. General Services Administration", "Contracting Officer Representative"],
  ["Robert", "Greenfield", "client", "r.greenfield@statearch.gov", "202-555-0203", "State Dept of Public Works", "Deputy Director"],
  ["Michelle", "Obi", "client", "m.obi@hud.gov", "202-555-0204", "U.S. Dept of Housing & Urban Development", "Grant Administrator"],
  ["Frank", "Sloane", "client", "f.sloane@hud.gov", "202-555-0205", "CDBG Office", "Program Manager"],
  // 1 Architect
  ["Richard", "Thornton", "client", "r.thornton@thorntonarch.com", "202-555-0206", "Thornton Hartman Architects", "Principal Architect of Record"],
  // 1 Owner's Rep
  ["Catherine", "Pryor", "client", "c.pryor@fedprojectrep.com", "202-555-0207", "Federal Project Representation LLC", "Owners Representative"],
];

// ============================================================================
// Sheet 5: Vendors (17 rows)
// ============================================================================
const vendors = [
  ["Eagle Excavation LLC", "Harold", "Nkemelu", "h.nkemelu@eagleexcavation.com", "202-555-0305", "Operations Manager"],
  ["Nationwide Concrete Inc", "Tonya", "Bassett", "t.bassett@nationwideconcrete.com", "202-555-0306", "Regional Manager"],
  ["Federal Steel Erectors", "Jerome", "Kessler", "j.kessler@federalsteel.com", "202-555-0303", "Estimator"],
  ["Patriot Electrical Contractors", "Sylvia", "Drummond", "s.drummond@patriotelectric.com", "202-555-0304", "President"],
  ["Capital MEP Group", "Constance", "Merritt", "c.merritt@capitalmep.com", "202-555-0302", "Project Manager"],
  ["Monument Masonry Corp", "Denise", "Altman", "d.altman@monumentmasonry.com", "202-555-0310", "VP Estimating"],
  ["Capitol Roofing Systems", "Lisa", "Vandenberg", "l.vandenberg@capitolroofing.com", "202-555-0308", "Project Manager"],
  ["Union Drywall & Framing", "Victor", "Asamoah", "v.asamoah@uniondrywall.com", "202-555-0307", "Estimator"],
  ["SafeGuard Security Integration", "Phillip", "Monroe", "p.monroe@safeguardsec.com", "202-555-0311", "Federal Projects Director"],
  ["Apex Fire Protection LLC", "George", "Flanagan", "g.flanagan@apexfire.com", "202-555-0309", "Project Manager"],
  ["Potomac Elevator Co", "Martin", "Cruz", "m.cruz@potomacelevator.com", "202-555-0316", "Project Manager"],
  ["Huang Structural Engineering", "Walter", "Huang", "w.huang@huangstructural.com", "202-555-0301", "Principal Engineer"],
  ["Davis-Bacon Compliance Consulting", "Angela", "Reeves", "a.reeves@dbcomplianceco.com", "202-555-0312", "Lead Auditor"],
  ["National Testing Laboratory", "Heather", "Brooks", "h.brooks@nationaltestlab.com", "202-555-0314", "Lab Director"],
  ["DC Building Materials Supply", "Curtis", "Park", "c.park@dcbuildsupply.com", "202-555-0313", "Account Manager"],
  ["Acme Temporary Fencing & Site Services", "Barry", "Croft", "b.croft@acmesite.com", "202-555-0315", "Regional Manager"],
  ["Thornton Hartman Architects", "Richard", "Thornton", "r.thornton@thorntonarch.com", "202-555-0206", "Principal Architect"],
];

// ============================================================================
// Sheet 6: Equipment (8 rows) — ALL purchase_cost = 0
// ============================================================================
const equipment = [
  ["CAT 336 Next Gen Excavator", "excavator", "Caterpillar", "336 GC", "CAT336GC-44102", "in_use", 0, 225, "2021-03-10", "2025-12-18", "2026-03-18"],
  ["Manitowoc 3900W Tower Crane", "crane", "Manitowoc", "3900W", "MAN3900W-88301", "in_use", 0, 450, "2019-09-15", "2026-01-04", "2027-01-04"],
  ["CAT D6 XE Dozer", "other", "Caterpillar", "D6 XE", "CATD6XE-22948", "available", 0, 195, "2020-11-20", "2025-10-15", "2026-04-15"],
  ["Mack Granite Dump Truck 1", "truck", "Mack", "Granite 64FR", "MACK64FR-55001", "in_use", 0, 95, "2022-01-08", "2025-12-10", "2026-12-10"],
  ["Mack Granite Dump Truck 2", "truck", "Mack", "Granite 64FR", "MACK64FR-55002", "in_use", 0, 95, "2022-01-08", "2025-12-10", "2026-12-10"],
  ["JLG 600S Boom Lift", "other", "JLG", "600S", "JLG600S-11422", "in_use", 0, 85, "2021-07-14", "2025-11-30", "2026-11-30"],
  ["Multiquip Generator 400kW", "other", "Multiquip", "DCA400SSK", "MQ400SSK-66180", "in_use", 0, 65, "2020-05-22", "2025-09-15", "2026-03-15"],
  ["Putzmeister 58Z Concrete Pump", "other", "Putzmeister", "58Z Meter", "PUT58Z-33901", "in_use", 0, 280, "2022-06-30", "2026-01-07", "2026-04-07"],
];

// ============================================================================
// Sheet 7: Phases (9 rows)
// ============================================================================
const phases = [
  ["Preconstruction & Permitting", "#6b7280", "2024-01-01", "2024-01-31", PROJECT_NAME],
  ["Site Preparation & Mobilization", "#92400e", "2024-02-01", "2024-03-31", PROJECT_NAME],
  ["Earthwork & Underground Utilities", "#b45309", "2024-03-01", "2024-09-30", PROJECT_NAME],
  ["Foundation & Substructure", "#d97706", "2024-06-01", "2024-12-31", PROJECT_NAME],
  ["Structural Concrete & Steel", "#ca8a04", "2024-10-01", "2025-09-30", PROJECT_NAME],
  ["Enclosure & Facade", "#65a30d", "2025-04-01", "2026-03-31", PROJECT_NAME],
  ["MEP Rough-In", "#16a34a", "2024-08-01", "2026-05-31", PROJECT_NAME],
  ["Interior Finishes", "#0d9488", "2025-10-01", "2026-08-31", PROJECT_NAME],
  ["Commissioning & Closeout", "#0284c7", "2026-06-01", "2026-09-30", PROJECT_NAME],
];

// ============================================================================
// Sheet 8: Tasks (48 rows)
// ============================================================================
const tasks = [
  // Preconstruction & Permitting (all complete)
  ["Building permit application and review", "Preconstruction & Permitting", "critical", "2024-01-01", "2024-01-15", 100, "false", "true", PROJECT_NAME, "completed"],
  ["Demolition permit and abatement survey", "Preconstruction & Permitting", "high", "2024-01-05", "2024-01-20", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Environmental impact assessment - NEPA", "Preconstruction & Permitting", "high", "2024-01-01", "2024-01-25", 100, "false", "false", PROJECT_NAME, "completed"],
  ["GSA pre-construction kickoff meeting", "Preconstruction & Permitting", "critical", "2024-01-15", "2024-01-15", 100, "true", "true", PROJECT_NAME, "completed"],
  ["Notice to proceed issued", "Preconstruction & Permitting", "critical", "2024-01-31", "2024-01-31", 100, "true", "true", PROJECT_NAME, "completed"],
  // Site Preparation & Mobilization (all complete)
  ["Construction fencing and site security", "Site Preparation & Mobilization", "high", "2024-02-01", "2024-02-07", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Field office trailers and temp utilities", "Site Preparation & Mobilization", "high", "2024-02-05", "2024-02-14", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Utility locates and protection", "Site Preparation & Mobilization", "high", "2024-02-07", "2024-02-21", 100, "false", "true", PROJECT_NAME, "completed"],
  ["Existing structure demolition", "Site Preparation & Mobilization", "critical", "2024-02-15", "2024-03-15", 100, "false", "true", PROJECT_NAME, "completed"],
  ["Tree removal and site clearing", "Site Preparation & Mobilization", "medium", "2024-02-15", "2024-02-28", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Mobilization complete milestone", "Site Preparation & Mobilization", "critical", "2024-03-31", "2024-03-31", 100, "true", "true", PROJECT_NAME, "completed"],
  // Earthwork & Underground Utilities (all complete)
  ["Mass excavation to subgrade", "Earthwork & Underground Utilities", "critical", "2024-03-01", "2024-05-15", 100, "false", "true", PROJECT_NAME, "completed"],
  ["Rock excavation and dewatering", "Earthwork & Underground Utilities", "high", "2024-03-15", "2024-06-30", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Storm drainage installation", "Earthwork & Underground Utilities", "high", "2024-05-01", "2024-07-31", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Sanitary sewer and water main", "Earthwork & Underground Utilities", "high", "2024-05-15", "2024-08-15", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Electrical ductbank installation", "Earthwork & Underground Utilities", "high", "2024-06-01", "2024-09-15", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Foundation preparation complete", "Earthwork & Underground Utilities", "critical", "2024-09-30", "2024-09-30", 100, "true", "true", PROJECT_NAME, "completed"],
  // Foundation & Substructure (all complete)
  ["Drilled caissons 48in and 60in dia", "Foundation & Substructure", "critical", "2024-06-01", "2024-08-31", 100, "false", "true", PROJECT_NAME, "completed"],
  ["Pile caps and grade beams", "Foundation & Substructure", "critical", "2024-07-15", "2024-10-15", 100, "false", "true", PROJECT_NAME, "completed"],
  ["Foundation walls and waterproofing", "Foundation & Substructure", "high", "2024-08-15", "2024-11-15", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Slab on grade Level B1 parking", "Foundation & Substructure", "high", "2024-09-01", "2024-11-30", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Elevator pit and sump construction", "Foundation & Substructure", "medium", "2024-10-01", "2024-12-15", 100, "false", "false", PROJECT_NAME, "completed"],
  ["Foundation acceptance milestone", "Foundation & Substructure", "critical", "2024-12-31", "2024-12-31", 100, "true", "true", PROJECT_NAME, "completed"],
  // Structural Concrete & Steel (in progress)
  ["Structural concrete Levels 1 through 6", "Structural Concrete & Steel", "critical", "2024-10-01", "2025-04-30", 100, "false", "true", PROJECT_NAME, "completed"],
  ["Structural concrete Levels 7 through 12", "Structural Concrete & Steel", "critical", "2025-02-01", "2025-09-30", 65, "false", "true", PROJECT_NAME, "in_progress"],
  ["Structural steel erection", "Structural Concrete & Steel", "critical", "2024-12-01", "2025-08-31", 80, "false", "true", PROJECT_NAME, "in_progress"],
  ["Metal deck and shear studs", "Structural Concrete & Steel", "high", "2025-01-15", "2025-09-15", 60, "false", "false", PROJECT_NAME, "in_progress"],
  ["Topping out ceremony milestone", "Structural Concrete & Steel", "high", "2025-09-30", "2025-09-30", 0, "true", "true", PROJECT_NAME, "not_started"],
  // Enclosure & Facade (in progress)
  ["Curtain wall system Levels 1 through 6", "Enclosure & Facade", "critical", "2025-04-01", "2025-12-31", 70, "false", "true", PROJECT_NAME, "in_progress"],
  ["Curtain wall system Levels 7 through 12", "Enclosure & Facade", "critical", "2025-08-01", "2026-03-31", 25, "false", "true", PROJECT_NAME, "in_progress"],
  ["Exterior masonry veneer", "Enclosure & Facade", "high", "2025-06-01", "2026-01-31", 55, "false", "false", PROJECT_NAME, "in_progress"],
  ["Roofing and waterproofing", "Enclosure & Facade", "high", "2025-10-01", "2026-02-28", 40, "false", "false", PROJECT_NAME, "in_progress"],
  ["Building enclosure weather-tight", "Enclosure & Facade", "critical", "2026-03-31", "2026-03-31", 0, "true", "true", PROJECT_NAME, "not_started"],
  // MEP Rough-In (in progress)
  ["Electrical rough-in Levels 1 through 6", "MEP Rough-In", "critical", "2025-02-01", "2025-10-31", 60, "false", "true", PROJECT_NAME, "in_progress"],
  ["Plumbing rough-in", "MEP Rough-In", "high", "2025-03-01", "2025-12-31", 45, "false", "false", PROJECT_NAME, "in_progress"],
  ["HVAC ductwork and equipment", "MEP Rough-In", "critical", "2025-04-01", "2026-02-28", 40, "false", "true", PROJECT_NAME, "in_progress"],
  ["Fire protection sprinkler rough-in", "MEP Rough-In", "high", "2025-06-01", "2026-03-31", 30, "false", "false", PROJECT_NAME, "in_progress"],
  ["Elevator installation", "MEP Rough-In", "high", "2025-08-01", "2026-05-31", 15, "false", "false", PROJECT_NAME, "in_progress"],
  ["Security system conduit and backbone", "MEP Rough-In", "high", "2025-10-01", "2026-04-30", 10, "false", "false", PROJECT_NAME, "in_progress"],
  // Interior Finishes (early stage)
  ["Drywall framing and hanging Levels 1-3", "Interior Finishes", "high", "2025-10-01", "2026-03-31", 25, "false", "false", PROJECT_NAME, "in_progress"],
  ["Courtroom millwork and paneling", "Interior Finishes", "high", "2026-01-01", "2026-06-30", 5, "false", "false", PROJECT_NAME, "in_progress"],
  ["Lobby stone and tile finishes", "Interior Finishes", "medium", "2026-02-01", "2026-07-31", 0, "false", "false", PROJECT_NAME, "not_started"],
  ["Paint and wall coverings", "Interior Finishes", "medium", "2026-03-01", "2026-08-15", 0, "false", "false", PROJECT_NAME, "not_started"],
  ["Flooring carpet tile and terrazzo", "Interior Finishes", "medium", "2026-04-01", "2026-08-31", 0, "false", "false", PROJECT_NAME, "not_started"],
  // Commissioning & Closeout
  ["Commissioning plan and TAB", "Commissioning & Closeout", "critical", "2026-06-01", "2026-08-31", 0, "false", "true", PROJECT_NAME, "not_started"],
  ["Final inspections and punch list", "Commissioning & Closeout", "critical", "2026-07-01", "2026-09-15", 0, "false", "true", PROJECT_NAME, "not_started"],
  ["Security system commissioning and testing", "Commissioning & Closeout", "high", "2026-07-15", "2026-09-15", 0, "false", "false", PROJECT_NAME, "not_started"],
  ["Certificate of occupancy milestone", "Commissioning & Closeout", "critical", "2026-09-30", "2026-09-30", 0, "true", "true", PROJECT_NAME, "not_started"],
];

// ============================================================================
// Sheet 9: Project Budget Lines (22 rows)
// ============================================================================
const budgetLines = [
  ["01 00 00", "General Requirements & Project Management", 4800000, 4500000, 2600000, PROJECT_NAME],
  ["02 00 00", "Existing Conditions & Demolition", 850000, 820000, 820000, PROJECT_NAME],
  ["03 00 00", "Concrete", 7200000, 7200000, 5200000, PROJECT_NAME],
  ["04 00 00", "Masonry", 2900000, 2900000, 1566000, PROJECT_NAME],
  ["05 00 00", "Metals - Structural Steel", 8500000, 8500000, 7650000, PROJECT_NAME],
  ["06 00 00", "Wood Plastics & Composites", 1200000, 1100000, 400000, PROJECT_NAME],
  ["07 00 00", "Thermal & Moisture Protection", 2650000, 2450000, 1200000, PROJECT_NAME],
  ["08 00 00", "Openings - Doors Windows Curtain Wall", 4200000, 3800000, 2100000, PROJECT_NAME],
  ["09 00 00", "Finishes", 3600000, 3200000, 864000, PROJECT_NAME],
  ["10 00 00", "Specialties", 800000, 700000, 0, PROJECT_NAME],
  ["11 00 00", "Equipment - Courtroom Systems", 2400000, 2100000, 0, PROJECT_NAME],
  ["12 00 00", "Furnishings", 1800000, 1600000, 0, PROJECT_NAME],
  ["14 00 00", "Conveying Equipment - Elevators", 2200000, 2000000, 600000, PROJECT_NAME],
  ["21 00 00", "Fire Suppression", 1600000, 1600000, 288000, PROJECT_NAME],
  ["22 00 00", "Plumbing", 3200000, 3000000, 1400000, PROJECT_NAME],
  ["23 00 00", "HVAC", 4200000, 4000000, 1850000, PROJECT_NAME],
  ["26 00 00", "Electrical", 6800000, 6800000, 3400000, PROJECT_NAME],
  ["28 00 00", "Electronic Safety & Security", 2400000, 2400000, 432000, PROJECT_NAME],
  ["31 00 00", "Earthwork", 3800000, 3800000, 3800000, PROJECT_NAME],
  ["32 00 00", "Exterior Improvements", 1500000, 1200000, 0, PROJECT_NAME],
  ["33 00 00", "Utilities", 1600000, 1500000, 1200000, PROJECT_NAME],
  ["01 40 00", "Davis-Bacon & Section 3 Compliance", 500000, 350000, 231000, PROJECT_NAME],
];

// ============================================================================
// Sheet 10: Certifications (18 rows)
// ============================================================================
const certifications = [
  ["OSHA 30-Hour Construction Safety", "certification", "OSHA", "OSHA30-2024-FCD-001", "2023-06-15", "2028-06-15", "James Whitfield"],
  ["OSHA 30-Hour Construction Safety", "certification", "OSHA", "OSHA30-2024-FCD-002", "2023-08-10", "2028-08-10", "Marcus Delaney"],
  ["OSHA 30-Hour Construction Safety", "certification", "OSHA", "OSHA30-2024-FCD-003", "2023-07-20", "2028-07-20", "Daniel Hargrove"],
  ["OSHA 30-Hour Construction Safety", "certification", "OSHA", "OSHA30-2024-FCD-004", "2023-09-01", "2028-09-01", "Kevin Osei"],
  ["OSHA 30-Hour Construction Safety", "certification", "OSHA", "OSHA30-2024-FCD-005", "2024-01-15", "2029-01-15", "Raymond Torres"],
  ["EM-385-1-1 USACE Safety", "certification", "US Army Corps of Engineers", "EM385-FCD-001", "2023-04-20", "2026-04-20", "Raymond Torres"],
  ["GSA Federal Construction Safety", "certification", "General Services Administration", "GSA-SAFE-44210", "2023-04-15", "2026-04-15", "Raymond Torres"],
  ["Davis-Bacon Compliance Specialist", "certification", "Dept of Labor", "DBA-SPEC-2024-107", "2024-02-01", "2027-02-01", "Brenda Walsh"],
  ["Section 3 Compliance Officer", "certification", "HUD", "SEC3-OFF-2024-042", "2024-03-10", "2027-03-10", "Brenda Walsh"],
  ["LEED AP BD+C", "certification", "USGBC", "LEED-AP-10295847", "2022-05-15", "2026-05-15", "Patricia Nguyen"],
  ["PMP - Project Management Professional", "certification", "PMI", "PMI-PMP-3347891", "2021-07-01", "2027-07-01", "Daniel Hargrove"],
  ["PMP - Project Management Professional", "certification", "PMI", "PMI-PMP-4421567", "2022-09-01", "2028-09-01", "Linda Castillo"],
  ["Tower Crane Operator NCCCO", "certification", "NCCCO", "NCCCO-TC-88401", "2023-03-20", "2028-03-20", "Kevin Osei"],
  ["FAR/DFARS Compliance", "certification", "DAU", "FAR-DFAR-2024-210", "2024-01-01", "2027-01-01", "Angela Petrov"],
  ["SECRET Security Clearance", "license", "US Dept of Defense", "SCL-DOD-FCD-001", "2023-01-15", "2033-01-15", "James Whitfield"],
  ["SECRET Security Clearance", "license", "US Dept of Defense", "SCL-DOD-FCD-002", "2023-06-01", "2033-06-01", "Marcus Delaney"],
  ["AWS CWI - Certified Welding Inspector", "certification", "American Welding Society", "AWS-CWI-78902", "2024-06-01", "2027-06-01", "Russell Yamamoto"],
  ["ACI Concrete Field Testing Technician", "certification", "American Concrete Institute", "ACI-CFT-44210", "2024-03-15", "2027-03-15", "Michael Brennan"],
];

// ============================================================================
// Sheet 11: Opportunities (5 rows)
// ============================================================================
const opportunities = [
  ["VA Medical Center Expansion - Richmond", "Dept of Veterans Affairs", "proposal", 95000000, 70, "2026-05-15", "direct", "New inpatient tower and ambulatory care expansion at Richmond VAMC. Phased construction maintaining full hospital operations. Design-build delivery. Section 3 and Service-Disabled Veteran-Owned SB subcontracting plan required."],
  ["FEMA Regional Operations Center", "Federal Emergency Management Agency", "negotiation", 42000000, 88, "2026-03-01", "direct", "Category 5 hurricane-hardened emergency operations facility in Atlanta GA. Redundant power water and communications. 72-hour self-sustaining capability. GSA lease-construct. LEED Silver minimum."],
  ["Dept of Labor HQ Renovation - Phase 2", "U.S. Dept of Labor", "qualified", 28500000, 55, "2026-08-01", "referral", "Floors 8-14 modernization of Frances Perkins Building. Occupied renovation phasing. Asbestos abatement. Historic preservation requirements under Section 106. Davis-Bacon prevailing wage applies."],
  ["State Police Regional Headquarters", "State Dept of Public Safety", "proposal", 34000000, 65, "2026-06-01", "direct", "New 85000 SF regional headquarters with secure vehicle storage forensic lab and regional dispatch center. SCIF requirements for intelligence section. Blast-resistant design per ISC."],
  ["HUD CDBG Civic Center & Library", "U.S. Dept of Housing & Urban Development", "won", 18500000, 95, "2026-04-01", "partner", "Community civic center with branch library and job training center. 100% CDBG-funded. Section 3 hiring plan critical. Must demonstrate 25% low-income workforce participation. LEED Gold target."],
];

// ============================================================================
// Sheet 12: Bids (3 rows)
// ============================================================================
const bids = [
  ["VA Medical Center Expansion - Richmond", "Dept of Veterans Affairs", 97000000, "2026-03-15", "hard_bid", "New 6-story inpatient tower with 120 beds 42 operating suites and ambulatory care pavilion. Includes central utility plant upgrade. 36-month construction duration. Full infection control risk assessment required. TAA-compliant materials. All-domestic steel per Buy America Act."],
  ["FEMA Regional Operations Center", "Federal Emergency Management Agency", 43500000, "2026-02-28", "negotiated", "72000 SF emergency operations center with 400kW backup generator farm 30000-gallon fuel storage and communications bunker. Category 5 wind resistant envelope. 24-month construction. SBA subcontracting plan 23% SDB goal."],
  ["State Police Regional Headquarters", "State Dept of Public Safety", 35200000, "2026-05-01", "hard_bid", "85000 SF facility with SCIF vehicle maintenance bay forensic evidence processing lab and EOC. Ballistic glazing level 4 at all ground floor. Anti-ram barriers at perimeter. 28-month construction. MBE/WBE 15% goal."],
];

// ============================================================================
// Sheet 13: Contracts (16 rows)
// ============================================================================
const contracts = [
  // Owner prime contract
  ["GSA Prime Contract - Federal District Courthouse", "owner", "U.S. General Services Administration", "t.jefferson@gsa.gov", 68500000, "2024-02-01", "2026-09-30", "net_30", "Design-bid-build prime contract for new 12-story federal courthouse. Includes all site work structure enclosure MEP finishes and commissioning. Davis-Bacon and Section 3 apply. Miller Act performance and payment bonds required. 10% retainage until substantial completion.", PROJECT_NAME, "active"],
  // Subcontracts (11)
  ["Earthwork & Site Preparation", "subcontractor", "Eagle Excavation LLC", "h.nkemelu@eagleexcavation.com", 3800000, "2024-02-01", "2024-09-30", "net_30", "Mass excavation rock removal dewatering underground utilities storm drainage and backfill.", PROJECT_NAME, "active"],
  ["Cast-in-Place Concrete", "subcontractor", "Nationwide Concrete Inc", "t.bassett@nationwideconcrete.com", 7200000, "2024-06-01", "2025-12-31", "net_30", "All structural concrete including foundations caissons pile caps elevated slabs columns and shear walls. Formwork rebar and placement.", PROJECT_NAME, "active"],
  ["Structural Steel Erection", "subcontractor", "Federal Steel Erectors", "j.kessler@federalsteel.com", 8500000, "2024-12-01", "2025-09-30", "net_30", "Fabrication delivery and erection of structural steel including columns beams bracing metal deck and shear studs.", PROJECT_NAME, "active"],
  ["Electrical Systems", "subcontractor", "Patriot Electrical Contractors", "s.drummond@patriotelectric.com", 6800000, "2025-02-01", "2026-08-31", "net_30", "Complete electrical power distribution emergency generators switchgear MCC panels branch wiring lighting and fire alarm.", PROJECT_NAME, "active"],
  ["Mechanical & Plumbing", "subcontractor", "Capital MEP Group", "c.merritt@capitalmep.com", 7400000, "2025-03-01", "2026-08-31", "net_30", "Complete HVAC systems including chillers boilers AHUs ductwork controls and plumbing including domestic water sanitary waste medical gas and natural gas.", PROJECT_NAME, "active"],
  ["Masonry", "subcontractor", "Monument Masonry Corp", "d.altman@monumentmasonry.com", 2900000, "2025-06-01", "2026-01-31", "net_30", "Exterior brick and limestone veneer CMU backup walls interior CMU partitions and stone site walls.", PROJECT_NAME, "active"],
  ["Roofing & Waterproofing", "subcontractor", "Capitol Roofing Systems", "l.vandenberg@capitolroofing.com", 1850000, "2025-10-01", "2026-02-28", "net_30", "TPO membrane roofing system metal edge copings green roof assemblies and below-grade waterproofing.", PROJECT_NAME, "active"],
  ["Drywall & Framing", "subcontractor", "Union Drywall & Framing", "v.asamoah@uniondrywall.com", 3200000, "2025-10-01", "2026-07-31", "net_30", "Metal stud framing drywall hanging taping acoustical ceilings and soffits.", PROJECT_NAME, "active"],
  ["Security Systems Integration", "subcontractor", "SafeGuard Security Integration", "p.monroe@safeguardsec.com", 2400000, "2025-08-01", "2026-08-31", "net_30", "Access control CCTV intrusion detection x-ray screening magnetometers sally ports and courtroom duress systems.", PROJECT_NAME, "active"],
  ["Fire Protection", "subcontractor", "Apex Fire Protection LLC", "g.flanagan@apexfire.com", 1600000, "2025-06-01", "2026-06-30", "net_30", "Wet and dry sprinkler systems pre-action systems for IT and records fire pump and standpipe.", PROJECT_NAME, "active"],
  ["Elevators", "subcontractor", "Potomac Elevator Co", "m.cruz@potomacelevator.com", 2200000, "2025-08-01", "2026-08-31", "net_30", "6 passenger elevators 2 freight elevators and 1 secure prisoner transport elevator. All traction type.", PROJECT_NAME, "active"],
  // Professional services (4)
  ["Structural Engineering Services", "consultant", "Huang Structural Engineering", "w.huang@huangstructural.com", 485000, "2024-02-01", "2026-09-30", "net_30", "Structural engineering support during construction including shop drawing review RFI responses field inspections and special inspections.", PROJECT_NAME, "active"],
  ["Davis-Bacon Compliance Auditing", "consultant", "Davis-Bacon Compliance Consulting", "a.reeves@dbcomplianceco.com", 185000, "2024-02-01", "2026-09-30", "net_30", "Weekly certified payroll review Davis-Bacon wage interviews labor classification audits and DOL reporting.", PROJECT_NAME, "active"],
  ["Testing & Inspection Services", "consultant", "National Testing Laboratory", "h.brooks@nationaltestlab.com", 320000, "2024-02-01", "2026-09-30", "net_30", "Concrete testing steel inspection soils testing fireproofing inspection and special inspections.", PROJECT_NAME, "active"],
  ["Architectural Services During Construction", "consultant", "Thornton Hartman Architects", "r.thornton@thorntonarch.com", 750000, "2024-02-01", "2026-09-30", "net_30", "Architect of record construction administration including submittal review RFI responses site observations and punch list.", PROJECT_NAME, "active"],
];

// ============================================================================
// Sheet 14: Daily Logs (10 rows)
// ============================================================================
const dailyLogs = [
  ["2026-01-06", "clear", 34, "Steel erection Levels 10-11 continued with 6 columns and 12 beams set. Concrete pour Level 8 east wing 380 CY pumped. Curtain wall installation Levels 4-5 south facade 8 panels set. MEP rough-in Level 3 electrical conduit 75% complete. 218 workers on site.", "None", "None", PROJECT_NAME, "submitted"],
  ["2026-01-07", "cloudy", 38, "Concrete finishing Level 8 east wing. Steel bolting Level 10 connections torqued. Masonry veneer Level 3 north facade 1200 SF installed. Curtain wall Level 5 continued 6 panels. Fire sprinkler rough-in Level 2 80% complete. 224 workers on site.", "None", "None", PROJECT_NAME, "submitted"],
  ["2026-01-08", "clear", 31, "Metal deck placement Level 11 started. Concrete Level 7 west wing forming. Curtain wall glazing Level 3 complete. Electrical switchgear Level B1 energized and tested. Plumbing riser Level 4-6 copper brazing. 230 workers on site.", "None", "None", PROJECT_NAME, "submitted"],
  ["2026-01-09", "rainy", 36, "Rain delay first 2 hours - crane operations suspended. Steel erection resumed at 1000. Concrete forming Level 7 continued under tarps. Interior drywall framing Level 1 courtrooms started. Davis-Bacon wage interviews conducted by compliance team - 12 workers interviewed. 198 workers on site.", "None", "Rain delay 2 hours morning - crane standby", PROJECT_NAME, "submitted"],
  ["2026-01-10", "clear", 29, "Structural concrete pour Level 7 west wing 420 CY. 4 concrete test cylinders taken. Steel erection Level 11 north bay 8 columns set. Elevator shaft construction Level 5-6. Roofing membrane prep Level 12 mechanical penthouse area. Section 3 compliance report submitted to HUD. 215 workers on site.", "None", "None", PROJECT_NAME, "submitted"],
  ["2026-01-13", "cloudy", 33, "Steel topping out ceremony preparation - Level 12 final columns scheduled this week. Metal deck Level 11 50% complete. Curtain wall Level 6 south facade started. HVAC ductwork Level 2 main trunk lines 60% installed. Masonry veneer Level 4 east facade 800 SF. GSA COR site observation visit. 222 workers on site.", "None", "None", PROJECT_NAME, "submitted"],
  ["2026-01-14", "clear", 28, "Level 12 final structural steel column set - topping out achieved. Ironworkers celebration. Concrete Level 9 east wing rebar placement. Curtain wall Level 6 continued 10 panels. Electrical rough-in Level 3 branch circuits. Security conduit backbone Level B1 started. 226 workers on site.", "Near miss - dropped bolt from Level 11. Area cleared. Safety stand-down conducted.", "None", PROJECT_NAME, "submitted"],
  ["2026-01-15", "clear", 30, "Post-topping steel connections Level 12. Concrete forming Level 9 west wing. Curtain wall sealant Level 3-4 all joints. Plumbing rough-in Level 4 restroom groups. Fire sprinkler Level 3 100% hung. Drywall Level 1 courtroom A framing 40% complete. 220 workers on site.", "None", "None", PROJECT_NAME, "submitted"],
  ["2026-01-16", "snow", 25, "Snow event - reduced operations. Crane operations suspended until afternoon. Ground crews performed snow removal and salting. Interior work continued at full pace - drywall MEP electrical. Steel connections Level 12 continued. Davis-Bacon certified payroll #48 submitted. 185 workers on site.", "None", "Snow delay - crane suspended AM shift", PROJECT_NAME, "submitted"],
  ["2026-01-17", "clear", 27, "Full operations resumed. Concrete pour Level 9 east wing 390 CY. Metal deck Level 12 started 20% first day. Curtain wall Level 7 north facade 4 panels. HVAC Level 3 branch ductwork. Electrical panel boards Level 2 mounted. Elevator guide rails Level 3-4 installed. 228 workers on site.", "None", "None", PROJECT_NAME, "submitted"],
];

// ============================================================================
// Sheet 15: RFIs (6 rows)
// ============================================================================
const rfis = [
  ["Secure Holding Door Hardware Specification Conflict", "Drawing A-401 specifies Grade 1 mortise lock set rated to 600 lb while the security narrative requires 1000 lb minimum for all holding area doors. Which specification governs?", "high", "submitted", "2026-02-01", 12000, 3, PROJECT_NAME, "", ""],
  ["Courtroom Acoustic Panel Substrate Mismatch", "Specification 09 84 00 calls for 1 inch acoustic panels on 5/8 inch gypsum board but structural drawings show 6 inch CMU at courtroom walls. Furring strips not detailed. Clarify attachment method and confirm acoustic performance.", "high", "submitted", "2026-02-10", 8500, 2, PROJECT_NAME, "", ""],
  ["Emergency Generator Fuel Storage NFPA 30 Setback", "Generator fuel day tank 500 gallon diesel located 12 feet from building per site plan. NFPA 30 requires 25 foot minimum setback for above-ground storage adjacent to buildings. Confirm relocation or request variance from AHJ.", "critical", "submitted", "2026-01-28", 385000, 12, PROJECT_NAME, "", ""],
  ["LEED Credit Documentation Version Conflict", "Specification references LEED v3 2009 thresholds but GSA Facilities Standards require LEED v4. Recycled content credit thresholds differ. Which version controls for credit achievement calculations?", "medium", "submitted", "2026-02-20", 0, 0, PROJECT_NAME, "", ""],
  ["Section 3 Workforce Tracking Integration", "How should Section 3 workforce hours be tracked alongside Davis-Bacon certified payroll? Current system tracks separately but HUD requires integrated reporting for CDBG-funded portions. Clarify acceptable reporting format.", "medium", "answered", "2026-02-15", 0, 0, PROJECT_NAME, "", "Coordinate with Brenda Walsh to use integrated WH-347 form supplemented with Section 3 certification data. Monthly report to HUD per CDBG grant agreement Section 8."],
  ["Elevator Cab Interior Finish Discrepancy", "Architectural drawings show stainless steel elevator cab interiors but specification 14 20 00 calls for laminate panels. Secure prisoner transport elevator requires anti-ligature design not addressed in either document. Clarify all three cab types.", "high", "submitted", "2026-02-05", 45000, 5, PROJECT_NAME, "", ""],
];

// ============================================================================
// Sheet 16: Change Orders (7 rows) — ALL status = "draft"
// ============================================================================
const changeOrders = [
  ["CO-001 Secure Holding Expansion 48 to 72 Capacity", "GSA directed expansion of secure holding facility from 48 to 72 person capacity per updated federal marshals operational requirements. Additional 3200 SF of hardened construction with blast-resistant partitions sally port expansion and enhanced CCTV coverage.", "owner_request", 1850000, 21, PROJECT_NAME, "draft", "CO-001"],
  ["CO-002 Blast-Resistant Glazing Upgrade", "Upgrade all ground floor and Level 2 glazing from standard insulated glass to blast-resistant laminated glass per updated ISC security criteria. Includes reinforced curtain wall anchors and blast-rated mullion profiles.", "owner_request", 2400000, 15, PROJECT_NAME, "draft", "CO-002"],
  ["CO-003 Emergency Generator Relocation", "Relocate emergency generator farm from east side to north side of building to comply with NFPA 30 setback requirements identified during RFI-003 review. Includes new concrete pad fuel piping and electrical feeder relocation.", "error_omission", 385000, 12, PROJECT_NAME, "draft", "CO-003"],
  ["CO-004 HVAC Filtration Upgrade MERV-13 to MERV-16", "Upgrade all AHU filtration from MERV-13 to MERV-16 per updated GSA Indoor Air Quality standards. Includes fan motor upgrades to handle increased static pressure and modified ductwork transitions.", "owner_request", 620000, 8, PROJECT_NAME, "draft", "CO-004"],
  ["CO-005 Fiber Optic Network Infrastructure", "Add dedicated fiber optic backbone network throughout building for federal agency connectivity. 144-strand single mode fiber risers to each floor with redundant pathways. Separate from base building data cabling.", "owner_request", 480000, 5, PROJECT_NAME, "draft", "CO-005"],
  ["CO-006 Granite Facade Upgrade from Limestone", "Upgrade exterior facade cladding from Indiana limestone to Barre Gray granite per Architect recommendation and GSA approval. Improved durability and lower lifecycle maintenance cost. Includes revised stone anchorage details.", "scope_change", 1100000, 10, PROJECT_NAME, "draft", "CO-006"],
  ["CO-007 Section 3 Training Laboratory", "Add 3200 SF workforce training laboratory on Level 1 per HUD CDBG grant requirements. Includes classroom space computer lab tool storage and instructor office. Supports Section 3 hiring goal achievement.", "owner_request", 750000, 7, PROJECT_NAME, "draft", "CO-007"],
];

// ============================================================================
// Sheet 17: Submittals (10 rows)
// ============================================================================
const submittals = [
  ["Concrete Mix Design - 6000 PSI Structural", "SUB-001", PROJECT_NAME, "03 30 00", "approved_as_submitted", "2024-05-15", "Mix design acceptable per ACI 318-19. Provide test data at 7 and 28 days."],
  ["Structural Steel Shop Drawings - Levels 1-6", "SUB-002", PROJECT_NAME, "05 12 00", "approved_as_noted", "2024-10-01", "Revise connection details at moment frames per RFI-001 response. Resubmit details 5A and 5B."],
  ["Curtain Wall System - Mock-Up Approval", "SUB-003", PROJECT_NAME, "08 44 00", "approved_as_submitted", "2025-02-15", "Mock-up panel passed water and air infiltration testing per ASTM E1105."],
  ["HVAC Equipment - Chillers and Boilers", "SUB-004", PROJECT_NAME, "23 60 00", "approved_as_noted", "2025-01-20", "Sound data requires additional vibration isolation at Level 12 mechanical room. Revise structural supports."],
  ["Elevator Equipment and Cab Finishes", "SUB-005", PROJECT_NAME, "14 20 00", "pending", "2026-02-01", ""],
  ["Fire Sprinkler Shop Drawings - Levels 1-4", "SUB-006", PROJECT_NAME, "21 13 00", "approved_as_submitted", "2025-05-01", "Hydraulic calculations acceptable. Proceed with fabrication."],
  ["Security System - Access Control Hardware", "SUB-007", PROJECT_NAME, "28 10 00", "pending", "2026-02-15", ""],
  ["Blast-Resistant Glazing - Product Data", "SUB-008", PROJECT_NAME, "08 88 00", "approved_as_submitted", "2025-09-01", "Glazing meets GSA blast resistance criteria Level C per ISC."],
  ["Granite Facade Cladding - Samples and Shop Drawings", "SUB-009", PROJECT_NAME, "04 42 00", "approved_as_noted", "2025-11-15", "Color range acceptable. Provide anchoring detail revisions per structural engineer comments."],
  ["Courtroom Millwork - Shop Drawings", "SUB-010", PROJECT_NAME, "06 40 00", "pending", "2026-03-01", ""],
];

// ============================================================================
// Sheet 18: Safety Incidents (4 rows)
// ============================================================================
const safetyIncidents = [
  ["Near Miss - Dropped Bolt from Level 8", "Ironworker dropped 3/4 inch bolt from Level 8 during connection work. Bolt struck unoccupied scaffolding platform. Area below was properly barricaded per steel erection plan. No injury or property damage.", "near_miss", "minor", "2025-09-15", "Level 8 south elevation", "false", PROJECT_NAME, "resolved"],
  ["First Aid - Laceration from Sheet Metal Edge", "Drywall framer sustained 2-inch laceration on forearm from sharp metal stud edge. First aid administered on site. Worker returned to duty same day with butterfly bandage. Glove use reinforced in safety briefing.", "injury", "minor", "2025-11-22", "Level 2 courtroom wing", "true", PROJECT_NAME, "resolved"],
  ["Near Miss - Mortar Debris from Scaffold", "Small amount of mortar debris fell from masonry scaffold on Level 4 exterior. Debris landed in barricaded exclusion zone. No injuries. Scaffold toe boards inspected and found adequate. Additional netting installed as precaution.", "near_miss", "minor", "2025-12-08", "Level 4 north facade", "false", PROJECT_NAME, "resolved"],
  ["Near Miss - Dropped Bolt from Level 11", "During final steel connections at Level 11 a high-strength bolt was dropped. Area below was barricaded and occupied by no personnel. Safety stand-down conducted immediately for all ironwork crews. Tool tethering protocol reinforced.", "near_miss", "minor", "2026-01-14", "Level 11 north bay", "false", PROJECT_NAME, "resolved"],
];

// ============================================================================
// Sheet 19: Safety Inspections (4 rows)
// ============================================================================
const safetyInspections = [
  ["site_safety", "2026-01-06", 91, "General site safety inspection. PPE compliance 97%. Housekeeping good. Fall protection at Level 10 perimeter verified. One citation: missing fire extinguisher tag at Level 3 tool crib.", "Replace expired fire extinguisher tag. Verified next day.", "completed", PROJECT_NAME],
  ["equipment", "2026-01-08", 94, "Equipment inspection all tower crane excavator and aerial lifts. Annual certifications current. Daily inspection logs complete. Wire rope condition good. No deficiencies noted.", "None required. All equipment in compliance.", "completed", PROJECT_NAME],
  ["fall_protection", "2026-01-13", 88, "Federal compliance audit - Davis-Bacon prevailing wage interview results reviewed 12 of 12 workers in compliance. Section 3 workforce participation at 8.2% against 25% goal needs improvement. LEED tracking documentation current.", "Increase Section 3 outreach per CO-007 training lab initiative. Schedule additional HUD coordination meeting.", "completed", PROJECT_NAME],
  ["site_safety", "2025-10-22", 82, "Unannounced OSHA compliance inspection. Citation issued for inadequate guardrail at Level 7 floor opening subsequently corrected same day. Cable railing system replaced with standard 42-inch top rail mid rail and toe board assembly.", "Guardrail deficiency corrected within 2 hours. Photographic documentation provided to OSHA. No penalty assessed.", "completed", PROJECT_NAME],
];

// ============================================================================
// Sheet 20: Toolbox Talks (5 rows)
// ============================================================================
const toolboxTalks = [
  ["Fall Protection and Leading Edge Work", "Review of fall protection requirements for structural steel and concrete forming operations at height. Emphasis on 100% tie-off requirement personal fall arrest system inspection and rescue planning per OSHA 1926 Subpart M.", "fall_protection", "2026-01-06", 48, "Focused on ironworkers masonry and concrete crews working at Levels 8-12. Demonstrated proper harness inspection procedure.", PROJECT_NAME, "conducted"],
  ["Davis-Bacon Prevailing Wage Rights", "Worker rights under Davis-Bacon Act including prevailing wage rates fringe benefits overtime provisions and complaint procedures. Led by Davis-Bacon Compliance Consulting.", "hazard_communication", "2026-01-08", 85, "All trades required to attend quarterly. Compliance consultant Angela Reeves led session. Worker classification Q&A conducted.", PROJECT_NAME, "conducted"],
  ["Section 3 Employment and Training Overview", "Overview of HUD Section 3 requirements for CDBG-funded projects. Hiring preferences training opportunities and documentation requirements. HUD Program Manager Frank Sloane attended.", "hazard_communication", "2026-01-09", 62, "Introduced upcoming Section 3 Training Lab CO-007. Enrollment forms distributed for pre-apprenticeship program.", PROJECT_NAME, "conducted"],
  ["Electrical Safety and LOTO Procedures", "Lockout tagout procedures for energized electrical systems. Arc flash hazard awareness and PPE requirements per NFPA 70E. Specific focus on switchgear energization at Level B1.", "electrical", "2026-01-13", 32, "Electricians and MEP crews. Reviewed arc flash boundary distances and incident energy calculations for new switchgear.", PROJECT_NAME, "conducted"],
  ["Confined Space Entry - Elevator Shafts", "Confined space entry procedures for elevator shaft work including atmospheric monitoring entry permits rescue procedures and communication protocols. Per OSHA 1910.146 and 1926 Subpart AA.", "ppe", "2026-01-15", 28, "Elevator installation crew and safety personnel. Hands-on atmospheric monitor calibration demonstrated.", PROJECT_NAME, "conducted"],
];

// ============================================================================
// Sheet 21: Time Entries (20 rows)
// ============================================================================
const timeEntries = [
  ["2026-01-06", 10, 2, "Project management - steel erection coordination Levels 10-11 and concrete pour Level 8 oversight", "01400", PROJECT_NAME, "approved"],
  ["2026-01-06", 8, 0, "Quality control inspections - concrete cylinders Level 8 and weld inspections Level 10", "01450", PROJECT_NAME, "approved"],
  ["2026-01-06", 10, 2, "Superintendent field operations - 218 workers coordinated across all active areas", "01100", PROJECT_NAME, "approved"],
  ["2026-01-07", 10, 2, "PM coordination - curtain wall Level 5 masonry Level 3 fire sprinkler Level 2", "01400", PROJECT_NAME, "approved"],
  ["2026-01-07", 8, 0, "Safety inspections and PPE compliance monitoring - all active floors", "01500", PROJECT_NAME, "approved"],
  ["2026-01-08", 10, 2, "Superintendent field ops - switchgear energization Level B1 and metal deck Level 11", "01100", PROJECT_NAME, "approved"],
  ["2026-01-08", 8, 0, "BIM coordination - clash detection review MEP vs structure Levels 4-6", "01310", PROJECT_NAME, "approved"],
  ["2026-01-09", 8, 0, "Davis-Bacon compliance - wage interviews 12 workers and certified payroll review", "01410", PROJECT_NAME, "approved"],
  ["2026-01-09", 6, 0, "Rain delay - crane operations suspended AM. Interior work coordination afternoon.", "01100", PROJECT_NAME, "approved"],
  ["2026-01-10", 10, 2, "PM - concrete pour Level 7 west wing 420 CY and steel erection Level 11", "01400", PROJECT_NAME, "approved"],
  ["2026-01-10", 8, 0, "Section 3 outreach - community hiring event planning and compliance report to HUD", "01410", PROJECT_NAME, "approved"],
  ["2026-01-13", 10, 2, "Superintendent - topping out prep and Level 12 final columns coordination", "01100", PROJECT_NAME, "approved"],
  ["2026-01-13", 8, 1, "Project engineer - structural steel inspection Level 12 and shop drawing review", "05100", PROJECT_NAME, "approved"],
  ["2026-01-14", 10, 2, "PM - topping out milestone and curtain wall Level 6 installation oversight", "01400", PROJECT_NAME, "approved"],
  ["2026-01-14", 8, 0, "Safety stand-down after near miss - dropped bolt Level 11. All crews briefed.", "01500", PROJECT_NAME, "approved"],
  ["2026-01-15", 10, 2, "Superintendent - concrete Level 9 forming and fire sprinkler Level 3 completion", "01100", PROJECT_NAME, "approved"],
  ["2026-01-15", 8, 0, "Document control - submittal log update and RFI tracking for CO-003 response", "01300", PROJECT_NAME, "approved"],
  ["2026-01-16", 6, 0, "Snow delay operations - reduced crew. Interior work coordination and safety walkthrough.", "01100", PROJECT_NAME, "approved"],
  ["2026-01-16", 8, 0, "Cost control - January progress billing preparation and change order pricing review", "01200", PROJECT_NAME, "approved"],
  ["2026-01-17", 10, 2, "PM - full operations resumed. Concrete Level 9 pour and metal deck Level 12", "01400", PROJECT_NAME, "approved"],
];

// ============================================================================
// Sheet 22: Equipment Assignments (8 rows)
// ============================================================================
const equipmentAssignments = [
  ["CAT 336 Next Gen Excavator", PROJECT_NAME, "2024-02-15", "", "Foundation and utility excavation. Relocated to interior demolition and loading.", "active"],
  ["Manitowoc 3900W Tower Crane", PROJECT_NAME, "2024-06-01", "", "Primary tower crane for structural steel and concrete placement all levels.", "active"],
  ["CAT D6 XE Dozer", PROJECT_NAME, "2024-02-15", "2024-10-30", "Site grading and earthwork. Demobilized after foundation backfill complete.", "returned"],
  ["Mack Granite Dump Truck 1", PROJECT_NAME, "2024-02-15", "", "Hauling excavation spoils and site logistics.", "active"],
  ["Mack Granite Dump Truck 2", PROJECT_NAME, "2024-02-15", "", "Material delivery and debris removal.", "active"],
  ["JLG 600S Boom Lift", PROJECT_NAME, "2024-10-01", "", "Facade work access and high-elevation inspections.", "active"],
  ["Multiquip Generator 400kW", PROJECT_NAME, "2024-02-15", "", "Temporary site power until permanent service.", "active"],
  ["Putzmeister 58Z Concrete Pump", PROJECT_NAME, "2024-06-01", "", "Concrete placement all elevated levels.", "active"],
];

// ============================================================================
// Sheet 23: Equipment Maintenance (6 rows)
// ============================================================================
const equipmentMaintenance = [
  ["Manitowoc 3900W Tower Crane", "Annual Load Test and Inspection", "preventive", "Annual OSHA and manufacturer required load test at 110% capacity. All wire ropes inspected and measured. Boom and jib pins checked. Electrical systems verified. Passed all tests.", "2026-01-04", 18500, "CraneTech Services", "CraneTech Inspection Services", "2027-01-04", "completed"],
  ["CAT 336 Next Gen Excavator", "1000-Hour Preventive Service", "preventive", "Engine oil and filters hydraulic filters air filter fuel filters coolant check undercarriage inspection track tension adjustment. All within spec.", "2025-12-18", 3800, "In-House Mechanic", "Caterpillar Dealer Service", "2026-03-18", "completed"],
  ["Putzmeister 58Z Concrete Pump", "Quarterly Line Clean and Inspection", "preventive", "Complete pipeline flush boom cylinder inspection hydraulic hose check hopper wear plate measurement. Replaced 2 boom section hoses.", "2026-01-07", 2200, "Putzmeister Field Tech", "Putzmeister America", "2026-04-07", "completed"],
  ["JLG 600S Boom Lift", "Annual ANSI A92 Inspection", "preventive", "Annual inspection per ANSI A92.5. Structural welds inspected. Hydraulic cylinders checked. Electrical system and emergency lowering tested. Platform guardrails and gates verified.", "2025-11-30", 1850, "JLG Certified Tech", "JLG Industries", "2026-11-30", "completed"],
  ["Mack Granite Dump Truck 1", "DOT Annual Inspection", "preventive", "Federal DOT annual inspection including brakes tires lights suspension and emissions. Passed with no deficiencies. New DOT sticker affixed.", "2025-12-10", 1200, "Fleet Maintenance Shop", "DC Fleet Services", "2026-12-10", "completed"],
  ["Multiquip Generator 400kW", "Semi-Annual Service", "preventive", "Oil change fuel filter replacement coolant check load bank test at 100% rated capacity for 4 hours. Transfer switch exercise. Battery load test.", "2025-09-15", 2400, "Power Systems Tech", "Mid-Atlantic Power Systems", "2026-03-15", "completed"],
];

// ============================================================================
// Sheet 24: Invoices (33 rows)
// ============================================================================
const invoices = [
  // 12 Receivable (GSA progress billings)
  // #1-10 paid, #11-12 pending
  ["receivable", "AIA-FDC-001", "2025-03-01", 2800000, 0, "2025-04-01", "Progress Payment 01 - Mobilization earthwork and site preparation", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 280000],
  ["receivable", "AIA-FDC-002", "2025-04-01", 2600000, 0, "2025-05-01", "Progress Payment 02 - Earthwork completion and underground utilities", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 260000],
  ["receivable", "AIA-FDC-003", "2025-05-01", 3100000, 0, "2025-06-01", "Progress Payment 03 - Foundation caissons pile caps and grade beams", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 310000],
  ["receivable", "AIA-FDC-004", "2025-06-01", 3400000, 0, "2025-07-01", "Progress Payment 04 - Level B1 slab on grade and foundation walls", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 340000],
  ["receivable", "AIA-FDC-005", "2025-07-01", 3200000, 0, "2025-08-01", "Progress Payment 05 - Structural concrete Levels 1-2 and steel erection start", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 320000],
  ["receivable", "AIA-FDC-006", "2025-08-01", 3500000, 0, "2025-09-01", "Progress Payment 06 - Structural concrete Levels 3-5 and steel erection", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 350000],
  ["receivable", "AIA-FDC-007", "2025-09-01", 3800000, 0, "2025-10-01", "Progress Payment 07 - Levels 6-7 structure masonry and MEP start", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 380000],
  ["receivable", "AIA-FDC-008", "2025-10-01", 3600000, 0, "2025-11-01", "Progress Payment 08 - Levels 8-9 structure and curtain wall start", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 360000],
  ["receivable", "AIA-FDC-009", "2025-11-01", 3900000, 0, "2025-12-01", "Progress Payment 09 - Levels 10-11 structure and MEP rough-in", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 390000],
  ["receivable", "AIA-FDC-010", "2025-12-01", 4100000, 0, "2026-01-01", "Progress Payment 10 - Level 12 structure curtain wall and roofing start", "paid", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 410000],
  ["receivable", "AIA-FDC-011", "2026-01-01", 2900000, 0, "2026-01-31", "Progress Payment 11 - Curtain wall Levels 7-10 and interior finishes start", "pending", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 290000],
  ["receivable", "AIA-FDC-012", "2026-01-15", 3500000, 0, "2026-02-14", "Progress Payment 12 - MEP rough-in Levels 1-6 and change order work", "pending", "", "U.S. General Services Administration", PROJECT_NAME, "4000", 10, 350000],
  // 21 Payable (subcontractor and vendor bills)
  ["payable", "INV-EAGLE-001", "2025-04-15", 3800000, 0, "2025-05-15", "Eagle Excavation - Earthwork complete final billing", "paid", "Eagle Excavation LLC", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-NWC-001", "2025-06-30", 1440000, 0, "2025-07-30", "Nationwide Concrete - Pay App 1 foundations", "paid", "Nationwide Concrete Inc", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-NWC-002", "2025-09-30", 1440000, 0, "2025-10-30", "Nationwide Concrete - Pay App 2 structural L1-4", "paid", "Nationwide Concrete Inc", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-NWC-003", "2025-12-15", 1440000, 0, "2026-01-15", "Nationwide Concrete - Pay App 3 structural L5-8", "paid", "Nationwide Concrete Inc", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-NWC-004", "2026-01-15", 880000, 0, "2026-02-15", "Nationwide Concrete - Pay App 4 structural L9-10 in progress", "pending", "Nationwide Concrete Inc", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-FSE-001", "2025-06-30", 2550000, 0, "2025-07-30", "Federal Steel - Pay App 1 steel erection L1-6", "paid", "Federal Steel Erectors", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-FSE-002", "2025-12-15", 2550000, 0, "2026-01-15", "Federal Steel - Pay App 2 steel erection L7-12", "paid", "Federal Steel Erectors", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-FSE-003", "2026-01-31", 1700000, 0, "2026-03-02", "Federal Steel - Pay App 3 connections and metal deck", "pending", "Federal Steel Erectors", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-PAT-001", "2025-12-01", 1700000, 0, "2025-12-31", "Patriot Electrical - Pay App 1 rough-in L1-3", "paid", "Patriot Electrical Contractors", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-PAT-002", "2026-01-31", 1020000, 0, "2026-03-02", "Patriot Electrical - Pay App 2 rough-in L4-6", "pending", "Patriot Electrical Contractors", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-CMEP-001", "2025-12-01", 1850000, 0, "2025-12-31", "Capital MEP - Pay App 1 HVAC and plumbing L1-3", "paid", "Capital MEP Group", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-CMEP-002", "2026-01-31", 1110000, 0, "2026-03-02", "Capital MEP - Pay App 2 HVAC L4-5 and plumbing risers", "pending", "Capital MEP Group", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-MMAS-001", "2025-12-15", 1566000, 0, "2026-01-15", "Monument Masonry - Pay App 1 exterior veneer L1-4", "paid", "Monument Masonry Corp", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-CROOF-001", "2026-01-15", 832500, 0, "2026-02-15", "Capitol Roofing - Pay App 1 Level 12 membrane and penthouse", "pending", "Capitol Roofing Systems", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-UDF-001", "2026-01-31", 864000, 0, "2026-03-02", "Union Drywall - Pay App 1 framing and drywall L1", "pending", "Union Drywall & Framing", "", PROJECT_NAME, "5010", 0, 0],
  ["payable", "INV-HSE-001", "2025-09-30", 242500, 0, "2025-10-30", "Huang Structural - Quarterly billing Q3 2025", "paid", "Huang Structural Engineering", "", PROJECT_NAME, "6050", 0, 0],
  ["payable", "INV-HSE-002", "2025-12-31", 121250, 0, "2026-01-31", "Huang Structural - Quarterly billing Q4 2025", "paid", "Huang Structural Engineering", "", PROJECT_NAME, "6050", 0, 0],
  ["payable", "INV-DBC-001", "2025-12-31", 92500, 0, "2026-01-31", "Davis-Bacon Compliance - Annual billing 2025", "paid", "Davis-Bacon Compliance Consulting", "", PROJECT_NAME, "5050", 0, 0],
  ["payable", "INV-NTL-001", "2025-12-31", 160000, 0, "2026-01-31", "National Testing Lab - Testing and inspections through Dec 2025", "paid", "National Testing Laboratory", "", PROJECT_NAME, "5040", 0, 0],
  ["payable", "INV-THA-001", "2025-12-31", 375000, 0, "2026-01-31", "Thornton Hartman - Architectural services through Dec 2025", "paid", "Thornton Hartman Architects", "", PROJECT_NAME, "6050", 0, 0],
];

// ============================================================================
// Sheet 25: Journal Entries — NON-INVOICE items only
// Auto-JEs from invoices handle: DR AR/CR Revenue, DR Expense/CR AP, payment JEs
// Manual JEs handle: grants, G&A, insurance, depreciation, interest, WIP
// ============================================================================
const journalEntries = [
  // JE-001: GSA Federal Appropriation
  ["JE-001", "2024-02-15", "GSA Federal Appropriation - Initial Grant Draw", "GRANT-GSA-001", "1005", 8000000, 0, "Federal grant funds received"],
  ["JE-001", "2024-02-15", "GSA Federal Appropriation - Initial Grant Draw", "GRANT-GSA-001", "4010", 0, 8000000, "Federal grant revenue recognized"],
  // JE-002: State Appropriation
  ["JE-002", "2024-03-01", "State Public Safety Bond Appropriation", "GRANT-STATE-001", "1006", 4100000, 0, "State appropriation funds received"],
  ["JE-002", "2024-03-01", "State Public Safety Bond Appropriation", "GRANT-STATE-001", "4020", 0, 4100000, "State appropriation revenue recognized"],
  // JE-003: CDBG Grant
  ["JE-003", "2024-04-01", "CDBG Grant - Initial Drawdown", "GRANT-CDBG-001", "1005", 2000000, 0, "CDBG federal grant funds received"],
  ["JE-003", "2024-04-01", "CDBG Grant - Initial Drawdown", "GRANT-CDBG-001", "4010", 0, 2000000, "CDBG grant revenue recognized"],
  // JE-004: Opening equity
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "1000", 5000000, 0, "Starting cash contributed"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "1100", 3200000, 0, "Equipment at cost"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "1110", 0, 850000, "Accumulated depreciation"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "1040", 685000, 0, "Prepaid insurance and bonds"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "1200", 250000, 0, "Bid bonds and security deposits"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "2080", 0, 1800000, "Equipment notes payable"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "2060", 0, 685000, "Performance bond liability"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "3000", 0, 500000, "Common stock"],
  ["JE-004", "2024-02-01", "Opening balances - equity and working capital", "OPENING", "3010", 0, 5300000, "Retained earnings"],
  // JE-005 through JE-014: G&A Monthly Allocations (10 months: Mar 2025 - Dec 2025)
  // Each month: DR 6000 $148000 + DR 6010 $85000 + DR 6020 $58000 = $291000, CR 1000 $291000
  ...generateMonthlyGA("2025-03-31", "JE-005", "GA-2503"),
  ...generateMonthlyGA("2025-04-30", "JE-006", "GA-2504"),
  ...generateMonthlyGA("2025-05-31", "JE-007", "GA-2505"),
  ...generateMonthlyGA("2025-06-30", "JE-008", "GA-2506"),
  ...generateMonthlyGA("2025-07-31", "JE-009", "GA-2507"),
  ...generateMonthlyGA("2025-08-31", "JE-010", "GA-2508"),
  ...generateMonthlyGA("2025-09-30", "JE-011", "GA-2509"),
  ...generateMonthlyGA("2025-10-31", "JE-012", "GA-2510"),
  ...generateMonthlyGA("2025-11-30", "JE-013", "GA-2511"),
  ...generateMonthlyGA("2025-12-31", "JE-014", "GA-2512"),
  // JE-015 through JE-024: Monthly Insurance (10 months)
  ...generateMonthlyInsurance("2025-03-31", "JE-015", "INS-2503"),
  ...generateMonthlyInsurance("2025-04-30", "JE-016", "INS-2504"),
  ...generateMonthlyInsurance("2025-05-31", "JE-017", "INS-2505"),
  ...generateMonthlyInsurance("2025-06-30", "JE-018", "INS-2506"),
  ...generateMonthlyInsurance("2025-07-31", "JE-019", "INS-2507"),
  ...generateMonthlyInsurance("2025-08-31", "JE-020", "INS-2508"),
  ...generateMonthlyInsurance("2025-09-30", "JE-021", "INS-2509"),
  ...generateMonthlyInsurance("2025-10-31", "JE-022", "INS-2510"),
  ...generateMonthlyInsurance("2025-11-30", "JE-023", "INS-2511"),
  ...generateMonthlyInsurance("2025-12-31", "JE-024", "INS-2512"),
  // JE-025 through JE-034: Monthly Depreciation (10 months)
  ...generateMonthlyDepreciation("2025-03-31", "JE-025", "DEP-2503"),
  ...generateMonthlyDepreciation("2025-04-30", "JE-026", "DEP-2504"),
  ...generateMonthlyDepreciation("2025-05-31", "JE-027", "DEP-2505"),
  ...generateMonthlyDepreciation("2025-06-30", "JE-028", "DEP-2506"),
  ...generateMonthlyDepreciation("2025-07-31", "JE-029", "DEP-2507"),
  ...generateMonthlyDepreciation("2025-08-31", "JE-030", "DEP-2508"),
  ...generateMonthlyDepreciation("2025-09-30", "JE-031", "DEP-2509"),
  ...generateMonthlyDepreciation("2025-10-31", "JE-032", "DEP-2510"),
  ...generateMonthlyDepreciation("2025-11-30", "JE-033", "DEP-2511"),
  ...generateMonthlyDepreciation("2025-12-31", "JE-034", "DEP-2512"),
  // JE-035 through JE-044: Monthly Interest on Equipment Notes (10 months)
  ...generateMonthlyInterest("2025-03-31", "JE-035", "INT-2503"),
  ...generateMonthlyInterest("2025-04-30", "JE-036", "INT-2504"),
  ...generateMonthlyInterest("2025-05-31", "JE-037", "INT-2505"),
  ...generateMonthlyInterest("2025-06-30", "JE-038", "INT-2506"),
  ...generateMonthlyInterest("2025-07-31", "JE-039", "INT-2507"),
  ...generateMonthlyInterest("2025-08-31", "JE-040", "INT-2508"),
  ...generateMonthlyInterest("2025-09-30", "JE-041", "INT-2509"),
  ...generateMonthlyInterest("2025-10-31", "JE-042", "INT-2510"),
  ...generateMonthlyInterest("2025-11-30", "JE-043", "INT-2511"),
  ...generateMonthlyInterest("2025-12-31", "JE-044", "INT-2512"),
  // JE-045: Direct labor accrual through Dec 2025
  ["JE-045", "2025-12-31", "Direct labor accrual through December 2025", "LABOR-YE25", "5000", 3200000, 0, "Direct field labor wages and burden YTD"],
  ["JE-045", "2025-12-31", "Direct labor accrual through December 2025", "LABOR-YE25", "2040", 0, 3200000, "Accrued wages and benefits payable"],
  // JE-046: Materials accrual
  ["JE-046", "2025-12-31", "Materials and supplies accrual Dec 2025", "MAT-YE25", "5020", 1450000, 0, "Materials incorporated into project YTD"],
  ["JE-046", "2025-12-31", "Materials and supplies accrual Dec 2025", "MAT-YE25", "1000", 0, 1450000, "Cash paid for materials"],
  // JE-047: Equipment rental costs
  ["JE-047", "2025-12-31", "Equipment costs accrual through Dec 2025", "EQUIP-YE25", "5030", 420000, 0, "Equipment operating costs on FDC-2024"],
  ["JE-047", "2025-12-31", "Equipment costs accrual through Dec 2025", "EQUIP-YE25", "1000", 0, 420000, "Cash paid for equipment operation"],
  // JE-048: Other direct costs
  ["JE-048", "2025-12-31", "Other direct costs through Dec 2025", "ODC-YE25", "5040", 139000, 0, "Permits testing and miscellaneous direct costs"],
  ["JE-048", "2025-12-31", "Other direct costs through Dec 2025", "ODC-YE25", "1000", 0, 139000, "Cash paid for other direct costs"],
  // JE-049: Davis-Bacon compliance costs (beyond vendor invoice)
  ["JE-049", "2025-12-31", "Davis-Bacon internal compliance costs 2025", "DBA-YE25", "5050", 85000, 0, "Internal DB compliance staff time and training"],
  ["JE-049", "2025-12-31", "Davis-Bacon internal compliance costs 2025", "DBA-YE25", "1000", 0, 85000, "Cash paid for DB compliance"],
  // JE-050: Section 3 compliance costs
  ["JE-050", "2025-12-31", "Section 3 compliance costs 2025", "S3-YE25", "5060", 53000, 0, "Section 3 outreach hiring and documentation"],
  ["JE-050", "2025-12-31", "Section 3 compliance costs 2025", "S3-YE25", "1000", 0, 53000, "Cash paid for Section 3 programs"],
  // JE-051: Bond premium amortization
  ["JE-051", "2025-12-31", "Performance bond premium amortization 2025", "BOND-YE25", "6030", 342500, 0, "Bond premium amortized 10 months"],
  ["JE-051", "2025-12-31", "Performance bond premium amortization 2025", "BOND-YE25", "1040", 0, 342500, "Prepaid bond premium reduction"],
  // JE-052: January 2026 G&A
  ...generateMonthlyGA("2026-01-31", "JE-052", "GA-2601"),
  // JE-053: January 2026 Insurance
  ...generateMonthlyInsurance("2026-01-31", "JE-053", "INS-2601"),
  // JE-054: January 2026 Depreciation
  ...generateMonthlyDepreciation("2026-01-31", "JE-054", "DEP-2601"),
  // JE-055: January 2026 Interest
  ...generateMonthlyInterest("2026-01-31", "JE-055", "INT-2601"),
  // JE-056: January 2026 direct labor
  ["JE-056", "2026-01-31", "Direct labor - January 2026", "LABOR-2601", "5000", 340000, 0, "Field labor January 2026"],
  ["JE-056", "2026-01-31", "Direct labor - January 2026", "LABOR-2601", "2040", 0, 340000, "Accrued wages January"],
  // JE-057: Additional grant draw 2026
  ["JE-057", "2026-01-05", "GSA Additional Grant Draw Q1 2026", "GRANT-GSA-002", "1005", 200000, 0, "Federal grant additional draw"],
  ["JE-057", "2026-01-05", "GSA Additional Grant Draw Q1 2026", "GRANT-GSA-002", "4010", 0, 200000, "Federal grant revenue recognized"],
];

// ============================================================================
// Helper functions for repeating monthly JEs
// ============================================================================
function generateMonthlyGA(date, entryNum, ref) {
  const desc = `Monthly G&A allocation - ${date.substring(0, 7)}`;
  return [
    [entryNum, date, desc, ref, "6000", 148000, 0, "Project management salaries"],
    [entryNum, date, desc, ref, "6010", 85000, 0, "General and administrative"],
    [entryNum, date, desc, ref, "6020", 58000, 0, "Insurance allocation"],
    [entryNum, date, desc, ref, "1000", 0, 291000, "Cash paid for G&A"],
  ];
}

function generateMonthlyInsurance(date, entryNum, ref) {
  const desc = `Insurance expense - ${date.substring(0, 7)}`;
  return [
    [entryNum, date, desc, ref, "6020", 12000, 0, "GL umbrella premium allocation"],
    [entryNum, date, desc, ref, "2070", 0, 12000, "Workers comp reserve increase"],
  ];
}

function generateMonthlyDepreciation(date, entryNum, ref) {
  const desc = `Equipment depreciation - ${date.substring(0, 7)}`;
  return [
    [entryNum, date, desc, ref, "6040", 35417, 0, "Monthly depreciation on equipment"],
    [entryNum, date, desc, ref, "1110", 0, 35417, "Accumulated depreciation increase"],
  ];
}

function generateMonthlyInterest(date, entryNum, ref) {
  const desc = `Interest on equipment notes - ${date.substring(0, 7)}`;
  return [
    [entryNum, date, desc, ref, "7000", 9500, 0, "Equipment note interest"],
    [entryNum, date, desc, ref, "2080", 0, 9500, "Notes payable interest accrued"],
  ];
}

// ============================================================================
// Build and write XLSX
// ============================================================================
function buildSheet(headers, data) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  // Set column widths
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 15) }));
  return ws;
}

function validateJournalEntries(entries) {
  const groups = {};
  for (const row of entries) {
    const num = row[0];
    if (!groups[num]) groups[num] = { debits: 0, credits: 0, lines: 0 };
    groups[num].debits += row[5] || 0;
    groups[num].credits += row[6] || 0;
    groups[num].lines++;
  }
  let valid = true;
  for (const [num, g] of Object.entries(groups)) {
    const diff = Math.abs(g.debits - g.credits);
    if (diff > 0.01) {
      console.error(`  IMBALANCE: ${num} — DR: ${g.debits.toFixed(2)}, CR: ${g.credits.toFixed(2)}, diff: ${diff.toFixed(2)}`);
      valid = false;
    }
  }
  return { valid, groupCount: Object.keys(groups).length, lineCount: entries.length };
}

// Main
const wb = XLSX.utils.book_new();

// Sheet 1
XLSX.utils.book_append_sheet(wb,
  buildSheet(["account_number", "name", "account_type", "sub_type", "description"], chartOfAccounts),
  "01_chart_of_accounts"
);

// Sheet 2
XLSX.utils.book_append_sheet(wb,
  buildSheet(["name", "bank_name", "account_type", "account_number_last4", "routing_number_last4", "current_balance"], bankAccounts),
  "02_bank_accounts"
);

// Sheet 3
XLSX.utils.book_append_sheet(wb,
  buildSheet(["name", "code", "status", "project_type", "address", "city", "state", "zip", "client_name", "client_email", "client_phone", "budget", "estimated_cost", "start_date", "end_date", "description", "completion_pct"], projects),
  "03_projects"
);

// Sheet 4
XLSX.utils.book_append_sheet(wb,
  buildSheet(["first_name", "last_name", "contact_type", "email", "phone", "company_name", "job_title"], contacts),
  "04_contacts"
);

// Sheet 5
XLSX.utils.book_append_sheet(wb,
  buildSheet(["company_name", "first_name", "last_name", "email", "phone", "job_title"], vendors),
  "05_vendors"
);

// Sheet 6
XLSX.utils.book_append_sheet(wb,
  buildSheet(["name", "equipment_type", "make", "model", "serial_number", "status", "purchase_cost", "hourly_rate", "purchase_date", "last_maintenance_date", "next_maintenance_date"], equipment),
  "06_equipment"
);

// Sheet 7
XLSX.utils.book_append_sheet(wb,
  buildSheet(["name", "color", "start_date", "end_date", "project_name"], phases),
  "07_phases"
);

// Sheet 8
XLSX.utils.book_append_sheet(wb,
  buildSheet(["name", "phase_name", "priority", "start_date", "end_date", "completion_pct", "is_milestone", "is_critical_path", "project_name", "status"], tasks),
  "08_tasks"
);

// Sheet 9
XLSX.utils.book_append_sheet(wb,
  buildSheet(["csi_code", "description", "budgeted_amount", "committed_amount", "actual_amount", "project_name"], budgetLines),
  "09_project_budget_lines"
);

// Sheet 10
XLSX.utils.book_append_sheet(wb,
  buildSheet(["cert_name", "cert_type", "issuing_authority", "cert_number", "issued_date", "expiry_date", "contact_name"], certifications),
  "10_certifications"
);

// Sheet 11
XLSX.utils.book_append_sheet(wb,
  buildSheet(["name", "client_name", "stage", "estimated_value", "probability_pct", "expected_close_date", "source", "notes"], opportunities),
  "11_opportunities"
);

// Sheet 12
XLSX.utils.book_append_sheet(wb,
  buildSheet(["project_name", "client_name", "bid_amount", "due_date", "bid_type", "notes"], bids),
  "12_bids"
);

// Sheet 13
XLSX.utils.book_append_sheet(wb,
  buildSheet(["title", "contract_type", "party_name", "party_email", "contract_amount", "start_date", "end_date", "payment_terms", "scope_of_work", "project_name", "status"], contracts),
  "13_contracts"
);

// Sheet 14
XLSX.utils.book_append_sheet(wb,
  buildSheet(["log_date", "weather_conditions", "temperature", "work_performed", "safety_incidents", "delays", "project_name", "status"], dailyLogs),
  "14_daily_logs"
);

// Sheet 15
XLSX.utils.book_append_sheet(wb,
  buildSheet(["subject", "question", "priority", "status", "due_date", "cost_impact", "schedule_impact_days", "project_name", "assigned_to", "answer"], rfis),
  "15_rfis"
);

// Sheet 16
XLSX.utils.book_append_sheet(wb,
  buildSheet(["title", "description", "reason", "amount", "schedule_impact_days", "project_name", "status", "co_number"], changeOrders),
  "16_change_orders"
);

// Sheet 17
XLSX.utils.book_append_sheet(wb,
  buildSheet(["title", "submittal_number", "project_name", "spec_section", "status", "due_date", "review_comments"], submittals),
  "17_submittals"
);

// Sheet 18
XLSX.utils.book_append_sheet(wb,
  buildSheet(["title", "description", "incident_type", "severity", "incident_date", "location", "osha_recordable", "project_name", "status"], safetyIncidents),
  "18_safety_incidents"
);

// Sheet 19
XLSX.utils.book_append_sheet(wb,
  buildSheet(["inspection_type", "inspection_date", "score", "findings", "corrective_actions", "status", "project_name"], safetyInspections),
  "19_safety_inspections"
);

// Sheet 20
XLSX.utils.book_append_sheet(wb,
  buildSheet(["title", "description", "topic", "scheduled_date", "attendees_count", "notes", "project_name", "status"], toolboxTalks),
  "20_toolbox_talks"
);

// Sheet 21
XLSX.utils.book_append_sheet(wb,
  buildSheet(["entry_date", "hours", "overtime_hours", "description", "cost_code", "project_name", "status"], timeEntries),
  "21_time_entries"
);

// Sheet 22
XLSX.utils.book_append_sheet(wb,
  buildSheet(["equipment_name", "project_name", "assigned_date", "return_date", "notes", "status"], equipmentAssignments),
  "22_equipment_assignments"
);

// Sheet 23
XLSX.utils.book_append_sheet(wb,
  buildSheet(["equipment_name", "title", "maintenance_type", "description", "maintenance_date", "cost", "performed_by", "vendor_name", "next_due_date", "status"], equipmentMaintenance),
  "23_equipment_maintenance"
);

// Sheet 24
XLSX.utils.book_append_sheet(wb,
  buildSheet(["invoice_type", "invoice_number", "invoice_date", "amount", "tax_amount", "due_date", "description", "status", "vendor_name", "client_name", "project_name", "gl_account", "retainage_pct", "retainage_held"], invoices),
  "24_invoices"
);

// Sheet 25 — Journal Entries (validate first)
console.log("Validating journal entries...");
const jeResult = validateJournalEntries(journalEntries);
console.log(`  ${jeResult.groupCount} entries, ${jeResult.lineCount} lines`);
if (!jeResult.valid) {
  console.error("JOURNAL ENTRIES DO NOT BALANCE! Fix before uploading.");
  process.exit(1);
} else {
  console.log("  All journal entries balance.");
}

XLSX.utils.book_append_sheet(wb,
  buildSheet(["entry_number", "entry_date", "description", "reference", "account_number", "debit", "credit", "line_description"], journalEntries),
  "25_journal_entries"
);

// Write file
const outputPath = join(__dirname, "FDC2024_Federal_Courthouse.xlsx");
const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(outputPath, xlsxBuffer);

console.log(`\nGenerated: ${outputPath}`);
console.log(`Sheets: ${wb.SheetNames.length}`);
console.log("Sheet names:");
wb.SheetNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));

// Summary stats
console.log("\nRow counts:");
console.log(`  Chart of Accounts: ${chartOfAccounts.length}`);
console.log(`  Bank Accounts: ${bankAccounts.length}`);
console.log(`  Projects: ${projects.length}`);
console.log(`  Contacts: ${contacts.length}`);
console.log(`  Vendors: ${vendors.length}`);
console.log(`  Equipment: ${equipment.length}`);
console.log(`  Phases: ${phases.length}`);
console.log(`  Tasks: ${tasks.length}`);
console.log(`  Budget Lines: ${budgetLines.length}`);
console.log(`  Certifications: ${certifications.length}`);
console.log(`  Opportunities: ${opportunities.length}`);
console.log(`  Bids: ${bids.length}`);
console.log(`  Contracts: ${contracts.length}`);
console.log(`  Daily Logs: ${dailyLogs.length}`);
console.log(`  RFIs: ${rfis.length}`);
console.log(`  Change Orders: ${changeOrders.length}`);
console.log(`  Submittals: ${submittals.length}`);
console.log(`  Safety Incidents: ${safetyIncidents.length}`);
console.log(`  Safety Inspections: ${safetyInspections.length}`);
console.log(`  Toolbox Talks: ${toolboxTalks.length}`);
console.log(`  Time Entries: ${timeEntries.length}`);
console.log(`  Equipment Assignments: ${equipmentAssignments.length}`);
console.log(`  Equipment Maintenance: ${equipmentMaintenance.length}`);
console.log(`  Invoices: ${invoices.length}`);
console.log(`  Journal Entries: ${journalEntries.length} lines`);
const total = chartOfAccounts.length + bankAccounts.length + projects.length +
  contacts.length + vendors.length + equipment.length + phases.length +
  tasks.length + budgetLines.length + certifications.length + opportunities.length +
  bids.length + contracts.length + dailyLogs.length + rfis.length +
  changeOrders.length + submittals.length + safetyIncidents.length +
  safetyInspections.length + toolboxTalks.length + timeEntries.length +
  equipmentAssignments.length + equipmentMaintenance.length + invoices.length +
  journalEntries.length;
console.log(`  TOTAL ROWS: ${total}`);
