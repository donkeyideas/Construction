#!/usr/bin/env python3
"""Part 1: Constants, financial model, and helper functions."""

import random
import string
from datetime import date, timedelta
from collections import defaultdict

random.seed(42)

# ── Company ──
COMPANY = "Pinnacle Pacific Builders LLC"

# ── Projects ──
AIRPORT = {
    "name": "DFW Metroplex Airport Terminal 6",
    "code": "DFW-T6-2024",
    "client": "DFW Airport Board",
    "client_email": "procurement@dfwairport.gov",
    "client_phone": "972-555-0100",
    "budget": 480_000_000,
    "estimated_cost": 445_000_000,
    "start": "2024-06-01",
    "end": "2027-12-31",
    "completion": 35,
    "type": "Commercial",
    "address": "2400 Aviation Drive",
    "city": "Dallas",
    "state": "TX",
    "zip": "75261",
    "retainage_pct": 5,
}

CONDO = {
    "name": "Pinnacle Bay Condominiums",
    "code": "PBC-2023",
    "client": "Pinnacle Bay Development LLC",
    "client_email": "dev@pinnaclebay.com",
    "client_phone": "214-555-0200",
    "budget": 185_000_000,
    "estimated_cost": 172_000_000,
    "start": "2023-09-01",
    "end": "2026-06-30",
    "completion": 72,
    "type": "Residential",
    "address": "8800 Pinnacle Bay Boulevard",
    "city": "Fort Worth",
    "state": "TX",
    "zip": "76102",
    "retainage_pct": 10,
}

PROPERTY = {
    "name": "Pinnacle Bay Condominiums",
    "property_type": "residential",
    "address_line1": "8800 Pinnacle Bay Boulevard",
    "city": "Fort Worth",
    "state": "TX",
    "zip": "76102",
    "year_built": 2024,
    "total_sqft": 520000,
    "total_units": 500,
    "purchase_price": 45000000,
    "current_value": 185000000,
}

# ── Months ──
MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"]
MONTH_ENDS = [
    "2025-01-31","2025-02-28","2025-03-31","2025-04-30",
    "2025-05-31","2025-06-30","2025-07-31","2025-08-31",
    "2025-09-30","2025-10-31","2025-11-30","2025-12-31",
]
MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
]

# ── Revenue targets (2025) ──
AIRPORT_MONTHLY_REV = [
    16500000,16800000,17200000,17500000,16800000,16200000,
    15800000,16500000,17000000,16200000,15800000,15700000,
]  # Total: 198,000,000

CONDO_MONTHLY_REV = [
    5800000,5600000,5400000,5200000,4800000,4500000,
    4200000,3800000,3600000,3200000,800000,800000,
]  # Total: 47,700,000

# Rental income (ramps up as units lease)
RENTAL_MONTHLY = [
    650000,680000,720000,760000,800000,840000,
    880000,920000,950000,980000,1010000,1010000,
]  # Total: 10,200,000

TOTAL_REVENUE = 198000000 + 47700000 + 10200000 + 8500000  # 264,400,000

# ── Cost model ──
DIRECT_COST_ACCOUNTS = {
    5000: ("Subcontractor Costs - Structural", 98000000),
    5010: ("Subcontractor Costs - MEP", 42000000),
    5020: ("Subcontractor Costs - Concrete", 28000000),
    5030: ("Subcontractor Costs - Steel & Metals", 18000000),
    5100: ("Materials - Concrete & Aggregate", 12000000),
    5110: ("Materials - Steel & Rebar", 8500000),
    5120: ("Materials - Lumber & Framing", 3200000),
    5130: ("Materials - Electrical & Plumbing", 4800000),
    5200: ("Direct Labor - Field", 6500000),
    5210: ("Direct Labor - Payroll Taxes", 1300000),
    5300: ("Equipment Operations", 2700000),
}
TOTAL_DIRECT = sum(v[1] for v in DIRECT_COST_ACCOUNTS.values())  # 225,000,000

PROPERTY_MGMT_ACCOUNTS = {
    6200: ("Property Management Fees", 1200000),
    6210: ("Property Insurance", 960000),
    6220: ("Property Taxes", 1440000),
    6230: ("Utilities - Common Areas", 720000),
    6240: ("Repairs & Maintenance - Property", 480000),
}
TOTAL_PROP_MGMT = sum(v[1] for v in PROPERTY_MGMT_ACCOUNTS.values())  # 4,800,000

OVERHEAD_ACCOUNTS = {
    6000: ("Officer & Admin Salaries", 5400000),
    6010: ("G&A Payroll Taxes & Benefits", 1620000),
    6020: ("Office Rent & Utilities", 1080000),
    6030: ("Professional Services", 2400000),
    6040: ("Insurance - General Liability", 3600000),
    6050: ("IT & Software", 960000),
    6060: ("Marketing & Business Dev", 540000),
    6070: ("Travel & Entertainment", 360000),
    6080: ("Bonds & Surety", 2240000),
}
TOTAL_OVERHEAD = sum(v[1] for v in OVERHEAD_ACCOUNTS.values())  # 18,200,000

DEPRECIATION = 2400000
INTEREST_EXPENSE = 4800000
NET_INCOME = TOTAL_REVENUE - TOTAL_DIRECT - TOTAL_PROP_MGMT - TOTAL_OVERHEAD - DEPRECIATION - INTEREST_EXPENSE

