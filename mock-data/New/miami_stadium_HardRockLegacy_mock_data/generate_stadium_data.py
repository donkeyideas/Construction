#!/usr/bin/env python3
"""
Generate corrected CSV files for Hard Rock Legacy Stadium Complex mock data.
Matches financial targets from the DOCX financial statements.

Target P&L (2025):
  Revenue:       $290,900,000
  Direct Costs:  $266,170,000
  Overhead:      $15,421,000
  Net Income:     $9,309,000

Target Balance Sheet (12/31/2025):
  Total Assets:       $154,707,500
  Total Liabilities:   $78,650,000
  Total Equity:        $76,057,500
"""

import csv
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "miami_stadium_mock")

# ── Monthly revenue by project (2025) ──────────────────────────────────
PROJECTS = {
    "HRL": {
        "name": "Hard Rock Legacy Stadium",
        "acct": 4000,
        "rev": [17800000,18100000,18500000,19200000,18800000,17500000,
                16200000,15800000,16500000,17200000,16800000,15800000],
    },
    "HPC": {
        "name": "Hurricane Football Performance Center",
        "acct": 4010,
        "rev": [5200000,5100000,4800000,4500000,2000000,1800000,
                1500000,1250000,1100000,950000,800000,350000],
    },
    "CAV": {
        "name": "Coral Gables Athlete Village",
        "acct": 4020,
        "rev": [2200000,2100000,2000000,1900000,800000,1200000,
                1100000,1000000,900000,700000,500000,400000],
    },
    "HAA": {
        "name": "Hurricane Athletic Administration Tower",
        "acct": 4030,
        "rev": [1100000,1050000,1000000,1000000,900000,700000,
                900000,800000,700000,600000,550000,450000],
    },
    "SDI": {
        "name": "Stadium District Site & Infrastructure",
        "acct": 4040,
        "rev": [3800000,3500000,3200000,3000000,2800000,2500000,
                2200000,1800000,2000000,1800000,1200000,1000000],
    },
}

TOTAL_REVENUE = 290900000

# ── Cost model ─────────────────────────────────────────────────────────
TOTAL_DIRECT_COSTS = 266170000
DEPRECIATION_2025 = 1600000
DIRECT_COSTS_EXCL_DEP = TOTAL_DIRECT_COSTS - DEPRECIATION_2025  # 264,570,000

COST_ACCOUNTS = {
    5000: 191640000,  # Structural sub
    5010: 21290000,   # MEP sub
    5120: 18630000,   # Concrete materials
    5130: 13310000,   # Steel materials
    5200: 10650000,   # Direct labor
    5230: 3720000,    # Equipment ops (excl. depreciation)
    5300: 5330000,    # General conditions
}

OVERHEAD_ACCOUNTS = {
    5310: 5236000,   # PM Staff
    5320: 2327000,   # Site General Conditions
    5330: 1745000,   # Safety Director/Program
    5360: 3200000,   # Bonds & Insurance
    5410: 876000,    # IT/Software (+3K for exact NI)
    5420: 1164000,   # Legal & Professional
    5440: 873000,    # Executive Management
}
TOTAL_OVERHEAD = sum(OVERHEAD_ACCOUNTS.values())  # 15,421,000
NET_INCOME = TOTAL_REVENUE - TOTAL_DIRECT_COSTS - TOTAL_OVERHEAD  # 9,309,000

# ── Opening Balance (1/1/2025) ─────────────────────────────────────────
OB = {
    1000: 21091000,     # Cash
    1010: 39566500,     # AR
    1020: 8512500,      # Retainage Receivable
    1030: 15200000,     # Costs in Excess of Billings
    1040: 4850000,      # Prepaid
    1100: 18050000,     # Equipment
    1110: -1600000,     # Accum Dep (credit = negative debit)
    1200: 1300000,      # Deposits
    2000: -20000000,    # AP (credit)
    2010: -7921500,     # Retainage Payable (credit)
    2030: -3000000,     # Accrued Payroll (credit)
    2040: -5000000,     # Accrued Project Costs (credit)
    2100: -800000,      # Equipment Financing Current (no change in 2025)
    2200: -3500000,     # Equipment Financing LT (credit)
    3000: -59163000,    # Owner Capital (credit)
    3010: -7585500,     # Retained Earnings (credit)
}

