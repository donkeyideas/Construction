#!/usr/bin/env python3
"""Part 7: Financial sheets - invoices and pre-crafted journal entries.

CRITICAL RULES:
- Pre-crafted JEs must NOT touch AR (1010), Retainage Recv (1020), AP (2000), Retainage Pay (2010)
  because the import system's skipAutoJE filter removes them when invoices coexist.
- AR/AP are driven entirely by the invoices sheet (auto-JE generation).
- Opening AR/AP balances use invoices dated 2024-12-31 with gl_account=3010 (Retained Earnings).
"""

from part01_constants import *


def generate_invoices():
    """Generate ~120 invoices: OB invoices + 12 months receivable + 12 months payable."""
    rows = []
    inv_num = 1

    # ── Opening Balance Invoices (dated 2024-12-31) ──
    # These establish AR/AP opening balances via gl_account=3010 (Retained Earnings)
    # so the JEs are: DR AR / CR Retained Earnings (receivables)
    #                 DR Retained Earnings / CR AP (payables)

    # OB Receivable - outstanding progress billings from prior year
    ob_recv = [
        (18500000, AIRPORT["client"], AIRPORT["name"], "Prior year Progress Billing #18 - Terminal foundation"),
        (12400000, AIRPORT["client"], AIRPORT["name"], "Prior year Progress Billing #19 - Deep foundations"),
        (8200000, CONDO["client"], CONDO["name"], "Prior year Progress Billing #22 - Tower structure floors 3-18"),
        (5600000, CONDO["client"], CONDO["name"], "Prior year Progress Billing #23 - MEP rough-in lower floors"),
    ]
    for amt, client, proj, desc in ob_recv:
        rows.append({
            "invoice_number": f"INV-OB-R{inv_num:03d}",
            "invoice_type": "receivable",
            "invoice_date": "2024-12-31",
            "amount": str(amt),
            "tax_amount": "0",
            "due_date": "2025-01-30",
            "description": desc,
            "status": "paid",  # Collected in Jan 2025
            "vendor_name": "",
            "client_name": client,
            "project_name": proj,
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
        })
        inv_num += 1

    # OB Payable - outstanding sub payments from prior year
    ob_pay = [
        (8500000, "Delgado Concrete Inc", AIRPORT["name"], "Prior year Payment App #12 - Concrete foundation"),
        (6200000, "Morrison Steel Fabricators", AIRPORT["name"], "Prior year Payment App #8 - Steel fabrication"),
        (5800000, "Austin Commercial LP", CONDO["name"], "Prior year Payment App #15 - Tower structure"),
        (4200000, "Trinity Plumbing & Fire", CONDO["name"], "Prior year Payment App #6 - MEP rough-in"),
        (3400000, "Lone Star MEP Services", AIRPORT["name"], "Prior year Payment App #4 - MEP systems"),
    ]
    for amt, vendor, proj, desc in ob_pay:
        rows.append({
            "invoice_number": f"INV-OB-P{inv_num:03d}",
            "invoice_type": "payable",
            "invoice_date": "2024-12-31",
            "amount": str(amt),
            "tax_amount": "0",
            "due_date": "2025-01-30",
            "description": desc,
            "status": "paid",  # Paid in Jan 2025
            "vendor_name": vendor,
            "client_name": "",
            "project_name": proj,
            "gl_account": "3010",
            "retainage_pct": "0",
            "retainage_held": "0",
        })
        inv_num += 1

    # ── Monthly Receivable Invoices (progress billings) ──
    for mi in range(12):
        d = MONTH_ENDS[mi]
        mname = MONTH_NAMES[mi]

        # Airport progress billing
        amt = AIRPORT_MONTHLY_REV[mi]
        rows.append({
            "invoice_number": f"INV-R{inv_num:03d}",
            "invoice_type": "receivable",
            "invoice_date": d,
            "amount": str(amt),
            "tax_amount": "0",
            "due_date": (date.fromisoformat(d) + timedelta(days=30)).isoformat(),
            "description": f"Progress Billing #{mi+20} - {mname} 2025 - DFW Terminal 6",
            "status": "paid" if mi < 10 else "pending",
            "vendor_name": "",
            "client_name": AIRPORT["client"],
            "project_name": AIRPORT["name"],
            "gl_account": "4000",
            "retainage_pct": "5",
            "retainage_held": str(round(amt * 0.05)),
        })
        inv_num += 1

        # Condo progress billing
        amt = CONDO_MONTHLY_REV[mi]
        if amt > 0:
            rows.append({
                "invoice_number": f"INV-R{inv_num:03d}",
                "invoice_type": "receivable",
                "invoice_date": d,
                "amount": str(amt),
                "tax_amount": "0",
                "due_date": (date.fromisoformat(d) + timedelta(days=30)).isoformat(),
                "description": f"Progress Billing #{mi+24} - {mname} 2025 - Pinnacle Bay",
                "status": "paid" if mi < 10 else "pending",
                "vendor_name": "",
                "client_name": CONDO["client"],
                "project_name": CONDO["name"],
                "gl_account": "4010",
                "retainage_pct": "10",
                "retainage_held": str(round(amt * 0.10)),
            })
            inv_num += 1

    # ── Monthly Payable Invoices (subcontractor payments) ──
    # Distribute direct costs across vendors monthly
    vendor_splits = [
        ("Delgado Concrete Inc", 5000, 0.22),
        ("Morrison Steel Fabricators", 5030, 0.08),
        ("Lone Star MEP Services", 5010, 0.19),
        ("Southwest Curtain Wall", 5030, 0.04),
        ("DFW Electric Co", 5010, 0.06),
        ("Austin Commercial LP", 5000, 0.14),
        ("Trinity Plumbing & Fire", 5010, 0.06),
        ("Dallas Glass & Glazing", 5030, 0.03),
        ("Texas Drywall & Acoustics", 5120, 0.02),
        ("Crossland Heavy Civil", 5020, 0.04),
        ("Vulcan Materials DFW", 5100, 0.05),
        ("CEMEX Texas Operations", 5100, 0.04),
        ("HD Supply Waterworks", 5130, 0.03),
    ]

    # Monthly total payable = direct costs minus amounts booked by JEs (labor, payroll tax, equip ops)
    # JEs handle: 5200 ($6.5M) + 5210 ($1.3M) + 5300 ($2.7M) = $10.5M
    # Invoices handle the rest through vendor AP
    INVOICE_DIRECT_TOTAL = TOTAL_DIRECT - 6500000 - 1300000 - 2700000  # $214,500,000
    monthly_rev_totals = [AIRPORT_MONTHLY_REV[i] + CONDO_MONTHLY_REV[i] for i in range(12)]
    monthly_direct = allocate_to_months(INVOICE_DIRECT_TOTAL, monthly_rev_totals)

    for mi in range(12):
        d = MONTH_ENDS[mi]
        mname = MONTH_NAMES[mi]
        month_total = monthly_direct[mi]

        # Pick 4-5 vendors per month
        selected = random.sample(vendor_splits, random.randint(4, 5))
        total_pct = sum(s[2] for s in selected)

        for vendor_name, gl_acct, pct in selected:
            amt = round(month_total * pct / total_pct)
            if amt < 10000:
                continue
            proj = AIRPORT["name"] if gl_acct in [5010, 5020] or "DFW" in vendor_name or "Crossland" in vendor_name else CONDO["name"]
            # Alternate project assignment to spread across both
            if random.random() < 0.4:
                proj = CONDO["name"] if proj == AIRPORT["name"] else AIRPORT["name"]

            rows.append({
                "invoice_number": f"INV-P{inv_num:03d}",
                "invoice_type": "payable",
                "invoice_date": d,
                "amount": str(amt),
                "tax_amount": "0",
                "due_date": (date.fromisoformat(d) + timedelta(days=30)).isoformat(),
                "description": f"Payment Application - {mname} 2025 - {vendor_name}",
                "status": "paid" if mi < 10 else "approved",
                "vendor_name": vendor_name,
                "client_name": "",
                "project_name": proj,
                "gl_account": str(gl_acct),
                "retainage_pct": "5",
                "retainage_held": str(round(amt * 0.05)),
            })
            inv_num += 1

    return rows


