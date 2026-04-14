#!/usr/bin/env python3
"""
Crestline Property Management LLC - Mock Data Generator
========================================================
Denver, CO property management company.
Revenue ~$8.5M (management fees $5.2M + rental income $3.3M), Net Income ~$1M.
Heavy on units, leases, and maintenance; minimal construction.
"""

import sys
import os
import random
from datetime import date, timedelta
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from shared.helpers import (
    MONTHS, MONTH_ENDS, MONTH_NAMES,
    random_phone, random_email, random_date_between, fmt, allocate_to_months,
)
from shared.name_pools import generate_person_name
from shared.xlsx_builder import build_xlsx, verify_financials

# ────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ────────────────────────────────────────────────────────────────────────────
COMPANY = "Crestline Property Management LLC"
YEAR = 2025
OB_DATE = "2025-01-01"
OB_PRIOR = "2024-12-31"

# ────────────────────────────────────────────────────────────────────────────
# 1. CHART OF ACCOUNTS
# ────────────────────────────────────────────────────────────────────────────
def gen_chart_of_accounts():
    rows = []
    def a(num, name, atype, sub):
        rows.append({
            "account_number": str(num),
            "account_name": name,
            "account_type": atype,
            "sub_type": sub,
        })
    # Assets
    a(1000, "Cash - Operating",              "Asset", "Cash and Cash Equivalents")
    a(1010, "Accounts Receivable",           "Asset", "Accounts Receivable")
    a(1020, "Retainage Receivable",          "Asset", "Accounts Receivable")
    a(1050, "Rent Receivable",               "Asset", "Current Assets")
    a(1100, "Buildings & Improvements",      "Asset", "Fixed Assets")
    a(1110, "Accum Depreciation - Buildings", "Asset", "Fixed Assets")
    a(1200, "Land",                          "Asset", "Fixed Assets")
    a(1300, "Security Deposits Held",        "Asset", "Other Assets")
    # Liabilities
    a(2000, "Accounts Payable",              "Liability", "Accounts Payable")
    a(2010, "Retainage Payable",             "Liability", "Other Current Liabilities")
    a(2020, "Accrued Payroll",               "Liability", "Other Current Liabilities")
    a(2060, "Deferred Rental Revenue",       "Liability", "Other Current Liabilities")
    a(2070, "Tenant Security Deposits Liability", "Liability", "Other Current Liabilities")
    a(2100, "Mortgage Payable",              "Liability", "Long-Term Liabilities")
    # Equity
    a(3000, "Owners Capital",                "Equity", "Owners Equity")
    a(3010, "Retained Earnings",             "Equity", "Retained Earnings")
    # Revenue
    a(4000, "Management Fee Revenue",        "Revenue", "Operating Revenue")
    a(4100, "Rental Income",                 "Revenue", "Operating Revenue")
    a(4110, "Late Fee Revenue",              "Revenue", "Other Revenue")
    a(4120, "Maintenance Markup Revenue",    "Revenue", "Other Revenue")
    # Expenses
    a(5000, "Maintenance & Repairs",         "Expense", "Direct Costs")
    a(5010, "Maintenance Supplies",          "Expense", "Direct Costs")
    a(5020, "Cleaning & Turnover",           "Expense", "Direct Costs")
    a(6000, "Salaries & Wages",              "Expense", "Payroll Expenses")
    a(6010, "Payroll Taxes & Benefits",      "Expense", "Payroll Expenses")
    a(6020, "Office Rent & Utilities",       "Expense", "General & Administrative")
    a(6030, "Professional Services",         "Expense", "General & Administrative")
    a(6040, "Insurance - General",           "Expense", "General & Administrative")
    a(6100, "Depreciation Expense",          "Expense", "General & Administrative")
    a(6200, "Property Insurance",            "Expense", "Property Expenses")
    a(6210, "Property Taxes",                "Expense", "Property Expenses")
    a(6220, "Utilities - Common Areas",      "Expense", "Property Expenses")
    a(6230, "Landscaping & Snow Removal",    "Expense", "Property Expenses")
    a(7000, "Interest Expense",              "Expense", "Other Expenses")
    return rows


# ────────────────────────────────────────────────────────────────────────────
# 2. BANK ACCOUNTS
# ────────────────────────────────────────────────────────────────────────────
def gen_bank_accounts():
    return [
        {
            "account_name": "Operating Account",
            "bank_name": "FirstBank Colorado",
            "account_type": "checking",
            "account_number": "7820041553",
            "routing_number": "107005047",
            "current_balance": "850000.00",
            "gl_account": "1000",
        },
        {
            "account_name": "Trust Account",
            "bank_name": "FirstBank Colorado",
            "account_type": "checking",
            "account_number": "7820041667",
            "routing_number": "107005047",
            "current_balance": "1200000.00",
            "gl_account": "1000",
        },
        {
            "account_name": "Reserve Fund",
            "bank_name": "US Bank",
            "account_type": "savings",
            "account_number": "4031889920",
            "routing_number": "104000029",
            "current_balance": "340000.00",
            "gl_account": "1000",
        },
    ]