# ── Ending Balance targets (12/31/2025) ────────────────────────────────
END = {
    1000: 48500000,
    1010: 43350000,     # 38.5M AR + 4.85M CO AR combined
    1020: 23057500,
    1030: 15200000,
    1040: 4850000,
    1100: 20850000,
    1110: -3200000,
    1200: 2100000,
    2000: -41000000,
    2010: -21150000,
    2030: -4200000,
    2040: -6800000,
    2100: -800000,      # No change (same as OB)
    2200: -4700000,     # 3500000 + 1200000 new borrowings
    3000: -59163000,
    3010: -7585500,
}

MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"]
MONTH_ENDS = [
    "2025-01-31","2025-02-28","2025-03-31","2025-04-30",
    "2025-05-31","2025-06-30","2025-07-31","2025-08-31",
    "2025-09-30","2025-10-31","2025-11-30","2025-12-31",
]
MONTH_NAMES = ["January","February","March","April","May","June",
               "July","August","September","October","November","December"]


def fmt(amount):
    if amount == 0:
        return ""
    return f"{amount:.2f}"


def allocate_to_months(annual, weights):
    """Distribute annual total across 12 months proportionally."""
    total_w = sum(weights)
    result = []
    running = 0.0
    for i in range(12):
        if i < 11:
            val = round(annual * weights[i] / total_w, 2)
            result.append(val)
            running += val
        else:
            result.append(round(annual - running, 2))
    return result


def generate_opening_balances():
    """Generate 00_opening_balances.csv"""
    lines = []
    for acct, bal in sorted(OB.items()):
        if bal > 0:
            dr, cr = bal, ""
        elif bal < 0:
            dr, cr = "", -bal
        else:
            continue
        lines.append({
            "entry_number": "JE-OB-001",
            "entry_date": "2025-01-01",
            "description": "Opening Balance - Hard Rock Legacy Complex 2025",
            "reference": "OB-2025",
            "account_number": acct,
            "debit": fmt(dr) if isinstance(dr, (int, float)) else "",
            "credit": fmt(cr) if isinstance(cr, (int, float)) else "",
            "line_description": f"Opening balance account {acct}",
        })

    path = os.path.join(OUT_DIR, "00_opening_balances.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "entry_number","entry_date","description","reference",
            "account_number","debit","credit","line_description"
        ])
        w.writeheader()
        w.writerows(lines)
    print(f"Written {len(lines)} OB lines to {path}")


