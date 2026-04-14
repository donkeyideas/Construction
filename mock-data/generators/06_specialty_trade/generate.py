#!/usr/bin/env python3
"""
IronClad Steel Erectors LLC - Specialty Trade Mock Data Generator
=================================================================
Steel erection company based in Houston, TX.

Profile:
  - Equipment-heavy, safety-intensive, certification-critical
  - Revenue: ~$42M (steel erection contracts as sub to GCs)
  - Net Income: ~$3.5M
  - 5 projects (LNG terminal, hospital, arena, port, university)
  - 25 field workers, 10 office staff
  - ~700 total rows across 16 sheets

Sheets produced:
   1. Chart of Accounts       (~45 rows)
   2. Bank Accounts           (3 rows)
   3. Projects                (5 rows)
   4. Contacts                (~39 rows)
   5. Vendors                 (~12 rows)
   6. Equipment               (15 rows)
   7. Equipment Assignments   (18 rows)
   8. Equipment Maintenance   (15 rows)
   9. Contracts               (5 rows)
  10. Time Entries            (~150 rows)
  11. Daily Logs              (40 rows)
  12. Safety Incidents        (10 rows)
  13. Safety Inspections      (15 rows)
  14. Toolbox Talks           (20 rows)
  15. Certifications          (30 rows)
  16. Invoices                (~50 rows)
  17. Journal Entries         (~150 lines)

Usage:
  python generate.py
"""

import sys
import os
import random
from datetime import date, timedelta
from collections import defaultdict

# ── Shared utilities ─────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from shared.helpers import (
    random_phone, random_email, random_date_between, fmt,
    allocate_to_months, MONTH_ENDS, MONTH_NAMES,
)
from shared.name_pools import generate_person_name
from shared.xlsx_builder import build_xlsx, verify_financials

# ── Reproducibility ──────────────────────────────────────────────────
random.seed(600)


# =====================================================================
#  CONSTANTS
# =====================================================================
COMPANY_DOMAIN = "ironcladsteel.com"

PROJECTS = [
    {
        "name": "LNG Export Terminal - Steel Structure",
        "code": "LNG-S-2024",
        "project_type": "Industrial",
        "budget": "14000000",
        "start_date": "2024-03-01",
        "end_date": "2026-01-31",
        "completion_pct": "50",
        "client_name": "Bechtel",
    },
    {
        "name": "Memorial Hermann Hospital Tower - Steel",
        "code": "MHH-S-2024",
        "project_type": "Healthcare",
        "budget": "9500000",
        "start_date": "2024-05-15",
        "end_date": "2025-12-31",
        "completion_pct": "65",
        "client_name": "Turner Construction",
    },
    {
        "name": "Toyota Center Arena Renovation - Steel",
        "code": "TCA-S-2025",
        "project_type": "Entertainment",
        "budget": "7200000",
        "start_date": "2025-01-15",
        "end_date": "2025-11-30",
        "completion_pct": "25",
        "client_name": "AECOM Hunt",
    },
    {
        "name": "Port of Houston Crane Rail System",
        "code": "POH-S-2025",
        "project_type": "Infrastructure",
        "budget": "6800000",
        "start_date": "2025-02-01",
        "end_date": "2026-03-31",
        "completion_pct": "15",
        "client_name": "Zachry Group",
    },
    {
        "name": "Rice University Research Building - Steel",
        "code": "RUR-S-2025",
        "project_type": "Education",
        "budget": "4500000",
        "start_date": "2025-01-01",
        "end_date": "2025-10-31",
        "completion_pct": "35",
        "client_name": "Turner Construction",
    },
]

PROJECT_NAMES = [p["name"] for p in PROJECTS]

# GC client names (deduplicated)
GC_NAMES = ["Bechtel", "Turner Construction", "AECOM Hunt", "Zachry Group"]

# Monthly billing weights (Jan-Dec) - heavier in active months
# LNG: 50% done, Hospital: 65%, Arena: 25%, Port: 15%, Rice: 35%
BILLING_WEIGHTS = [1.0, 1.0, 1.1, 1.1, 1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 0.7, 0.7]


# =====================================================================
#  1. CHART OF ACCOUNTS (~45)
# =====================================================================
def generate_coa():
    """Steel erection company chart of accounts."""
    accounts = [
        # ── Assets ──
        ("1000", "Cash - Operating",                "asset",     "Current Asset"),
        ("1010", "Accounts Receivable",             "asset",     "Current Asset"),
        ("1020", "Retainage Receivable",            "asset",     "Current Asset"),
        ("1040", "Prepaid Insurance & Bonds",       "asset",     "Current Asset"),
        ("1100", "Equipment & Cranes",              "asset",     "Fixed Asset"),
        ("1110", "Accum Depreciation - Equipment",  "asset",     "Fixed Asset"),
        ("1120", "Vehicles",                        "asset",     "Fixed Asset"),
        ("1130", "Accum Depreciation - Vehicles",   "asset",     "Fixed Asset"),
        # ── Liabilities ──
        ("2000", "Accounts Payable",                "liability", "Current Liability"),
        ("2010", "Retainage Payable",               "liability", "Current Liability"),
        ("2020", "Accrued Payroll",                  "liability", "Current Liability"),
        ("2030", "Accrued Expenses",                 "liability", "Current Liability"),
        ("2050", "Sales Tax Payable",                "liability", "Current Liability"),
        ("2100", "Equipment Financing",              "liability", "Long-Term Liability"),
        ("2200", "Line of Credit",                   "liability", "Long-Term Liability"),
        # ── Equity ──
        ("3000", "Owners Capital",                   "equity",    "Equity"),
        ("3010", "Retained Earnings",                "equity",    "Equity"),
        # ── Revenue ──
        ("4000", "Steel Erection Revenue",           "revenue",   "Revenue"),
        ("4010", "Miscellaneous Fabrication Revenue", "revenue",  "Revenue"),
        ("4200", "Change Order Revenue",             "revenue",   "Revenue"),
        # ── Direct Costs ──
        ("5000", "Structural Steel Materials",       "expense",   "Direct Cost"),
        ("5010", "Connection Hardware",              "expense",   "Direct Cost"),
        ("5020", "Decking & Joists",                 "expense",   "Direct Cost"),
        ("5030", "Welding Consumables",              "expense",   "Direct Cost"),
        ("5100", "Ironworker Labor",                 "expense",   "Direct Cost"),
        ("5110", "Welder Labor",                     "expense",   "Direct Cost"),
        ("5120", "Crane Operator Labor",             "expense",   "Direct Cost"),
        ("5130", "Labor Payroll Taxes",              "expense",   "Direct Cost"),
        ("5200", "Crane Rental & Operations",        "expense",   "Direct Cost"),
        ("5210", "Rigging Equipment",                "expense",   "Direct Cost"),
        ("5220", "Welding Equipment Costs",          "expense",   "Direct Cost"),
        ("5230", "Fuel & Lubricants",                "expense",   "Direct Cost"),
        # ── Overhead ──
        ("6000", "Officer Salaries",                 "expense",   "Overhead"),
        ("6010", "Office & Estimating Staff",        "expense",   "Overhead"),
        ("6020", "Payroll Taxes - G&A",              "expense",   "Overhead"),
        ("6030", "Office Rent & Utilities",          "expense",   "Overhead"),
        ("6040", "Insurance - GL & Workers Comp",    "expense",   "Overhead"),
        ("6050", "Bonds & Surety",                   "expense",   "Overhead"),
        ("6060", "Professional Services",            "expense",   "Overhead"),
        ("6070", "IT & Software",                    "expense",   "Overhead"),
        ("6100", "Depreciation - Equipment",         "expense",   "Overhead"),
        ("6110", "Depreciation - Vehicles",          "expense",   "Overhead"),
        # ── Other ──
        ("7000", "Interest Expense",                 "expense",   "Other Expense"),
    ]
    rows = []
    for num, name, atype, sub in accounts:
        rows.append({
            "account_number": num,
            "name":           name,
            "type":           atype,
            "sub_type":       sub,
        })
    return rows


# =====================================================================
#  2. BANK ACCOUNTS (3)
# =====================================================================
def generate_bank_accounts():
    return [
        {
            "account_name":    "Operating Account",
            "bank_name":       "Frost Bank",
            "account_type":    "checking",
            "account_number":  "****6142",
            "routing_number":  "114000093",
            "current_balance": "2800000.00",
            "gl_account":      "1000",
        },
        {
            "account_name":    "Payroll Account",
            "bank_name":       "Frost Bank",
            "account_type":    "checking",
            "account_number":  "****6143",
            "routing_number":  "114000093",
            "current_balance": "580000.00",
            "gl_account":      "1000",
        },
        {
            "account_name":    "Equipment Reserve",
            "bank_name":       "Comerica Bank",
            "account_type":    "savings",
            "account_number":  "****8907",
            "routing_number":  "111000753",
            "current_balance": "450000.00",
            "gl_account":      "1000",
        },
    ]