# ────────────────────────────────────────────────────────────────────────────
# 3. PROPERTIES
# ────────────────────────────────────────────────────────────────────────────
PROPERTIES = [
    {
        "name": "Alpine Ridge Apartments",
        "property_type": "residential",
        "address_line1": "4500 W Colfax Ave",
        "city": "Denver", "state": "CO", "zip": "80204",
        "year_built": "2018", "total_sqft": "96000",
        "total_units": 120,
        "purchase_price": "18000000", "current_value": "22000000",
    },
    {
        "name": "Cherry Creek Residences",
        "property_type": "residential",
        "address_line1": "200 Fillmore St",
        "city": "Denver", "state": "CO", "zip": "80206",
        "year_built": "2020", "total_sqft": "68000",
        "total_units": 85,
        "purchase_price": "15000000", "current_value": "19500000",
    },
    {
        "name": "LoDo Lofts",
        "property_type": "residential",
        "address_line1": "1800 Wazee St",
        "city": "Denver", "state": "CO", "zip": "80202",
        "year_built": "2015", "total_sqft": "54000",
        "total_units": 60,
        "purchase_price": "12000000", "current_value": "16000000",
    },
    {
        "name": "Stapleton Commons",
        "property_type": "residential",
        "address_line1": "8200 E 29th Ave",
        "city": "Denver", "state": "CO", "zip": "80238",
        "year_built": "2019", "total_sqft": "76000",
        "total_units": 95,
        "purchase_price": "14000000", "current_value": "18000000",
    },
    {
        "name": "Broadway Business Center",
        "property_type": "commercial",
        "address_line1": "1400 Broadway",
        "city": "Denver", "state": "CO", "zip": "80203",
        "year_built": "2016", "total_sqft": "32000",
        "total_units": 40,
        "purchase_price": "8000000", "current_value": "10500000",
    },
]


def gen_properties():
    rows = []
    for p in PROPERTIES:
        rows.append({
            "name": p["name"],
            "property_type": p["property_type"],
            "address_line1": p["address_line1"],
            "address_line2": "",
            "city": p["city"],
            "state": p["state"],
            "zip": p["zip"],
            "year_built": p["year_built"],
            "total_sqft": p["total_sqft"],
            "total_units": str(p["total_units"]),
            "purchase_price": p["purchase_price"],
            "current_value": p["current_value"],
        })
    return rows


# ────────────────────────────────────────────────────────────────────────────
# 4. UNITS (~400)
# ────────────────────────────────────────────────────────────────────────────
UNIT_MIX = {
    "Alpine Ridge Apartments": [
        ("Studio", 40, 450, 550, 0, 1, 1400, 1600),
        ("1BR",    50, 650, 750, 1, 1, 1700, 2000),
        ("2BR",    30, 900, 1050, 2, 2, 1900, 2200),
    ],
    "Cherry Creek Residences": [
        ("Studio", 20, 500, 600, 0, 1, 1600, 2000),
        ("1BR",    40, 700, 850, 1, 1, 2000, 2500),
        ("2BR",    25, 1000, 1200, 2, 2, 2400, 2800),
    ],
    "LoDo Lofts": [
        ("Studio", 15, 550, 650, 0, 1, 1800, 2200),
        ("1BR",    30, 750, 900, 1, 1, 2200, 2800),
        ("2BR",    15, 1050, 1250, 2, 2, 2800, 3200),
    ],
    "Stapleton Commons": [
        ("Studio", 25, 400, 500, 0, 1, 1300, 1500),
        ("1BR",    45, 600, 700, 1, 1, 1500, 1800),
        ("2BR",    25, 850, 1000, 2, 2, 1800, 2100),
    ],
    "Broadway Business Center": [
        ("Office Suite", 40, 600, 1200, 0, 0, 2500, 5000),
    ],
}


def gen_units():
    """Generate units for all properties. Returns (rows, occupied_units_list)."""
    rows = []
    occupied_units = []  # (property_name, unit_number) for lease generation

    for prop in PROPERTIES:
        pname = prop["name"]
        mixes = UNIT_MIX[pname]
        unit_num = 100
        for (utype, count, sqft_lo, sqft_hi, beds, baths, rent_lo, rent_hi) in mixes:
            for i in range(count):
                unit_num += 1
                unit_str = str(unit_num)
                floor = int(unit_str[0]) if len(unit_str) >= 3 else 1
                sqft = random.randint(sqft_lo, sqft_hi)
                market_rent = round(random.uniform(rent_lo, rent_hi) / 50) * 50
                # status distribution: 85% occupied, 10% vacant, 5% maintenance
                r = random.random()
                if r < 0.85:
                    status = "occupied"
                elif r < 0.95:
                    status = "vacant"
                else:
                    status = "maintenance"

                row = {
                    "property_name": pname,
                    "unit_number": unit_str,
                    "unit_type": utype,
                    "sqft": str(sqft),
                    "bedrooms": str(beds),
                    "bathrooms": str(baths),
                    "floor_number": str(floor),
                    "market_rent": f"{market_rent:.2f}",
                    "status": status,
                }
                rows.append(row)

                if status == "occupied":
                    occupied_units.append((pname, unit_str, market_rent))

    return rows, occupied_units


# ────────────────────────────────────────────────────────────────────────────
# 5. PROJECTS (1 small renovation)
# ────────────────────────────────────────────────────────────────────────────
def gen_projects():
    return [
        {
            "name": "Alpine Ridge Common Area Renovation",
            "code": "ARR-2025",
            "project_type": "Renovation",
            "status": "active",
            "budget": "450000.00",
            "start_date": "2025-03-01",
            "end_date": "2025-07-31",
            "completion_pct": "25",
            "client_name": COMPANY,
            "address_line1": "4500 W Colfax Ave",
            "city": "Denver",
            "state": "CO",
            "zip": "80204",
        },
    ]