def generate_journal_entries():
    """Generate 21_journal_entries.csv (2025 operational entries only)."""
    rows = []
    je_num = 2  # Start at 2; OB is JE-OB-001

    def add_je(num, date, desc, ref, lines):
        total_dr = sum(l[1] for l in lines)
        total_cr = sum(l[2] for l in lines)
        assert abs(total_dr - total_cr) < 0.02, \
            f"JE-{num:04d} unbalanced: DR={total_dr:.2f} CR={total_cr:.2f} diff={total_dr-total_cr:.2f}"
        for acct, dr, cr, ldesc in lines:
            rows.append({
                "entry_number": f"JE-{num:04d}",
                "entry_date": date,
                "description": desc,
                "reference": ref,
                "account_number": acct,
                "debit": fmt(dr),
                "credit": fmt(cr),
                "line_description": ldesc,
            })

    # Monthly revenue weights (total across all projects)
    monthly_totals = [sum(p["rev"][i] for p in PROJECTS.values()) for i in range(12)]

    # Allocate each cost account across months using revenue weights
    monthly_costs = {}
    for acct, annual in COST_ACCOUNTS.items():
        monthly_costs[acct] = allocate_to_months(annual, monthly_totals)

    # Allocate each overhead account (equal monthly)
    monthly_overhead = {}
    for acct, annual in OVERHEAD_ACCOUNTS.items():
        monthly_overhead[acct] = allocate_to_months(annual, [1]*12)

    # ── Cash collections schedule ──
    # Total net billings (after 5% retainage) = 276,355,000
    # Collections = OB_AR + net_billings - END_AR
    total_collections = OB[1010] + 276355000 - END[1010]  # 272,571,500
    # Weighted: higher early (collecting prior-year AR), taper late
    coll_weights = [15, 13, 12, 12, 11, 10, 9, 8, 7, 6, 4, 2]
    monthly_collections = allocate_to_months(total_collections, coll_weights)

    # ── AP accruals ──
    monthly_ap_accrued = []
    for i in range(12):
        direct_ap = round(sum(monthly_costs[a][i] for a in COST_ACCOUNTS) * 0.95, 2)
        oh_ap = round(sum(monthly_overhead[a][i] for a in OVERHEAD_ACCOUNTS), 2)
        monthly_ap_accrued.append(round(direct_ap + oh_ap, 2))

    # Year-end reclass AP → accruals
    reclass_payroll = abs(END[2030]) - abs(OB[2030])  # 1,200,000
    reclass_costs = abs(END[2040]) - abs(OB[2040])    # 1,800,000
    total_ap_accrued = sum(monthly_ap_accrued)
    total_ap_payments = abs(OB[2000]) + total_ap_accrued - (reclass_payroll + reclass_costs) - abs(END[2000])

    # Weighted payments: higher early, taper late
    pay_weights = [12, 12, 11, 11, 10, 10, 9, 9, 8, 6, 4, 2]
    monthly_ap_payments = allocate_to_months(total_ap_payments, pay_weights)

    # ── Generate monthly JEs ────────────────────────────────────────────
    for mi in range(12):
        date = MONTH_ENDS[mi]
        mname = MONTH_NAMES[mi]
        mnum = MONTHS[mi]

        # Revenue recognition per project
        for code, p in PROJECTS.items():
            rev = p["rev"][mi]
            if rev == 0:
                continue
            ret = round(rev * 0.05, 2)

            add_je(je_num, date,
                   f"Revenue Recognition {mname} 2025 - {p['name']}",
                   f"REV-2025-{mnum}",
                   [(1010, rev, 0, "Accounts receivable billed to UM"),
                    (p["acct"], 0, rev, f"Contract revenue - {p['name']}")])
            je_num += 1

            add_je(je_num, date,
                   f"Retainage Withheld {mname} 2025 - {p['name']}",
                   f"RET-2025-{mnum}",
                   [(1020, ret, 0, "Retainage receivable 5%"),
                    (1010, 0, ret, "Reduce AR for retainage")])
            je_num += 1

        # Cash receipt
        coll = monthly_collections[mi]
        if coll > 0:
            add_je(je_num, date,
                   f"Cash Receipt {mname} 2025 - UM Progress Payments",
                   f"CASH-2025-{mnum}",
                   [(1000, coll, 0, "Cash received from UM"),
                    (1010, 0, coll, "Clear accounts receivable")])
            je_num += 1

        # Construction costs (consolidated)
        cost_lines = []
        total_mc = 0
        for acct in sorted(COST_ACCOUNTS.keys()):
            amt = monthly_costs[acct][mi]
            if amt > 0:
                cost_lines.append((acct, amt, 0, f"Direct cost {acct}"))
                total_mc += amt
        ret_pay = round(total_mc * 0.05, 2)
        ap_net = round(total_mc - ret_pay, 2)
        cost_lines.append((2000, 0, ap_net, "Accounts payable net of retainage"))
        cost_lines.append((2010, 0, ret_pay, "Retainage payable to subs"))

        add_je(je_num, date,
               f"Construction Costs {mname} 2025 - All Projects",
               f"COST-2025-{mnum}",
               cost_lines)
        je_num += 1

        # Sub payment
        pmt = monthly_ap_payments[mi]
        if pmt > 0:
            add_je(je_num, date,
                   f"Subcontractor & Vendor Payments {mname} 2025",
                   f"PAY-2025-{mnum}",
                   [(2000, pmt, 0, "Pay subcontractors and vendors"),
                    (1000, 0, pmt, "Cash paid")])
            je_num += 1

        # Overhead
        oh_lines = []
        total_oh = 0
        for acct in sorted(OVERHEAD_ACCOUNTS.keys()):
            amt = monthly_overhead[acct][mi]
            if amt > 0:
                oh_lines.append((acct, amt, 0, f"Overhead {acct}"))
                total_oh += amt
        oh_lines.append((2000, 0, round(total_oh, 2), "AP - overhead costs"))
        add_je(je_num, date,
               f"Overhead & Indirect Costs {mname} 2025",
               f"OH-2025-{mnum}",
               oh_lines)
        je_num += 1

    # ── Quarterly Depreciation ──
    for qi, qd in enumerate(["2025-03-31","2025-06-30","2025-09-30","2025-12-31"]):
        add_je(je_num, qd,
               f"Depreciation Q{qi+1} 2025 - Equipment",
               f"DEP-2025-Q{qi+1}",
               [(5230, 400000, 0, "Equipment depreciation"),
                (1110, 0, 400000, "Accumulated depreciation")])
        je_num += 1

    # ── Equipment Purchase ──
    add_je(je_num, "2025-06-30",
           "Equipment Purchase 2025",
           "EQUIP-2025",
           [(1100, 2800000, 0, "New equipment"),
            (1000, 0, 2800000, "Cash for equipment")])
    je_num += 1

    # ── Deposits ──
    add_je(je_num, "2025-03-31",
           "Utility & Permit Deposits 2025",
           "DEPOSIT-2025",
           [(1200, 800000, 0, "Deposits paid"),
            (1000, 0, 800000, "Cash for deposits")])
    je_num += 1

    # ── Equipment Financing ──
    add_je(je_num, "2025-06-30",
           "Equipment Financing 2025",
           "FIN-2025",
           [(1000, 1200000, 0, "Financing proceeds"),
            (2200, 0, 1200000, "Equipment financing LT")])
    je_num += 1

    # ── Year-end Reclass AP → Accruals ──
    add_je(je_num, "2025-12-31",
           "Year-End Accrual Reclassification",
           "ADJ-2025-YE",
           [(2000, reclass_payroll + reclass_costs, 0, "Reduce AP"),
            (2030, 0, reclass_payroll, "Accrued payroll"),
            (2040, 0, reclass_costs, "Accrued project costs")])
    je_num += 1

    # Write CSV
    path = os.path.join(OUT_DIR, "21_journal_entries.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "entry_number","entry_date","description","reference",
            "account_number","debit","credit","line_description"
        ])
        w.writeheader()
        w.writerows(rows)

    print(f"Written {len(rows)} JE lines ({je_num-2} entries) to {path}")
    return rows


