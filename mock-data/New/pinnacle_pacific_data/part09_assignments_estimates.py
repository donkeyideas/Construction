#!/usr/bin/env python3
"""Part 9: Equipment assignments and estimates."""

from part01_constants import *


def generate_equipment_assignments():
    """Generate equipment assignments across both projects."""
    assignments = [
        # Airport project - heavy equipment
        ("Liebherr LTM 1300 Mobile Crane", AIRPORT["name"], "2024-10-01", "", "Steel erection and heavy lifts - Terminal 6 concourse", "active"),
        ("Liebherr 630 EC-H Tower Crane", AIRPORT["name"], "2024-08-15", "", "Main tower crane - Terminal 6 superstructure", "active"),
        ("CAT 390F Hydraulic Excavator", AIRPORT["name"], "2024-06-15", "", "Deep excavation and utility trenching", "active"),
        ("Komatsu PC490LC Excavator", AIRPORT["name"], "2024-07-01", "2025-04-30", "Foundation excavation - returned after substructure complete", "returned"),
        ("CAT 980M Wheel Loader", AIRPORT["name"], "2024-06-20", "", "Material handling and stockpile management", "active"),
        ("CAT D8T Dozer", AIRPORT["name"], "2024-06-01", "2025-01-15", "Mass grading - returned after site prep complete", "returned"),
        ("Putzmeister BSF 47-5.16H Concrete Pump", AIRPORT["name"], "2025-01-10", "", "Elevated slab concrete placement", "active"),
        ("Kobelco CK2750G-2 Crawler Crane", AIRPORT["name"], "2025-03-01", "", "Structural steel and heavy precast erection", "active"),
        ("Manitowoc MLC300 Lattice Crawler", AIRPORT["name"], "2024-09-01", "", "Deep foundation pile driving and heavy lifts", "active"),
        ("Potain MCT 565 Tower Crane", AIRPORT["name"], "2025-06-01", "", "Concourse roof truss installation", "active"),
        ("JLG 1850SJ Telescopic Boom Lift", AIRPORT["name"], "2025-08-01", "", "High-reach work - curtain wall and steel connections", "active"),
        ("Genie S-85 XC Boom Lift", AIRPORT["name"], "2025-10-01", "", "MEP rough-in and overhead work", "active"),
        ("CAT 140 Motor Grader", AIRPORT["name"], "2024-06-05", "2024-12-20", "Subgrade grading - returned after earthwork complete", "returned"),
        ("Hamm H 20i Compactor", AIRPORT["name"], "2024-06-05", "2025-02-28", "Subbase compaction - returned after paving prep", "returned"),
        ("Kenworth T880 Dump Truck", AIRPORT["name"], "2024-06-01", "2025-03-15", "Earthwork hauling - returned after bulk excavation", "returned"),
        # Condo project
        ("CAT 336 Next Gen Excavator", CONDO["name"], "2023-09-15", "2024-06-30", "Parking garage excavation - returned", "returned"),
        ("CAT 966M Wheel Loader", CONDO["name"], "2023-10-01", "2024-12-31", "Material handling during tower construction - returned", "returned"),
        ("Schwing S 43 SX Concrete Pump", CONDO["name"], "2024-03-01", "2025-06-30", "Tower core and slab concrete placement - returned", "returned"),
        ("Genie GS-4069 Scissor Lift", CONDO["name"], "2025-03-01", "", "Interior fit-out and ceiling work", "active"),
        ("Skyjack SJ9263 RT Scissor Lift", CONDO["name"], "2025-04-15", "", "MEP overhead work on lower floors", "active"),
        ("John Deere 850L Dozer", CONDO["name"], "2023-09-01", "2024-02-28", "Site grading - returned after excavation", "returned"),
        # Vehicles shared across projects
        ("Ford F-350 Super Duty", AIRPORT["name"], "2024-06-01", "", "Superintendent vehicle - airport site", "active"),
        ("Ford F-250 Super Duty", CONDO["name"], "2023-09-01", "", "Superintendent vehicle - condo site", "active"),
        ("Volvo A40G Articulated Hauler", AIRPORT["name"], "2024-06-10", "2025-06-30", "Material hauling - returned after bulk earthwork", "returned"),
        ("Mack Granite GR64F Mixer", AIRPORT["name"], "2025-01-15", "", "On-site concrete mixing for small pours", "active"),
    ]

    rows = []
    for equip, proj, assigned, returned, notes, status in assignments:
        rows.append({
            "equipment_name": equip,
            "project_name": proj,
            "assigned_date": assigned,
            "return_date": returned,
            "notes": notes,
            "status": status,
        })
    return rows