def generate_journal_entries():
    """Generate pre-crafted JEs for all non-AR/AP financial activity.

    NEVER touch: 1010 (AR), 1020 (Retainage Recv), 2000 (AP), 2010 (Retainage Pay).
    Those are handled by invoice auto-JEs.
    """
    rows = []
    je_num = 1

    def add_je(num, je_date, desc, ref, lines):
        total_dr = sum(l[1] for l in lines)
        total_cr = sum(l[2] for l in lines)
        diff = abs(total_dr - total_cr)
        assert diff < 0.02, f"JE-{num:04d} unbalanced: DR={total_dr:.2f} CR={total_cr:.2f} diff={diff:.2f}"
        for acct, dr, cr, ldesc in lines:
            rows.append({
                "entry_number": f"JE-{num:04d}",
                "entry_date": je_date,
                "description": desc,
                "reference": ref,
                "account_number": str(acct),
                "debit": fmt(dr),
                "credit": fmt(cr),
                "line_description": ldesc,
            })

    # ── Opening Balance JE (non-AR/AP accounts only) ──
    ob_lines = []
    for acct, bal in sorted(OB.items()):
        if acct in (1010, 1020, 2000, 2010):
            continue  # Skip AR/AP - handled by OB invoices
        if bal > 0:
            ob_lines.append((acct, bal, 0, f"Opening balance account {acct}"))
        elif bal < 0:
            ob_lines.append((acct, 0, -bal, f"Opening balance account {acct}"))

    # The OB invoices create: DR AR + DR Retainage Recv / CR Retained Earnings (receivables)
    # and DR Retained Earnings / CR AP + CR Retainage Payable (payables)
    # Those net out in Retained Earnings. But our OB JE excludes AR/AP/Ret accounts.
    # We need a plug to Retained Earnings to balance.
    ob_dr = sum(l[1] for l in ob_lines)
    ob_cr = sum(l[2] for l in ob_lines)
    plug = ob_dr - ob_cr  # If positive, we have excess debits, need more credits
    if plug > 0:
        ob_lines.append((3010, 0, plug, "Opening balance plug - AR/AP via invoices"))
    elif plug < 0:
        ob_lines.append((3010, -plug, 0, "Opening balance plug - AR/AP via invoices"))

    add_je(je_num, "2025-01-01", "Opening Balance - Pinnacle Pacific Builders 2025", "OB-2025", ob_lines)
    je_num += 1

    # ── Monthly JEs ──
    monthly_rev_totals = [AIRPORT_MONTHLY_REV[i] + CONDO_MONTHLY_REV[i] for i in range(12)]

    # Allocate costs to months
    monthly_direct_costs = {}
    for acct, (name, annual) in DIRECT_COST_ACCOUNTS.items():
        monthly_direct_costs[acct] = allocate_to_months(annual, monthly_rev_totals)

    monthly_prop_mgmt = {}
    for acct, (name, annual) in PROPERTY_MGMT_ACCOUNTS.items():
        monthly_prop_mgmt[acct] = allocate_to_months(annual, [1]*12)  # Equal monthly

    monthly_overhead = {}
    for acct, (name, annual) in OVERHEAD_ACCOUNTS.items():
        monthly_overhead[acct] = allocate_to_months(annual, [1]*12)

    monthly_depreciation = allocate_to_months(DEPRECIATION, [1]*12)
    monthly_interest = allocate_to_months(INTEREST_EXPENSE, [1]*12)
    monthly_rental = RENTAL_MONTHLY

    for mi in range(12):
        d = MONTH_ENDS[mi]
        mname = MONTH_NAMES[mi]
        mnum = MONTHS[mi]

        # 1. Payroll accrual (direct labor + G&A salaries + payroll taxes)
        direct_labor = monthly_direct_costs[5200][mi]
        direct_tax = monthly_direct_costs[5210][mi]
        ga_salaries = monthly_overhead[6000][mi]
        ga_tax = monthly_overhead[6010][mi]
        total_payroll = direct_labor + direct_tax + ga_salaries + ga_tax

        add_je(je_num, d,
               f"Payroll Accrual {mname} 2025",
               f"PR-2025-{mnum}",
               [(5200, direct_labor, 0, "Direct labor - field crews"),
                (5210, direct_tax, 0, "Direct labor payroll taxes"),
                (6000, ga_salaries, 0, "Officer & admin salaries"),
                (6010, ga_tax, 0, "G&A payroll taxes & benefits"),
                (2020, 0, total_payroll, "Accrued payroll")])
        je_num += 1

        # 2. Payroll disbursement (pay accrued payroll from Cash)
        add_je(je_num, d,
               f"Payroll Disbursement {mname} 2025",
               f"PR-DISB-2025-{mnum}",
               [(2020, total_payroll, 0, "Clear accrued payroll"),
                (1000, 0, total_payroll, "Cash disbursement - payroll")])
        je_num += 1

        # 3. Overhead expenses (paid from cash - non-payroll G&A)
        oh_lines = []
        oh_total = 0
        for acct in [6020, 6030, 6040, 6050, 6060, 6070, 6080]:
            amt = monthly_overhead[acct][mi]
            if amt > 0:
                oh_lines.append((acct, amt, 0, OVERHEAD_ACCOUNTS[acct][0]))
                oh_total += amt
        oh_lines.append((1000, 0, oh_total, "Cash - overhead expenses"))

        add_je(je_num, d,
               f"G&A Overhead Expenses {mname} 2025",
               f"OH-2025-{mnum}",
               oh_lines)
        je_num += 1

        # 4. Rental income (DR Cash / CR Rental Income)
        rent = monthly_rental[mi]
        if rent > 0:
            add_je(je_num, d,
                   f"Rental Income Collection {mname} 2025",
                   f"RENT-2025-{mnum}",
                   [(1000, rent, 0, "Cash received - tenant rent"),
                    (4100, 0, rent, "Rental income - Pinnacle Bay")])
            je_num += 1

        # 5. Property management expenses (paid from cash)
        pm_lines = []
        pm_total = 0
        for acct in sorted(PROPERTY_MGMT_ACCOUNTS.keys()):
            amt = monthly_prop_mgmt[acct][mi]
            if amt > 0:
                pm_lines.append((acct, amt, 0, PROPERTY_MGMT_ACCOUNTS[acct][0]))
                pm_total += amt
        pm_lines.append((1000, 0, pm_total, "Cash - property management expenses"))

        add_je(je_num, d,
               f"Property Management Expenses {mname} 2025",
               f"PM-2025-{mnum}",
               pm_lines)
        je_num += 1

        # 6. Depreciation (quarterly - months 3, 6, 9, 12)
        if (mi + 1) % 3 == 0:
            dep = sum(monthly_depreciation[mi-2:mi+1])
            equip_dep = round(dep * 0.6, 2)
            bldg_dep = round(dep - equip_dep, 2)
            add_je(je_num, d,
                   f"Depreciation Q{(mi+1)//3} 2025",
                   f"DEP-2025-Q{(mi+1)//3}",
                   [(6100, equip_dep, 0, "Depreciation expense - equipment"),
                    (6110, bldg_dep, 0, "Depreciation expense - buildings"),
                    (1110, 0, equip_dep, "Accumulated depreciation - equipment"),
                    (1130, 0, bldg_dep, "Accumulated depreciation - buildings")])
            je_num += 1

        # 7. Interest expense (monthly mortgage + line of credit)
        interest = monthly_interest[mi]
        if interest > 0:
            mortgage_int = round(interest * 0.75, 2)
            loc_int = round(interest - mortgage_int, 2)
            add_je(je_num, d,
                   f"Interest Expense {mname} 2025",
                   f"INT-2025-{mnum}",
                   [(7000, interest, 0, "Interest expense"),
                    (1000, 0, interest, "Cash - interest payments")])
            je_num += 1

    # ── Change Order Revenue (single entry for approved COs) ──
    # Total CO revenue = $8,500,000 (recognized as Change Order Revenue)
    # This hits 4200 directly since COs are status=draft and won't auto-generate
    add_je(je_num, "2025-12-31",
           "Change Order Revenue Recognition FY2025",
           "CO-REV-2025",
           [(1030, 8500000, 0, "Costs in excess - approved change orders"),
            (4200, 0, 8500000, "Change order revenue recognized")])
    je_num += 1

    # ── Equipment costs (operations, not purchase - paid from cash) ──
    monthly_equip = monthly_direct_costs[5300]
    for mi in range(12):
        d = MONTH_ENDS[mi]
        mname = MONTH_NAMES[mi]
        mnum = MONTHS[mi]
        amt = monthly_equip[mi]
        if amt > 0:
            add_je(je_num, d,
                   f"Equipment Operations Costs {mname} 2025",
                   f"EQ-OPS-2025-{mnum}",
                   [(5300, amt, 0, "Equipment operations & fuel"),
                    (1000, 0, amt, "Cash - equipment costs")])
            je_num += 1

    # ── Subcontractor direct costs accrual (non-AP side) ──
    # These are the DR side of sub costs. The CR side (AP) comes from invoices.
    # Since we cannot touch AP (2000), we accrue to Accrued Expenses (2030) instead.
    # The invoices will handle the AP booking. This covers costs NOT in invoices.
    # Actually, we skip this - the invoices drive the full cost through gl_account.
    # The invoice auto-JE does: DR gl_account / CR AP.
    # So subcontractor costs (5000, 5010, 5020, 5030) and materials (5100-5130)
    # are already booked by the payable invoices. We don't need separate JEs.

    # Materials (5100-5130) are purchased through vendor invoices (AP), not cash JEs.
    # Direct labor (5200, 5210) and equipment ops (5300) are booked above via payroll/equip JEs.

    print(f"Generated {len(rows)} JE lines across {je_num - 1} entries")
    return rows