def verify(je_rows):
    """Verify JE totals match targets."""
    # Combine OB + JE balances
    balances = {}
    # Add opening balances
    for acct, bal in OB.items():
        balances[acct] = bal

    # Add JE activity
    for r in je_rows:
        acct = int(r["account_number"])
        dr = float(r["debit"]) if r["debit"] else 0
        cr = float(r["credit"]) if r["credit"] else 0
        balances.setdefault(acct, 0)
        balances[acct] += dr - cr

    names = {
        1000: "Cash", 1010: "AR", 1020: "Ret Rec", 1030: "CIE",
        1040: "Prepaid", 1100: "Equipment", 1110: "Accum Dep", 1200: "Deposits",
        2000: "AP Trade", 2010: "Ret Payable", 2030: "Accrued Payroll",
        2040: "Accrued Costs", 2100: "Equip Fin Curr", 2200: "Equip Fin LT",
        3000: "Owner Capital", 3010: "Retained Earnings",
    }

    print("\n=== BALANCE SHEET VERIFICATION ===")
    all_pass = True
    for acct in sorted(END.keys()):
        actual = round(balances.get(acct, 0), 2)
        expected = END[acct]
        ok = abs(actual - expected) < 1
        if not ok:
            all_pass = False
        name = names.get(acct, f"Acct {acct}")
        print(f"  {acct} {name:<20} Actual: {actual:>15,.2f}  Target: {expected:>15,.2f}  {'PASS' if ok else 'FAIL'}")

    # P&L from JE debits/credits to revenue/expense accounts
    rev_total = 0
    cost_total = 0
    oh_total = 0
    for r in je_rows:
        acct = int(r["account_number"])
        cr = float(r["credit"]) if r["credit"] else 0
        dr = float(r["debit"]) if r["debit"] else 0
        if 4000 <= acct <= 4090:
            rev_total += cr
        elif 5000 <= acct <= 5300:
            cost_total += dr
        elif 5310 <= acct <= 5440:
            oh_total += dr

    ni = rev_total - cost_total - oh_total
    print(f"\n=== INCOME STATEMENT ===")
    print(f"  Revenue:      {rev_total:>15,.2f}  Target: {TOTAL_REVENUE:>15,}")
    print(f"  Direct Costs: {cost_total:>15,.2f}  Target: {TOTAL_DIRECT_COSTS:>15,}")
    print(f"  Overhead:     {oh_total:>15,.2f}  Target: {TOTAL_OVERHEAD:>15,}")
    print(f"  Net Income:   {ni:>15,.2f}  Target: {NET_INCOME:>15,}")
    print(f"  NI Check:     {'PASS' if abs(ni - NET_INCOME) < 1 else 'FAIL'}")

    return all_pass


