"""
Generate mock CSV data for 7 company types, each with a financial_statements.csv
showing expected P&L, Balance Sheet, and key metrics for that industry vertical.

Run: python scripts/generate_company_mocks.py
"""

import csv, os
from datetime import datetime, timedelta
from typing import Any

BASE = os.path.join(os.path.dirname(__file__), "..", "mock-data")


def write_csv(folder: str, filename: str, rows: list[dict[str, Any]]):
    d = os.path.join(BASE, folder)
    os.makedirs(d, exist_ok=True)
    if not rows:
        return
    keys: list[str] = []
    seen: set[str] = set()
    for r in rows:
        for k in r:
            if k not in seen:
                keys.append(k)
                seen.add(k)
    with open(os.path.join(d, filename), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"  {folder}/{filename}: {len(rows)} rows")


def d(y, m, day=1):
    return datetime(y, m, day).strftime("%Y-%m-%d")


# ═══════════════════════════════════════════════════════════════════════════
# 1. GENERAL CONTRACTOR
# ═══════════════════════════════════════════════════════════════════════════
def gen_general_contractor():
    F = "general-contractor"
    print(f"\n{'='*60}\n  {F.upper()}\n{'='*60}")

    write_csv(F, "05_projects.csv", [
        {"name": "Sunrise Tower - 42-Story Mixed Use", "code": "SRT-2025", "status": "active", "project_type": "commercial", "client_name": "Sunrise Development Group", "contract_amount": "185000000", "start_date": "2025-03-01", "estimated_end_date": "2027-09-30", "address_line1": "100 Market St", "city": "San Francisco", "state": "CA"},
        {"name": "Bayview Elementary School Renovation", "code": "BVE-2025", "status": "active", "project_type": "institutional", "client_name": "SF Unified School District", "contract_amount": "28500000", "start_date": "2025-06-15", "estimated_end_date": "2026-08-15", "address_line1": "450 Bayview Blvd", "city": "San Francisco", "state": "CA"},
        {"name": "Tech Campus Phase 2 - Building B", "code": "TCP-2026", "status": "pre_construction", "project_type": "commercial", "client_name": "Valley Tech Holdings", "contract_amount": "67000000", "start_date": "2026-04-01", "estimated_end_date": "2027-12-31", "address_line1": "2200 Innovation Dr", "city": "San Jose", "state": "CA"},
        {"name": "Harbor Point Condominiums", "code": "HPC-2024", "status": "completed", "project_type": "residential", "client_name": "Harbor Point LLC", "contract_amount": "42000000", "start_date": "2024-01-15", "estimated_end_date": "2025-12-31", "address_line1": "800 Harbor Blvd", "city": "Oakland", "state": "CA"},
    ])

    write_csv(F, "01_chart_of_accounts.csv", [
        {"account_number": "1000", "name": "Cash & Cash Equivalents", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1010", "name": "Accounts Receivable - Progress Billings", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1020", "name": "Retention Receivable", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1030", "name": "Costs in Excess of Billings (Under-Billed)", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1040", "name": "Prepaid Expenses & Deposits", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1100", "name": "Equipment & Vehicles", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1110", "name": "Office Furniture & Equipment", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1200", "name": "Accumulated Depreciation", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "2000", "name": "Accounts Payable - Trade", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2010", "name": "Retention Payable", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2020", "name": "Billings in Excess of Costs (Over-Billed)", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2030", "name": "Accrued Payroll & Benefits", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2040", "name": "Sales Tax Payable", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2100", "name": "Line of Credit", "account_type": "liability", "sub_type": "long_term_liability"},
        {"account_number": "2110", "name": "Equipment Loans", "account_type": "liability", "sub_type": "long_term_liability"},
        {"account_number": "3000", "name": "Owner's Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "3010", "name": "Retained Earnings", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "4000", "name": "Contract Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4010", "name": "Change Order Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4020", "name": "T&M / Extra Work Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "5000", "name": "Subcontractor Costs", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5010", "name": "Materials & Supplies", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5020", "name": "Direct Labor", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5030", "name": "Equipment Rental & Costs", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5040", "name": "Permits & Fees", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5050", "name": "Bonding & Insurance (Job)", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "6000", "name": "Office Salaries & Benefits", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6010", "name": "Office Rent & Utilities", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6020", "name": "Insurance - General Liability", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6030", "name": "Professional Fees (Legal/Acctg)", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6040", "name": "Vehicle & Travel", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6050", "name": "Technology & Software", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6060", "name": "Marketing & Business Development", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "7000", "name": "Interest Expense", "account_type": "expense", "sub_type": "interest_expense"},
        {"account_number": "8000", "name": "Depreciation Expense", "account_type": "expense", "sub_type": "depreciation"},
    ])

    write_csv(F, "03_bank_accounts.csv", [
        {"name": "Operating Account", "bank_name": "Chase", "account_type": "checking", "account_number_last4": "7721", "routing_number_last4": "0021", "current_balance": "4850000"},
        {"name": "Payroll Account", "bank_name": "Chase", "account_type": "checking", "account_number_last4": "7722", "routing_number_last4": "0021", "current_balance": "1200000"},
        {"name": "Equipment Reserve", "bank_name": "US Bank", "account_type": "savings", "account_number_last4": "3301", "routing_number_last4": "4455", "current_balance": "850000"},
    ])

    write_csv(F, "08_vendors.csv", [
        {"company_name": "Titan Concrete Inc.", "first_name": "Mark", "last_name": "Sullivan", "email": "mark@titanconcrete.com", "phone": "415-555-1001", "job_title": "Estimator"},
        {"company_name": "Bay Electric Co.", "first_name": "Lisa", "last_name": "Tran", "email": "lisa@bayelectric.com", "phone": "415-555-1002", "job_title": "PM"},
        {"company_name": "Pacific Mechanical", "first_name": "Dave", "last_name": "Ortiz", "email": "dave@pacificmech.com", "phone": "415-555-1003", "job_title": "Owner"},
        {"company_name": "Sierra Steel Erectors", "first_name": "Ken", "last_name": "Watanabe", "email": "ken@sierrasteel.com", "phone": "415-555-1004", "job_title": "VP"},
        {"company_name": "Golden Gate Drywall", "first_name": "Rosa", "last_name": "Martinez", "email": "rosa@ggdrywall.com", "phone": "415-555-1005", "job_title": "Owner"},
        {"company_name": "ABC Supply Co.", "first_name": "Tom", "last_name": "Baker", "email": "tom@abcsupply.com", "phone": "415-555-1006", "job_title": "Sales Rep"},
        {"company_name": "United Rentals", "first_name": "Jenny", "last_name": "Park", "email": "jenny@unitedrentals.com", "phone": "415-555-1007", "job_title": "Branch Mgr"},
        {"company_name": "Acme Insurance Group", "first_name": "Phil", "last_name": "Adams", "email": "phil@acmeins.com", "phone": "415-555-1008", "job_title": "Broker"},
    ])

    write_csv(F, "09_contracts.csv", [
        {"contract_number": "SUB-001", "title": "Concrete & Foundations - Sunrise Tower", "contract_type": "subcontractor", "party_name": "Titan Concrete Inc.", "contract_amount": "24500000", "project_name": "Sunrise Tower - 42-Story Mixed Use", "start_date": "2025-03-15", "end_date": "2026-06-30", "status": "executed"},
        {"contract_number": "SUB-002", "title": "Electrical - Sunrise Tower", "contract_type": "subcontractor", "party_name": "Bay Electric Co.", "contract_amount": "18200000", "project_name": "Sunrise Tower - 42-Story Mixed Use", "start_date": "2025-06-01", "end_date": "2027-06-30", "status": "executed"},
        {"contract_number": "SUB-003", "title": "Mechanical/HVAC - Sunrise Tower", "contract_type": "subcontractor", "party_name": "Pacific Mechanical", "contract_amount": "15800000", "project_name": "Sunrise Tower - 42-Story Mixed Use", "start_date": "2025-07-01", "end_date": "2027-06-30", "status": "executed"},
        {"contract_number": "SUB-004", "title": "Structural Steel - Sunrise Tower", "contract_type": "subcontractor", "party_name": "Sierra Steel Erectors", "contract_amount": "22000000", "project_name": "Sunrise Tower - 42-Story Mixed Use", "start_date": "2025-05-01", "end_date": "2026-12-31", "status": "executed"},
        {"contract_number": "SUB-010", "title": "Demo & Site Work - Bayview School", "contract_type": "subcontractor", "party_name": "Titan Concrete Inc.", "contract_amount": "3200000", "project_name": "Bayview Elementary School Renovation", "start_date": "2025-06-15", "end_date": "2025-10-31", "status": "executed"},
        {"contract_number": "SUB-011", "title": "Electrical - Bayview School", "contract_type": "subcontractor", "party_name": "Bay Electric Co.", "contract_amount": "4100000", "project_name": "Bayview Elementary School Renovation", "start_date": "2025-09-01", "end_date": "2026-05-31", "status": "executed"},
    ])

    # Invoices: GC bills owner (AR), subs bill GC (AP)
    invs = []
    n = 1
    # AR - Progress billings to owners
    for i in range(12):
        dt = datetime(2025, 3, 1) + timedelta(days=i * 30)
        invs.append({"invoice_number": f"PAY-APP-{n:03d}", "invoice_type": "receivable", "client_name": "Sunrise Development Group",
                      "amount": "4200000", "invoice_date": dt.strftime("%Y-%m-%d"), "status": "paid" if i < 10 else "approved",
                      "description": f"Pay Application #{i+1} - Sunrise Tower", "project_name": "Sunrise Tower - 42-Story Mixed Use", "gl_account": "4000"})
        n += 1
    for i in range(6):
        dt = datetime(2025, 7, 1) + timedelta(days=i * 30)
        invs.append({"invoice_number": f"PAY-APP-{n:03d}", "invoice_type": "receivable", "client_name": "SF Unified School District",
                      "amount": "2800000", "invoice_date": dt.strftime("%Y-%m-%d"), "status": "paid" if i < 4 else "approved",
                      "description": f"Pay Application #{i+1} - Bayview School", "project_name": "Bayview Elementary School Renovation", "gl_account": "4000"})
        n += 1
    # AP - Sub billings
    subs_ap = [
        ("Titan Concrete Inc.", "Sunrise Tower - 42-Story Mixed Use", 12, 1850000, "5000"),
        ("Bay Electric Co.", "Sunrise Tower - 42-Story Mixed Use", 10, 1200000, "5000"),
        ("Pacific Mechanical", "Sunrise Tower - 42-Story Mixed Use", 8, 1100000, "5000"),
        ("Sierra Steel Erectors", "Sunrise Tower - 42-Story Mixed Use", 10, 1800000, "5000"),
        ("Titan Concrete Inc.", "Bayview Elementary School Renovation", 5, 580000, "5000"),
    ]
    for vendor, proj, months, monthly, gl in subs_ap:
        for i in range(months):
            dt = datetime(2025, 4, 1) + timedelta(days=i * 30)
            invs.append({"invoice_number": f"AP-{n:04d}", "invoice_type": "payable", "vendor_name": vendor,
                          "amount": str(monthly), "invoice_date": dt.strftime("%Y-%m-%d"),
                          "status": "paid" if i < months - 2 else "approved",
                          "description": f"Progress Billing #{i+1}", "project_name": proj, "gl_account": gl})
            n += 1
    # Materials
    for i in range(8):
        dt = datetime(2025, 4, 15) + timedelta(days=i * 30)
        invs.append({"invoice_number": f"AP-{n:04d}", "invoice_type": "payable", "vendor_name": "ABC Supply Co.",
                      "amount": "185000", "invoice_date": dt.strftime("%Y-%m-%d"), "status": "paid",
                      "description": "Materials delivery", "project_name": "Sunrise Tower - 42-Story Mixed Use", "gl_account": "5010"})
        n += 1
    # Equipment rental
    for i in range(10):
        dt = datetime(2025, 3, 15) + timedelta(days=i * 30)
        invs.append({"invoice_number": f"AP-{n:04d}", "invoice_type": "payable", "vendor_name": "United Rentals",
                      "amount": "95000", "invoice_date": dt.strftime("%Y-%m-%d"), "status": "paid",
                      "description": "Crane & equipment rental", "project_name": "Sunrise Tower - 42-Story Mixed Use", "gl_account": "5030"})
        n += 1
    write_csv(F, "20_invoices.csv", invs)

    write_csv(F, "project_budget_lines.csv", [
        {"csi_code": "02-00", "description": "Site Work & Demolition", "budgeted_amount": "8500000", "committed_amount": "8200000", "actual_amount": "7950000"},
        {"csi_code": "03-00", "description": "Concrete & Foundations", "budgeted_amount": "26000000", "committed_amount": "24500000", "actual_amount": "18200000"},
        {"csi_code": "05-00", "description": "Structural Steel", "budgeted_amount": "23000000", "committed_amount": "22000000", "actual_amount": "16500000"},
        {"csi_code": "07-00", "description": "Waterproofing & Envelope", "budgeted_amount": "12000000", "committed_amount": "11200000", "actual_amount": "3200000"},
        {"csi_code": "09-00", "description": "Finishes (Drywall, Paint, Flooring)", "budgeted_amount": "18500000", "committed_amount": "16800000", "actual_amount": "2100000"},
        {"csi_code": "22-00", "description": "Plumbing", "budgeted_amount": "9200000", "committed_amount": "8800000", "actual_amount": "4100000"},
        {"csi_code": "23-00", "description": "HVAC/Mechanical", "budgeted_amount": "16500000", "committed_amount": "15800000", "actual_amount": "6200000"},
        {"csi_code": "26-00", "description": "Electrical", "budgeted_amount": "19500000", "committed_amount": "18200000", "actual_amount": "8400000"},
        {"csi_code": "31-00", "description": "Earthwork & Piling", "budgeted_amount": "6200000", "committed_amount": "6000000", "actual_amount": "5800000"},
        {"csi_code": "32-00", "description": "Exterior Improvements", "budgeted_amount": "4500000", "committed_amount": "0", "actual_amount": "0"},
        {"csi_code": "01-00", "description": "General Conditions & Overhead", "budgeted_amount": "18500000", "committed_amount": "18500000", "actual_amount": "11200000"},
        {"csi_code": "01-90", "description": "Contingency (3%)", "budgeted_amount": "5550000", "committed_amount": "0", "actual_amount": "0"},
    ])

    # FINANCIAL STATEMENTS - What a GC P&L and Balance Sheet look like
    write_csv(F, "financial_statements.csv", [
        {"section": "INCOME STATEMENT", "line_item": "", "annual_amount": "", "notes": "Typical GC: 8-12% gross margin, 2-5% net margin"},
        {"section": "Revenue", "line_item": "Contract Revenue", "annual_amount": "185000000", "notes": "Recognized on % completion method"},
        {"section": "Revenue", "line_item": "Change Order Revenue", "annual_amount": "8200000", "notes": "~4-5% of contract value"},
        {"section": "Revenue", "line_item": "T&M / Extra Work", "annual_amount": "1800000", "notes": "Time & material billings"},
        {"section": "Revenue", "line_item": "TOTAL REVENUE", "annual_amount": "195000000", "notes": ""},
        {"section": "Cost of Revenue", "line_item": "Subcontractor Costs", "annual_amount": "117000000", "notes": "60% of revenue - largest cost"},
        {"section": "Cost of Revenue", "line_item": "Materials & Supplies", "annual_amount": "25000000", "notes": "13% of revenue"},
        {"section": "Cost of Revenue", "line_item": "Direct Labor", "annual_amount": "18500000", "notes": "Field supervisors, foremen"},
        {"section": "Cost of Revenue", "line_item": "Equipment Costs", "annual_amount": "8500000", "notes": "Owned + rented equipment"},
        {"section": "Cost of Revenue", "line_item": "Job Insurance & Bonding", "annual_amount": "4200000", "notes": "~2% of revenue"},
        {"section": "Cost of Revenue", "line_item": "Permits & Fees", "annual_amount": "1800000", "notes": ""},
        {"section": "Cost of Revenue", "line_item": "TOTAL COST OF REVENUE", "annual_amount": "175000000", "notes": ""},
        {"section": "Gross Profit", "line_item": "GROSS PROFIT", "annual_amount": "20000000", "notes": "10.3% gross margin"},
        {"section": "Operating Expenses", "line_item": "Office Salaries & Benefits", "annual_amount": "6200000", "notes": "Estimators, PMs, admin"},
        {"section": "Operating Expenses", "line_item": "Office Rent & Utilities", "annual_amount": "480000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "General Liability Insurance", "annual_amount": "1200000", "notes": "GL + umbrella"},
        {"section": "Operating Expenses", "line_item": "Professional Fees", "annual_amount": "350000", "notes": "Legal, accounting, consulting"},
        {"section": "Operating Expenses", "line_item": "Vehicles & Travel", "annual_amount": "420000", "notes": "Fleet + mileage"},
        {"section": "Operating Expenses", "line_item": "Technology & Software", "annual_amount": "280000", "notes": "Procore, Bluebeam, etc."},
        {"section": "Operating Expenses", "line_item": "Marketing & BD", "annual_amount": "180000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Depreciation", "annual_amount": "650000", "notes": "Equipment & vehicles"},
        {"section": "Operating Expenses", "line_item": "TOTAL OPERATING EXPENSES", "annual_amount": "9760000", "notes": "5% of revenue — keep lean"},
        {"section": "Net Income", "line_item": "OPERATING INCOME (EBIT)", "annual_amount": "10240000", "notes": "5.3% operating margin"},
        {"section": "Net Income", "line_item": "Interest Expense", "annual_amount": "320000", "notes": "LOC draws"},
        {"section": "Net Income", "line_item": "NET INCOME BEFORE TAX", "annual_amount": "9920000", "notes": "5.1% net margin — healthy GC"},
        {"section": "BALANCE SHEET", "line_item": "", "annual_amount": "", "notes": "GC balance sheet is WIP-heavy"},
        {"section": "Assets", "line_item": "Cash & Equivalents", "annual_amount": "4850000", "notes": "Keep 30-60 days of overhead"},
        {"section": "Assets", "line_item": "Accounts Receivable", "annual_amount": "18500000", "notes": "~35 days of revenue (DSO)"},
        {"section": "Assets", "line_item": "Retention Receivable", "annual_amount": "9250000", "notes": "5-10% of billed revenue held back"},
        {"section": "Assets", "line_item": "Costs in Excess of Billings", "annual_amount": "3200000", "notes": "Under-billed WIP — watch closely"},
        {"section": "Assets", "line_item": "Equipment & Vehicles (net)", "annual_amount": "2800000", "notes": ""},
        {"section": "Assets", "line_item": "TOTAL ASSETS", "annual_amount": "38600000", "notes": ""},
        {"section": "Liabilities", "line_item": "Accounts Payable", "annual_amount": "14200000", "notes": "Pay subs within 30 days"},
        {"section": "Liabilities", "line_item": "Retention Payable", "annual_amount": "7800000", "notes": "Held from subs until final completion"},
        {"section": "Liabilities", "line_item": "Billings in Excess of Costs", "annual_amount": "2400000", "notes": "Over-billed WIP — revenue to earn"},
        {"section": "Liabilities", "line_item": "Accrued Payroll", "annual_amount": "1200000", "notes": ""},
        {"section": "Liabilities", "line_item": "Line of Credit", "annual_amount": "1500000", "notes": "$5M facility, draw as needed"},
        {"section": "Liabilities", "line_item": "TOTAL LIABILITIES", "annual_amount": "27100000", "notes": ""},
        {"section": "Equity", "line_item": "Owner's Equity + Retained Earnings", "annual_amount": "11500000", "notes": ""},
        {"section": "KEY METRICS", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Metrics", "line_item": "Gross Margin", "annual_amount": "10.3%", "notes": "Target: 8-15%"},
        {"section": "Metrics", "line_item": "Net Margin", "annual_amount": "5.1%", "notes": "Target: 2-5%"},
        {"section": "Metrics", "line_item": "Backlog", "annual_amount": "112000000", "notes": "Contracted but unearned revenue"},
        {"section": "Metrics", "line_item": "Current Ratio", "annual_amount": "1.38", "notes": "Above 1.1 required by bonding co"},
        {"section": "Metrics", "line_item": "Working Capital", "annual_amount": "10600000", "notes": "CA - CL"},
        {"section": "Metrics", "line_item": "Revenue per Employee", "annual_amount": "1625000", "notes": "120 employees"},
        {"section": "Metrics", "line_item": "Bonding Capacity", "annual_amount": "250000000", "notes": "~10x working capital"},
    ])


# ═══════════════════════════════════════════════════════════════════════════
# 2. DEVELOPER
# ═══════════════════════════════════════════════════════════════════════════
def gen_developer():
    F = "developer"
    print(f"\n{'='*60}\n  {F.upper()}\n{'='*60}")

    write_csv(F, "05_projects.csv", [
        {"name": "The Residences at Pacific Heights", "code": "RPH-2025", "status": "active", "project_type": "residential", "client_name": "Self-Developed", "contract_amount": "95000000", "start_date": "2025-01-15", "estimated_end_date": "2027-06-30", "address_line1": "1800 Pacific Ave", "city": "San Francisco", "state": "CA"},
        {"name": "Mission Bay Innovation Center", "code": "MBI-2026", "status": "pre_construction", "project_type": "commercial", "client_name": "Self-Developed", "contract_amount": "145000000", "start_date": "2026-06-01", "estimated_end_date": "2028-12-31", "address_line1": "500 Mission Bay Blvd", "city": "San Francisco", "state": "CA"},
    ])

    write_csv(F, "01_chart_of_accounts.csv", [
        {"account_number": "1000", "name": "Cash & Cash Equivalents", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1010", "name": "Accounts Receivable", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1100", "name": "Land Held for Development", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1110", "name": "Construction in Progress", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1120", "name": "Completed Properties", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1130", "name": "Tenant Improvements", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1200", "name": "Accumulated Depreciation", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "2000", "name": "Accounts Payable", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2010", "name": "Accrued Expenses", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2020", "name": "Security Deposits Held", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2100", "name": "Construction Loan", "account_type": "liability", "sub_type": "long_term_liability"},
        {"account_number": "2110", "name": "Permanent / Mezzanine Debt", "account_type": "liability", "sub_type": "long_term_liability"},
        {"account_number": "3000", "name": "GP Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "3010", "name": "LP Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "3020", "name": "Retained Earnings", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "3030", "name": "Distributions", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "4000", "name": "Rental Revenue - Residential", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4010", "name": "Rental Revenue - Commercial", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4020", "name": "Development Fees", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4030", "name": "Property Sales Revenue", "account_type": "revenue", "sub_type": "other_income"},
        {"account_number": "4090", "name": "Vacancy & Concessions", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "5000", "name": "Property Taxes", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5010", "name": "Insurance", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5020", "name": "Repairs & Maintenance", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5030", "name": "Utilities", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5040", "name": "Management Fees", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5050", "name": "Marketing & Leasing", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5060", "name": "General & Administrative", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6000", "name": "A&E / Soft Costs", "account_type": "expense", "sub_type": "development_cost"},
        {"account_number": "6010", "name": "Finance & Legal", "account_type": "expense", "sub_type": "development_cost"},
        {"account_number": "7000", "name": "Interest - Construction Loan", "account_type": "expense", "sub_type": "interest_expense"},
        {"account_number": "7010", "name": "Interest - Permanent Debt", "account_type": "expense", "sub_type": "interest_expense"},
        {"account_number": "8000", "name": "Depreciation", "account_type": "expense", "sub_type": "depreciation"},
        {"account_number": "9000", "name": "Gain on Sale", "account_type": "revenue", "sub_type": "other_income"},
    ])

    write_csv(F, "financial_statements.csv", [
        {"section": "INCOME STATEMENT", "line_item": "", "annual_amount": "", "notes": "Developer: Revenue from rents + development fees; heavy debt service"},
        {"section": "Revenue", "line_item": "Rental Revenue - Residential", "annual_amount": "7200000", "notes": "Stabilized portfolio GPR"},
        {"section": "Revenue", "line_item": "Rental Revenue - Commercial", "annual_amount": "3800000", "notes": "Office/retail leases"},
        {"section": "Revenue", "line_item": "Development Fees Earned", "annual_amount": "2400000", "notes": "3-5% of project costs on managed deals"},
        {"section": "Revenue", "line_item": "Vacancy & Concessions", "annual_amount": "-550000", "notes": "~5% of gross rents"},
        {"section": "Revenue", "line_item": "TOTAL REVENUE", "annual_amount": "12850000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Property Taxes", "annual_amount": "1800000", "notes": "Largest single OpEx line"},
        {"section": "Operating Expenses", "line_item": "Insurance", "annual_amount": "420000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Repairs & Maintenance", "annual_amount": "650000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Utilities", "annual_amount": "380000", "notes": "Common area only"},
        {"section": "Operating Expenses", "line_item": "Management Fees (3%)", "annual_amount": "390000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Marketing & Leasing", "annual_amount": "200000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "G&A / Corporate Overhead", "annual_amount": "1200000", "notes": "Salaries, office, legal"},
        {"section": "Operating Expenses", "line_item": "TOTAL OPERATING EXPENSES", "annual_amount": "5040000", "notes": ""},
        {"section": "NOI", "line_item": "NET OPERATING INCOME", "annual_amount": "7810000", "notes": "60.7% NOI margin"},
        {"section": "Below NOI", "line_item": "Interest Expense", "annual_amount": "3200000", "notes": "Construction + perm debt"},
        {"section": "Below NOI", "line_item": "Depreciation", "annual_amount": "2100000", "notes": "27.5yr resi / 39yr commercial"},
        {"section": "Below NOI", "line_item": "NET INCOME", "annual_amount": "2510000", "notes": ""},
        {"section": "BALANCE SHEET", "line_item": "", "annual_amount": "", "notes": "Developer: asset-heavy, leveraged"},
        {"section": "Assets", "line_item": "Cash", "annual_amount": "3200000", "notes": ""},
        {"section": "Assets", "line_item": "Accounts Receivable", "annual_amount": "850000", "notes": "Tenant AR"},
        {"section": "Assets", "line_item": "Land Held for Development", "annual_amount": "12000000", "notes": "Mission Bay site"},
        {"section": "Assets", "line_item": "Construction in Progress", "annual_amount": "42000000", "notes": "Pacific Heights project"},
        {"section": "Assets", "line_item": "Completed Properties (net)", "annual_amount": "58000000", "notes": "Stabilized portfolio"},
        {"section": "Assets", "line_item": "TOTAL ASSETS", "annual_amount": "116050000", "notes": ""},
        {"section": "Liabilities", "line_item": "Accounts Payable", "annual_amount": "2800000", "notes": ""},
        {"section": "Liabilities", "line_item": "Construction Loan", "annual_amount": "32000000", "notes": "~50% LTC"},
        {"section": "Liabilities", "line_item": "Permanent Debt", "annual_amount": "42000000", "notes": "~65% LTV on stabilized"},
        {"section": "Liabilities", "line_item": "TOTAL LIABILITIES", "annual_amount": "76800000", "notes": ""},
        {"section": "Equity", "line_item": "GP + LP Equity", "annual_amount": "39250000", "notes": "GP 10% / LP 90%"},
        {"section": "KEY METRICS", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Metrics", "line_item": "NOI Margin", "annual_amount": "60.7%", "notes": "Target: 55-70%"},
        {"section": "Metrics", "line_item": "Debt Service Coverage Ratio", "annual_amount": "1.55x", "notes": "NOI / annual debt service; min 1.20x"},
        {"section": "Metrics", "line_item": "Loan-to-Value", "annual_amount": "64%", "notes": "Total debt / property value"},
        {"section": "Metrics", "line_item": "Cap Rate (stabilized)", "annual_amount": "5.8%", "notes": "NOI / property value"},
        {"section": "Metrics", "line_item": "Cash-on-Cash Return", "annual_amount": "11.8%", "notes": "Annual CF / equity invested"},
        {"section": "Metrics", "line_item": "Development Pipeline", "annual_amount": "240000000", "notes": "Total project costs in pipeline"},
        {"section": "Metrics", "line_item": "IRR (projected)", "annual_amount": "18-22%", "notes": "Levered IRR on current deals"},
    ])

    write_csv(F, "03_bank_accounts.csv", [
        {"name": "Operating Account", "bank_name": "First Republic", "account_type": "checking", "account_number_last4": "9901", "routing_number_last4": "1100", "current_balance": "3200000"},
        {"name": "Construction Escrow", "bank_name": "Wells Fargo", "account_type": "escrow", "account_number_last4": "4401", "routing_number_last4": "0721", "current_balance": "42000000"},
    ])
    write_csv(F, "08_vendors.csv", [
        {"company_name": "Apex Construction Mgmt", "first_name": "John", "last_name": "Rivera", "email": "john@apexcm.com", "phone": "415-555-2001", "job_title": "President"},
        {"company_name": "Greenfield Architecture", "first_name": "Sarah", "last_name": "Wong", "email": "sarah@greenfield.com", "phone": "415-555-2002", "job_title": "Principal"},
        {"company_name": "Pacific Title Company", "first_name": "Nancy", "last_name": "Lee", "email": "nancy@pactitle.com", "phone": "415-555-2003", "job_title": "Escrow Officer"},
    ])


# ═══════════════════════════════════════════════════════════════════════════
# 3. PROPERTY MANAGER
# ═══════════════════════════════════════════════════════════════════════════
def gen_property_manager():
    F = "property-manager"
    print(f"\n{'='*60}\n  {F.upper()}\n{'='*60}")

    write_csv(F, "05_projects.csv", [
        {"name": "Lakeview Apartments - 120 Units", "code": "LVA-PM", "status": "active", "project_type": "residential", "client_name": "Lakeview Investors LLC", "contract_amount": "0", "address_line1": "500 Lakeview Dr", "city": "Oakland", "state": "CA"},
        {"name": "Downtown Office Tower - 180K SF", "code": "DOT-PM", "status": "active", "project_type": "commercial", "client_name": "Metro Office Holdings", "contract_amount": "0", "address_line1": "300 Broadway", "city": "Oakland", "state": "CA"},
        {"name": "Sunset Shopping Center - 85K SF", "code": "SSC-PM", "status": "active", "project_type": "commercial", "client_name": "Sunset Retail Partners", "contract_amount": "0", "address_line1": "1200 Sunset Blvd", "city": "San Leandro", "state": "CA"},
    ])

    write_csv(F, "01_chart_of_accounts.csv", [
        {"account_number": "1000", "name": "Cash - Operating", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1010", "name": "Accounts Receivable - Mgmt Fees", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1020", "name": "Accounts Receivable - Leasing Commissions", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1030", "name": "Prepaid Expenses", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1100", "name": "Office Equipment (net)", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "2000", "name": "Accounts Payable", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2010", "name": "Accrued Payroll", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "3000", "name": "Owner's Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "3010", "name": "Retained Earnings", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "4000", "name": "Property Management Fees", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4010", "name": "Leasing Commissions", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4020", "name": "Construction Mgmt Fees", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4030", "name": "Maintenance Markup Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "5000", "name": "Salaries & Benefits - Property Staff", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5010", "name": "Salaries & Benefits - Corporate", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5020", "name": "Office Rent & Utilities", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5030", "name": "Technology & Software", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5040", "name": "Insurance - E&O + GL", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5050", "name": "Vehicle & Travel", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5060", "name": "Marketing & BD", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "5070", "name": "Professional Fees", "account_type": "expense", "sub_type": "operating_expense"},
    ])

    write_csv(F, "financial_statements.csv", [
        {"section": "INCOME STATEMENT", "line_item": "", "annual_amount": "", "notes": "PM Firm: Fee-based, light balance sheet, high labor cost ratio"},
        {"section": "Revenue", "line_item": "Management Fees (3-5% of gross rents)", "annual_amount": "1680000", "notes": "$42M gross rents under management"},
        {"section": "Revenue", "line_item": "Leasing Commissions", "annual_amount": "420000", "notes": "New leases + renewals"},
        {"section": "Revenue", "line_item": "Construction Mgmt Fees", "annual_amount": "180000", "notes": "TI oversight for owner"},
        {"section": "Revenue", "line_item": "Maintenance Markup", "annual_amount": "120000", "notes": "15% markup on vendor invoices"},
        {"section": "Revenue", "line_item": "TOTAL REVENUE", "annual_amount": "2400000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Property Staff (on-site)", "annual_amount": "680000", "notes": "Maintenance techs, leasing agents"},
        {"section": "Operating Expenses", "line_item": "Corporate Staff", "annual_amount": "520000", "notes": "Regional mgr, accounting, admin"},
        {"section": "Operating Expenses", "line_item": "Office Rent & Utilities", "annual_amount": "96000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Technology & Software", "annual_amount": "48000", "notes": "Yardi/AppFolio, maintenance SW"},
        {"section": "Operating Expenses", "line_item": "E&O + GL Insurance", "annual_amount": "85000", "notes": "Professional liability critical"},
        {"section": "Operating Expenses", "line_item": "Vehicle & Travel", "annual_amount": "36000", "notes": "Site visits"},
        {"section": "Operating Expenses", "line_item": "Marketing", "annual_amount": "24000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "TOTAL EXPENSES", "annual_amount": "1489000", "notes": ""},
        {"section": "Net Income", "line_item": "NET INCOME", "annual_amount": "911000", "notes": "38% net margin — strong for PM"},
        {"section": "BALANCE SHEET", "line_item": "", "annual_amount": "", "notes": "PM: Asset-light, fee business"},
        {"section": "Assets", "line_item": "Cash", "annual_amount": "480000", "notes": ""},
        {"section": "Assets", "line_item": "Accounts Receivable", "annual_amount": "210000", "notes": "~30 days of mgmt fees"},
        {"section": "Assets", "line_item": "Office Equipment", "annual_amount": "45000", "notes": ""},
        {"section": "Assets", "line_item": "TOTAL ASSETS", "annual_amount": "735000", "notes": "Very light balance sheet"},
        {"section": "Liabilities", "line_item": "Accounts Payable", "annual_amount": "85000", "notes": ""},
        {"section": "Liabilities", "line_item": "Accrued Payroll", "annual_amount": "95000", "notes": ""},
        {"section": "Liabilities", "line_item": "TOTAL LIABILITIES", "annual_amount": "180000", "notes": ""},
        {"section": "Equity", "line_item": "Owner's Equity", "annual_amount": "555000", "notes": ""},
        {"section": "KEY METRICS", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Metrics", "line_item": "Units Under Management", "annual_amount": "320", "notes": "Resi + commercial suites"},
        {"section": "Metrics", "line_item": "Gross Rents Managed", "annual_amount": "42000000", "notes": ""},
        {"section": "Metrics", "line_item": "Revenue per Employee", "annual_amount": "200000", "notes": "12 FTEs"},
        {"section": "Metrics", "line_item": "Net Margin", "annual_amount": "38%", "notes": "Target: 25-40%"},
        {"section": "Metrics", "line_item": "Average Occupancy", "annual_amount": "94.2%", "notes": "Across portfolio"},
        {"section": "Metrics", "line_item": "Tenant Retention Rate", "annual_amount": "72%", "notes": ""},
    ])

    write_csv(F, "03_bank_accounts.csv", [
        {"name": "Operating Account", "bank_name": "Bank of America", "account_type": "checking", "account_number_last4": "5501", "routing_number_last4": "2200", "current_balance": "480000"},
    ])
    write_csv(F, "08_vendors.csv", [
        {"company_name": "QuickFix Maintenance", "first_name": "Carlos", "last_name": "Reyes", "email": "carlos@quickfix.com", "phone": "510-555-3001", "job_title": "Owner"},
        {"company_name": "Bay Janitorial", "first_name": "Ming", "last_name": "Zhou", "email": "ming@bayjanitor.com", "phone": "510-555-3002", "job_title": "Supervisor"},
        {"company_name": "GreenScape Landscaping", "first_name": "Tony", "last_name": "Delgado", "email": "tony@greenscape.com", "phone": "510-555-3003", "job_title": "Owner"},
    ])


# ═══════════════════════════════════════════════════════════════════════════
# 4. OWNER-BUILDER
# ═══════════════════════════════════════════════════════════════════════════
def gen_owner_builder():
    F = "owner-builder"
    print(f"\n{'='*60}\n  {F.upper()}\n{'='*60}")

    write_csv(F, "05_projects.csv", [
        {"name": "Custom Estate - 12,000 SF", "code": "CE-2025", "status": "active", "project_type": "residential", "client_name": "Self (Owner-Builder)", "contract_amount": "8500000", "start_date": "2025-04-01", "estimated_end_date": "2026-10-31", "address_line1": "45 Hilltop Lane", "city": "Atherton", "state": "CA"},
        {"name": "Spec Home A - 4,200 SF", "code": "SHA-2025", "status": "active", "project_type": "residential", "client_name": "For Sale", "contract_amount": "2800000", "start_date": "2025-06-01", "estimated_end_date": "2026-04-30", "address_line1": "120 Oak Valley Rd", "city": "Palo Alto", "state": "CA"},
    ])

    write_csv(F, "01_chart_of_accounts.csv", [
        {"account_number": "1000", "name": "Cash", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1010", "name": "Accounts Receivable", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1100", "name": "Land", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1110", "name": "Construction in Progress", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1120", "name": "Completed Homes - Inventory", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "2000", "name": "Accounts Payable", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2100", "name": "Construction Loan", "account_type": "liability", "sub_type": "long_term_liability"},
        {"account_number": "3000", "name": "Owner's Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "4000", "name": "Home Sale Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "5000", "name": "Subcontractor Costs", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5010", "name": "Materials", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5020", "name": "Permits & Fees", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5030", "name": "Architecture & Design", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "6000", "name": "Insurance", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6010", "name": "Marketing & Staging", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "7000", "name": "Interest Expense", "account_type": "expense", "sub_type": "interest_expense"},
    ])

    write_csv(F, "financial_statements.csv", [
        {"section": "INCOME STATEMENT", "line_item": "", "annual_amount": "", "notes": "Owner-Builder: Revenue on sale, costs capitalized into CIP"},
        {"section": "Revenue", "line_item": "Home Sales (Spec Home A)", "annual_amount": "4200000", "notes": "Sold at completion; cost basis $2.8M"},
        {"section": "Revenue", "line_item": "TOTAL REVENUE", "annual_amount": "4200000", "notes": "Revenue recognized at closing"},
        {"section": "Cost of Sales", "line_item": "Land Cost", "annual_amount": "850000", "notes": ""},
        {"section": "Cost of Sales", "line_item": "Subcontractor Costs", "annual_amount": "1200000", "notes": "All trades subbed out"},
        {"section": "Cost of Sales", "line_item": "Materials", "annual_amount": "420000", "notes": "Owner-purchased materials"},
        {"section": "Cost of Sales", "line_item": "Architecture & Design", "annual_amount": "180000", "notes": ""},
        {"section": "Cost of Sales", "line_item": "Permits & Fees", "annual_amount": "85000", "notes": ""},
        {"section": "Cost of Sales", "line_item": "TOTAL COST OF SALES", "annual_amount": "2735000", "notes": ""},
        {"section": "Gross Profit", "line_item": "GROSS PROFIT", "annual_amount": "1465000", "notes": "34.9% gross margin on spec"},
        {"section": "Operating Expenses", "line_item": "Insurance", "annual_amount": "42000", "notes": "Builder's risk + GL"},
        {"section": "Operating Expenses", "line_item": "Marketing & Staging", "annual_amount": "65000", "notes": "Staging, photos, broker"},
        {"section": "Operating Expenses", "line_item": "Interest Expense", "annual_amount": "185000", "notes": "Construction loan"},
        {"section": "Net Income", "line_item": "NET INCOME", "annual_amount": "1173000", "notes": "27.9% net — strong for spec"},
        {"section": "BALANCE SHEET", "line_item": "", "annual_amount": "", "notes": "Owner-Builder: CIP is the main asset"},
        {"section": "Assets", "line_item": "Cash", "annual_amount": "320000", "notes": ""},
        {"section": "Assets", "line_item": "Land (Custom Estate)", "annual_amount": "2200000", "notes": ""},
        {"section": "Assets", "line_item": "Construction in Progress", "annual_amount": "4800000", "notes": "Custom Estate WIP"},
        {"section": "Assets", "line_item": "TOTAL ASSETS", "annual_amount": "7320000", "notes": ""},
        {"section": "Liabilities", "line_item": "Accounts Payable", "annual_amount": "280000", "notes": "Subs and suppliers"},
        {"section": "Liabilities", "line_item": "Construction Loan", "annual_amount": "3400000", "notes": "60% LTC"},
        {"section": "Liabilities", "line_item": "TOTAL LIABILITIES", "annual_amount": "3680000", "notes": ""},
        {"section": "Equity", "line_item": "Owner's Equity", "annual_amount": "3640000", "notes": ""},
        {"section": "KEY METRICS", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Metrics", "line_item": "Gross Margin on Spec", "annual_amount": "34.9%", "notes": "Target: 25-40%"},
        {"section": "Metrics", "line_item": "Cost per SF (Spec)", "annual_amount": "651", "notes": "$2.735M / 4200 SF"},
        {"section": "Metrics", "line_item": "Sale Price per SF", "annual_amount": "1000", "notes": "$4.2M / 4200 SF"},
    ])

    write_csv(F, "03_bank_accounts.csv", [
        {"name": "Operating Account", "bank_name": "Silicon Valley Bank", "account_type": "checking", "account_number_last4": "6601", "routing_number_last4": "3300", "current_balance": "320000"},
    ])
    write_csv(F, "08_vendors.csv", [
        {"company_name": "Elite Framing Co.", "first_name": "Mike", "last_name": "Johnson", "email": "mike@eliteframing.com", "phone": "650-555-4001", "job_title": "Owner"},
        {"company_name": "Peninsula Plumbing", "first_name": "Al", "last_name": "Garcia", "email": "al@penplumbing.com", "phone": "650-555-4002", "job_title": "Owner"},
        {"company_name": "Bay Electric", "first_name": "Ray", "last_name": "Kim", "email": "ray@bayelec.com", "phone": "650-555-4003", "job_title": "Estimator"},
        {"company_name": "Custom Stone & Tile", "first_name": "Sophia", "last_name": "Nakamura", "email": "sophia@customstone.com", "phone": "650-555-4004", "job_title": "Designer"},
    ])


# ═══════════════════════════════════════════════════════════════════════════
# 5. SUBCONTRACTOR
# ═══════════════════════════════════════════════════════════════════════════
def gen_subcontractor():
    F = "subcontractor"
    print(f"\n{'='*60}\n  {F.upper()}\n{'='*60}")

    write_csv(F, "05_projects.csv", [
        {"name": "Sunrise Tower - Concrete Package", "code": "SRT-CON", "status": "active", "project_type": "commercial", "client_name": "Meridian General Contractors", "contract_amount": "24500000", "start_date": "2025-03-15", "estimated_end_date": "2026-06-30"},
        {"name": "Bayview School - Site Work", "code": "BVS-SW", "status": "active", "project_type": "institutional", "client_name": "Meridian General Contractors", "contract_amount": "3200000", "start_date": "2025-06-15", "estimated_end_date": "2025-10-31"},
        {"name": "Tech Campus - Foundations", "code": "TCP-FND", "status": "pre_construction", "project_type": "commercial", "client_name": "Pacific Builders Inc.", "contract_amount": "8800000", "start_date": "2026-04-01", "estimated_end_date": "2026-12-31"},
    ])

    write_csv(F, "01_chart_of_accounts.csv", [
        {"account_number": "1000", "name": "Cash", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1010", "name": "Accounts Receivable - Progress Billings", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1020", "name": "Retention Receivable", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1100", "name": "Equipment & Vehicles", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "1200", "name": "Accumulated Depreciation", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "2000", "name": "Accounts Payable - Suppliers", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2010", "name": "Accrued Payroll", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2100", "name": "Equipment Loans", "account_type": "liability", "sub_type": "long_term_liability"},
        {"account_number": "3000", "name": "Owner's Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "4000", "name": "Contract Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4010", "name": "Change Order Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "5000", "name": "Direct Labor", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5010", "name": "Materials (Concrete, Rebar, Formwork)", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5020", "name": "Equipment Costs (Pumps, Cranes)", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5030", "name": "Sub-tier Subs (Rebar, Post-Tension)", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "6000", "name": "Office & Admin", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6010", "name": "Insurance (WC + GL)", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "7000", "name": "Interest Expense", "account_type": "expense", "sub_type": "interest_expense"},
        {"account_number": "8000", "name": "Depreciation", "account_type": "expense", "sub_type": "depreciation"},
    ])

    write_csv(F, "financial_statements.csv", [
        {"section": "INCOME STATEMENT", "line_item": "", "annual_amount": "", "notes": "Concrete Sub: Labor + materials intensive, 15-25% gross margin"},
        {"section": "Revenue", "line_item": "Contract Revenue", "annual_amount": "36500000", "notes": "Multiple projects"},
        {"section": "Revenue", "line_item": "Change Orders", "annual_amount": "2200000", "notes": "~6% of contract"},
        {"section": "Revenue", "line_item": "TOTAL REVENUE", "annual_amount": "38700000", "notes": ""},
        {"section": "Cost of Revenue", "line_item": "Direct Labor (Union)", "annual_amount": "14800000", "notes": "38% of revenue — largest cost"},
        {"section": "Cost of Revenue", "line_item": "Materials (Concrete/Rebar)", "annual_amount": "9200000", "notes": "24% of revenue"},
        {"section": "Cost of Revenue", "line_item": "Equipment Costs", "annual_amount": "3100000", "notes": "Pumps, cranes, formwork"},
        {"section": "Cost of Revenue", "line_item": "Sub-tier Subcontractors", "annual_amount": "2400000", "notes": "Rebar, post-tension, waterproofing"},
        {"section": "Cost of Revenue", "line_item": "TOTAL COST OF REVENUE", "annual_amount": "29500000", "notes": ""},
        {"section": "Gross Profit", "line_item": "GROSS PROFIT", "annual_amount": "9200000", "notes": "23.8% gross margin"},
        {"section": "Operating Expenses", "line_item": "Office & Admin Salaries", "annual_amount": "1800000", "notes": "Estimators, PMs, office"},
        {"section": "Operating Expenses", "line_item": "Insurance (WC + GL)", "annual_amount": "2800000", "notes": "7.2% of revenue — HIGH for concrete"},
        {"section": "Operating Expenses", "line_item": "Vehicles & Fuel", "annual_amount": "320000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Depreciation", "annual_amount": "850000", "notes": "Heavy equipment"},
        {"section": "Net Income", "line_item": "NET INCOME", "annual_amount": "3430000", "notes": "8.9% net margin"},
        {"section": "BALANCE SHEET", "line_item": "", "annual_amount": "", "notes": "Sub: Equipment-heavy, AR from GC"},
        {"section": "Assets", "line_item": "Cash", "annual_amount": "1200000", "notes": ""},
        {"section": "Assets", "line_item": "Accounts Receivable", "annual_amount": "4800000", "notes": "~45 day DSO from GC"},
        {"section": "Assets", "line_item": "Retention Receivable", "annual_amount": "2400000", "notes": "5-10% of billings held"},
        {"section": "Assets", "line_item": "Equipment (net)", "annual_amount": "4200000", "notes": "Pumps, cranes, formwork"},
        {"section": "Assets", "line_item": "TOTAL ASSETS", "annual_amount": "12600000", "notes": ""},
        {"section": "Liabilities", "line_item": "Accounts Payable", "annual_amount": "2800000", "notes": "Ready-mix, rebar suppliers"},
        {"section": "Liabilities", "line_item": "Accrued Payroll", "annual_amount": "1200000", "notes": "Biweekly union payroll"},
        {"section": "Liabilities", "line_item": "Equipment Loans", "annual_amount": "1800000", "notes": ""},
        {"section": "Liabilities", "line_item": "TOTAL LIABILITIES", "annual_amount": "5800000", "notes": ""},
        {"section": "Equity", "line_item": "Owner's Equity", "annual_amount": "6800000", "notes": ""},
        {"section": "KEY METRICS", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Metrics", "line_item": "Gross Margin", "annual_amount": "23.8%", "notes": "Target: 15-25%"},
        {"section": "Metrics", "line_item": "Backlog", "annual_amount": "18500000", "notes": "Remaining on contracts"},
        {"section": "Metrics", "line_item": "Labor Productivity (CY/hr)", "annual_amount": "1.8", "notes": "Cubic yards placed per labor hour"},
        {"section": "Metrics", "line_item": "Workers Comp Rate", "annual_amount": "14.2%", "notes": "% of payroll — concrete is high-risk"},
        {"section": "Metrics", "line_item": "Headcount", "annual_amount": "85", "notes": "65 field + 20 office"},
    ])

    write_csv(F, "03_bank_accounts.csv", [
        {"name": "Operating", "bank_name": "Wells Fargo", "account_type": "checking", "account_number_last4": "8801", "routing_number_last4": "0721", "current_balance": "1200000"},
        {"name": "Payroll", "bank_name": "Wells Fargo", "account_type": "checking", "account_number_last4": "8802", "routing_number_last4": "0721", "current_balance": "600000"},
    ])
    write_csv(F, "08_vendors.csv", [
        {"company_name": "CalPortland Ready-Mix", "first_name": "Steve", "last_name": "Lam", "email": "steve@calportland.com", "phone": "510-555-5001", "job_title": "Dispatch"},
        {"company_name": "Harris Rebar Inc.", "first_name": "Rick", "last_name": "Okafor", "email": "rick@harrisrebar.com", "phone": "510-555-5002", "job_title": "Estimator"},
        {"company_name": "Pacific Coast Formwork", "first_name": "Jim", "last_name": "Brennan", "email": "jim@pcformwork.com", "phone": "510-555-5003", "job_title": "Owner"},
    ])


# ═══════════════════════════════════════════════════════════════════════════
# 6. SPECIALTY TRADE
# ═══════════════════════════════════════════════════════════════════════════
def gen_specialty_trade():
    F = "specialty-trade"
    print(f"\n{'='*60}\n  {F.upper()}\n{'='*60}")

    write_csv(F, "05_projects.csv", [
        {"name": "Sunrise Tower - Fire Protection", "code": "SRT-FP", "status": "active", "project_type": "commercial", "client_name": "Pacific Mechanical (Prime)", "contract_amount": "4800000", "start_date": "2025-08-01", "estimated_end_date": "2027-03-31"},
        {"name": "Tech Campus - Fire Alarm & Suppression", "code": "TCP-FA", "status": "pre_construction", "project_type": "commercial", "client_name": "Pacific Builders", "contract_amount": "2200000", "start_date": "2026-06-01", "estimated_end_date": "2027-08-31"},
        {"name": "Service & Inspections Portfolio", "code": "SVC-2025", "status": "active", "project_type": "service", "client_name": "Various Building Owners", "contract_amount": "850000", "start_date": "2025-01-01", "estimated_end_date": "2025-12-31"},
    ])

    write_csv(F, "01_chart_of_accounts.csv", [
        {"account_number": "1000", "name": "Cash", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1010", "name": "Accounts Receivable", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1020", "name": "Retention Receivable", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1030", "name": "Inventory - Sprinkler Heads & Pipe", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1100", "name": "Vehicles & Equipment", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "2000", "name": "Accounts Payable", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2010", "name": "Accrued Payroll", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "3000", "name": "Owner's Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "4000", "name": "New Construction Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4010", "name": "Service & Inspection Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4020", "name": "Service Agreement Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "5000", "name": "Technician Labor", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5010", "name": "Specialty Materials (Pipe, Heads, Panels)", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5020", "name": "Licensing & Certifications", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "6000", "name": "Office & Admin", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6010", "name": "Insurance (WC + GL + E&O)", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6020", "name": "Vehicle Fleet", "account_type": "expense", "sub_type": "operating_expense"},
    ])

    write_csv(F, "financial_statements.csv", [
        {"section": "INCOME STATEMENT", "line_item": "", "annual_amount": "", "notes": "Fire Protection Specialty: Higher margins, licensed trade, recurring service revenue"},
        {"section": "Revenue", "line_item": "New Construction Contracts", "annual_amount": "7000000", "notes": "Sprinkler + fire alarm installs"},
        {"section": "Revenue", "line_item": "Service & Inspections", "annual_amount": "850000", "notes": "Annual inspections, T&M repairs"},
        {"section": "Revenue", "line_item": "Service Agreements (Recurring)", "annual_amount": "320000", "notes": "Monthly monitoring + maintenance"},
        {"section": "Revenue", "line_item": "TOTAL REVENUE", "annual_amount": "8170000", "notes": ""},
        {"section": "Cost of Revenue", "line_item": "Technician Labor", "annual_amount": "2800000", "notes": "Licensed fitters + helpers"},
        {"section": "Cost of Revenue", "line_item": "Materials", "annual_amount": "1600000", "notes": "Pipe, heads, panels, wire"},
        {"section": "Cost of Revenue", "line_item": "Licensing & Certs", "annual_amount": "45000", "notes": "C-16 license, NICET certs"},
        {"section": "Cost of Revenue", "line_item": "TOTAL COST OF REVENUE", "annual_amount": "4445000", "notes": ""},
        {"section": "Gross Profit", "line_item": "GROSS PROFIT", "annual_amount": "3725000", "notes": "45.6% gross margin — premium trade"},
        {"section": "Operating Expenses", "line_item": "Office & Admin", "annual_amount": "580000", "notes": ""},
        {"section": "Operating Expenses", "line_item": "Insurance", "annual_amount": "480000", "notes": "Fire protection is lower risk"},
        {"section": "Operating Expenses", "line_item": "Vehicle Fleet", "annual_amount": "220000", "notes": "Service vans"},
        {"section": "Net Income", "line_item": "NET INCOME", "annual_amount": "2445000", "notes": "29.9% net margin — excellent"},
        {"section": "BALANCE SHEET", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Assets", "line_item": "Cash", "annual_amount": "680000", "notes": ""},
        {"section": "Assets", "line_item": "Accounts Receivable", "annual_amount": "1100000", "notes": ""},
        {"section": "Assets", "line_item": "Inventory", "annual_amount": "180000", "notes": "Common sprinkler parts"},
        {"section": "Assets", "line_item": "Vehicles & Equipment (net)", "annual_amount": "420000", "notes": "Service fleet"},
        {"section": "Assets", "line_item": "TOTAL ASSETS", "annual_amount": "2380000", "notes": ""},
        {"section": "Liabilities", "line_item": "AP + Accrued", "annual_amount": "480000", "notes": ""},
        {"section": "Equity", "line_item": "Owner's Equity", "annual_amount": "1900000", "notes": ""},
        {"section": "KEY METRICS", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Metrics", "line_item": "Gross Margin", "annual_amount": "45.6%", "notes": "Licensed specialty premium"},
        {"section": "Metrics", "line_item": "Recurring Revenue %", "annual_amount": "14.3%", "notes": "Service + agreements — growing"},
        {"section": "Metrics", "line_item": "Revenue per Tech", "annual_amount": "467000", "notes": "18 techs (field)"},
        {"section": "Metrics", "line_item": "Backlog", "annual_amount": "4200000", "notes": ""},
    ])

    write_csv(F, "03_bank_accounts.csv", [
        {"name": "Operating", "bank_name": "US Bank", "account_type": "checking", "account_number_last4": "7701", "routing_number_last4": "4455", "current_balance": "680000"},
    ])
    write_csv(F, "08_vendors.csv", [
        {"company_name": "Viking Sprinkler Supply", "first_name": "Dan", "last_name": "Petrov", "email": "dan@vikingfire.com", "phone": "408-555-6001", "job_title": "Sales"},
        {"company_name": "Notifier Fire Systems", "first_name": "Amy", "last_name": "Huang", "email": "amy@notifier.com", "phone": "408-555-6002", "job_title": "Rep"},
    ])


# ═══════════════════════════════════════════════════════════════════════════
# 7. ARCHITECTURE / ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════
def gen_architecture_engineering():
    F = "architecture-engineering"
    print(f"\n{'='*60}\n  {F.upper()}\n{'='*60}")

    write_csv(F, "05_projects.csv", [
        {"name": "Sunrise Tower - Full A&E Services", "code": "SRT-AE", "status": "active", "project_type": "commercial", "client_name": "Sunrise Development Group", "contract_amount": "12500000", "start_date": "2024-06-01", "estimated_end_date": "2027-09-30"},
        {"name": "Bayview School - Architecture", "code": "BVS-AE", "status": "active", "project_type": "institutional", "client_name": "SF Unified School District", "contract_amount": "2800000", "start_date": "2024-09-01", "estimated_end_date": "2026-12-31"},
        {"name": "Harbor Point - Structural Engineering", "code": "HP-SE", "status": "completed", "project_type": "residential", "client_name": "Harbor Point LLC", "contract_amount": "1400000", "start_date": "2023-03-01", "estimated_end_date": "2025-06-30"},
        {"name": "City Hall Seismic Retrofit - Study", "code": "CHS-25", "status": "active", "project_type": "institutional", "client_name": "City of Oakland", "contract_amount": "680000", "start_date": "2025-08-01", "estimated_end_date": "2026-03-31"},
    ])

    write_csv(F, "01_chart_of_accounts.csv", [
        {"account_number": "1000", "name": "Cash", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1010", "name": "Accounts Receivable - Billings", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1020", "name": "Unbilled Revenue (WIP)", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1030", "name": "Prepaid Expenses", "account_type": "asset", "sub_type": "current_asset"},
        {"account_number": "1100", "name": "Office Equipment & FF&E", "account_type": "asset", "sub_type": "fixed_asset"},
        {"account_number": "2000", "name": "Accounts Payable", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2010", "name": "Accrued Payroll & Benefits", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "2020", "name": "Deferred Revenue (Advance Billings)", "account_type": "liability", "sub_type": "current_liability"},
        {"account_number": "3000", "name": "Partners' Equity", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "3010", "name": "Retained Earnings", "account_type": "equity", "sub_type": "equity"},
        {"account_number": "4000", "name": "Design Fee Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4010", "name": "Engineering Fee Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4020", "name": "Construction Admin Fee Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "4030", "name": "Reimbursable Revenue", "account_type": "revenue", "sub_type": "operating_revenue"},
        {"account_number": "5000", "name": "Professional Staff Salaries", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5010", "name": "Sub-Consultant Fees", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5020", "name": "Benefits & Payroll Taxes", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "5030", "name": "Direct Project Expenses", "account_type": "expense", "sub_type": "cost_of_revenue"},
        {"account_number": "6000", "name": "Office Rent & Occupancy", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6010", "name": "Software & Technology", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6020", "name": "Professional Liability (E&O) Insurance", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6030", "name": "Marketing & Proposals", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6040", "name": "Professional Development & Licensing", "account_type": "expense", "sub_type": "operating_expense"},
        {"account_number": "6050", "name": "Admin Staff Salaries", "account_type": "expense", "sub_type": "operating_expense"},
    ])

    write_csv(F, "financial_statements.csv", [
        {"section": "INCOME STATEMENT", "line_item": "", "annual_amount": "", "notes": "A&E Firm: People business, 3x multiplier on salary, 15-25% net profit"},
        {"section": "Revenue", "line_item": "Design Fee Revenue", "annual_amount": "8200000", "notes": "SD, DD, CD phases"},
        {"section": "Revenue", "line_item": "Engineering Fee Revenue", "annual_amount": "4800000", "notes": "Structural, MEP, civil"},
        {"section": "Revenue", "line_item": "Construction Admin Revenue", "annual_amount": "2400000", "notes": "CA phase (~15% of fees)"},
        {"section": "Revenue", "line_item": "Reimbursable Revenue", "annual_amount": "600000", "notes": "Travel, printing, models"},
        {"section": "Revenue", "line_item": "TOTAL REVENUE", "annual_amount": "16000000", "notes": ""},
        {"section": "Direct Costs", "line_item": "Professional Staff Salaries", "annual_amount": "5800000", "notes": "Architects, engineers, designers"},
        {"section": "Direct Costs", "line_item": "Benefits & Payroll Taxes", "annual_amount": "1740000", "notes": "30% of direct labor"},
        {"section": "Direct Costs", "line_item": "Sub-Consultant Fees", "annual_amount": "2200000", "notes": "MEP, geotech, landscape subs"},
        {"section": "Direct Costs", "line_item": "Direct Project Expenses", "annual_amount": "480000", "notes": "Printing, models, travel"},
        {"section": "Direct Costs", "line_item": "TOTAL DIRECT COSTS", "annual_amount": "10220000", "notes": ""},
        {"section": "Gross Profit", "line_item": "GROSS PROFIT", "annual_amount": "5780000", "notes": "36.1% gross margin"},
        {"section": "Overhead", "line_item": "Office Rent & Occupancy", "annual_amount": "720000", "notes": "Creative studio space"},
        {"section": "Overhead", "line_item": "Software & Technology", "annual_amount": "480000", "notes": "Revit, AutoCAD, Rhino, render farm"},
        {"section": "Overhead", "line_item": "E&O Insurance", "annual_amount": "320000", "notes": "2% of revenue — CRITICAL"},
        {"section": "Overhead", "line_item": "Marketing & Proposals", "annual_amount": "240000", "notes": "Awards, competitions, PR"},
        {"section": "Overhead", "line_item": "Professional Development", "annual_amount": "120000", "notes": "Licenses, conferences, AIA dues"},
        {"section": "Overhead", "line_item": "Admin Staff", "annual_amount": "420000", "notes": "HR, accounting, receptionist"},
        {"section": "Overhead", "line_item": "TOTAL OVERHEAD", "annual_amount": "2300000", "notes": ""},
        {"section": "Net Income", "line_item": "NET INCOME", "annual_amount": "3480000", "notes": "21.8% net margin"},
        {"section": "BALANCE SHEET", "line_item": "", "annual_amount": "", "notes": "A&E: Asset-light, WIP is key"},
        {"section": "Assets", "line_item": "Cash", "annual_amount": "1800000", "notes": "3 months of overhead"},
        {"section": "Assets", "line_item": "Accounts Receivable", "annual_amount": "2400000", "notes": "~55 day DSO (slow-paying clients)"},
        {"section": "Assets", "line_item": "Unbilled Revenue (WIP)", "annual_amount": "1200000", "notes": "Hours worked, not yet billed"},
        {"section": "Assets", "line_item": "TOTAL ASSETS", "annual_amount": "5400000", "notes": ""},
        {"section": "Liabilities", "line_item": "Accounts Payable (sub-consultants)", "annual_amount": "680000", "notes": ""},
        {"section": "Liabilities", "line_item": "Accrued Payroll", "annual_amount": "480000", "notes": ""},
        {"section": "Liabilities", "line_item": "Deferred Revenue", "annual_amount": "360000", "notes": "Retainers from clients"},
        {"section": "Liabilities", "line_item": "TOTAL LIABILITIES", "annual_amount": "1520000", "notes": ""},
        {"section": "Equity", "line_item": "Partners' Equity", "annual_amount": "3880000", "notes": "3 partners"},
        {"section": "KEY METRICS", "line_item": "", "annual_amount": "", "notes": ""},
        {"section": "Metrics", "line_item": "Net Multiplier", "annual_amount": "2.76x", "notes": "Revenue / direct labor (target: 2.8-3.2x)"},
        {"section": "Metrics", "line_item": "Utilization Rate", "annual_amount": "68%", "notes": "Billable hours / total hours"},
        {"section": "Metrics", "line_item": "Revenue per Employee", "annual_amount": "228000", "notes": "70 total staff"},
        {"section": "Metrics", "line_item": "Net Profit Margin", "annual_amount": "21.8%", "notes": "Target: 15-25%"},
        {"section": "Metrics", "line_item": "Backlog", "annual_amount": "12400000", "notes": "Contracted unearned fees"},
        {"section": "Metrics", "line_item": "Win Rate", "annual_amount": "32%", "notes": "Proposals won / submitted"},
        {"section": "Metrics", "line_item": "Avg Bill Rate", "annual_amount": "195", "notes": "$/hr blended rate"},
        {"section": "Metrics", "line_item": "Overhead Rate", "annual_amount": "145%", "notes": "Overhead / direct labor"},
    ])

    write_csv(F, "03_bank_accounts.csv", [
        {"name": "Operating", "bank_name": "First Republic", "account_type": "checking", "account_number_last4": "2201", "routing_number_last4": "1100", "current_balance": "1800000"},
    ])
    write_csv(F, "08_vendors.csv", [
        {"company_name": "Thornton Tomasetti (Structural Sub)", "first_name": "Brian", "last_name": "Chen", "email": "brian@thorntontomasetti.com", "phone": "415-555-7001", "job_title": "Associate"},
        {"company_name": "Arup (MEP Sub-Consultant)", "first_name": "Priya", "last_name": "Sharma", "email": "priya@arup.com", "phone": "415-555-7002", "job_title": "Engineer"},
        {"company_name": "BKF Engineers (Civil)", "first_name": "Matt", "last_name": "Rodriguez", "email": "matt@bkf.com", "phone": "415-555-7003", "job_title": "PM"},
        {"company_name": "Atelier Ten (Sustainability)", "first_name": "Emma", "last_name": "Liu", "email": "emma@atelierten.com", "phone": "415-555-7004", "job_title": "Director"},
    ])


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating mock data for all 7 company types...\n")
    gen_general_contractor()
    gen_developer()
    gen_property_manager()
    gen_owner_builder()
    gen_subcontractor()
    gen_specialty_trade()
    gen_architecture_engineering()
    print("\n\nDone! All company type folders generated.")
