#!/usr/bin/env python3
"""
Meridian Builders Group LLC — Mock Data Generator
====================================================
General contractor in Atlanta, GA. ~$85M revenue, 4 active projects,
multi-trade subcontractor management.

Financial Targets (FY 2025):
  Revenue:             $85,000,000  (contract revenue — receivable invoices)
  Subcontractor Costs: $42,000,000  (payable invoices to subs)
  Material Costs:      $14,000,000  (payable invoices to suppliers)
  Direct Labor:         $9,000,000  (JE — field $5.4M + supervision $2.4M + tax $1.2M)
  Equipment:            $3,500,000  (JE — rental $2M + fuel/maint $1.5M)
  Overhead:             $6,000,000  (JE — officers, office, insurance, bonding, etc.)
  Depreciation:           $900,000  (JE — quarterly)
  Interest:               $600,000  (JE — construction loans)
  ─────────────────────────────────
  Net Income:           $9,000,000
"""

import sys
import os
import random
import string
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from shared.helpers import (
    MONTHS, MONTH_ENDS, MONTH_NAMES,
    random_phone, random_email, random_date_between, fmt, allocate_to_months,
)
from shared.name_pools import generate_person_name
from shared.xlsx_builder import build_xlsx, verify_financials

random.seed(100)

# ── Output ────────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "Meridian_Builders_Import.xlsx")

# ── Financial Constants ───────────────────────────────────────────────
REVENUE_TOTAL = 85_000_000
SUB_COST_TOTAL = 42_000_000
MATERIAL_COST_TOTAL = 14_000_000
NET_INCOME_TARGET = 9_000_000

# JE-driven costs
FIELD_LABOR = 5_400_000
SUPERVISION_LABOR = 2_400_000
FIELD_PAYROLL_TAX = 1_200_000
EQUIPMENT_RENTAL = 2_000_000
EQUIPMENT_FUEL_MAINT = 1_500_000
OFFICER_SALARIES = 1_200_000
OFFICE_STAFF = 900_000
GA_PAYROLL_TAX = 420_000
OFFICE_RENT = 360_000
INSURANCE_BONDING = 1_800_000
PROFESSIONAL_SERVICES = 480_000
IT_SOFTWARE = 240_000
MARKETING = 180_000
TRAVEL_ENTERTAINMENT = 180_000
UTILITIES_TELEPHONE = 240_000
DEPRECIATION = 900_000
INTEREST_EXPENSE = 600_000

# ── Projects ──────────────────────────────────────────────────────────
PROJECTS = [
    {
        "name": "Peachtree Office Tower",
        "code": "MBG-POT-2024",
        "project_type": "Commercial Office",
        "budget": "28000000",
        "start_date": "2024-02-15",
        "end_date": "2026-01-31",
        "completion_pct": "65",
        "client_name": "Peachtree Partners LLC",
    },
    {
        "name": "Emory Medical Wing Expansion",
        "code": "MBG-EMW-2024",
        "project_type": "Healthcare",
        "budget": "32000000",
        "start_date": "2024-05-01",
        "end_date": "2026-06-30",
        "completion_pct": "50",
        "client_name": "Emory Healthcare",
    },
    {
        "name": "Decatur High School Renovation",
        "code": "MBG-DHS-2025",
        "project_type": "Education",
        "budget": "15000000",
        "start_date": "2025-01-15",
        "end_date": "2025-12-31",
        "completion_pct": "25",
        "client_name": "DeKalb County Schools",
    },
    {
        "name": "Hapeville Distribution Center",
        "code": "MBG-HDC-2025",
        "project_type": "Industrial",
        "budget": "10000000",
        "start_date": "2025-03-01",
        "end_date": "2025-11-30",
        "completion_pct": "15",
        "client_name": "Southeast Logistics Group",
    },
]

# ── Subcontractor Trades ──────────────────────────────────────────────
SUB_TRADES = [
    ("Peach State Electrical", "Electrical", "5300"),
    ("Southeastern Mechanical", "HVAC & Plumbing", "5310"),
    ("Atlanta Steel Erectors", "Structural Steel", "5320"),
    ("Magnolia Concrete Works", "Concrete & Foundations", "5330"),
    ("Capitol Drywall & Ceilings", "Drywall & Framing", "5340"),
    ("Dogwood Fire Protection", "Fire Sprinkler", "5350"),
    ("Piedmont Roofing Systems", "Roofing & Waterproofing", "5360"),
    ("Buckhead Glass & Glazing", "Curtain Wall & Glazing", "5370"),
    ("Heritage Masonry Inc", "Masonry", "5380"),
    ("Southern Elevator Co", "Elevator & Conveyance", "5390"),
    ("Chattahoochee Painting", "Painting & Coatings", "5400"),
    ("Northside Flooring", "Flooring & Tile", "5410"),
]

# ── Material Suppliers ────────────────────────────────────────────────
MATERIAL_VENDORS = [
    ("HD Supply", "General Construction Materials"),
    ("Ferguson Enterprises", "Plumbing & HVAC Supply"),
    ("Graybar Electric", "Electrical Supply"),
    ("US LBM Holdings", "Lumber & Building Materials"),
    ("ABC Supply Co", "Roofing & Siding Materials"),
    ("Builders FirstSource", "Structural Components"),
    ("Fastenal Company", "Fasteners & Safety Supplies"),
    ("Georgia Concrete & Products", "Concrete & Rebar"),
]


# =====================================================================
# 1. CHART OF ACCOUNTS (~50)
# =====================================================================
def generate_chart_of_accounts():
    accounts = [
        # Assets
        ("1000", "Cash - Operating", "asset", "current_asset"),
        ("1005", "Cash - Payroll", "asset", "current_asset"),
        ("1010", "Accounts Receivable", "asset", "current_asset"),
        ("1020", "Retainage Receivable", "asset", "current_asset"),
        ("1030", "Costs in Excess of Billings", "asset", "current_asset"),
        ("1040", "Prepaid Insurance", "asset", "current_asset"),
        ("1050", "Prepaid Expenses", "asset", "current_asset"),
        ("1100", "Construction Equipment", "asset", "fixed_asset"),
        ("1110", "Vehicles", "asset", "fixed_asset"),
        ("1120", "Office Equipment & Furniture", "asset", "fixed_asset"),
        ("1130", "Accumulated Depreciation", "asset", "fixed_asset"),
        # Liabilities
        ("2000", "Accounts Payable", "liability", "current_liability"),
        ("2010", "Retainage Payable", "liability", "current_liability"),
        ("2020", "Billings in Excess of Costs", "liability", "current_liability"),
        ("2030", "Accrued Payroll", "liability", "current_liability"),
        ("2040", "Accrued Expenses", "liability", "current_liability"),
        ("2050", "Sales Tax Payable", "liability", "current_liability"),
        ("2100", "Construction Line of Credit", "liability", "current_liability"),
        ("2110", "Equipment Notes Payable", "liability", "long_term_liability"),
        # Equity
        ("3000", "Members Capital", "equity", "equity"),
        ("3010", "Retained Earnings", "equity", "retained_earnings"),
        # Revenue
        ("4000", "Contract Revenue", "revenue", "operating_revenue"),
        ("4010", "Change Order Revenue", "revenue", "operating_revenue"),
        # Cost of Construction
        ("5000", "Direct Materials", "expense", "cost_of_goods"),
        ("5100", "Field Labor", "expense", "cost_of_goods"),
        ("5110", "Supervision Labor", "expense", "cost_of_goods"),
        ("5120", "Field Payroll Taxes & Benefits", "expense", "cost_of_goods"),
        ("5200", "Equipment Rental", "expense", "cost_of_goods"),
        ("5210", "Equipment Fuel & Maintenance", "expense", "cost_of_goods"),
        ("5300", "Subcontract - Electrical", "expense", "cost_of_goods"),
        ("5310", "Subcontract - Mechanical", "expense", "cost_of_goods"),
        ("5320", "Subcontract - Structural Steel", "expense", "cost_of_goods"),
        ("5330", "Subcontract - Concrete", "expense", "cost_of_goods"),
        ("5340", "Subcontract - Drywall", "expense", "cost_of_goods"),
        ("5350", "Subcontract - Fire Protection", "expense", "cost_of_goods"),
        ("5360", "Subcontract - Roofing", "expense", "cost_of_goods"),
        ("5370", "Subcontract - Glazing", "expense", "cost_of_goods"),
        ("5380", "Subcontract - Masonry", "expense", "cost_of_goods"),
        ("5390", "Subcontract - Elevator", "expense", "cost_of_goods"),
        ("5400", "Subcontract - Painting", "expense", "cost_of_goods"),
        ("5410", "Subcontract - Flooring", "expense", "cost_of_goods"),
        # G&A / Overhead
        ("6000", "Officer Salaries", "expense", "operating_expense"),
        ("6010", "Office Staff Salaries", "expense", "operating_expense"),
        ("6020", "G&A Payroll Taxes", "expense", "operating_expense"),
        ("6030", "Office Rent", "expense", "operating_expense"),
        ("6040", "Insurance & Bonding", "expense", "operating_expense"),
        ("6050", "Professional Services", "expense", "operating_expense"),
        ("6060", "IT & Software", "expense", "operating_expense"),
        ("6070", "Marketing & Business Development", "expense", "operating_expense"),
        ("6080", "Travel & Entertainment", "expense", "operating_expense"),
        ("6090", "Utilities & Telephone", "expense", "operating_expense"),
        ("6100", "Depreciation", "expense", "operating_expense"),
        # Other
        ("7000", "Interest Expense", "expense", "other_expense"),
    ]
    rows = []
    for num, name, atype, sub in accounts:
        rows.append({
            "account_number": num,
            "name": name,
            "account_type": atype,
            "sub_type": sub,
            "description": "",
        })
    return rows, {int(r["account_number"]): r["name"] for r in rows}


