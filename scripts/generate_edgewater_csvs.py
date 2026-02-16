"""
Generate all CSV files for 8400 Edgewater Mixed-Use Development.
Based on thorough audit of 8400_Edgewater_ProForma_FINAL_v5.xlsx.

Run: python scripts/generate_edgewater_csvs.py
"""

import csv
import os
from datetime import datetime, timedelta
from typing import Any

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "mock-data", "8400-edgewater")
os.makedirs(OUT_DIR, exist_ok=True)


def write_csv(filename: str, rows: list[dict[str, Any]]):
    path = os.path.join(OUT_DIR, filename)
    if not rows:
        return
    # Collect ALL keys across all rows (some rows may have optional fields)
    all_keys: list[str] = []
    seen: set[str] = set()
    for row in rows:
        for k in row:
            if k not in seen:
                all_keys.append(k)
                seen.add(k)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_keys, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Wrote {len(rows)} rows -> {filename}")


# ===========================================================================
# CONSTANTS from the Pro Forma
# ===========================================================================

PROJECT_NAME = "8400 Edgewater Mixed-Use Development"
PROJECT_CODE = "EDG-2026"
PROPERTY_NAME = "8400 Edgewater"

# Residential unit mix (from Resi tab)
RESI_UNITS = [
    {"type": "studio", "count": 63, "sqft": 400, "rent_per_sf": 4.275, "bedrooms": 0, "bathrooms": 1.0},
    {"type": "1br",    "count": 75, "sqft": 600, "rent_per_sf": 3.920, "bedrooms": 1, "bathrooms": 1.0},
    {"type": "2br",    "count": 88, "sqft": 886, "rent_per_sf": 3.547, "bedrooms": 2, "bathrooms": 2.0},
    {"type": "3br",    "count": 24, "sqft": 1175,"rent_per_sf": 3.221, "bedrooms": 3, "bathrooms": 2.0},
]
TOTAL_RESI_UNITS = sum(u["count"] for u in RESI_UNITS)  # 250

# Residential operating expenses ($/unit/year from Resi tab)
RESI_OPEX = {
    "Utilities": 1000,
    "Turnover / Make-Ready": 600,
    "Repairs & Maintenance": 1100,
    "Contract Services": 750,
    "Marketing": 300,
    "General & Administrative": 1000,
    "Personnel": 1575,
    "Management Fees (3%)": None,  # calculated as 3% of revenue
    "Insurance": 1000,
    "Property Taxes": 2500,
}
RESI_MGMT_FEE_PCT = 0.03
RESI_VACANCY_PCT = 0.05
RESI_REPLACEMENT_RESERVES = 350  # $/unit/year

# Studio facilities (from Studio tab)
STUDIO_FACILITIES = [
    {"name": "Soundstage A", "sqft": 20000, "rate_psf": 35, "term_mo": 96, "escalation": 0.025, "free_rent_mo": 3},
    {"name": "Soundstage B", "sqft": 20000, "rate_psf": 35, "term_mo": 96, "escalation": 0.025, "free_rent_mo": 3},
    {"name": "Soundstage C", "sqft": 20000, "rate_psf": 35, "term_mo": 96, "escalation": 0.025, "free_rent_mo": 3},
    {"name": "Production Office 1", "sqft": 15000, "rate_psf": 28, "term_mo": 60, "escalation": 0.025, "free_rent_mo": 3},
    {"name": "Production Office 2", "sqft": 10000, "rate_psf": 28, "term_mo": 60, "escalation": 0.025, "free_rent_mo": 3},
    {"name": "Support Facilities", "sqft": 20000, "rate_psf": 22, "term_mo": 60, "escalation": 0.025, "free_rent_mo": 3},
    {"name": "Backlot / Exterior", "sqft": 15000, "rate_psf": 18, "term_mo": 36, "escalation": 0.025, "free_rent_mo": 3},
]
STUDIO_TOTAL_SF = sum(f["sqft"] for f in STUDIO_FACILITIES)  # 120,000
STUDIO_VACANCY_PCT = 0.10
STUDIO_ANCILLARY = {"Equipment Rental": 180000, "Catering Services": 120000, "Studio Tours": 250000}

# Studio operating expenses ($/SF/year from Studio tab)
STUDIO_OPEX_PSF = {
    "Personnel": 3.50,
    "Utilities": 2.75,
    "Repairs & Maintenance": 1.50,
    "Insurance": 1.25,
    "Taxes": 3.00,
    "Security": 1.00,
    "General & Administrative": 0.50,
}

# Parking (from Parking tab)
PARKING = {
    "Residential": {"spaces": 289, "occupancy": 1.00, "monthly_rate": 0},
    "Daily Transient": {"spaces": 56, "occupancy": 0.80, "monthly_rate": 0},
    "Evening Transient": {"spaces": 131, "occupancy": 0.80, "monthly_rate": 0},
}
TOTAL_PARKING = sum(p["spaces"] for p in PARKING.values())  # 476

# Development Budget (from Budget tab)
BUDGET_HARD_COSTS = {
    "Residential GMP": 80222447,
    "Studio Build-Out": 15000000,
    "Furniture, Fixtures & Equipment": 2000000,
}
HARD_COST_CONTINGENCY_PCT = 0.03

BUDGET_SOFT_COSTS = {
    "Architecture & Engineering": 6900000,
    "Finance & Legal Costs": 4225267,
    "Construction Interest Reserve": 1011237,
    "Marketing & Pre-Leasing": 200000,
    "Operating Deficits Reserve": 1014017,
    "Taxes & Insurance (Construction)": 6800000,
    "Permits & Project Management": 4200000,
    "Developer Fees": 0,
}
SOFT_COST_CONTINGENCY_PCT = 0.05

BUDGET_LEASING = {
    "Studio Tenant Improvements": 3700000,
    "Studio Leasing Commissions": 186700,
}

# Schedule
CONSTRUCTION_START = datetime(2026, 11, 1)
CONSTRUCTION_MONTHS = 23
CONSTRUCTION_END = datetime(2028, 9, 30)
FIRST_MOVEINS = datetime(2028, 5, 1)  # 18 months from start
STABILIZATION = datetime(2029, 3, 1)  # 10 months after move-ins

# Financing
LTC_RATIO = 0.50
CONSTRUCTION_LOAN_SPREAD = 0.0275  # over SOFR

# Exit cap rates
EXIT_CAPS = {
    "Residential": 0.055,
    "Studio": 0.065,
    "Parking": 0.060,
}