def generate_invoices():
    """Generate 20_invoices.csv."""
    rows = []
    inv = 1

    # Receivable invoices - 2025 billings
    for code, p in PROJECTS.items():
        for mi in range(12):
            rev = p["rev"][mi]
            if rev == 0:
                continue
            rows.append({
                "invoice_type": "receivable",
                "invoice_date": MONTH_ENDS[mi],
                "amount": rev,
                "tax_amount": 0,
                "due_date": MONTH_ENDS[mi],
                "description": f"Progress Billing #{inv:03d} - {MONTH_NAMES[mi]} 2025 - {p['name']}",
                "status": "paid" if mi < 10 else "pending",
                "vendor_name": "",
                "client_name": "University of Miami",
                "project_name": p["name"],
            })
            inv += 1

    # Payable invoices (major sub payments)
    payables = [
        ("2025-01-31", 22000000, "Barton Malow Company", "Hard Rock Legacy Stadium",
         "Progress Payment - Structural Steel Level 3-6"),
        ("2025-02-28", 24500000, "Barton Malow Company", "Hard Rock Legacy Stadium",
         "Progress Payment - Roof Truss Structure"),
        ("2025-01-31", 16500000, "Hensel Phelps Construction", "Hard Rock Legacy Stadium",
         "Progress Payment - Stadium Bowl Concrete Level 5-6"),
        ("2025-03-31", 18200000, "Bechtel Infrastructure", "Hard Rock Legacy Stadium",
         "Progress Payment - Stadium MEP Level 1-3 Rough-in"),
        ("2025-04-30", 19800000, "Bechtel Infrastructure", "Hard Rock Legacy Stadium",
         "Progress Payment - Stadium MEP Level 4-6"),
        ("2025-02-28", 7500000, "Bechtel Infrastructure", "Hurricane Football Performance Center",
         "Progress Payment - Football Facility MEP"),
        ("2025-01-31", 5800000, "Ajax Paving Industries", "Stadium District Site & Infrastructure",
         "Progress Payment - Parking Structure P1-P2"),
        ("2025-03-31", 4500000, "Ajax Paving Industries", "Stadium District Site & Infrastructure",
         "Progress Payment - Campus Plaza Subbase"),
        ("2025-01-31", 3200000, "Hensel Phelps Construction", "Coral Gables Athlete Village",
         "Progress Payment - Athlete Village Concrete"),
        ("2025-06-30", 8500000, "Barton Malow Company", "Hard Rock Legacy Stadium",
         "Progress Payment - Level 5-6 Structural Steel"),
        ("2025-09-30", 12000000, "Bechtel Infrastructure", "Hard Rock Legacy Stadium",
         "Progress Payment - Stadium MEP Level 5-Roof"),
        ("2025-07-31", 6200000, "Hensel Phelps Construction", "Hard Rock Legacy Stadium",
         "Progress Payment - Concourse Concrete"),
    ]

    for date, amt, vendor, proj, desc in payables:
        rows.append({
            "invoice_type": "payable",
            "invoice_date": date,
            "amount": amt,
            "tax_amount": 0,
            "due_date": date,
            "description": desc,
            "status": "paid",
            "vendor_name": vendor,
            "client_name": "",
            "project_name": proj,
        })

    path = os.path.join(OUT_DIR, "20_invoices.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "invoice_type","invoice_date","amount","tax_amount","due_date",
            "description","status","vendor_name","client_name","project_name"
        ])
        w.writeheader()
        w.writerows(rows)
    print(f"Written {len(rows)} invoices to {path}")