# ── Opening Balance (1/1/2025) ──
# Positive = debit balance, Negative = credit balance
OB = {
    1000: 28500000,      # Cash & Equivalents
    1030: 6200000,       # Costs in Excess of Billings
    1040: 3800000,       # Prepaid Expenses
    1050: 850000,        # Rent Receivable
    1100: 22400000,      # Equipment & Vehicles
    1110: -4800000,      # Accumulated Depreciation - Equipment
    1120: 145000000,     # Buildings & Improvements
    1130: -8200000,      # Accumulated Depreciation - Buildings
    1200: 32000000,      # Land
    1300: 1800000,       # Security Deposits - Held
    2020: -3600000,      # Accrued Payroll
    2030: -4800000,      # Accrued Expenses
    2050: -2400000,      # Sales Tax Payable
    2060: -1200000,      # Deferred Rental Revenue
    2100: -4200000,      # Equipment Financing
    2200: -18000000,     # Construction Line of Credit
    2210: -95000000,     # Mortgage Payable
    3000: -85000000,     # Owners Capital
    3010: -13350000,     # Retained Earnings
}

# Verify OB balances (should be 0)
_ob_total = sum(OB.values())
assert abs(_ob_total) < 1, f"OB does not balance: {_ob_total}"


# ── Helpers ──
def fmt(amount):
    """Format amount for CSV. Empty string if zero."""
    if amount == 0 or amount == "":
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


def random_phone():
    a = random.randint(200, 999)
    b = random.randint(200, 999)
    c = random.randint(1000, 9999)
    return f"{a}-{b}-{c}"


def random_email(first, last, domain=None):
    if not domain:
        domains = ["gmail.com","outlook.com","yahoo.com","hotmail.com","icloud.com"]
        domain = random.choice(domains)
    return f"{first.lower()}.{last.lower()}@{domain}"


# Name pools for tenant generation
FIRST_NAMES = [
    "James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda",
    "David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica",
    "Thomas","Sarah","Christopher","Karen","Charles","Lisa","Daniel","Nancy",
    "Matthew","Betty","Anthony","Margaret","Mark","Sandra","Donald","Ashley",
    "Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle",
    "Kenneth","Carol","Kevin","Amanda","Brian","Dorothy","George","Melissa",
    "Timothy","Deborah","Ronald","Stephanie","Edward","Rebecca","Jason","Sharon",
    "Jeffrey","Laura","Ryan","Cynthia","Jacob","Kathleen","Gary","Amy",
    "Nicholas","Angela","Eric","Shirley","Jonathan","Anna","Stephen","Brenda",
    "Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
    "Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra",
    "Frank","Rachel","Alexander","Carolyn","Patrick","Janet","Jack","Catherine",
    "Dennis","Maria","Jerry","Heather","Tyler","Diane","Aaron","Ruth",
    "Jose","Julie","Nathan","Olivia","Henry","Joyce","Douglas","Virginia",
    "Peter","Victoria","Zachary","Kelly","Kyle","Lauren","Noah","Christina",
    "Ethan","Joan","Jeremy","Evelyn","Walter","Judith","Christian","Megan",
    "Keith","Andrea","Roger","Cheryl","Terry","Hannah","Harry","Jacqueline",
    "Ralph","Martha","Sean","Gloria","Jesse","Teresa","Austin","Ann",
    "Dylan","Sara","Arthur","Madison","Lawrence","Frances","Albert","Kathryn",
    "Bryan","Janice","Joe","Jean","Jordan","Abigail","Billy","Alice",
    "Bruce","Judy","Gabriel","Sophia","Logan","Grace","Carl","Denise",
    "Roy","Amber","Eugene","Doris","Russell","Marilyn","Philip","Danielle",
    "Wayne","Beverly","Alan","Isabella","Juan","Theresa","Louis","Diana",
    "Randy","Natalie","Vincent","Brittany","Liam","Charlotte","Mason","Marie",
    "Elijah","Kayla","Aiden","Alexis","Lucas","Lori",
]

LAST_NAMES = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
    "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
    "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
    "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
    "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill",
    "Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell",
    "Mitchell","Carter","Roberts","Gomez","Phillips","Evans","Turner","Diaz",
    "Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morales",
    "Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper","Peterson",
    "Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward",
    "Richardson","Watson","Brooks","Chavez","Wood","James","Bennett","Gray",
    "Mendoza","Ruiz","Hughes","Price","Alvarez","Castillo","Sanders","Patel",
    "Myers","Long","Ross","Foster","Jimenez","Powell","Jenkins","Perry",
    "Russell","Sullivan","Bell","Coleman","Butler","Henderson","Barnes","Gonzales",
    "Fisher","Vasquez","Simmons","Griffin","Aguilar","Morton","Hamilton","Graham",
    "Wallace","Woods","Cole","West","Jordan","Owens","Reynolds","Ellis",
    "Harrison","Gibson","McDonald","Alexander","Marshall","Ortega","Delgado","Burke",
]


def generate_tenant_name():
    """Generate a random tenant name."""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    return first, last


print(f"Constants loaded. Net Income target: ${NET_INCOME:,.0f}")
print(f"Revenue: ${TOTAL_REVENUE:,.0f}")
print(f"Direct costs: ${TOTAL_DIRECT:,.0f}")
print(f"Property mgmt: ${TOTAL_PROP_MGMT:,.0f}")
print(f"Overhead: ${TOTAL_OVERHEAD:,.0f}")
print(f"Depreciation: ${DEPRECIATION:,.0f}")
print(f"Interest: ${INTEREST_EXPENSE:,.0f}")