# ===========================================================================
# 1. CHART OF ACCOUNTS (expanded with OpEx + Revenue accounts)
# ===========================================================================
def gen_chart_of_accounts():
    rows = [
        # Assets
        {"account_number": "1000", "name": "Cash & Cash Equivalents", "account_type": "asset", "sub_type": "current_asset", "description": "Operating cash accounts"},
        {"account_number": "1010", "name": "Accounts Receivable", "account_type": "asset", "sub_type": "current_asset", "description": "Tenant and client receivables"},
        {"account_number": "1020", "name": "Prepaid Expenses", "account_type": "asset", "sub_type": "current_asset", "description": "Prepaid insurance, taxes, etc."},
        {"account_number": "1030", "name": "Construction Escrow", "account_type": "asset", "sub_type": "current_asset", "description": "Funds held for construction draws"},
        {"account_number": "1100", "name": "Land", "account_type": "asset", "sub_type": "fixed_asset", "description": "Land cost"},
        {"account_number": "1110", "name": "Building - Residential", "account_type": "asset", "sub_type": "fixed_asset", "description": "Residential construction costs"},
        {"account_number": "1120", "name": "Building - Studio", "account_type": "asset", "sub_type": "fixed_asset", "description": "Studio build-out costs"},
        {"account_number": "1130", "name": "Furniture, Fixtures & Equipment", "account_type": "asset", "sub_type": "fixed_asset", "description": "FF&E"},
        {"account_number": "1140", "name": "Tenant Improvements", "account_type": "asset", "sub_type": "fixed_asset", "description": "Studio tenant improvements"},
        {"account_number": "1200", "name": "Accumulated Depreciation", "account_type": "asset", "sub_type": "fixed_asset", "description": "Accumulated depreciation on fixed assets"},
        {"account_number": "1300", "name": "Construction in Progress", "account_type": "asset", "sub_type": "fixed_asset", "description": "CIP - costs before project completion"},
        # Liabilities
        {"account_number": "2000", "name": "Accounts Payable", "account_type": "liability", "sub_type": "current_liability", "description": "Trade payables to vendors/subs"},
        {"account_number": "2010", "name": "Accrued Expenses", "account_type": "liability", "sub_type": "current_liability", "description": "Accrued but unpaid expenses"},
        {"account_number": "2020", "name": "Security Deposits Held", "account_type": "liability", "sub_type": "current_liability", "description": "Tenant security deposits"},
        {"account_number": "2030", "name": "Prepaid Rent", "account_type": "liability", "sub_type": "current_liability", "description": "Advance rent received"},
        {"account_number": "2100", "name": "Construction Loan", "account_type": "liability", "sub_type": "long_term_liability", "description": "Construction loan (SOFR + 275bps, 50% LTC)"},
        {"account_number": "2110", "name": "Permanent Loan", "account_type": "liability", "sub_type": "long_term_liability", "description": "Perm loan (Treasury + 200bps, 30yr amort)"},
        {"account_number": "2120", "name": "Accrued Interest", "account_type": "liability", "sub_type": "current_liability", "description": "Interest accrued on loans"},
        # Equity
        {"account_number": "3000", "name": "Owner's Equity - GP", "account_type": "equity", "sub_type": "equity", "description": "General Partner equity (10%)"},
        {"account_number": "3010", "name": "Owner's Equity - LP", "account_type": "equity", "sub_type": "equity", "description": "Limited Partner equity (90%)"},
        {"account_number": "3020", "name": "Retained Earnings", "account_type": "equity", "sub_type": "equity", "description": "Accumulated profits"},
        {"account_number": "3030", "name": "Distributions", "account_type": "equity", "sub_type": "equity", "description": "Distributions to partners"},
        # Revenue
        {"account_number": "4000", "name": "Residential Rental Revenue", "account_type": "revenue", "sub_type": "operating_revenue", "description": "Gross potential rent - residential"},
        {"account_number": "4010", "name": "Studio Lease Revenue", "account_type": "revenue", "sub_type": "operating_revenue", "description": "Studio facility lease income"},
        {"account_number": "4020", "name": "Parking Revenue", "account_type": "revenue", "sub_type": "operating_revenue", "description": "Parking income"},
        {"account_number": "4030", "name": "Ancillary Revenue - Equipment", "account_type": "revenue", "sub_type": "operating_revenue", "description": "Studio equipment rental"},
        {"account_number": "4040", "name": "Ancillary Revenue - Catering", "account_type": "revenue", "sub_type": "operating_revenue", "description": "On-site catering services"},
        {"account_number": "4050", "name": "Ancillary Revenue - Tours", "account_type": "revenue", "sub_type": "operating_revenue", "description": "Studio tour income"},
        {"account_number": "4090", "name": "Vacancy Adjustment", "account_type": "revenue", "sub_type": "operating_revenue", "description": "Vacancy loss (contra-revenue)"},
        {"account_number": "4100", "name": "Concessions", "account_type": "revenue", "sub_type": "operating_revenue", "description": "Lease concessions (contra-revenue)"},
        # Operating Expenses - Residential
        {"account_number": "5000", "name": "Utilities Expense", "account_type": "expense", "sub_type": "operating_expense", "description": "Electric, water, gas, sewer"},
        {"account_number": "5010", "name": "Turnover / Make-Ready", "account_type": "expense", "sub_type": "operating_expense", "description": "Unit turnover and make-ready costs"},
        {"account_number": "5020", "name": "Repairs & Maintenance", "account_type": "expense", "sub_type": "operating_expense", "description": "Building and unit R&M"},
        {"account_number": "5030", "name": "Contract Services", "account_type": "expense", "sub_type": "operating_expense", "description": "Janitorial, landscaping, pest control"},
        {"account_number": "5040", "name": "Marketing & Advertising", "account_type": "expense", "sub_type": "operating_expense", "description": "Leasing marketing and advertising"},
        {"account_number": "5050", "name": "General & Administrative", "account_type": "expense", "sub_type": "operating_expense", "description": "Office supplies, legal, accounting"},
        {"account_number": "5060", "name": "Personnel / Payroll", "account_type": "expense", "sub_type": "operating_expense", "description": "On-site staff salaries and benefits"},
        {"account_number": "5070", "name": "Management Fees", "account_type": "expense", "sub_type": "operating_expense", "description": "Property management fee (3% of revenue)"},
        {"account_number": "5080", "name": "Insurance Expense", "account_type": "expense", "sub_type": "operating_expense", "description": "Property and liability insurance"},
        {"account_number": "5090", "name": "Property Taxes", "account_type": "expense", "sub_type": "operating_expense", "description": "Real estate taxes"},
        {"account_number": "5100", "name": "Replacement Reserves", "account_type": "expense", "sub_type": "operating_expense", "description": "Capital replacement reserves"},
        # Operating Expenses - Studio
        {"account_number": "5200", "name": "Studio Personnel", "account_type": "expense", "sub_type": "operating_expense", "description": "Studio operations staff"},
        {"account_number": "5210", "name": "Studio Utilities", "account_type": "expense", "sub_type": "operating_expense", "description": "Studio power and utilities"},
        {"account_number": "5220", "name": "Studio Repairs & Maintenance", "account_type": "expense", "sub_type": "operating_expense", "description": "Studio facility maintenance"},
        {"account_number": "5230", "name": "Studio Insurance", "account_type": "expense", "sub_type": "operating_expense", "description": "Studio-specific insurance"},
        {"account_number": "5240", "name": "Studio Taxes", "account_type": "expense", "sub_type": "operating_expense", "description": "Studio property taxes"},
        {"account_number": "5250", "name": "Studio Security", "account_type": "expense", "sub_type": "operating_expense", "description": "Studio security services"},
        {"account_number": "5260", "name": "Studio G&A", "account_type": "expense", "sub_type": "operating_expense", "description": "Studio general & administrative"},
        # Development / Non-Operating Expenses
        {"account_number": "6000", "name": "Architecture & Engineering", "account_type": "expense", "sub_type": "development_cost", "description": "A&E professional fees"},
        {"account_number": "6010", "name": "Finance & Legal Costs", "account_type": "expense", "sub_type": "development_cost", "description": "Loan fees, legal, accounting"},
        {"account_number": "6020", "name": "Construction Interest", "account_type": "expense", "sub_type": "development_cost", "description": "Capitalized interest during construction"},
        {"account_number": "6030", "name": "Permits & Project Management", "account_type": "expense", "sub_type": "development_cost", "description": "Permit fees and PM costs"},
        {"account_number": "6040", "name": "Leasing Commissions", "account_type": "expense", "sub_type": "development_cost", "description": "Broker commissions"},
        {"account_number": "6050", "name": "Developer Fees", "account_type": "expense", "sub_type": "development_cost", "description": "Developer overhead and profit"},
        # Interest Expense
        {"account_number": "7000", "name": "Interest Expense - Construction Loan", "account_type": "expense", "sub_type": "interest_expense", "description": "Interest on construction loan"},
        {"account_number": "7010", "name": "Interest Expense - Permanent Loan", "account_type": "expense", "sub_type": "interest_expense", "description": "Interest on permanent loan"},
        # Other
        {"account_number": "8000", "name": "Depreciation Expense", "account_type": "expense", "sub_type": "depreciation", "description": "Annual depreciation on buildings and improvements"},
        {"account_number": "9000", "name": "Gain on Sale of Property", "account_type": "revenue", "sub_type": "other_income", "description": "Gain from property disposition"},
    ]
    write_csv("01_chart_of_accounts.csv", rows)
    return rows