# =====================================================================
#  3. PROJECTS (5)
# =====================================================================
def generate_projects():
    rows = []
    houston_addresses = [
        ("16200 Park Row Dr", "77084"),
        ("6411 Fannin St", "77030"),
        ("1510 Polk St", "77003"),
        ("111 East Loop North", "77029"),
        ("6100 Main St", "77005"),
    ]
    for i, p in enumerate(PROJECTS):
        addr, zipcode = houston_addresses[i]
        rows.append({
            "name":           p["name"],
            "code":           p["code"],
            "project_type":   p["project_type"],
            "status":         "in_progress",
            "start_date":     p["start_date"],
            "end_date":       p["end_date"],
            "budget":         p["budget"],
            "estimated_cost": p["budget"],
            "completion_pct": p["completion_pct"],
            "address":        addr,
            "city":           "Houston",
            "state":          "TX",
            "zip":            zipcode,
            "client_name":    p["client_name"],
        })
    return rows


# =====================================================================
#  4. CONTACTS (~39: 25 field + 10 office + 4 GC PMs)
# =====================================================================
def generate_contacts():
    used_names = set()
    contacts = []

    # ── Field crew (25) ──
    field_roles = (
        [("Ironworker", "Field")] * 10 +
        [("Welder", "Field")] * 6 +
        [("Crane Operator", "Field")] * 4 +
        [("Foreman", "Field")] * 3 +
        [("Safety Director", "Field")] * 1 +
        [("Quality Control Manager", "Field")] * 1
    )
    for role, dept in field_roles:
        first, last = generate_person_name(used_names)
        contacts.append({
            "first_name":   first,
            "last_name":    last,
            "email":        random_email(first, last, COMPANY_DOMAIN),
            "phone":        random_phone(),
            "role":         role,
            "company_name": "IronClad Steel Erectors LLC",
        })

    # ── Office staff (10) ──
    office_roles = [
        "Owner / President",
        "VP Operations",
        "Controller",
        "Senior Estimator",
        "Estimator",
        "Project Coordinator",
        "Office Manager",
        "Dispatcher",
        "HR Manager",
        "Shop Foreman",
    ]
    for role in office_roles:
        first, last = generate_person_name(used_names)
        contacts.append({
            "first_name":   first,
            "last_name":    last,
            "email":        random_email(first, last, COMPANY_DOMAIN),
            "phone":        random_phone(),
            "role":         role,
            "company_name": "IronClad Steel Erectors LLC",
        })

    # ── GC Project Managers (4) ──
    gc_domains = {
        "Bechtel": "bechtel.com",
        "Turner Construction": "tcco.com",
        "AECOM Hunt": "aecom.com",
        "Zachry Group": "zachrygroup.com",
    }
    for gc_name, domain in gc_domains.items():
        first, last = generate_person_name(used_names)
        contacts.append({
            "first_name":   first,
            "last_name":    last,
            "email":        random_email(first, last, domain),
            "phone":        random_phone(),
            "role":         "GC Project Manager",
            "company_name": gc_name,
        })

    return contacts


# =====================================================================
#  5. VENDORS (~12)
# =====================================================================
def generate_vendors():
    used_names = set()
    vendors_spec = [
        # Steel suppliers
        ("Nucor Steel",                    "Structural Steel Supply"),
        ("Steel Technologies Inc",         "Steel Fabrication & Supply"),
        ("Commercial Metals Company",      "Steel & Rebar Supply"),
        ("Gerdau Ameristeel",              "Structural Steel Supply"),
        # Bolt/connection
        ("Fastenal",                        "Bolts & Fasteners"),
        ("Portland Bolt & Manufacturing",   "Structural Bolts"),
        # Welding
        ("Lincoln Electric",                "Welding Equipment & Consumables"),
        ("Miller Electric Mfg",             "Welding Equipment"),
        # Crane rental
        ("Maxim Crane Works",               "Crane Rental & Rigging"),
        ("ALL Erection & Crane Rental",     "Crane Rental"),
        # Safety
        ("MSA Safety",                      "Fall Protection & PPE"),
        ("3M Fall Protection",              "Fall Protection Systems"),
    ]

    houston_addresses = [
        "12400 N Gessner Rd", "8700 W Sam Houston Pkwy S",
        "4500 Clinton Dr", "7600 Navigation Blvd",
        "2900 N Loop W", "1800 St Emanuel St",
        "5100 Westheimer Rd", "3200 S Wayside Dr",
        "10400 Katy Fwy", "6700 Bingle Rd",
        "1500 N Post Oak Rd", "9800 Hillcroft Ave",
    ]

    rows = []
    for i, (name, trade) in enumerate(vendors_spec):
        first, last = generate_person_name(used_names)
        domain = name.lower().replace(" ", "").replace("&", "").replace(",", "") + ".com"
        rows.append({
            "name":         name,
            "contact_name": f"{first} {last}",
            "email":        random_email(first, last, domain),
            "phone":        random_phone(),
            "address":      houston_addresses[i],
            "city":         "Houston",
            "state":        "TX",
            "zip":          f"770{random.randint(10, 99):02d}",
            "trade":        trade,
        })

    return rows


# =====================================================================
#  6. EQUIPMENT (15) — all purchase_cost="0"
# =====================================================================
def generate_equipment():
    """Heavy equipment fleet. purchase_cost=0 to prevent auto-JE duplication."""
    equip_list = [
        ("Liebherr LR 1300 Crawler Crane",   "Crawler Crane",    "300 ton capacity", "2019"),
        ("Manitowoc 16000 Crawler Crane",     "Crawler Crane",    "440 ton capacity", "2020"),
        ("Liebherr LTM 1220 Mobile Crane",    "Mobile Crane",     "220 ton capacity, rubber tire", "2021"),
        ("Lincoln Vantage 500 Welding Rig",   "Welding Rig",      "Diesel, 500A output", "2022"),
        ("Miller Big Blue 800 Welding Rig",   "Welding Rig",      "Diesel, 800A output", "2021"),
        ("Personnel Hoist - North",            "Man Basket",       "OSHA-compliant, 2-person", "2023"),
        ("Personnel Hoist - South",            "Man Basket",       "OSHA-compliant, 2-person", "2022"),
        ("Kenworth T880 Flatbed",              "Flatbed Truck",    "Steel hauling, 48ft bed", "2020"),
        ("Peterbilt 567 Flatbed",              "Flatbed Truck",    "Steel hauling, 48ft bed", "2021"),
        ("CAT TL1255D Telehandler",            "Forklift",         "12,000 lb capacity, 55ft reach", "2022"),
        ("Gang Box - Alpha",                   "Tool Storage",     "Job box, 48x30x63", "2023"),
        ("Gang Box - Bravo",                   "Tool Storage",     "Job box, 48x30x63", "2023"),
        ("Atlas Copco XAS 750 Compressor",     "Air Compressor",   "750 CFM, diesel", "2021"),
        ("Caterpillar XQ400 Generator",        "Generator",        "400 kW, diesel", "2020"),
        ("Hytorc Avanti Torque Wrench Set",    "Torque Wrench",    "Hydraulic bolt tensioning", "2022"),
    ]

    rows = []
    for name, eq_type, desc, year in equip_list:
        rows.append({
            "name":           name,
            "equipment_type": eq_type,
            "description":    desc,
            "status":         "active",
            "purchase_date":  f"{year}-06-15",
            "purchase_cost":  "0",
        })
    return rows


