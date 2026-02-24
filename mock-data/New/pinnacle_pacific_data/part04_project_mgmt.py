#!/usr/bin/env python3
"""Part 4: Project management - phases, tasks, contracts, opportunities, bids."""

from part01_constants import *


def generate_phases():
    rows = []
    # Airport phases
    airport_phases = [
        ("Site Preparation & Demolition", "#ef4444", "2024-06-01", "2024-12-31"),
        ("Deep Foundations & Piling", "#f97316", "2024-09-01", "2025-06-30"),
        ("Substructure & Grade Beams", "#f59e0b", "2025-01-01", "2025-09-30"),
        ("Structural Steel Erection", "#eab308", "2025-03-01", "2026-03-31"),
        ("Concrete Superstructure", "#84cc16", "2025-04-01", "2026-06-30"),
        ("Building Envelope & Curtain Wall", "#22c55e", "2025-09-01", "2026-09-30"),
        ("MEP Rough-In", "#14b8a6", "2025-10-01", "2026-12-31"),
        ("Interior Finishes & Millwork", "#06b6d4", "2026-03-01", "2027-03-31"),
        ("Baggage Handling System", "#3b82f6", "2026-04-01", "2027-06-30"),
        ("People Mover & Vertical Transport", "#6366f1", "2026-06-01", "2027-08-31"),
        ("Systems Commissioning & Testing", "#8b5cf6", "2027-04-01", "2027-11-30"),
        ("Punch List & Closeout", "#a855f7", "2027-09-01", "2027-12-31"),
    ]
    for name, color, start, end in airport_phases:
        rows.append({
            "name": name, "color": color, "start_date": start, "end_date": end,
            "project_name": AIRPORT["name"],
        })

    # Condo phases
    condo_phases = [
        ("Excavation & Shoring", "#ef4444", "2023-09-01", "2024-03-31"),
        ("Foundation & Podium Structure", "#f97316", "2024-01-01", "2024-09-30"),
        ("Tower Core & Structure", "#f59e0b", "2024-06-01", "2025-06-30"),
        ("Building Envelope", "#22c55e", "2024-12-01", "2025-09-30"),
        ("MEP Systems", "#14b8a6", "2025-01-01", "2025-12-31"),
        ("Interior Build-Out Floors 3-20", "#3b82f6", "2025-03-01", "2025-10-31"),
        ("Interior Build-Out Floors 21-44", "#6366f1", "2025-06-01", "2026-03-31"),
        ("Amenities, Landscaping & Closeout", "#a855f7", "2025-10-01", "2026-06-30"),
    ]
    for name, color, start, end in condo_phases:
        rows.append({
            "name": name, "color": color, "start_date": start, "end_date": end,
            "project_name": CONDO["name"],
        })

    return rows