# ===========================================================================
# 2. CONTACTS (keep existing + add studio tenants)
# ===========================================================================
def gen_contacts():
    rows = [
        {"contact_type": "subcontractor", "first_name": "David", "last_name": "Kowalski", "company_name": "Pacific General Contractors", "job_title": "President", "email": "david@edgewaterGC.com", "phone": "510-555-0201"},
        {"contact_type": "subcontractor", "first_name": "Linda", "last_name": "Yamamoto", "company_name": "Yamamoto Architecture + Design", "job_title": "Principal", "email": "linda@yamamoto-arch.com", "phone": "510-555-0202"},
        {"contact_type": "subcontractor", "first_name": "Robert", "last_name": "Santos", "company_name": "Bay Area Structural Engineers", "job_title": "Senior Partner", "email": "robert@bayareastructural.com", "phone": "510-555-0203"},
        {"contact_type": "subcontractor", "first_name": "Karen", "last_name": "Nguyen", "company_name": "Nguyen MEP Engineering", "job_title": "Principal", "email": "karen@nguyen-mep.com", "phone": "510-555-0204"},
        {"contact_type": "subcontractor", "first_name": "Tom", "last_name": "Bradley", "company_name": "Bradley Concrete & Foundation", "job_title": "Owner", "email": "tom@bradleyconcrete.com", "phone": "510-555-0205"},
        {"contact_type": "subcontractor", "first_name": "Eric", "last_name": "Johansson", "company_name": "Johansson Structural Steel", "job_title": "VP Operations", "email": "eric@johansson-steel.com", "phone": "510-555-0206"},
        {"contact_type": "subcontractor", "first_name": "Maria", "last_name": "Reyes", "company_name": "Reyes Electrical Systems", "job_title": "President", "email": "maria@reyeselectric.com", "phone": "510-555-0207"},
        {"contact_type": "subcontractor", "first_name": "Chris", "last_name": "Park", "company_name": "Park Mechanical & Plumbing", "job_title": "Owner", "email": "chris@parkplumbing.com", "phone": "510-555-0208"},
        {"contact_type": "subcontractor", "first_name": "Nina", "last_name": "Volkov", "company_name": "Volkov Interior Finishes", "job_title": "Principal", "email": "nina@volkov-interiors.com", "phone": "510-555-0209"},
        {"contact_type": "subcontractor", "first_name": "Jason", "last_name": "Wright", "company_name": "Wright Glass & Curtain Wall", "job_title": "Ops Manager", "email": "jason@wrightglazing.com", "phone": "510-555-0210"},
        {"contact_type": "subcontractor", "first_name": "Amy", "last_name": "Torres", "company_name": "Torres Landscape Architecture", "job_title": "Owner", "email": "amy@torreslandscape.com", "phone": "510-555-0211"},
        # Vendors / Suppliers
        {"contact_type": "vendor", "first_name": "Mike", "last_name": "Henderson", "company_name": "Pacific Lumber & Supply", "job_title": "Account Manager", "email": "mike@pacificlumber.com", "phone": "510-555-0301"},
        {"contact_type": "vendor", "first_name": "Rachel", "last_name": "Kim", "company_name": "Bay Steel Distributors", "job_title": "Territory Rep", "email": "rachel@baysteelsupply.com", "phone": "510-555-0302"},
        {"contact_type": "vendor", "first_name": "Steve", "last_name": "Gomez", "company_name": "West Coast Concrete Supply", "job_title": "Sales Manager", "email": "steve@westcoastconcrete.com", "phone": "510-555-0303"},
        {"contact_type": "vendor", "first_name": "Diane", "last_name": "Fischer", "company_name": "Fischer Equipment Rental", "job_title": "Branch Manager", "email": "diane@fischerequip.com", "phone": "510-555-0304"},
        {"contact_type": "vendor", "first_name": "Paul", "last_name": "Hartman", "company_name": "Hartman Testing & Inspection", "job_title": "Lab Director", "email": "paul@hartmantesting.com", "phone": "510-555-0305"},
        # Finance
        {"contact_type": "client", "first_name": "Jennifer", "last_name": "Walsh", "company_name": "Wells Fargo Construction Lending", "job_title": "Senior VP", "email": "jennifer@wellsfargo.com", "phone": "415-555-0401"},
        # Studio Tenants
        {"contact_type": "client", "first_name": "Marcus", "last_name": "Chen", "company_name": "Bay Area Film Studios LLC", "job_title": "CEO", "email": "marcus@bayfilmstudios.com", "phone": "510-555-0501"},
        {"contact_type": "client", "first_name": "Sarah", "last_name": "Blackwell", "company_name": "Pinnacle Productions", "job_title": "VP Operations", "email": "sarah@pinnacleproductions.com", "phone": "510-555-0502"},
        {"contact_type": "client", "first_name": "Derek", "last_name": "Tanaka", "company_name": "Pacific Post-Production", "job_title": "Managing Director", "email": "derek@pacificpost.com", "phone": "510-555-0503"},
        {"contact_type": "client", "first_name": "Lisa", "last_name": "Moreno", "company_name": "Backlot Events & Rentals", "job_title": "General Manager", "email": "lisa@backlotevents.com", "phone": "510-555-0504"},
        # OpEx Service Providers
        {"contact_type": "vendor", "first_name": "James", "last_name": "Porter", "company_name": "Apex Property Management", "job_title": "Regional Director", "email": "james@apexpm.com", "phone": "510-555-0601"},
        {"contact_type": "vendor", "first_name": "Anna", "last_name": "Sullivan", "company_name": "Guardian Security Services", "job_title": "Account Exec", "email": "anna@guardiansec.com", "phone": "510-555-0602"},
        {"contact_type": "vendor", "first_name": "Robert", "last_name": "Chang", "company_name": "Bay Area Utilities Co.", "job_title": "Commercial Accts", "email": "robert@bayutilities.com", "phone": "510-555-0603"},
        {"contact_type": "vendor", "first_name": "Patricia", "last_name": "Dean", "company_name": "Pacific Insurance Group", "job_title": "Commercial Lines", "email": "patricia@pacificinsurance.com", "phone": "510-555-0604"},
    ]
    write_csv("02_contacts.csv", rows)


# ===========================================================================
# 3. BANK ACCOUNTS (keep existing)
# ===========================================================================
def gen_bank_accounts():
    rows = [
        {"name": "Operating Account", "bank_name": "Wells Fargo", "account_type": "checking", "account_number_last4": "4521", "routing_number_last4": "0721", "current_balance": "2450000"},
        {"name": "Construction Escrow", "bank_name": "Wells Fargo", "account_type": "escrow", "account_number_last4": "4522", "routing_number_last4": "0721", "current_balance": "64800000"},
        {"name": "Security Deposit Account", "bank_name": "First Republic", "account_type": "savings", "account_number_last4": "8901", "routing_number_last4": "1123", "current_balance": "0"},
        {"name": "Tax & Insurance Reserve", "bank_name": "Wells Fargo", "account_type": "escrow", "account_number_last4": "4523", "routing_number_last4": "0721", "current_balance": "6800000"},
        {"name": "Operating Deficit Reserve", "bank_name": "First Republic", "account_type": "savings", "account_number_last4": "8902", "routing_number_last4": "1123", "current_balance": "1014017"},
        {"name": "Petty Cash", "bank_name": "N/A", "account_type": "checking", "account_number_last4": "0000", "routing_number_last4": "0000", "current_balance": "5000"},
    ]
    write_csv("03_bank_accounts.csv", rows)