# =====================================================================
# 2. BANK ACCOUNTS (4)
# =====================================================================
def generate_bank_accounts():
    return [
        {
            "name": "Operating Account",
            "bank_name": "Truist Bank",
            "account_type": "checking",
            "account_number_last4": "8812",
            "routing_number_last4": "6201",
            "current_balance": "3250000.00",
        },
        {
            "name": "Payroll Account",
            "bank_name": "Truist Bank",
            "account_type": "checking",
            "account_number_last4": "8813",
            "routing_number_last4": "6201",
            "current_balance": "480000.00",
        },
        {
            "name": "Construction Line of Credit",
            "bank_name": "SunTrust / Truist",
            "account_type": "checking",
            "account_number_last4": "2240",
            "routing_number_last4": "6201",
            "current_balance": "2000000.00",
        },
        {
            "name": "Escrow & Retainage",
            "bank_name": "Bank of America",
            "account_type": "savings",
            "account_number_last4": "5590",
            "routing_number_last4": "0530",
            "current_balance": "1200000.00",
        },
    ]


# =====================================================================
# 3. PROJECTS (4)
# =====================================================================
def generate_projects():
    rows = []
    for p in PROJECTS:
        rows.append({
            "name": p["name"],
            "code": p["code"],
            "project_type": p["project_type"],
            "budget": p["budget"],
            "start_date": p["start_date"],
            "end_date": p["end_date"],
            "completion_pct": p["completion_pct"],
            "client_name": p["client_name"],
            "status": "active",
            "city": "Atlanta",
            "state": "GA",
        })
    return rows


# =====================================================================
# 4. CONTACTS (~40)
# =====================================================================
FIELD_ROLES = (
    [("Project Manager", "pm")] * 4
    + [("Superintendent", "super")] * 4
    + [("Assistant Superintendent", "asst_super")] * 4
    + [("Project Engineer", "eng")] * 4
    + [("Foreman", "foreman")] * 6
    + [("Laborer", "laborer")] * 8
    + [("Safety Director", "safety")] * 1
    + [("Quality Control Manager", "qc")] * 1
)

OFFICE_ROLES = [
    ("President / CEO", "ceo"),
    ("VP of Operations", "vp_ops"),
    ("VP of Preconstruction", "vp_precon"),
    ("CFO / Controller", "cfo"),
    ("Office Manager", "office"),
    ("Accounting Manager", "accounting"),
    ("HR Director", "hr"),
    ("Estimator", "estimator"),
]


def generate_contacts():
    used_names = set()
    rows = []
    field_employees = []
    office_employees = []

    for title, tag in FIELD_ROLES:
        first, last = generate_person_name(used_names)
        emp = {
            "first_name": first,
            "last_name": last,
            "email": random_email(first, last, "meridianbuilders.com"),
            "phone": random_phone(),
            "job_title": title,
            "contact_type": "employee",
            "company_name": "Meridian Builders Group LLC",
            "_tag": tag,
        }
        rows.append({k: v for k, v in emp.items() if not k.startswith("_")})
        field_employees.append(emp)

    for title, tag in OFFICE_ROLES:
        first, last = generate_person_name(used_names)
        emp = {
            "first_name": first,
            "last_name": last,
            "email": random_email(first, last, "meridianbuilders.com"),
            "phone": random_phone(),
            "job_title": title,
            "contact_type": "employee",
            "company_name": "Meridian Builders Group LLC",
            "_tag": tag,
        }
        rows.append({k: v for k, v in emp.items() if not k.startswith("_")})
        office_employees.append(emp)

    return rows, field_employees, office_employees


# =====================================================================
# 5. VENDORS (20)
# =====================================================================
def generate_vendors():
    used_names = set()
    rows = []
    all_vendor_list = [(n, s) for n, s, _ in SUB_TRADES] + [(n, s) for n, s in MATERIAL_VENDORS]
    for co, specialty in all_vendor_list:
        first, last = generate_person_name(used_names)
        domain = co.lower().replace(" ", "").replace("&", "")[:16] + ".com"
        rows.append({
            "company_name": co,
            "first_name": first,
            "last_name": last,
            "job_title": "Account Manager",
            "email": random_email(first, last, domain),
            "phone": random_phone(),
        })
    return rows


# =====================================================================
# 6. EQUIPMENT (18)
# =====================================================================
def generate_equipment():
    fleet = [
        ("Tower Crane TC-1", "crane", "Liebherr", "200 EC-H 10", "2020"),
        ("Tower Crane TC-2", "crane", "Potain", "MCT 205", "2021"),
        ("Crawler Excavator", "excavator", "Caterpillar", "330 GC", "2022"),
        ("Backhoe Loader", "backhoe", "John Deere", "310SL", "2021"),
        ("Skid Steer Loader", "loader", "Bobcat", "S770", "2022"),
        ("Telehandler 10K", "telehandler", "JCB", "510-56", "2023"),
        ("Telehandler 12K", "telehandler", "JCB", "512-56", "2021"),
        ("Boom Lift 80ft", "aerial_lift", "JLG", "800S", "2022"),
        ("Boom Lift 60ft", "aerial_lift", "JLG", "600S", "2023"),
        ("Scissor Lift 40ft", "aerial_lift", "Genie", "GS-4047", "2022"),
        ("Concrete Pump Truck", "pump", "Putzmeister", "42Z-Meter", "2020"),
        ("Pickup Truck #1", "vehicle", "Ford", "F-250 Super Duty", "2023"),
        ("Pickup Truck #2", "vehicle", "Ford", "F-250 Super Duty", "2023"),
        ("Pickup Truck #3", "vehicle", "Chevrolet", "Silverado 2500HD", "2022"),
        ("Pickup Truck #4", "vehicle", "Ram", "2500 Tradesman", "2022"),
        ("Flatbed Truck", "vehicle", "Ford", "F-550", "2021"),
        ("Generator 100kW", "generator", "Caterpillar", "XQ100", "2022"),
        ("Generator 60kW", "generator", "Generac", "MDG75DF4", "2023"),
    ]
    rows = []
    for name, etype, make, model, year in fleet:
        serial = "".join(random.choices(string.ascii_uppercase + string.digits, k=12))
        rows.append({
            "name": name,
            "equipment_type": etype,
            "serial_number": serial,
            "make": make,
            "model": model,
            "year": year,
            "purchase_cost": "0",
            "status": "active",
        })
    return rows


# =====================================================================
# 7. PHASES (24 — 6 per project)
# =====================================================================
PHASE_TEMPLATES = [
    ("Preconstruction", "01 00 00"),
    ("Site Work & Foundations", "31 00 00"),
    ("Structural", "03 00 00"),
    ("Building Envelope", "07 00 00"),
    ("MEP Rough-In", "23 00 00"),
    ("Finishes & Closeout", "09 00 00"),
]


def generate_phases():
    rows = []
    for proj in PROJECTS:
        proj_start = date.fromisoformat(proj["start_date"])
        proj_end = date.fromisoformat(proj["end_date"])
        total_days = (proj_end - proj_start).days
        days_per_phase = total_days // len(PHASE_TEMPLATES)

        for i, (phase_name, cost_code) in enumerate(PHASE_TEMPLATES):
            start = proj_start + timedelta(days=i * days_per_phase)
            end = proj_start + timedelta(days=(i + 1) * days_per_phase)
            if i == len(PHASE_TEMPLATES) - 1:
                end = proj_end
            rows.append({
                "name": phase_name,
                "code": cost_code,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "status": "active" if i < 4 else "pending",
                "project_name": proj["name"],
            })
    return rows


# =====================================================================
# 8. TASKS (60 — 15 per project)
# =====================================================================
TASK_TEMPLATES = [
    ("Mobilization & site setup", "01 50 00", 5),
    ("Demolition & site clearing", "02 41 00", 8),
    ("Excavation & earthwork", "31 20 00", 10),
    ("Foundations & footings", "03 30 00", 12),
    ("Structural steel erection", "05 12 00", 15),
    ("Concrete floors & decks", "03 30 00", 12),
    ("Exterior wall framing", "05 40 00", 10),
    ("Roofing & waterproofing", "07 50 00", 8),
    ("Window & curtain wall install", "08 44 00", 10),
    ("Mechanical rough-in", "23 05 00", 15),
    ("Electrical rough-in", "26 05 00", 15),
    ("Plumbing rough-in", "22 05 00", 12),
    ("Drywall & interior finishes", "09 29 00", 12),
    ("Painting & floor coverings", "09 90 00", 8),
    ("Punch list & closeout", "01 77 00", 5),
]