# =====================================================================
#  7. EQUIPMENT ASSIGNMENTS (18)
# =====================================================================
def generate_equipment_assignments(contacts):
    """Assign equipment to projects. Some returned, some active."""
    # Get crane operators and foremen for assignment
    operators = [c for c in contacts if c["role"] == "Crane Operator"]
    foremen = [c for c in contacts if c["role"] == "Foreman"]
    welders = [c for c in contacts if c["role"] == "Welder"]

    assignments = [
        # Crawler cranes to major projects
        ("Liebherr LR 1300 Crawler Crane",  PROJECT_NAMES[0], operators[0], "2024-03-15", "",           "Primary crane - LNG structural steel", "active"),
        ("Manitowoc 16000 Crawler Crane",   PROJECT_NAMES[1], operators[1], "2024-06-01", "",           "Primary crane - hospital tower", "active"),
        ("Liebherr LTM 1220 Mobile Crane",  PROJECT_NAMES[2], operators[2], "2025-01-20", "",           "Arena renovation steel", "active"),
        ("Liebherr LTM 1220 Mobile Crane",  PROJECT_NAMES[4], operators[3], "2025-01-05", "2025-01-18", "Initial steel delivery unloading", "returned"),

        # Welding rigs
        ("Lincoln Vantage 500 Welding Rig", PROJECT_NAMES[0], welders[0],   "2024-04-01", "",           "Field welding - LNG columns", "active"),
        ("Miller Big Blue 800 Welding Rig", PROJECT_NAMES[1], welders[1],   "2024-07-01", "",           "Field welding - hospital connections", "active"),
        ("Lincoln Vantage 500 Welding Rig", PROJECT_NAMES[4], welders[2],   "2025-01-10", "2025-02-28", "Rice building initial welds", "returned"),
        ("Miller Big Blue 800 Welding Rig", PROJECT_NAMES[2], welders[3],   "2025-02-01", "",           "Arena welding - truss connections", "active"),

        # Flatbed trucks distributed
        ("Kenworth T880 Flatbed",           PROJECT_NAMES[0], foremen[0],   "2024-03-10", "",           "Steel deliveries - LNG site", "active"),
        ("Peterbilt 567 Flatbed",           PROJECT_NAMES[1], foremen[1],   "2024-05-20", "",           "Steel deliveries - hospital", "active"),
        ("Kenworth T880 Flatbed",           PROJECT_NAMES[3], foremen[2],   "2025-02-05", "",           "Crane rail materials delivery", "active"),

        # Telehandler
        ("CAT TL1255D Telehandler",         PROJECT_NAMES[0], foremen[0],   "2024-03-15", "",           "Steel shake-out and sorting", "active"),
        ("CAT TL1255D Telehandler",         PROJECT_NAMES[4], foremen[1],   "2025-01-05", "2025-02-15", "Initial site staging", "returned"),

        # Gang boxes
        ("Gang Box - Alpha",                PROJECT_NAMES[0], foremen[0],   "2024-03-10", "",           "Ironworker tools - LNG", "active"),
        ("Gang Box - Bravo",                PROJECT_NAMES[1], foremen[1],   "2024-06-01", "",           "Ironworker tools - hospital", "active"),

        # Support equipment
        ("Atlas Copco XAS 750 Compressor",  PROJECT_NAMES[0], foremen[0],   "2024-04-01", "",           "Pneumatic bolt guns - LNG", "active"),
        ("Caterpillar XQ400 Generator",     PROJECT_NAMES[3], foremen[2],   "2025-02-10", "",           "Temp power - Port of Houston", "active"),
        ("Hytorc Avanti Torque Wrench Set", PROJECT_NAMES[1], foremen[1],   "2024-06-15", "",           "High-strength bolt tensioning", "active"),
    ]

    rows = []
    for eq_name, proj, contact, start, end, notes, status in assignments:
        assigned_to = f"{contact['first_name']} {contact['last_name']}"
        rows.append({
            "equipment_name": eq_name,
            "project_name":   proj,
            "assigned_to":    assigned_to,
            "assigned_date":  start,
            "return_date":    end,
            "notes":          notes,
            "status":         status,
        })
    return rows


# =====================================================================
#  8. EQUIPMENT MAINTENANCE (15)
# =====================================================================
def generate_equipment_maintenance():
    """Crane inspections, welding calibration, vehicle maintenance, rigging inspections."""
    maint_records = [
        # Monthly crane inspections (mandatory OSHA)
        ("Liebherr LR 1300 Crawler Crane",  "Annual Inspection",    "Annual OSHA/ANSI B30.5 crane inspection - 300T crawler",   "2025-01-10", "Gulf Coast Crane Inspections", "2026-01-10"),
        ("Manitowoc 16000 Crawler Crane",   "Annual Inspection",    "Annual OSHA/ANSI B30.5 crane inspection - 440T crawler",   "2025-01-15", "Gulf Coast Crane Inspections", "2026-01-15"),
        ("Liebherr LTM 1220 Mobile Crane",  "Annual Inspection",    "Annual OSHA/ANSI B30.5 crane inspection - 220T mobile",    "2025-02-01", "Gulf Coast Crane Inspections", "2026-02-01"),
        ("Liebherr LR 1300 Crawler Crane",  "Monthly Inspection",   "Monthly visual and operational crane inspection",          "2025-02-10", "In-house - Crane Dept",        "2025-03-10"),
        ("Manitowoc 16000 Crawler Crane",   "Monthly Inspection",   "Monthly visual and operational crane inspection",          "2025-02-15", "In-house - Crane Dept",        "2025-03-15"),
        ("Liebherr LR 1300 Crawler Crane",  "Monthly Inspection",   "Monthly visual and operational crane inspection",          "2025-03-10", "In-house - Crane Dept",        "2025-04-10"),
        ("Manitowoc 16000 Crawler Crane",   "Monthly Inspection",   "Monthly visual and operational crane inspection",          "2025-03-15", "In-house - Crane Dept",        "2025-04-15"),

        # Welding equipment calibration
        ("Lincoln Vantage 500 Welding Rig", "Calibration",          "Amperage output calibration and lead inspection",          "2025-01-20", "Lincoln Electric Service",      "2025-07-20"),
        ("Miller Big Blue 800 Welding Rig", "Calibration",          "Amperage output calibration and lead inspection",          "2025-02-05", "Miller Electric Service",       "2025-08-05"),

        # Vehicle maintenance
        ("Kenworth T880 Flatbed",           "Preventive Maintenance", "Oil change, brake inspection, tire rotation, DOT check", "2025-01-25", "Rush Truck Center Houston",     "2025-04-25"),
        ("Peterbilt 567 Flatbed",           "Preventive Maintenance", "Oil change, brake inspection, tire rotation, DOT check", "2025-02-20", "Rush Truck Center Houston",     "2025-05-20"),

        # Rigging gear inspections
        ("Personnel Hoist - North",         "Quarterly Inspection", "Man basket structural inspection, lanyard points, capacity test", "2025-01-15", "SafeRig Inspections LLC", "2025-04-15"),
        ("Personnel Hoist - South",         "Quarterly Inspection", "Man basket structural inspection, lanyard points, capacity test", "2025-01-15", "SafeRig Inspections LLC", "2025-04-15"),

        # Other
        ("Atlas Copco XAS 750 Compressor",  "Preventive Maintenance", "Air filter, oil change, separator element",              "2025-03-01", "Atlas Copco Service",           "2025-06-01"),
        ("Caterpillar XQ400 Generator",     "Preventive Maintenance", "Oil change, coolant check, load bank test",              "2025-02-25", "Caterpillar Houston Dealer",    "2025-05-25"),
    ]

    rows = []
    for eq_name, mtype, desc, mdate, performer, next_due in maint_records:
        rows.append({
            "equipment_name":   eq_name,
            "maintenance_type": mtype,
            "description":      desc,
            "maintenance_date": mdate,
            "cost":             "0",
            "performed_by":     performer,
            "next_due_date":    next_due,
        })
    return rows


# =====================================================================
#  9. CONTRACTS (5)
# =====================================================================
def generate_contracts():
    rows = []
    for p in PROJECTS:
        rows.append({
            "contract_number": f"IC-{p['code']}",
            "title":           f"Steel Erection - {p['name']}",
            "contract_type":   "subcontract",
            "amount":          p["budget"],
            "start_date":      p["start_date"],
            "end_date":        p["end_date"],
            "status":          "active",
            "project_name":    p["name"],
            "client_name":     p["client_name"],
        })
    return rows