# ===========================================================================
# 4. PROJECT (keep existing)
# ===========================================================================
def gen_project():
    total_hard = sum(BUDGET_HARD_COSTS.values())
    hard_contingency = round(total_hard * HARD_COST_CONTINGENCY_PCT)
    total_soft = sum(BUDGET_SOFT_COSTS.values())
    soft_contingency = round(total_soft * SOFT_COST_CONTINGENCY_PCT)
    total_leasing = sum(BUDGET_LEASING.values())
    total_budget = total_hard + hard_contingency + total_soft + soft_contingency + total_leasing

    rows = [{"name": PROJECT_NAME, "code": PROJECT_CODE, "status": "pre_construction",
             "project_type": "mixed_use", "description": "250-unit residential + 120,000 SF movie studio + 476-space parking",
             "address_line1": "8400 Edgewater Drive", "city": "Oakland", "state": "CA", "zip": "94621",
             "client_name": "Grit and Turtle Ventures", "client_contact": "Managing Partner",
             "contract_amount": str(total_budget), "start_date": "2026-11-01",
             "estimated_end_date": "2028-09-30"}]
    write_csv("05_projects.csv", rows)


# ===========================================================================
# 5. VENDORS (same as contacts but vendor-typed)
# ===========================================================================
def gen_vendors():
    rows = [
        {"company_name": "Pacific General Contractors", "first_name": "David", "last_name": "Kowalski", "email": "david@edgewaterGC.com", "phone": "510-555-0201", "job_title": "President"},
        {"company_name": "Yamamoto Architecture + Design", "first_name": "Linda", "last_name": "Yamamoto", "email": "linda@yamamoto-arch.com", "phone": "510-555-0202", "job_title": "Principal"},
        {"company_name": "Bay Area Structural Engineers", "first_name": "Robert", "last_name": "Santos", "email": "robert@bayareastructural.com", "phone": "510-555-0203", "job_title": "Senior Partner"},
        {"company_name": "Nguyen MEP Engineering", "first_name": "Karen", "last_name": "Nguyen", "email": "karen@nguyen-mep.com", "phone": "510-555-0204", "job_title": "Principal"},
        {"company_name": "Bradley Concrete & Foundation", "first_name": "Tom", "last_name": "Bradley", "email": "tom@bradleyconcrete.com", "phone": "510-555-0205", "job_title": "Owner"},
        {"company_name": "Johansson Structural Steel", "first_name": "Eric", "last_name": "Johansson", "email": "eric@johansson-steel.com", "phone": "510-555-0206", "job_title": "VP Operations"},
        {"company_name": "Reyes Electrical Systems", "first_name": "Maria", "last_name": "Reyes", "email": "maria@reyeselectric.com", "phone": "510-555-0207", "job_title": "President"},
        {"company_name": "Park Mechanical & Plumbing", "first_name": "Chris", "last_name": "Park", "email": "chris@parkplumbing.com", "phone": "510-555-0208", "job_title": "Owner"},
        {"company_name": "Volkov Interior Finishes", "first_name": "Nina", "last_name": "Volkov", "email": "nina@volkov-interiors.com", "phone": "510-555-0209", "job_title": "Principal"},
        {"company_name": "Wright Glass & Curtain Wall", "first_name": "Jason", "last_name": "Wright", "email": "jason@wrightglazing.com", "phone": "510-555-0210", "job_title": "Operations Manager"},
        {"company_name": "Torres Landscape Architecture", "first_name": "Amy", "last_name": "Torres", "email": "amy@torreslandscape.com", "phone": "510-555-0211", "job_title": "Owner"},
        {"company_name": "Pacific Lumber & Supply", "first_name": "Mike", "last_name": "Henderson", "email": "mike@pacificlumber.com", "phone": "510-555-0301", "job_title": "Account Manager"},
        {"company_name": "Bay Steel Distributors", "first_name": "Rachel", "last_name": "Kim", "email": "rachel@baysteelsupply.com", "phone": "510-555-0302", "job_title": "Territory Rep"},
        {"company_name": "West Coast Concrete Supply", "first_name": "Steve", "last_name": "Gomez", "email": "steve@westcoastconcrete.com", "phone": "510-555-0303", "job_title": "Sales Manager"},
        {"company_name": "Fischer Equipment Rental", "first_name": "Diane", "last_name": "Fischer", "email": "diane@fischerequip.com", "phone": "510-555-0304", "job_title": "Branch Manager"},
        {"company_name": "Hartman Testing & Inspection", "first_name": "Paul", "last_name": "Hartman", "email": "paul@hartmantesting.com", "phone": "510-555-0305", "job_title": "Lab Director"},
        {"company_name": "Apex Property Management", "first_name": "James", "last_name": "Porter", "email": "james@apexpm.com", "phone": "510-555-0601", "job_title": "Regional Director"},
        {"company_name": "Guardian Security Services", "first_name": "Anna", "last_name": "Sullivan", "email": "anna@guardiansec.com", "phone": "510-555-0602", "job_title": "Account Exec"},
        {"company_name": "Pacific Insurance Group", "first_name": "Patricia", "last_name": "Dean", "email": "patricia@pacificinsurance.com", "phone": "510-555-0604", "job_title": "Commercial Lines"},
    ]
    write_csv("08_vendors.csv", rows)


# ===========================================================================
# 6. PROPERTY
# ===========================================================================
def gen_property():
    total_resi_sf = sum(u["count"] * u["sqft"] for u in RESI_UNITS)
    total_sqft = total_resi_sf + STUDIO_TOTAL_SF
    rows = [{
        "name": PROPERTY_NAME,
        "property_type": "mixed_use",
        "address_line1": "8400 Edgewater Drive",
        "city": "Oakland",
        "state": "CA",
        "zip": "94621",
        "year_built": "2028",
        "total_sqft": str(total_sqft),
        "total_units": str(TOTAL_RESI_UNITS + len(STUDIO_FACILITIES)),
        "purchase_price": "0",
        "current_value": "129593867",
    }]
    write_csv("10_properties.csv", rows)


# ===========================================================================
# 7. LEASES (7 studio leases — auto-creates units via import)
# ===========================================================================
def gen_leases():
    """Studio leases — the import route auto-creates units for each lease."""
    lease_start = datetime(2028, 10, 1)  # after construction completion
    tenant_map = {
        "Soundstage A": ("Bay Area Film Studios LLC", "marcus@bayfilmstudios.com", "510-555-0501"),
        "Soundstage B": ("Bay Area Film Studios LLC", "marcus@bayfilmstudios.com", "510-555-0501"),
        "Soundstage C": ("Pinnacle Productions", "sarah@pinnacleproductions.com", "510-555-0502"),
        "Production Office 1": ("Pinnacle Productions", "sarah@pinnacleproductions.com", "510-555-0502"),
        "Production Office 2": ("Pacific Post-Production", "derek@pacificpost.com", "510-555-0503"),
        "Support Facilities": ("Pacific Post-Production", "derek@pacificpost.com", "510-555-0503"),
        "Backlot / Exterior": ("Backlot Events & Rentals", "lisa@backlotevents.com", "510-555-0504"),
    }
    rows = []
    for fac in STUDIO_FACILITIES:
        tenant_name, tenant_email, tenant_phone = tenant_map[fac["name"]]
        monthly_rent = round(fac["sqft"] * fac["rate_psf"] / 12, 2)
        end_date = lease_start + timedelta(days=fac["term_mo"] * 30)
        rows.append({
            "property_name": PROPERTY_NAME,
            "unit_number": fac["name"],
            "unit_type": "warehouse",  # closest match for studio space
            "tenant_name": tenant_name,
            "tenant_email": tenant_email,
            "tenant_phone": tenant_phone,
            "monthly_rent": str(monthly_rent),
            "security_deposit": str(round(monthly_rent * 2, 2)),
            "lease_start": lease_start.strftime("%Y-%m-%d"),
            "lease_end": end_date.strftime("%Y-%m-%d"),
            "status": "active",
        })
    write_csv("11_leases.csv", rows)


