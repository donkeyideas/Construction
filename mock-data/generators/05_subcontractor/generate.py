#!/usr/bin/env python3
"""
BrightSpark Electrical Contractors Inc — Mock Data Generator
=============================================================
Electrical subcontractor in Phoenix, AZ. ~$18M revenue, labor-driven,
heavy on time entries and certifications.

Financial Targets (FY 2025):
  Revenue:          $18,000,000  (progress billings to GCs via receivable invoices)
  Direct Labor:      $9,000,000  (JE — journeymen $5.1M + apprentices $2.4M + payroll tax $1.5M)
  Materials:         $4,200,000  (payable invoices to suppliers)
  Equipment Rental:    $600,000  (JE)
  Overhead:          $2,370,000  (JE — officer $540K, office $360K, GA tax $180K,
                                   rent $156K, insurance $624K, vehicles $300K,
                                   professional $120K, IT $90K)
  Depreciation:        $240,000  (JE — quarterly)
  Interest:             $80,000  (JE — LOC & vehicle loans)
  ─────────────────────────────
  Net Income:        $1,510,000
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

random.seed(500)

# ── Output path ──────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "BrightSpark_Electrical_Import.xlsx")

# ── Financial constants ──────────────────────────────────────────────────
REVENUE_TOTAL = 18_000_000
MATERIAL_INVOICE_TOTAL = 4_200_000
NET_INCOME_TARGET = 1_510_000

# JE-driven costs (annual)
# Direct costs
DIRECT_LABOR_JOURNEYMEN = 5_100_000
DIRECT_LABOR_APPRENTICES = 2_400_000
LABOR_PAYROLL_TAXES = 1_500_000
TOOL_EQUIPMENT_RENTAL = 600_000
# Overhead items (must total $2,370,000 to hit NI target)
OFFICER_SALARIES = 540_000
OFFICE_STAFF_SALARIES = 360_000
GA_PAYROLL_TAXES = 180_000
OFFICE_RENT_UTILITIES = 156_000
INSURANCE_GL_WC = 624_000
VEHICLE_EXPENSES = 300_000
PROFESSIONAL_SERVICES = 120_000
IT_SOFTWARE = 90_000
# Non-cash / other
DEPRECIATION_VEHICLES = 240_000
INTEREST_EXPENSE = 80_000

# =====================================================================
# 1. CHART OF ACCOUNTS (~40)
# =====================================================================
def generate_chart_of_accounts():
    accounts = [
        # Assets
        ("1000", "Cash - Operating", "asset", "current_asset"),
        ("1010", "Accounts Receivable", "asset", "current_asset"),
        ("1020", "Retainage Receivable", "asset", "current_asset"),
        ("1040", "Prepaid Expenses", "asset", "current_asset"),
        ("1100", "Vehicles & Equipment", "asset", "fixed_asset"),
        ("1110", "Accumulated Depreciation - Vehicles", "asset", "fixed_asset"),
        # Liabilities
        ("2000", "Accounts Payable", "liability", "current_liability"),
        ("2010", "Retainage Payable", "liability", "current_liability"),
        ("2020", "Accrued Payroll", "liability", "current_liability"),
        ("2030", "Accrued Expenses", "liability", "current_liability"),
        ("2100", "Vehicle Loans", "liability", "long_term_liability"),
        ("2200", "Line of Credit", "liability", "current_liability"),
        # Equity
        ("3000", "Owners Capital", "equity", "equity"),
        ("3010", "Retained Earnings", "equity", "retained_earnings"),
        # Revenue
        ("4000", "Electrical Contract Revenue", "revenue", "operating_revenue"),
        ("4010", "Service Call Revenue", "revenue", "operating_revenue"),
        ("4200", "Change Order Revenue", "revenue", "operating_revenue"),
        # Direct Costs
        ("5000", "Electrical Wire & Cable", "expense", "cost_of_goods"),
        ("5010", "Conduit & Fittings", "expense", "cost_of_goods"),
        ("5020", "Panels & Breakers", "expense", "cost_of_goods"),
        ("5030", "Lighting Fixtures", "expense", "cost_of_goods"),
        ("5040", "Fire Alarm Materials", "expense", "cost_of_goods"),
        ("5100", "Direct Labor - Journeymen", "expense", "cost_of_goods"),
        ("5110", "Direct Labor - Apprentices", "expense", "cost_of_goods"),
        ("5120", "Labor Payroll Taxes", "expense", "cost_of_goods"),
        ("5130", "Tool & Equipment Rental", "expense", "cost_of_goods"),
        # Overhead
        ("6000", "Officer Salaries", "expense", "operating_expense"),
        ("6010", "Office Staff Salaries", "expense", "operating_expense"),
        ("6020", "Payroll Taxes - G&A", "expense", "operating_expense"),
        ("6030", "Office Rent & Utilities", "expense", "operating_expense"),
        ("6040", "Insurance - GL & WC", "expense", "operating_expense"),
        ("6050", "Vehicle Expenses", "expense", "operating_expense"),
        ("6060", "Professional Services", "expense", "operating_expense"),
        ("6070", "IT & Software", "expense", "operating_expense"),
        ("6100", "Depreciation - Vehicles", "expense", "operating_expense"),
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
# 2. BANK ACCOUNTS (3)
# =====================================================================
def generate_bank_accounts():
    return [
        {
            "name": "Operating Account",
            "bank_name": "Arizona Federal Credit Union",
            "account_type": "checking",
            "account_number_last4": "4821",
            "routing_number_last4": "7703",
            "current_balance": "620000.00",
        },
        {
            "name": "Payroll Account",
            "bank_name": "Arizona Federal Credit Union",
            "account_type": "checking",
            "account_number_last4": "4822",
            "routing_number_last4": "7703",
            "current_balance": "185000.00",
        },
        {
            "name": "Line of Credit",
            "bank_name": "Wells Fargo",
            "account_type": "checking",
            "account_number_last4": "9130",
            "routing_number_last4": "1210",
            "current_balance": "350000.00",
        },
    ]


# =====================================================================
# 3. PROJECTS (6)
# =====================================================================
PROJECTS = [
    {
        "name": "Scottsdale Medical Center - Electrical",
        "code": "SMC-E-2024",
        "project_type": "Healthcare",
        "budget": "4200000",
        "start_date": "2024-03-15",
        "end_date": "2025-09-30",
        "completion_pct": "70",
        "client_name": "McCarthy Building Companies",
    },
    {
        "name": "Phoenix Sky Harbor T3 - Electrical",
        "code": "PSH-E-2024",
        "project_type": "Aviation",
        "budget": "3800000",
        "start_date": "2024-06-01",
        "end_date": "2026-03-31",
        "completion_pct": "45",
        "client_name": "Hensel Phelps",
    },
    {
        "name": "Tempe Town Lake Mixed-Use - Electrical",
        "code": "TTL-E-2024",
        "project_type": "Mixed-Use",
        "budget": "3200000",
        "start_date": "2024-04-01",
        "end_date": "2025-12-31",
        "completion_pct": "60",
        "client_name": "Sundt Construction",
    },
    {
        "name": "Chandler Data Center - Power",
        "code": "CDC-E-2025",
        "project_type": "Data Center",
        "budget": "2800000",
        "start_date": "2025-01-15",
        "end_date": "2026-06-30",
        "completion_pct": "20",
        "client_name": "Hensel Phelps",
    },
    {
        "name": "Mesa USD K-8 School - Electrical",
        "code": "MSD-E-2025",
        "project_type": "Education",
        "budget": "2200000",
        "start_date": "2025-02-01",
        "end_date": "2025-11-30",
        "completion_pct": "30",
        "client_name": "McCarthy Building Companies",
    },
    {
        "name": "Glendale Arena Renovation - Electrical",
        "code": "GAR-E-2025",
        "project_type": "Entertainment",
        "budget": "1800000",
        "start_date": "2025-03-01",
        "end_date": "2025-10-31",
        "completion_pct": "10",
        "client_name": "Sundt Construction",
    },
]

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
            "city": "Phoenix",
            "state": "AZ",
        })
    return rows


# =====================================================================
# 4. CONTACTS (~28)
# =====================================================================
FIELD_ROLES = (
    [("Journeyman Electrician", "journeyman")] * 8
    + [("Apprentice Electrician", "apprentice")] * 6
    + [("Electrical Foreman", "foreman")] * 3
    + [("Estimator", "estimator")] * 2
    + [("Safety Manager", "safety")] * 1
)

OFFICE_ROLES = [
    ("Owner / President", "owner"),
    ("Controller", "controller"),
    ("Office Manager", "office"),
    ("Dispatcher", "dispatcher"),
    ("HR Manager", "hr"),
]

GC_CONTACTS = [
    ("McCarthy Building Companies", "Senior Project Manager"),
    ("Hensel Phelps", "Project Executive"),
    ("Sundt Construction", "Project Manager"),
]

def generate_contacts():
    used_names = set()
    rows = []
    field_employees = []
    office_employees = []

    # Field employees
    for title, tag in FIELD_ROLES:
        first, last = generate_person_name(used_names)
        emp = {
            "first_name": first,
            "last_name": last,
            "email": random_email(first, last, "brightspark-elec.com"),
            "phone": random_phone(),
            "job_title": title,
            "contact_type": "employee",
            "company_name": "BrightSpark Electrical Contractors Inc",
            "_tag": tag,
        }
        rows.append({k: v for k, v in emp.items() if not k.startswith("_")})
        field_employees.append(emp)

    # Office employees
    for title, tag in OFFICE_ROLES:
        first, last = generate_person_name(used_names)
        emp = {
            "first_name": first,
            "last_name": last,
            "email": random_email(first, last, "brightspark-elec.com"),
            "phone": random_phone(),
            "job_title": title,
            "contact_type": "employee",
            "company_name": "BrightSpark Electrical Contractors Inc",
            "_tag": tag,
        }
        rows.append({k: v for k, v in emp.items() if not k.startswith("_")})
        office_employees.append(emp)

    # GC project manager contacts
    gc_contacts = []
    for gc_name, gc_title in GC_CONTACTS:
        first, last = generate_person_name(used_names)
        gc = {
            "first_name": first,
            "last_name": last,
            "email": random_email(first, last, gc_name.lower().replace(" ", "") + ".com"),
            "phone": random_phone(),
            "job_title": gc_title,
            "contact_type": "subcontractor",
            "company_name": gc_name,
        }
        rows.append(gc)
        gc_contacts.append(gc)

    return rows, field_employees, office_employees, gc_contacts


# =====================================================================
# 5. VENDORS (~10)
# =====================================================================
def generate_vendors():
    vendors = [
        ("City Electric Supply", "Electrical Distributor", "Phoenix", "AZ"),
        ("Graybar Electric", "Electrical Distributor", "Tempe", "AZ"),
        ("Rexel USA", "Electrical Supply", "Scottsdale", "AZ"),
        ("CED Phoenix", "Electrical Wholesale", "Phoenix", "AZ"),
        ("Sunbelt Rentals", "Equipment Rental", "Mesa", "AZ"),
        ("United Rentals", "Equipment Rental", "Chandler", "AZ"),
        ("Grainger", "Safety & PPE Supplier", "Phoenix", "AZ"),
        ("First Alert Fire Protection", "Fire Alarm Components", "Gilbert", "AZ"),
        ("Phoenix Switchgear Inc", "Specialty Electrical", "Phoenix", "AZ"),
        ("Southwest Cable & Wire", "Cable & Wire Supplier", "Tucson", "AZ"),
    ]
    used_names = set()
    rows = []
    for co, specialty, city, state in vendors:
        first, last = generate_person_name(used_names)
        domain = co.lower().replace(" ", "").replace("&", "and")[:16] + ".com"
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
# 6. EQUIPMENT (12)
# =====================================================================
def generate_equipment():
    fleet = [
        ("Service Van #1", "vehicle", "Ford", "Transit 250", "2022"),
        ("Service Van #2", "vehicle", "Ford", "Transit 250", "2022"),
        ("Service Van #3", "vehicle", "Ford", "Transit 350", "2021"),
        ("Service Van #4", "vehicle", "Ford", "Transit 350", "2021"),
        ("Service Van #5", "vehicle", "Ford", "Transit 150", "2023"),
        ("Service Van #6", "vehicle", "Ford", "Transit 150", "2020"),
        ("Boom Lift 40ft", "aerial_lift", "JLG", "400S", "2021"),
        ("Boom Lift 60ft", "aerial_lift", "JLG", "600S", "2022"),
        ("Cable Puller", "tool", "Greenlee", "6001 Super Tugger", "2023"),
        ("Wire Bender 1/2-2in", "tool", "Ideal", "74-003", "2022"),
        ("Scissor Lift 26ft", "aerial_lift", "Genie", "GS-2646", "2021"),
        ("Portable Generator 25kW", "generator", "Kubota", "GL11000", "2023"),
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
# 7. CONTRACTS (6)
# =====================================================================
def generate_contracts():
    rows = []
    for i, p in enumerate(PROJECTS, 1):
        rows.append({
            "contract_number": f"BSE-CON-{2024 + (1 if i > 3 else 0)}-{i:03d}",
            "title": f"{p['name']} — Subcontract Agreement",
            "contract_type": "subcontract",
            "contract_amount": p["budget"],
            "start_date": p["start_date"],
            "end_date": p["end_date"],
            "status": "active",
            "project_name": p["name"],
            "party_name": p["client_name"],
            "payment_terms": "Net 30, 10% retainage",
            "scope_of_work": f"Complete electrical scope for {p['name']}",
        })
    return rows


# =====================================================================
# 8. TIME ENTRIES (~200)
# =====================================================================
ELECTRICAL_TASKS = [
    ("Conduit rough-in — EMT 3/4\" to 2\"", "26 05 00"),
    ("Wire pulling — 12AWG THHN", "26 05 19"),
    ("Wire pulling — 10AWG THHN", "26 05 19"),
    ("Wire pulling — 8AWG THHN MC cable", "26 05 19"),
    ("Panel installation — 200A main", "26 24 16"),
    ("Panel installation — 400A distribution", "26 24 16"),
    ("Breaker terminations", "26 24 16"),
    ("Fire alarm wiring — notification circuits", "28 31 00"),
    ("Fire alarm device installation", "28 31 00"),
    ("Light fixture trim-out", "26 51 00"),
    ("Recessed LED fixture installation", "26 51 00"),
    ("Emergency lighting installation", "26 51 00"),
    ("Receptacle & switch installation", "26 27 26"),
    ("Dedicated circuit rough-in — mechanical equipment", "26 05 00"),
    ("Motor connection — HVAC units", "26 29 00"),
    ("Testing & commissioning — branch circuits", "26 08 00"),
    ("Testing & commissioning — fire alarm", "28 31 00"),
    ("Ground fault testing — receptacles", "26 08 00"),
    ("Switchgear termination", "26 24 19"),
    ("Cable tray installation", "26 05 36"),
    ("Underground conduit — PVC schedule 40", "26 05 33"),
    ("Transformer connection — 480V to 208/120V", "26 22 00"),
    ("Generator connection & ATS wiring", "26 32 00"),
    ("Data/comm conduit & J-box rough-in", "27 05 00"),
    ("Temporary power setup", "26 05 00"),
]

def generate_time_entries(field_employees):
    """Generate ~200 time entries across Jan-Apr 2025."""
    rows = []

    # Filter to field workers (journeymen, apprentices, foremen)
    workers = [e for e in field_employees if e["_tag"] in ("journeyman", "apprentice", "foreman")]

    # Weight projects by completion percentage (more work on active projects)
    project_weights = [float(p["completion_pct"]) for p in PROJECTS]
    # Normalize to ensure all have some weight
    project_weights = [max(w, 5) for w in project_weights]

    start = date(2025, 1, 6)   # First Monday of Jan 2025
    end = date(2025, 4, 30)

    for _ in range(200):
        worker = random.choice(workers)
        project = random.choices(PROJECTS, weights=project_weights, k=1)[0]
        work_date = random_date_between(start, end)
        hours = random.choice([6, 7, 7, 8, 8, 8, 8, 9, 9, 10])
        task_desc, cost_code = random.choice(ELECTRICAL_TASKS)

        contact_name = f"{worker['first_name']} {worker['last_name']}"
        rows.append({
            "contact_name": contact_name,
            "project_name": project["name"],
            "entry_date": work_date.isoformat(),
            "hours": str(hours),
            "description": task_desc,
            "cost_code": cost_code,
            "status": "approved",
        })

    # Sort by date
    rows.sort(key=lambda r: r["entry_date"])
    return rows


# =====================================================================
# 9. DAILY LOGS (40)
# =====================================================================
WEATHER_PHOENIX = [
    ("Clear", "72"), ("Clear", "78"), ("Clear", "85"), ("Sunny", "88"),
    ("Sunny", "92"), ("Partly Cloudy", "80"), ("Partly Cloudy", "75"),
    ("Clear", "68"), ("Sunny", "95"), ("Hazy", "90"),
    ("Clear", "70"), ("Windy", "82"), ("Clear", "76"),
]

ELECTRICAL_WORK_DESCRIPTIONS = [
    "Conduit rough-in on floors 2-3. Wire pulling on floor 1 complete. Panel room framing inspected and approved.",
    "Continued EMT conduit installation in patient rooms wing B. Fire alarm rough-in started in corridor.",
    "Cable tray installation in mechanical room. 400A panel set in electrical room #2. Temporary power extended to east wing.",
    "Wire pulling in progress — 12AWG and 10AWG THHN for branch circuits. J-box installations on floor 4.",
    "Light fixture trim-out in finished areas. Receptacle and switch devices installed floors 1-2.",
    "Underground PVC conduit from transformer pad to main switchgear room. Concrete pour scheduled tomorrow.",
    "Fire alarm notification appliance circuit wiring. Smoke detector base installation floors 1-3.",
    "Switchgear room bus connections. Generator ATS wiring and control connections in progress.",
    "Testing and commissioning — ground fault circuit interrupters in wet locations. 100% pass rate.",
    "Panel schedule verification and breaker labeling. As-built markup for conduit routing changes on floor 2.",
    "Dedicated circuit rough-in for RTU-1 through RTU-4 on rooftop. MC cable pulled through roof penetrations.",
    "Motor connections for AHU-1 and AHU-2. Variable frequency drive wiring and programming.",
    "Emergency egress lighting installation per plan E-401. Exit sign placement verified against code.",
    "Data/telecom conduit and back-box rough-in per low-voltage drawings. Coordinated with IT contractor.",
    "Transformer pad connections — 480V primary, 208/120V secondary. Megger testing on feeders passed.",
    "Branch circuit testing — 200 circuits tested, 3 grounds found and repaired. Final device count verified.",
    "Boom lift work — high bay fixture installation in warehouse area. Safety harness required above 25ft.",
    "Cable puller setup for 500MCM feeders from MDP to sub-panel SP-2A. 350ft pull completed.",
    "Scissor lift repositioned for ceiling grid work. Troffer and lay-in fixture installation in open office.",
    "Final walk-through prep — touch-up labels, clean panels, verify receptacle counts against drawings.",
]

def generate_daily_logs():
    """40 daily logs for the 2 busiest projects over Jan-Feb 2025."""
    rows = []
    busy_projects = [PROJECTS[0], PROJECTS[2]]  # Scottsdale Medical, Tempe Mixed-Use

    for proj in busy_projects:
        d = date(2025, 1, 6)
        count = 0
        while count < 20 and d <= date(2025, 2, 28):
            if d.weekday() < 5:
                weather, temp = random.choice(WEATHER_PHOENIX)
                work = random.choice(ELECTRICAL_WORK_DESCRIPTIONS)
                incident = random.choice(["None", "None", "None", "None", "None",
                                          "Near-miss: unsecured ladder reported and corrected"])
                delay = random.choice(["None", "None", "None", "None",
                                       "Material delivery delayed — conduit fittings",
                                       "Waiting on GC for ceiling access",
                                       "RFI response pending — outlet locations"])
                rows.append({
                    "log_date": d.isoformat(),
                    "weather_conditions": weather,
                    "temperature": temp,
                    "work_performed": work,
                    "safety_incidents": incident,
                    "delays": delay,
                    "project_name": proj["name"],
                    "status": "submitted",
                })
                count += 1
            d += timedelta(days=1)

    rows.sort(key=lambda r: (r["log_date"], r["project_name"]))
    return rows


# =====================================================================
# 10. SAFETY: INCIDENTS (5), INSPECTIONS (10), TOOLBOX TALKS (12)
# =====================================================================
def generate_safety_incidents():
    incidents = [
        {
            "title": "Arc Flash Near-Miss — Panel SP-2A",
            "description": "Electrician opened energized panel without proper PPE. No injury. Lockout/tagout procedure was not followed. Work stopped, re-training conducted on-site.",
            "incident_type": "near_miss",
            "severity": "high",
            "incident_date": "2025-01-22",
            "project_name": PROJECTS[0]["name"],
            "osha_recordable": "no",
            "status": "closed",
        },
        {
            "title": "Ladder Fall — Minor Bruising",
            "description": "Apprentice slipped on wet floor while descending 8ft A-frame ladder. Minor bruising to left knee. First aid administered on-site. Floor housekeeping issue corrected.",
            "incident_type": "injury",
            "severity": "low",
            "incident_date": "2025-02-05",
            "project_name": PROJECTS[2]["name"],
            "osha_recordable": "no",
            "status": "closed",
        },
        {
            "title": "Electrical Shock — First Aid Only",
            "description": "Journeyman received minor 120V shock while testing receptacle circuit. Voltage tester was defective. Employee evaluated by on-site medic, cleared to work. Tester replaced.",
            "incident_type": "injury",
            "severity": "medium",
            "incident_date": "2025-02-19",
            "project_name": PROJECTS[1]["name"],
            "osha_recordable": "no",
            "status": "closed",
        },
        {
            "title": "Laceration — Conduit Cutting",
            "description": "Foreman sustained 1-inch cut on right hand from burr on freshly-cut EMT conduit. Wound cleaned and bandaged. Glove use reinforced at next toolbox talk.",
            "incident_type": "injury",
            "severity": "low",
            "incident_date": "2025-03-10",
            "project_name": PROJECTS[0]["name"],
            "osha_recordable": "no",
            "status": "closed",
        },
        {
            "title": "Vehicle Backing Incident — Parking Lot",
            "description": "Service van #3 backed into concrete bollard in project parking lot. Minor bumper damage, no injuries. Driver retrained on backing procedures. Spotter required for all backing.",
            "incident_type": "property_damage",
            "severity": "low",
            "incident_date": "2025-03-28",
            "project_name": PROJECTS[3]["name"],
            "osha_recordable": "no",
            "status": "reported",
        },
    ]
    return incidents


def generate_safety_inspections(field_employees):
    """10 monthly electrical safety inspections across projects."""
    safety_mgr = [e for e in field_employees if e["_tag"] == "safety"]
    inspector_name = f"{safety_mgr[0]['first_name']} {safety_mgr[0]['last_name']}" if safety_mgr else "Safety Manager"

    inspections = []
    inspection_types = [
        ("Electrical Safety — Lockout/Tagout Compliance", "site_safety",
         "All LOTO procedures followed. 2 lock boxes need replacement.",
         "Replace damaged lock boxes by end of week."),
        ("PPE Compliance — Electrical Workers", "site_safety",
         "98% compliance. 1 apprentice missing arc-rated shirt.",
         "Provide replacement arc-rated clothing. Verbal warning issued."),
        ("Ladder & Fall Protection Audit", "site_safety",
         "All ladders inspected, 1 fiberglass ladder cracked. Harness inspection current.",
         "Remove damaged ladder from service. Order replacement."),
        ("Electrical Panel Room Safety", "site_safety",
         "Arc flash labels current. 36-inch clearance maintained. Emergency lighting functional.",
         "None required."),
        ("Tool & Equipment Condition Inspection", "site_safety",
         "3 voltage testers past calibration date. 1 drill chuck damaged.",
         "Send testers for recalibration. Replace damaged drill."),
    ]

    # 2 inspection rounds across 5 project/type combos = 10 inspections
    months_used = [("2025-01-15", PROJECTS[0]), ("2025-01-22", PROJECTS[2]),
                   ("2025-02-12", PROJECTS[1]), ("2025-02-19", PROJECTS[0]),
                   ("2025-03-05", PROJECTS[3]), ("2025-03-12", PROJECTS[2]),
                   ("2025-03-26", PROJECTS[4]), ("2025-04-02", PROJECTS[0]),
                   ("2025-04-09", PROJECTS[1]), ("2025-04-16", PROJECTS[5])]

    for i, (insp_date, proj) in enumerate(months_used):
        insp_type = inspection_types[i % len(inspection_types)]
        score = random.randint(82, 100)
        inspections.append({
            "inspection_type": insp_type[1],
            "inspection_date": insp_date,
            "score": str(score),
            "findings": insp_type[2],
            "corrective_actions": insp_type[3],
            "status": "completed",
            "project_name": proj["name"],
        })

    return inspections


def generate_toolbox_talks(field_employees):
    """12 weekly toolbox talks."""
    foremen = [e for e in field_employees if e["_tag"] == "foreman"]
    safety_mgr = [e for e in field_employees if e["_tag"] == "safety"]
    presenters = foremen + safety_mgr

    topics = [
        ("Arc Flash Awareness & Prevention", "Electrical Safety",
         "Review of NFPA 70E arc flash boundaries, proper PPE selection, and incident case studies."),
        ("Lockout/Tagout Procedures", "Electrical Safety",
         "Step-by-step LOTO procedure review. Group lock box use. Verification testing requirements."),
        ("Ladder Safety — Electrical Work", "Fall Protection",
         "Fiberglass vs aluminum ladders near energized equipment. 3-point contact. Setup angles."),
        ("Personal Protective Equipment Requirements", "PPE",
         "Arc-rated clothing, voltage-rated gloves, safety glasses, hard hats. Inspection of PPE condition."),
        ("Trenching & Excavation Safety", "Excavation Safety",
         "Underground conduit installation safety. Utility locates, shoring requirements, competent person."),
        ("Heat Stress Prevention", "Environmental",
         "Phoenix summer heat protocols. Hydration schedule. Signs of heat exhaustion. Buddy system."),
        ("Electrical Shock Prevention", "Electrical Safety",
         "Test-before-touch procedures. Proper use of voltage testers. GFI protection requirements."),
        ("Fire Extinguisher Use", "Fire Safety",
         "PASS technique review. Extinguisher types for electrical fires (Class C). Locations on-site."),
        ("Housekeeping & Material Storage", "General Safety",
         "Wire spool storage, conduit stacking, scrap disposal. Clear walking paths and panel access."),
        ("Aerial Lift Safety", "Fall Protection",
         "Pre-use inspection checklist. Harness attachment points. Wind speed limitations. Ground personnel."),
        ("Hand & Power Tool Safety", "Tool Safety",
         "Inspection before use. Proper drill, saw, and bender operation. Cord management on job sites."),
        ("Communication & Coordination with Other Trades", "General Safety",
         "Hot work permits. Overhead work notifications. Shared access areas. Radio communication protocols."),
    ]

    rows = []
    talk_date = date(2025, 1, 6)  # First Monday
    for i, (title, topic, desc) in enumerate(topics):
        presenter = presenters[i % len(presenters)]
        attendees = random.randint(10, 18)
        proj = PROJECTS[i % len(PROJECTS)]
        rows.append({
            "title": title,
            "topic": topic,
            "description": desc,
            "scheduled_date": talk_date.isoformat(),
            "attendees_count": str(attendees),
            "project_name": proj["name"],
            "status": "completed",
            "notes": f"Presented by {presenter['first_name']} {presenter['last_name']}",
        })
        talk_date += timedelta(days=7)

    return rows


# =====================================================================
# 11. CERTIFICATIONS (25)
# =====================================================================
def generate_certifications(field_employees):
    """Generate certifications for field employees."""
    rows = []

    journeymen = [e for e in field_employees if e["_tag"] == "journeyman"]
    apprentices = [e for e in field_employees if e["_tag"] == "apprentice"]
    foremen = [e for e in field_employees if e["_tag"] == "foreman"]
    all_field = journeymen + apprentices + foremen
    # Safety manager too
    safety_mgr = [e for e in field_employees if e["_tag"] == "safety"]
    all_field_plus_safety = all_field + safety_mgr

    # Journeyman Electrician License (journeymen + foremen = 11)
    for emp in journeymen + foremen:
        cert_num = f"AZ-JE-{random.randint(100000, 999999)}"
        issue = date(random.randint(2015, 2023), random.randint(1, 12), random.randint(1, 28))
        expiry = date(issue.year + 3, issue.month, min(issue.day, 28))
        if expiry < date(2025, 1, 1):
            # Renew
            expiry = date(expiry.year + 3, expiry.month, min(expiry.day, 28))
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "Journeyman Electrician License - Arizona",
            "cert_type": "license",
            "issuing_authority": "Arizona Registrar of Contractors",
            "cert_number": cert_num,
            "issued_date": issue.isoformat(),
            "expiry_date": expiry.isoformat(),
            "status": "active",
        })

    # OSHA 30-Hour — all field + safety (21 people, but we only pick 20 to keep ~25 total certs controlled)
    # Actually let's do selective certs to hit ~25 total
    # Already have 11 from journeyman license
    # Need ~14 more certs total

    # OSHA 30 for foremen and safety manager (4 people)
    for emp in foremen + safety_mgr:
        cert_num = f"OSHA30-{random.randint(100000, 999999)}"
        issue = date(random.randint(2021, 2024), random.randint(1, 12), random.randint(1, 28))
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "OSHA 30-Hour Construction Safety",
            "cert_type": "certification",
            "issuing_authority": "OSHA Training Institute",
            "cert_number": cert_num,
            "issued_date": issue.isoformat(),
            "expiry_date": "",  # OSHA 30 does not expire
            "status": "active",
        })

    # Arc Flash Training (foremen + 3 journeymen = 6 people)
    arc_flash_group = foremen + random.sample(journeymen, min(3, len(journeymen)))
    for emp in arc_flash_group:
        cert_num = f"ARC-{random.randint(10000, 99999)}"
        issue = date(2024, random.randint(1, 12), random.randint(1, 28))
        expiry = date(2025, issue.month, min(issue.day, 28))
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "NFPA 70E Arc Flash Safety Training",
            "cert_type": "certification",
            "issuing_authority": "National Fire Protection Association",
            "cert_number": cert_num,
            "issued_date": issue.isoformat(),
            "expiry_date": expiry.isoformat(),
            "status": "active",
        })

    # Aerial Lift Certification (3 people — those who use boom/scissor lifts)
    lift_operators = random.sample(journeymen, min(3, len(journeymen)))
    for emp in lift_operators:
        cert_num = f"LIFT-{random.randint(10000, 99999)}"
        issue = date(2024, random.randint(3, 10), random.randint(1, 28))
        expiry = date(2027, issue.month, min(issue.day, 28))
        rows.append({
            "contact_name": f"{emp['first_name']} {emp['last_name']}",
            "cert_name": "Aerial Lift Operator Certification",
            "cert_type": "certification",
            "issuing_authority": "Sunbelt Rentals Safety Training",
            "cert_number": cert_num,
            "issued_date": issue.isoformat(),
            "expiry_date": expiry.isoformat(),
            "status": "active",
        })

    return rows


# =====================================================================
# 12. INVOICES (~60)
# =====================================================================
VENDOR_NAMES = [
    "City Electric Supply",
    "Graybar Electric",
    "Rexel USA",
    "CED Phoenix",
]

MATERIAL_GL_ACCOUNTS = ["5000", "5010", "5020", "5030", "5040"]

def generate_invoices():
    """
    Generate ~130 invoices (full 12-month financial year).
    - 5 OB receivable (prior progress billings, gl_account=3010, status=paid, dated 2024-12-31)
    - 5 OB payable (prior vendor bills, gl_account=3010, status=paid, dated 2024-12-31)
    - 72 receivable (monthly progress billings to GCs, 12 months x 6 projects)
    - 48 payable (monthly material purchases, 12 months x 4 vendors)
    """
    rows = []

    # ── OB Receivable (5) — prior year progress billings ──
    ob_recv_amounts = [2_000_000, 1_800_000, 1_500_000, 1_200_000, 500_000]
    for i, amt in enumerate(ob_recv_amounts):
        rows.append({
            "invoice_number": f"BSE-OB-R{i+1:02d}",
            "invoice_type": "receivable",
            "invoice_date": "2024-12-31",
            "due_date": "2024-12-31",
            "amount": fmt(amt),
            "tax_amount": "",
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
            "status": "paid",
            "description": f"Opening balance — prior progress billing #{i+1}",
            "project_name": PROJECTS[i]["name"],
            "client_name": PROJECTS[i]["client_name"],
            "vendor_name": "",
        })

    # ── OB Payable (5) — prior vendor bills ──
    ob_pay_amounts = [350_000, 280_000, 220_000, 180_000, 120_000]
    for i, amt in enumerate(ob_pay_amounts):
        rows.append({
            "invoice_number": f"BSE-OB-P{i+1:02d}",
            "invoice_type": "payable",
            "invoice_date": "2024-12-31",
            "due_date": "2024-12-31",
            "amount": fmt(amt),
            "tax_amount": "",
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
            "status": "paid",
            "description": f"Opening balance — prior material purchase #{i+1}",
            "project_name": PROJECTS[i % len(PROJECTS)]["name"],
            "client_name": "",
            "vendor_name": VENDOR_NAMES[i % len(VENDOR_NAMES)],
        })

    # ── Monthly Receivable Invoices (72) — 12 months x 6 projects ──
    # Revenue: $18,000,000 total across 12 months weighted by season
    # Electrical subs busier spring/summer in Phoenix (construction season)
    seasonal_weights = [0.8, 0.85, 0.95, 1.0, 1.1, 1.15, 1.15, 1.1, 1.0, 0.95, 0.85, 0.8]
    sw_sum = sum(seasonal_weights)
    seasonal_weights = [w * 12 / sw_sum for w in seasonal_weights]

    total_budget = sum(float(p["budget"]) for p in PROJECTS)

    # Pre-calculate exact target per project per month so we can adjust last month
    # to hit exact revenue total
    recv_running = 0.0
    recv_rows_temp = []

    for m in range(12):
        month_end = MONTH_ENDS[m]
        # Due date is 30 days after month end (next month end)
        due_date = MONTH_ENDS[min(m + 1, 11)]
        # First 10 months paid, last 2 pending (Nov, Dec)
        status = "paid" if m < 10 else "pending"

        for proj_idx, proj in enumerate(PROJECTS):
            weight = float(proj["budget"]) / total_budget
            base = REVENUE_TOTAL * weight * seasonal_weights[m] / 12
            # Small random variation
            variation = random.uniform(0.97, 1.03)
            amount = round(base * variation, 2)
            recv_running += amount

            retainage = round(amount * 0.10, 2)

            recv_rows_temp.append({
                "invoice_number": f"BSE-{month_end[:7].replace('-','')}-R{proj_idx+1:02d}",
                "invoice_type": "receivable",
                "invoice_date": month_end,
                "due_date": due_date,
                "amount": amount,  # Will be formatted later
                "tax_amount": "",
                "gl_account": "4000",
                "retainage_pct": "10",
                "retainage_held": retainage,
                "status": status,
                "description": f"Progress billing — {proj['name']} — {MONTH_NAMES[m]}",
                "project_name": proj["name"],
                "client_name": proj["client_name"],
                "vendor_name": "",
                "_month": m,
                "_proj_idx": proj_idx,
            })

    # Adjust last invoice to hit exact revenue target
    diff = REVENUE_TOTAL - recv_running
    recv_rows_temp[-1]["amount"] = round(recv_rows_temp[-1]["amount"] + diff, 2)
    recv_rows_temp[-1]["retainage_held"] = round(recv_rows_temp[-1]["amount"] * 0.10, 2)

    recv_total = sum(r["amount"] for r in recv_rows_temp)

    for r in recv_rows_temp:
        rows.append({
            "invoice_number": r["invoice_number"],
            "invoice_type": r["invoice_type"],
            "invoice_date": r["invoice_date"],
            "due_date": r["due_date"],
            "amount": fmt(r["amount"]),
            "tax_amount": r["tax_amount"],
            "gl_account": r["gl_account"],
            "retainage_pct": r["retainage_pct"],
            "retainage_held": fmt(r["retainage_held"]),
            "status": r["status"],
            "description": r["description"],
            "project_name": r["project_name"],
            "client_name": r["client_name"],
            "vendor_name": r["vendor_name"],
        })

    # ── Monthly Payable Invoices (48) — 12 months x 4 vendors ──
    # Total materials: $4,200,000 across 12 months
    monthly_material = MATERIAL_INVOICE_TOTAL / 12

    material_descriptions = {
        "5000": "Electrical wire & cable — THHN, MC, NM-B",
        "5010": "Conduit & fittings — EMT, PVC, flex",
        "5020": "Panels, breakers & switchgear components",
        "5030": "Lighting fixtures — LED troffers, cans, emergency",
        "5040": "Fire alarm materials — devices, wire, panels",
    }

    pay_running = 0.0
    pay_rows_temp = []

    for m in range(12):
        inv_date = f"2025-{MONTHS[m]}-15"
        due_date = MONTH_ENDS[m]
        # First 10 months paid, last 2 pending
        status = "paid" if m < 10 else "pending"

        vendor_shares = [random.uniform(0.8, 1.2) for _ in range(4)]
        share_total = sum(vendor_shares)
        for v_idx, vendor in enumerate(VENDOR_NAMES):
            amount = round(monthly_material * vendor_shares[v_idx] / share_total, 2)
            pay_running += amount
            gl_acct = MATERIAL_GL_ACCOUNTS[v_idx % len(MATERIAL_GL_ACCOUNTS)]

            pay_rows_temp.append({
                "invoice_number": f"BSE-{MONTHS[m]}-P{v_idx+1:02d}",
                "invoice_type": "payable",
                "invoice_date": inv_date,
                "due_date": due_date,
                "amount": amount,
                "tax_amount": "",
                "gl_account": gl_acct,
                "retainage_pct": "0",
                "retainage_held": "0",
                "status": status,
                "description": material_descriptions.get(gl_acct, "Electrical materials"),
                "project_name": PROJECTS[m % len(PROJECTS)]["name"],
                "client_name": "",
                "vendor_name": vendor,
            })

    # Adjust last payable invoice to hit exact material total
    diff = MATERIAL_INVOICE_TOTAL - pay_running
    pay_rows_temp[-1]["amount"] = round(pay_rows_temp[-1]["amount"] + diff, 2)
    pay_total = sum(r["amount"] for r in pay_rows_temp)

    for r in pay_rows_temp:
        rows.append({
            "invoice_number": r["invoice_number"],
            "invoice_type": r["invoice_type"],
            "invoice_date": r["invoice_date"],
            "due_date": r["due_date"],
            "amount": fmt(r["amount"]),
            "tax_amount": r["tax_amount"],
            "gl_account": r["gl_account"],
            "retainage_pct": r["retainage_pct"],
            "retainage_held": r["retainage_held"],
            "status": r["status"],
            "description": r["description"],
            "project_name": r["project_name"],
            "client_name": r["client_name"],
            "vendor_name": r["vendor_name"],
        })

    print(f"\n  Invoice totals:")
    print(f"    Receivable (12 months): ${recv_total:,.2f}")
    print(f"    Payable (12 months):    ${pay_total:,.2f}")

    return rows


# =====================================================================
# 13. JOURNAL ENTRIES (~150 lines)
# =====================================================================
def generate_journal_entries():
    """
    Generate journal entries for non-invoice items.
    NEVER touch accounts 1010, 1020, 2000, 2010 (handled by invoice auto-JEs).

    JE-driven costs:
      Direct Labor Journeymen (5100): $5,100,000
      Direct Labor Apprentices (5110): $2,400,000
      Labor Payroll Taxes (5120):      $1,500,000
      Tool & Equipment Rental (5130):    $600,000
      Officer Salaries (6000):           $540,000
      Office Staff (6010):               $360,000
      G&A Payroll Taxes (6020):          $180,000
      Office Rent & Utilities (6030):    $156,000
      Insurance GL & WC (6040):          $624,000
      Vehicle Expenses (6050):           $300,000
      Professional Services (6060):      $120,000
      IT & Software (6070):               $90,000
      Depreciation - Vehicles (6100):    $240,000
      Interest Expense (7000):            $80,000
    """
    rows = []
    je_num = 1

    def add_je(entry_number, entry_date, description, lines):
        """Add a journal entry with multiple lines."""
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

    # ── 1. Opening Balance (2025-01-01) ──
    # Assets
    ob_cash = 1_155_000
    ob_prepaid = 180_000
    ob_vehicles = 1_800_000
    ob_accum_dep = 720_000  # credit normal

    # Liabilities (credit normal)
    ob_accrued_payroll = 750_000
    ob_accrued_expenses = 150_000
    ob_vehicle_loans = 480_000
    ob_loc = 350_000

    # Equity (credit normal)
    ob_owners_capital = 500_000

    # Retained Earnings is the PLUG
    total_dr = ob_cash + ob_prepaid + ob_vehicles
    total_cr = ob_accum_dep + ob_accrued_payroll + ob_accrued_expenses + ob_vehicle_loans + ob_loc + ob_owners_capital
    ob_retained_earnings = total_dr - total_cr  # plug

    ob_lines = [
        (1000, ob_cash, 0, "Cash - Operating"),
        (1040, ob_prepaid, 0, "Prepaid expenses"),
        (1100, ob_vehicles, 0, "Vehicles & equipment at cost"),
        (1110, 0, ob_accum_dep, "Accumulated depreciation"),
        (2020, 0, ob_accrued_payroll, "Accrued payroll"),
        (2030, 0, ob_accrued_expenses, "Accrued expenses"),
        (2100, 0, ob_vehicle_loans, "Vehicle loans"),
        (2200, 0, ob_loc, "Line of credit"),
        (3000, 0, ob_owners_capital, "Owners capital"),
        (3010, 0, ob_retained_earnings, "Retained earnings — plug"),
    ]
    add_je(f"BSE-OB-001", "2025-01-01", "Opening Balances — BrightSpark Electrical", ob_lines)
    je_num += 1

    # ── 2. Monthly Operating JEs (12 months) ──
    # Seasonal weighting — electrical subs busier in spring/summer in Phoenix
    seasonal_weights = [0.8, 0.85, 0.95, 1.0, 1.1, 1.15, 1.15, 1.1, 1.0, 0.95, 0.85, 0.8]
    # Normalize to sum to 12
    sw_sum = sum(seasonal_weights)
    seasonal_weights = [w * 12 / sw_sum for w in seasonal_weights]

    monthly_5100 = allocate_to_months(DIRECT_LABOR_JOURNEYMEN, seasonal_weights)
    monthly_5110 = allocate_to_months(DIRECT_LABOR_APPRENTICES, seasonal_weights)
    monthly_5120 = allocate_to_months(LABOR_PAYROLL_TAXES, seasonal_weights)
    monthly_6000 = allocate_to_months(OFFICER_SALARIES)
    monthly_6010 = allocate_to_months(OFFICE_STAFF_SALARIES)
    monthly_6020 = allocate_to_months(GA_PAYROLL_TAXES)
    monthly_5130 = allocate_to_months(TOOL_EQUIPMENT_RENTAL, seasonal_weights)
    monthly_6030 = allocate_to_months(OFFICE_RENT_UTILITIES)
    monthly_6040 = allocate_to_months(INSURANCE_GL_WC)
    monthly_6050 = allocate_to_months(VEHICLE_EXPENSES)
    monthly_6060 = allocate_to_months(PROFESSIONAL_SERVICES)
    monthly_6070 = allocate_to_months(IT_SOFTWARE)
    monthly_7000 = allocate_to_months(INTEREST_EXPENSE)

    # Depreciation is quarterly
    quarterly_dep = round(DEPRECIATION_VEHICLES / 4, 2)

    for m in range(12):
        month_end = MONTH_ENDS[m]
        month_name = MONTH_NAMES[m]

        # ── Payroll accrual ──
        payroll_total = (
            monthly_5100[m] + monthly_5110[m] + monthly_5120[m]
            + monthly_6000[m] + monthly_6010[m] + monthly_6020[m]
        )
        add_je(
            f"BSE-PAY-{MONTHS[m]}",
            month_end,
            f"Payroll accrual — {month_name} 2025",
            [
                (5100, monthly_5100[m], 0, f"Direct labor - journeymen {month_name}"),
                (5110, monthly_5110[m], 0, f"Direct labor - apprentices {month_name}"),
                (5120, monthly_5120[m], 0, f"Labor payroll taxes {month_name}"),
                (6000, monthly_6000[m], 0, f"Officer salaries {month_name}"),
                (6010, monthly_6010[m], 0, f"Office staff salaries {month_name}"),
                (6020, monthly_6020[m], 0, f"G&A payroll taxes {month_name}"),
                (2020, 0, payroll_total, f"Accrued payroll {month_name}"),
            ],
        )
        je_num += 1

        # ── Payroll disbursement ──
        add_je(
            f"BSE-PDIS-{MONTHS[m]}",
            month_end,
            f"Payroll disbursement — {month_name} 2025",
            [
                (2020, payroll_total, 0, f"Clear accrued payroll {month_name}"),
                (1000, 0, payroll_total, f"Cash disbursement - payroll {month_name}"),
            ],
        )
        je_num += 1

        # ── Equipment rental ──
        add_je(
            f"BSE-RENT-{MONTHS[m]}",
            month_end,
            f"Tool & equipment rental — {month_name} 2025",
            [
                (5130, monthly_5130[m], 0, f"Tool & equipment rental {month_name}"),
                (1000, 0, monthly_5130[m], f"Cash - rental payments {month_name}"),
            ],
        )
        je_num += 1

        # ── Overhead — office, insurance, vehicles, professional, IT ──
        oh_total = (
            monthly_6030[m] + monthly_6040[m] + monthly_6050[m]
            + monthly_6060[m] + monthly_6070[m]
        )
        add_je(
            f"BSE-OH-{MONTHS[m]}",
            month_end,
            f"Overhead expenses — {month_name} 2025",
            [
                (6030, monthly_6030[m], 0, f"Office rent & utilities {month_name}"),
                (6040, monthly_6040[m], 0, f"Insurance GL & WC {month_name}"),
                (6050, monthly_6050[m], 0, f"Vehicle expenses {month_name}"),
                (6060, monthly_6060[m], 0, f"Professional services {month_name}"),
                (6070, monthly_6070[m], 0, f"IT & software {month_name}"),
                (1000, 0, oh_total, f"Cash - overhead payments {month_name}"),
            ],
        )
        je_num += 1

        # ── Interest ──
        add_je(
            f"BSE-INT-{MONTHS[m]}",
            month_end,
            f"Interest expense — {month_name} 2025",
            [
                (7000, monthly_7000[m], 0, f"Interest on LOC & vehicle loans {month_name}"),
                (1000, 0, monthly_7000[m], f"Cash - interest payment {month_name}"),
            ],
        )
        je_num += 1

        # ── Depreciation (quarterly: March, June, September, December) ──
        if m in (2, 5, 8, 11):
            qtr = {2: "Q1", 5: "Q2", 8: "Q3", 11: "Q4"}[m]
            dep_amount = quarterly_dep
            # Last quarter absorbs rounding
            if m == 11:
                dep_amount = DEPRECIATION_VEHICLES - quarterly_dep * 3
            add_je(
                f"BSE-DEP-{qtr}",
                month_end,
                f"Vehicle depreciation — {qtr} 2025",
                [
                    (6100, dep_amount, 0, f"Depreciation - vehicles {qtr}"),
                    (1110, 0, dep_amount, f"Accumulated depreciation {qtr}"),
                ],
            )
            je_num += 1

    return rows


# =====================================================================
# MAIN — Build & Verify
# =====================================================================
def main():
    print("=" * 70)
    print("BrightSpark Electrical Contractors Inc — Mock Data Generator")
    print("=" * 70)

    # Generate all sheets
    coa_rows, account_names = generate_chart_of_accounts()
    bank_rows = generate_bank_accounts()
    project_rows = generate_projects()
    contact_rows, field_employees, office_employees, gc_contacts = generate_contacts()
    vendor_rows = generate_vendors()
    equipment_rows = generate_equipment()
    contract_rows = generate_contracts()
    time_entry_rows = generate_time_entries(field_employees)
    daily_log_rows = generate_daily_logs()
    safety_incident_rows = generate_safety_incidents()
    safety_inspection_rows = generate_safety_inspections(field_employees)
    toolbox_talk_rows = generate_toolbox_talks(field_employees)
    certification_rows = generate_certifications(field_employees)
    invoice_rows = generate_invoices()
    je_rows = generate_journal_entries()

    # Assemble all sheets
    all_sheets = {
        "chart_of_accounts": coa_rows,
        "bank_accounts": bank_rows,
        "projects": project_rows,
        "contacts": contact_rows,
        "vendors": vendor_rows,
        "equipment": equipment_rows,
        "contracts": contract_rows,
        "invoices": invoice_rows,
        "journal_entries": je_rows,
        "time_entries": time_entry_rows,
        "daily_logs": daily_log_rows,
        "safety_incidents": safety_incident_rows,
        "safety_inspections": safety_inspection_rows,
        "toolbox_talks": toolbox_talk_rows,
        "certifications": certification_rows,
    }

    # Count total rows
    total = sum(len(v) for v in all_sheets.values())
    print(f"\nGenerating {total} total rows across {len(all_sheets)} sheets...\n")

    # Build XLSX
    build_xlsx(all_sheets, OUTPUT_FILE)

    # Financial verification
    verify_financials(
        je_rows,
        invoice_rows,
        target_ni=NET_INCOME_TARGET,
        account_names=account_names,
    )

    print(f"\nDone! Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