def generate_tasks():
    rows = []
    for proj in PROJECTS:
        proj_start = date.fromisoformat(proj["start_date"])
        proj_end = date.fromisoformat(proj["end_date"])
        total_days = (proj_end - proj_start).days

        running_day = 0
        for name, code, duration_pct in TASK_TEMPLATES:
            dur_days = max(5, int(total_days * duration_pct / 100))
            start = proj_start + timedelta(days=running_day)
            end = start + timedelta(days=dur_days)
            if end > proj_end:
                end = proj_end
            rows.append({
                "name": name,
                "code": code,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "status": "in_progress" if running_day < total_days * 0.5 else "pending",
                "project_name": proj["name"],
                "phase_name": PHASE_TEMPLATES[min(running_day * 6 // total_days, 5)][0],
            })
            running_day += dur_days
    return rows


# =====================================================================
# 9. BUDGET LINES (40 — 10 per project)
# =====================================================================
def generate_budget_lines():
    budget_template = [
        ("General Conditions", "01 00 00", 0.05),
        ("Sitework & Foundations", "31 00 00", 0.12),
        ("Concrete", "03 00 00", 0.10),
        ("Structural Steel", "05 00 00", 0.15),
        ("Electrical", "26 00 00", 0.12),
        ("Mechanical / HVAC", "23 00 00", 0.14),
        ("Plumbing", "22 00 00", 0.08),
        ("Building Envelope", "07 00 00", 0.10),
        ("Interior Finishes", "09 00 00", 0.09),
        ("Contingency", "01 04 00", 0.05),
    ]
    rows = []
    for proj in PROJECTS:
        budget = float(proj["budget"])
        for name, code, pct in budget_template:
            rows.append({
                "description": name,
                "cost_code": code,
                "estimated_amount": fmt(round(budget * pct, 2)),
                "project_name": proj["name"],
            })
    return rows


# =====================================================================
# 10. ESTIMATES (8 — 2 per project)
# =====================================================================
def generate_estimates():
    rows = []
    for i, proj in enumerate(PROJECTS):
        budget = float(proj["budget"])
        rows.append({
            "estimate_number": f"MBG-EST-{i*2+1:03d}",
            "title": f"{proj['name']} — Conceptual Estimate",
            "description": f"Conceptual budget estimate for {proj['name']}",
            "total_amount": fmt(round(budget * 0.95, 2)),
            "status": "approved",
            "estimate_date": (date.fromisoformat(proj["start_date"]) - timedelta(days=90)).isoformat(),
            "project_name": proj["name"],
        })
        rows.append({
            "estimate_number": f"MBG-EST-{i*2+2:03d}",
            "title": f"{proj['name']} — GMP Estimate",
            "description": f"Guaranteed Maximum Price estimate for {proj['name']}",
            "total_amount": fmt(budget),
            "status": "approved",
            "estimate_date": (date.fromisoformat(proj["start_date"]) - timedelta(days=30)).isoformat(),
            "project_name": proj["name"],
        })
    return rows


# =====================================================================
# 11. CERTIFICATIONS (20)
# =====================================================================
def generate_certifications(field_employees):
    rows = []
    pms = [e for e in field_employees if e["_tag"] == "pm"]
    supers = [e for e in field_employees if e["_tag"] == "super"]
    safety = [e for e in field_employees if e["_tag"] == "safety"]
    qc = [e for e in field_employees if e["_tag"] == "qc"]
    foremen = [e for e in field_employees if e["_tag"] == "foreman"]

    # OSHA 30 — supers, safety, foremen (11)
    for emp in supers + safety + foremen:
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "OSHA 30-Hour Construction Safety",
            "cert_type": "certification",
            "issuing_authority": "OSHA Training Institute",
            "cert_number": f"OSHA30-{random.randint(100000,999999)}",
            "issued_date": date(random.randint(2020, 2024), random.randint(1,12), random.randint(1,28)).isoformat(),
            "expiry_date": "",
            "status": "active",
        })

    # PMP — PMs (4)
    for emp in pms:
        issue = date(random.randint(2018, 2023), random.randint(1,12), random.randint(1,28))
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "Project Management Professional (PMP)",
            "cert_type": "certification",
            "issuing_authority": "Project Management Institute",
            "cert_number": f"PMP-{random.randint(100000,999999)}",
            "issued_date": issue.isoformat(),
            "expiry_date": date(issue.year + 3, issue.month, min(issue.day, 28)).isoformat(),
            "status": "active",
        })

    # First Aid/CPR — safety, QC, 2 supers (4)
    for emp in safety + qc + supers[:2]:
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "First Aid / CPR / AED",
            "cert_type": "certification",
            "issuing_authority": "American Red Cross",
            "cert_number": f"FA-{random.randint(10000,99999)}",
            "issued_date": "2024-06-15",
            "expiry_date": "2026-06-15",
            "status": "active",
        })

    # LEED AP — 1 PM (1)
    if pms:
        rows.append({
            "contact_name": f"{pms[0]['first_name']} {pms[0]['last_name']}",
            "cert_name": "LEED AP BD+C",
            "cert_type": "certification",
            "issuing_authority": "US Green Building Council",
            "cert_number": f"LEED-{random.randint(100000,999999)}",
            "issued_date": "2021-03-10",
            "expiry_date": "2027-03-10",
            "status": "active",
        })

    return rows


# =====================================================================
# 12. OPPORTUNITIES (4)
# =====================================================================
def generate_opportunities():
    return [
        {
            "name": "Buckhead Mixed-Use Development",
            "description": "30-story mixed-use with 200 residential units and ground-floor retail. $65M estimated.",
            "estimated_value": "65000000",
            "status": "proposal",
            "probability": "40",
            "expected_close_date": "2025-06-30",
            "client_name": "Buckhead Investment Group",
        },
        {
            "name": "CDC Laboratory Building Renovation",
            "description": "BSL-3 laboratory renovation at CDC headquarters. Federal contract, IDIQ vehicle.",
            "estimated_value": "22000000",
            "status": "qualified",
            "probability": "25",
            "expected_close_date": "2025-09-15",
            "client_name": "US Centers for Disease Control",
        },
        {
            "name": "Hartsfield-Jackson Concourse T Extension",
            "description": "Extension of domestic terminal concourse. 8 new gates, hold rooms, and retail.",
            "estimated_value": "45000000",
            "status": "tracking",
            "probability": "15",
            "expected_close_date": "2026-01-15",
            "client_name": "City of Atlanta - DOA",
        },
        {
            "name": "Georgia Tech Student Center",
            "description": "New 80,000 SF student center with dining, event space, and student org offices.",
            "estimated_value": "28000000",
            "status": "proposal",
            "probability": "50",
            "expected_close_date": "2025-05-01",
            "client_name": "Georgia Institute of Technology",
        },
    ]


# =====================================================================
# 13. BIDS (3)
# =====================================================================
def generate_bids():
    return [
        {
            "bid_number": "MBG-BID-2025-001",
            "title": "Georgia Tech Student Center — GMP Proposal",
            "bid_amount": "28500000",
            "status": "submitted",
            "submission_date": "2025-03-15",
            "description": "GMP proposal for new student center. Includes self-perform concrete and sitework.",
        },
        {
            "bid_number": "MBG-BID-2025-002",
            "title": "Buckhead Mixed-Use — Conceptual Budget",
            "bid_amount": "67000000",
            "status": "draft",
            "submission_date": "",
            "description": "Conceptual budget for mixed-use tower. Pre-qualification phase.",
        },
        {
            "bid_number": "MBG-BID-2025-003",
            "title": "CDC Lab Renovation — Technical Proposal",
            "bid_amount": "23500000",
            "status": "submitted",
            "submission_date": "2025-04-01",
            "description": "Technical proposal for BSL-3 lab renovation. Past performance and key personnel.",
        },
    ]