# ===========================================================================
# 8. CONTRACTS (aligned with budget line items)
# ===========================================================================
def gen_contracts():
    rows = [
        # Hard cost contracts
        {"contract_number": "CON-001", "title": "Residential GMP - General Construction", "contract_type": "general_contractor", "party_name": "Pacific General Contractors", "party_email": "david@edgewaterGC.com", "contract_amount": "80222447", "start_date": "2026-11-01", "end_date": "2028-09-30", "payment_terms": "Monthly progress billing with 10% retainage", "scope_of_work": "GMP contract for 250-unit residential tower construction", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-002", "title": "Studio Build-Out", "contract_type": "subcontractor", "party_name": "Pacific General Contractors", "party_email": "david@edgewaterGC.com", "contract_amount": "15000000", "start_date": "2027-03-01", "end_date": "2028-06-30", "payment_terms": "Monthly progress billing", "scope_of_work": "120,000 SF movie studio build-out (3 soundstages, offices, support, backlot)", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-003", "title": "Furniture, Fixtures & Equipment", "contract_type": "purchase_order", "party_name": "Volkov Interior Finishes", "party_email": "nina@volkov-interiors.com", "contract_amount": "2000000", "start_date": "2028-03-01", "end_date": "2028-08-30", "payment_terms": "50% deposit, 50% on delivery", "scope_of_work": "FF&E procurement and installation for common areas and model units", "project_name": PROJECT_NAME, "status": "draft"},
        # Soft cost contracts
        {"contract_number": "CON-010", "title": "Architecture & Engineering", "contract_type": "professional_services", "party_name": "Yamamoto Architecture + Design", "party_email": "linda@yamamoto-arch.com", "contract_amount": "6900000", "start_date": "2025-06-01", "end_date": "2028-09-30", "payment_terms": "Monthly based on phase completion", "scope_of_work": "Full architectural and engineering services: SD, DD, CD, CA phases", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-011", "title": "Structural Engineering", "contract_type": "professional_services", "party_name": "Bay Area Structural Engineers", "party_email": "robert@bayareastructural.com", "contract_amount": "1800000", "start_date": "2025-09-01", "end_date": "2028-09-30", "payment_terms": "Monthly progress billing", "scope_of_work": "Structural engineering for residential tower and studio facilities", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-012", "title": "MEP Engineering", "contract_type": "professional_services", "party_name": "Nguyen MEP Engineering", "party_email": "karen@nguyen-mep.com", "contract_amount": "1400000", "start_date": "2025-09-01", "end_date": "2028-09-30", "payment_terms": "Monthly progress billing", "scope_of_work": "Mechanical, electrical, plumbing engineering for all facilities", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-013", "title": "Legal & Finance Advisory", "contract_type": "professional_services", "party_name": "Wells Fargo Construction Lending", "party_email": "jennifer@wellsfargo.com", "contract_amount": "4225267", "start_date": "2025-06-01", "end_date": "2028-12-31", "payment_terms": "Monthly retainer + milestone fees", "scope_of_work": "Construction lending, legal documentation, loan administration", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-014", "title": "Permits & Project Management", "contract_type": "professional_services", "party_name": "Pacific General Contractors", "party_email": "david@edgewaterGC.com", "contract_amount": "4200000", "start_date": "2026-01-01", "end_date": "2028-09-30", "payment_terms": "Monthly fixed fee", "scope_of_work": "Permit applications, expediting, on-site project management", "project_name": PROJECT_NAME, "status": "executed"},
        # Studio leasing
        {"contract_number": "CON-020", "title": "Studio Tenant Improvements", "contract_type": "subcontractor", "party_name": "Volkov Interior Finishes", "party_email": "nina@volkov-interiors.com", "contract_amount": "3700000", "start_date": "2028-04-01", "end_date": "2028-09-30", "payment_terms": "Progress billing", "scope_of_work": "Tenant improvement build-out for studio facilities", "project_name": PROJECT_NAME, "status": "draft"},
        {"contract_number": "CON-021", "title": "Studio Leasing Services", "contract_type": "professional_services", "party_name": "Backlot Events & Rentals", "party_email": "lisa@backlotevents.com", "contract_amount": "186700", "start_date": "2028-01-01", "end_date": "2028-12-31", "payment_terms": "Commission on lease execution", "scope_of_work": "Studio facility leasing and tenant procurement", "project_name": PROJECT_NAME, "status": "draft"},
        # Subcontractor trades
        {"contract_number": "CON-030", "title": "Concrete & Foundation", "contract_type": "subcontractor", "party_name": "Bradley Concrete & Foundation", "party_email": "tom@bradleyconcrete.com", "contract_amount": "12500000", "start_date": "2026-11-01", "end_date": "2027-08-31", "payment_terms": "Monthly progress billing with 10% retainage", "scope_of_work": "Foundation, structural concrete, parking structure", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-031", "title": "Structural Steel", "contract_type": "subcontractor", "party_name": "Johansson Structural Steel", "party_email": "eric@johansson-steel.com", "contract_amount": "8500000", "start_date": "2027-03-01", "end_date": "2027-12-31", "payment_terms": "Monthly progress billing with 10% retainage", "scope_of_work": "Structural steel fabrication and erection", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-032", "title": "Electrical Systems", "contract_type": "subcontractor", "party_name": "Reyes Electrical Systems", "party_email": "maria@reyeselectric.com", "contract_amount": "9200000", "start_date": "2027-04-01", "end_date": "2028-08-31", "payment_terms": "Monthly progress billing with 10% retainage", "scope_of_work": "Electrical rough-in, service, distribution, studio power", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-033", "title": "Mechanical & Plumbing", "contract_type": "subcontractor", "party_name": "Park Mechanical & Plumbing", "party_email": "chris@parkplumbing.com", "contract_amount": "7800000", "start_date": "2027-04-01", "end_date": "2028-08-31", "payment_terms": "Monthly progress billing with 10% retainage", "scope_of_work": "HVAC, plumbing, fire protection systems", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-034", "title": "Glass & Curtain Wall", "contract_type": "subcontractor", "party_name": "Wright Glass & Curtain Wall", "party_email": "jason@wrightglazing.com", "contract_amount": "5200000", "start_date": "2027-08-01", "end_date": "2028-06-30", "payment_terms": "Monthly progress billing with 10% retainage", "scope_of_work": "Curtain wall, windows, storefronts, studio glazing", "project_name": PROJECT_NAME, "status": "executed"},
        {"contract_number": "CON-035", "title": "Landscape & Hardscape", "contract_type": "subcontractor", "party_name": "Torres Landscape Architecture", "party_email": "amy@torreslandscape.com", "contract_amount": "1800000", "start_date": "2028-04-01", "end_date": "2028-09-30", "payment_terms": "Monthly progress billing", "scope_of_work": "Landscape design and installation, hardscape, irrigation", "project_name": PROJECT_NAME, "status": "draft"},
        # Operations contracts
        {"contract_number": "CON-040", "title": "Property Management Agreement", "contract_type": "professional_services", "party_name": "Apex Property Management", "party_email": "james@apexpm.com", "contract_amount": "0", "start_date": "2028-05-01", "end_date": "2031-04-30", "payment_terms": "3% of gross revenue monthly", "scope_of_work": "Full-service property management for residential and common areas", "project_name": PROJECT_NAME, "status": "draft"},
        {"contract_number": "CON-041", "title": "Security Services", "contract_type": "professional_services", "party_name": "Guardian Security Services", "party_email": "anna@guardiansec.com", "contract_amount": "120000", "start_date": "2028-10-01", "end_date": "2029-09-30", "payment_terms": "Monthly fixed fee", "scope_of_work": "24/7 studio security and access control ($1.00/SF/yr)", "project_name": PROJECT_NAME, "status": "draft"},
        {"contract_number": "CON-042", "title": "Property Insurance", "contract_type": "professional_services", "party_name": "Pacific Insurance Group", "party_email": "patricia@pacificinsurance.com", "contract_amount": "250000", "start_date": "2028-10-01", "end_date": "2029-09-30", "payment_terms": "Annual premium, quarterly installments", "scope_of_work": "Property, liability, and studio equipment insurance", "project_name": PROJECT_NAME, "status": "draft"},
    ]
    write_csv("09_contracts.csv", rows)