# ────────────────────────────────────────────────────────────────────────────
# 6. CONTACTS (~15)
# ────────────────────────────────────────────────────────────────────────────
def gen_contacts(used_names):
    rows = []

    # Property managers (5)
    pm_titles = ["Property Manager"] * 5
    for i, prop in enumerate(PROPERTIES):
        first, last = generate_person_name(used_names)
        rows.append({
            "first_name": first,
            "last_name": last,
            "company_name": COMPANY,
            "title": "Property Manager",
            "email": random_email(first, last, "crestlinepm.com"),
            "phone": random_phone(),
            "contact_type": "Employee",
            "notes": f"Manager for {prop['name']}",
        })

    # Maintenance technicians (4)
    for i in range(4):
        first, last = generate_person_name(used_names)
        rows.append({
            "first_name": first,
            "last_name": last,
            "company_name": COMPANY,
            "title": "Maintenance Technician",
            "email": random_email(first, last, "crestlinepm.com"),
            "phone": random_phone(),
            "contact_type": "Employee",
            "notes": f"Maintenance tech - Zone {i+1}",
        })

    # Office staff (3): admin, accountant, leasing agent
    office_roles = [
        ("Office Administrator", "Admin and scheduling"),
        ("Staff Accountant", "AR/AP and financial reporting"),
        ("Leasing Agent", "Prospect tours and lease signing"),
    ]
    for title, notes in office_roles:
        first, last = generate_person_name(used_names)
        rows.append({
            "first_name": first,
            "last_name": last,
            "company_name": COMPANY,
            "title": title,
            "email": random_email(first, last, "crestlinepm.com"),
            "phone": random_phone(),
            "contact_type": "Employee",
            "notes": notes,
        })

    # External contacts (3)
    externals = [
        ("Attorney", "Westfield Legal Group", "Real estate and tenant law"),
        ("Insurance Broker", "Rocky Mountain Insurance", "Property and liability coverage"),
        ("CPA", "Summit Tax Advisors", "Tax preparation and audit support"),
    ]
    for title, company, notes in externals:
        first, last = generate_person_name(used_names)
        rows.append({
            "first_name": first,
            "last_name": last,
            "company_name": company,
            "title": title,
            "email": random_email(first, last),
            "phone": random_phone(),
            "contact_type": "External",
            "notes": notes,
        })

    return rows


# ────────────────────────────────────────────────────────────────────────────
# 7. VENDORS (~12)
# ────────────────────────────────────────────────────────────────────────────
VENDOR_LIST = [
    ("Mile High Plumbing",       "Plumber",         "Plumbing repairs and installations"),
    ("Front Range Electric",     "Electrician",      "Electrical repairs and panel upgrades"),
    ("Denver Comfort HVAC",      "HVAC",             "Heating and cooling service and repair"),
    ("Keystone Lock & Safe",     "Locksmith",        "Lock changes, rekeying, and access control"),
    ("Peak Appliance Service",   "Appliance Repair", "Appliance diagnosis and replacement"),
    ("Spotless Carpet Care",     "Carpet Cleaning",  "Deep cleaning and stain removal"),
    ("Colorado Pro Painters",    "Painting",         "Interior and exterior painting services"),
    ("Green Valley Landscaping", "Landscaping",      "Lawn care, irrigation, and seasonal planting"),
    ("Alpine Snow Pros",         "Snow Removal",     "Parking lot and sidewalk snow removal"),
    ("Bug-Free Pest Control",    "Pest Control",     "Monthly treatments and on-call pest removal"),
    ("Summit Elevator Co",       "Elevator Service", "Elevator maintenance and inspections"),
    ("FireGuard Systems",        "Fire Alarm",       "Fire alarm testing and sprinkler inspection"),
]


def gen_vendors():
    rows = []
    for name, specialty, desc in VENDOR_LIST:
        rows.append({
            "vendor_name": name,
            "contact_name": "",
            "email": f"service@{name.lower().replace(' ', '').replace('&', '')}co.com",
            "phone": random_phone(),
            "address_line1": f"{random.randint(100, 9999)} {random.choice(['Colfax','Broadway','Federal','Sheridan','Alameda','Evans','Colorado'])} {random.choice(['Ave','Blvd','St'])}",
            "city": "Denver",
            "state": "CO",
            "zip": f"80{random.randint(200, 239)}",
            "specialty": specialty,
            "notes": desc,
        })
    return rows