def generate_ar():
    """Generate 22_accounts_receivable.csv."""
    rows = [
        {"amount": 17100000, "tax_amount": 0, "due_date": "2026-01-28",
         "description": "Progress Billing - December 2025 - Stadium HRL-2024",
         "status": "pending", "client_name": "University of Miami",
         "project_name": "Hard Rock Legacy Stadium"},
        {"amount": 15800000, "tax_amount": 0, "due_date": "2026-01-28",
         "description": "Progress Billing - November 2025 - Stadium HRL-2024",
         "status": "pending", "client_name": "University of Miami",
         "project_name": "Hard Rock Legacy Stadium"},
        {"amount": 350000, "tax_amount": 0, "due_date": "2026-01-28",
         "description": "Progress Billing - December 2025 - HPC-2024",
         "status": "pending", "client_name": "University of Miami",
         "project_name": "Hurricane Football Performance Center"},
        {"amount": 400000, "tax_amount": 0, "due_date": "2026-01-28",
         "description": "Progress Billing - December 2025 - CAV-2024",
         "status": "pending", "client_name": "University of Miami",
         "project_name": "Coral Gables Athlete Village"},
        {"amount": 450000, "tax_amount": 0, "due_date": "2026-01-28",
         "description": "Progress Billing - December 2025 - HAA-2024",
         "status": "pending", "client_name": "University of Miami",
         "project_name": "Hurricane Athletic Administration Tower"},
        {"amount": 1000000, "tax_amount": 0, "due_date": "2026-01-28",
         "description": "Progress Billing - December 2025 - SDI-2024",
         "status": "pending", "client_name": "University of Miami",
         "project_name": "Stadium District Site & Infrastructure"},
        {"amount": 4850000, "tax_amount": 0, "due_date": "2026-02-15",
         "description": "Approved Change Orders Pending Billing - CO-007 through CO-013",
         "status": "pending", "client_name": "University of Miami",
         "project_name": "Hard Rock Legacy Stadium"},
    ]

    path = os.path.join(OUT_DIR, "22_accounts_receivable.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "amount","tax_amount","due_date","description","status",
            "client_name","project_name"
        ])
        w.writeheader()
        w.writerows(rows)
    print(f"Written {len(rows)} AR records to {path}")