# ===========================================================================
# 9. BUDGET LINES (detailed from Budget tab)
# ===========================================================================
def gen_budget_lines():
    total_hard = sum(BUDGET_HARD_COSTS.values())
    hard_contingency = round(total_hard * HARD_COST_CONTINGENCY_PCT)
    total_soft = sum(BUDGET_SOFT_COSTS.values())
    soft_contingency = round(total_soft * SOFT_COST_CONTINGENCY_PCT)

    rows = []
    # Land
    rows.append({"csi_code": "00-00", "description": "Land Acquisition", "budgeted_amount": "0", "committed_amount": "0", "actual_amount": "0"})
    # Hard Costs
    rows.append({"csi_code": "01-00", "description": "Residential GMP - General Construction", "budgeted_amount": "80222447", "committed_amount": "80222447", "actual_amount": "0"})
    rows.append({"csi_code": "01-10", "description": "Studio Build-Out", "budgeted_amount": "15000000", "committed_amount": "15000000", "actual_amount": "0"})
    rows.append({"csi_code": "01-20", "description": "Furniture, Fixtures & Equipment", "budgeted_amount": "2000000", "committed_amount": "2000000", "actual_amount": "0"})
    rows.append({"csi_code": "01-90", "description": "Hard Cost Contingency (3%)", "budgeted_amount": str(hard_contingency), "committed_amount": "0", "actual_amount": "0"})
    # Soft Costs
    rows.append({"csi_code": "02-10", "description": "Architecture & Engineering", "budgeted_amount": "6900000", "committed_amount": "6900000", "actual_amount": "2760000"})
    rows.append({"csi_code": "02-20", "description": "Finance & Legal Costs", "budgeted_amount": "4225267", "committed_amount": "4225267", "actual_amount": "845053"})
    rows.append({"csi_code": "02-30", "description": "Construction Interest Reserve", "budgeted_amount": "1011237", "committed_amount": "1011237", "actual_amount": "0"})
    rows.append({"csi_code": "02-40", "description": "Marketing & Pre-Leasing", "budgeted_amount": "200000", "committed_amount": "0", "actual_amount": "35000"})
    rows.append({"csi_code": "02-50", "description": "Operating Deficits Reserve", "budgeted_amount": "1014017", "committed_amount": "0", "actual_amount": "0"})
    rows.append({"csi_code": "02-60", "description": "Taxes & Insurance (Construction)", "budgeted_amount": "6800000", "committed_amount": "6800000", "actual_amount": "0"})
    rows.append({"csi_code": "02-70", "description": "Permits & Project Management", "budgeted_amount": "4200000", "committed_amount": "4200000", "actual_amount": "840000"})
    rows.append({"csi_code": "02-80", "description": "Developer Fees", "budgeted_amount": "0", "committed_amount": "0", "actual_amount": "0"})
    rows.append({"csi_code": "02-90", "description": "Soft Cost Contingency (5%)", "budgeted_amount": str(soft_contingency), "committed_amount": "0", "actual_amount": "0"})
    # Leasing Costs
    rows.append({"csi_code": "03-10", "description": "Studio Tenant Improvements", "budgeted_amount": "3700000", "committed_amount": "3700000", "actual_amount": "0"})
    rows.append({"csi_code": "03-20", "description": "Studio Leasing Commissions", "budgeted_amount": "186700", "committed_amount": "186700", "actual_amount": "0"})

    write_csv("project_budget_lines.csv", rows)


