#!/usr/bin/env python3
"""Part 8: Property management - leases, maintenance, property expenses."""

from part01_constants import *
from part02_foundation import generate_units


def generate_leases(units):
    """Generate leases for all occupied units."""
    rows = []
    occupied = [u for u in units if u["status"] == "occupied"]
    used_names = set()

    for unit in occupied:
        # Generate unique tenant
        while True:
            first, last = generate_tenant_name()
            key = f"{first} {last}"
            if key not in used_names:
                used_names.add(key)
                break

        rent = int(unit["market_rent"])
        deposit = rent  # 1 month security deposit

        # Lease start: random between Jun 2025 and Dec 2025
        start_offset = random.randint(0, 180)
        lease_start = date(2025, 6, 1) + timedelta(days=start_offset)
        lease_end = lease_start + timedelta(days=365)

        email = random_email(first, last)
        phone = random_phone()

        # Some tenants are couples
        if random.random() < 0.25:
            first2, last2 = generate_tenant_name()
            tenant_name = f"{first} & {first2} {last}"
        else:
            tenant_name = f"{first} {last}"

        rows.append({
            "tenant_name": tenant_name,
            "property_name": PROPERTY["name"],
            "unit_number": unit["unit_number"],
            "tenant_email": email,
            "tenant_phone": phone,
            "monthly_rent": str(rent),
            "security_deposit": str(deposit),
            "lease_start": lease_start.isoformat(),
            "lease_end": lease_end.isoformat(),
        })

    return rows


def generate_maintenance():
    """15 property maintenance requests."""
    items = [
        ("HVAC Filter Replacement - Building Common Areas", "Replace all HVAC filters in common area air handling units. 48 filters total across 6 AHUs.", "medium", "HVAC", "2026-01-15", "450"),
        ("Lobby Elevator #2 - Door Alignment", "Elevator car door rubbing on left side. Requires roller adjustment and track cleaning.", "high", "Elevator", "2026-01-08", "850"),
        ("Parking Level P1 - LED Light Replacement", "12 LED fixtures in Section C have failed. Replace with matching 4000K LED troffers.", "low", "Electrical", "2026-01-20", "720"),
        ("Pool Heater Annual Service", "Annual service on rooftop pool heating system. Clean heat exchanger, check gas valve, and test safety controls.", "medium", "HVAC", "2026-02-01", "1200"),
        ("Unit 1508 - Kitchen Faucet Leak", "Tenant reported dripping kitchen faucet. Cartridge replacement needed.", "high", "Plumbing", "2026-01-10", "180"),
        ("Fire Alarm Panel - Trouble Signal", "Main fire alarm panel showing ground fault trouble. Investigate and resolve before annual inspection.", "critical", "Fire Protection", "2026-01-12", "650"),
        ("Gym Equipment Maintenance", "Quarterly service on fitness center equipment. Lubricate treadmills, check cable integrity, inspect weights.", "low", "General", "2026-02-10", "380"),
        ("Roof Drain Cleaning", "Semi-annual cleaning of all roof drains and scuppers. Remove debris, check drain bodies.", "medium", "Plumbing", "2026-02-15", "520"),
        ("Unit 2205 - Bathroom Exhaust Fan", "Bathroom exhaust fan making loud noise. Motor bearing failure. Replace entire fan unit.", "medium", "HVAC", "2026-01-18", "280"),
        ("Lobby Door Closer Replacement", "Main lobby entrance door closer leaking hydraulic fluid. Replace with Norton 7500 series.", "high", "General", "2026-01-05", "340"),
        ("Unit 0912 - Garbage Disposal Jam", "Garbage disposal seized. Foreign object lodged in chamber. Clear and test or replace.", "medium", "Plumbing", "2026-01-25", "220"),
        ("Parking Garage Gate Opener", "Vehicle entry gate motor intermittent. Motor capacitor suspected. Replace motor assembly.", "high", "Electrical", "2026-02-03", "1100"),
        ("Common Area Carpet Cleaning", "Quarterly deep cleaning of all corridor carpets floors 3-33. Hot water extraction method.", "low", "General", "2026-02-20", "2800"),
        ("Unit 3301 - Window Seal Failure", "Condensation between window panes indicates seal failure. IGU replacement required.", "medium", "Envelope", "2026-01-30", "950"),
        ("Trash Compactor Service", "Annual service on loading dock trash compactor. Hydraulic fluid change and ram seal inspection.", "medium", "General", "2026-02-12", "580"),
    ]
    rows = []
    for title, desc, pri, cat, sdate, cost in items:
        rows.append({
            "title": title, "property_name": PROPERTY["name"],
            "description": desc, "priority": pri, "category": cat,
            "scheduled_date": sdate, "estimated_cost": cost,
        })
    return rows


def generate_property_expenses():
    """12 recurring property expenses."""
    expenses = [
        ("property_tax", "Annual Property Tax - Tarrant County", "1440000", "annual", "2025-01-15", "2025-12-31", "Tarrant County Tax Assessor"),
        ("insurance", "Property Insurance - All-Risk Coverage", "960000", "annual", "2025-01-01", "2025-12-31", "Marsh McLennan"),
        ("management_fee", "Property Management Fee - 3% of Gross Revenue", "100000", "monthly", "2025-01-01", "2025-12-31", "Pinnacle Pacific Builders LLC"),
        ("utilities", "Common Area Electricity", "28000", "monthly", "2025-01-01", "2025-12-31", "Oncor Electric"),
        ("utilities", "Common Area Water & Sewer", "12000", "monthly", "2025-01-01", "2025-12-31", "Fort Worth Water"),
        ("utilities", "Common Area Natural Gas", "8000", "monthly", "2025-01-01", "2025-12-31", "Atmos Energy"),
        ("cam", "Landscaping & Grounds Maintenance", "6500", "monthly", "2025-03-01", "2025-12-31", "BrightView Landscapes"),
        ("cam", "Janitorial Services - Common Areas", "15000", "monthly", "2025-01-01", "2025-12-31", "ABM Facility Services"),
        ("cam", "Pest Control Service", "2200", "monthly", "2025-01-01", "2025-12-31", "Terminix Commercial"),
        ("cam", "Security Monitoring & Patrol", "18000", "monthly", "2025-01-01", "2025-12-31", "Allied Universal"),
        ("marketing", "Leasing Marketing & Advertising", "8500", "monthly", "2025-06-01", "2025-12-31", "Apartments.com / Zillow"),
        ("legal", "Tenant Legal Services Retainer", "5000", "monthly", "2025-01-01", "2025-12-31", "Winstead PC"),
    ]
    rows = []
    for etype, desc, amt, freq, start, end, vendor in expenses:
        rows.append({
            "expense_type": etype, "description": desc, "amount": amt,
            "frequency": freq, "effective_date": start, "end_date": end,
            "vendor_name": vendor, "property_name": PROPERTY["name"],
        })
    return rows


if __name__ == "__main__":
    units = generate_units()
    leases = generate_leases(units)
    print(f"Leases: {len(leases)}")
    total_rent = sum(int(l["monthly_rent"]) for l in leases)
    print(f"  Monthly rental income: ${total_rent:,.0f}")

    maint = generate_maintenance()
    print(f"Maintenance requests: {len(maint)}")

    expenses = generate_property_expenses()
    print(f"Property expenses: {len(expenses)}")