# =====================================================================
#  10. TIME ENTRIES (~150)
# =====================================================================
def generate_time_entries(contacts):
    """Ironworker/welder/crane op time across 5 projects, Jan-Apr 2025."""
    field_workers = [c for c in contacts
                     if c["role"] in ("Ironworker", "Welder", "Crane Operator", "Foreman")
                     and c["company_name"] == "IronClad Steel Erectors LLC"]

    descriptions_by_role = {
        "Ironworker": [
            "Column erection Section A",
            "Beam setting floor 12-14",
            "Bolting connections grid line 5",
            "Plumbing up columns",
            "Shake-out and sorting steel",
            "Decking installation Level 3",
            "Bracing and guying columns",
            "Setting header beams - north bay",
            "Landing and connecting girders",
            "Erecting stair stringers",
        ],
        "Welder": [
            "Field welding moment connections",
            "Welding base plates to embed",
            "Full penetration welds - beam to column",
            "Fillet welds - brace connections",
            "Tack welding shear tabs",
            "Welding decking studs",
        ],
        "Crane Operator": [
            "Crane mobilization and setup",
            "Steel picks - columns and beams",
            "Hoisting personnel baskets",
            "Crane swing operations - controlled zone",
            "Load testing and rigging setup",
        ],
        "Foreman": [
            "Safety rigging inspection",
            "Crew coordination and layout",
            "Pre-task planning and JHA review",
            "Quality inspection - bolt torque verification",
        ],
    }

    # Project assignment weights (workers distributed by project activity)
    # LNG (biggest), Hospital (65%), Arena (25%), Port (15%), Rice (35%)
    project_weights = [0.30, 0.25, 0.15, 0.15, 0.15]

    rows = []
    months = [
        (date(2025, 1, 6), date(2025, 1, 31)),
        (date(2025, 2, 3), date(2025, 2, 28)),
        (date(2025, 3, 3), date(2025, 3, 31)),
        (date(2025, 4, 1), date(2025, 4, 30)),
    ]

    entry_idx = 0
    for worker in field_workers:
        role = worker["role"]
        worker_name = f"{worker['first_name']} {worker['last_name']}"
        descs = descriptions_by_role.get(role, descriptions_by_role["Ironworker"])

        # Each worker gets ~6-7 entries across 4 months
        for month_start, month_end in months:
            if random.random() < 0.55:  # ~55% chance per month per worker
                continue

            work_date = random_date_between(month_start, month_end)
            proj_idx = random.choices(range(5), weights=project_weights, k=1)[0]
            hours = random.choice([8, 9, 10, 10, 10, 8, 8])

            rows.append({
                "contact_name":  worker_name,
                "project_name":  PROJECT_NAMES[proj_idx],
                "date":          work_date.isoformat(),
                "hours":         str(hours),
                "description":   random.choice(descs),
            })
            entry_idx += 1

    # Ensure we hit ~150 entries by adding more for busy months
    while len(rows) < 150:
        worker = random.choice(field_workers)
        role = worker["role"]
        descs = descriptions_by_role.get(role, descriptions_by_role["Ironworker"])
        worker_name = f"{worker['first_name']} {worker['last_name']}"
        month_start, month_end = random.choice(months)
        work_date = random_date_between(month_start, month_end)
        proj_idx = random.choices(range(5), weights=project_weights, k=1)[0]
        hours = random.choice([8, 9, 10, 10, 10, 8])

        rows.append({
            "contact_name":  worker_name,
            "project_name":  PROJECT_NAMES[proj_idx],
            "date":          work_date.isoformat(),
            "hours":         str(hours),
            "description":   random.choice(descs),
        })

    return rows


# =====================================================================
#  11. DAILY LOGS (40)
# =====================================================================
def generate_daily_logs():
    """2 months of daily logs for the 2 busiest projects (LNG, Hospital)."""
    busy_projects = [PROJECT_NAMES[0], PROJECT_NAMES[1]]

    work_descriptions_lng = [
        "Erected 12 columns grid A-D, Level 5. 200-ton crawler crane. Ironworkers: 8, Welders: 4. Wind: 12 mph, clear.",
        "Set 8 W36 beams between grid lines 3-7, Level 4. Bolting crew following. No incidents.",
        "Continued column erection Level 6. Plumbed and braced 6 columns. Crane repositioned mid-shift.",
        "Decking installation Level 3, bays A-F. 14 bundles set. Welders installing shear studs.",
        "Wind delay until 11 AM (sustained 35 mph). Resumed PM - set 4 beams Level 5. 6 hrs productive.",
        "Crane mobilization to east pad. Rigging inspection completed. Set embed plates for Level 7.",
        "Full day steel erection Level 5-6. 16 pieces set. Bolt-up crew 2 levels below. QC spot check passed.",
        "Shake-out and sorting steel delivery #47. 3 trucks. Forklift and tag line crew. All material tagged.",
        "Rain delay - 2 hours AM. Resumed erection Level 6. Set 10 columns. End of day: ahead of schedule.",
        "Erection of moment frame connections Level 4. All CJP welds inspected by third-party. 100% pass rate.",
        "Stair stringer erection bays C-D. Personnel hoist relocated. Safety audit by GC - no findings.",
        "Bracing installation Level 5-6. Horizontal and diagonal braces. Torque verification on all A325 bolts.",
        "Steel delivery delayed 4 hrs (traffic). Crew shifted to bolt-up activities. Recovered by EOD.",
        "Set transfer girders at Level 3 mechanical penthouse. Heavy picks - 15 ton max. Dual crane lift.",
        "Wind shutdown at 2 PM (gusts to 42 mph). Crane boom lowered. Crew demobilized. Safety stand-down.",
        "Completed Level 6 column erection. Started Level 7 prep. Surveyor layout verified grid lines.",
        "Welding day - 12 connections completed Level 4. UT inspection scheduled for tomorrow. No repairs needed.",
        "Decking and stud welding Level 4 complete. Punch list walk with GC PM. 3 minor items noted.",
        "Personnel hoist inspection passed. Erected 8 pieces Level 7. New crane mat installed east side.",
        "Final beams Level 5 set. Topping out ceremony prep. 450 tons erected this week.",
    ]

    work_descriptions_hospital = [
        "Erected 8 columns grid 1-4, Level 12. Tower crane assisting. Ironworkers: 6, Welders: 3.",
        "Beam setting Level 11-12 connection zone. Moment connections per RFI-042 resolution.",
        "Decking installation Level 10. 22 bundles. Shear stud welding following 1 level below.",
        "Column splices Level 11. CJP groove welds. Third-party UT scheduled tomorrow AM.",
        "Wind hold 7-10 AM. Resumed with reduced loads. Set 6 beams Level 12. GC safety walk - clean.",
        "Cantilevered steel at main entrance. Shoring installed below. Complex rigging - 4 tag lines.",
        "Mechanical penthouse steel - heavy sections. 2 crane picks over 20 tons. Completed by 3 PM.",
        "Hospital helipad steel framing Level 15. Special moment frame connections per structural dwg S-501.",
        "Bolt-up crew Level 9-10. Torque wrench calibration verified. 340 bolts tensioned today.",
        "Steel erection paused for concrete pour Level 10. Crew assisted with embed plate placement.",
        "Elevator shaft steel framing. Tight tolerances - 1/4 inch max. Surveyor on-site full day.",
        "Level 13 column erection started. Plumbing wire installed. 10 columns up by EOD.",
        "Brace frame installation Level 11-12. HSS diagonal braces. Field welded gusset plates.",
        "Rain delay until noon. PM shift: welding operations Level 10. 8 connections completed.",
        "Roof steel Level 15 - final tier. Joist and joist girder setting. Bridging installation following.",
        "GC walk-through Level 8-12. Punch list: 5 items (minor paint touch-up, 2 bolt replacements).",
        "UT inspection results: 100% pass rate on 24 CJP welds Level 11. Excellent quality metrics.",
        "Steel stair installation Stair #3 (ground to Level 6). Welded connections at each landing.",
        "Connector team on Level 13. Drifting pins and bolting. High productivity day - 450 bolts.",
        "Curtain wall embed plates Level 12-14. Tight sequence with glazing sub starting next week.",
    ]

    rows = []
    # Generate 20 logs per project across Feb-Mar 2025
    for proj_idx, proj_name in enumerate(busy_projects):
        descs = work_descriptions_lng if proj_idx == 0 else work_descriptions_hospital
        start = date(2025, 2, 3)
        end = date(2025, 3, 31)

        used_dates = set()
        for i in range(20):
            # Pick unique weekday
            for _ in range(50):
                d = random_date_between(start, end)
                if d not in used_dates:
                    used_dates.add(d)
                    break

            weather_options = [
                "Clear, 72F, Wind 8 mph",
                "Clear, 78F, Wind 12 mph",
                "Partly cloudy, 68F, Wind 15 mph",
                "Overcast, 65F, Wind 10 mph",
                "Clear, 82F, Wind 6 mph",
                "Partly cloudy, 74F, Wind 18 mph",
                "Rain AM, clearing PM, 70F",
                "Clear, 85F, Wind 5 mph, high humidity",
                "Wind advisory AM, 32 mph gusts. Calm PM.",
                "Clear, 76F, Wind 9 mph",
            ]

            crew_count = random.randint(10, 18)
            rows.append({
                "project_name": proj_name,
                "log_date":     d.isoformat(),
                "weather":      random.choice(weather_options),
                "crew_count":   str(crew_count),
                "description":  descs[i],
                "created_by":   "",
            })

    return rows