def generate_ap():
    """Generate 23_accounts_payable.csv."""
    rows = [
        {"amount": 24500000, "tax_amount": 0, "due_date": "2026-01-30",
         "description": "Barton Malow - Roof Truss Steel Dec 2025",
         "status": "approved", "vendor_name": "Barton Malow Company",
         "project_name": "Hard Rock Legacy Stadium"},
        {"amount": 18200000, "tax_amount": 0, "due_date": "2026-01-30",
         "description": "Bechtel - MEP Level 1-3 Dec 2025",
         "status": "approved", "vendor_name": "Bechtel Infrastructure",
         "project_name": "Hard Rock Legacy Stadium"},
        {"amount": 16500000, "tax_amount": 0, "due_date": "2026-01-30",
         "description": "Hensel Phelps - Concrete Level 5-6 Dec 2025",
         "status": "approved", "vendor_name": "Hensel Phelps Construction",
         "project_name": "Hard Rock Legacy Stadium"},
        {"amount": 7500000, "tax_amount": 0, "due_date": "2026-02-01",
         "description": "Bechtel - Football Facility MEP Dec 2025",
         "status": "approved", "vendor_name": "Bechtel Infrastructure",
         "project_name": "Hurricane Football Performance Center"},
        {"amount": 5800000, "tax_amount": 0, "due_date": "2026-01-30",
         "description": "Ajax - Parking Structure Jan 2026",
         "status": "pending", "vendor_name": "Ajax Paving Industries",
         "project_name": "Stadium District Site & Infrastructure"},
        {"amount": 3200000, "tax_amount": 0, "due_date": "2026-01-30",
         "description": "Hensel Phelps - Athlete Village Concrete",
         "status": "pending", "vendor_name": "Hensel Phelps Construction",
         "project_name": "Coral Gables Athlete Village"},
        {"amount": 4850000, "tax_amount": 0, "due_date": "2026-02-28",
         "description": "HOK Architecture Fee Q4 2025",
         "status": "pending", "vendor_name": "HOK Sport + Venue + Event",
         "project_name": "Hard Rock Legacy Stadium"},
        {"amount": 2200000, "tax_amount": 0, "due_date": "2026-02-28",
         "description": "Walter P Moore Structural Engineering Q4 2025",
         "status": "pending", "vendor_name": "Walter P Moore",
         "project_name": "Hard Rock Legacy Stadium"},
        {"amount": 1800000, "tax_amount": 0, "due_date": "2026-02-28",
         "description": "WSP MEP Engineering Q4 2025",
         "status": "pending", "vendor_name": "WSP Global",
         "project_name": "Hard Rock Legacy Stadium"},
    ]

    path = os.path.join(OUT_DIR, "23_accounts_payable.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "amount","tax_amount","due_date","description","status",
            "vendor_name","project_name"
        ])
        w.writeheader()
        w.writerows(rows)
    print(f"Written {len(rows)} AP records to {path}")


if __name__ == "__main__":
    print("=" * 60)
    print("GENERATING HARD ROCK LEGACY STADIUM MOCK DATA")
    print("=" * 60)

    # Validate constants
    assert sum(COST_ACCOUNTS.values()) == DIRECT_COSTS_EXCL_DEP, "Cost accounts don't sum"
    assert TOTAL_OVERHEAD == 15421000, f"Overhead: {TOTAL_OVERHEAD}"
    assert NET_INCOME == 9309000, f"NI: {NET_INCOME}"
    for code, p in PROJECTS.items():
        total = sum(p["rev"])
        print(f"  {code}: ${total:,}")
    print(f"  TOTAL: ${sum(sum(p['rev']) for p in PROJECTS.values()):,}")

    # Verify OB balances
    ob_total = sum(OB.values())
    assert abs(ob_total) < 1, f"OB doesn't balance: {ob_total}"

    generate_opening_balances()
    je_rows = generate_journal_entries()
    ok = verify(je_rows)
    generate_invoices()
    generate_ar()
    generate_ap()

    if ok:
        print("\n*** ALL VERIFICATIONS PASSED ***")
    else:
        print("\n*** SOME VERIFICATIONS FAILED ***")