# ===========================================================================
# 10. INVOICES (AP for construction/soft costs + AR for studio leases)
# ===========================================================================
def gen_invoices():
    rows = []
    inv_num = 1

    def add_inv(inv_type, vendor, client, amount, date, status, desc, due_date=None):
        nonlocal inv_num
        num_str = f"INV-{inv_num:04d}"
        inv_num += 1
        if not due_date:
            d = datetime.strptime(date, "%Y-%m-%d")
            due_date = (d + timedelta(days=30)).strftime("%Y-%m-%d")
        rows.append({
            "invoice_number": num_str,
            "invoice_type": inv_type,
            "vendor_name": vendor or "",
            "client_name": client or "",
            "amount": str(round(amount, 2)),
            "invoice_date": date,
            "due_date": due_date,
            "status": status,
            "description": desc,
            "project_name": PROJECT_NAME,
        })

    # --- A&E INVOICES (AP) - progress billings, work started Jun 2025 ---
    # $6.9M total, ~$230K/month over 30 months, show 8 months billed (Jun 2025 - Jan 2026)
    ae_monthly = 230000
    for i in range(8):
        d = datetime(2025, 6, 1) + timedelta(days=i * 30)
        date_str = d.strftime("%Y-%m-%d")
        add_inv("payable", "Yamamoto Architecture + Design", None, ae_monthly, date_str, "paid",
                f"A&E Services - Progress Billing #{i+1}")

    # A&E Feb 2026 (current - approved)
    add_inv("payable", "Yamamoto Architecture + Design", None, ae_monthly, "2026-02-01", "approved",
            "A&E Services - Progress Billing #9")

    # --- STRUCTURAL ENGINEERING (AP) ---
    struct_monthly = 120000
    for i in range(5):
        d = datetime(2025, 9, 1) + timedelta(days=i * 30)
        date_str = d.strftime("%Y-%m-%d")
        add_inv("payable", "Bay Area Structural Engineers", None, struct_monthly, date_str, "paid",
                f"Structural Engineering - Progress Billing #{i+1}")
    add_inv("payable", "Bay Area Structural Engineers", None, struct_monthly, "2026-02-01", "approved",
            "Structural Engineering - Progress Billing #6")

    # --- MEP ENGINEERING (AP) ---
    mep_monthly = 93333
    for i in range(5):
        d = datetime(2025, 9, 1) + timedelta(days=i * 30)
        date_str = d.strftime("%Y-%m-%d")
        add_inv("payable", "Nguyen MEP Engineering", None, mep_monthly, date_str, "paid",
                f"MEP Engineering - Progress Billing #{i+1}")
    add_inv("payable", "Nguyen MEP Engineering", None, mep_monthly, "2026-02-01", "approved",
            "MEP Engineering - Progress Billing #6")

    # --- FINANCE & LEGAL (AP) ---
    add_inv("payable", "Wells Fargo Construction Lending", None, 350000, "2025-06-15", "paid",
            "Loan origination fee")
    add_inv("payable", "Wells Fargo Construction Lending", None, 125000, "2025-08-01", "paid",
            "Legal documentation & closing costs")
    add_inv("payable", "Wells Fargo Construction Lending", None, 85000, "2025-10-01", "paid",
            "Appraisal & environmental reports")
    add_inv("payable", "Wells Fargo Construction Lending", None, 95000, "2025-12-01", "paid",
            "Loan administration - Q4 2025")
    add_inv("payable", "Wells Fargo Construction Lending", None, 95000, "2026-01-15", "approved",
            "Loan administration - Q1 2026")

    # --- PERMITS & PM (AP) ---
    pm_monthly = 300000
    for i in range(3):
        d = datetime(2025, 12, 1) + timedelta(days=i * 30)
        date_str = d.strftime("%Y-%m-%d")
        status = "paid" if i < 2 else "approved"
        add_inv("payable", "Pacific General Contractors", None, pm_monthly, date_str, status,
                f"Pre-Construction PM & Permits - Month {i+1}")

    # --- MARKETING (AP) ---
    add_inv("payable", "Torres Landscape Architecture", None, 15000, "2025-11-01", "paid",
            "Marketing materials - renderings and brochures")
    add_inv("payable", "Torres Landscape Architecture", None, 20000, "2026-01-15", "approved",
            "Pre-leasing website and collateral")

    # --- TESTING & INSPECTION (AP) ---
    add_inv("payable", "Hartman Testing & Inspection", None, 45000, "2025-10-15", "paid",
            "Geotechnical investigation")
    add_inv("payable", "Hartman Testing & Inspection", None, 28000, "2025-12-01", "paid",
            "Environmental Phase I & II")
    add_inv("payable", "Hartman Testing & Inspection", None, 18000, "2026-01-20", "approved",
            "Materials testing - pre-construction")

    # --- INSURANCE (AP) - construction period ---
    add_inv("payable", "Pacific Insurance Group", None, 850000, "2026-02-01", "draft",
            "Builder's Risk Insurance - Year 1 premium")

    # --- CONSTRUCTION HARD COST INVOICES (AP) ---
    # Pre-construction mobilization invoices (before Nov 2026 start)
    add_inv("payable", "Pacific General Contractors", None, 500000, "2026-08-01", "draft",
            "Pre-construction services & mobilization deposit")
    add_inv("payable", "Pacific General Contractors", None, 250000, "2026-09-01", "draft",
            "Site preparation & utility coordination")
    add_inv("payable", "Pacific General Contractors", None, 750000, "2026-10-01", "draft",
            "Construction mobilization & temporary facilities")

    # --- STUDIO LEASE RECEIVABLES (AR) ---
    # These would start after construction, but show projected first-month invoices
    for fac in STUDIO_FACILITIES:
        monthly = round(fac["sqft"] * fac["rate_psf"] / 12, 2)
        tenant_map = {
            "Soundstage A": "Bay Area Film Studios LLC",
            "Soundstage B": "Bay Area Film Studios LLC",
            "Soundstage C": "Pinnacle Productions",
            "Production Office 1": "Pinnacle Productions",
            "Production Office 2": "Pacific Post-Production",
            "Support Facilities": "Pacific Post-Production",
            "Backlot / Exterior": "Backlot Events & Rentals",
        }
        # First 3 months are free rent, so start billing month 4
        add_inv("receivable", None, tenant_map[fac["name"]], monthly, "2029-01-01", "draft",
                f"Studio Lease - {fac['name']} - Jan 2029 (first billing month)")

    # --- ANCILLARY REVENUE (AR) ---
    add_inv("receivable", None, "Bay Area Film Studios LLC", 15000, "2029-01-01", "draft",
            "Equipment Rental Revenue - January 2029")
    add_inv("receivable", None, "Various", 10000, "2029-01-01", "draft",
            "Catering Services Revenue - January 2029")
    add_inv("receivable", None, "Various", 20833, "2029-01-01", "draft",
            "Studio Tours Revenue - January 2029")

    # --- RESIDENTIAL OPEX (AP) - projected monthly once operations start ---
    # Show one month of projected operating expenses (May 2028, first move-ins)
    opex_vendors = {
        "Utilities": ("Bay Area Utilities Co.", 1000),
        "Repairs & Maintenance": ("Pacific General Contractors", 1100),
        "Contract Services": ("Apex Property Management", 750),
        "Marketing": ("Torres Landscape Architecture", 300),
        "General & Administrative": ("Apex Property Management", 1000),
        "Personnel": ("Apex Property Management", 1575),
        "Insurance": ("Pacific Insurance Group", 1000),
        "Property Taxes": ("Bay Area Utilities Co.", 2500),
    }
    # First month of operations (May 2028) - prorated for ~20 units (first month absorption)
    for expense_name, (vendor, per_unit) in opex_vendors.items():
        # At first move-in, ~20 units occupied
        monthly_amount = round(per_unit * 20 / 12, 2)  # 20 units, monthly = annual/12
        add_inv("payable", vendor, None, monthly_amount, "2028-05-01", "draft",
                f"Resi OpEx - {expense_name} - May 2028 (20 units)")

    # Management fee (3% of revenue for 20 units)
    avg_rent = sum(u["count"] * u["sqft"] * u["rent_per_sf"] for u in RESI_UNITS) / TOTAL_RESI_UNITS
    mgmt_fee = round(avg_rent * 20 * RESI_MGMT_FEE_PCT, 2)
    add_inv("payable", "Apex Property Management", None, mgmt_fee, "2028-05-01", "draft",
            "Resi OpEx - Management Fee (3%) - May 2028")

    # --- STUDIO OPEX (AP) - projected monthly ---
    studio_opex_total_monthly = sum(v * STUDIO_TOTAL_SF / 12 for v in STUDIO_OPEX_PSF.values())
    add_inv("payable", "Guardian Security Services", None, round(STUDIO_OPEX_PSF["Security"] * STUDIO_TOTAL_SF / 12, 2),
            "2028-10-01", "draft", "Studio OpEx - Security - Oct 2028")
    add_inv("payable", "Bay Area Utilities Co.", None, round(STUDIO_OPEX_PSF["Utilities"] * STUDIO_TOTAL_SF / 12, 2),
            "2028-10-01", "draft", "Studio OpEx - Utilities - Oct 2028")
    add_inv("payable", "Pacific Insurance Group", None, round(STUDIO_OPEX_PSF["Insurance"] * STUDIO_TOTAL_SF / 12, 2),
            "2028-10-01", "draft", "Studio OpEx - Insurance - Oct 2028")

    write_csv("20_invoices.csv", rows)


# ===========================================================================
# 11. PHASES (construction schedule)
# ===========================================================================
def gen_phases():
    rows = [
        {"name": "Pre-Construction", "start_date": "2025-06-01", "end_date": "2026-10-31", "color": "#6366f1", "project_name": PROJECT_NAME},
        {"name": "Site Work & Foundations", "start_date": "2026-11-01", "end_date": "2027-04-30", "color": "#f59e0b", "project_name": PROJECT_NAME},
        {"name": "Structural Frame", "start_date": "2027-03-01", "end_date": "2027-12-31", "color": "#ef4444", "project_name": PROJECT_NAME},
        {"name": "Building Envelope", "start_date": "2027-08-01", "end_date": "2028-06-30", "color": "#10b981", "project_name": PROJECT_NAME},
        {"name": "MEP Rough-In", "start_date": "2027-06-01", "end_date": "2028-06-30", "color": "#8b5cf6", "project_name": PROJECT_NAME},
        {"name": "Interior Finishes", "start_date": "2027-10-01", "end_date": "2028-08-31", "color": "#ec4899", "project_name": PROJECT_NAME},
        {"name": "Studio Build-Out", "start_date": "2027-06-01", "end_date": "2028-06-30", "color": "#14b8a6", "project_name": PROJECT_NAME},
        {"name": "Parking Structure", "start_date": "2027-01-01", "end_date": "2027-10-31", "color": "#64748b", "project_name": PROJECT_NAME},
        {"name": "Landscape & Exterior", "start_date": "2028-04-01", "end_date": "2028-09-30", "color": "#22c55e", "project_name": PROJECT_NAME},
        {"name": "Lease-Up & Stabilization", "start_date": "2028-05-01", "end_date": "2029-03-01", "color": "#3b82f6", "project_name": PROJECT_NAME},
    ]
    write_csv("phases_EDG-2026.csv", rows)