# =====================================================================
#  12. SAFETY — Incidents (10), Inspections (15), Toolbox Talks (20)
# =====================================================================
def generate_safety_incidents():
    """10 safety incidents - steel erection is high-hazard."""
    incidents = [
        ("Near-miss: Falling bolt from Level 12",
         "A325 structural bolt dropped from Level 12 during bolt-up operations. Landed in controlled access zone. No personnel in drop zone. Barricade tape intact.",
         "near_miss", "2025-01-15", PROJECT_NAMES[1]),
        ("Near-miss: Swinging beam during pick",
         "W24x68 beam swung during crane pick due to wind gust. Tag line operator controlled swing. No contact with structure or personnel. Wind at 22 mph.",
         "near_miss", "2025-02-03", PROJECT_NAMES[0]),
        ("Near-miss: Crane boom proximity to power line",
         "Crawler crane boom approached within 15 ft of overhead power line during swing. Operator stopped immediately. Power company called for de-energization.",
         "near_miss", "2025-02-18", PROJECT_NAMES[0]),
        ("Minor: Laceration from steel burr",
         "Ironworker sustained 2-inch laceration on left forearm from sharp steel burr during shake-out. First aid applied on-site. Gloves were being worn but cut through.",
         "minor", "2025-01-22", PROJECT_NAMES[0]),
        ("Minor: Heat exhaustion symptoms",
         "Welder experienced dizziness and nausea during afternoon welding operations. Ambient temp 94F. Removed to shade, given water and electrolytes. Released after 45 min.",
         "minor", "2025-03-28", PROJECT_NAMES[2]),
        ("Minor: Eye irritation from welding flash",
         "Ironworker working adjacent to welding station reported eye irritation. Welding screen had been repositioned by wind. Eyes flushed. Welding screens secured with clamps.",
         "minor", "2025-02-10", PROJECT_NAMES[1]),
        ("Minor: Bruised hand from pinch point",
         "Connector pinched right hand between beam flange and column during connection. Steel-toed gloves prevented fracture. Minor bruising. Returned to work next day.",
         "minor", "2025-03-05", PROJECT_NAMES[0]),
        ("Serious: Fall arrest system engagement",
         "Ironworker lost footing on wet beam flange Level 6. Personal fall arrest system (PFAS) engaged. Worker suspended for 8 minutes before rescue team reached location. No injuries.",
         "major", "2025-03-12", PROJECT_NAMES[0]),
        ("Serious: Crane overload alarm activation",
         "Manitowoc 16000 overload alarm activated during tandem lift of transfer girder. Lift aborted immediately. Load chart reviewed - rigging configuration reduced capacity. Re-rigged and completed safely.",
         "major", "2025-02-25", PROJECT_NAMES[1]),
        ("Near-miss: Column instability during guying",
         "Column showed lateral movement before guying cables were tensioned. Crew evacuated area. Column stabilized with temporary bracing. Engineering review of erection sequence initiated.",
         "near_miss", "2025-04-02", PROJECT_NAMES[3]),
    ]

    rows = []
    for title, desc, severity, inc_date, proj in incidents:
        rows.append({
            "title":          title,
            "description":    desc,
            "severity":       severity,
            "incident_date":  inc_date,
            "project_name":   proj,
        })
    return rows


def generate_safety_inspections(contacts):
    """15 safety inspections - crane inspections, fall protection, rigging, welding."""
    safety_dir = None
    qc_mgr = None
    foremen = []
    for c in contacts:
        if c["role"] == "Safety Director":
            safety_dir = c
        elif c["role"] == "Quality Control Manager":
            qc_mgr = c
        elif c["role"] == "Foreman":
            foremen.append(c)

    def name_of(c):
        return f"{c['first_name']} {c['last_name']}" if c else "Safety Director"

    inspections = [
        # Monthly crane inspections
        ("Monthly Crane Inspection - LR 1300",    "2025-01-10", safety_dir, "pass",   PROJECT_NAMES[0], "All systems functional. Wire rope within tolerance. Load charts posted."),
        ("Monthly Crane Inspection - 16000",      "2025-01-15", safety_dir, "pass",   PROJECT_NAMES[1], "Boom tip sheaves replaced. All other systems within spec."),
        ("Monthly Crane Inspection - LTM 1220",   "2025-02-01", safety_dir, "pass",   PROJECT_NAMES[2], "Outrigger pads inspected. Hydraulic system clean. Load moment indicator calibrated."),
        ("Monthly Crane Inspection - LR 1300",    "2025-02-10", safety_dir, "pass",   PROJECT_NAMES[0], "Anti-two-block device tested. Swing brake adjusted. All clear."),
        ("Monthly Crane Inspection - 16000",      "2025-02-15", safety_dir, "pass",   PROJECT_NAMES[1], "Hoist drum inspected. Wire rope lubricated. Counterweight bolts torqued."),
        ("Monthly Crane Inspection - LR 1300",    "2025-03-10", safety_dir, "fail",   PROJECT_NAMES[0], "Wire rope abrasion exceeds 1/3 diameter on section 4. Replacement ordered. Crane down until replaced."),

        # Fall protection audits
        ("Fall Protection Audit - LNG Site",      "2025-01-20", safety_dir, "pass",   PROJECT_NAMES[0], "All PFAS inspected. 100% tie-off compliance observed. Anchorage points rated 5,000 lbs."),
        ("Fall Protection Audit - Hospital",      "2025-02-20", safety_dir, "pass",   PROJECT_NAMES[1], "Guardrail systems Level 10-12 inspected. 2 cable clips replaced. Perimeter cable tension verified."),
        ("Fall Protection Audit - Arena",         "2025-03-15", foremen[0] if foremen else safety_dir, "pass", PROJECT_NAMES[2], "Retractable SRLs inspected. All harnesses within date. One lanyard replaced - frayed edge."),

        # Rigging gear inspections
        ("Rigging Gear Inspection - Q1",          "2025-01-25", qc_mgr,    "pass",   PROJECT_NAMES[0], "All slings, shackles, and spreader bars inspected. 2 nylon slings removed from service - UV damage."),
        ("Rigging Gear Inspection - Q1",          "2025-01-25", qc_mgr,    "pass",   PROJECT_NAMES[1], "Chain slings and wire rope slings within tolerance. Capacity tags legible."),

        # Welding station checks
        ("Welding Station Safety Check",          "2025-02-05", qc_mgr,    "pass",   PROJECT_NAMES[0], "Fire extinguishers current. Welding screens in place. Ventilation adequate. Hot work permits posted."),
        ("Welding Station Safety Check",          "2025-03-05", qc_mgr,    "pass",   PROJECT_NAMES[1], "Ground fault protection tested. Electrode holders inspected. Cable insulation intact."),

        # General site
        ("OSHA Subpart R Compliance Audit",       "2025-03-01", safety_dir, "pass",   PROJECT_NAMES[0], "Controlled decking zone properly established. Column anchor bolts minimum 4 per OSHA. All beams secured before unhooking."),
        ("GC Joint Safety Inspection",            "2025-04-01", safety_dir, "pass",   PROJECT_NAMES[1], "Joint inspection with Turner safety manager. Housekeeping excellent. Fire watch procedures documented."),
    ]

    rows = []
    for title, insp_date, inspector, status, proj, findings in inspections:
        rows.append({
            "title":          title,
            "inspection_date": insp_date,
            "inspector_name": name_of(inspector),
            "status":         status,
            "project_name":   proj,
            "findings":       findings,
        })
    return rows


def generate_toolbox_talks(contacts):
    """20 toolbox talks - steel erection safety topics."""
    safety_dir = None
    foremen = []
    for c in contacts:
        if c["role"] == "Safety Director":
            safety_dir = c
        elif c["role"] == "Foreman":
            foremen.append(c)

    def name_of(c):
        return f"{c['first_name']} {c['last_name']}" if c else "Safety Director"

    presenters = [safety_dir] + foremen

    talks = [
        ("Steel Erection Safety - OSHA Subpart R Overview",          "2025-01-06", presenters[0], 22, PROJECT_NAMES[0]),
        ("Crane Signal Awareness & Communication",                    "2025-01-08", presenters[1] if len(presenters) > 1 else presenters[0], 18, PROJECT_NAMES[0]),
        ("Fall Protection for Ironworkers - 100% Tie-Off",           "2025-01-13", presenters[0], 24, PROJECT_NAMES[1]),
        ("Bolt-Up Procedures & Torque Verification",                  "2025-01-15", presenters[2] if len(presenters) > 2 else presenters[0], 16, PROJECT_NAMES[1]),
        ("Heat Stress Prevention & Hydration",                        "2025-01-20", presenters[0], 20, PROJECT_NAMES[0]),
        ("Rigging Load Calculations & Sling Angles",                  "2025-01-27", presenters[0], 18, PROJECT_NAMES[0]),
        ("Welding Safety - Eye Protection & Ventilation",            "2025-02-03", presenters[0], 14, PROJECT_NAMES[0]),
        ("OSHA Steel Erection Subpart R - Controlled Decking Zone",  "2025-02-05", presenters[0], 22, PROJECT_NAMES[1]),
        ("Suspended Loads - Never Walk Under",                        "2025-02-10", presenters[1] if len(presenters) > 1 else presenters[0], 20, PROJECT_NAMES[1]),
        ("Column Stability & Temporary Bracing Requirements",         "2025-02-17", presenters[0], 16, PROJECT_NAMES[0]),
        ("Pinch Points & Hand Safety in Steel Connections",           "2025-02-24", presenters[2] if len(presenters) > 2 else presenters[0], 18, PROJECT_NAMES[0]),
        ("Wind Speed Protocols - When to Stop Erection",             "2025-03-03", presenters[0], 24, PROJECT_NAMES[2]),
        ("Personal Fall Arrest System (PFAS) Inspection",            "2025-03-05", presenters[0], 20, PROJECT_NAMES[0]),
        ("Housekeeping on Steel Erection Sites",                      "2025-03-10", presenters[1] if len(presenters) > 1 else presenters[0], 16, PROJECT_NAMES[1]),
        ("Two-Bolt Minimum Connection Rule",                          "2025-03-17", presenters[0], 22, PROJECT_NAMES[0]),
        ("Crane Lift Planning & Critical Lift Review",               "2025-03-24", presenters[0], 15, PROJECT_NAMES[3]),
        ("Electrical Safety - Working Near Overhead Lines",           "2025-03-31", presenters[0], 18, PROJECT_NAMES[0]),
        ("Fire Watch During Welding & Cutting",                      "2025-04-07", presenters[2] if len(presenters) > 2 else presenters[0], 14, PROJECT_NAMES[1]),
        ("Multi-Story Fall Hazards & Floor Hole Covers",             "2025-04-14", presenters[0], 20, PROJECT_NAMES[1]),
        ("Emergency Action Plan Review - Rescue from Heights",       "2025-04-21", presenters[0], 24, PROJECT_NAMES[0]),
    ]

    rows = []
    for title, talk_date, presenter, attendees, proj in talks:
        rows.append({
            "title":          title,
            "talk_date":      talk_date,
            "presenter_name": name_of(presenter),
            "attendee_count": str(attendees),
            "project_name":   proj,
        })
    return rows


