#!/usr/bin/env python3
"""
Harborview Development Partners — Mock Data Generator
======================================================
Real estate developer in San Diego, CA. Mixed portfolio:
construction projects + stabilized rental properties.

Financial Targets (FY 2025):
  Construction Revenue: $32,000,000  (3 projects — receivable invoices)
  Rental Income:         $8,000,000  (2 properties — receivable invoices)
  Property Sales:        $5,000,000  (townhome closings — receivable invoices)
  ──────────────────────────────────
  Total Revenue:        $45,000,000

  Subcontractor Costs:  $16,000,000  (payable invoices)
  Material Costs:        $6,000,000  (payable invoices)
  Property Expenses:     $4,500,000  (payable invoices — maintenance, utilities, mgmt)
  Direct Labor:          $5,400,000  (JE — field + supervision + tax)
  Equipment:             $2,100,000  (JE — rental + fuel)
  G&A / Overhead:        $5,500,000  (JE — officers, office, insurance, etc.)
  Depreciation:            $700,000  (JE — quarterly)
  Interest:              $1,300,000  (JE — construction loans)
  ──────────────────────────────────
  Net Income:            $3,500,000
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

random.seed(200)

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "Harborview_Development_Import.xlsx")

# ── Financial Constants ───────────────────────────────────────────────
CONSTRUCTION_REVENUE = 32_000_000
RENTAL_INCOME = 8_000_000
PROPERTY_SALES = 5_000_000
REVENUE_TOTAL = CONSTRUCTION_REVENUE + RENTAL_INCOME + PROPERTY_SALES  # $45M

SUB_COST_TOTAL = 16_000_000
MATERIAL_COST_TOTAL = 6_000_000
PROPERTY_EXPENSE_TOTAL = 4_500_000

# JE-driven costs
FIELD_LABOR = 3_200_000
SUPERVISION_LABOR = 1_400_000
FIELD_PAYROLL_TAX = 800_000
EQUIP_RENTAL = 1_400_000
EQUIP_FUEL = 700_000
OFFICER_SALARIES = 1_500_000
OFFICE_STAFF = 720_000
GA_PAYROLL_TAX = 444_000
OFFICE_RENT = 420_000
INSURANCE_BONDING = 1_200_000
PROFESSIONAL_SERVICES = 360_000
IT_SOFTWARE = 180_000
MARKETING = 300_000
TRAVEL = 156_000
UTILITIES_TEL = 220_000
DEPRECIATION = 700_000
INTEREST_EXPENSE = 1_300_000

NET_INCOME_TARGET = 3_500_000

# ── Projects ──────────────────────────────────────────────────────────
PROJECTS = [
    {
        "name": "Harbor Point Mixed-Use Tower",
        "code": "HDP-HPT-2024",
        "project_type": "Mixed-Use",
        "budget": "18000000",
        "start_date": "2024-03-01",
        "end_date": "2026-03-31",
        "completion_pct": "55",
        "client_name": "Harborview Development Partners",
    },
    {
        "name": "Pacific Crest Townhomes",
        "code": "HDP-PCT-2024",
        "project_type": "Residential",
        "budget": "8000000",
        "start_date": "2024-06-15",
        "end_date": "2025-09-30",
        "completion_pct": "70",
        "client_name": "Harborview Development Partners",
    },
    {
        "name": "La Jolla Retail Center",
        "code": "HDP-LJR-2025",
        "project_type": "Retail",
        "budget": "6000000",
        "start_date": "2025-01-15",
        "end_date": "2025-12-31",
        "completion_pct": "20",
        "client_name": "Harborview Development Partners",
    },
]

# ── Properties ────────────────────────────────────────────────────────
PROPERTIES = [
    {
        "name": "Coronado Bay Apartments",
        "address": "1250 Orange Ave",
        "city": "Coronado",
        "state": "CA",
        "zip_code": "92118",
        "property_type": "residential",
        "units": 200,
        "year_built": "2018",
        "purchase_price": "52000000",
    },
    {
        "name": "Gaslamp Quarter Retail",
        "address": "540 Fifth Ave",
        "city": "San Diego",
        "state": "CA",
        "zip_code": "92101",
        "property_type": "commercial",
        "units": 15,
        "year_built": "2015",
        "purchase_price": "18000000",
    },
]

SUB_TRADES = [
    ("SoCal Concrete Works", "Concrete & Foundations", "5300"),
    ("Pacific Structural Steel", "Structural Steel", "5310"),
    ("Bay Electrical Systems", "Electrical", "5320"),
    ("Coastal Mechanical", "HVAC & Plumbing", "5330"),
    ("Del Mar Drywall", "Drywall & Framing", "5340"),
    ("Sunset Fire Protection", "Fire Sprinkler", "5350"),
]

MATERIAL_VENDORS = [
    ("HD Supply", "General Materials"),
    ("Ferguson Enterprises", "Plumbing Supply"),
    ("Graybar Electric", "Electrical Supply"),
    ("US LBM Holdings", "Lumber & Building"),
]


# =====================================================================
# 1. CHART OF ACCOUNTS (~55)
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
        ("1060", "Security Deposits Receivable", "asset", "current_asset"),
        ("1100", "Construction Equipment", "asset", "fixed_asset"),
        ("1110", "Vehicles", "asset", "fixed_asset"),
        ("1120", "Office Equipment", "asset", "fixed_asset"),
        ("1130", "Accumulated Depreciation", "asset", "fixed_asset"),
        ("1200", "Land - Held for Development", "asset", "fixed_asset"),
        ("1210", "Construction in Progress", "asset", "fixed_asset"),
        ("1220", "Rental Property - Buildings", "asset", "fixed_asset"),
        ("1230", "Accum Depreciation - Rental", "asset", "fixed_asset"),
        # Liabilities
        ("2000", "Accounts Payable", "liability", "current_liability"),
        ("2010", "Retainage Payable", "liability", "current_liability"),
        ("2020", "Accrued Payroll", "liability", "current_liability"),
        ("2030", "Accrued Expenses", "liability", "current_liability"),
        ("2040", "Security Deposits Held", "liability", "current_liability"),
        ("2050", "Prepaid Rent", "liability", "current_liability"),
        ("2100", "Construction Loan - Mixed Use", "liability", "long_term_liability"),
        ("2110", "Construction Loan - Townhomes", "liability", "long_term_liability"),
        ("2120", "Mortgage - Coronado Apts", "liability", "long_term_liability"),
        ("2130", "Mortgage - Gaslamp Retail", "liability", "long_term_liability"),
        ("2200", "Line of Credit", "liability", "current_liability"),
        # Equity
        ("3000", "Partners Capital", "equity", "equity"),
        ("3010", "Retained Earnings", "equity", "retained_earnings"),
        # Revenue
        ("4000", "Contract Revenue - Construction", "revenue", "operating_revenue"),
        ("4010", "Rental Income - Residential", "revenue", "operating_revenue"),
        ("4020", "Rental Income - Commercial", "revenue", "operating_revenue"),
        ("4030", "Property Sales Revenue", "revenue", "operating_revenue"),
        ("4040", "Change Order Revenue", "revenue", "operating_revenue"),
        ("4050", "CAM Reimbursements", "revenue", "operating_revenue"),
        # Cost of Construction
        ("5000", "Direct Materials", "expense", "cost_of_goods"),
        ("5100", "Field Labor", "expense", "cost_of_goods"),
        ("5110", "Supervision Labor", "expense", "cost_of_goods"),
        ("5120", "Field Payroll Taxes", "expense", "cost_of_goods"),
        ("5200", "Equipment Rental", "expense", "cost_of_goods"),
        ("5210", "Equipment Fuel & Maint", "expense", "cost_of_goods"),
        ("5300", "Subcontract - Concrete", "expense", "cost_of_goods"),
        ("5310", "Subcontract - Steel", "expense", "cost_of_goods"),
        ("5320", "Subcontract - Electrical", "expense", "cost_of_goods"),
        ("5330", "Subcontract - Mechanical", "expense", "cost_of_goods"),
        ("5340", "Subcontract - Drywall", "expense", "cost_of_goods"),
        ("5350", "Subcontract - Fire Protection", "expense", "cost_of_goods"),
        # Property Operating Expenses
        ("5500", "Property Maintenance", "expense", "cost_of_goods"),
        ("5510", "Property Utilities", "expense", "cost_of_goods"),
        ("5520", "Property Management Fees", "expense", "cost_of_goods"),
        ("5530", "Property Insurance", "expense", "cost_of_goods"),
        ("5540", "Property Taxes", "expense", "cost_of_goods"),
        # G&A
        ("6000", "Officer Salaries", "expense", "operating_expense"),
        ("6010", "Office Staff Salaries", "expense", "operating_expense"),
        ("6020", "G&A Payroll Taxes", "expense", "operating_expense"),
        ("6030", "Office Rent", "expense", "operating_expense"),
        ("6040", "Insurance & Bonding", "expense", "operating_expense"),
        ("6050", "Professional Services", "expense", "operating_expense"),
        ("6060", "IT & Software", "expense", "operating_expense"),
        ("6070", "Marketing & Brokerage", "expense", "operating_expense"),
        ("6080", "Travel", "expense", "operating_expense"),
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
        {"name": "Operating Account", "bank_name": "First Republic Bank",
         "account_type": "checking", "account_number_last4": "3310",
         "routing_number_last4": "1200", "current_balance": "4500000.00"},
        {"name": "Payroll Account", "bank_name": "First Republic Bank",
         "account_type": "checking", "account_number_last4": "3311",
         "routing_number_last4": "1200", "current_balance": "320000.00"},
        {"name": "Construction Escrow", "bank_name": "Bank of America",
         "account_type": "savings", "account_number_last4": "7790",
         "routing_number_last4": "0650", "current_balance": "2200000.00"},
        {"name": "Property Revenue Account", "bank_name": "Chase",
         "account_type": "checking", "account_number_last4": "4451",
         "routing_number_last4": "3220", "current_balance": "850000.00"},
    ]


# =====================================================================
# 3. PROPERTIES (2)
# =====================================================================
def generate_properties():
    rows = []
    for p in PROPERTIES:
        rows.append({
            "name": p["name"],
            "address": p["address"],
            "city": p["city"],
            "state": p["state"],
            "zip_code": p["zip_code"],
            "property_type": p["property_type"],
            "total_units": str(p["units"]),
            "year_built": p["year_built"],
            "purchase_price": p["purchase_price"],
            "status": "active",
        })
    return rows


# =====================================================================
# 4. UNITS (~215)
# =====================================================================
def generate_units():
    rows = []
    # Coronado Bay — 200 residential units
    unit_types = [
        ("Studio", 450, 1850, 60),
        ("1BR", 650, 2250, 80),
        ("2BR", 950, 2950, 50),
        ("3BR", 1200, 3450, 10),
    ]
    unit_num = 100
    for utype, sqft, rent, count in unit_types:
        for i in range(count):
            unit_num += 1
            floor = (unit_num - 100) // 20 + 1
            rows.append({
                "unit_number": str(unit_num),
                "property_name": "Coronado Bay Apartments",
                "unit_type": utype,
                "square_footage": str(sqft + random.randint(-20, 20)),
                "bedrooms": str({"Studio": 0, "1BR": 1, "2BR": 2, "3BR": 3}[utype]),
                "bathrooms": str({"Studio": 1, "1BR": 1, "2BR": 2, "3BR": 2}[utype]),
                "monthly_rent": str(rent + random.randint(-50, 50)),
                "status": random.choices(["occupied", "vacant"], weights=[92, 8], k=1)[0],
                "floor": str(floor),
            })

    # Gaslamp Retail — 15 commercial units
    for i in range(15):
        sqft = random.randint(800, 3500)
        rent = round(sqft * random.uniform(3.5, 5.5), 0)
        rows.append({
            "unit_number": f"R{i+1:02d}",
            "property_name": "Gaslamp Quarter Retail",
            "unit_type": "Retail",
            "square_footage": str(sqft),
            "bedrooms": "0",
            "bathrooms": "1",
            "monthly_rent": str(int(rent)),
            "status": random.choices(["occupied", "vacant"], weights=[87, 13], k=1)[0],
            "floor": "1",
        })
    return rows


# =====================================================================
# 5. PROJECTS (3)
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
            "city": "San Diego",
            "state": "CA",
        })
    return rows


# =====================================================================
# 6. CONTACTS (~35)
# =====================================================================
def generate_contacts():
    used_names = set()
    rows = []
    field_emp = []

    field_roles = (
        [("Project Manager", "pm")] * 3
        + [("Superintendent", "super")] * 3
        + [("Project Engineer", "eng")] * 3
        + [("Foreman", "foreman")] * 4
        + [("Laborer", "laborer")] * 5
        + [("Safety Manager", "safety")] * 1
    )
    for title, tag in field_roles:
        first, last = generate_person_name(used_names)
        emp = {
            "first_name": first, "last_name": last,
            "email": random_email(first, last, "harborviewdev.com"),
            "phone": random_phone(), "job_title": title,
            "contact_type": "employee",
            "company_name": "Harborview Development Partners",
            "_tag": tag,
        }
        rows.append({k: v for k, v in emp.items() if not k.startswith("_")})
        field_emp.append(emp)

    office_roles = [
        ("Managing Partner", "ceo"), ("VP Development", "vp"),
        ("VP Construction", "vp_con"), ("CFO", "cfo"),
        ("Property Manager", "prop_mgr"), ("Leasing Manager", "leasing"),
        ("Accounting Manager", "acct"), ("Office Admin", "admin"),
    ]
    for title, tag in office_roles:
        first, last = generate_person_name(used_names)
        emp = {
            "first_name": first, "last_name": last,
            "email": random_email(first, last, "harborviewdev.com"),
            "phone": random_phone(), "job_title": title,
            "contact_type": "employee",
            "company_name": "Harborview Development Partners",
            "_tag": tag,
        }
        rows.append({k: v for k, v in emp.items() if not k.startswith("_")})

    # External contacts (architects, etc.)
    external = [
        ("WATG Architecture", "Principal Architect"),
        ("Deloitte", "External Auditor"),
        ("CBRE", "Leasing Broker"),
        ("Colliers", "Investment Sales"),
        ("JLL", "Property Management Advisor"),
        ("City of San Diego", "Building Inspector"),
        ("CalFire Marshal", "Fire Plan Reviewer"),
        ("San Diego Gas & Electric", "Utility Coordinator"),
    ]
    for co, title in external:
        first, last = generate_person_name(used_names)
        rows.append({
            "first_name": first, "last_name": last,
            "email": random_email(first, last, co.lower().replace(" ", "")[:12] + ".com"),
            "phone": random_phone(), "job_title": title,
            "contact_type": "subcontractor",
            "company_name": co,
        })

    return rows, field_emp


# =====================================================================
# 7. VENDORS (~18)
# =====================================================================
def generate_vendors():
    used_names = set()
    rows = []
    all_vendors = (
        [(n, s) for n, s, _ in SUB_TRADES]
        + [(n, s) for n, s in MATERIAL_VENDORS]
        + [
            ("Pacific Property Services", "Property Maintenance"),
            ("SD Landscaping & Grounds", "Landscaping"),
            ("CleanPro Commercial", "Janitorial Services"),
            ("Pacific Elevator Service", "Elevator Maintenance"),
            ("Coastal Pest Control", "Pest Control"),
            ("Mission Bay Pool Service", "Pool Maintenance"),
            ("San Diego Waste Mgmt", "Waste Removal"),
            ("Pacific Lock & Key", "Security & Access"),
        ]
    )
    for co, specialty in all_vendors:
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
# 8. EQUIPMENT (10)
# =====================================================================
def generate_equipment():
    fleet = [
        ("Tower Crane TC-1", "crane", "Potain", "MCT 185", "2021"),
        ("Crawler Excavator", "excavator", "Caterpillar", "320 GC", "2022"),
        ("Telehandler", "telehandler", "JCB", "510-56", "2023"),
        ("Boom Lift 60ft", "aerial_lift", "JLG", "600S", "2022"),
        ("Scissor Lift 32ft", "aerial_lift", "Genie", "GS-3246", "2023"),
        ("Skid Steer", "loader", "Bobcat", "S650", "2022"),
        ("Concrete Pump", "pump", "Putzmeister", "36Z-Meter", "2021"),
        ("Pickup Truck #1", "vehicle", "Ford", "F-250", "2023"),
        ("Pickup Truck #2", "vehicle", "Toyota", "Tundra", "2023"),
        ("Generator 50kW", "generator", "Generac", "MDG50DF4", "2022"),
    ]
    rows = []
    for name, etype, make, model, year in fleet:
        serial = "".join(random.choices(string.ascii_uppercase + string.digits, k=12))
        rows.append({
            "name": name, "equipment_type": etype,
            "serial_number": serial, "make": make,
            "model": model, "year": year,
            "purchase_cost": "0", "status": "active",
        })
    return rows


# =====================================================================
# 9. PHASES (18 — 6 per project)
# =====================================================================
def generate_phases():
    templates = [
        ("Preconstruction & Permitting", "01 00 00"),
        ("Site Work & Foundations", "31 00 00"),
        ("Structural Frame", "03 00 00"),
        ("Building Envelope", "07 00 00"),
        ("MEP Rough-In", "23 00 00"),
        ("Finishes & Closeout", "09 00 00"),
    ]
    rows = []
    for proj in PROJECTS:
        ps = date.fromisoformat(proj["start_date"])
        pe = date.fromisoformat(proj["end_date"])
        td = (pe - ps).days
        dpp = td // len(templates)
        for i, (name, code) in enumerate(templates):
            s = ps + timedelta(days=i * dpp)
            e = ps + timedelta(days=(i + 1) * dpp) if i < len(templates) - 1 else pe
            rows.append({
                "name": name, "code": code,
                "start_date": s.isoformat(), "end_date": e.isoformat(),
                "status": "active" if i < 3 else "pending",
                "project_name": proj["name"],
            })
    return rows


# =====================================================================
# 10. TASKS (45 — 15 per project)
# =====================================================================
def generate_tasks():
    task_list = [
        ("Mobilization & permits", "01 50 00", 4),
        ("Site clearing & grading", "31 10 00", 6),
        ("Excavation & shoring", "31 20 00", 8),
        ("Foundations & footings", "03 30 00", 10),
        ("Structural steel/concrete", "03 00 00", 14),
        ("Floor slabs", "03 30 00", 10),
        ("Exterior walls", "07 40 00", 8),
        ("Roofing", "07 50 00", 6),
        ("Windows & glazing", "08 50 00", 7),
        ("Mechanical rough-in", "23 05 00", 10),
        ("Electrical rough-in", "26 05 00", 10),
        ("Plumbing rough-in", "22 05 00", 8),
        ("Interior finishes", "09 00 00", 10),
        ("Landscaping & site work", "32 00 00", 5),
        ("Punch list & closeout", "01 77 00", 4),
    ]
    rows = []
    for proj in PROJECTS:
        ps = date.fromisoformat(proj["start_date"])
        pe = date.fromisoformat(proj["end_date"])
        td = (pe - ps).days
        rd = 0
        for name, code, pct in task_list:
            dur = max(5, int(td * pct / 100))
            s = ps + timedelta(days=rd)
            e = min(s + timedelta(days=dur), pe)
            rows.append({
                "name": name, "code": code,
                "start_date": s.isoformat(), "end_date": e.isoformat(),
                "status": "in_progress" if rd < td * 0.5 else "pending",
                "project_name": proj["name"],
            })
            rd += dur
    return rows


# =====================================================================
# 11. BUDGET LINES (30 — 10 per project)
# =====================================================================
def generate_budget_lines():
    tmpl = [
        ("General Conditions", "01 00 00", 0.05),
        ("Sitework", "31 00 00", 0.10),
        ("Concrete", "03 00 00", 0.12),
        ("Structural", "05 00 00", 0.14),
        ("Electrical", "26 00 00", 0.11),
        ("Mechanical", "23 00 00", 0.13),
        ("Plumbing", "22 00 00", 0.08),
        ("Envelope", "07 00 00", 0.10),
        ("Interiors", "09 00 00", 0.12),
        ("Contingency", "01 04 00", 0.05),
    ]
    rows = []
    for proj in PROJECTS:
        b = float(proj["budget"])
        for name, code, pct in tmpl:
            rows.append({
                "description": name, "cost_code": code,
                "estimated_amount": fmt(round(b * pct, 2)),
                "project_name": proj["name"],
            })
    return rows


# =====================================================================
# 12. CERTIFICATIONS (15)
# =====================================================================
def generate_certifications(field_emp):
    rows = []
    pms = [e for e in field_emp if e["_tag"] == "pm"]
    supers = [e for e in field_emp if e["_tag"] == "super"]
    safety = [e for e in field_emp if e["_tag"] == "safety"]
    foremen = [e for e in field_emp if e["_tag"] == "foreman"]

    for emp in supers + safety + foremen:
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "OSHA 30-Hour Construction Safety",
            "cert_type": "certification",
            "issuing_authority": "OSHA Training Institute",
            "cert_number": f"OSHA30-{random.randint(100000,999999)}",
            "issued_date": date(random.randint(2020,2024), random.randint(1,12), random.randint(1,28)).isoformat(),
            "expiry_date": "",
            "status": "active",
        })
    for emp in pms[:2]:
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "LEED AP BD+C",
            "cert_type": "certification",
            "issuing_authority": "US Green Building Council",
            "cert_number": f"LEED-{random.randint(100000,999999)}",
            "issued_date": "2022-05-15",
            "expiry_date": "2028-05-15",
            "status": "active",
        })
    for emp in safety:
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "First Aid / CPR / AED",
            "cert_type": "certification",
            "issuing_authority": "American Red Cross",
            "cert_number": f"FA-{random.randint(10000,99999)}",
            "issued_date": "2024-08-10",
            "expiry_date": "2026-08-10",
            "status": "active",
        })
    return rows


# =====================================================================
# 13. OPPORTUNITIES (3)
# =====================================================================
def generate_opportunities():
    return [
        {"name": "Mission Valley Workforce Housing", "description": "180-unit affordable housing development. City subsidy available.",
         "estimated_value": "38000000", "status": "proposal", "probability": "40", "expected_close_date": "2025-08-01", "client_name": "City of San Diego Housing Authority"},
        {"name": "Carlsbad Coastal Resort", "description": "120-key boutique hotel on PCH. Entitlement in progress.",
         "estimated_value": "52000000", "status": "qualified", "probability": "25", "expected_close_date": "2026-01-15", "client_name": "Coastal Hospitality Group"},
        {"name": "Oceanside Industrial Park", "description": "4-building light industrial/flex space campus. Pre-leased 60%.",
         "estimated_value": "24000000", "status": "tracking", "probability": "20", "expected_close_date": "2025-12-01", "client_name": "Harborview Development Partners"},
    ]


# =====================================================================
# 14. BIDS (2)
# =====================================================================
def generate_bids():
    return [
        {"bid_number": "HDP-BID-2025-001", "title": "Mission Valley Workforce Housing — Development Proposal",
         "bid_amount": "39500000", "status": "submitted", "submission_date": "2025-03-01",
         "description": "Full development proposal including financing plan, design concept, and construction timeline."},
        {"bid_number": "HDP-BID-2025-002", "title": "Oceanside Industrial — Investment Memo",
         "bid_amount": "25000000", "status": "draft", "submission_date": "",
         "description": "Investment committee memo with pro forma, market analysis, and risk assessment."},
    ]


# =====================================================================
# 15. CONTRACTS (12)
# =====================================================================
def generate_contracts():
    rows = []
    cn = 1
    for proj in PROJECTS:
        rows.append({
            "contract_number": f"HDP-DEV-{cn:03d}",
            "title": f"{proj['name']} — Development Agreement",
            "contract_type": "prime",
            "contract_amount": proj["budget"],
            "start_date": proj["start_date"],
            "end_date": proj["end_date"],
            "status": "active",
            "project_name": proj["name"],
            "party_name": proj["client_name"],
            "payment_terms": "Monthly draw, Net 30, 10% retainage",
            "scope_of_work": f"Full development and construction for {proj['name']}",
        })
        cn += 1
    # Sub contracts
    sub_assignments = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (1, 2), (1, 4), (2, 0), (2, 2)]
    for pidx, tidx in sub_assignments:
        proj = PROJECTS[pidx]
        sn, sd, gl = SUB_TRADES[tidx]
        amt = round(float(proj["budget"]) * random.uniform(0.04, 0.09), 2)
        rows.append({
            "contract_number": f"HDP-SUB-{cn:03d}",
            "title": f"{proj['name']} — {sd}",
            "contract_type": "subcontract",
            "contract_amount": fmt(amt),
            "start_date": proj["start_date"],
            "end_date": proj["end_date"],
            "status": "active",
            "project_name": proj["name"],
            "party_name": sn,
            "payment_terms": "Net 30, 10% retainage",
            "scope_of_work": f"{sd} for {proj['name']}",
        })
        cn += 1
    return rows


# =====================================================================
# 16. LEASES (~180)
# =====================================================================
def generate_leases(unit_rows):
    rows = []
    for u in unit_rows:
        if u["status"] != "occupied":
            continue
        lease_start = date(2024, random.randint(1, 12), random.randint(1, 28))
        if u["property_name"] == "Gaslamp Quarter Retail":
            lease_months = random.choice([36, 60])
        else:
            lease_months = 12
        lease_end = date(lease_start.year + lease_months // 12,
                         min(lease_start.month + lease_months % 12, 12),
                         min(lease_start.day, 28))
        if lease_end.year > 2026:
            lease_end = date(2026, lease_end.month, lease_end.day)

        first, last = generate_person_name()
        rows.append({
            "tenant_name": f"{first} {last}",
            "unit_number": u["unit_number"],
            "property_name": u["property_name"],
            "lease_start": lease_start.isoformat(),
            "lease_end": lease_end.isoformat(),
            "monthly_rent": u["monthly_rent"],
            "security_deposit": str(int(float(u["monthly_rent"]) * 1.5)),
            "status": "active",
        })
    return rows


# =====================================================================
# 17. MAINTENANCE (20)
# =====================================================================
def generate_maintenance():
    items = [
        ("HVAC filter replacement — Building A", "Coronado Bay Apartments", "preventive", "completed", "350.00"),
        ("Water heater replacement — Unit 145", "Coronado Bay Apartments", "corrective", "completed", "1200.00"),
        ("Elevator annual inspection", "Coronado Bay Apartments", "preventive", "completed", "2800.00"),
        ("Parking lot restriping", "Coronado Bay Apartments", "preventive", "completed", "4500.00"),
        ("Pool pump motor replacement", "Coronado Bay Apartments", "corrective", "completed", "1800.00"),
        ("Roof leak repair — Building C", "Coronado Bay Apartments", "corrective", "completed", "2200.00"),
        ("Fire alarm system test", "Coronado Bay Apartments", "preventive", "completed", "900.00"),
        ("Landscape irrigation repair", "Coronado Bay Apartments", "corrective", "completed", "650.00"),
        ("Exterior paint touch-up — Bldg B", "Coronado Bay Apartments", "preventive", "scheduled", "3500.00"),
        ("Gym equipment maintenance", "Coronado Bay Apartments", "preventive", "completed", "450.00"),
        ("Gate access system update", "Coronado Bay Apartments", "corrective", "completed", "1100.00"),
        ("Plumbing drain clearing — multiple units", "Coronado Bay Apartments", "corrective", "completed", "800.00"),
        ("Storefront glass replacement — R03", "Gaslamp Quarter Retail", "corrective", "completed", "1500.00"),
        ("HVAC rooftop unit service", "Gaslamp Quarter Retail", "preventive", "completed", "2400.00"),
        ("Grease trap cleaning — R07 restaurant", "Gaslamp Quarter Retail", "preventive", "completed", "350.00"),
        ("Sidewalk pressure washing", "Gaslamp Quarter Retail", "preventive", "completed", "600.00"),
        ("Emergency exit lighting replacement", "Gaslamp Quarter Retail", "corrective", "completed", "450.00"),
        ("Fire suppression system inspection", "Gaslamp Quarter Retail", "preventive", "completed", "1200.00"),
        ("Parking structure crack sealing", "Gaslamp Quarter Retail", "preventive", "scheduled", "3200.00"),
        ("ADA ramp repair — main entrance", "Gaslamp Quarter Retail", "corrective", "completed", "1800.00"),
    ]
    rows = []
    for i, (desc, prop, mtype, status, cost) in enumerate(items):
        d = date(2025, 1, 5) + timedelta(days=i * 5)
        rows.append({
            "title": desc,
            "description": desc,
            "property_name": prop,
            "maintenance_type": mtype,
            "status": status,
            "scheduled_date": d.isoformat(),
            "completed_date": d.isoformat() if status == "completed" else "",
            "cost": "0",  # avoid auto-JE
        })
    return rows


# =====================================================================
# 18. PROPERTY EXPENSES (15)
# =====================================================================
def generate_property_expenses():
    expenses = [
        ("Coronado Bay Apartments", "Water & sewer — Q1", "5510", 32000),
        ("Coronado Bay Apartments", "Electricity — common areas Q1", "5510", 18000),
        ("Coronado Bay Apartments", "Gas — heating Q1", "5510", 8500),
        ("Coronado Bay Apartments", "Property management fee — Q1", "5520", 42000),
        ("Coronado Bay Apartments", "Property insurance — annual", "5530", 65000),
        ("Coronado Bay Apartments", "Property taxes — 1st half", "5540", 156000),
        ("Coronado Bay Apartments", "Landscaping service — Q1", "5500", 9000),
        ("Coronado Bay Apartments", "Janitorial — Q1", "5500", 12000),
        ("Coronado Bay Apartments", "Pest control — Q1", "5500", 2400),
        ("Gaslamp Quarter Retail", "Water & sewer — Q1", "5510", 8200),
        ("Gaslamp Quarter Retail", "Electricity — common Q1", "5510", 6500),
        ("Gaslamp Quarter Retail", "Property management — Q1", "5520", 15000),
        ("Gaslamp Quarter Retail", "Property insurance — annual", "5530", 28000),
        ("Gaslamp Quarter Retail", "Property taxes — 1st half", "5540", 72000),
        ("Gaslamp Quarter Retail", "CAM reconciliation — Q1", "5500", 5400),
    ]
    rows = []
    for prop, desc, gl, amt in expenses:
        rows.append({
            "property_name": prop,
            "description": desc,
            "expense_date": "2025-03-31",
            "amount": fmt(amt),
            "category": "operating",
            "gl_account": gl,
        })
    return rows


# =====================================================================
# 19. DAILY LOGS (40)
# =====================================================================
def generate_daily_logs():
    weather = [
        ("Clear", "68"), ("Sunny", "72"), ("Partly Cloudy", "65"),
        ("Marine Layer", "62"), ("Sunny", "75"), ("Clear", "70"),
    ]
    descs = [
        "Concrete pour for level 4 floor slab. 150 CY placed. Pump truck on-site all day.",
        "Structural steel erection continued. 18 pieces set today. Tower crane TC-1 operational.",
        "Exterior framing on south elevation. Waterproofing membrane applied at foundation walls.",
        "MEP coordination meeting. Resolved duct/pipe clash at corridor ceiling level 3.",
        "Curtain wall mock-up panel installed for architect review. Weather seal testing tomorrow.",
        "Townhome framing — units 1-4 framing complete. Roof trusses delivered and staged.",
        "Foundation excavation for retail center. Soil conditions per geotech report. No surprises.",
        "Underground utilities — storm drain and sewer connections at street.",
        "Drywall hanging in completed residential units. Taping crew follows in 2 days.",
        "Final grade and paving prep for parking area. Base course compaction testing passed.",
    ]
    rows = []
    for proj in PROJECTS[:2]:
        d = date(2025, 1, 6)
        count = 0
        while count < 20 and d <= date(2025, 3, 15):
            if d.weekday() < 5:
                w, t = random.choice(weather)
                rows.append({
                    "log_date": d.isoformat(),
                    "weather_conditions": w, "temperature": t,
                    "work_performed": random.choice(descs),
                    "safety_incidents": "None",
                    "delays": random.choice(["None"] * 6 + ["Material delivery delayed"]),
                    "project_name": proj["name"],
                    "status": "submitted",
                })
                count += 1
            d += timedelta(days=1)
    rows.sort(key=lambda r: r["log_date"])
    return rows


# =====================================================================
# 20. RFIs (10)
# =====================================================================
def generate_rfis():
    items = [
        ("Foundation waterproofing detail at parking garage", "07 10 00", PROJECTS[0]["name"]),
        ("Structural connection at setback floor 8", "05 12 00", PROJECTS[0]["name"]),
        ("Curtain wall spandrel panel specification", "08 44 00", PROJECTS[0]["name"]),
        ("Elevator pit waterproofing", "14 20 00", PROJECTS[0]["name"]),
        ("Fire pump room ventilation", "23 34 00", PROJECTS[0]["name"]),
        ("Townhome foundation step detail at grade change", "03 30 00", PROJECTS[1]["name"]),
        ("Garage door header framing", "05 40 00", PROJECTS[1]["name"]),
        ("Kitchen cabinet layout — model change", "12 35 00", PROJECTS[1]["name"]),
        ("Retail storefront glazing type at corner unit", "08 41 00", PROJECTS[2]["name"]),
        ("Loading dock ramp slope per ADA", "03 30 00", PROJECTS[2]["name"]),
    ]
    rows = []
    for i, (title, code, proj) in enumerate(items):
        sd = date(2025, 1, 15) + timedelta(days=random.randint(0, 60))
        rows.append({
            "rfi_number": f"HDP-RFI-{i+1:03d}",
            "title": title,
            "description": f"Clarification needed: {title.lower()}",
            "status": random.choice(["open", "responded", "closed"]),
            "priority": random.choice(["normal", "normal", "high"]),
            "submitted_date": sd.isoformat(),
            "required_date": (sd + timedelta(days=14)).isoformat(),
            "project_name": proj,
            "cost_code": code,
        })
    return rows


# =====================================================================
# 21. SUBMITTALS (10)
# =====================================================================
def generate_submittals():
    items = [
        ("Structural steel shop drawings", "05 12 00", PROJECTS[0]["name"]),
        ("Curtain wall system", "08 44 00", PROJECTS[0]["name"]),
        ("Elevator equipment & cab finishes", "14 21 00", PROJECTS[0]["name"]),
        ("Concrete mix design — 6000 PSI", "03 30 00", PROJECTS[0]["name"]),
        ("Roofing membrane system", "07 54 00", PROJECTS[0]["name"]),
        ("Townhome window package", "08 50 00", PROJECTS[1]["name"]),
        ("Kitchen appliance package", "11 31 00", PROJECTS[1]["name"]),
        ("Hardwood flooring samples", "09 64 00", PROJECTS[1]["name"]),
        ("Storefront framing system", "08 41 00", PROJECTS[2]["name"]),
        ("HVAC rooftop units — retail", "23 74 00", PROJECTS[2]["name"]),
    ]
    rows = []
    for i, (title, code, proj) in enumerate(items):
        sd = date(2025, 1, 10) + timedelta(days=random.randint(0, 50))
        rows.append({
            "submittal_number": f"HDP-SM-{i+1:03d}",
            "title": title,
            "description": f"Submittal for {title.lower()}",
            "status": random.choice(["approved", "approved", "approved_as_noted", "pending"]),
            "submitted_date": sd.isoformat(),
            "project_name": proj,
            "cost_code": code,
        })
    return rows


# =====================================================================
# 22. CHANGE ORDERS (6)
# =====================================================================
def generate_change_orders():
    items = [
        ("Owner-upgrade — lobby finishes", "09 00 00", PROJECTS[0]["name"], 180000, "owner"),
        ("Additional parking level", "03 30 00", PROJECTS[0]["name"], 450000, "owner"),
        ("Unforeseen rock at foundations", "31 23 00", PROJECTS[0]["name"], 120000, "cost"),
        ("Kitchen island upgrade — all units", "12 35 00", PROJECTS[1]["name"], 85000, "owner"),
        ("Additional landscaping — HOA request", "32 90 00", PROJECTS[1]["name"], 35000, "owner"),
        ("Retail HVAC capacity increase", "23 74 00", PROJECTS[2]["name"], 62000, "cost"),
    ]
    rows = []
    for i, (title, code, proj, amt, ctype) in enumerate(items):
        rows.append({
            "co_number": f"HDP-CO-{i+1:03d}",
            "title": title,
            "description": f"Change order: {title}",
            "amount": fmt(amt),
            "status": "draft",
            "change_order_type": ctype,
            "project_name": proj,
            "cost_code": code,
            "submitted_date": (date(2025, 2, 1) + timedelta(days=random.randint(0, 45))).isoformat(),
        })
    return rows


# =====================================================================
# 23. SAFETY (incidents 6, inspections 10, talks 12)
# =====================================================================
def generate_safety_incidents():
    return [
        {"title": "Worker fall from scaffold — caught by harness", "description": "Worker lost footing on 2nd level scaffold. Harness arrested fall. No injury. Planking secured.",
         "incident_type": "near_miss", "severity": "high", "incident_date": "2025-01-20", "project_name": PROJECTS[0]["name"], "osha_recordable": "no", "status": "closed"},
        {"title": "Concrete splatter — eye irritation", "description": "Worker got concrete splatter in eye during pour. Eye wash station used. Cleared by medic.",
         "incident_type": "injury", "severity": "low", "incident_date": "2025-02-05", "project_name": PROJECTS[0]["name"], "osha_recordable": "no", "status": "closed"},
        {"title": "Nail gun misfire", "description": "Framing nail gun misfired sending nail through plywood. No one in line of fire. Tool inspected and cleared.",
         "incident_type": "near_miss", "severity": "medium", "incident_date": "2025-02-18", "project_name": PROJECTS[1]["name"], "osha_recordable": "no", "status": "closed"},
        {"title": "Delivery truck struck utility pole", "description": "Concrete truck clipped power pole entering site. Minor pole damage. SDG&E notified.",
         "incident_type": "property_damage", "severity": "medium", "incident_date": "2025-03-05", "project_name": PROJECTS[2]["name"], "osha_recordable": "no", "status": "closed"},
        {"title": "Heat illness — laborer", "description": "Laborer experienced dizziness on warm day. Treated with shade and water. Released after 30 min.",
         "incident_type": "injury", "severity": "low", "incident_date": "2025-03-20", "project_name": PROJECTS[0]["name"], "osha_recordable": "no", "status": "reported"},
        {"title": "Excavation wall slough", "description": "Minor soil slough in utility trench. No workers in trench. Trench box repositioned.",
         "incident_type": "near_miss", "severity": "high", "incident_date": "2025-04-01", "project_name": PROJECTS[2]["name"], "osha_recordable": "no", "status": "reported"},
    ]


def generate_safety_inspections(field_emp):
    safety = [e for e in field_emp if e["_tag"] == "safety"]
    items = [
        ("Fall Protection Audit", "Harness inspections and guardrail checks.", "1 expired harness replaced."),
        ("Scaffolding Inspection", "Scaffold base plates, planking, guardrails.", "None required."),
        ("Crane Safety Check", "Pre-op logs and rigging hardware.", "Signal person re-certified."),
        ("Excavation Safety", "Trench boxes and sloping angles.", "Spoil pile relocated to 5ft from edge."),
        ("Electrical Safety", "GFCI and temp power.", "2 GFCIs replaced."),
        ("Fire Prevention", "Hot work permits and extinguishers.", "None required."),
        ("Housekeeping Audit", "Walking surfaces and material storage.", "Debris cleared from stairwell."),
        ("PPE Compliance", "Hard hats, vests, glasses.", "100% compliance."),
        ("Concrete Ops Safety", "Pump truck and silica controls.", "None required."),
        ("Ladder Inspection", "All ladders inspected.", "1 damaged ladder removed."),
    ]
    rows = []
    for i, (title, findings, actions) in enumerate(items):
        rows.append({
            "inspection_type": "site_safety",
            "inspection_date": (date(2025, 1, 10) + timedelta(days=i * 9)).isoformat(),
            "score": str(random.randint(86, 100)),
            "findings": findings,
            "corrective_actions": actions,
            "status": "completed",
            "project_name": PROJECTS[i % len(PROJECTS)]["name"],
        })
    return rows


def generate_toolbox_talks(field_emp):
    foremen = [e for e in field_emp if e["_tag"] == "foreman"]
    safety = [e for e in field_emp if e["_tag"] == "safety"]
    presenters = foremen + safety
    topics = [
        ("Fall Protection", "Fall Protection", "100% tie-off policy review."),
        ("Excavation Safety", "Excavation", "Trench safety and soil types."),
        ("Crane Signals", "Crane Safety", "Standard hand signals."),
        ("Heat Illness Prevention", "Environmental", "Hydration and shade breaks."),
        ("Concrete Burn Prevention", "Chemical Safety", "Wet concrete pH and protection."),
        ("Scaffolding Awareness", "Fall Protection", "Erection/dismantling rules."),
        ("Housekeeping Standards", "General Safety", "Clean as you go policy."),
        ("PPE Requirements", "PPE", "Required equipment by task."),
        ("Fire Extinguisher Use", "Fire Safety", "PASS technique and types."),
        ("Struck-By Prevention", "General Safety", "Overhead work and flaggers."),
        ("Back Safety & Lifting", "Ergonomics", "Team lifts and body mechanics."),
        ("Emergency Procedures", "Emergency", "Evacuation routes and assembly."),
    ]
    rows = []
    td = date(2025, 1, 6)
    for i, (title, topic, desc) in enumerate(topics):
        p = presenters[i % len(presenters)]
        rows.append({
            "title": title, "topic": topic, "description": desc,
            "scheduled_date": td.isoformat(),
            "attendees_count": str(random.randint(15, 30)),
            "project_name": PROJECTS[i % len(PROJECTS)]["name"],
            "status": "completed",
            "notes": f"Presented by {p['first_name']} {p['last_name']}",
        })
        td += timedelta(days=7)
    return rows


# =====================================================================
# 24. TIME ENTRIES (80)
# =====================================================================
def generate_time_entries(field_emp):
    tasks = [
        ("Site layout & surveying", "01 71 00"),
        ("Concrete formwork", "03 10 00"),
        ("Concrete placement", "03 30 00"),
        ("Framing — walls", "05 40 00"),
        ("Material staging", "01 60 00"),
        ("Safety inspection assist", "01 56 00"),
        ("Project coordination", "01 31 00"),
        ("Cleanup & housekeeping", "01 74 00"),
        ("Equipment operation", "01 54 00"),
        ("Punch list work", "01 77 00"),
    ]
    workers = [e for e in field_emp if e["_tag"] in ("foreman", "laborer", "super")]
    rows = []
    for _ in range(80):
        w = random.choice(workers)
        p = random.choice(PROJECTS)
        d = random_date_between(date(2025, 1, 6), date(2025, 4, 30))
        t, c = random.choice(tasks)
        rows.append({
            "contact_name": f"{w['first_name']} {w['last_name']}",
            "project_name": p["name"],
            "entry_date": d.isoformat(),
            "hours": str(random.choice([7, 8, 8, 8, 9, 10])),
            "description": t, "cost_code": c, "status": "approved",
        })
    rows.sort(key=lambda r: r["entry_date"])
    return rows


# =====================================================================
# 25. EQUIPMENT ASSIGNMENTS (12)
# =====================================================================
def generate_equipment_assignments():
    assigns = [
        ("Tower Crane TC-1", PROJECTS[0]["name"], "2024-06-01", "2025-12-31"),
        ("Crawler Excavator", PROJECTS[0]["name"], "2024-06-01", "2025-06-30"),
        ("Boom Lift 60ft", PROJECTS[0]["name"], "2025-01-15", "2025-10-31"),
        ("Concrete Pump", PROJECTS[0]["name"], "2024-09-01", "2025-06-30"),
        ("Generator 50kW", PROJECTS[0]["name"], "2024-06-01", "2025-12-31"),
        ("Telehandler", PROJECTS[1]["name"], "2024-09-01", "2025-09-30"),
        ("Scissor Lift 32ft", PROJECTS[1]["name"], "2025-01-01", "2025-06-30"),
        ("Pickup Truck #1", PROJECTS[0]["name"], "2024-06-01", "2025-12-31"),
        ("Pickup Truck #2", PROJECTS[1]["name"], "2024-09-01", "2025-09-30"),
        ("Skid Steer", PROJECTS[2]["name"], "2025-01-15", "2025-08-31"),
        ("Crawler Excavator", PROJECTS[2]["name"], "2025-07-01", "2025-12-31"),
        ("Boom Lift 60ft", PROJECTS[2]["name"], "2025-11-01", "2025-12-31"),
    ]
    rows = []
    for equip, proj, start, end in assigns:
        rows.append({
            "equipment_name": equip, "project_name": proj,
            "assigned_date": start, "return_date": end, "status": "active",
        })
    return rows


# =====================================================================
# 26. INVOICES
# =====================================================================
def generate_invoices():
    rows = []

    # ── OB Receivable (2 — prior construction billings) ──
    for i, amt in enumerate([1_800_000, 1_200_000]):
        rows.append({
            "invoice_number": f"HDP-OB-R{i+1:02d}",
            "invoice_type": "receivable",
            "invoice_date": "2024-12-31", "due_date": "2024-12-31",
            "amount": fmt(amt), "tax_amount": "",
            "gl_account": "3010", "retainage_pct": "0", "retainage_held": "0",
            "status": "paid",
            "description": f"Opening balance — prior billing {PROJECTS[i]['name']}",
            "project_name": PROJECTS[i]["name"],
            "client_name": PROJECTS[i]["client_name"],
            "vendor_name": "",
        })

    # ── OB Payable (2) ──
    for i, (amt, vn) in enumerate([(900_000, "SoCal Concrete Works"), (600_000, "Bay Electrical Systems")]):
        rows.append({
            "invoice_number": f"HDP-OB-P{i+1:02d}",
            "invoice_type": "payable",
            "invoice_date": "2024-12-31", "due_date": "2024-12-31",
            "amount": fmt(amt), "tax_amount": "",
            "gl_account": "3010", "retainage_pct": "0", "retainage_held": "0",
            "status": "paid",
            "description": f"Opening balance — prior payment {vn}",
            "project_name": PROJECTS[i]["name"],
            "client_name": "", "vendor_name": vn,
        })

    seasonal = [0.85, 0.85, 0.95, 1.0, 1.1, 1.15, 1.15, 1.1, 1.0, 0.95, 0.85, 0.85]
    ss = sum(seasonal)
    seasonal = [w * 12 / ss for w in seasonal]

    # ── Construction Receivable (36 = 12mo x 3 projects) ──
    total_budget = sum(float(p["budget"]) for p in PROJECTS)
    recv_running = 0.0
    recv_temp = []
    for m in range(12):
        me = MONTH_ENDS[m]
        dd = MONTH_ENDS[min(m + 1, 11)]
        st = "paid" if m < 10 else "pending"
        for pidx, proj in enumerate(PROJECTS):
            w = float(proj["budget"]) / total_budget
            amt = round(CONSTRUCTION_REVENUE * w * seasonal[m] / 12 * random.uniform(0.97, 1.03), 2)
            ret = round(amt * 0.10, 2)
            recv_running += amt
            recv_temp.append({
                "inv_num": f"HDP-{me[:7].replace('-','')}-CR{pidx+1}",
                "amount": amt, "retainage_held": ret,
                "project_name": proj["name"],
                "client_name": proj["client_name"],
                "gl_account": "4000", "status": st,
                "description": f"Construction billing — {proj['name']} — {MONTH_NAMES[m]}",
                "invoice_date": me, "due_date": dd,
            })
    diff = CONSTRUCTION_REVENUE - recv_running
    recv_temp[-1]["amount"] = round(recv_temp[-1]["amount"] + diff, 2)
    recv_temp[-1]["retainage_held"] = round(recv_temp[-1]["amount"] * 0.10, 2)

    for r in recv_temp:
        rows.append({
            "invoice_number": r["inv_num"], "invoice_type": "receivable",
            "invoice_date": r["invoice_date"], "due_date": r["due_date"],
            "amount": fmt(r["amount"]), "tax_amount": "",
            "gl_account": r["gl_account"],
            "retainage_pct": "10", "retainage_held": fmt(r["retainage_held"]),
            "status": r["status"],
            "description": r["description"],
            "project_name": r["project_name"],
            "client_name": r["client_name"], "vendor_name": "",
        })

    # ── Rental Income Receivable (12 monthly) ──
    # $8M total: $6M residential + $2M commercial
    rental_running = 0.0
    rental_temp = []
    for m in range(12):
        me = MONTH_ENDS[m]
        res_amt = round(6_000_000 / 12, 2)
        com_amt = round(2_000_000 / 12, 2)
        rental_running += res_amt + com_amt
        rental_temp.append({"inv_num": f"HDP-RENT-RES-{MONTHS[m]}", "amount": res_amt,
                            "gl": "4010", "desc": f"Rental income — Coronado Bay — {MONTH_NAMES[m]}",
                            "prop": "Coronado Bay Apartments", "date": me})
        rental_temp.append({"inv_num": f"HDP-RENT-COM-{MONTHS[m]}", "amount": com_amt,
                            "gl": "4020", "desc": f"Rental income — Gaslamp Retail — {MONTH_NAMES[m]}",
                            "prop": "Gaslamp Quarter Retail", "date": me})

    diff = RENTAL_INCOME - rental_running
    rental_temp[-1]["amount"] = round(rental_temp[-1]["amount"] + diff, 2)

    for r in rental_temp:
        st = "paid" if MONTH_ENDS.index(r["date"]) < 10 else "pending"
        rows.append({
            "invoice_number": r["inv_num"], "invoice_type": "receivable",
            "invoice_date": r["date"], "due_date": r["date"],
            "amount": fmt(r["amount"]), "tax_amount": "",
            "gl_account": r["gl"],
            "retainage_pct": "0", "retainage_held": "0",
            "status": st,
            "description": r["desc"],
            "project_name": "", "client_name": r["prop"], "vendor_name": "",
            "property_name": r["prop"],
        })

    # ── Property Sales Receivable (5 townhome closings) ──
    sale_running = 0.0
    sale_amts = [1_100_000, 1_050_000, 980_000, 950_000]
    sale_amts.append(PROPERTY_SALES - sum(sale_amts))
    for i, amt in enumerate(sale_amts):
        sd = date(2025, 3 + i, 15).isoformat()
        rows.append({
            "invoice_number": f"HDP-SALE-{i+1:02d}", "invoice_type": "receivable",
            "invoice_date": sd, "due_date": sd,
            "amount": fmt(amt), "tax_amount": "",
            "gl_account": "4030",
            "retainage_pct": "0", "retainage_held": "0",
            "status": "paid" if i < 3 else "pending",
            "description": f"Townhome unit {i+1} closing — Pacific Crest",
            "project_name": PROJECTS[1]["name"],
            "client_name": f"Buyer {i+1}", "vendor_name": "",
        })

    # ── Subcontractor Payables ──
    sub_running = 0.0
    sub_temp = []
    for m in range(12):
        inv_date = f"2025-{MONTHS[m]}-25"
        dd = MONTH_ENDS[m]
        st = "paid" if m < 10 else "pending"
        month_total = SUB_COST_TOTAL * seasonal[m] / 12
        shares = [random.uniform(0.8, 1.2) for _ in SUB_TRADES]
        ss2 = sum(shares)
        for sidx, (sn, sd, gl) in enumerate(SUB_TRADES):
            amt = round(month_total * shares[sidx] / ss2, 2)
            sub_running += amt
            sub_temp.append({
                "inv_num": f"HDP-{MONTHS[m]}-S{sidx+1:02d}",
                "amount": amt, "gl": gl,
                "desc": f"{sd} — {MONTH_NAMES[m]}",
                "proj": PROJECTS[m % len(PROJECTS)]["name"],
                "vendor": sn, "date": inv_date, "dd": dd, "st": st,
            })
    diff = SUB_COST_TOTAL - sub_running
    sub_temp[-1]["amount"] = round(sub_temp[-1]["amount"] + diff, 2)

    for r in sub_temp:
        rows.append({
            "invoice_number": r["inv_num"], "invoice_type": "payable",
            "invoice_date": r["date"], "due_date": r["dd"],
            "amount": fmt(r["amount"]), "tax_amount": "",
            "gl_account": r["gl"],
            "retainage_pct": "10", "retainage_held": fmt(round(r["amount"] * 0.10, 2)),
            "status": r["st"],
            "description": r["desc"],
            "project_name": r["proj"],
            "client_name": "", "vendor_name": r["vendor"],
        })

    # ── Material Payables ──
    mat_running = 0.0
    mat_temp = []
    mat_vendors = [n for n, _ in MATERIAL_VENDORS]
    for m in range(12):
        inv_date = f"2025-{MONTHS[m]}-15"
        dd = MONTH_ENDS[m]
        st = "paid" if m < 10 else "pending"
        month_total = MATERIAL_COST_TOTAL / 12
        shares = [random.uniform(0.8, 1.2) for _ in mat_vendors]
        ss2 = sum(shares)
        for vidx, vn in enumerate(mat_vendors):
            amt = round(month_total * shares[vidx] / ss2, 2)
            mat_running += amt
            mat_temp.append({
                "inv_num": f"HDP-{MONTHS[m]}-M{vidx+1:02d}",
                "amount": amt, "vendor": vn,
                "date": inv_date, "dd": dd, "st": st,
                "proj": PROJECTS[m % len(PROJECTS)]["name"],
            })
    diff = MATERIAL_COST_TOTAL - mat_running
    mat_temp[-1]["amount"] = round(mat_temp[-1]["amount"] + diff, 2)

    for r in mat_temp:
        rows.append({
            "invoice_number": r["inv_num"], "invoice_type": "payable",
            "invoice_date": r["date"], "due_date": r["dd"],
            "amount": fmt(r["amount"]), "tax_amount": "",
            "gl_account": "5000",
            "retainage_pct": "0", "retainage_held": "0",
            "status": r["st"],
            "description": f"Construction materials — {MONTH_NAMES[int(r['date'][5:7])-1]}",
            "project_name": r["proj"],
            "client_name": "", "vendor_name": r["vendor"],
        })

    # ── Property Operating Expense Payables ──
    # $4.5M across 12 months to property maintenance vendors
    prop_vendors = ["Pacific Property Services", "SD Landscaping & Grounds",
                    "CleanPro Commercial", "San Diego Waste Mgmt"]
    prop_gl_map = {"Pacific Property Services": "5500", "SD Landscaping & Grounds": "5500",
                   "CleanPro Commercial": "5500", "San Diego Waste Mgmt": "5500"}
    prop_running = 0.0
    prop_temp = []
    for m in range(12):
        inv_date = f"2025-{MONTHS[m]}-10"
        dd = MONTH_ENDS[m]
        st = "paid" if m < 10 else "pending"
        month_total = PROPERTY_EXPENSE_TOTAL / 12
        shares = [random.uniform(0.8, 1.2) for _ in prop_vendors]
        ss2 = sum(shares)
        for vidx, vn in enumerate(prop_vendors):
            amt = round(month_total * shares[vidx] / ss2, 2)
            prop_running += amt
            prop_temp.append({
                "inv_num": f"HDP-{MONTHS[m]}-PE{vidx+1:02d}",
                "amount": amt, "vendor": vn, "gl": prop_gl_map[vn],
                "date": inv_date, "dd": dd, "st": st,
            })
    diff = PROPERTY_EXPENSE_TOTAL - prop_running
    prop_temp[-1]["amount"] = round(prop_temp[-1]["amount"] + diff, 2)

    for r in prop_temp:
        rows.append({
            "invoice_number": r["inv_num"], "invoice_type": "payable",
            "invoice_date": r["date"], "due_date": r["dd"],
            "amount": fmt(r["amount"]), "tax_amount": "",
            "gl_account": r["gl"],
            "retainage_pct": "0", "retainage_held": "0",
            "status": r["st"],
            "description": f"Property operating expense — {MONTH_NAMES[int(r['date'][5:7])-1]}",
            "project_name": "",
            "client_name": "", "vendor_name": r["vendor"],
        })

    recv_total = sum(r["amount"] for r in recv_temp) + sum(r["amount"] for r in rental_temp) + PROPERTY_SALES
    sub_total = sum(r["amount"] for r in sub_temp)
    mat_total = sum(r["amount"] for r in mat_temp)
    prop_total = sum(r["amount"] for r in prop_temp)
    print(f"\n  Invoice totals:")
    print(f"    Receivable (construction): ${sum(r['amount'] for r in recv_temp):,.2f}")
    print(f"    Receivable (rental):       ${sum(r['amount'] for r in rental_temp):,.2f}")
    print(f"    Receivable (sales):        ${PROPERTY_SALES:,.2f}")
    print(f"    Payable (subs):            ${sub_total:,.2f}")
    print(f"    Payable (materials):       ${mat_total:,.2f}")
    print(f"    Payable (property ops):    ${prop_total:,.2f}")

    return rows


# =====================================================================
# 27. JOURNAL ENTRIES
# =====================================================================
def generate_journal_entries():
    rows = []

    def add_je(en, ed, desc, lines):
        for acct, dr, cr, ld in lines:
            rows.append({
                "entry_number": en, "entry_date": ed,
                "description": desc, "account_number": str(acct),
                "debit": fmt(dr), "credit": fmt(cr),
                "line_description": ld, "status": "posted",
            })

    # ── Opening Balances ──
    ob_cash = 7_870_000
    ob_prepaid_ins = 600_000
    ob_prepaid_other = 250_000
    ob_sec_dep_recv = 420_000
    ob_equip = 2_800_000
    ob_vehicles = 900_000
    ob_office = 180_000
    ob_accum_dep = 1_200_000
    ob_land = 8_500_000
    ob_cip = 12_000_000
    ob_rental_bldg = 52_000_000
    ob_rental_dep = 8_000_000

    ob_accrued_pay = 800_000
    ob_accrued_exp = 350_000
    ob_sec_dep_held = 420_000
    ob_cl_mixed = 10_000_000
    ob_cl_town = 4_000_000
    ob_mort_cor = 32_000_000
    ob_mort_gas = 12_000_000
    ob_loc = 2_000_000

    ob_partners_cap = 5_000_000

    total_dr = (ob_cash + ob_prepaid_ins + ob_prepaid_other + ob_sec_dep_recv +
                ob_equip + ob_vehicles + ob_office + ob_land + ob_cip +
                ob_rental_bldg)
    total_cr = (ob_accum_dep + ob_rental_dep + ob_accrued_pay + ob_accrued_exp +
                ob_sec_dep_held + ob_cl_mixed + ob_cl_town + ob_mort_cor +
                ob_mort_gas + ob_loc + ob_partners_cap)
    ob_re = total_dr - total_cr

    add_je("HDP-OB-001", "2025-01-01", "Opening Balances — Harborview Development", [
        (1000, ob_cash, 0, "Cash - Operating"),
        (1040, ob_prepaid_ins, 0, "Prepaid insurance"),
        (1050, ob_prepaid_other, 0, "Prepaid expenses"),
        (1060, ob_sec_dep_recv, 0, "Security deposits receivable"),
        (1100, ob_equip, 0, "Construction equipment"),
        (1110, ob_vehicles, 0, "Vehicles"),
        (1120, ob_office, 0, "Office equipment"),
        (1130, 0, ob_accum_dep, "Accumulated depreciation - equip/vehicles"),
        (1200, ob_land, 0, "Land held for development"),
        (1210, ob_cip, 0, "Construction in progress"),
        (1220, ob_rental_bldg, 0, "Rental property - buildings"),
        (1230, 0, ob_rental_dep, "Accum depreciation - rental"),
        (2020, 0, ob_accrued_pay, "Accrued payroll"),
        (2030, 0, ob_accrued_exp, "Accrued expenses"),
        (2040, 0, ob_sec_dep_held, "Security deposits held"),
        (2100, 0, ob_cl_mixed, "Construction loan - mixed use"),
        (2110, 0, ob_cl_town, "Construction loan - townhomes"),
        (2120, 0, ob_mort_cor, "Mortgage - Coronado"),
        (2130, 0, ob_mort_gas, "Mortgage - Gaslamp"),
        (2200, 0, ob_loc, "Line of credit"),
        (3000, 0, ob_partners_cap, "Partners capital"),
        (3010, 0, ob_re, "Retained earnings — plug"),
    ])

    # ── Monthly JEs ──
    seasonal = [0.85, 0.85, 0.95, 1.0, 1.1, 1.15, 1.15, 1.1, 1.0, 0.95, 0.85, 0.85]
    ss = sum(seasonal)
    seasonal = [w * 12 / ss for w in seasonal]

    m_5100 = allocate_to_months(FIELD_LABOR, seasonal)
    m_5110 = allocate_to_months(SUPERVISION_LABOR, seasonal)
    m_5120 = allocate_to_months(FIELD_PAYROLL_TAX, seasonal)
    m_5200 = allocate_to_months(EQUIP_RENTAL, seasonal)
    m_5210 = allocate_to_months(EQUIP_FUEL, seasonal)
    m_6000 = allocate_to_months(OFFICER_SALARIES)
    m_6010 = allocate_to_months(OFFICE_STAFF)
    m_6020 = allocate_to_months(GA_PAYROLL_TAX)
    m_6030 = allocate_to_months(OFFICE_RENT)
    m_6040 = allocate_to_months(INSURANCE_BONDING)
    m_6050 = allocate_to_months(PROFESSIONAL_SERVICES)
    m_6060 = allocate_to_months(IT_SOFTWARE)
    m_6070 = allocate_to_months(MARKETING)
    m_6080 = allocate_to_months(TRAVEL)
    m_6090 = allocate_to_months(UTILITIES_TEL)
    m_7000 = allocate_to_months(INTEREST_EXPENSE)

    qdep = round(DEPRECIATION / 4, 2)

    for m in range(12):
        me = MONTH_ENDS[m]
        mn = MONTH_NAMES[m]

        # Payroll
        pay_total = m_5100[m] + m_5110[m] + m_5120[m] + m_6000[m] + m_6010[m] + m_6020[m]
        add_je(f"HDP-PAY-{MONTHS[m]}", me, f"Payroll — {mn} 2025", [
            (5100, m_5100[m], 0, f"Field labor {mn}"),
            (5110, m_5110[m], 0, f"Supervision {mn}"),
            (5120, m_5120[m], 0, f"Field payroll tax {mn}"),
            (6000, m_6000[m], 0, f"Officer salaries {mn}"),
            (6010, m_6010[m], 0, f"Office staff {mn}"),
            (6020, m_6020[m], 0, f"G&A payroll tax {mn}"),
            (2020, 0, pay_total, f"Accrued payroll {mn}"),
        ])
        add_je(f"HDP-PDIS-{MONTHS[m]}", me, f"Payroll disbursement — {mn}", [
            (2020, pay_total, 0, f"Clear accrued payroll {mn}"),
            (1000, 0, pay_total, f"Cash - payroll {mn}"),
        ])

        # Equipment
        eq_total = m_5200[m] + m_5210[m]
        add_je(f"HDP-EQ-{MONTHS[m]}", me, f"Equipment costs — {mn}", [
            (5200, m_5200[m], 0, f"Equipment rental {mn}"),
            (5210, m_5210[m], 0, f"Equipment fuel {mn}"),
            (1000, 0, eq_total, f"Cash - equipment {mn}"),
        ])

        # Overhead
        oh = m_6030[m] + m_6040[m] + m_6050[m] + m_6060[m] + m_6070[m] + m_6080[m] + m_6090[m]
        add_je(f"HDP-OH-{MONTHS[m]}", me, f"Overhead — {mn}", [
            (6030, m_6030[m], 0, f"Office rent {mn}"),
            (6040, m_6040[m], 0, f"Insurance & bonding {mn}"),
            (6050, m_6050[m], 0, f"Professional services {mn}"),
            (6060, m_6060[m], 0, f"IT & software {mn}"),
            (6070, m_6070[m], 0, f"Marketing {mn}"),
            (6080, m_6080[m], 0, f"Travel {mn}"),
            (6090, m_6090[m], 0, f"Utilities & telephone {mn}"),
            (1000, 0, oh, f"Cash - overhead {mn}"),
        ])

        # Interest
        add_je(f"HDP-INT-{MONTHS[m]}", me, f"Interest — {mn}", [
            (7000, m_7000[m], 0, f"Interest on loans {mn}"),
            (1000, 0, m_7000[m], f"Cash - interest {mn}"),
        ])

        # Depreciation (quarterly)
        if m in (2, 5, 8, 11):
            qtr = {2: "Q1", 5: "Q2", 8: "Q3", 11: "Q4"}[m]
            dep = qdep if m != 11 else DEPRECIATION - qdep * 3
            add_je(f"HDP-DEP-{qtr}", me, f"Depreciation — {qtr}", [
                (6100, dep, 0, f"Depreciation {qtr}"),
                (1130, 0, dep, f"Accumulated depreciation {qtr}"),
            ])

    return rows


# =====================================================================
# MAIN
# =====================================================================
def main():
    print("=" * 70)
    print("Harborview Development Partners — Mock Data Generator")
    print("=" * 70)

    coa, account_names = generate_chart_of_accounts()
    banks = generate_bank_accounts()
    properties = generate_properties()
    units = generate_units()
    projects = generate_projects()
    contacts, field_emp = generate_contacts()
    vendors = generate_vendors()
    equipment = generate_equipment()
    phases = generate_phases()
    tasks = generate_tasks()
    budget_lines = generate_budget_lines()
    certs = generate_certifications(field_emp)
    opps = generate_opportunities()
    bids = generate_bids()
    contracts = generate_contracts()
    leases = generate_leases(units)
    maint = generate_maintenance()
    prop_expenses = generate_property_expenses()
    daily_logs = generate_daily_logs()
    rfis = generate_rfis()
    submittals = generate_submittals()
    change_orders = generate_change_orders()
    safety_incidents = generate_safety_incidents()
    safety_inspections = generate_safety_inspections(field_emp)
    toolbox_talks = generate_toolbox_talks(field_emp)
    time_entries = generate_time_entries(field_emp)
    equip_assignments = generate_equipment_assignments()
    invoices = generate_invoices()
    jes = generate_journal_entries()

    all_sheets = {
        "chart_of_accounts": coa,
        "bank_accounts": banks,
        "properties": properties,
        "units": units,
        "projects": projects,
        "contacts": contacts,
        "vendors": vendors,
        "equipment": equipment,
        "phases": phases,
        "tasks": tasks,
        "budget_lines": budget_lines,
        "certifications": certs,
        "opportunities": opps,
        "bids": bids,
        "contracts": contracts,
        "leases": leases,
        "maintenance": maint,
        "property_expenses": prop_expenses,
        "daily_logs": daily_logs,
        "rfis": rfis,
        "submittals": submittals,
        "change_orders": change_orders,
        "safety_incidents": safety_incidents,
        "safety_inspections": safety_inspections,
        "toolbox_talks": toolbox_talks,
        "time_entries": time_entries,
        "equipment_assignments": equip_assignments,
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