def generate_tasks():
    rows = []

    # Airport tasks
    airport_tasks = [
        # Site Prep
        ("Existing terminal demolition", "Site Preparation & Demolition", "critical", "2024-06-01", "2024-08-15", 100, False, True),
        ("Utility relocation", "Site Preparation & Demolition", "high", "2024-06-15", "2024-10-31", 100, False, True),
        ("Temporary taxiway construction", "Site Preparation & Demolition", "high", "2024-07-01", "2024-09-30", 100, False, False),
        ("Environmental remediation", "Site Preparation & Demolition", "medium", "2024-08-01", "2024-12-31", 100, False, False),
        ("Mass grading complete", "Site Preparation & Demolition", "critical", "2024-12-31", "2024-12-31", 100, True, True),
        # Deep Foundations
        ("Auger cast pile installation - Zone A", "Deep Foundations & Piling", "critical", "2024-09-01", "2025-01-31", 100, False, True),
        ("Auger cast pile installation - Zone B", "Deep Foundations & Piling", "high", "2024-11-01", "2025-03-31", 100, False, False),
        ("Driven pile installation - People Mover", "Deep Foundations & Piling", "high", "2025-01-01", "2025-04-30", 85, False, False),
        ("Pile load testing complete", "Deep Foundations & Piling", "critical", "2025-06-30", "2025-06-30", 60, True, True),
        # Substructure
        ("Foundation mat pour - Gate Area A", "Substructure & Grade Beams", "critical", "2025-01-01", "2025-04-30", 90, False, True),
        ("Foundation mat pour - Gate Area B", "Substructure & Grade Beams", "high", "2025-03-01", "2025-06-30", 70, False, False),
        ("Grade beams and pile caps", "Substructure & Grade Beams", "high", "2025-02-01", "2025-07-31", 65, False, True),
        ("Underground utilities rough-in", "Substructure & Grade Beams", "medium", "2025-04-01", "2025-08-31", 45, False, False),
        ("Waterproofing and drainage", "Substructure & Grade Beams", "medium", "2025-05-01", "2025-09-30", 35, False, False),
        # Structural Steel
        ("Steel fabrication submittal approval", "Structural Steel Erection", "critical", "2025-03-01", "2025-05-31", 100, True, True),
        ("Column erection - concourse spine", "Structural Steel Erection", "critical", "2025-06-01", "2025-10-31", 50, False, True),
        ("Roof truss installation - main terminal", "Structural Steel Erection", "high", "2025-08-01", "2025-12-31", 25, False, True),
        ("Canopy steel - curbside", "Structural Steel Erection", "medium", "2025-10-01", "2026-02-28", 10, False, False),
        ("Steel erection complete", "Structural Steel Erection", "critical", "2026-03-31", "2026-03-31", 0, True, True),
        # Concrete Superstructure
        ("Elevated slab pours - Level 2", "Concrete Superstructure", "critical", "2025-04-01", "2025-09-30", 55, False, True),
        ("Elevated slab pours - Level 3", "Concrete Superstructure", "high", "2025-07-01", "2025-12-31", 30, False, False),
        ("Apron & taxiway pavement", "Concrete Superstructure", "high", "2025-10-01", "2026-04-30", 10, False, False),
        ("Concourse elevated walkway", "Concrete Superstructure", "medium", "2026-01-01", "2026-06-30", 0, False, False),
        # Envelope
        ("Curtain wall mock-up approved", "Building Envelope & Curtain Wall", "critical", "2025-09-01", "2025-11-30", 15, True, True),
        ("Curtain wall installation - East", "Building Envelope & Curtain Wall", "high", "2025-12-01", "2026-05-31", 0, False, False),
        ("Curtain wall installation - West", "Building Envelope & Curtain Wall", "high", "2026-02-01", "2026-07-31", 0, False, False),
        ("Roof membrane and insulation", "Building Envelope & Curtain Wall", "medium", "2026-04-01", "2026-09-30", 0, False, False),
        # MEP
        ("Main electrical distribution", "MEP Rough-In", "critical", "2025-10-01", "2026-04-30", 5, False, True),
        ("HVAC ductwork - terminal", "MEP Rough-In", "high", "2025-12-01", "2026-06-30", 0, False, False),
        ("Fire suppression rough-in", "MEP Rough-In", "high", "2026-01-01", "2026-08-31", 0, False, False),
        ("Plumbing rough-in", "MEP Rough-In", "medium", "2026-02-01", "2026-09-30", 0, False, False),
        # Future tasks (0% complete)
        ("Interior framing - gate areas", "Interior Finishes & Millwork", "high", "2026-03-01", "2026-09-30", 0, False, False),
        ("Flooring installation", "Interior Finishes & Millwork", "medium", "2026-06-01", "2027-01-31", 0, False, False),
        ("Baggage system installation", "Baggage Handling System", "critical", "2026-04-01", "2027-03-31", 0, False, True),
        ("People mover guideway", "People Mover & Vertical Transport", "critical", "2026-06-01", "2027-06-30", 0, False, True),
        ("Elevator & escalator installation", "People Mover & Vertical Transport", "high", "2026-08-01", "2027-04-30", 0, False, False),
        ("Full systems commissioning", "Systems Commissioning & Testing", "critical", "2027-04-01", "2027-10-31", 0, False, True),
        ("FAA certification inspection", "Systems Commissioning & Testing", "critical", "2027-10-31", "2027-10-31", 0, True, True),
        ("Substantial completion", "Punch List & Closeout", "critical", "2027-12-01", "2027-12-01", 0, True, True),
    ]
    for name, phase, pri, start, end, pct, mile, crit in airport_tasks:
        rows.append({
            "name": name, "phase_name": phase, "priority": pri,
            "start_date": start, "end_date": end, "completion_pct": str(pct),
            "is_milestone": str(mile).lower(), "is_critical_path": str(crit).lower(),
            "project_name": AIRPORT["name"],
        })

    # Condo tasks
    condo_tasks = [
        ("Shoring wall installation", "Excavation & Shoring", "critical", "2023-09-01", "2023-12-31", 100, False, True),
        ("Bulk excavation - 3 levels", "Excavation & Shoring", "critical", "2023-10-01", "2024-02-28", 100, False, True),
        ("Dewatering system", "Excavation & Shoring", "high", "2023-09-15", "2024-03-31", 100, False, False),
        ("Mat foundation pour", "Foundation & Podium Structure", "critical", "2024-01-15", "2024-04-30", 100, False, True),
        ("Podium structure floors 1-2", "Foundation & Podium Structure", "high", "2024-03-01", "2024-07-31", 100, False, True),
        ("Parking garage structure P1-P3", "Foundation & Podium Structure", "high", "2024-04-01", "2024-09-30", 100, False, False),
        ("Core wall construction", "Tower Core & Structure", "critical", "2024-06-01", "2025-03-31", 100, False, True),
        ("Floor slab cycle floors 3-22", "Tower Core & Structure", "critical", "2024-08-01", "2025-04-30", 100, False, True),
        ("Floor slab cycle floors 23-44", "Tower Core & Structure", "high", "2025-01-01", "2025-06-30", 85, False, True),
        ("Tower structure topped out", "Tower Core & Structure", "critical", "2025-06-30", "2025-06-30", 85, True, True),
        ("Window wall installation floors 3-22", "Building Envelope", "high", "2024-12-01", "2025-06-30", 100, False, False),
        ("Window wall installation floors 23-44", "Building Envelope", "high", "2025-04-01", "2025-09-30", 60, False, False),
        ("Roof waterproofing", "Building Envelope", "medium", "2025-07-01", "2025-09-30", 40, False, False),
        ("Electrical distribution floors 3-20", "MEP Systems", "high", "2025-01-01", "2025-07-31", 90, False, False),
        ("HVAC installation floors 3-20", "MEP Systems", "high", "2025-02-01", "2025-08-31", 85, False, False),
        ("Plumbing risers and branch lines", "MEP Systems", "high", "2025-01-15", "2025-09-30", 75, False, False),
        ("Fire sprinkler installation", "MEP Systems", "medium", "2025-03-01", "2025-12-31", 60, False, False),
        ("Unit fit-out floors 3-12", "Interior Build-Out Floors 3-20", "high", "2025-03-01", "2025-07-31", 100, False, False),
        ("Unit fit-out floors 13-20", "Interior Build-Out Floors 3-20", "high", "2025-05-01", "2025-10-31", 80, False, False),
        ("Common area finishes floors 3-20", "Interior Build-Out Floors 3-20", "medium", "2025-06-01", "2025-10-31", 70, False, False),
        ("Unit fit-out floors 21-33", "Interior Build-Out Floors 21-44", "high", "2025-06-01", "2025-12-31", 55, False, False),
        ("Unit fit-out floors 34-44", "Interior Build-Out Floors 21-44", "high", "2025-09-01", "2026-03-31", 15, False, False),
        ("Penthouse custom finishes", "Interior Build-Out Floors 21-44", "medium", "2025-11-01", "2026-03-31", 5, False, False),
        ("Rooftop pool and amenity deck", "Amenities, Landscaping & Closeout", "high", "2025-10-01", "2026-04-30", 10, False, False),
        ("Lobby and ground floor retail", "Amenities, Landscaping & Closeout", "high", "2025-11-01", "2026-05-31", 5, False, False),
        ("Landscaping and hardscape", "Amenities, Landscaping & Closeout", "medium", "2026-01-01", "2026-06-30", 0, False, False),
        ("Certificate of Occupancy - full tower", "Amenities, Landscaping & Closeout", "critical", "2026-06-30", "2026-06-30", 0, True, True),
    ]
    for name, phase, pri, start, end, pct, mile, crit in condo_tasks:
        rows.append({
            "name": name, "phase_name": phase, "priority": pri,
            "start_date": start, "end_date": end, "completion_pct": str(pct),
            "is_milestone": str(mile).lower(), "is_critical_path": str(crit).lower(),
            "project_name": CONDO["name"],
        })

    return rows