# =====================================================================
# 14. CONTRACTS (15)
# =====================================================================
def generate_contracts():
    rows = []
    cnum = 1
    # Prime contracts (4 — one per project)
    for proj in PROJECTS:
        rows.append({
            "contract_number": f"MBG-PRIME-{cnum:03d}",
            "title": f"{proj['name']} — Prime Contract",
            "contract_type": "prime",
            "contract_amount": proj["budget"],
            "start_date": proj["start_date"],
            "end_date": proj["end_date"],
            "status": "active",
            "project_name": proj["name"],
            "party_name": proj["client_name"],
            "payment_terms": "AIA G702/G703, Net 30, 10% retainage",
            "scope_of_work": f"General construction services for {proj['name']}",
        })
        cnum += 1

    # Subcontracts (11 — major trades on the two biggest projects)
    big_projects = PROJECTS[:2]
    sub_assignments = [
        (0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5),
        (1, 0), (1, 1), (1, 6), (1, 7), (1, 8),
    ]
    for proj_idx, trade_idx in sub_assignments:
        proj = big_projects[proj_idx]
        trade_name, trade_desc, gl_acct = SUB_TRADES[trade_idx]
        budget = float(proj["budget"])
        sub_pct = random.uniform(0.04, 0.10)
        sub_amount = round(budget * sub_pct, 2)
        rows.append({
            "contract_number": f"MBG-SUB-{cnum:03d}",
            "title": f"{proj['name']} — {trade_desc} Subcontract",
            "contract_type": "subcontract",
            "contract_amount": fmt(sub_amount),
            "start_date": proj["start_date"],
            "end_date": proj["end_date"],
            "status": "active",
            "project_name": proj["name"],
            "party_name": trade_name,
            "payment_terms": "Net 30, 10% retainage",
            "scope_of_work": f"{trade_desc} scope for {proj['name']}",
        })
        cnum += 1
    return rows


# =====================================================================
# 15. DAILY LOGS (50)
# =====================================================================
WEATHER_ATLANTA = [
    ("Clear", "52"), ("Clear", "58"), ("Partly Cloudy", "62"),
    ("Overcast", "55"), ("Rain", "48"), ("Sunny", "68"),
    ("Sunny", "72"), ("Partly Cloudy", "65"), ("Clear", "60"),
    ("Thunderstorms", "70"), ("Foggy", "56"), ("Sunny", "75"),
]

GC_WORK_DESCRIPTIONS = [
    "Concrete pour for level 3 floor deck. 180 CY placed, pump truck on-site. Steel erection continued on grid lines A-F.",
    "Structural steel erection floors 5-6. Tower crane TC-1 operational. Ironworkers completed 22 connections.",
    "Foundation waterproofing and backfill on east elevation. Excavator grading for parking lot base.",
    "MEP rough-in coordination meeting. Electrical and mechanical crews on floors 2-3. No conflicts.",
    "Exterior curtain wall installation started on south elevation. Glazing crew mobilized. 12 panels set.",
    "Interior framing on floors 1-2. Drywall hung in corridor areas. Fire sprinkler branch lines in ceiling space.",
    "Roofing crew completed 8,000 SF of TPO membrane on flat roof section. Flashing at parapet walls.",
    "Masonry veneer installation on north elevation. Scaffold erected to 4th floor height.",
    "Elevator shaft framing and guide rail installation. Pit waterproofing completed and inspected.",
    "Painting crew began primer coat in finished offices. Floor tile layout in lobby area.",
    "Temporary power upgrade for tower crane TC-2. Transformer delivered and placed by crane.",
    "Site concrete — sidewalks and curb cuts at main entrance. ADA ramp formed and poured.",
    "Fire alarm device installation floors 1-3. Testing scheduled for next week.",
    "Plumbing top-out on floors 4-5. Above-ceiling inspection passed by city inspector.",
    "HVAC ductwork installation in mechanical penthouse. 3 RTUs set on roof curbs by crane.",
    "Punch list walk-through with owner's rep. 42 items identified, 15 completed same day.",
]


def generate_daily_logs():
    rows = []
    for proj in PROJECTS[:2]:  # Two busiest projects
        d = date(2025, 1, 6)
        count = 0
        while count < 25 and d <= date(2025, 3, 31):
            if d.weekday() < 5:
                weather, temp = random.choice(WEATHER_ATLANTA)
                work = random.choice(GC_WORK_DESCRIPTIONS)
                rows.append({
                    "log_date": d.isoformat(),
                    "weather_conditions": weather,
                    "temperature": temp,
                    "work_performed": work,
                    "safety_incidents": random.choice(["None"] * 8 + ["Near-miss: unsecured material stack corrected"]),
                    "delays": random.choice(["None"] * 6 + [
                        "Rain delay — 2 hours",
                        "Material delivery late — rebar",
                        "Crane down for maintenance — 3 hours",
                    ]),
                    "project_name": proj["name"],
                    "status": "submitted",
                })
                count += 1
            d += timedelta(days=1)
    rows.sort(key=lambda r: (r["log_date"], r["project_name"]))
    return rows


# =====================================================================
# 16. RFIs (15)
# =====================================================================
def generate_rfis():
    rfi_topics = [
        ("Structural steel connection detail at grid B-4", "05 12 00", "Peachtree Office Tower"),
        ("Concrete floor flatness tolerance — server room", "03 30 00", "Peachtree Office Tower"),
        ("Curtain wall anchor spacing at parapet", "08 44 00", "Peachtree Office Tower"),
        ("Electrical panel location conflict with ductwork", "26 24 00", "Peachtree Office Tower"),
        ("Fire sprinkler head placement in ceiling grid", "21 13 00", "Peachtree Office Tower"),
        ("Waterproofing detail at elevator pit", "07 10 00", "Emory Medical Wing Expansion"),
        ("Medical gas piping routing through fire wall", "22 63 00", "Emory Medical Wing Expansion"),
        ("Clean room HVAC pressure differential spec", "23 81 00", "Emory Medical Wing Expansion"),
        ("Lead abatement scope in existing wall cavities", "02 83 00", "Emory Medical Wing Expansion"),
        ("Patient room headwall rough-in dimensions", "26 27 00", "Emory Medical Wing Expansion"),
        ("Existing foundation condition — classroom wing", "03 10 00", "Decatur High School Renovation"),
        ("ADA ramp slope discrepancy at main entrance", "03 30 00", "Decatur High School Renovation"),
        ("Asbestos abatement sequence with occupied areas", "02 82 00", "Decatur High School Renovation"),
        ("Warehouse slab thickness at dock leveler pits", "03 30 00", "Hapeville Distribution Center"),
        ("Fire suppression system type for high-bay storage", "21 13 00", "Hapeville Distribution Center"),
    ]
    rows = []
    for i, (title, code, proj_name) in enumerate(rfi_topics):
        submit_date = date(2025, 1, 15) + timedelta(days=random.randint(0, 80))
        rows.append({
            "rfi_number": f"MBG-RFI-{i+1:03d}",
            "title": title,
            "description": f"Requesting clarification on {title.lower()}. See attached drawing markup.",
            "status": random.choice(["open", "open", "responded", "responded", "closed"]),
            "priority": random.choice(["normal", "normal", "high", "urgent"]),
            "submitted_date": submit_date.isoformat(),
            "required_date": (submit_date + timedelta(days=14)).isoformat(),
            "project_name": proj_name,
            "cost_code": code,
        })
    return rows


# =====================================================================
# 17. SUBMITTALS (15)
# =====================================================================
def generate_submittals():
    submittal_items = [
        ("Structural steel shop drawings — Floors 1-6", "05 12 00", "Peachtree Office Tower"),
        ("Curtain wall system — mock-up review", "08 44 00", "Peachtree Office Tower"),
        ("Concrete mix design — 5000 PSI", "03 30 00", "Peachtree Office Tower"),
        ("Elevator cab finishes & fixtures", "14 21 00", "Peachtree Office Tower"),
        ("LED light fixtures — Type A/B/C", "26 51 00", "Peachtree Office Tower"),
        ("Fire sprinkler shop drawings", "21 13 00", "Emory Medical Wing Expansion"),
        ("Medical gas system components", "22 63 00", "Emory Medical Wing Expansion"),
        ("HVAC equipment — air handling units", "23 73 00", "Emory Medical Wing Expansion"),
        ("Flooring — vinyl sheet for patient rooms", "09 65 00", "Emory Medical Wing Expansion"),
        ("Epoxy resin flooring — lab areas", "09 67 00", "Emory Medical Wing Expansion"),
        ("Masonry veneer samples & mortar color", "04 21 00", "Decatur High School Renovation"),
        ("Gymnasium floor system — maple hardwood", "09 64 00", "Decatur High School Renovation"),
        ("Roofing TPO membrane & insulation", "07 54 00", "Decatur High School Renovation"),
        ("Pre-engineered metal building system", "13 34 00", "Hapeville Distribution Center"),
        ("Dock levelers & overhead doors", "08 36 00", "Hapeville Distribution Center"),
    ]
    rows = []
    for i, (title, code, proj_name) in enumerate(submittal_items):
        sub_date = date(2025, 1, 10) + timedelta(days=random.randint(0, 70))
        statuses = ["approved", "approved", "approved_as_noted", "revise_resubmit", "pending"]
        rows.append({
            "submittal_number": f"MBG-SUB-{i+1:03d}",
            "title": title,
            "description": f"Submittal for {title.lower()}",
            "status": random.choice(statuses),
            "submitted_date": sub_date.isoformat(),
            "project_name": proj_name,
            "cost_code": code,
        })
    return rows