if __name__ == "__main__":
    invoices = generate_invoices()
    recv = sum(1 for i in invoices if i["invoice_type"] == "receivable")
    pay = sum(1 for i in invoices if i["invoice_type"] == "payable")
    ob = sum(1 for i in invoices if i["invoice_number"].startswith("INV-OB"))
    print(f"Invoices: {len(invoices)} (OB: {ob}, Receivable: {recv-4}, Payable: {pay-5})")
    print(f"  Total receivable amount: ${sum(float(i['amount']) for i in invoices if i['invoice_type'] == 'receivable'):,.0f}")
    print(f"  Total payable amount: ${sum(float(i['amount']) for i in invoices if i['invoice_type'] == 'payable'):,.0f}")

    je_rows = generate_journal_entries()
    # Count unique JEs
    je_nums = set(r["entry_number"] for r in je_rows)
    print(f"\nJournal entries: {len(je_nums)} entries, {len(je_rows)} lines")

    # Verify each JE balances
    from collections import defaultdict
    je_totals = defaultdict(lambda: [0.0, 0.0])
    for r in je_rows:
        dr = float(r["debit"]) if r["debit"] else 0
        cr = float(r["credit"]) if r["credit"] else 0
        je_totals[r["entry_number"]][0] += dr
        je_totals[r["entry_number"]][1] += cr

    all_balanced = True
    for je, (dr, cr) in je_totals.items():
        if abs(dr - cr) > 0.02:
            print(f"  UNBALANCED: {je} DR={dr:.2f} CR={cr:.2f}")
            all_balanced = False
    if all_balanced:
        print("  All JEs balance OK")