def generate_contracts():
    rows = []
    contracts = [
        # Owner contracts
        ("DFW Terminal 6 - GC Agreement", "owner", AIRPORT["client"], AIRPORT["client_email"], "480000000", "2024-06-01", "2027-12-31", "monthly_draws", AIRPORT["name"]),
        ("Pinnacle Bay - Development Agreement", "owner", CONDO["client"], CONDO["client_email"], "185000000", "2023-09-01", "2026-06-30", "monthly_draws", CONDO["name"]),
        # Subcontractor contracts - Airport
        ("T6 Structural Steel Package", "subcontractor", "Morrison Steel Fabricators", "janet@morrisonsteel.com", "68000000", "2025-03-01", "2026-03-31", "net_30", AIRPORT["name"]),
        ("T6 Concrete & Foundation Package", "subcontractor", "Delgado Concrete Inc", "frank@delgadoconcrete.com", "52000000", "2024-09-01", "2026-06-30", "net_30", AIRPORT["name"]),
        ("T6 MEP Systems Package", "subcontractor", "Lone Star MEP Services", "bsimmons@lonestarmep.com", "78000000", "2025-10-01", "2027-06-30", "net_30", AIRPORT["name"]),
        ("T6 Curtain Wall & Glazing", "subcontractor", "Southwest Curtain Wall", "rcheng@swcurtainwall.com", "42000000", "2025-09-01", "2026-09-30", "net_30", AIRPORT["name"]),
        ("T6 Baggage Handling System", "subcontractor", "Hensel Phelps Construction", "travis.m@henselphelps.com", "35000000", "2026-04-01", "2027-06-30", "net_30", AIRPORT["name"]),
        ("T6 Electrical Distribution", "subcontractor", "DFW Electric Co", "proth@dfwelectric.com", "28000000", "2025-10-01", "2026-12-31", "net_30", AIRPORT["name"]),
        ("T6 People Mover & Vertical Transport", "subcontractor", "Precision Elevator Co", "slin@precisionelevator.com", "22000000", "2026-06-01", "2027-08-31", "net_30", AIRPORT["name"]),
        ("T6 Heavy Civil & Paving", "subcontractor", "Crossland Heavy Civil", "pstrickland@crosslandheavy.com", "18500000", "2024-06-01", "2026-04-30", "net_30", AIRPORT["name"]),
        # Subcontractor contracts - Condo
        ("PBC Tower Structure", "subcontractor", "Austin Commercial LP", "dnolan@austincommercial.com", "38000000", "2023-09-01", "2025-06-30", "net_30", CONDO["name"]),
        ("PBC MEP Package", "subcontractor", "Trinity Plumbing & Fire", "mochoa@trinityplumbing.com", "24000000", "2025-01-01", "2025-12-31", "net_30", CONDO["name"]),
        ("PBC Window Wall System", "subcontractor", "Dallas Glass & Glazing", "tmarks@dallasglass.com", "16000000", "2024-12-01", "2025-09-30", "net_30", CONDO["name"]),
        ("PBC Interior Fit-Out", "subcontractor", "Texas Drywall & Acoustics", "lwebb@txdrywall.com", "22000000", "2025-03-01", "2026-03-31", "net_30", CONDO["name"]),
        ("PBC Roofing & Waterproofing", "subcontractor", "Patriot Roofing Systems", "wharrell@patriotroofing.com", "8500000", "2025-07-01", "2025-12-31", "net_30", CONDO["name"]),
        ("PBC Painting & Finishes", "subcontractor", "Metro Painting Contractors", "rvega@metropaint.com", "6200000", "2025-06-01", "2026-03-31", "net_30", CONDO["name"]),
        ("PBC Flooring Package", "subcontractor", "Alliance Flooring Group", "kdunn@allianceflooring.com", "9800000", "2025-05-01", "2026-03-31", "net_30", CONDO["name"]),
        # Professional services
        ("A/E Services - Terminal 6", "vendor", "HKS Architects", "philip.dunn@hksa.com", "12000000", "2024-01-01", "2027-12-31", "monthly_draws", AIRPORT["name"]),
        ("Structural Engineering - Terminal 6", "vendor", "Thornton Tomasetti", "aisha@thorntontomasetti.com", "8500000", "2024-01-01", "2027-12-31", "monthly_draws", AIRPORT["name"]),
        ("Program Management", "vendor", "Turner & Townsend", "gbaxter@turnertownsend.com", "4200000", "2024-06-01", "2027-12-31", "monthly_draws", AIRPORT["name"]),
        # Financing
        ("Construction Line of Credit", "financing", "JPMorgan Chase", "cre@jpmorgan.com", "50000000", "2024-01-01", "2027-12-31", "draws_on_request", ""),
        ("Pinnacle Bay Mortgage", "financing", "Wells Fargo CRE", "cre@wellsfargo.com", "95000000", "2023-06-01", "2053-06-01", "monthly_draws", ""),
    ]

    for title, ctype, party, email, amt, start, end, terms, proj in contracts:
        rows.append({
            "title": title, "contract_type": ctype, "party_name": party,
            "party_email": email, "contract_amount": amt, "start_date": start,
            "end_date": end, "payment_terms": terms, "project_name": proj,
        })
    return rows