# =====================================================================
# 18. CHANGE ORDERS (10)
# =====================================================================
def generate_change_orders():
    co_items = [
        ("Additional structural bracing at elevator shaft", "05 12 00", "Peachtree Office Tower", 85000, "cost"),
        ("Owner-requested lobby finish upgrade", "09 00 00", "Peachtree Office Tower", 220000, "owner"),
        ("Unforeseen rock removal at foundations", "31 23 00", "Peachtree Office Tower", 145000, "cost"),
        ("Added isolation room — Emory requirement", "22 00 00", "Emory Medical Wing Expansion", 310000, "owner"),
        ("Asbestos abatement — additional scope", "02 82 00", "Emory Medical Wing Expansion", 175000, "cost"),
        ("Generator upgrade from 500kW to 750kW", "26 32 00", "Emory Medical Wing Expansion", 95000, "owner"),
        ("Gymnasium bleacher spec change", "12 61 00", "Decatur High School Renovation", 68000, "owner"),
        ("Existing CMU wall reinforcement", "04 21 00", "Decatur High School Renovation", 42000, "cost"),
        ("Additional dock door — west elevation", "08 36 00", "Hapeville Distribution Center", 55000, "owner"),
        ("Upgraded fire suppression — ESFR sprinklers", "21 13 00", "Hapeville Distribution Center", 78000, "cost"),
    ]
    rows = []
    for i, (title, code, proj_name, amount, co_type) in enumerate(co_items):
        rows.append({
            "co_number": f"MBG-CO-{i+1:03d}",
            "title": title,
            "description": f"Change order: {title}",
            "amount": fmt(amount),
            "status": "draft",  # draft to prevent auto-JE
            "change_order_type": co_type,
            "project_name": proj_name,
            "cost_code": code,
            "submitted_date": (date(2025, 2, 1) + timedelta(days=random.randint(0, 60))).isoformat(),
        })
    return rows


# =====================================================================
# 19. SAFETY INCIDENTS (8)
# =====================================================================
def generate_safety_incidents():
    return [
        {
            "title": "Worker struck by falling bolt — Tower Crane area",
            "description": "Ironworker struck on hard hat by dropped 3/4\" bolt during steel erection. Hard hat absorbed impact. No injury. Exclusion zone expanded and enforced.",
            "incident_type": "near_miss", "severity": "high",
            "incident_date": "2025-01-15",
            "project_name": "Peachtree Office Tower", "osha_recordable": "no", "status": "closed",
        },
        {
            "title": "Excavation cave-in near-miss",
            "description": "Small soil collapse at edge of excavation. No workers in trench at time. Trench box was 4ft from collapse point. Competent person assessment conducted.",
            "incident_type": "near_miss", "severity": "high",
            "incident_date": "2025-01-28",
            "project_name": "Emory Medical Wing Expansion", "osha_recordable": "no", "status": "closed",
        },
        {
            "title": "Carpenter laceration — table saw",
            "description": "Carpenter sustained 2cm laceration on left index finger from table saw kickback. First aid on-site. Employee returned to modified duty.",
            "incident_type": "injury", "severity": "medium",
            "incident_date": "2025-02-08",
            "project_name": "Decatur High School Renovation", "osha_recordable": "yes", "status": "closed",
        },
        {
            "title": "Forklift tip-over in staging area",
            "description": "Telehandler tipped onto outrigger while lifting steel beam. Operator was belted in cab, no injury. Overload alarm had been disabled — corrective action taken.",
            "incident_type": "property_damage", "severity": "high",
            "incident_date": "2025-02-22",
            "project_name": "Peachtree Office Tower", "osha_recordable": "no", "status": "closed",
        },
        {
            "title": "Heat exhaustion — concrete crew",
            "description": "Two laborers experienced heat exhaustion during afternoon concrete pour. Treated on-site with shade, water, and cold towels. Both recovered fully.",
            "incident_type": "injury", "severity": "medium",
            "incident_date": "2025-03-15",
            "project_name": "Hapeville Distribution Center", "osha_recordable": "no", "status": "closed",
        },
        {
            "title": "Scaffolding plank failure",
            "description": "One plank cracked under load during masonry work. Worker was tied off and did not fall. Plank inspected — dry rot discovered. All planks on-site inspected.",
            "incident_type": "near_miss", "severity": "high",
            "incident_date": "2025-03-22",
            "project_name": "Emory Medical Wing Expansion", "osha_recordable": "no", "status": "reported",
        },
        {
            "title": "Electrical shock — temporary power panel",
            "description": "Electrician received minor shock from temporary power panel with loose ground. Panel de-energized, repaired, and re-inspected by electrical sub.",
            "incident_type": "injury", "severity": "medium",
            "incident_date": "2025-04-02",
            "project_name": "Peachtree Office Tower", "osha_recordable": "no", "status": "reported",
        },
        {
            "title": "Vehicle backing incident — delivery truck",
            "description": "Concrete delivery truck backed into temporary fence during pour. No personnel in area. Fence repaired same day. Spotter protocol reinforced.",
            "incident_type": "property_damage", "severity": "low",
            "incident_date": "2025-04-10",
            "project_name": "Decatur High School Renovation", "osha_recordable": "no", "status": "reported",
        },
    ]


# =====================================================================
# 20. SAFETY INSPECTIONS (12)
# =====================================================================
def generate_safety_inspections(field_employees):
    safety_mgr = [e for e in field_employees if e["_tag"] == "safety"]
    inspector = f"{safety_mgr[0]['first_name']} {safety_mgr[0]['last_name']}" if safety_mgr else "Safety Director"

    inspection_items = [
        ("Fall Protection Compliance Audit", "Harness inspections, guardrail systems, and hole covers verified.", "2 expired harnesses found — removed from service."),
        ("Scaffolding Inspection", "All scaffold erection per OSHA 1926.451. Base plates, planking, and guardrails checked.", "None — all systems compliant."),
        ("Crane & Rigging Safety Check", "Pre-operation inspection logs reviewed. Rigging hardware inspected.", "1 shackle at capacity — replaced with next size up."),
        ("Excavation & Trenching Audit", "Competent person logs, trench box condition, sloping angles verified.", "Spoil pile within 2ft of edge — moved to 5ft minimum."),
        ("Electrical Safety Walkthrough", "GFCI protection, temporary power panel condition, lockout/tagout.", "3 GFCIs failed trip test — replaced immediately."),
        ("Fire Prevention & Egress", "Hot work permits, fire extinguisher placement, egress routes clear.", "1 extinguisher past inspection date — replaced."),
        ("Housekeeping & Material Storage", "Walking surfaces clear, material stacking heights, dumpster placement.", "Wire spool storage area needed reorganization."),
        ("PPE Compliance Check", "Hard hats, safety glasses, hi-vis vests, steel-toe boots verified.", "98% compliance. 1 worker missing hi-vis vest — provided."),
        ("Concrete Operations Safety", "Pump truck setup, pour area barriers, silica dust controls.", "Dust monitors repositioned for better coverage."),
        ("Ladder Safety Inspection", "All ladders tagged and inspected. Setup angles and tie-off verified.", "2 damaged fiberglass ladders removed from service."),
        ("Heavy Equipment Inspection", "Pre-operation checklists, seatbelt use, backup alarms, mirrors.", "Backup alarm on skid steer inaudible — repaired."),
        ("Confined Space Entry Audit", "Permits, atmospheric testing, rescue equipment, attendant logs.", "All entries compliant. New gas monitor calibrated."),
    ]
    rows = []
    for i, (title, findings, actions) in enumerate(inspection_items):
        proj = PROJECTS[i % len(PROJECTS)]
        insp_date = date(2025, 1, 8) + timedelta(days=i * 8)
        rows.append({
            "inspection_type": "site_safety",
            "inspection_date": insp_date.isoformat(),
            "score": str(random.randint(85, 100)),
            "findings": findings,
            "corrective_actions": actions,
            "status": "completed",
            "project_name": proj["name"],
        })
    return rows