# ────────────────────────────────────────────────────────────────────────────
# 8. INVOICES (~50)
# ────────────────────────────────────────────────────────────────────────────
def gen_invoices():
    """Generate invoices.
    Returns (rows, ob_recv_total, ob_pay_total, mgmt_fee_total, maint_cost_total).
    """
    rows = []
    inv_num = 7000

    # ── Monthly management fee amounts per property (annual totals ~$5.2M) ──
    # Larger properties generate higher fees
    mgmt_fees_annual = {
        "Alpine Ridge Apartments":   1_300_000,
        "Cherry Creek Residences":   1_200_000,
        "LoDo Lofts":               1_000_000,
        "Stapleton Commons":         1_000_000,
        "Broadway Business Center":    700_000,
    }  # total = $5,200,000

    # ── 5 OB Receivable invoices (prior-year management fees, paid) ──
    ob_recv_total = 0.0
    for prop in PROPERTIES:
        inv_num += 1
        amt = round(mgmt_fees_annual[prop["name"]] / 12, 2)  # one month
        ob_recv_total += amt
        rows.append({
            "invoice_number": f"INV-{inv_num}",
            "invoice_type": "receivable",
            "invoice_date": OB_PRIOR,
            "amount": f"{amt:.2f}",
            "tax_amount": "0",
            "due_date": OB_PRIOR,
            "description": f"Dec 2024 management fee - {prop['name']}",
            "status": "paid",
            "client_name": prop["name"],
            "vendor_name": "",
            "project_name": "",
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
        })

    # ── 5 OB Payable invoices (prior-year vendor bills, paid) ──
    ob_pay_total = 0.0
    ob_vendors = random.sample(VENDOR_LIST, 5)
    ob_amounts = [4800, 3200, 5600, 2900, 4100]
    for i, (vname, _, vdesc) in enumerate(ob_vendors):
        inv_num += 1
        amt = ob_amounts[i]
        ob_pay_total += amt
        rows.append({
            "invoice_number": f"INV-{inv_num}",
            "invoice_type": "payable",
            "invoice_date": OB_PRIOR,
            "amount": f"{amt:.2f}",
            "tax_amount": "0",
            "due_date": OB_PRIOR,
            "description": f"Dec 2024 - {vdesc}",
            "status": "paid",
            "client_name": "",
            "vendor_name": vname,
            "project_name": "",
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
        })

    # ── 20 Receivable invoices: management fees (4 months x 5 properties) ──
    mgmt_fee_total = 0.0
    for month_idx in range(4):  # Jan-Apr 2025
        month_num = month_idx + 1
        inv_date = f"2025-{month_num:02d}-01"
        due_date = f"2025-{month_num:02d}-15"
        for prop in PROPERTIES:
            inv_num += 1
            amt = round(mgmt_fees_annual[prop["name"]] / 12, 2)
            mgmt_fee_total += amt
            # First 3 months paid, most recent month unpaid
            status = "paid" if month_idx < 3 else "unpaid"
            rows.append({
                "invoice_number": f"INV-{inv_num}",
                "invoice_type": "receivable",
                "invoice_date": inv_date,
                "amount": f"{amt:.2f}",
                "tax_amount": "0",
                "due_date": due_date,
                "description": f"{MONTH_NAMES[month_idx]} {YEAR} management fee - {prop['name']}",
                "status": status,
                "client_name": prop["name"],
                "vendor_name": "",
                "project_name": "",
                "gl_account": "4000",
                "retainage_pct": "0",
                "retainage_held": "0",
            })

    # ── 20 Payable invoices: vendor maintenance/repairs ──
    maint_cost_total = 0.0
    maint_descriptions = [
        ("Emergency plumbing repair - unit {u}", "5000"),
        ("HVAC filter replacement - building common area", "5010"),
        ("Unit turnover cleaning - unit {u}", "5020"),
        ("Electrical panel inspection", "5000"),
        ("Appliance repair - refrigerator unit {u}", "5000"),
        ("Carpet deep clean - hallways", "5020"),
        ("Touch-up painting - unit {u}", "5020"),
        ("Lock rekey - unit {u}", "5010"),
        ("Pest treatment - monthly service", "5000"),
        ("Fire alarm annual inspection", "5000"),
        ("Elevator maintenance - quarterly", "5000"),
        ("Parking lot snow removal", "5010"),
        ("Landscaping - spring cleanup", "5010"),
        ("Water heater replacement - unit {u}", "5000"),
        ("Garbage disposal repair - unit {u}", "5000"),
        ("Window seal repair - unit {u}", "5010"),
        ("Common area lighting replacement", "5010"),
        ("Roof drain cleaning", "5000"),
        ("Hallway carpet replacement - floor 2", "5020"),
        ("Exterior painting touch-up", "5020"),
    ]
    for i in range(20):
        inv_num += 1
        vendor = random.choice(VENDOR_LIST)
        prop = random.choice(PROPERTIES)
        desc_template, gl = maint_descriptions[i]
        unit_num = random.randint(101, 140)
        desc = desc_template.format(u=unit_num)
        month_idx = random.randint(0, 3)  # Jan-Apr
        month_num = month_idx + 1
        day = random.randint(3, 25)
        inv_date = f"2025-{month_num:02d}-{day:02d}"
        due_day = min(day + 30, 28)
        due_month = month_num + 1 if day + 30 > 28 else month_num
        if due_month > 12:
            due_month = 12
            due_day = 31
        due_date = f"2025-{due_month:02d}-{due_day:02d}"
        amt = round(random.uniform(350, 8500), 2)
        maint_cost_total += amt
        status = "paid" if month_idx < 3 else random.choice(["paid", "unpaid"])
        rows.append({
            "invoice_number": f"INV-{inv_num}",
            "invoice_type": "payable",
            "invoice_date": inv_date,
            "amount": f"{amt:.2f}",
            "tax_amount": "0",
            "due_date": due_date,
            "description": f"{prop['name']} - {desc}",
            "status": status,
            "client_name": "",
            "vendor_name": vendor[0],
            "project_name": "",
            "gl_account": gl,
            "retainage_pct": "0",
            "retainage_held": "0",
        })

    return rows, ob_recv_total, ob_pay_total, mgmt_fee_total, maint_cost_total


