#!/usr/bin/env python3
"""
Whitmore + Associates Architecture - A/E Firm Mock Data Generator
=================================================================
Design firm operating on a billable-hours model. No equipment, no field ops.

Profile:
  - Whitmore + Associates Architecture, Portland, OR
  - ~$12M revenue (design fees $11M + reimbursables $1M)
  - ~$1.4M net income
  - 15 staff, 8 active design projects
  - ~500 total rows across 15 sheets

Revenue breakdown (through receivable invoices):
  - Design Fee Revenue (4000):      ~$9,000,000
  - Engineering Fee Revenue (4010):  ~$1,500,000
  - Reimbursable Revenue (4020):       ~$500,000
  - Construction Admin Revenue (4030):~$1,000,000
  Total:                             ~$12,000,000

Cost breakdown:
  - Staff salaries & benefits (JE):    $8,040,000
  - Subconsultant fees (invoices):       $800,000
  - Overhead (JE):                     $1,720,000
  Total:                              $10,560,000

Net Income: ~$1,440,000

Sheets produced:
   1. Chart of Accounts   (37 rows)
   2. Bank Accounts       (2 rows)
   3. Projects            (8 rows)
   4. Contacts            (25 rows)
   5. Vendors             (8 rows)
   6. Phases              (34 rows)
   7. Contracts           (8 rows)
   8. Time Entries        (250 rows)
   9. RFIs               (20 rows)
  10. Submittals          (15 rows)
  11. Opportunities       (5 rows)
  12. Bids               (4 rows)
  13. Estimates           (8 rows)
  14. Invoices            (~154 rows)
  15. Journal Entries     (~269 lines)

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
random.seed(700)

# ── Company constants ────────────────────────────────────────────────
COMPANY = "Whitmore + Associates Architecture"
DOMAIN  = "whitmoreassociates.com"
CITY    = "Portland"
STATE   = "OR"


# =====================================================================
# PROJECT DATA (used by multiple generators)
# =====================================================================
PROJECTS = [
    {
        "name": "Oregon Convention Center Expansion",
        "code": "OCE-2024",
        "project_type": "Public",
        "budget": "2400000",
        "start_date": "2024-02-01",
        "end_date": "2026-03-31",
        "completion_pct": "65",
        "client_name": "Metro Regional Government",
    },
    {
        "name": "Pearl District Mixed-Use Tower",
        "code": "PDT-2024",
        "project_type": "Mixed-Use",
        "budget": "1800000",
        "start_date": "2024-06-01",
        "end_date": "2026-01-31",
        "completion_pct": "40",
        "client_name": "Portland Development Group",
    },
    {
        "name": "OHSU Biomedical Research Lab",
        "code": "OBR-2024",
        "project_type": "Healthcare",
        "budget": "1600000",
        "start_date": "2024-09-01",
        "end_date": "2026-06-30",
        "completion_pct": "25",
        "client_name": "Oregon Health & Science University",
    },
    {
        "name": "Nike WHQ Building 5 Interior",
        "code": "NKE-2024",
        "project_type": "Corporate",
        "budget": "1200000",
        "start_date": "2024-01-15",
        "end_date": "2025-06-30",
        "completion_pct": "85",
        "client_name": "Nike Inc",
    },
    {
        "name": "PDX Airport Concourse E",
        "code": "PDX-2025",
        "project_type": "Aviation",
        "budget": "2000000",
        "start_date": "2025-01-15",
        "end_date": "2027-06-30",
        "completion_pct": "15",
        "client_name": "Port of Portland",
    },
    {
        "name": "Bend Affordable Housing",
        "code": "BAH-2025",
        "project_type": "Residential",
        "budget": "900000",
        "start_date": "2025-01-01",
        "end_date": "2026-03-31",
        "completion_pct": "35",
        "client_name": "Central Oregon Housing Authority",
    },
    {
        "name": "Eugene Public Library Renovation",
        "code": "EPL-2025",
        "project_type": "Public",
        "budget": "650000",
        "start_date": "2025-02-01",
        "end_date": "2026-01-31",
        "completion_pct": "10",
        "client_name": "City of Eugene",
    },
    {
        "name": "Willamette Valley Winery Tasting Room",
        "code": "WVW-2025",
        "project_type": "Hospitality",
        "budget": "450000",
        "start_date": "2025-03-01",
        "end_date": "2025-12-31",
        "completion_pct": "20",
        "client_name": "Domaine Drouhin Oregon",
    },
]


# =====================================================================
# 1. CHART OF ACCOUNTS (~35)
# =====================================================================
def generate_coa():
    """Professional services firm chart of accounts."""
    accounts = [
        # Assets
        ("1000", "Cash",                              "asset",     "Current Asset"),
        ("1010", "Accounts Receivable",               "asset",     "Current Asset"),
        ("1020", "Retainage Receivable",              "asset",     "Current Asset"),
        ("1040", "Prepaid Expenses",                  "asset",     "Current Asset"),
        ("1100", "Office Furniture & Equipment",      "asset",     "Fixed Asset"),
        ("1110", "Accumulated Depreciation",          "asset",     "Fixed Asset"),
        # Liabilities
        ("2000", "Accounts Payable",                  "liability", "Current Liability"),
        ("2010", "Retainage Payable",                 "liability", "Current Liability"),
        ("2020", "Accrued Payroll",                   "liability", "Current Liability"),
        ("2030", "Accrued Expenses",                  "liability", "Current Liability"),
        ("2060", "Deferred Revenue",                  "liability", "Current Liability"),
        # Equity
        ("3000", "Partners Capital",                  "equity",    "Equity"),
        ("3010", "Retained Earnings",                 "equity",    "Equity"),
        # Revenue
        ("4000", "Design Fee Revenue",                "revenue",   "Revenue"),
        ("4010", "Engineering Fee Revenue",           "revenue",   "Revenue"),
        ("4020", "Reimbursable Revenue",              "revenue",   "Revenue"),
        ("4030", "Construction Admin Revenue",        "revenue",   "Revenue"),
        # Expenses - Staff
        ("5000", "Principal Salaries",                "expense",   "Direct Cost"),
        ("5010", "Architect Salaries",                "expense",   "Direct Cost"),
        ("5020", "Engineer Salaries",                 "expense",   "Direct Cost"),
        ("5030", "Designer Salaries",                 "expense",   "Direct Cost"),
        ("5040", "Admin Staff Salaries",              "expense",   "Direct Cost"),
        ("5050", "Payroll Taxes & Benefits",          "expense",   "Direct Cost"),
        # Expenses - Subconsultants
        ("5100", "Subconsultant Fees - Structural",   "expense",   "Direct Cost"),
        ("5110", "Subconsultant Fees - MEP",          "expense",   "Direct Cost"),
        ("5120", "Subconsultant Fees - Other",        "expense",   "Direct Cost"),
        # Expenses - Overhead
        ("6000", "Office Rent",                       "expense",   "Overhead"),
        ("6010", "Office Utilities",                  "expense",   "Overhead"),
        ("6020", "Professional Liability Insurance (E&O)", "expense", "Overhead"),
        ("6030", "General Insurance",                 "expense",   "Overhead"),
        ("6040", "Software Licenses (Revit, AutoCAD)","expense",   "Overhead"),
        ("6050", "Printing & Plotting",               "expense",   "Overhead"),
        ("6060", "Travel & Expenses",                 "expense",   "Overhead"),
        ("6070", "Marketing & Proposals",             "expense",   "Overhead"),
        ("6080", "Professional Development",          "expense",   "Overhead"),
        ("6100", "Depreciation",                      "expense",   "Overhead"),
        # Other Expense
        ("7000", "Interest Expense",                  "expense",   "Other Expense"),
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
# 2. BANK ACCOUNTS (2)
# =====================================================================
def generate_bank_accounts():
    return [
        {
            "account_name":    "Operating Account",
            "bank_name":       "Umpqua Bank",
            "account_type":    "checking",
            "account_number":  "****6217",
            "routing_number":  "123205054",
            "current_balance": "1450000.00",
            "gl_account":      "1000",
        },
        {
            "account_name":    "Reserve Savings",
            "bank_name":       "Umpqua Bank",
            "account_type":    "savings",
            "account_number":  "****8403",
            "routing_number":  "123205054",
            "current_balance": "380000.00",
            "gl_account":      "1000",
        },
    ]


# =====================================================================
# 3. PROJECTS (8)
# =====================================================================
def generate_projects():
    rows = []
    portland_addresses = [
        "777 NE Martin Luther King Jr Blvd",
        "1250 NW Hoyt St",
        "3181 SW Sam Jackson Park Rd",
        "One Bowerman Dr, Beaverton",
        "7000 NE Airport Way",
        "1080 NW Newport Ave, Bend",
        "100 W 10th Ave, Eugene",
        "6750 NE Breyman Orchards Rd, Dayton",
    ]
    for i, p in enumerate(PROJECTS):
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
            "address":        portland_addresses[i],
            "city":           CITY if i < 5 else ["Bend", "Eugene", "Dayton"][i - 5],
            "state":          STATE,
            "zip":            f"97{random.randint(200, 299)}",
            "client_name":    p["client_name"],
        })
    return rows


# =====================================================================
# 4. CONTACTS (~25)
# =====================================================================
def generate_contacts():
    """
    25 contacts:
      - 15 staff: 3 principals, 5 project architects, 3 engineers,
                  2 designers, 2 admin
      - 10 external: 8 client contacts (one per project), 2 subconsultants
    """
    used_names = set()
    contacts = []

    # ── Internal staff ────────────────────────────────────────────
    staff_roles = [
        # Principals
        ("Managing Principal",    COMPANY),
        ("Design Principal",      COMPANY),
        ("Technical Principal",   COMPANY),
        # Project Architects
        ("Senior Project Architect", COMPANY),
        ("Project Architect",     COMPANY),
        ("Project Architect",     COMPANY),
        ("Project Architect",     COMPANY),
        ("Junior Architect",      COMPANY),
        # Engineers
        ("Structural Engineer",   COMPANY),
        ("MEP Coordinator",       COMPANY),
        ("Sustainability Engineer", COMPANY),
        # Designers
        ("Senior Interior Designer", COMPANY),
        ("Architectural Designer",   COMPANY),
        # Admin
        ("Office Manager",        COMPANY),
        ("Marketing Coordinator", COMPANY),
    ]

    staff_names = []
    for role, company in staff_roles:
        first, last = generate_person_name(used_names)
        staff_names.append((first, last, role))
        contacts.append({
            "first_name":   first,
            "last_name":    last,
            "email":        random_email(first, last, DOMAIN),
            "phone":        random_phone(),
            "role":         role,
            "company_name": company,
        })

    # ── Client contacts (one per project) ─────────────────────────
    client_companies = [p["client_name"] for p in PROJECTS]
    client_roles = [
        "Project Manager",
        "Development Director",
        "Facilities Director",
        "Real Estate Manager",
        "Capital Programs Manager",
        "Housing Director",
        "Library Director",
        "Owner",
    ]
    for i, client_co in enumerate(client_companies):
        first, last = generate_person_name(used_names)
        client_domain = client_co.lower().replace(" ", "").replace("&", "")[:20] + ".com"
        contacts.append({
            "first_name":   first,
            "last_name":    last,
            "email":        random_email(first, last, client_domain),
            "phone":        random_phone(),
            "role":         client_roles[i],
            "company_name": client_co,
        })

    # ── Subconsultant contacts ────────────────────────────────────
    sub_contacts = [
        ("KPFF Consulting Engineers", "Principal Engineer"),
        ("PAE Engineers",             "Project Manager"),
    ]
    for company, role in sub_contacts:
        first, last = generate_person_name(used_names)
        domain = company.lower().replace(" ", "") + ".com"
        contacts.append({
            "first_name":   first,
            "last_name":    last,
            "email":        random_email(first, last, domain),
            "phone":        random_phone(),
            "role":         role,
            "company_name": company,
        })

    return contacts, staff_names


# =====================================================================
# 5. VENDORS (8)
# =====================================================================
def generate_vendors():
    """Subconsultants + office service vendors."""
    used_names = set()
    vendors_spec = [
        ("KPFF Consulting Engineers",          "Structural Engineering",   "111 SW 5th Ave, Ste 2500"),
        ("PAE Engineers",                       "MEP Engineering",         "222 NW 5th Ave"),
        ("Lango Hansen Landscape Architects",   "Landscape Architecture",  "1515 SE Water Ave, Ste 100"),
        ("SERA Architects",                     "Joint Venture Partner",   "338 NW 5th Ave"),
        ("Bluebeam Inc",                        "Software",                "100 Oceangate, Ste 700, Long Beach, CA"),
        ("HP Inc",                              "Printing Equipment",      "1501 Page Mill Rd, Palo Alto, CA"),
        ("FedEx Office",                        "Plotting & Printing",     "921 SW Washington St"),
        ("Portland Office Space LLC",           "Office Landlord",         "1050 SW 6th Ave, Ste 1100"),
    ]

    rows = []
    for name, trade, address in vendors_spec:
        first, last = generate_person_name(used_names)
        domain = name.lower().replace(" ", "").replace(",", "").replace("&", "")[:20] + ".com"
        rows.append({
            "name":         name,
            "contact_name": f"{first} {last}",
            "email":        random_email(first, last, domain),
            "phone":        random_phone(),
            "address":      address,
            "city":         CITY,
            "state":        STATE,
            "zip":          f"97{random.randint(200, 299)}",
            "trade":        trade,
        })
    return rows


# =====================================================================
# 6. PHASES (~32)
# =====================================================================
def generate_phases():
    """4 design phases per project = 32 phases. Some get a 5th CA phase."""
    phase_defs = [
        ("Programming/Pre-Design", 0.10),
        ("Schematic Design (SD)",  0.20),
        ("Design Development (DD)", 0.30),
        ("Construction Documents (CD)", 0.40),
    ]
    ca_phase = ("Construction Administration (CA)", 0.00)

    rows = []
    for p in PROJECTS:
        pct = int(p["completion_pct"])
        proj_start = date.fromisoformat(p["start_date"])
        proj_end = date.fromisoformat(p["end_date"])
        total_days = (proj_end - proj_start).days

        # Determine which phases are active
        cumulative_effort = 0.0
        for phase_name, effort_pct in phase_defs:
            cumulative_effort += effort_pct
            # Phase start/end relative to project timeline
            phase_start_day = int((cumulative_effort - effort_pct) * total_days)
            phase_end_day = int(cumulative_effort * total_days)
            ps = proj_start + timedelta(days=phase_start_day)
            pe = proj_start + timedelta(days=phase_end_day)

            # Determine status based on completion
            threshold = cumulative_effort * 100
            if pct >= threshold:
                status = "completed"
                phase_pct = "100"
            elif pct >= (threshold - effort_pct * 100):
                status = "in_progress"
                progress_in_phase = (pct - (cumulative_effort - effort_pct) * 100) / (effort_pct * 100)
                phase_pct = str(int(progress_in_phase * 100))
            else:
                status = "not_started"
                phase_pct = "0"

            rows.append({
                "name":           phase_name,
                "project_name":   p["name"],
                "start_date":     ps.isoformat(),
                "end_date":       pe.isoformat(),
                "status":         status,
                "completion_pct": phase_pct,
            })

        # Add CA phase for projects beyond 60% completion
        if pct >= 60:
            ca_start = proj_start + timedelta(days=int(0.85 * total_days))
            rows.append({
                "name":           ca_phase[0],
                "project_name":   p["name"],
                "start_date":     ca_start.isoformat(),
                "end_date":       proj_end.isoformat(),
                "status":         "in_progress",
                "completion_pct": str(int((pct - 60) / 40 * 100)),
            })

    return rows


# =====================================================================
# 7. CONTRACTS (8)
# =====================================================================
def generate_contracts():
    """One A/E agreement per project."""
    rows = []
    for i, p in enumerate(PROJECTS, start=1):
        rows.append({
            "contract_number": f"WAA-{p['code']}",
            "title":           f"A/E Services - {p['name']}",
            "contract_type":   "professional_services",
            "amount":          p["budget"],
            "start_date":      p["start_date"],
            "end_date":        p["end_date"],
            "status":          "active",
            "project_name":    p["name"],
            "client_name":     p["client_name"],
        })
    return rows


# =====================================================================
# 8. TIME ENTRIES (~250)
# =====================================================================
def generate_time_entries(staff_names):
    """
    250 billable hour entries across Jan-Apr 2025.
    Billable hours are the firm's product.
    """
    # Staff by category from the 15 staff_names
    # Index: 0-2 = principals, 3-7 = architects, 8-10 = engineers,
    #        11-12 = designers, 13-14 = admin (admin don't bill)
    principals = [(f"{s[0]} {s[1]}", s[2]) for s in staff_names[0:3]]
    architects = [(f"{s[0]} {s[1]}", s[2]) for s in staff_names[3:8]]
    engineers  = [(f"{s[0]} {s[1]}", s[2]) for s in staff_names[8:11]]
    designers  = [(f"{s[0]} {s[1]}", s[2]) for s in staff_names[11:13]]

    # Project activity weights (higher = more time entries)
    project_weights = {
        "Oregon Convention Center Expansion":       0.20,  # 65% - very active, CA phase
        "Pearl District Mixed-Use Tower":           0.18,  # 40% - DD phase
        "OHSU Biomedical Research Lab":             0.14,  # 25% - SD phase
        "Nike WHQ Building 5 Interior":             0.15,  # 85% - CA/closeout
        "PDX Airport Concourse E":                  0.10,  # 15% - early SD
        "Bend Affordable Housing":                  0.10,  # 35% - SD/DD
        "Eugene Public Library Renovation":         0.07,  # 10% - pre-design
        "Willamette Valley Winery Tasting Room":    0.06,  # 20% - SD
    }

    project_names = list(project_weights.keys())
    project_w = list(project_weights.values())

    # Descriptions by task type
    descriptions = [
        "Schematic design development",
        "Floor plan revisions",
        "Client meeting and revisions",
        "Code review and analysis",
        "Construction document production",
        "Detail development",
        "Specification writing",
        "Submittal review",
        "RFI response",
        "Site visit and observation",
        "Coordination meeting with GC",
        "Energy modeling",
        "LEED documentation",
        "Building section development",
        "Elevation refinement",
        "Reflected ceiling plan",
        "Door and window schedule",
        "Interior finish selection",
        "Structural coordination",
        "MEP coordination drawings",
        "Life safety plan review",
        "ADA compliance review",
        "Zoning analysis",
        "Rendering production",
        "Presentation preparation",
    ]

    # Principal descriptions (more management-oriented)
    principal_descs = [
        "Client meeting and revisions",
        "Design review with project team",
        "Fee proposal development",
        "Quality assurance review",
        "Consultant coordination meeting",
        "Presentation to client board",
        "Design charette facilitation",
        "Project staffing and planning",
        "Code review and analysis",
        "Site visit and observation",
    ]

    # Cost codes by phase type
    cost_codes = [
        "01-PD", "02-SD", "03-DD", "04-CD", "05-CA",
        "06-COORD", "07-MGMT", "08-QA",
    ]

    rows = []
    # Generate weekdays in Jan-Apr 2025
    start_date = date(2025, 1, 2)  # First Thursday
    end_date = date(2025, 4, 30)

    # Build list of all weekdays in the range
    weekdays = []
    d = start_date
    while d <= end_date:
        if d.weekday() < 5:
            weekdays.append(d)
        d += timedelta(days=1)

    entry_count = 0
    target_entries = 250

    # Generate entries: iterate through weeks, assigning work per person
    while entry_count < target_entries:
        work_date = random.choice(weekdays)

        # Pick a staff member (weighted: architects produce most hours)
        staff_pool = []
        # Principals: ~15% of entries
        staff_pool += [(n, r, principal_descs) for n, r in principals] * 2
        # Architects: ~45% of entries
        staff_pool += [(n, r, descriptions) for n, r in architects] * 4
        # Engineers: ~25% of entries
        staff_pool += [(n, r, descriptions) for n, r in engineers] * 3
        # Designers: ~15% of entries
        staff_pool += [(n, r, descriptions) for n, r in designers] * 3

        person_name, role, desc_pool = random.choice(staff_pool)

        # Pick project (weighted by activity)
        project = random.choices(project_names, weights=project_w, k=1)[0]

        # Hours based on role
        if "Principal" in role:
            hours = random.choice([2, 3, 4, 4, 5, 6, 6, 7, 8])
        elif "Engineer" in role or "Coordinator" in role:
            hours = random.choice([4, 6, 6, 7, 8, 8, 8])
        elif "Designer" in role:
            hours = random.choice([4, 6, 7, 8, 8, 8])
        else:
            hours = random.choice([4, 6, 7, 8, 8, 8, 8])

        desc = random.choice(desc_pool)
        code = random.choice(cost_codes)

        rows.append({
            "contact_name": person_name,
            "project_name": project,
            "work_date":    work_date.isoformat(),
            "hours":        str(hours),
            "description":  desc,
            "cost_code":    code,
        })
        entry_count += 1

    # Sort by date for readability
    rows.sort(key=lambda r: r["work_date"])
    return rows


# =====================================================================
# 9. RFIs (20)
# =====================================================================
def generate_rfis():
    """Design clarification RFIs from contractors during CA phase."""
    # Only for projects at 65%+ (OCE-2024 at 65%, NKE-2024 at 85%)
    ca_projects = [
        ("Oregon Convention Center Expansion", "OCE"),
        ("Nike WHQ Building 5 Interior", "NKE"),
    ]

    rfi_subjects = [
        ("Ceiling height at corridor intersection",
         "What is the finished ceiling height at the intersection of corridors C-3 and C-4 on Level 2? Plans show conflicting dimensions."),
        ("Door hardware specification clarification",
         "Spec Section 08 71 00 calls for electrified mortise locks, but the hardware schedule shows cylindrical locksets. Please clarify."),
        ("Waterproofing detail at roof penetration",
         "Detail 7/A-501 shows a generic roof penetration. Please provide specific waterproofing detail for the 24-inch mechanical curb."),
        ("Curtain wall head condition at parapet",
         "Section 3/A-401 shows curtain wall terminating at the parapet. Please clarify flashing integration with roofing membrane."),
        ("Elevator lobby finish transition",
         "What is the transition detail between porcelain tile in the elevator lobby and carpet tile in the corridor?"),
        ("Structural column enclosure dimensions",
         "Column enclosures at grid lines D-3 through D-7 conflict with adjacent casework. Please confirm clearance dimensions."),
        ("Fire-rated partition penetration detail",
         "Mechanical drawings show a 12-inch duct penetrating the 2-hour rated wall at C/4. Please provide a UL-listed detail."),
        ("Accessible restroom clearance conflict",
         "The toilet room at Room 214 does not appear to meet ADA turning radius requirements with the current fixture layout."),
        ("Window sill height discrepancy",
         "The window schedule shows 42-inch sill height, but sections show 36 inches. Which is correct?"),
        ("Stair handrail mounting detail",
         "Please provide mounting detail for the wall-mounted handrail in Stair 2. Wall type is metal stud with Type X gypsum board."),
        ("Mechanical screen louver specification",
         "Drawing A-201 notes 'louver by mechanical' but no specification section is referenced. Please confirm louver material and finish."),
        ("Interior glazing frame finish",
         "Specification calls for clear anodized aluminum frames, but the interior elevation shows dark bronze. Please clarify."),
        ("Loading dock overhead door size",
         "The loading dock overhead door opening shown on plan does not match the structural opening. Please confirm dimensions."),
        ("Acoustic ceiling grid layout at soffits",
         "How should the ceiling grid align where the soffit changes from 9'-0\" to 10'-6\" at the open office area?"),
        ("Exterior stone veneer joint width",
         "What is the specified mortar joint width for the limestone veneer at the main entry? Typical vs. feature joints?"),
        ("Roof drain overflow scupper detail",
         "Please provide the overflow scupper size and detail for the low-slope roof areas at the north wing."),
        ("Electrical panel recessed depth",
         "The wall thickness at the electrical room is 4-7/8 inches. The specified panel requires 5-3/4 inch recess. Please advise."),
        ("Floor leveling tolerance at raised access floor",
         "What is the acceptable floor flatness tolerance (FF/FL) for the concrete slab receiving the raised access floor system?"),
        ("Storefront entrance vestibule dimensions",
         "The vestibule depth shown appears less than the code-required 7 feet. Please confirm dimensions."),
        ("Signage blocking location",
         "Please provide blocking locations and dimensions for the exterior building signage shown on A-201."),
    ]

    rows = []
    for i, (subject, question) in enumerate(rfi_subjects):
        proj_name, proj_code = random.choice(ca_projects)
        priority = random.choice(["high", "medium", "medium", "low"])
        base_date = date(2025, 1, 15) + timedelta(days=random.randint(0, 100))
        # Ensure weekday
        while base_date.weekday() >= 5:
            base_date += timedelta(days=1)
        due_date = base_date + timedelta(days=random.choice([7, 10, 14]))
        while due_date.weekday() >= 5:
            due_date += timedelta(days=1)

        rows.append({
            "rfi_number":   f"RFI-{proj_code}-{i+1:03d}",
            "subject":      subject,
            "question":     question,
            "priority":     priority,
            "status":       random.choice(["open", "open", "answered", "closed"]),
            "date_issued":  base_date.isoformat(),
            "due_date":     due_date.isoformat(),
            "project_name": proj_name,
        })

    return rows


# =====================================================================
# 10. SUBMITTALS (15)
# =====================================================================
def generate_submittals():
    """Review of contractor submittals during CA phase."""
    ca_projects = [
        "Oregon Convention Center Expansion",
        "Nike WHQ Building 5 Interior",
    ]

    submittal_data = [
        ("Curtain Wall Shop Drawings",          "08 44 13", "Aluminum-framed curtain wall system"),
        ("Structural Steel Shop Drawings",      "05 12 00", "Structural steel fabrication details"),
        ("Flooring Samples",                    "09 65 00", "Resilient and carpet tile samples"),
        ("Light Fixture Cut Sheets",            "26 51 00", "Interior lighting fixture submittals"),
        ("Elevator Shop Drawings",              "14 21 00", "Traction passenger elevator"),
        ("Roofing System Submittal",            "07 52 00", "Modified bitumen roofing system"),
        ("Mechanical Equipment Submittals",     "23 05 00", "AHU and VRF equipment data"),
        ("Fire Sprinkler Shop Drawings",        "21 13 13", "Wet pipe sprinkler layout"),
        ("Acoustical Ceiling Tile Samples",     "09 51 00", "Mineral fiber ceiling tile and grid"),
        ("Plumbing Fixture Cut Sheets",         "22 40 00", "Lavatory, water closet, and urinal"),
        ("Door Hardware Schedule",              "08 71 00", "Mortise lockset and closer submittals"),
        ("Waterproofing Membrane Submittal",    "07 10 00", "Below-grade waterproofing system"),
        ("Metal Panel System Shop Drawings",    "07 42 43", "Insulated metal panel system"),
        ("Interior Stone Samples",              "09 63 00", "Granite and marble finish samples"),
        ("Site Concrete Mix Design",            "03 30 00", "Concrete mix proportions and test data"),
    ]

    rows = []
    for i, (title, spec_section, desc) in enumerate(submittal_data):
        proj = random.choice(ca_projects)
        sub_date = date(2025, 1, 10) + timedelta(days=random.randint(0, 90))
        while sub_date.weekday() >= 5:
            sub_date += timedelta(days=1)
        due_date = sub_date + timedelta(days=random.choice([10, 14, 14, 21]))
        while due_date.weekday() >= 5:
            due_date += timedelta(days=1)

        status = random.choice([
            "pending_review", "pending_review", "approved",
            "approved_as_noted", "revise_and_resubmit",
        ])

        rows.append({
            "submittal_number": f"SUB-{i+1:03d}",
            "title":            title,
            "description":      desc,
            "spec_section":     spec_section,
            "status":           status,
            "date_submitted":   sub_date.isoformat(),
            "due_date":         due_date.isoformat(),
            "project_name":     proj,
        })

    return rows


# =====================================================================
# 11. OPPORTUNITIES (5)
# =====================================================================
def generate_opportunities():
    """New project pursuits in the pipeline."""
    opps = [
        {
            "title":               "Portland Waterfront Mixed-Use Development",
            "client_name":         "Zidell Yards LLC",
            "estimated_value":     "3200000",
            "probability":         "60",
            "expected_close_date": "2025-06-30",
            "status":              "proposal",
            "description":         "8-story mixed-use development on the South Waterfront with ground-floor retail, office, and 180 residential units.",
        },
        {
            "title":               "Multnomah County Courthouse Renovation",
            "client_name":         "Multnomah County Facilities",
            "estimated_value":     "1800000",
            "probability":         "40",
            "expected_close_date": "2025-08-15",
            "status":              "qualification",
            "description":         "Historic courthouse renovation including seismic upgrade, ADA improvements, and courtroom modernization.",
        },
        {
            "title":               "Tillamook Creamery Visitor Center",
            "client_name":         "Tillamook County Creamery Association",
            "estimated_value":     "900000",
            "probability":         "75",
            "expected_close_date": "2025-05-15",
            "status":              "shortlisted",
            "description":         "New 25,000 SF visitor center and tasting room with production viewing gallery.",
        },
        {
            "title":               "Reed College Science Complex",
            "client_name":         "Reed College",
            "estimated_value":     "2500000",
            "probability":         "30",
            "expected_close_date": "2025-09-30",
            "status":              "lead",
            "description":         "New 60,000 SF science building with wet labs, teaching spaces, and faculty offices.",
        },
        {
            "title":               "Deschutes Brewery Taproom Expansion",
            "client_name":         "Deschutes Brewery",
            "estimated_value":     "600000",
            "probability":         "50",
            "expected_close_date": "2025-07-01",
            "status":              "proposal",
            "description":         "Expansion of the Pearl District taproom including rooftop deck and event space.",
        },
    ]
    return opps


# =====================================================================
# 12. BIDS (4)
# =====================================================================
def generate_bids():
    """Fee proposals submitted for active pursuits."""
    return [
        {
            "title":           "Portland Waterfront Mixed-Use - Fee Proposal",
            "client_name":     "Zidell Yards LLC",
            "bid_amount":      "2950000",
            "submission_date": "2025-03-15",
            "status":          "submitted",
            "project_name":    "",
        },
        {
            "title":           "Tillamook Creamery Visitor Center - Fee Proposal",
            "client_name":     "Tillamook County Creamery Association",
            "bid_amount":      "820000",
            "submission_date": "2025-02-28",
            "status":          "under_review",
            "project_name":    "",
        },
        {
            "title":           "Deschutes Brewery Taproom - Fee Proposal",
            "client_name":     "Deschutes Brewery",
            "bid_amount":      "550000",
            "submission_date": "2025-04-01",
            "status":          "submitted",
            "project_name":    "",
        },
        {
            "title":           "Multnomah County Courthouse - SOQ Submission",
            "client_name":     "Multnomah County Facilities",
            "bid_amount":      "1650000",
            "submission_date": "2025-04-10",
            "status":          "draft",
            "project_name":    "",
        },
    ]


# =====================================================================
# 13. ESTIMATES (8)
# =====================================================================
def generate_estimates():
    """Fee estimates per active project (one per project)."""
    # For each project: estimated labor cost vs. fee (price)
    # Typical A/E multiplier: fee = labor_cost * 2.8-3.2x
    estimate_data = [
        ("Oregon Convention Center Expansion",       780000, 2400000, 67.5),
        ("Pearl District Mixed-Use Tower",           590000, 1800000, 67.2),
        ("OHSU Biomedical Research Lab",             540000, 1600000, 66.3),
        ("Nike WHQ Building 5 Interior",             380000, 1200000, 68.3),
        ("PDX Airport Concourse E",                  660000, 2000000, 67.0),
        ("Bend Affordable Housing",                  300000,  900000, 66.7),
        ("Eugene Public Library Renovation",         220000,  650000, 66.2),
        ("Willamette Valley Winery Tasting Room",    150000,  450000, 66.7),
    ]

    rows = []
    for i, (proj, cost, price, margin) in enumerate(estimate_data, start=1):
        rows.append({
            "estimate_number": f"EST-{i:03d}",
            "title":           f"Fee Estimate - {proj}",
            "description":     f"Professional services fee estimate for {proj}",
            "status":          "approved" if i <= 6 else "draft",
            "total_cost":      str(cost),
            "total_price":     str(price),
            "margin_pct":      f"{margin:.1f}",
            "project_name":    proj,
        })
    return rows


# =====================================================================
# 14. INVOICES (~60)
# =====================================================================
def generate_invoices():
    """
    ~60 invoices:
      - 5 OB receivable (dated 2024-12-31, gl_account=3010, status=paid)
      - 5 OB payable (dated 2024-12-31, gl_account=3010, status=paid)
      - ~32 monthly receivable (4 months x 8 projects)
      - ~16 monthly payable (4 months x ~4 subconsultant invoices)
    """
    rows = []
    inv_counter = [0]

    def next_inv_num():
        inv_counter[0] += 1
        return f"WAA-{inv_counter[0]:04d}"

    # ── Opening Balance Receivables (5) ───────────────────────────
    ob_recv = [
        ("Metro Regional Government",            "Oregon Convention Center Expansion", 850000),
        ("Portland Development Group",            "Pearl District Mixed-Use Tower",    620000),
        ("Oregon Health & Science University",    "OHSU Biomedical Research Lab",      480000),
        ("Nike Inc",                              "Nike WHQ Building 5 Interior",      350000),
        ("Port of Portland",                      "PDX Airport Concourse E",           200000),
    ]
    for client, project, amount in ob_recv:
        rows.append({
            "invoice_number":  next_inv_num(),
            "invoice_type":    "receivable",
            "invoice_date":    "2024-12-31",
            "amount":          f"{amount:.2f}",
            "tax_amount":      "0",
            "due_date":        "2025-01-30",
            "description":     f"Opening balance - prior period billings",
            "status":          "paid",
            "vendor_name":     "",
            "client_name":     client,
            "project_name":    project,
            "gl_account":      "3010",
            "retainage_pct":   "0",
            "retainage_held":  "0",
        })

    # ── Opening Balance Payables (5) ──────────────────────────────
    ob_pay = [
        ("KPFF Consulting Engineers",          "Oregon Convention Center Expansion", 120000),
        ("PAE Engineers",                       "Pearl District Mixed-Use Tower",     95000),
        ("KPFF Consulting Engineers",          "OHSU Biomedical Research Lab",        80000),
        ("PAE Engineers",                       "Nike WHQ Building 5 Interior",       60000),
        ("Lango Hansen Landscape Architects",   "Oregon Convention Center Expansion",  45000),
    ]
    for vendor, project, amount in ob_pay:
        rows.append({
            "invoice_number":  next_inv_num(),
            "invoice_type":    "payable",
            "invoice_date":    "2024-12-31",
            "amount":          f"{amount:.2f}",
            "tax_amount":      "0",
            "due_date":        "2025-01-30",
            "description":     f"Opening balance - prior period subconsultant fees",
            "status":          "paid",
            "vendor_name":     vendor,
            "client_name":     "",
            "project_name":    project,
            "gl_account":      "3010",
            "retainage_pct":   "0",
            "retainage_held":  "0",
        })

    # ── Monthly Receivable Invoices (12 months x 8 projects) ─────
    # Revenue split target (annual):
    #   4000 Design Fee Revenue:       $9,000,000
    #   4010 Engineering Fee Revenue:  $1,500,000
    #   4020 Reimbursable Revenue:       $500,000
    #   4030 Construction Admin Revenue:$1,000,000
    #   Total:                         $12,000,000
    #
    # Each project billed monthly, varying by activity level and phase.
    # Annual billing per project:
    #   OCE:  $2,400,000 (largest, CA phase active)
    #   PDT:  $1,800,000
    #   OBR:  $1,600,000
    #   NKE:  $1,200,000 (winding down, CA-heavy)
    #   PDX:  $2,000,000 (ramping up)
    #   BAH:  $  900,000
    #   EPL:  $  650,000
    #   WVW:  $  450,000

    # Define annual billing per project with GL account distribution
    # Each project: list of (annual_amount, gl_account) tuples
    # Annual billing targets by GL account:
    #   4000 Design Fee Revenue:          $9,000,000
    #   4010 Engineering Fee Revenue:     $1,500,000
    #   4020 Reimbursable Revenue:          $500,000
    #   4030 Construction Admin Revenue:  $1,000,000
    #   Total:                           $12,000,000
    #
    # Strategy: One invoice per project per month with primary GL account.
    # The GL account determines how the revenue is categorized.
    # Each project has a primary GL and a secondary GL for variety.
    # We generate 12 months x 8 projects = 96 invoices (not 384).
    #
    # Annual billing per project:
    project_billing_config = [
        # (project_name, annual_total, gl_schedule)
        # gl_schedule: list of (gl_account, months) -- which GL to use each month
        ("Oregon Convention Center Expansion", 2800000, [
            ("4000", [0,1,2,3,4,5,6,7]),    # Design 8 months
            ("4010", [8,9]),                  # Engineering 2 months
            ("4020", [10]),                    # Reimbursable 1 month
            ("4030", [11]),                    # CA 1 month
        ]),
        ("Pearl District Mixed-Use Tower", 1950000, [
            ("4000", [0,1,2,3,4,5,6,7,8]),
            ("4010", [9,10]),
            ("4030", [11]),
        ]),
        ("OHSU Biomedical Research Lab", 1700000, [
            ("4000", [0,1,2,3,4,5,6]),
            ("4010", [7,8,9,10]),
            ("4030", [11]),
        ]),
        ("Nike WHQ Building 5 Interior", 1200000, [
            ("4000", [0,1,2,3]),
            ("4030", [4,5,6,7,8,9,10,11]),  # Mostly CA
        ]),
        ("PDX Airport Concourse E", 2050000, [
            ("4000", [0,1,2,3,4,5,6,7,8,9]),
            ("4010", [10,11]),
        ]),
        ("Bend Affordable Housing", 960000, [
            ("4000", [0,1,2,3,4,5,6,7,8]),
            ("4010", [9,10]),
            ("4020", [11]),
        ]),
        ("Eugene Public Library Renovation", 670000, [
            ("4000", [0,1,2,3,4,5,6,7]),
            ("4010", [8,9,10]),
            ("4020", [11]),
        ]),
        ("Willamette Valley Winery Tasting Room", 670000, [
            ("4000", [0,1,2,3,4,5,6,7]),
            ("4010", [8,9]),
            ("4020", [10,11]),
        ]),
    ]
    # Total: 2800+1950+1700+1200+2050+960+670+670 = $12,000,000

    # Map project to client
    proj_to_client = {p["name"]: p["client_name"] for p in PROJECTS}

    # Build month-to-GL mapping for each project, then generate invoices
    for proj_name, annual_total, gl_schedule in project_billing_config:
        # Create month->gl mapping
        month_gl = {}
        for gl_acct, months in gl_schedule:
            for m in months:
                month_gl[m] = gl_acct

        # Distribute annual amount across 12 months
        monthly_amts = allocate_to_months(annual_total)

        for m in range(12):
            amount = monthly_amts[m]
            if amount <= 0:
                continue

            month_num = m + 1
            month_name = MONTH_NAMES[m]
            gl = month_gl.get(m, "4000")

            inv_date = date(2025, month_num, 25)
            while inv_date.weekday() >= 5:
                inv_date -= timedelta(days=1)
            due_date = inv_date + timedelta(days=30)

            # Months 1-11 paid, month 12 pending
            status = "paid" if m < 11 else "pending"

            gl_descs = {
                "4000": f"Design services - {month_name} 2025",
                "4010": f"Engineering services - {month_name} 2025",
                "4020": f"Reimbursable expenses - {month_name} 2025",
                "4030": f"Construction administration - {month_name} 2025",
            }

            rows.append({
                "invoice_number":  next_inv_num(),
                "invoice_type":    "receivable",
                "invoice_date":    inv_date.isoformat(),
                "amount":          f"{amount:.2f}",
                "tax_amount":      "0",
                "due_date":        due_date.isoformat(),
                "description":     gl_descs[gl],
                "status":          status,
                "vendor_name":     "",
                "client_name":     proj_to_client[proj_name],
                "project_name":    proj_name,
                "gl_account":      gl,
                "retainage_pct":   "0",
                "retainage_held":  "0",
            })

    # ── Monthly Payable Invoices (12 months) ──────────────────────
    # Subconsultant fees annual: $800,000
    #   5100 Structural (KPFF):   $340,000
    #   5110 MEP (PAE):           $310,000
    #   5120 Other (Lango, SERA): $150,000
    #
    # 4 subconsultants bill monthly across various projects

    subconsultant_annual = [
        # (vendor, gl_account, annual_amount, projects they work on)
        ("KPFF Consulting Engineers", "5100", 340000, [
            "Oregon Convention Center Expansion",
            "Pearl District Mixed-Use Tower",
            "OHSU Biomedical Research Lab",
            "PDX Airport Concourse E",
        ]),
        ("PAE Engineers", "5110", 310000, [
            "Oregon Convention Center Expansion",
            "Pearl District Mixed-Use Tower",
            "OHSU Biomedical Research Lab",
            "Nike WHQ Building 5 Interior",
        ]),
        ("Lango Hansen Landscape Architects", "5120", 90000, [
            "Oregon Convention Center Expansion",
            "Bend Affordable Housing",
            "Willamette Valley Winery Tasting Room",
        ]),
        ("SERA Architects", "5120", 60000, [
            "PDX Airport Concourse E",
            "Eugene Public Library Renovation",
        ]),
    ]

    for vendor, gl, annual, projects in subconsultant_annual:
        monthly_amts = allocate_to_months(annual)
        for m in range(12):
            amount = monthly_amts[m]
            if amount <= 0:
                continue
            month_num = m + 1
            month_name = MONTH_NAMES[m]

            inv_date = date(2025, month_num, random.randint(1, 25))
            while inv_date.weekday() >= 5:
                inv_date += timedelta(days=1)
            due_date = inv_date + timedelta(days=30)

            project = random.choice(projects)
            status = "paid" if m < 11 else "pending"

            gl_names = {
                "5100": "Structural engineering",
                "5110": "MEP engineering",
                "5120": "Consulting",
            }
            desc = f"{gl_names[gl]} services - {month_name} 2025"

            rows.append({
                "invoice_number":  next_inv_num(),
                "invoice_type":    "payable",
                "invoice_date":    inv_date.isoformat(),
                "amount":          f"{amount:.2f}",
                "tax_amount":      "0",
                "due_date":        due_date.isoformat(),
                "description":     desc,
                "status":          status,
                "vendor_name":     vendor,
                "client_name":     "",
                "project_name":    project,
                "gl_account":      gl,
                "retainage_pct":   "0",
                "retainage_held":  "0",
            })

    return rows


# =====================================================================
# 15. JOURNAL ENTRIES (~120 lines)
# =====================================================================
def generate_journal_entries(invoices):
    """
    Pre-crafted JEs for items the auto-JE engine does NOT handle:
      - Opening balance
      - Monthly payroll (salary expense + payment)
      - Monthly overhead expenses
      - Quarterly depreciation
      - Monthly interest expense

    CRITICAL: NEVER touch 1010 (AR), 1020 (Retainage Recv),
              2000 (AP), 2010 (Retainage Pay) -- the import engine owns those.

    Annual expense plan:
      Salaries:
        5000 Principal Salaries:       $1,200,000
        5010 Architect Salaries:       $2,400,000
        5020 Engineer Salaries:        $1,500,000
        5030 Designer Salaries:        $1,100,000
        5040 Admin Staff Salaries:       $500,000
        5050 Payroll Taxes & Benefits:  $1,340,000
        Total staff through JE:         $8,040,000

      Overhead:
        6000 Office Rent:                $480,000
        6010 Office Utilities:            $60,000
        6020 E&O Insurance:              $360,000
        6030 General Insurance:          $120,000
        6040 Software Licenses:          $240,000
        6050 Printing & Plotting:         $60,000
        6060 Travel & Expenses:          $120,000
        6070 Marketing & Proposals:       $80,000
        6080 Professional Development:    $60,000
        6100 Depreciation:               $120,000
        7000 Interest Expense:            $20,000
        Total overhead through JE:      $1,720,000

      Subconsultants through invoices:   $800,000  (NOT in JEs)

      Total costs:                     $10,560,000
      Revenue (invoices):              $12,000,000
      Net income:                       $1,440,000
    """
    rows = []
    je_counter = [0]

    def add_je(entry_number, je_date, memo, lines):
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
                "project_name":   "",
            })

    # ─── Calculate OB retained earnings plug ──────────────────────
    # Assets:
    #   1000 Cash = $1,830,000  (bank balances = 1,450,000 + 380,000)
    #   1040 Prepaid = $120,000
    #   1100 Furniture/Equip = $450,000
    #   1110 Accum Dep = -$180,000 (credit balance)
    # Liabilities:
    #   2020 Accrued Payroll = $670,000
    #   2030 Accrued Expenses = $150,000
    #   2060 Deferred Revenue = $200,000
    # Equity:
    #   3000 Partners Capital = $800,000
    #   3010 Retained Earnings = PLUG
    #
    # Also OB invoices create:
    #   1010 AR (debit) from OB receivables = $2,500,000 (then paid, so net 0)
    #   2000 AP (credit) from OB payables = $400,000 (then paid, so net 0)
    #   3010 impact from OB invoices: recv -$2,500,000, pay +$400,000 = net -$2,100,000 to 3010
    #   1000 impact from paid OB invoices: recv +$2,500,000, pay -$400,000 = net +$2,100,000
    #
    # So effective opening cash from JE must be:
    #   $1,830,000 (target bank balance)
    #   minus $2,100,000 (invoice auto-JE cash impact from OB invoices)
    #   = -$270,000  ... This means we need a NEGATIVE cash JE entry, which is wrong.
    #
    # Wait - let me reconsider. The bank balance sync happens separately.
    # The OB JE just sets the starting GL balances BEFORE invoices run.
    # After import, the system creates invoice auto-JEs which affect 1000.
    # The bank balance sync then adjusts 1000 to match bank_accounts.current_balance.
    #
    # So we just need the accounting equation to balance in our JE:
    # DR Assets - CR Liabilities - CR Equity = 0
    #
    # OB invoices gl_account=3010 means:
    #   Receivable OB: DR 1010 / CR 3010 (then DR 1000 / CR 1010 for payment)
    #   Payable OB: DR 3010 / CR 2000 (then DR 2000 / CR 1000 for payment)
    # Net to 3010 from OB invoices: -2,500,000 + 400,000 = -2,100,000 (credit)
    # Net to 1000 from OB invoices: +2,500,000 - 400,000 = +2,100,000 (debit)
    #
    # JE Opening balance equation:
    #   DR 1000 (cash_je)
    #   + DR 1040 (120,000)
    #   + DR 1100 (450,000)
    #   - DR 1110 (180,000) [since accum dep is contra, we credit it]
    #   = CR 2020 (670,000) + CR 2030 (150,000) + CR 2060 (200,000)
    #     + CR 3000 (800,000) + CR 3010 (re_plug)
    #
    # After OB invoice auto-JEs: 1000 final = cash_je + 2,100,000
    # We want 1000 final ~ 1,830,000 (bank balances), so cash_je ~ -270,000
    # But that's a credit to cash in our opening JE, which is odd but valid
    # for balancing purposes.
    #
    # Actually, the simplest approach: just set cash_je to whatever balances.
    # The bank sync will fix cash to the right amount anyway.

    # Total debits needed = Total credits needed
    # DR side: 1000=X, 1040=120000, 1100=450000
    # CR side: 1110=180000, 2020=670000, 2030=150000, 2060=200000, 3000=800000, 3010=Y
    # X + 120000 + 450000 = 180000 + 670000 + 150000 + 200000 + 800000 + Y
    # X + 570000 = 2000000 + Y
    # X = 1430000 + Y
    #
    # After OB invoice auto-JEs run:
    #   Cash 1000 gets: +2,500,000 (paid recv) - 400,000 (paid payable) = +2,100,000
    #   3010 gets: -2,500,000 (recv credit) + 400,000 (payable debit) = -2,100,000 (net credit 2,100,000)
    #
    # So final cash = X + 2,100,000 = 1,830,000 => X = -270,000
    # And final 3010 = -Y - 2,100,000 (credit side)
    #
    # From equation: X = 1430000 + Y => -270000 = 1430000 + Y => Y = -1,700,000
    # That's negative retained earnings which means we'd debit 3010, doesn't make sense.
    #
    # Let me reconsider the approach. The bank balance is $1,830,000 but maybe
    # I should just make the OB cash higher so it works naturally.
    # Let the plug be the cash amount, and let bank sync handle it.

    # Simpler: set opening cash in JE to balance the equation with a reasonable RE.
    # Target RE (before current year): let's say $400,000
    re_target = 400000
    # CR side total (excluding cash): 180000+670000+150000+200000+800000+400000 = 2,400,000
    # DR side (excluding cash): 120000+450000 = 570,000
    # cash = 2,400,000 - 570,000 = 1,830,000
    # That works perfectly! Cash JE = 1,830,000, which matches bank balances.
    # But then OB invoices add 2,100,000 to cash making it 3,930,000.
    # Bank sync will then adjust back to 1,830,000 with a reclass JE.
    # That's fine - the system handles it.

    cash_ob = 1830000
    prepaid_ob = 120000
    furniture_ob = 450000
    accum_dep_ob = 180000
    accrued_payroll_ob = 670000
    accrued_expenses_ob = 150000
    deferred_rev_ob = 200000
    partners_capital_ob = 800000
    retained_earnings_ob = (cash_ob + prepaid_ob + furniture_ob
                            - accum_dep_ob
                            - accrued_payroll_ob - accrued_expenses_ob
                            - deferred_rev_ob - partners_capital_ob)

    add_je("OB-001", "2025-01-01", "Opening balances - Whitmore + Associates", [
        (1000, cash_ob,           0, "Cash - operating and reserve accounts"),
        (1040, prepaid_ob,        0, "Prepaid expenses - insurance and software"),
        (1100, furniture_ob,      0, "Office furniture & equipment"),
        (1110, 0,    accum_dep_ob,   "Accumulated depreciation"),
        (2020, 0,    accrued_payroll_ob, "Accrued payroll - prior period"),
        (2030, 0,    accrued_expenses_ob, "Accrued expenses - prior period"),
        (2060, 0,    deferred_rev_ob, "Deferred revenue - advance billings"),
        (3000, 0,    partners_capital_ob, "Partners capital contributions"),
        (3010, 0,    retained_earnings_ob, "Retained earnings - prior periods"),
    ])

    # ─── Monthly Payroll JEs (12 months) ──────────────────────────
    # Annual totals:
    annual_payroll = {
        5000: 1200000,   # Principal Salaries
        5010: 2400000,   # Architect Salaries
        5020: 1500000,   # Engineer Salaries
        5030: 1100000,   # Designer Salaries
        5040: 500000,    # Admin Staff Salaries
        5050: 1340000,   # Payroll Taxes & Benefits
    }
    total_annual_payroll = sum(annual_payroll.values())  # $8,040,000

    # Distribute evenly across 12 months
    monthly_payroll = {}
    for acct, annual in annual_payroll.items():
        monthly_payroll[acct] = allocate_to_months(annual)

    for m in range(12):
        month_str = f"{m+1:02d}"
        je_date = MONTH_ENDS[m]
        month_name = MONTH_NAMES[m]

        # JE: Payroll accrual - DR expense accounts / CR Accrued Payroll
        lines = []
        total_month = 0
        for acct in [5000, 5010, 5020, 5030, 5040, 5050]:
            amt = monthly_payroll[acct][m]
            if amt > 0:
                acct_names = {
                    5000: "Principal salaries",
                    5010: "Architect salaries",
                    5020: "Engineer salaries",
                    5030: "Designer salaries",
                    5040: "Admin staff salaries",
                    5050: "Payroll taxes & benefits",
                }
                lines.append((acct, amt, 0, f"{acct_names[acct]} - {month_name}"))
                total_month += amt
        lines.append((2020, 0, total_month, f"Accrued payroll - {month_name}"))

        add_je(f"PAY-{month_str}", je_date,
               f"Payroll accrual - {month_name} 2025", lines)

        # JE: Payroll payment - DR Accrued Payroll / CR Cash
        add_je(f"PAYX-{month_str}", je_date,
               f"Payroll payment - {month_name} 2025", [
            (2020, total_month, 0,           f"Clear accrued payroll - {month_name}"),
            (1000, 0,           total_month, f"Cash - payroll payment {month_name}"),
        ])

    # ─── Monthly Overhead JEs (12 months) ─────────────────────────
    annual_overhead = {
        6000: 480000,    # Office Rent
        6010: 60000,     # Office Utilities
        6020: 360000,    # E&O Insurance
        6030: 120000,    # General Insurance
        6040: 240000,    # Software Licenses
        6050: 60000,     # Printing & Plotting
        6060: 120000,    # Travel & Expenses
        6070: 80000,     # Marketing & Proposals
        6080: 60000,     # Professional Development
    }
    total_annual_overhead_cash = sum(annual_overhead.values())  # $1,580,000

    monthly_overhead = {}
    for acct, annual in annual_overhead.items():
        monthly_overhead[acct] = allocate_to_months(annual)

    overhead_names = {
        6000: "Office rent",
        6010: "Office utilities",
        6020: "Professional liability insurance (E&O)",
        6030: "General insurance",
        6040: "Software licenses (Revit, AutoCAD, Bluebeam)",
        6050: "Printing & plotting",
        6060: "Travel & project expenses",
        6070: "Marketing & proposals",
        6080: "Professional development & training",
    }

    for m in range(12):
        month_str = f"{m+1:02d}"
        je_date = MONTH_ENDS[m]
        month_name = MONTH_NAMES[m]

        lines = []
        total_month = 0
        for acct in sorted(annual_overhead.keys()):
            amt = monthly_overhead[acct][m]
            if amt > 0:
                lines.append((acct, amt, 0, f"{overhead_names[acct]} - {month_name}"))
                total_month += amt
        lines.append((1000, 0, total_month, f"Cash - overhead expenses {month_name}"))

        add_je(f"OH-{month_str}", je_date,
               f"Overhead expenses - {month_name} 2025", lines)

    # ─── Quarterly Depreciation (4 quarters) ──────────────────────
    annual_dep = 120000
    quarterly_dep = annual_dep / 4  # $30,000/quarter
    dep_dates = [
        ("DEP-Q1", "2025-03-31", "Q1 2025"),
        ("DEP-Q2", "2025-06-30", "Q2 2025"),
        ("DEP-Q3", "2025-09-30", "Q3 2025"),
        ("DEP-Q4", "2025-12-31", "Q4 2025"),
    ]
    for je_num, je_date, quarter in dep_dates:
        add_je(je_num, je_date, f"Depreciation - {quarter}", [
            (6100, quarterly_dep, 0,              f"Depreciation expense - {quarter}"),
            (1110, 0,             quarterly_dep,  f"Accumulated depreciation - {quarter}"),
        ])

    # ─── Monthly Interest Expense (12 months) ─────────────────────
    annual_interest = 20000
    monthly_interest_amts = allocate_to_months(annual_interest)

    for m in range(12):
        month_str = f"{m+1:02d}"
        je_date = MONTH_ENDS[m]
        month_name = MONTH_NAMES[m]
        amt = monthly_interest_amts[m]

        add_je(f"INT-{month_str}", je_date,
               f"Interest expense - {month_name} 2025", [
            (7000, amt, 0,   f"Interest expense - {month_name}"),
            (1000, 0,   amt, f"Cash - interest payment {month_name}"),
        ])

    print(f"  Generated {je_counter[0]} journal entries ({len(rows)} lines)")
    return rows


# =====================================================================
# MAIN
# =====================================================================
def main():
    print("=" * 70)
    print("WHITMORE + ASSOCIATES ARCHITECTURE - A/E FIRM MOCK DATA")
    print("=" * 70)
    print()

    all_sheets = {}

    # 1. Chart of Accounts
    all_sheets["chart_of_accounts"] = generate_coa()

    # 2. Bank Accounts
    all_sheets["bank_accounts"] = generate_bank_accounts()

    # 3. Projects
    all_sheets["projects"] = generate_projects()

    # 4. Contacts (also returns staff_names for time entries)
    contacts, staff_names = generate_contacts()
    all_sheets["contacts"] = contacts

    # 5. Vendors
    all_sheets["vendors"] = generate_vendors()

    # 6. Phases
    all_sheets["phases"] = generate_phases()

    # 7. Contracts
    all_sheets["contracts"] = generate_contracts()

    # 8. Time Entries
    all_sheets["time_entries"] = generate_time_entries(staff_names)

    # 9. RFIs
    all_sheets["rfis"] = generate_rfis()

    # 10. Submittals
    all_sheets["submittals"] = generate_submittals()

    # 11. Opportunities
    all_sheets["opportunities"] = generate_opportunities()

    # 12. Bids
    all_sheets["bids"] = generate_bids()

    # 13. Estimates
    all_sheets["estimates"] = generate_estimates()

    # 14. Invoices
    all_sheets["invoices"] = generate_invoices()

    # 15. Journal Entries
    all_sheets["journal_entries"] = generate_journal_entries(all_sheets["invoices"])

    # ── Summary ──────────────────────────────────────────────────
    print()
    total = 0
    for key, data in all_sheets.items():
        n = len(data)
        print(f"  {key:<30} {n:>6} rows")
        total += n
    print(f"  {'TOTAL':<30} {total:>6} rows")

    # ── Verify financials ────────────────────────────────────────
    account_names = {
        int(row["account_number"]): row["name"]
        for row in all_sheets["chart_of_accounts"]
    }
    verify_financials(
        all_sheets["journal_entries"],
        all_sheets["invoices"],
        target_ni=1440000,
        account_names=account_names,
    )

    # ── Invoice summaries ────────────────────────────────────────
    recv_total = sum(
        float(r["amount"]) for r in all_sheets["invoices"]
        if r["invoice_type"] == "receivable" and r["gl_account"] != "3010"
    )
    pay_total = sum(
        float(r["amount"]) for r in all_sheets["invoices"]
        if r["invoice_type"] == "payable" and r["gl_account"] != "3010"
    )
    ob_recv = sum(
        float(r["amount"]) for r in all_sheets["invoices"]
        if r["invoice_type"] == "receivable" and r["gl_account"] == "3010"
    )
    ob_pay = sum(
        float(r["amount"]) for r in all_sheets["invoices"]
        if r["invoice_type"] == "payable" and r["gl_account"] == "3010"
    )

    print(f"\n  OB Receivable:    ${ob_recv:>15,.2f}")
    print(f"  OB Payable:       ${ob_pay:>15,.2f}")
    print(f"  Period Receivable: ${recv_total:>15,.2f}")
    print(f"  Period Payable:    ${pay_total:>15,.2f}")

    # Revenue by account
    print("\n  Revenue by account (from invoices):")
    rev_by_acct = defaultdict(float)
    for r in all_sheets["invoices"]:
        if r["invoice_type"] == "receivable" and r["gl_account"] != "3010":
            rev_by_acct[r["gl_account"]] += float(r["amount"])
    for acct in sorted(rev_by_acct.keys()):
        name = account_names.get(int(acct), acct)
        print(f"    {acct} {name}: ${rev_by_acct[acct]:>12,.2f}")

    # Subconsultant costs by account
    print("\n  Subconsultant costs by account (from invoices):")
    sub_by_acct = defaultdict(float)
    for r in all_sheets["invoices"]:
        if r["invoice_type"] == "payable" and r["gl_account"] != "3010":
            sub_by_acct[r["gl_account"]] += float(r["amount"])
    for acct in sorted(sub_by_acct.keys()):
        name = account_names.get(int(acct), acct)
        print(f"    {acct} {name}: ${sub_by_acct[acct]:>12,.2f}")

    # ── Build XLSX ───────────────────────────────────────────────
    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "Whitmore_Associates_Architecture_Import.xlsx",
    )
    print()
    build_xlsx(all_sheets, out_path)
    print("\nDONE!")


if __name__ == "__main__":
    main()