# =====================================================================
#  13. CERTIFICATIONS (30)
# =====================================================================
def generate_certifications(contacts):
    """Steel erection requires extensive certs: AWS welder, NCCCO crane, OSHA 30, rigger, etc."""
    welders = [c for c in contacts if c["role"] == "Welder" and c["company_name"] == "IronClad Steel Erectors LLC"]
    operators = [c for c in contacts if c["role"] == "Crane Operator" and c["company_name"] == "IronClad Steel Erectors LLC"]
    ironworkers = [c for c in contacts if c["role"] == "Ironworker" and c["company_name"] == "IronClad Steel Erectors LLC"]
    foremen = [c for c in contacts if c["role"] == "Foreman" and c["company_name"] == "IronClad Steel Erectors LLC"]
    safety = [c for c in contacts if c["role"] == "Safety Director" and c["company_name"] == "IronClad Steel Erectors LLC"]
    qc = [c for c in contacts if c["role"] == "Quality Control Manager" and c["company_name"] == "IronClad Steel Erectors LLC"]

    rows = []
    cert_counter = [0]

    def add_cert(contact, cert_name, cert_prefix, issue_date_str, years_valid):
        cert_counter[0] += 1
        name = f"{contact['first_name']} {contact['last_name']}"
        issue = date.fromisoformat(issue_date_str)
        expiry = date(issue.year + years_valid, issue.month, issue.day)
        cert_num = f"{cert_prefix}-{random.randint(100000, 999999)}"
        status = "active" if expiry > date(2025, 4, 30) else "expired"
        rows.append({
            "contact_name":        name,
            "certification_name":  cert_name,
            "certification_number": cert_num,
            "issue_date":          issue_date_str,
            "expiry_date":         expiry.isoformat(),
            "status":              status,
        })

    # AWS Certified Welder (CWI) - 6 welders
    for w in welders:
        add_cert(w, "AWS Certified Welder (D1.1)", "AWS", f"202{random.randint(2,4)}-{random.randint(1,6):02d}-15", 3)

    # NCCCO Crane Operator - 4 operators
    for op in operators:
        add_cert(op, "NCCCO Crane Operator Certification", "NCCCO", f"202{random.randint(1,3)}-{random.randint(1,12):02d}-01", 5)

    # OSHA 30-Hour Construction - all 25 field workers
    all_field = ironworkers + welders + operators + foremen + safety + qc
    # Only add for those not yet covered, to reach target of ~30 total
    # Add OSHA 30 for ironworkers (10)
    for iw in ironworkers:
        add_cert(iw, "OSHA 30-Hour Construction Safety", "OSHA30", f"202{random.randint(1,4)}-{random.randint(1,12):02d}-10", 5)

    # Ironworker Journeyman Card - 10 ironworkers (but we have 10 OSHA + 10 would be 30 already)
    # Let's be selective to stay around 30
    # Qualified Rigger - 8 people (ironworkers subset + foremen + safety)
    rigger_pool = ironworkers[:5] + foremen + safety
    for person in rigger_pool[:8]:
        add_cert(person, "Qualified Rigger Certification", "QR", f"202{random.randint(2,4)}-{random.randint(1,6):02d}-20", 3)

    # Fall Protection Competent Person - foremen + safety
    fp_pool = foremen + safety
    for person in fp_pool:
        add_cert(person, "Fall Protection Competent Person", "FPCP", f"202{random.randint(2,4)}-{random.randint(1,12):02d}-05", 3)

    # Trim to exactly 30 if over
    if len(rows) > 30:
        rows = rows[:30]

    return rows