def generate_opportunities():
    return [
        {"name": "DFW Cargo Terminal Expansion", "client_name": "DFW Airport Board", "stage": "proposal", "estimated_value": "125000000", "probability_pct": "45", "expected_close_date": "2026-06-30", "source": "existing_client"},
        {"name": "Fort Worth Convention Center Renovation", "client_name": "City of Fort Worth", "stage": "qualification", "estimated_value": "85000000", "probability_pct": "30", "expected_close_date": "2026-09-30", "source": "referral"},
        {"name": "Plano Mixed-Use Development", "client_name": "Granite Properties", "stage": "proposal", "estimated_value": "62000000", "probability_pct": "55", "expected_close_date": "2026-04-30", "source": "referral"},
        {"name": "Frisco Medical Office Campus", "client_name": "Medical City Healthcare", "stage": "negotiation", "estimated_value": "38000000", "probability_pct": "70", "expected_close_date": "2026-03-31", "source": "direct"},
        {"name": "Irving Data Center - Phase 2", "client_name": "Digital Realty Trust", "stage": "qualification", "estimated_value": "95000000", "probability_pct": "25", "expected_close_date": "2026-12-31", "source": "direct"},
        {"name": "Arlington ISD School Complex", "client_name": "Arlington ISD", "stage": "proposal", "estimated_value": "42000000", "probability_pct": "40", "expected_close_date": "2026-08-31", "source": "public_bid"},
    ]