# ────────────────────────────────────────────────────────────────────────────
# 9. JOURNAL ENTRIES (~120 lines)
#    CRITICAL: NEVER touch 1010, 1020, 2000, 2010
# ────────────────────────────────────────────────────────────────────────────
def gen_journal_entries(ob_recv_total, ob_pay_total, mgmt_fee_total, maint_cost_total):
    """Generate all journal entries.

    Financial model (annual):
        Management Fee Revenue:   $5,200,000  (4 months via invoices ~$1.73M; 8 months via JE catch-up ~$3.47M)
        Rental Income:            $3,300,000  (JE -> 4100)
        ────────────────────────────────────
        Total Revenue:            $8,500,000

        Salaries & Wages:         $3,000,000  (JE -> 6000)
        Payroll Taxes & Benefits:   $800,000  (JE -> 6010)
        Maintenance Costs:        $1,500,000  (~$98K via invoices; rest via JE catch-up -> 5000)
        Property Insurance:         $400,000  (JE -> 6200)
        Property Taxes:             $400,000  (JE -> 6210)
        Utilities - Common Areas:   $200,000  (JE -> 6220)
        Landscaping & Snow:         $200,000  (JE -> 6230)
        Office Rent & Utilities:    $200,000  (JE -> 6020)
        Professional Services:      $150,000  (JE -> 6030)
        Insurance - General:        $150,000  (JE -> 6040)
        Depreciation:               $300,000  (JE -> 6100/1110)
        Interest Expense:           $200,000  (JE -> 7000)
        ────────────────────────────────────
        Total Expenses:           $7,500,000
        Net Income:               $1,000,000

    CRITICAL: Never touch 1010, 1020, 2000, 2010.
    """
    rows = []
    je_num = 0

    def je(entry_number, entry_date, account_number, description, debit, credit, memo=""):
        rows.append({
            "entry_number": entry_number,
            "entry_date": entry_date,
            "account_number": str(account_number),
            "description": description,
            "debit": fmt(debit),
            "credit": fmt(credit),
            "memo": memo,
        })

    # ── Annual allocations ──
    annual_salaries      = 3_000_000
    annual_payroll_tax   = 800_000
    annual_rental_income = 3_300_000
    annual_prop_ins      = 400_000
    annual_prop_tax      = 400_000
    annual_utilities     = 200_000
    annual_landscape     = 200_000
    annual_office        = 200_000
    annual_professional  = 150_000
    annual_ins_general   = 150_000
    annual_depreciation  = 300_000
    annual_interest      = 200_000
    annual_mgmt_fees     = 5_200_000
    annual_maintenance   = 1_500_000

    # Catch-up amounts: total annual minus what invoices already cover
    mgmt_fee_catchup = round(annual_mgmt_fees - mgmt_fee_total, 2)
    maint_catchup    = round(annual_maintenance - maint_cost_total, 2)

    monthly_salaries     = allocate_to_months(annual_salaries)
    monthly_payroll_tax  = allocate_to_months(annual_payroll_tax)
    monthly_rental       = allocate_to_months(annual_rental_income)
    monthly_prop_ins     = allocate_to_months(annual_prop_ins)
    monthly_prop_tax     = allocate_to_months(annual_prop_tax)
    monthly_utilities    = allocate_to_months(annual_utilities)
    monthly_landscape    = allocate_to_months(annual_landscape)
    monthly_office       = allocate_to_months(annual_office)
    monthly_professional = allocate_to_months(annual_professional)
    monthly_ins_general  = allocate_to_months(annual_ins_general)
    quarterly_dep        = round(annual_depreciation / 4, 2)
    monthly_interest     = allocate_to_months(annual_interest)

    # Distribute catch-up evenly across months 5-12 (May-Dec)
    # These are the months not covered by invoices
    mgmt_catchup_monthly = allocate_to_months(mgmt_fee_catchup, [0,0,0,0,1,1,1,1,1,1,1,1])
    maint_catchup_monthly = allocate_to_months(maint_catchup, [0,0,0,0,1,1,1,1,1,1,1,1])

    # ── Opening Balance ──
    je_num += 1
    en = f"JE-{je_num:04d}"

    ob_cash          = 2_390_000.00
    ob_rent_recv     = 275_000.00
    ob_buildings     = 67_000_000.00
    ob_accum_dep     = 5_400_000.00    # credit balance
    ob_land          = 15_000_000.00
    ob_sec_dep_asset = 2_800_000.00
    ob_accrued_pay   = 316_667.00      # credit
    ob_deferred_rev  = 275_000.00      # credit
    ob_tenant_dep    = 2_800_000.00    # credit
    ob_mortgage      = 42_000_000.00   # credit
    ob_owners_eq     = 25_000_000.00   # credit

    # Plug retained earnings so debits == credits
    total_dr = ob_cash + ob_rent_recv + ob_buildings + ob_land + ob_sec_dep_asset
    total_cr = (ob_accum_dep + ob_accrued_pay + ob_deferred_rev
                + ob_tenant_dep + ob_mortgage + ob_owners_eq)

    ob_retained = total_dr - total_cr
    # ob_retained is the plug: positive means CR 3010.

    je(en, OB_DATE, 1000, "Opening balance - Cash",           ob_cash, 0)
    je(en, OB_DATE, 1050, "Opening balance - Rent Receivable", ob_rent_recv, 0)
    je(en, OB_DATE, 1100, "Opening balance - Buildings",       ob_buildings, 0)
    je(en, OB_DATE, 1110, "Opening balance - Accum Dep",       0, ob_accum_dep)
    je(en, OB_DATE, 1200, "Opening balance - Land",            ob_land, 0)
    je(en, OB_DATE, 1300, "Opening balance - Security Deposits", ob_sec_dep_asset, 0)
    je(en, OB_DATE, 2020, "Opening balance - Accrued Payroll", 0, ob_accrued_pay)
    je(en, OB_DATE, 2060, "Opening balance - Deferred Revenue", 0, ob_deferred_rev)
    je(en, OB_DATE, 2070, "Opening balance - Tenant Deposits", 0, ob_tenant_dep)
    je(en, OB_DATE, 2100, "Opening balance - Mortgage",        0, ob_mortgage)
    je(en, OB_DATE, 3000, "Opening balance - Owners Capital",  0, ob_owners_eq)

    if ob_retained >= 0:
        je(en, OB_DATE, 3010, "Opening balance - Retained Earnings", 0, ob_retained)
    else:
        je(en, OB_DATE, 3010, "Opening balance - Retained Earnings", -ob_retained, 0)

    # ── Monthly entries (12 months) ──
    for m in range(12):
        month_end = MONTH_ENDS[m]
        month_label = MONTH_NAMES[m]
        mid_month = f"2025-{m+1:02d}-15"

        # (a) Payroll accrual: DR 6000 + 6010 / CR 2020
        je_num += 1
        en = f"JE-{je_num:04d}"
        sal = monthly_salaries[m]
        ptx = monthly_payroll_tax[m]
        je(en, month_end, 6000, f"{month_label} salaries",            sal, 0)
        je(en, month_end, 6010, f"{month_label} payroll taxes & benefits", ptx, 0)
        je(en, month_end, 2020, f"{month_label} payroll accrual",     0, round(sal + ptx, 2))

        # Payroll payment: DR 2020 / CR 1000
        je_num += 1
        en = f"JE-{je_num:04d}"
        total_payroll = round(sal + ptx, 2)
        je(en, month_end, 2020, f"{month_label} payroll payment",  total_payroll, 0)
        je(en, month_end, 1000, f"{month_label} payroll payment",  0, total_payroll)

        # (b) Overhead: DR 6020 + 6030 + 6040 / CR 1000
        je_num += 1
        en = f"JE-{je_num:04d}"
        off = monthly_office[m]
        pro = monthly_professional[m]
        ins = monthly_ins_general[m]
        overhead_total = round(off + pro + ins, 2)
        je(en, mid_month, 6020, f"{month_label} office rent & utilities",  off, 0)
        je(en, mid_month, 6030, f"{month_label} professional services",    pro, 0)
        je(en, mid_month, 6040, f"{month_label} insurance - general",      ins, 0)
        je(en, mid_month, 1000, f"{month_label} overhead payment",         0, overhead_total)

        # (c) Rental Income: DR 1000 / CR 4100
        je_num += 1
        en = f"JE-{je_num:04d}"
        rent = monthly_rental[m]
        je(en, f"2025-{m+1:02d}-01", 1000, f"{month_label} rent collections", rent, 0)
        je(en, f"2025-{m+1:02d}-01", 4100, f"{month_label} rental income",    0, rent)

        # (d) Property Expenses: DR 6200 + 6210 + 6220 + 6230 / CR 1000
        je_num += 1
        en = f"JE-{je_num:04d}"
        pi = monthly_prop_ins[m]
        pt = monthly_prop_tax[m]
        ut = monthly_utilities[m]
        ls = monthly_landscape[m]
        prop_total = round(pi + pt + ut + ls, 2)
        je(en, month_end, 6200, f"{month_label} property insurance",       pi, 0)
        je(en, month_end, 6210, f"{month_label} property taxes",           pt, 0)
        je(en, month_end, 6220, f"{month_label} utilities - common areas", ut, 0)
        je(en, month_end, 6230, f"{month_label} landscaping & snow",       ls, 0)
        je(en, month_end, 1000, f"{month_label} property expense payment", 0, prop_total)

        # (e) Depreciation (quarterly: Mar, Jun, Sep, Dec)
        if (m + 1) in (3, 6, 9, 12):
            je_num += 1
            en = f"JE-{je_num:04d}"
            je(en, month_end, 6100, f"Q{(m+1)//3} depreciation expense",    quarterly_dep, 0)
            je(en, month_end, 1110, f"Q{(m+1)//3} accumulated depreciation", 0, quarterly_dep)

        # (f) Interest expense: DR 7000 / CR 1000
        je_num += 1
        en = f"JE-{je_num:04d}"
        intr = monthly_interest[m]
        je(en, month_end, 7000, f"{month_label} mortgage interest",        intr, 0)
        je(en, month_end, 1000, f"{month_label} interest payment",         0, intr)

        # (g) Management fee catch-up (months 5-12, where invoices don't cover)
        #     DR 1000 / CR 4000 — cash collection of management fees
        catchup_mgmt = mgmt_catchup_monthly[m]
        if catchup_mgmt > 0:
            je_num += 1
            en = f"JE-{je_num:04d}"
            je(en, f"2025-{m+1:02d}-05", 1000, f"{month_label} management fee collections", catchup_mgmt, 0)
            je(en, f"2025-{m+1:02d}-05", 4000, f"{month_label} management fee revenue",     0, catchup_mgmt)

        # (h) Maintenance cost catch-up (months 5-12, where invoices don't cover)
        #     DR 5000 / CR 1000 — maintenance vendor payments
        catchup_maint = maint_catchup_monthly[m]
        if catchup_maint > 0:
            je_num += 1
            en = f"JE-{je_num:04d}"
            je(en, month_end, 5000, f"{month_label} maintenance & repairs",  catchup_maint, 0)
            je(en, month_end, 1000, f"{month_label} maintenance payments",   0, catchup_maint)

    return rows