# =====================================================================
#  14. INVOICES (~50)
# =====================================================================
def generate_invoices():
    """
    Revenue: ~$42M total via receivable invoices
    Materials: ~$10.5M total via payable invoices

    Structure:
      - 5 OB receivable (gl_account=3010)
      - 5 OB payable (gl_account=3010)
      - 20 monthly receivable (4 months x 5 projects, gl_account=4000, retainage=5%)
      - ~15 monthly payable (steel + hardware, gl_accounts=5000/5010/5020/5030)
    """
    rows = []
    inv_counter = [0]

    def next_inv():
        inv_counter[0] += 1
        return f"IC-{inv_counter[0]:04d}"

    # ── OB Receivable (prior period billings outstanding) ──
    ob_recv = [
        (PROJECT_NAMES[0], "Bechtel",            4500000, "Prior period billing - LNG steel erection"),
        (PROJECT_NAMES[1], "Turner Construction", 3200000, "Prior period billing - hospital steel"),
        (PROJECT_NAMES[2], "AECOM Hunt",          2800000, "Prior period billing - arena steel"),
        (PROJECT_NAMES[3], "Zachry Group",        2100000, "Prior period billing - port crane rail"),
        (PROJECT_NAMES[4], "Turner Construction", 1400000, "Prior period billing - Rice steel"),
    ]
    for proj, client, amt, desc in ob_recv:
        rows.append({
            "invoice_number":  next_inv(),
            "invoice_type":    "receivable",
            "invoice_date":    "2024-12-31",
            "amount":          f"{amt:.2f}",
            "tax_amount":      "0",
            "due_date":        "2025-01-30",
            "description":     desc,
            "status":          "paid",
            "vendor_name":     "",
            "client_name":     client,
            "project_name":    proj,
            "gl_account":      "3010",
            "retainage_pct":   "0",
            "retainage_held":  "0",
        })

    # ── OB Payable (prior period materials outstanding) ──
    ob_pay = [
        ("Nucor Steel",                   800000, "Prior period - structural steel supply"),
        ("Steel Technologies Inc",        650000, "Prior period - fabricated steel"),
        ("Commercial Metals Company",     520000, "Prior period - rebar and misc steel"),
        ("Fastenal",                       380000, "Prior period - bolts and fasteners"),
        ("Lincoln Electric",               250000, "Prior period - welding consumables"),
    ]
    for vendor, amt, desc in ob_pay:
        rows.append({
            "invoice_number":  next_inv(),
            "invoice_type":    "payable",
            "invoice_date":    "2024-12-31",
            "amount":          f"{amt:.2f}",
            "tax_amount":      "0",
            "due_date":        "2025-01-30",
            "description":     desc,
            "status":          "paid",
            "vendor_name":     vendor,
            "client_name":     "",
            "project_name":    PROJECT_NAMES[0],
            "gl_account":      "3010",
            "retainage_pct":   "0",
            "retainage_held":  "0",
        })

    # ── Monthly Receivable (Jan-Apr, 5 projects) ──
    # Total monthly billing ~$3.5M across all projects, ~$14M for Jan-Apr
    # Project allocation by relative size: LNG 33%, Hospital 23%, Arena 17%, Port 16%, Rice 11%
    # Plus OB = 14,000,000: total recv = ~$28M
    # But we need $42M total. The OB already accounts for $14M. So monthly = $28M over 12 months?
    # Actually revenue recognition: the $42M is TOTAL annual revenue.
    # OB receivable = work done prior to 2025, collected in 2025. gl=3010, so no revenue impact.
    # Monthly receivable gl=4000 = current year revenue = $42M
    # So: 12 months x avg $3.5M = $42M. But we only generate 4 months = $14M from invoices.
    # The remaining $28M comes from the year (months 5-12 not generated).
    # Actually for the verification to see $42M revenue, we need all $42M in invoices.
    # Let me reconsider: generate all 12 months of receivable invoices.

    # Project monthly billing rates (annual totals proportional to budget)
    # LNG: $14M budget -> ~$14M annual billing
    # Hospital: $9.5M budget -> ~$9.5M annual billing
    # Arena: $7.2M budget -> ~$7.2M annual billing
    # Port: $6.8M budget -> ~$6.8M annual billing
    # Rice: $4.5M budget -> ~$4.5M annual billing
    # Total: $42M

    project_annual_billing = [14000000, 9500000, 7200000, 6800000, 4500000]

    for proj_idx in range(5):
        annual = project_annual_billing[proj_idx]
        monthly_amts = allocate_to_months(annual, BILLING_WEIGHTS)
        client = PROJECTS[proj_idx]["client_name"]
        proj_name = PROJECT_NAMES[proj_idx]
        proj_code = PROJECTS[proj_idx]["code"]

        for m in range(12):
            amt = monthly_amts[m]
            if amt <= 0:
                continue
            inv_date = date(2025, m + 1, 25)
            due_date = inv_date + timedelta(days=30)
            month_name = MONTH_NAMES[m]

            rows.append({
                "invoice_number":  next_inv(),
                "invoice_type":    "receivable",
                "invoice_date":    inv_date.isoformat(),
                "amount":          f"{amt:.2f}",
                "tax_amount":      "0",
                "due_date":        due_date.isoformat(),
                "description":     f"Steel erection progress billing - {month_name} 2025 - {proj_code}",
                "status":          "paid" if m < 3 else ("sent" if m < 6 else "draft"),
                "vendor_name":     "",
                "client_name":     client,
                "project_name":    proj_name,
                "gl_account":      "4000",
                "retainage_pct":   "5",
                "retainage_held":  f"{amt * 0.05:.2f}",
            })

    # ── Monthly Payable (materials: steel, hardware, decking, consumables) ──
    # Total materials = $10,500,000 annual
    # Split: Structural steel $6.5M, Connection hardware $1.8M, Decking $1.4M, Welding consumables $0.8M
    material_vendors = [
        # (vendor_name, gl_account, annual_amount, descriptions)
        ("Nucor Steel",                  "5000", 3200000, [
            "Structural steel W-shapes delivery",
            "Wide flange beams and columns",
            "HSS sections and angles",
        ]),
        ("Steel Technologies Inc",       "5000", 1800000, [
            "Fabricated steel connections",
            "Pre-welded assemblies",
            "Plate steel and base plates",
        ]),
        ("Commercial Metals Company",    "5000", 1500000, [
            "Steel decking and bar joists",
            "Miscellaneous metals",
            "Structural tubing",
        ]),
        ("Gerdau Ameristeel",            "5020", 1400000, [
            "Composite floor decking",
            "Roof decking bundles",
            "Open web steel joists",
        ]),
        ("Fastenal",                      "5010", 1200000, [
            "A325 structural bolts",
            "A490 high-strength bolts",
            "Nuts, washers, DTI indicators",
        ]),
        ("Portland Bolt & Manufacturing", "5010", 600000, [
            "Anchor bolts and embed hardware",
            "Custom length anchor rods",
        ]),
        ("Lincoln Electric",              "5030", 500000, [
            "Welding electrodes E7018",
            "Flux core wire .045",
            "Welding gas cylinders",
        ]),
        ("Miller Electric Mfg",           "5030", 300000, [
            "Welding leads and accessories",
            "Electrode holders and ground clamps",
        ]),
    ]

    for vendor, gl, annual, descs in material_vendors:
        monthly_amts = allocate_to_months(annual, BILLING_WEIGHTS)
        for m in range(12):
            amt = monthly_amts[m]
            if amt <= 0:
                continue
            inv_date_day = random.randint(5, 20)
            inv_date = date(2025, m + 1, min(inv_date_day, 28))
            due_date = inv_date + timedelta(days=30)
            month_name = MONTH_NAMES[m]

            rows.append({
                "invoice_number":  next_inv(),
                "invoice_type":    "payable",
                "invoice_date":    inv_date.isoformat(),
                "amount":          f"{amt:.2f}",
                "tax_amount":      "0",
                "due_date":        due_date.isoformat(),
                "description":     f"{random.choice(descs)} - {month_name} 2025",
                "status":          "paid" if m < 3 else ("sent" if m < 6 else "draft"),
                "vendor_name":     vendor,
                "client_name":     "",
                "project_name":    random.choice(PROJECT_NAMES),
                "gl_account":      gl,
                "retainage_pct":   "0",
                "retainage_held":  "0",
            })

    return rows