# =====================================================================
# 21. TOOLBOX TALKS (15)
# =====================================================================
def generate_toolbox_talks(field_employees):
    foremen = [e for e in field_employees if e["_tag"] == "foreman"]
    safety = [e for e in field_employees if e["_tag"] == "safety"]
    presenters = foremen + safety

    topics = [
        ("Fall Protection — 100% Tie-Off Policy", "Fall Protection", "Review of company 100% tie-off policy. Proper harness donning. Anchor point selection."),
        ("Crane Safety & Signal Communication", "Crane Safety", "Crane hand signals review. Exclusion zones. Load chart awareness for all workers."),
        ("Excavation Safety — Competent Person", "Excavation", "Soil types, protective systems, and competent person responsibilities."),
        ("Heat Illness Prevention", "Environmental", "Hydration requirements, shade breaks, buddy system. Signs of heat stroke vs exhaustion."),
        ("Silica Dust Exposure Controls", "Respiratory", "Wet cutting methods, vacuum attachments, and respiratory protection for concrete/masonry work."),
        ("Housekeeping & Slip/Trip/Fall Prevention", "General Safety", "Clean as you go policy. Material storage. Walking surface maintenance."),
        ("Lockout/Tagout — Electrical Safety", "Electrical Safety", "Energy isolation procedures. Lock placement. Verification testing."),
        ("Scaffolding Safety", "Fall Protection", "Erection/dismantling by qualified persons. Platform loading limits. Access requirements."),
        ("Fire Prevention & Hot Work", "Fire Safety", "Hot work permit process. Fire watch duties. Extinguisher locations."),
        ("Struck-By Hazard Awareness", "General Safety", "Overhead work, falling objects, vehicle traffic. Hard hat and hi-vis requirements."),
        ("Personal Protective Equipment", "PPE", "Required PPE by task. Inspection procedures. Replacement protocols."),
        ("Confined Space Entry", "Confined Space", "Permit process. Atmospheric testing. Rescue plan. Never enter without authorization."),
        ("Back Injury Prevention", "Ergonomics", "Proper lifting techniques. Team lifts. Mechanical aids. Stretch and flex program."),
        ("Concrete Operations Safety", "Concrete", "Chemical burns from wet concrete. Silica exposure. Pump truck setup zones."),
        ("Emergency Action Plan Review", "Emergency", "Evacuation routes. Assembly points. Emergency contacts. First aid station locations."),
    ]
    rows = []
    talk_date = date(2025, 1, 6)
    for i, (title, topic, desc) in enumerate(topics):
        presenter = presenters[i % len(presenters)]
        proj = PROJECTS[i % len(PROJECTS)]
        rows.append({
            "title": title,
            "topic": topic,
            "description": desc,
            "scheduled_date": talk_date.isoformat(),
            "attendees_count": str(random.randint(20, 45)),
            "project_name": proj["name"],
            "status": "completed",
            "notes": f"Presented by {presenter['first_name']} {presenter['last_name']}",
        })
        talk_date += timedelta(days=7)
    return rows


# =====================================================================
# 22. TIME ENTRIES (120)
# =====================================================================
GC_FIELD_TASKS = [
    ("Site layout and surveying", "01 71 00"),
    ("Concrete formwork assembly", "03 10 00"),
    ("Rebar tying and placement", "03 20 00"),
    ("Concrete placement and finishing", "03 30 00"),
    ("Steel connection bolting", "05 12 00"),
    ("Scaffold erection", "01 54 00"),
    ("Material handling and staging", "01 60 00"),
    ("Safety barricade installation", "01 56 00"),
    ("Temporary enclosure setup", "01 54 00"),
    ("Grade checking and compaction testing", "31 20 00"),
    ("Excavation support monitoring", "31 50 00"),
    ("Punch list corrections", "01 77 00"),
    ("Quality inspection rounds", "01 45 00"),
    ("Coordination with subcontractors", "01 31 00"),
    ("Project documentation and photos", "01 33 00"),
]


def generate_time_entries(field_employees):
    rows = []
    workers = [e for e in field_employees if e["_tag"] in ("foreman", "laborer", "super", "asst_super")]
    start = date(2025, 1, 6)
    end = date(2025, 4, 30)

    for _ in range(120):
        worker = random.choice(workers)
        proj = random.choice(PROJECTS)
        work_date = random_date_between(start, end)
        hours = random.choice([8, 8, 8, 8, 9, 9, 10, 10, 6, 7])
        task, code = random.choice(GC_FIELD_TASKS)
        rows.append({
            "contact_name": f"{worker['first_name']} {worker['last_name']}",
            "project_name": proj["name"],
            "entry_date": work_date.isoformat(),
            "hours": str(hours),
            "description": task,
            "cost_code": code,
            "status": "approved",
        })
    rows.sort(key=lambda r: r["entry_date"])
    return rows


# =====================================================================
# 23. EQUIPMENT ASSIGNMENTS (20)
# =====================================================================
def generate_equipment_assignments(equipment_rows):
    rows = []
    # Assign cranes and major equipment to the two biggest projects
    assignments = [
        ("Tower Crane TC-1", "Peachtree Office Tower", "2024-06-01", "2025-12-31"),
        ("Tower Crane TC-2", "Emory Medical Wing Expansion", "2024-09-01", "2026-03-31"),
        ("Boom Lift 80ft", "Peachtree Office Tower", "2025-01-15", "2025-06-30"),
        ("Boom Lift 60ft", "Emory Medical Wing Expansion", "2025-01-15", "2025-08-31"),
        ("Scissor Lift 40ft", "Peachtree Office Tower", "2025-02-01", "2025-09-30"),
        ("Telehandler 10K", "Peachtree Office Tower", "2024-06-01", "2025-10-31"),
        ("Telehandler 12K", "Emory Medical Wing Expansion", "2024-09-01", "2025-12-31"),
        ("Crawler Excavator", "Hapeville Distribution Center", "2025-03-01", "2025-08-31"),
        ("Backhoe Loader", "Decatur High School Renovation", "2025-01-15", "2025-06-30"),
        ("Skid Steer Loader", "Hapeville Distribution Center", "2025-03-01", "2025-09-30"),
        ("Concrete Pump Truck", "Peachtree Office Tower", "2025-01-01", "2025-04-30"),
        ("Concrete Pump Truck", "Emory Medical Wing Expansion", "2025-05-01", "2025-09-30"),
        ("Generator 100kW", "Peachtree Office Tower", "2024-06-01", "2025-12-31"),
        ("Generator 60kW", "Decatur High School Renovation", "2025-01-15", "2025-12-31"),
        ("Pickup Truck #1", "Peachtree Office Tower", "2024-06-01", "2025-12-31"),
        ("Pickup Truck #2", "Emory Medical Wing Expansion", "2024-09-01", "2026-06-30"),
        ("Pickup Truck #3", "Decatur High School Renovation", "2025-01-15", "2025-12-31"),
        ("Pickup Truck #4", "Hapeville Distribution Center", "2025-03-01", "2025-11-30"),
        ("Flatbed Truck", "Peachtree Office Tower", "2025-01-01", "2025-06-30"),
        ("Flatbed Truck", "Emory Medical Wing Expansion", "2025-07-01", "2025-12-31"),
    ]
    for equip_name, proj_name, start, end in assignments:
        rows.append({
            "equipment_name": equip_name,
            "project_name": proj_name,
            "assigned_date": start,
            "return_date": end,
            "status": "active",
        })
    return rows


# =====================================================================
# 24. EQUIPMENT MAINTENANCE (12)
# =====================================================================
def generate_equipment_maintenance():
    maint_items = [
        ("Tower Crane TC-1", "Annual inspection & load test", "2025-01-15", "completed", "0"),
        ("Tower Crane TC-2", "Annual inspection & load test", "2025-02-10", "completed", "0"),
        ("Crawler Excavator", "Hydraulic system service — 500hr", "2025-03-05", "completed", "0"),
        ("Boom Lift 80ft", "Annual certification inspection", "2025-01-22", "completed", "0"),
        ("Boom Lift 60ft", "Annual certification inspection", "2025-01-22", "completed", "0"),
        ("Telehandler 10K", "Engine oil & filter change — 250hr", "2025-02-18", "completed", "0"),
        ("Telehandler 12K", "Brake inspection & adjustment", "2025-03-15", "completed", "0"),
        ("Concrete Pump Truck", "Boom wear pad replacement", "2025-02-28", "completed", "0"),
        ("Generator 100kW", "Fuel system flush & filter replace", "2025-03-20", "completed", "0"),
        ("Pickup Truck #1", "Oil change & tire rotation — 7500mi", "2025-01-10", "completed", "0"),
        ("Pickup Truck #3", "Brake pad replacement", "2025-03-01", "completed", "0"),
        ("Flatbed Truck", "DOT annual safety inspection", "2025-02-05", "completed", "0"),
    ]
    rows = []
    for equip, desc, maint_date, status, cost in maint_items:
        rows.append({
            "equipment_name": equip,
            "maintenance_type": "preventive",
            "description": desc,
            "scheduled_date": maint_date,
            "completed_date": maint_date,
            "status": status,
            "cost": cost,
        })
    return rows