# ────────────────────────────────────────────────────────────────────────────
# 10. LEASES (~340)
# ────────────────────────────────────────────────────────────────────────────
def gen_leases(occupied_units, used_names):
    rows = []
    for pname, unit_num, market_rent in occupied_units:
        first, last = generate_person_name(used_names)
        tenant_name = f"{first} {last}"
        email = random_email(first, last)
        phone = random_phone()

        # Lease start: random date in the last 12 months
        start_offset = random.randint(0, 364)
        lease_start = date(2024, 2, 1) + timedelta(days=start_offset)
        lease_end = lease_start + timedelta(days=365)

        # Monthly rent: market rent +/- $50
        monthly_rent = market_rent + random.choice([-50, -25, 0, 0, 0, 25, 50])
        security_deposit = monthly_rent  # 1 month rent

        rows.append({
            "property_name": pname,
            "unit_number": unit_num,
            "tenant_name": tenant_name,
            "tenant_email": email,
            "tenant_phone": phone,
            "lease_start": lease_start.strftime("%Y-%m-%d"),
            "lease_end": lease_end.strftime("%Y-%m-%d"),
            "monthly_rent": f"{monthly_rent:.2f}",
            "security_deposit": f"{security_deposit:.2f}",
            "status": "active",
        })

    return rows