def generate_estimates():
    """Generate estimates for both projects and pipeline opportunities."""
    estimates = [
        # Airport - active estimates
        ("EST-DFW-001", "T6 Structural Steel Package", "Complete structural steel fabrication and erection for Terminal 6 concourse, gates, and canopy", "approved", "68000000", "78200000", "15", "8", "7", AIRPORT["name"]),
        ("EST-DFW-002", "T6 MEP Systems Package", "Mechanical, electrical, and plumbing systems for entire Terminal 6 complex", "approved", "78000000", "93600000", "20", "10", "10", AIRPORT["name"]),
        ("EST-DFW-003", "T6 Curtain Wall & Glazing", "Full building envelope including curtain wall, storefront, and skylights", "approved", "42000000", "50400000", "20", "10", "10", AIRPORT["name"]),
        ("EST-DFW-004", "T6 Baggage Handling System", "Automated baggage handling including conveyors, sorting, and screening integration", "in_review", "35000000", "42000000", "20", "10", "10", AIRPORT["name"]),
        ("EST-DFW-005", "T6 People Mover System", "Automated people mover guideway, vehicles, and stations", "in_review", "22000000", "28600000", "30", "15", "15", AIRPORT["name"]),
        ("EST-DFW-006", "T6 Interior Finishes Package", "Flooring, ceiling, millwork, and specialty finishes throughout terminal", "draft", "18000000", "22500000", "25", "12", "13", AIRPORT["name"]),
        # Condo - active estimates
        ("EST-PBC-001", "PBC Tower Structure", "Cast-in-place concrete tower core and post-tensioned floor slabs floors 3-44", "approved", "38000000", "45600000", "20", "10", "10", CONDO["name"]),
        ("EST-PBC-002", "PBC MEP Package", "Complete mechanical, electrical, plumbing, and fire protection for 500 units + common areas", "approved", "24000000", "30000000", "25", "12", "13", CONDO["name"]),
        ("EST-PBC-003", "PBC Interior Fit-Out", "Unit interiors including drywall, paint, flooring, cabinetry, and fixtures for all 500 units", "approved", "22000000", "28600000", "30", "15", "15", CONDO["name"]),
        ("EST-PBC-004", "PBC Window Wall System", "High-performance window wall system for 42-story tower including penthouse custom glazing", "approved", "16000000", "19200000", "20", "10", "10", CONDO["name"]),
        ("EST-PBC-005", "PBC Rooftop Amenities", "Pool, outdoor kitchen, fire pit, lounge areas, and landscaping on amenity deck", "in_review", "4500000", "5850000", "30", "15", "15", CONDO["name"]),
        # Pipeline estimates (for opportunities)
        ("EST-PIPE-001", "DFW Cargo Terminal - Structural", "Steel structure for 200,000 SF cargo facility with cold chain wing", "draft", "32000000", "40000000", "25", "12", "13", ""),
        ("EST-PIPE-002", "DFW Cargo Terminal - MEP", "HVAC, electrical, fire protection for cargo facility including cold chain refrigeration", "draft", "28000000", "35000000", "25", "12", "13", ""),
        ("EST-PIPE-003", "Frisco Medical Campus - Building A", "3-story medical office building with specialty clinic fit-out", "in_review", "12000000", "15000000", "25", "12", "13", ""),
        ("EST-PIPE-004", "Frisco Medical Campus - Central Plant", "Central energy plant serving 3-building campus", "draft", "8500000", "10625000", "25", "12", "13", ""),
        ("EST-PIPE-005", "Plano Mixed-Use Tower - Structure", "28-story post-tensioned concrete tower with 3-level podium", "draft", "22000000", "28600000", "30", "15", "15", ""),
        ("EST-PIPE-006", "Plano Mixed-Use - Unit Interiors", "380 residential units fit-out with premium finishes package", "draft", "15000000", "19500000", "30", "15", "15", ""),
        ("EST-PIPE-007", "Convention Center - Historic Renovation", "Selective demolition and restoration of existing convention center", "draft", "35000000", "45500000", "30", "15", "15", ""),
        ("EST-PIPE-008", "Arlington ISD - School Complex", "K-12 campus with 3 buildings including athletic facilities", "draft", "18000000", "23400000", "30", "15", "15", ""),
    ]

    rows = []
    for est_num, title, desc, status, cost, price, margin, oh, profit, proj in estimates:
        rows.append({
            "estimate_number": est_num,
            "title": title,
            "description": desc,
            "status": status,
            "total_cost": cost,
            "total_price": price,
            "margin_pct": margin,
            "overhead_pct": oh,
            "profit_pct": profit,
            "project_name": proj,
        })
    return rows


if __name__ == "__main__":
    assignments = generate_equipment_assignments()
    active = sum(1 for a in assignments if a["status"] == "active")
    returned = sum(1 for a in assignments if a["status"] == "returned")
    print(f"Equipment assignments: {len(assignments)} (Active: {active}, Returned: {returned})")

    estimates = generate_estimates()
    by_status = {}
    for e in estimates:
        by_status[e["status"]] = by_status.get(e["status"], 0) + 1
    print(f"Estimates: {len(estimates)} ({by_status})")
    total_price = sum(float(e["total_price"]) for e in estimates)
    print(f"  Total estimated price: ${total_price:,.0f}")
