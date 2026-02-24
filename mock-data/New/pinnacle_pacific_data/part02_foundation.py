#!/usr/bin/env python3
"""Part 2: Foundation sheets - COA, bank accounts, properties, units."""

from part01_constants import *


def generate_chart_of_accounts():
    rows = []
    def add(num, name, atype, sub, desc=""):
        rows.append({
            "account_number": str(num),
            "name": name,
            "account_type": atype,
            "sub_type": sub,
            "description": desc,
        })

    # Assets
    add(1000, "Cash & Equivalents", "asset", "Current Asset", "Operating cash and short-term deposits")
    add(1010, "Accounts Receivable", "asset", "Current Asset", "Amounts owed by clients for completed work")
    add(1020, "Retainage Receivable", "asset", "Current Asset", "Retainage withheld by owners on progress billings")
    add(1030, "Costs in Excess of Billings", "asset", "Current Asset", "Under-billed construction costs")
    add(1040, "Prepaid Expenses", "asset", "Current Asset", "Insurance premiums and prepaid items")
    add(1050, "Rent Receivable", "asset", "Current Asset", "Tenant rent amounts due")
    add(1100, "Equipment & Vehicles", "asset", "Fixed Asset", "Construction equipment and company vehicles")
    add(1110, "Accumulated Depreciation - Equipment", "asset", "Fixed Asset", "Contra asset for equipment depreciation")
    add(1120, "Buildings & Improvements", "asset", "Fixed Asset", "Owned buildings and tenant improvements")
    add(1130, "Accumulated Depreciation - Buildings", "asset", "Fixed Asset", "Contra asset for building depreciation")
    add(1200, "Land", "asset", "Fixed Asset", "Land held for development or operations")
    add(1300, "Security Deposits - Held", "asset", "Other Asset", "Tenant security deposits held in escrow")

    # Liabilities
    add(2000, "Accounts Payable", "liability", "Current Liability", "Amounts owed to subcontractors and vendors")
    add(2010, "Retainage Payable", "liability", "Current Liability", "Retainage withheld from subcontractors")
    add(2020, "Accrued Payroll", "liability", "Current Liability", "Wages and salaries earned but not yet paid")
    add(2030, "Accrued Expenses", "liability", "Current Liability", "Other accrued liabilities")
    add(2040, "Billings in Excess of Costs", "liability", "Current Liability", "Over-billed construction revenue")
    add(2050, "Sales Tax Payable", "liability", "Current Liability", "Sales and use tax collected pending remittance")
    add(2055, "Sales Tax Receivable", "asset", "Current Asset", "Input tax credits recoverable from vendors")
    add(2060, "Deferred Rental Revenue", "liability", "Current Liability", "Prepaid rent from tenants")
    add(2070, "Tenant Security Deposits Liability", "liability", "Current Liability", "Security deposits owed back to tenants")
    add(2100, "Equipment Financing", "liability", "Long-Term Liability", "Loans on equipment purchases")
    add(2200, "Construction Line of Credit", "liability", "Long-Term Liability", "Revolving credit facility for construction")
    add(2210, "Mortgage Payable", "liability", "Long-Term Liability", "Mortgage on Pinnacle Bay property")

    # Equity
    add(3000, "Owners Capital", "equity", "Equity", "Partner capital contributions")
    add(3010, "Retained Earnings", "equity", "Equity", "Accumulated net income from prior years")

    # Revenue
    add(4000, "Contract Revenue - Airport", "revenue", "Operating Revenue", "Revenue from DFW Terminal 6 construction")
    add(4010, "Contract Revenue - Condo Construction", "revenue", "Operating Revenue", "Revenue from Pinnacle Bay construction")
    add(4100, "Rental Income", "revenue", "Operating Revenue", "Monthly rental income from leased units")
    add(4110, "Late Fee Revenue", "revenue", "Other Revenue", "Late payment fees charged to tenants")
    add(4200, "Change Order Revenue", "revenue", "Operating Revenue", "Approved change order billings")

    # Direct Costs
    for acct, (name, _) in sorted(DIRECT_COST_ACCOUNTS.items()):
        add(acct, name, "expense", "Direct Cost", f"Direct construction cost - {name}")

    # Property Management Expenses
    for acct, (name, _) in sorted(PROPERTY_MGMT_ACCOUNTS.items()):
        add(acct, name, "expense", "Operating Expense", f"Property management - {name}")

    # Overhead / G&A
    for acct, (name, _) in sorted(OVERHEAD_ACCOUNTS.items()):
        add(acct, name, "expense", "Operating Expense", f"General & administrative - {name}")

    # Depreciation
    add(6100, "Depreciation Expense - Equipment", "expense", "Operating Expense", "Monthly depreciation of equipment and vehicles")
    add(6110, "Depreciation Expense - Buildings", "expense", "Operating Expense", "Monthly depreciation of buildings")

    # Other Expense
    add(7000, "Interest Expense", "expense", "Other Expense", "Interest on debt and credit facilities")
    add(7010, "Financing Costs", "expense", "Other Expense", "Loan origination fees and financing charges")

    return rows