# ────────────────────────────────────────────────────────────────────────────
# 11. MAINTENANCE WORK ORDERS (~30)
# ────────────────────────────────────────────────────────────────────────────
MAINTENANCE_ISSUES = [
    ("Leaky kitchen faucet", "Tenant reported dripping faucet under kitchen sink", "medium"),
    ("Broken AC unit", "AC not cooling, compressor may need replacement", "high"),
    ("Clogged bathroom drain", "Slow draining tub, possible hair clog", "low"),
    ("Broken door lock", "Front door deadbolt not engaging properly", "high"),
    ("Refrigerator not cooling", "Fridge temperature rising, food spoiling", "emergency"),
    ("Garbage disposal jammed", "Disposal making grinding noise, not draining", "medium"),
    ("Water heater leaking", "Small puddle under water heater in utility closet", "high"),
    ("Dishwasher not draining", "Standing water in dishwasher after cycle", "medium"),
    ("Broken window latch", "Bedroom window won't lock securely", "medium"),
    ("Smoke detector beeping", "Low battery alarm in hallway smoke detector", "low"),
    ("Toilet running constantly", "Flapper valve not seating properly", "medium"),
    ("Light fixture flickering", "Kitchen ceiling light flickers intermittently", "low"),
    ("Thermostat malfunction", "Thermostat display blank, no response", "high"),
    ("Ceiling leak", "Water stain and drip from upstairs bathroom", "emergency"),
    ("Oven not heating", "Electric oven not reaching temperature", "medium"),
    ("Balcony railing loose", "Metal railing wobbles, safety concern", "high"),
    ("Dryer vent blocked", "Dryer not drying clothes, vent may be clogged", "medium"),
    ("Pest issue - ants", "Ant trail along kitchen baseboards", "low"),
    ("Carpet stain - hallway", "Large stain in common area hallway carpet", "low"),
    ("Elevator noise", "Unusual grinding sound when elevator moves between floors", "high"),
    ("Parking lot pothole", "Large pothole near building entrance", "medium"),
    ("Mailbox lock broken", "Tenant cannot access mailbox unit 203", "medium"),
    ("Washing machine leak", "In-unit washer leaking from bottom", "high"),
    ("Exterior light out", "Parking lot lamp post #3 not working", "medium"),
    ("Roof drain clogged", "Ponding water on flat roof section", "high"),
    ("Intercom not working", "Building entry intercom buzzer dead", "medium"),
    ("Mold in bathroom", "Black mold around shower caulking", "high"),
    ("Cracked window pane", "Bedroom window cracked from thermal stress", "medium"),
    ("Hot water intermittent", "Hot water cutting out during showers", "high"),
    ("Garage door stuck", "Parking garage door not opening fully", "emergency"),
]


def gen_maintenance(occupied_units):
    rows = []
    for i in range(30):
        title, desc, priority = MAINTENANCE_ISSUES[i]
        prop_name, unit_num, _ = random.choice(occupied_units)

        # Random reported date in Jan-Apr 2025
        month = random.randint(1, 4)
        day = random.randint(1, 28)
        reported = date(2025, month, day)

        # Status distribution
        r = random.random()
        if r < 0.55:
            status = "completed"
            completed_date = reported + timedelta(days=random.randint(1, 7))
        elif r < 0.80:
            status = "in_progress"
            completed_date = None
        else:
            status = "pending"
            completed_date = None

        rows.append({
            "title": title,
            "description": desc,
            "property_name": prop_name,
            "unit_number": unit_num,
            "priority": priority,
            "status": status,
            "reported_date": reported.strftime("%Y-%m-%d"),
            "completed_date": completed_date.strftime("%Y-%m-%d") if completed_date else "",
            "cost": "0",  # costs handled via invoices
        })

    return rows