# =====================================================================
#  15. JOURNAL ENTRIES (~150 lines)
# =====================================================================
def generate_journal_entries():
    """
    Pre-crafted JEs for items NOT handled by auto-JE engine:
      - Opening balance
      - Monthly labor (payroll accrual + payment from cash)
      - Monthly equipment costs
      - Monthly overhead
      - Quarterly depreciation
      - Monthly interest

    CRITICAL: NEVER touch 1010, 1020, 2000, 2010 — auto-managed by import engine.

    Financial targets:
      Revenue (invoices):     $42,000,000
      Materials (invoices):   $10,500,000
      Labor (JE):             $19,200,000
      Equipment (JE):         $4,200,000
      Overhead (JE):          $4,000,000
      Depreciation (JE):      $480,000
      Interest (JE):          $120,000
      Total expenses:         $38,500,000
      Net Income:             $3,500,000
    """
    rows = []
    je_counter = [0]

    def add_je(entry_number, je_date, memo, lines, project_name=""):
        """Add a balanced journal entry. lines: [(acct, dr, cr, desc), ...]"""
        total_dr = sum(l[1] for l in lines)
        total_cr = sum(l[2] for l in lines)
        assert abs(total_dr - total_cr) < 0.02, (
            f"JE {entry_number} unbalanced: DR={total_dr:.2f} CR={total_cr:.2f}"
        )
        je_counter[0] += 1
        for acct, dr, cr, desc in lines:
            assert acct not in (1010, 1020, 2000, 2010), (
                f"JE {entry_number} touches auto-managed account {acct}!"
            )
            rows.append({
                "entry_number":   entry_number,
                "date":           je_date,
                "memo":           memo,
                "account_number": str(acct),
                "debit":          fmt(dr),
                "credit":         fmt(cr),
                "description":    desc,
                "project_name":   project_name,
            })

    # ─── JE-OB: Opening Balance (2025-01-01) ─────────────────────────
    # DR: Cash $3,830,000 + Prepaid $480,000 + Equipment $8,400,000 + Vehicles $1,200,000
    # CR: Accum Dep Equip $2,400,000 + Accum Dep Veh $360,000 + Accrued Payroll $1,600,000
    #     + Accrued Exp $400,000 + Sales Tax $120,000 + Equip Financing $2,800,000
    #     + LOC $850,000 + Owners Capital $3,000,000 + Retained Earnings (PLUG)
    # DR total = 3,830,000 + 480,000 + 8,400,000 + 1,200,000 = 13,910,000
    # CR total (excl RE) = 2,400,000 + 360,000 + 1,600,000 + 400,000 + 120,000 + 2,800,000 + 850,000 + 3,000,000 = 11,530,000
    # PLUG (3010 CR) = 13,910,000 - 11,530,000 = 2,380,000

    add_je("JE-OB", "2025-01-01", "Opening balances - IronClad Steel Erectors LLC", [
        (1000,  3830000,        0, "Cash - operating, payroll, equipment reserve"),
        (1040,   480000,        0, "Prepaid insurance & performance bonds"),
        (1100,  8400000,        0, "Equipment & cranes - net book value"),
        (1120,  1200000,        0, "Vehicles - trucks & service vehicles"),
        (1110,        0,  2400000, "Accumulated depreciation - equipment"),
        (1130,        0,   360000, "Accumulated depreciation - vehicles"),
        (2020,        0,  1600000, "Accrued payroll - prior period"),
        (2030,        0,   400000, "Accrued expenses - prior period"),
        (2050,        0,   120000, "Sales tax payable - prior period"),
        (2100,        0,  2800000, "Equipment financing payable"),
        (2200,        0,   850000, "Line of credit balance"),
        (3000,        0,  3000000, "Owners capital"),
        (3010,        0,  2380000, "Retained earnings - opening"),
    ])

    # ─── Monthly Labor (12 months) ─────────────────────────────────
    # Annual: 5100=$9,500,000 5110=$4,000,000 5120=$2,500,000 5130=$3,200,000
    # Total labor = $19,200,000
    # Two-step: DR expense / CR 2020, then DR 2020 / CR 1000
    labor_5100 = allocate_to_months(9500000)
    labor_5110 = allocate_to_months(4000000)
    labor_5120 = allocate_to_months(2500000)
    labor_5130 = allocate_to_months(3200000)

    for m in range(12):
        month_name = MONTH_NAMES[m]
        me = MONTH_ENDS[m]
        je_num_a = f"JE-LAB-{m+1:02d}A"
        je_num_b = f"JE-LAB-{m+1:02d}B"
        total_labor = labor_5100[m] + labor_5110[m] + labor_5120[m] + labor_5130[m]

        # Step 1: Accrue labor
        add_je(je_num_a, me, f"Labor accrual - {month_name} 2025", [
            (5100, labor_5100[m], 0, f"Ironworker labor - {month_name}"),
            (5110, labor_5110[m], 0, f"Welder labor - {month_name}"),
            (5120, labor_5120[m], 0, f"Crane operator labor - {month_name}"),
            (5130, labor_5130[m], 0, f"Labor payroll taxes - {month_name}"),
            (2020, 0, total_labor,   f"Accrued payroll - {month_name}"),
        ])

        # Step 2: Pay from cash
        add_je(je_num_b, me, f"Payroll payment - {month_name} 2025", [
            (2020, total_labor, 0, f"Clear accrued payroll - {month_name}"),
            (1000, 0, total_labor,  f"Cash - payroll payment {month_name}"),
        ])

    # ─── Monthly Equipment Costs (12 months) ──────────────────────
    # Annual: 5200=$2,800,000 5210=$500,000 5220=$400,000 5230=$500,000
    # Total equipment = $4,200,000
    equip_5200 = allocate_to_months(2800000)
    equip_5210 = allocate_to_months(500000)
    equip_5220 = allocate_to_months(400000)
    equip_5230 = allocate_to_months(500000)

    for m in range(12):
        month_name = MONTH_NAMES[m]
        me = MONTH_ENDS[m]
        je_num = f"JE-EQP-{m+1:02d}"
        total_equip = equip_5200[m] + equip_5210[m] + equip_5220[m] + equip_5230[m]

        add_je(je_num, me, f"Equipment costs - {month_name} 2025", [
            (5200, equip_5200[m], 0, f"Crane rental & operations - {month_name}"),
            (5210, equip_5210[m], 0, f"Rigging equipment - {month_name}"),
            (5220, equip_5220[m], 0, f"Welding equipment costs - {month_name}"),
            (5230, equip_5230[m], 0, f"Fuel & lubricants - {month_name}"),
            (1000, 0, total_equip,   f"Cash - equipment costs {month_name}"),
        ])

    # ─── Monthly Overhead (12 months) ─────────────────────────────
    # Annual: 6000=$960,000 6010=$520,000 6020=$296,000 6030=$180,000
    #         6040=$1,440,000 6050=$360,000 6060=$144,000 6070=$100,000
    # Total overhead = $4,000,000
    # Officer/Staff salaries: accrue and pay (same pattern as labor)
    # Other overhead: direct from cash

    oh_6000 = allocate_to_months(960000)
    oh_6010 = allocate_to_months(520000)
    oh_6020 = allocate_to_months(296000)
    oh_6030 = allocate_to_months(180000)
    oh_6040 = allocate_to_months(1440000)
    oh_6050 = allocate_to_months(360000)
    oh_6060 = allocate_to_months(144000)
    oh_6070 = allocate_to_months(100000)

    for m in range(12):
        month_name = MONTH_NAMES[m]
        me = MONTH_ENDS[m]
        je_num = f"JE-OVH-{m+1:02d}"
        total_oh = (oh_6000[m] + oh_6010[m] + oh_6020[m] + oh_6030[m] +
                    oh_6040[m] + oh_6050[m] + oh_6060[m] + oh_6070[m])

        add_je(je_num, me, f"Overhead expenses - {month_name} 2025", [
            (6000, oh_6000[m], 0, f"Officer salaries - {month_name}"),
            (6010, oh_6010[m], 0, f"Office & estimating staff - {month_name}"),
            (6020, oh_6020[m], 0, f"G&A payroll taxes - {month_name}"),
            (6030, oh_6030[m], 0, f"Office rent & utilities - {month_name}"),
            (6040, oh_6040[m], 0, f"Insurance GL & workers comp - {month_name}"),
            (6050, oh_6050[m], 0, f"Bonds & surety - {month_name}"),
            (6060, oh_6060[m], 0, f"Professional services - {month_name}"),
            (6070, oh_6070[m], 0, f"IT & software - {month_name}"),
            (1000, 0, total_oh,   f"Cash - overhead {month_name}"),
        ])

    # ─── Quarterly Depreciation (4 quarters) ──────────────────────
    # Annual: 6100=$400,000 (equipment), 6110=$80,000 (vehicles)
    # Total = $480,000
    dep_6100_q = 400000 / 4  # $100,000 per quarter
    dep_6110_q = 80000 / 4   # $20,000 per quarter

    quarter_ends = [
        ("JE-DEP-Q1", "2025-03-31", "Q1"),
        ("JE-DEP-Q2", "2025-06-30", "Q2"),
        ("JE-DEP-Q3", "2025-09-30", "Q3"),
        ("JE-DEP-Q4", "2025-12-31", "Q4"),
    ]

    for je_num, qe_date, q_label in quarter_ends:
        add_je(je_num, qe_date, f"Depreciation - {q_label} 2025", [
            (6100, dep_6100_q, 0, f"Depreciation - equipment {q_label}"),
            (6110, dep_6110_q, 0, f"Depreciation - vehicles {q_label}"),
            (1110, 0, dep_6100_q,  f"Accum dep equipment {q_label}"),
            (1130, 0, dep_6110_q,  f"Accum dep vehicles {q_label}"),
        ])

    # ─── Monthly Interest (12 months) ─────────────────────────────
    # Annual: 7000=$120,000
    interest_monthly = allocate_to_months(120000)

    for m in range(12):
        month_name = MONTH_NAMES[m]
        me = MONTH_ENDS[m]
        je_num = f"JE-INT-{m+1:02d}"

        add_je(je_num, me, f"Interest expense - {month_name} 2025", [
            (7000, interest_monthly[m], 0, f"Interest on equipment financing & LOC - {month_name}"),
            (1000, 0, interest_monthly[m], f"Cash - interest payment {month_name}"),
        ])

    print(f"  Generated {je_counter[0]} journal entries ({len(rows)} lines)")
    return rows


# =====================================================================
#  MAIN
# =====================================================================
def main():
    print("=" * 70)
    print("IRONCLAD STEEL ERECTORS LLC - SPECIALTY TRADE MOCK DATA")
    print("=" * 70)
    print()

    all_sheets = {}

    # 1. Chart of Accounts
    all_sheets["chart_of_accounts"] = generate_coa()

    # 2. Bank Accounts
    all_sheets["bank_accounts"] = generate_bank_accounts()

    # 3. Projects
    all_sheets["projects"] = generate_projects()

    # 4. Contacts
    contacts = generate_contacts()
    all_sheets["contacts"] = contacts

    # 5. Vendors
    all_sheets["vendors"] = generate_vendors()

    # 6. Equipment
    all_sheets["equipment"] = generate_equipment()

    # 7. Equipment Assignments (depends on contacts)
    all_sheets["equipment_assignments"] = generate_equipment_assignments(contacts)

    # 8. Equipment Maintenance
    all_sheets["equipment_maintenance"] = generate_equipment_maintenance()

    # 9. Contracts
    all_sheets["contracts"] = generate_contracts()

    # 10. Time Entries (depends on contacts)
    all_sheets["time_entries"] = generate_time_entries(contacts)

    # 11. Daily Logs
    all_sheets["daily_logs"] = generate_daily_logs()

    # 12. Safety
    all_sheets["safety_incidents"] = generate_safety_incidents()
    all_sheets["safety_inspections"] = generate_safety_inspections(contacts)
    all_sheets["toolbox_talks"] = generate_toolbox_talks(contacts)

    # 13. Certifications
    all_sheets["certifications"] = generate_certifications(contacts)

    # 14. Invoices
    all_sheets["invoices"] = generate_invoices()

    # 15. Journal Entries
    all_sheets["journal_entries"] = generate_journal_entries()

    # ── Summary ──────────────────────────────────────────────────────
    print()
    total = 0
    for key, data in all_sheets.items():
        print(f"  {key:<30} {len(data):>6} rows")
        total += len(data)
    print(f"  {'TOTAL':<30} {total:>6} rows")

    # ── Verify financials ────────────────────────────────────────────
    account_names = {
        int(row["account_number"]): row["name"]
        for row in all_sheets["chart_of_accounts"]
    }
    verify_financials(
        all_sheets["journal_entries"],
        all_sheets["invoices"],
        target_ni=3500000,
        account_names=account_names,
    )

    # ── Build XLSX ───────────────────────────────────────────────────
    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "IronClad_Steel_Erectors_Import.xlsx",
    )
    print()
    build_xlsx(all_sheets, out_path)
    print("\nDONE!")


if __name__ == "__main__":
    main()
