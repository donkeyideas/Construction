#!/usr/bin/env python3
"""
Mitchell Custom Homes - Owner-Builder Mock Data Generator
=========================================================
Simplest of the 7 Buildwrk generators.

Profile:
  - Homeowner (David & Sarah Mitchell) acting as own GC
  - 1 custom home build in Austin, TX
  - $2.8M budget, ~35% complete (Jan-Apr 2025)
  - Pure cost tracking — NO revenue, NO receivables
  - ~150 total rows across 8 sheets

Sheets produced:
  1. Chart of Accounts   (~25 rows)
  2. Bank Accounts       (2 rows)
  3. Projects            (1 row)
  4. Contacts            (~10 rows)
  5. Vendors             (8 rows)
  6. Budget Lines        (~15 rows)
  7. Invoices            (~30 rows, ALL payable)
  8. Journal Entries     (~40 lines)

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
    MONTH_ENDS, MONTH_NAMES,
)
from shared.name_pools import generate_person_name
from shared.xlsx_builder import build_xlsx, verify_financials

# ── Reproducibility ──────────────────────────────────────────────────
random.seed(100)


# =====================================================================
# 1. CHART OF ACCOUNTS
# =====================================================================
def generate_coa():
    """25-account minimal COA for owner-builder cost tracking."""
    accounts = [
        # Assets
        ("1000", "Cash - Operating",             "asset",     "Current Asset"),
        ("1010", "Accounts Receivable",          "asset",     "Current Asset"),
        ("1020", "Retainage Receivable",         "asset",     "Current Asset"),
        ("1100", "Construction in Progress",     "asset",     "Fixed Asset"),
        ("1200", "Land",                         "asset",     "Fixed Asset"),
        # Liabilities
        ("2000", "Accounts Payable",             "liability", "Current Liability"),
        ("2010", "Retainage Payable",            "liability", "Current Liability"),
        ("2100", "Construction Loan",            "liability", "Long-Term Liability"),
        # Equity
        ("3000", "Owner Equity",                 "equity",    "Equity"),
        ("3010", "Retained Earnings",            "equity",    "Equity"),
        # Expenses — Direct Costs (trade categories)
        ("5000", "Site Work & Foundation",       "expense",   "Direct Cost"),
        ("5010", "Framing & Structure",          "expense",   "Direct Cost"),
        ("5020", "Roofing",                      "expense",   "Direct Cost"),
        ("5030", "Plumbing",                     "expense",   "Direct Cost"),
        ("5040", "Electrical",                   "expense",   "Direct Cost"),
        ("5050", "HVAC",                         "expense",   "Direct Cost"),
        ("5060", "Insulation & Drywall",         "expense",   "Direct Cost"),
        ("5070", "Flooring",                     "expense",   "Direct Cost"),
        ("5080", "Painting",                     "expense",   "Direct Cost"),
        ("5090", "Cabinetry & Countertops",      "expense",   "Direct Cost"),
        ("5100", "Fixtures & Appliances",        "expense",   "Direct Cost"),
        ("5110", "Landscaping & Hardscape",      "expense",   "Direct Cost"),
        ("5120", "Architecture & Engineering",   "expense",   "Direct Cost"),
        ("5130", "Permits & Inspections",        "expense",   "Direct Cost"),
        # Other Expense
        ("7000", "Loan Interest",                "expense",   "Other Expense"),
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
# 2. BANK ACCOUNTS
# =====================================================================
def generate_bank_accounts():
    return [
        {
            "account_name":    "Construction Account",
            "bank_name":       "Austin Community Bank",
            "account_type":    "checking",
            "account_number":  "****4821",
            "routing_number":  "314977401",
            "current_balance": "185000.00",
            "gl_account":      "1000",
        },
        {
            "account_name":    "Personal Savings",
            "bank_name":       "Chase",
            "account_type":    "savings",
            "account_number":  "****7356",
            "routing_number":  "111000614",
            "current_balance": "420000.00",
            "gl_account":      "1000",
        },
    ]


# =====================================================================
# 3. PROJECTS
# =====================================================================
def generate_projects():
    return [
        {
            "name":           "Mitchell Family Residence",
            "code":           "MFR-2025",
            "project_type":   "Residential",
            "status":         "in_progress",
            "start_date":     "2025-01-15",
            "end_date":       "2025-12-31",
            "budget":         "2800000",
            "estimated_cost": "2800000",
            "completion_pct": "35",
            "address":        "3412 Barton Creek Blvd",
            "city":           "Austin",
            "state":          "TX",
            "zip":            "78735",
            "client_name":    "David & Sarah Mitchell",
        },
    ]


# =====================================================================
# 4. CONTACTS
# =====================================================================
def generate_contacts():
    """10 contacts: professionals + trade foremen + inspector."""
    used_names = set()
    contacts = []

    # Fixed roles with realistic Austin-area companies
    roles = [
        ("Architect",             "Hill Country Architecture"),
        ("Structural Engineer",   "Austin Structural Consultants"),
        ("Interior Designer",     "Sarah Mitchell Interiors"),
        ("Project Manager",       "Lone Star PM Services"),
        ("Building Inspector",    "City of Austin - Building Dept"),
        ("Real Estate Attorney",  "Barton & Associates Law"),
        ("Concrete Foreman",      "Lone Star Concrete Co"),
        ("Framing Foreman",       "Texas Timber Framing"),
        ("Electrical Foreman",    "Capitol City Electric"),
        ("Plumbing Foreman",      "Hill Country Plumbing"),
    ]

    for role, company in roles:
        first, last = generate_person_name(used_names)
        domain = company.lower().replace(" ", "").replace("-", "").replace("&", "") + ".com"
        # For city dept, use gov-style email
        if "City of" in company:
            email = f"{first.lower()}.{last.lower()}@austintexas.gov"
        else:
            email = random_email(first, last, domain)
        contacts.append({
            "first_name":   first,
            "last_name":    last,
            "email":        email,
            "phone":        random_phone(),
            "role":         role,
            "company_name": company,
        })

    return contacts


# =====================================================================
# 5. VENDORS
# =====================================================================
def generate_vendors():
    """8 Austin-area subs and suppliers."""
    used_names = set()
    vendors_spec = [
        ("Lone Star Concrete Co",     "Concrete / Foundation"),
        ("Texas Timber Framing",      "Framing"),
        ("Capitol City Electric",     "Electrical"),
        ("Hill Country Plumbing",     "Plumbing"),
        ("Central TX HVAC Solutions", "HVAC"),
        ("Austin Premium Flooring",   "Flooring"),
        ("Artisan Cabinetry & Stone", "Cabinetry"),
        ("Green Valley Landscaping",  "Landscaping"),
    ]

    austin_streets = [
        "2901 S Lamar Blvd",
        "5500 Manchaca Rd",
        "1208 W Ben White Blvd",
        "7400 US-290 West",
        "3100 Steck Ave",
        "4800 Burnet Rd",
        "9600 S I-35",
        "1600 E Oltorf St",
    ]

    rows = []
    for i, (name, trade) in enumerate(vendors_spec):
        first, last = generate_person_name(used_names)
        domain = name.lower().replace(" ", "").replace("/", "").replace("&", "") + ".com"
        rows.append({
            "name":         name,
            "contact_name": f"{first} {last}",
            "email":        random_email(first, last, domain),
            "phone":        random_phone(),
            "address":      austin_streets[i],
            "city":         "Austin",
            "state":        "TX",
            "zip":          f"787{random.randint(10, 99):02d}",
            "trade":        trade,
        })

    return rows


# =====================================================================
# 6. BUDGET LINES
# =====================================================================
def generate_budget_lines():
    """CSI-coded budget lines matching expense accounts. Totals ~$2.8M."""
    project = "Mitchell Family Residence"
    lines = [
        ("31-00",  "Site Work & Foundation",       280000),
        ("06-10",  "Framing & Structure",          420000),
        ("07-00",  "Roofing",                       85000),
        ("22-00",  "Plumbing",                     165000),
        ("26-00",  "Electrical",                   195000),
        ("23-00",  "HVAC",                         145000),
        ("09-20",  "Insulation & Drywall",         180000),
        ("09-60",  "Flooring",                     210000),
        ("09-90",  "Painting",                      65000),
        ("12-30",  "Cabinetry & Countertops",      385000),
        ("11-00",  "Fixtures & Appliances",        120000),
        ("32-90",  "Landscaping & Hardscape",      150000),
        ("01-10",  "Architecture & Engineering",   180000),
        ("01-40",  "Permits & Inspections",         45000),
        ("01-99",  "Contingency",                  175000),
    ]
    rows = []
    for code, desc, amount in lines:
        rows.append({
            "budget_code":     code,
            "description":     desc,
            "budgeted_amount": str(amount),
            "project_name":    project,
        })
    return rows


# =====================================================================
# 7. INVOICES (ALL PAYABLE)
# =====================================================================
def generate_invoices():
    """
    ~30 payable invoices, Jan-Apr 2025 (~$980K = 35% of $2.8M).
    No receivables — owner-builders don't bill anyone.
    The system auto-generates JEs: DR expense / CR AP (and DR AP / CR Cash when paid).
    """
    project = "Mitchell Family Residence"

    # Map vendor -> GL account and realistic invoice descriptions
    vendor_data = [
        ("Lone Star Concrete Co",     "5000", [
            "Foundation excavation & grading",
            "Foundation concrete pour - slab",
            "Foundation waterproofing & backfill",
            "Concrete flatwork - garage & porches",
        ]),
        ("Texas Timber Framing",      "5010", [
            "Framing lumber delivery",
            "First floor framing labor",
            "Second floor framing labor",
            "Roof trusses - fabrication & install",
        ]),
        ("Capitol City Electric",     "5040", [
            "Rough-in electrical - main panel & circuits",
            "Rough-in electrical - low voltage & data",
            "Temporary power setup",
        ]),
        ("Hill Country Plumbing",     "5030", [
            "Rough-in plumbing - water supply lines",
            "Rough-in plumbing - DWV system",
            "Water heater & gas line install",
        ]),
        ("Central TX HVAC Solutions", "5050", [
            "HVAC ductwork installation",
            "Condensing units & air handlers",
        ]),
        ("Austin Premium Flooring",   "5070", [
            "Hardwood flooring materials - deposit",
        ]),
        ("Artisan Cabinetry & Stone", "5090", [
            "Custom cabinetry - design deposit",
            "Kitchen cabinet fabrication - progress",
        ]),
        ("Green Valley Landscaping",  "5110", [
            "Tree protection & site grading",
        ]),
    ]

    # Build invoice list with realistic amounts.
    # Target: ~$745K in invoices (JEs add $225K arch/permits + $10K interest
    # for total spend ~$980K = 35% of $2.8M budget).
    invoice_specs = []
    #  (vendor, gl, description, amount, month)
    # Month 1 = Jan, Month 2 = Feb, etc.

    # Jan 2025 — Site work begins, lumber delivery
    invoice_specs.append(("Lone Star Concrete Co",     "5000", "Foundation excavation & grading",              42000, 1))
    invoice_specs.append(("Lone Star Concrete Co",     "5000", "Foundation concrete pour - slab",              65000, 1))
    invoice_specs.append(("Texas Timber Framing",      "5010", "Framing lumber delivery",                     48000, 1))
    invoice_specs.append(("Green Valley Landscaping",  "5110", "Tree protection & site grading",               11500, 1))

    # Feb 2025 — Foundation finish, framing starts
    invoice_specs.append(("Lone Star Concrete Co",     "5000", "Foundation waterproofing & backfill",          32000, 2))
    invoice_specs.append(("Lone Star Concrete Co",     "5000", "Concrete flatwork - garage & porches",         24000, 2))
    invoice_specs.append(("Texas Timber Framing",      "5010", "First floor framing labor",                    72000, 2))
    invoice_specs.append(("Capitol City Electric",     "5040", "Temporary power setup",                         7500, 2))

    # Mar 2025 — Framing continues, rough-ins begin
    invoice_specs.append(("Texas Timber Framing",      "5010", "Second floor framing labor",                   68000, 3))
    invoice_specs.append(("Texas Timber Framing",      "5010", "Roof trusses - fabrication & install",         52000, 3))
    invoice_specs.append(("Hill Country Plumbing",     "5030", "Rough-in plumbing - water supply lines",       22000, 3))
    invoice_specs.append(("Hill Country Plumbing",     "5030", "Rough-in plumbing - DWV system",               26000, 3))
    invoice_specs.append(("Capitol City Electric",     "5040", "Rough-in electrical - main panel & circuits",  28000, 3))
    invoice_specs.append(("Capitol City Electric",     "5040", "Rough-in electrical - low voltage & data",     16500, 3))

    # Apr 2025 — HVAC rough-in, more MEP, early deposits on finishes
    invoice_specs.append(("Central TX HVAC Solutions", "5050", "HVAC ductwork installation",                   28000, 4))
    invoice_specs.append(("Central TX HVAC Solutions", "5050", "Condensing units & air handlers",              24000, 4))
    invoice_specs.append(("Hill Country Plumbing",     "5030", "Water heater & gas line install",               8500, 4))
    invoice_specs.append(("Artisan Cabinetry & Stone", "5090", "Custom cabinetry - design deposit",            16500, 4))
    invoice_specs.append(("Artisan Cabinetry & Stone", "5090", "Kitchen cabinet fabrication - progress",       24000, 4))
    invoice_specs.append(("Austin Premium Flooring",   "5070", "Hardwood flooring materials - deposit",        18000, 4))

    # Additional invoices spread across months
    invoice_specs.append(("Lone Star Concrete Co",     "5000", "Retaining wall - west elevation",              13500, 2))
    invoice_specs.append(("Texas Timber Framing",      "5010", "Structural steel beam install",                19000, 3))
    invoice_specs.append(("Capitol City Electric",     "5040", "Electrical panel upgrade - 400A service",      10500, 3))
    invoice_specs.append(("Hill Country Plumbing",     "5030", "Sewer lateral connection",                      5500, 2))
    invoice_specs.append(("Central TX HVAC Solutions", "5050", "Zoning controls & thermostats",                 5800, 4))
    invoice_specs.append(("Green Valley Landscaping",  "5110", "Erosion control & drainage swales",             8500, 3))
    invoice_specs.append(("Artisan Cabinetry & Stone", "5090", "Master bath vanity - deposit",                 11000, 4))
    invoice_specs.append(("Austin Premium Flooring",   "5070", "Tile materials - bathrooms & entry",            9500, 4))
    invoice_specs.append(("Texas Timber Framing",      "5010", "Exterior sheathing & house wrap",              16000, 3))
    invoice_specs.append(("Capitol City Electric",     "5040", "Generator hookup & transfer switch",            6200, 4))

    # Build invoice rows
    rows = []
    for idx, (vendor, gl, desc, amount, month) in enumerate(invoice_specs, start=1):
        # Random date within the month (weekday)
        m_start = date(2025, month, 1)
        if month == 4:
            m_end = date(2025, 4, 30)
        else:
            m_end = date(2025, month, 28)
        inv_date = random_date_between(m_start, m_end)
        due_date = inv_date + timedelta(days=30)

        rows.append({
            "invoice_number":  f"MFR-{idx:04d}",
            "invoice_type":    "payable",
            "invoice_date":    inv_date.isoformat(),
            "amount":          f"{amount:.2f}",
            "tax_amount":      "0",
            "due_date":        due_date.isoformat(),
            "description":     desc,
            "status":          "paid",
            "vendor_name":     vendor,
            "client_name":     "",
            "project_name":    project,
            "gl_account":      gl,
            "retainage_pct":   "0",
            "retainage_held":  "0",
        })

    return rows


# =====================================================================
# 8. JOURNAL ENTRIES
# =====================================================================
def generate_journal_entries():
    """
    Pre-crafted JEs for items the auto-JE engine does NOT handle:
      - Opening balance (land purchase, construction loan, owner equity)
      - Monthly loan interest payments (Jan-Apr)
      - Upfront architecture & permit costs paid from cash

    CRITICAL: NEVER touch 1010 (AR), 1020 (Retainage Recv),
              2000 (AP), 2010 (Retainage Pay) — the import engine owns those.
    """
    rows = []
    je_counter = [0]   # mutable counter for closure

    def add_je(entry_number, je_date, memo, lines):
        """
        Add a balanced journal entry.
        lines: list of (account_number, debit, credit, description)
        """
        total_dr = sum(l[1] for l in lines)
        total_cr = sum(l[2] for l in lines)
        assert abs(total_dr - total_cr) < 0.01, (
            f"JE {entry_number} unbalanced: DR={total_dr:.2f} CR={total_cr:.2f}"
        )
        je_counter[0] += 1
        for acct, dr, cr, desc in lines:
            # Enforce: never touch auto-managed accounts
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
                "project_name":   "Mitchell Family Residence",
            })

    # ─── JE-001: Opening Balance (2025-01-01) ───────────────────────
    # Land purchased prior + initial cash from loan draw + owner equity
    add_je("JE-001", "2025-01-01", "Opening balances - land, loan, equity", [
        (1200,  450000,      0, "Land - 3412 Barton Creek Blvd"),
        (1000,  605000,      0, "Cash - initial construction funds"),
        (2100,       0, 600000, "Construction loan - initial draw"),
        (3000,       0, 455000, "Owner equity contribution"),
    ])

    # ─── JE-002: Architecture & Engineering (2025-01-15) ────────────
    # Paid in full upfront from cash (not via invoice/AP cycle)
    add_je("JE-002", "2025-01-15", "Architecture & engineering fees - Hill Country Architecture", [
        (5120, 180000,      0, "Architecture & engineering - full design package"),
        (1000,      0, 180000, "Cash payment - architecture fees"),
    ])

    # ─── JE-003: Permits & Inspections (2025-01-20) ─────────────────
    # City permits paid directly from cash
    add_je("JE-003", "2025-01-20", "Building permits - City of Austin", [
        (5130,  45000,      0, "Building permits & inspection fees"),
        (1000,      0,  45000, "Cash payment - permits"),
    ])

    # ─── JE-004 through JE-007: Monthly Loan Interest (Jan-Apr) ────
    interest_dates = [
        ("JE-004", "2025-01-31", "January"),
        ("JE-005", "2025-02-28", "February"),
        ("JE-006", "2025-03-31", "March"),
        ("JE-007", "2025-04-30", "April"),
    ]
    for je_num, je_date, month_name in interest_dates:
        # ~5% annual on $600K = $30K/yr = $2,500/month
        add_je(je_num, je_date, f"Construction loan interest - {month_name} 2025", [
            (7000,  2500,     0, f"Loan interest - {month_name}"),
            (1000,      0, 2500, f"Cash - interest payment {month_name}"),
        ])

    print(f"  Generated {je_counter[0]} journal entries ({len(rows)} lines)")
    return rows


# =====================================================================
# MAIN
# =====================================================================
def main():
    print("=" * 70)
    print("MITCHELL CUSTOM HOMES - OWNER-BUILDER MOCK DATA")
    print("=" * 70)
    print()

    all_sheets = {}
    all_sheets["chart_of_accounts"] = generate_coa()
    all_sheets["bank_accounts"]     = generate_bank_accounts()
    all_sheets["projects"]          = generate_projects()
    all_sheets["contacts"]          = generate_contacts()
    all_sheets["vendors"]           = generate_vendors()
    all_sheets["budget_lines"]      = generate_budget_lines()
    all_sheets["invoices"]          = generate_invoices()
    all_sheets["journal_entries"]   = generate_journal_entries()

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
        target_ni=None,           # No target NI for owner-builder
        account_names=account_names,
    )

    # ── Invoice total sanity check ───────────────────────────────────
    inv_total = sum(float(r["amount"]) for r in all_sheets["invoices"])
    print(f"\n  Total invoiced (payable):  ${inv_total:>15,.2f}")
    print(f"  Budget:                    ${2800000:>15,.2f}")
    print(f"  Pct spent:                 {inv_total / 2800000 * 100:>14.1f}%")

    # ── Build XLSX ───────────────────────────────────────────────────
    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "Mitchell_Custom_Homes_Import.xlsx",
    )
    print()
    build_xlsx(all_sheets, out_path)
    print("\nDONE!")


if __name__ == "__main__":
    main()