# =====================================================================
# 25. INVOICES (~80)
# =====================================================================
def generate_invoices():
    rows = []

    # ── Opening Balance Receivable (4 — one per project) ──
    ob_recv = [2_800_000, 3_200_000, 0, 0]
    for i, amt in enumerate(ob_recv):
        if amt == 0:
            continue
        rows.append({
            "invoice_number": f"MBG-OB-R{i+1:02d}",
            "invoice_type": "receivable",
            "invoice_date": "2024-12-31",
            "due_date": "2024-12-31",
            "amount": fmt(amt),
            "tax_amount": "",
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
            "status": "paid",
            "description": f"Opening balance — prior progress billing {PROJECTS[i]['name']}",
            "project_name": PROJECTS[i]["name"],
            "client_name": PROJECTS[i]["client_name"],
            "vendor_name": "",
        })

    # ── Opening Balance Payable (3 — prior sub/material) ──
    ob_pay = [1_200_000, 900_000, 600_000]
    ob_pay_vendors = ["Peach State Electrical", "Southeastern Mechanical", "HD Supply"]
    for i, amt in enumerate(ob_pay):
        rows.append({
            "invoice_number": f"MBG-OB-P{i+1:02d}",
            "invoice_type": "payable",
            "invoice_date": "2024-12-31",
            "due_date": "2024-12-31",
            "amount": fmt(amt),
            "tax_amount": "",
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
            "status": "paid",
            "description": f"Opening balance — prior vendor payment #{i+1}",
            "project_name": PROJECTS[i % 2]["name"],
            "client_name": "",
            "vendor_name": ob_pay_vendors[i],
        })

    # ── Monthly Receivable (48 = 12 months x 4 projects) ──
    seasonal = [0.85, 0.85, 0.95, 1.0, 1.1, 1.15, 1.15, 1.1, 1.0, 0.95, 0.85, 0.85]
    sw_sum = sum(seasonal)
    seasonal = [w * 12 / sw_sum for w in seasonal]

    total_budget = sum(float(p["budget"]) for p in PROJECTS)
    recv_running = 0.0
    recv_temp = []

    for m in range(12):
        month_end = MONTH_ENDS[m]
        due_date = MONTH_ENDS[min(m + 1, 11)]
        status = "paid" if m < 10 else "pending"

        for pidx, proj in enumerate(PROJECTS):
            weight = float(proj["budget"]) / total_budget
            base = REVENUE_TOTAL * weight * seasonal[m] / 12
            amount = round(base * random.uniform(0.97, 1.03), 2)
            retainage = round(amount * 0.10, 2)
            recv_running += amount
            recv_temp.append({
                "invoice_number": f"MBG-{month_end[:7].replace('-','')}-R{pidx+1:02d}",
                "invoice_type": "receivable",
                "invoice_date": month_end,
                "due_date": due_date,
                "amount": amount,
                "gl_account": "4000",
                "retainage_pct": "10",
                "retainage_held": retainage,
                "status": status,
                "description": f"Progress billing — {proj['name']} — {MONTH_NAMES[m]}",
                "project_name": proj["name"],
                "client_name": proj["client_name"],
            })

    # Adjust last to hit exact revenue
    diff = REVENUE_TOTAL - recv_running
    recv_temp[-1]["amount"] = round(recv_temp[-1]["amount"] + diff, 2)
    recv_temp[-1]["retainage_held"] = round(recv_temp[-1]["amount"] * 0.10, 2)

    for r in recv_temp:
        rows.append({
            "invoice_number": r["invoice_number"],
            "invoice_type": r["invoice_type"],
            "invoice_date": r["invoice_date"],
            "due_date": r["due_date"],
            "amount": fmt(r["amount"]),
            "tax_amount": "",
            "gl_account": r["gl_account"],
            "retainage_pct": r["retainage_pct"],
            "retainage_held": fmt(r["retainage_held"]),
            "status": r["status"],
            "description": r["description"],
            "project_name": r["project_name"],
            "client_name": r["client_name"],
            "vendor_name": "",
        })

    recv_total = sum(r["amount"] for r in recv_temp)

    # ── Monthly Subcontractor Payables ──
    # $42M across 12 months, distributed to sub trades
    sub_running = 0.0
    sub_temp = []
    active_subs = SUB_TRADES[:8]  # 8 most active subs

    for m in range(12):
        inv_date = f"2025-{MONTHS[m]}-25"
        due_date = MONTH_ENDS[m]
        status = "paid" if m < 10 else "pending"

        month_sub_total = SUB_COST_TOTAL * seasonal[m] / 12
        shares = [random.uniform(0.8, 1.2) for _ in active_subs]
        share_sum = sum(shares)

        for sidx, (sub_name, sub_desc, gl_acct) in enumerate(active_subs):
            amount = round(month_sub_total * shares[sidx] / share_sum, 2)
            sub_running += amount
            sub_temp.append({
                "invoice_number": f"MBG-{MONTHS[m]}-S{sidx+1:02d}",
                "invoice_type": "payable",
                "invoice_date": inv_date,
                "due_date": due_date,
                "amount": amount,
                "gl_account": gl_acct,
                "retainage_pct": "10",
                "retainage_held": round(amount * 0.10, 2),
                "status": status,
                "description": f"{sub_desc} — {MONTH_NAMES[m]}",
                "project_name": PROJECTS[m % len(PROJECTS)]["name"],
                "vendor_name": sub_name,
            })

    # Adjust last sub invoice
    diff = SUB_COST_TOTAL - sub_running
    sub_temp[-1]["amount"] = round(sub_temp[-1]["amount"] + diff, 2)
    sub_temp[-1]["retainage_held"] = round(sub_temp[-1]["amount"] * 0.10, 2)

    for r in sub_temp:
        rows.append({
            "invoice_number": r["invoice_number"],
            "invoice_type": r["invoice_type"],
            "invoice_date": r["invoice_date"],
            "due_date": r["due_date"],
            "amount": fmt(r["amount"]),
            "tax_amount": "",
            "gl_account": r["gl_account"],
            "retainage_pct": r["retainage_pct"],
            "retainage_held": fmt(r["retainage_held"]),
            "status": r["status"],
            "description": r["description"],
            "project_name": r["project_name"],
            "client_name": "",
            "vendor_name": r["vendor_name"],
        })

    # ── Monthly Material Payables ──
    # $14M across 12 months, 4 material vendors
    mat_running = 0.0
    mat_temp = []

    material_gl_map = {
        "HD Supply": "5000",
        "Ferguson Enterprises": "5000",
        "Graybar Electric": "5000",
        "US LBM Holdings": "5000",
    }
    mat_vendors_list = list(material_gl_map.keys())

    for m in range(12):
        inv_date = f"2025-{MONTHS[m]}-15"
        due_date = MONTH_ENDS[m]
        status = "paid" if m < 10 else "pending"

        month_mat = MATERIAL_COST_TOTAL / 12
        shares = [random.uniform(0.8, 1.2) for _ in mat_vendors_list]
        share_sum = sum(shares)

        for vidx, vendor in enumerate(mat_vendors_list):
            amount = round(month_mat * shares[vidx] / share_sum, 2)
            mat_running += amount
            mat_temp.append({
                "invoice_number": f"MBG-{MONTHS[m]}-M{vidx+1:02d}",
                "invoice_type": "payable",
                "invoice_date": inv_date,
                "due_date": due_date,
                "amount": amount,
                "gl_account": material_gl_map[vendor],
                "retainage_pct": "0",
                "retainage_held": "0",
                "status": status,
                "description": f"Construction materials — {MONTH_NAMES[m]}",
                "project_name": PROJECTS[m % len(PROJECTS)]["name"],
                "vendor_name": vendor,
            })

    # Adjust last material invoice
    diff = MATERIAL_COST_TOTAL - mat_running
    mat_temp[-1]["amount"] = round(mat_temp[-1]["amount"] + diff, 2)

    for r in mat_temp:
        rows.append({
            "invoice_number": r["invoice_number"],
            "invoice_type": r["invoice_type"],
            "invoice_date": r["invoice_date"],
            "due_date": r["due_date"],
            "amount": fmt(r["amount"]),
            "tax_amount": "",
            "gl_account": r["gl_account"],
            "retainage_pct": r["retainage_pct"],
            "retainage_held": r["retainage_held"],
            "status": r["status"],
            "description": r["description"],
            "project_name": r["project_name"],
            "client_name": "",
            "vendor_name": r["vendor_name"],
        })

    sub_total = sum(r["amount"] for r in sub_temp)
    mat_total = sum(r["amount"] for r in mat_temp)

    print(f"\n  Invoice totals:")
    print(f"    Receivable:     ${recv_total:,.2f}")
    print(f"    Payable (subs): ${sub_total:,.2f}")
    print(f"    Payable (mats): ${mat_total:,.2f}")

    return rows