# ===========================================================================
# 12. TASKS
# ===========================================================================
def gen_tasks():
    rows = [
        # Pre-Construction
        {"name": "Feasibility Study & Market Analysis", "phase_name": "Pre-Construction", "start_date": "2025-06-01", "end_date": "2025-08-31", "status": "completed", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Schematic Design", "phase_name": "Pre-Construction", "start_date": "2025-06-15", "end_date": "2025-10-31", "status": "completed", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Design Development", "phase_name": "Pre-Construction", "start_date": "2025-11-01", "end_date": "2026-03-31", "status": "completed", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Construction Documents", "phase_name": "Pre-Construction", "start_date": "2026-04-01", "end_date": "2026-08-31", "status": "in_progress", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Permit Applications", "phase_name": "Pre-Construction", "start_date": "2026-06-01", "end_date": "2026-10-31", "status": "in_progress", "priority": "critical", "project_name": PROJECT_NAME},
        {"name": "Geotechnical Investigation", "phase_name": "Pre-Construction", "start_date": "2025-09-01", "end_date": "2025-11-30", "status": "completed", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Environmental Assessment", "phase_name": "Pre-Construction", "start_date": "2025-10-01", "end_date": "2026-01-31", "status": "completed", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Construction Loan Closing", "phase_name": "Pre-Construction", "start_date": "2026-08-01", "end_date": "2026-10-31", "status": "not_started", "priority": "critical", "is_milestone": "true", "project_name": PROJECT_NAME},
        {"name": "GMP Negotiation & Award", "phase_name": "Pre-Construction", "start_date": "2026-07-01", "end_date": "2026-09-30", "status": "not_started", "priority": "critical", "project_name": PROJECT_NAME},
        # Site Work
        {"name": "Demolition & Site Clearing", "phase_name": "Site Work & Foundations", "start_date": "2026-11-01", "end_date": "2026-12-15", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Excavation & Shoring", "phase_name": "Site Work & Foundations", "start_date": "2026-12-01", "end_date": "2027-01-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Foundation Concrete", "phase_name": "Site Work & Foundations", "start_date": "2027-01-15", "end_date": "2027-03-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Underground Utilities", "phase_name": "Site Work & Foundations", "start_date": "2027-02-01", "end_date": "2027-04-30", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        # Structural
        {"name": "Steel Erection - Parking", "phase_name": "Structural Frame", "start_date": "2027-03-01", "end_date": "2027-06-30", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Steel Erection - Residential", "phase_name": "Structural Frame", "start_date": "2027-04-01", "end_date": "2027-10-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Concrete Decks", "phase_name": "Structural Frame", "start_date": "2027-05-01", "end_date": "2027-12-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Topping Out", "phase_name": "Structural Frame", "start_date": "2027-12-31", "end_date": "2027-12-31", "status": "not_started", "priority": "high", "is_milestone": "true", "project_name": PROJECT_NAME},
        # Envelope
        {"name": "Curtain Wall Installation", "phase_name": "Building Envelope", "start_date": "2027-08-01", "end_date": "2028-04-30", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Roofing & Waterproofing", "phase_name": "Building Envelope", "start_date": "2028-01-01", "end_date": "2028-04-30", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Building Watertight", "phase_name": "Building Envelope", "start_date": "2028-06-30", "end_date": "2028-06-30", "status": "not_started", "priority": "critical", "is_milestone": "true", "project_name": PROJECT_NAME},
        # MEP
        {"name": "Electrical Rough-In", "phase_name": "MEP Rough-In", "start_date": "2027-06-01", "end_date": "2028-03-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Plumbing Rough-In", "phase_name": "MEP Rough-In", "start_date": "2027-06-01", "end_date": "2028-03-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "HVAC Installation", "phase_name": "MEP Rough-In", "start_date": "2027-08-01", "end_date": "2028-05-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Fire Protection", "phase_name": "MEP Rough-In", "start_date": "2027-09-01", "end_date": "2028-06-30", "status": "not_started", "priority": "critical", "project_name": PROJECT_NAME},
        {"name": "Studio Power Distribution", "phase_name": "MEP Rough-In", "start_date": "2027-10-01", "end_date": "2028-04-30", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        # Interiors
        {"name": "Drywall & Framing", "phase_name": "Interior Finishes", "start_date": "2027-10-01", "end_date": "2028-05-31", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        {"name": "Flooring Installation", "phase_name": "Interior Finishes", "start_date": "2028-01-01", "end_date": "2028-06-30", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        {"name": "Kitchen & Bath Installation", "phase_name": "Interior Finishes", "start_date": "2028-02-01", "end_date": "2028-07-31", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        {"name": "Common Area Finishes", "phase_name": "Interior Finishes", "start_date": "2028-04-01", "end_date": "2028-08-31", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        {"name": "FF&E Installation", "phase_name": "Interior Finishes", "start_date": "2028-06-01", "end_date": "2028-08-31", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        # Studio
        {"name": "Soundstage Shell Construction", "phase_name": "Studio Build-Out", "start_date": "2027-06-01", "end_date": "2028-01-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Sound Isolation & Acoustics", "phase_name": "Studio Build-Out", "start_date": "2027-11-01", "end_date": "2028-03-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Studio Electrical & Lighting Grid", "phase_name": "Studio Build-Out", "start_date": "2028-01-01", "end_date": "2028-04-30", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Production Office Build-Out", "phase_name": "Studio Build-Out", "start_date": "2028-02-01", "end_date": "2028-05-31", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        {"name": "Backlot Grading & Paving", "phase_name": "Studio Build-Out", "start_date": "2028-03-01", "end_date": "2028-06-30", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        {"name": "Studio TCO", "phase_name": "Studio Build-Out", "start_date": "2028-06-30", "end_date": "2028-06-30", "status": "not_started", "priority": "critical", "is_milestone": "true", "project_name": PROJECT_NAME},
        # Parking
        {"name": "Parking Structure Foundations", "phase_name": "Parking Structure", "start_date": "2027-01-01", "end_date": "2027-03-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Parking Deck Construction", "phase_name": "Parking Structure", "start_date": "2027-03-01", "end_date": "2027-08-31", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Parking MEP & Lighting", "phase_name": "Parking Structure", "start_date": "2027-07-01", "end_date": "2027-10-31", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        # Landscape
        {"name": "Hardscape & Paving", "phase_name": "Landscape & Exterior", "start_date": "2028-04-01", "end_date": "2028-07-31", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        {"name": "Planting & Irrigation", "phase_name": "Landscape & Exterior", "start_date": "2028-06-01", "end_date": "2028-09-30", "status": "not_started", "priority": "medium", "project_name": PROJECT_NAME},
        # Lease-Up
        {"name": "Residential TCO / First Move-Ins", "phase_name": "Lease-Up & Stabilization", "start_date": "2028-05-01", "end_date": "2028-05-01", "status": "not_started", "priority": "critical", "is_milestone": "true", "project_name": PROJECT_NAME},
        {"name": "Residential Lease-Up (20 units/mo)", "phase_name": "Lease-Up & Stabilization", "start_date": "2028-05-01", "end_date": "2029-03-01", "status": "not_started", "priority": "high", "project_name": PROJECT_NAME},
        {"name": "Studio Lease Commencement", "phase_name": "Lease-Up & Stabilization", "start_date": "2028-10-01", "end_date": "2028-10-01", "status": "not_started", "priority": "high", "is_milestone": "true", "project_name": PROJECT_NAME},
        {"name": "Stabilization Achieved (95%)", "phase_name": "Lease-Up & Stabilization", "start_date": "2029-03-01", "end_date": "2029-03-01", "status": "not_started", "priority": "critical", "is_milestone": "true", "project_name": PROJECT_NAME},
    ]
    write_csv("tasks_EDG-2026.csv", rows)


# ===========================================================================
# MAIN
# ===========================================================================
if __name__ == "__main__":
    print(f"Generating CSVs in: {OUT_DIR}\n")
    gen_chart_of_accounts()
    gen_contacts()
    gen_bank_accounts()
    gen_project()
    gen_vendors()
    gen_property()
    gen_leases()
    gen_contracts()
    gen_budget_lines()
    gen_invoices()
    gen_phases()
    gen_tasks()
    print("\nDone! All CSVs generated.")