def generate_bids():
    return [
        {"project_name": "Frisco Medical Office Campus", "client_name": "Medical City Healthcare", "bid_amount": "39500000", "due_date": "2026-03-15", "bid_type": "GMP", "notes": "3-building campus with central energy plant, targeting LEED Silver"},
        {"project_name": "DFW Cargo Terminal Expansion", "client_name": "DFW Airport Board", "bid_amount": "128000000", "due_date": "2026-05-30", "bid_type": "Lump Sum", "notes": "200,000 SF cargo facility with cold chain capabilities and automated sorting"},
        {"project_name": "Plano Mixed-Use Development", "client_name": "Granite Properties", "bid_amount": "64800000", "due_date": "2026-03-31", "bid_type": "GMP", "notes": "28-story tower with 380 residential units and 40,000 SF retail podium"},
        {"project_name": "Fort Worth Convention Center Renovation", "client_name": "City of Fort Worth", "bid_amount": "88200000", "due_date": "2026-08-15", "bid_type": "Lump Sum", "notes": "Historic renovation with 120,000 SF addition, occupied facility phasing"},
        {"project_name": "Arlington ISD School Complex", "client_name": "Arlington ISD", "bid_amount": "43500000", "due_date": "2026-07-31", "bid_type": "CSP", "notes": "K-12 campus with 3 buildings, athletic facilities, and central kitchen"},
    ]


if __name__ == "__main__":
    phases = generate_phases()
    print(f"Phases: {len(phases)}")

    tasks = generate_tasks()
    airport_tasks = sum(1 for t in tasks if t["project_name"] == AIRPORT["name"])
    condo_tasks = sum(1 for t in tasks if t["project_name"] == CONDO["name"])
    print(f"Tasks: {len(tasks)} (Airport: {airport_tasks}, Condo: {condo_tasks})")

    contracts = generate_contracts()
    print(f"Contracts: {len(contracts)}")

    opps = generate_opportunities()
    print(f"Opportunities: {len(opps)}")

    bids = generate_bids()
    print(f"Bids: {len(bids)}")