# ────────────────────────────────────────────────────────────────────────────
# 12. PROPERTY EXPENSES (~25)
# ────────────────────────────────────────────────────────────────────────────
def gen_property_expenses():
    rows = []
    expense_types = [
        ("Insurance",     "Annual property insurance premium - monthly allocation",
         "Rocky Mountain Insurance", 6200),
        ("Property Tax",  "Quarterly property tax installment",
         "Denver County Treasurer", 6210),
        ("Utilities",     "Common area electric and water",
         "Xcel Energy / Denver Water", 6220),
        ("Landscaping",   "Monthly grounds maintenance and seasonal planting",
         "Green Valley Landscaping", 6230),
        ("Snow Removal",  "Parking and sidewalk snow removal service",
         "Alpine Snow Pros", 6230),
    ]

    for prop in PROPERTIES:
        for etype, desc, vendor, gl in expense_types:
            # Monthly amounts vary by property size
            total_units = prop["total_units"]
            base_multiplier = total_units / 100.0
            if etype == "Insurance":
                amt = round(base_multiplier * random.uniform(5500, 7500), 2)
            elif etype == "Property Tax":
                amt = round(base_multiplier * random.uniform(6000, 8500), 2)
            elif etype == "Utilities":
                amt = round(base_multiplier * random.uniform(2800, 4200), 2)
            elif etype == "Landscaping":
                amt = round(base_multiplier * random.uniform(2500, 4000), 2)
            else:  # Snow Removal
                amt = round(base_multiplier * random.uniform(1500, 3500), 2)

            # Pick a month in Q1 2025
            month = random.randint(1, 3)
            exp_date = f"2025-{month:02d}-{random.randint(1, 28):02d}"

            rows.append({
                "property_name": prop["name"],
                "expense_type": etype,
                "description": f"{prop['name']} - {desc}",
                "amount": f"{amt:.2f}",
                "expense_date": exp_date,
                "vendor_name": vendor,
            })

    return rows


# ────────────────────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────────────────────
def main():
    random.seed(300)

    print("=" * 70)
    print("CRESTLINE PROPERTY MANAGEMENT LLC - MOCK DATA GENERATOR")
    print("=" * 70)
    print(f"Company:  {COMPANY}")
    print(f"Location: Denver, CO")
    print(f"Revenue:  ~$8.5M (mgmt fees $5.2M + rental $3.3M)")
    print(f"Net Income target: ~$1.0M")
    print()

    used_names = set()
    all_sheets = {}

    # 1. Chart of Accounts
    coa = gen_chart_of_accounts()
    all_sheets["chart_of_accounts"] = coa
    account_names = {int(r["account_number"]): r["account_name"] for r in coa}

    # 2. Bank Accounts
    all_sheets["bank_accounts"] = gen_bank_accounts()

    # 3. Properties
    all_sheets["properties"] = gen_properties()

    # 4. Units
    unit_rows, occupied_units = gen_units()
    all_sheets["units"] = unit_rows

    # 5. Projects
    all_sheets["projects"] = gen_projects()

    # 6. Contacts
    all_sheets["contacts"] = gen_contacts(used_names)

    # 7. Vendors
    all_sheets["vendors"] = gen_vendors()

    # 8. Invoices
    inv_rows, ob_recv, ob_pay, mgmt_fee_total, maint_cost_total = gen_invoices()
    all_sheets["invoices"] = inv_rows

    # 9. Journal Entries
    je_rows = gen_journal_entries(ob_recv, ob_pay, mgmt_fee_total, maint_cost_total)
    all_sheets["journal_entries"] = je_rows

    # 10. Leases
    all_sheets["leases"] = gen_leases(occupied_units, used_names)

    # 11. Maintenance
    all_sheets["maintenance"] = gen_maintenance(occupied_units)

    # 12. Property Expenses
    all_sheets["property_expenses"] = gen_property_expenses()

    # ── Summary ──
    print("\nSHEET SUMMARY:")
    print("-" * 50)
    total_rows = sum(len(v) for v in all_sheets.values())

    # ── Financial Verification ──
    verify_financials(
        je_rows,
        inv_rows,
        target_ni=1_000_000,
        account_names=account_names,
    )

    # ── Print occupied/vacant stats ──
    occ = sum(1 for u in unit_rows if u["status"] == "occupied")
    vac = sum(1 for u in unit_rows if u["status"] == "vacant")
    mnt = sum(1 for u in unit_rows if u["status"] == "maintenance")
    print(f"\nUNIT STATISTICS:")
    print(f"  Total units:   {len(unit_rows)}")
    print(f"  Occupied:      {occ} ({100*occ/len(unit_rows):.1f}%)")
    print(f"  Vacant:        {vac} ({100*vac/len(unit_rows):.1f}%)")
    print(f"  Maintenance:   {mnt} ({100*mnt/len(unit_rows):.1f}%)")
    print(f"  Leases:        {len(all_sheets['leases'])}")

    # ── Build XLSX ──
    print("\n" + "=" * 70)
    print("BUILDING XLSX")
    print("=" * 70)
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "Crestline_Property_Management_Import.xlsx")
    build_xlsx(all_sheets, output_path)

    print("\nDONE!")


if __name__ == "__main__":
    main()