def generate_bank_accounts():
    return [
        {"name": "General Operating", "bank_name": "JPMorgan Chase", "account_type": "checking",
         "account_number_last4": "4821", "routing_number_last4": "6712", "current_balance": "12500000"},
        {"name": "Payroll Account", "bank_name": "JPMorgan Chase", "account_type": "checking",
         "account_number_last4": "4822", "routing_number_last4": "6712", "current_balance": "2800000"},
        {"name": "Project Escrow - DFW T6", "bank_name": "Wells Fargo", "account_type": "checking",
         "account_number_last4": "7391", "routing_number_last4": "8845", "current_balance": "8200000"},
        {"name": "Project Escrow - Pinnacle Bay", "bank_name": "Wells Fargo", "account_type": "checking",
         "account_number_last4": "7392", "routing_number_last4": "8845", "current_balance": "3500000"},
        {"name": "Equipment Reserve", "bank_name": "JPMorgan Chase", "account_type": "savings",
         "account_number_last4": "4830", "routing_number_last4": "6712", "current_balance": "1200000"},
        {"name": "Property Management", "bank_name": "Bank of America", "account_type": "checking",
         "account_number_last4": "9155", "routing_number_last4": "3201", "current_balance": "950000"},
    ]


def generate_properties():
    return [{
        "name": PROPERTY["name"],
        "property_type": PROPERTY["property_type"],
        "address_line1": PROPERTY["address_line1"],
        "city": PROPERTY["city"],
        "state": PROPERTY["state"],
        "zip": PROPERTY["zip"],
        "year_built": str(PROPERTY["year_built"]),
        "total_sqft": str(PROPERTY["total_sqft"]),
        "total_units": str(PROPERTY["total_units"]),
        "purchase_price": str(PROPERTY["purchase_price"]),
        "current_value": str(PROPERTY["current_value"]),
    }]


def generate_units():
    """Generate 500 condo units across floors 3-44."""
    units = []
    unit_count = 0

    # Floor plan: floors 3-12 (10 floors, 16 units each = 160)
    #             floors 13-28 (16 floors, 14 units each = 224)
    #             floors 29-40 (12 floors, 8 units each = 96)
    #             floors 41-44 (4 floors, 5 units each = 20)
    # Total: 160 + 224 + 96 + 20 = 500

    floor_plans = [
        # (floor_range, units_per_floor, unit_configs)
        # unit_configs: [(unit_type, bedrooms, bathrooms, sqft, market_rent, count_per_floor)]
        (range(3, 13), [
            ("studio", 0, 1, 520, 1850, 4),
            ("1br", 1, 1, 740, 2400, 8),
            ("2br", 2, 1, 980, 3100, 4),
        ]),
        (range(13, 29), [
            ("1br", 1, 1, 790, 2800, 4),
            ("2br", 2, 2, 1100, 3600, 6),
            ("3br", 3, 2, 1400, 4500, 4),
        ]),
        (range(29, 41), [
            ("2br", 2, 2, 1250, 4200, 3),
            ("3br", 3, 2, 1550, 5400, 3),
            ("penthouse", 3, 3, 2100, 7500, 2),
        ]),
        (range(41, 45), [
            ("penthouse", 4, 3, 2800, 10500, 3),
            ("penthouse", 4, 4, 3500, 14000, 2),
        ]),
    ]

    # Floors 3-33 are delivered (31 floors)
    delivered_max_floor = 33

    for floor_range, configs in floor_plans:
        for floor in floor_range:
            unit_idx = 1
            for utype, beds, baths, base_sqft, base_rent, count in configs:
                for _ in range(count):
                    sqft = base_sqft + random.randint(-30, 30)
                    rent = base_rent + random.randint(-100, 100)
                    unit_num = f"{floor:02d}{unit_idx:02d}"

                    if floor <= delivered_max_floor:
                        # 85% of delivered units are occupied
                        status = "occupied" if random.random() < 0.85 else "vacant"
                    else:
                        status = "not_ready"

                    units.append({
                        "property_name": PROPERTY["name"],
                        "unit_number": unit_num,
                        "unit_type": utype,
                        "sqft": str(sqft),
                        "bedrooms": str(beds),
                        "bathrooms": str(baths),
                        "floor_number": str(floor),
                        "market_rent": str(rent),
                        "status": status,
                    })
                    unit_idx += 1
                    unit_count += 1

    print(f"Generated {unit_count} units")
    occupied = sum(1 for u in units if u["status"] == "occupied")
    print(f"  Occupied: {occupied}, Vacant: {sum(1 for u in units if u['status'] == 'vacant')}, Not ready: {sum(1 for u in units if u['status'] == 'not_ready')}")
    return units


if __name__ == "__main__":
    coa = generate_chart_of_accounts()
    print(f"\nCOA: {len(coa)} accounts")

    banks = generate_bank_accounts()
    print(f"Bank accounts: {len(banks)}")

    props = generate_properties()
    print(f"Properties: {len(props)}")

    units = generate_units()