# =====================================================================
# 26. JOURNAL ENTRIES (~250 lines)
# =====================================================================
def generate_journal_entries():
    rows = []

    def add_je(entry_number, entry_date, description, lines):
        for acct, dr, cr, line_desc in lines:
            rows.append({
                "entry_number": entry_number,
                "entry_date": entry_date,
                "description": description,
                "account_number": str(acct),
                "debit": fmt(dr),
                "credit": fmt(cr),
                "line_description": line_desc,
                "status": "posted",
            })

    # ── Opening Balances ──
    ob_cash = 6_930_000
    ob_prepaid_ins = 900_000
    ob_prepaid_other = 350_000
    ob_equip = 4_200_000
    ob_vehicles = 1_600_000
    ob_office_equip = 280_000
    ob_accum_dep = 1_800_000

    ob_billings_excess = 600_000
    ob_accrued_payroll = 1_200_000
    ob_accrued_exp = 450_000
    ob_loc = 2_000_000
    ob_equip_notes = 1_400_000

    ob_members_cap = 2_000_000

    total_dr = ob_cash + ob_prepaid_ins + ob_prepaid_other + ob_equip + ob_vehicles + ob_office_equip
    total_cr = ob_accum_dep + ob_billings_excess + ob_accrued_payroll + ob_accrued_exp + ob_loc + ob_equip_notes + ob_members_cap
    ob_re = total_dr - total_cr

    add_je("MBG-OB-001", "2025-01-01", "Opening Balances — Meridian Builders Group", [
        (1000, ob_cash, 0, "Cash - Operating"),
        (1040, ob_prepaid_ins, 0, "Prepaid insurance & bonding"),
        (1050, ob_prepaid_other, 0, "Prepaid expenses"),
        (1100, ob_equip, 0, "Construction equipment at cost"),
        (1110, ob_vehicles, 0, "Vehicles at cost"),
        (1120, ob_office_equip, 0, "Office equipment & furniture"),
        (1130, 0, ob_accum_dep, "Accumulated depreciation"),
        (2020, 0, ob_billings_excess, "Billings in excess of costs"),
        (2030, 0, ob_accrued_payroll, "Accrued payroll"),
        (2040, 0, ob_accrued_exp, "Accrued expenses"),
        (2100, 0, ob_loc, "Construction line of credit"),
        (2110, 0, ob_equip_notes, "Equipment notes payable"),
        (3000, 0, ob_members_cap, "Members capital"),
        (3010, 0, ob_re, "Retained earnings — plug"),
    ])

    # ── Monthly JEs (12 months) ──
    seasonal = [0.85, 0.85, 0.95, 1.0, 1.1, 1.15, 1.15, 1.1, 1.0, 0.95, 0.85, 0.85]
    sw_sum = sum(seasonal)
    seasonal = [w * 12 / sw_sum for w in seasonal]

    m_5100 = allocate_to_months(FIELD_LABOR, seasonal)
    m_5110 = allocate_to_months(SUPERVISION_LABOR, seasonal)
    m_5120 = allocate_to_months(FIELD_PAYROLL_TAX, seasonal)
    m_5200 = allocate_to_months(EQUIPMENT_RENTAL, seasonal)
    m_5210 = allocate_to_months(EQUIPMENT_FUEL_MAINT, seasonal)
    m_6000 = allocate_to_months(OFFICER_SALARIES)
    m_6010 = allocate_to_months(OFFICE_STAFF)
    m_6020 = allocate_to_months(GA_PAYROLL_TAX)
    m_6030 = allocate_to_months(OFFICE_RENT)
    m_6040 = allocate_to_months(INSURANCE_BONDING)
    m_6050 = allocate_to_months(PROFESSIONAL_SERVICES)
    m_6060 = allocate_to_months(IT_SOFTWARE)
    m_6070 = allocate_to_months(MARKETING)
    m_6080 = allocate_to_months(TRAVEL_ENTERTAINMENT)
    m_6090 = allocate_to_months(UTILITIES_TELEPHONE)
    m_7000 = allocate_to_months(INTEREST_EXPENSE)

    quarterly_dep = round(DEPRECIATION / 4, 2)

    for m in range(12):
        me = MONTH_ENDS[m]
        mn = MONTH_NAMES[m]

        # Payroll accrual
        payroll_total = m_5100[m] + m_5110[m] + m_5120[m] + m_6000[m] + m_6010[m] + m_6020[m]
        add_je(f"MBG-PAY-{MONTHS[m]}", me, f"Payroll accrual — {mn} 2025", [
            (5100, m_5100[m], 0, f"Field labor {mn}"),
            (5110, m_5110[m], 0, f"Supervision labor {mn}"),
            (5120, m_5120[m], 0, f"Field payroll taxes {mn}"),
            (6000, m_6000[m], 0, f"Officer salaries {mn}"),
            (6010, m_6010[m], 0, f"Office staff {mn}"),
            (6020, m_6020[m], 0, f"G&A payroll taxes {mn}"),
            (2030, 0, payroll_total, f"Accrued payroll {mn}"),
        ])

        # Payroll disbursement
        add_je(f"MBG-PDIS-{MONTHS[m]}", me, f"Payroll disbursement — {mn} 2025", [
            (2030, payroll_total, 0, f"Clear accrued payroll {mn}"),
            (1000, 0, payroll_total, f"Cash - payroll {mn}"),
        ])

        # Equipment costs
        equip_total = m_5200[m] + m_5210[m]
        add_je(f"MBG-EQ-{MONTHS[m]}", me, f"Equipment costs — {mn} 2025", [
            (5200, m_5200[m], 0, f"Equipment rental {mn}"),
            (5210, m_5210[m], 0, f"Equipment fuel & maintenance {mn}"),
            (1000, 0, equip_total, f"Cash - equipment costs {mn}"),
        ])

        # Overhead
        oh_total = m_6030[m] + m_6040[m] + m_6050[m] + m_6060[m] + m_6070[m] + m_6080[m] + m_6090[m]
        add_je(f"MBG-OH-{MONTHS[m]}", me, f"Overhead expenses — {mn} 2025", [
            (6030, m_6030[m], 0, f"Office rent {mn}"),
            (6040, m_6040[m], 0, f"Insurance & bonding {mn}"),
            (6050, m_6050[m], 0, f"Professional services {mn}"),
            (6060, m_6060[m], 0, f"IT & software {mn}"),
            (6070, m_6070[m], 0, f"Marketing {mn}"),
            (6080, m_6080[m], 0, f"Travel & entertainment {mn}"),
            (6090, m_6090[m], 0, f"Utilities & telephone {mn}"),
            (1000, 0, oh_total, f"Cash - overhead {mn}"),
        ])

        # Interest
        add_je(f"MBG-INT-{MONTHS[m]}", me, f"Interest expense — {mn} 2025", [
            (7000, m_7000[m], 0, f"Interest on LOC & equipment notes {mn}"),
            (1000, 0, m_7000[m], f"Cash - interest {mn}"),
        ])

        # Depreciation (quarterly)
        if m in (2, 5, 8, 11):
            qtr = {2: "Q1", 5: "Q2", 8: "Q3", 11: "Q4"}[m]
            dep = quarterly_dep if m != 11 else DEPRECIATION - quarterly_dep * 3
            add_je(f"MBG-DEP-{qtr}", me, f"Depreciation — {qtr} 2025", [
                (6100, dep, 0, f"Depreciation {qtr}"),
                (1130, 0, dep, f"Accumulated depreciation {qtr}"),
            ])

    return rows


# =====================================================================
# MAIN
# =====================================================================
def main():
    print("=" * 70)
    print("Meridian Builders Group LLC — Mock Data Generator")
    print("=" * 70)

    coa, account_names = generate_chart_of_accounts()
    banks = generate_bank_accounts()
    projects = generate_projects()
    contacts, field_emp, office_emp = generate_contacts()
    vendors = generate_vendors()
    equipment = generate_equipment()
    phases = generate_phases()
    tasks = generate_tasks()
    budget_lines = generate_budget_lines()
    estimates = generate_estimates()
    certs = generate_certifications(field_emp)
    opps = generate_opportunities()
    bids = generate_bids()
    contracts = generate_contracts()
    daily_logs = generate_daily_logs()
    rfis = generate_rfis()
    submittals = generate_submittals()
    change_orders = generate_change_orders()
    safety_incidents = generate_safety_incidents()
    safety_inspections = generate_safety_inspections(field_emp)
    toolbox_talks = generate_toolbox_talks(field_emp)
    time_entries = generate_time_entries(field_emp)
    equip_assignments = generate_equipment_assignments(equipment)
    equip_maintenance = generate_equipment_maintenance()
    invoices = generate_invoices()
    jes = generate_journal_entries()

    all_sheets = {
        "chart_of_accounts": coa,
        "bank_accounts": banks,
        "projects": projects,
        "contacts": contacts,
        "vendors": vendors,
        "equipment": equipment,
        "phases": phases,
        "tasks": tasks,
        "budget_lines": budget_lines,
        "estimates": estimates,
        "certifications": certs,
        "opportunities": opps,
        "bids": bids,
        "contracts": contracts,
        "daily_logs": daily_logs,
        "rfis": rfis,
        "submittals": submittals,
        "change_orders": change_orders,
        "safety_incidents": safety_incidents,
        "safety_inspections": safety_inspections,
        "toolbox_talks": toolbox_talks,
        "time_entries": time_entries,
        "equipment_assignments": equip_assignments,
        "equipment_maintenance": equip_maintenance,
        "invoices": invoices,
        "journal_entries": jes,
    }

    total = sum(len(v) for v in all_sheets.values())
    print(f"\nGenerating {total} total rows across {len(all_sheets)} sheets...\n")

    build_xlsx(all_sheets, OUTPUT_FILE)

    verify_financials(jes, invoices, target_ni=NET_INCOME_TARGET, account_names=account_names)

    print(f"\nDone! Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
