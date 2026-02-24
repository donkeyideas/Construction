#!/usr/bin/env python3
"""Part 5: Field operations - daily logs, RFIs, submittals, change orders."""

from part01_constants import *


def generate_daily_logs_airport():
    """40 daily logs for airport project (Jan-Feb 2026)."""
    rows = []
    weather_opts = ["clear", "partly_cloudy", "overcast", "rain", "windy"]
    work_items = [
        "Continued structural steel erection on concourse spine columns grid lines 12-18. Ironworkers completed 6 column sections.",
        "Concrete pour for Level 2 elevated slab Section C - 280 cubic yards placed. Finishing crew on standby.",
        "Curtain wall mock-up assembly in staging area. Window wall panels delivered from Southwest CW shop.",
        "Deep foundation drilling Zones B-4 through B-8. Hit limestone at 42 feet, switched to rock auger.",
        "MEP rough-in electrical conduit runs in sub-basement. Main switchgear room framing started.",
        "Grade beam forming and rebar placement grid lines A-1 through A-6. Inspection scheduled for tomorrow.",
        "Roof truss lifting operations - 4 trusses set today. Crane repositioned for west section access.",
        "Underground storm drainage installation along future taxiway alignment. 36-inch RCP placed 120 LF.",
        "Fireproofing spray application Level 1 columns and beams, Zones A and B. 14,000 SF completed.",
        "Waterproofing membrane installation on foundation walls Section D. Drainage board installed.",
        "Elevator shaft construction core walls poured to Level 3. Flying forms stripped and cleaned.",
        "Apron pavement sub-base compaction and testing. Nuclear density tests all passing at 98%+ Proctor.",
        "Structural steel bolting and torquing operations concourse Level 2. Bolt inspection crew on site.",
        "Mechanical room equipment pad pours - 4 pads completed for future AHU installations.",
        "Precast concrete panel erection north facade - 12 panels set. Sealant crew following 2 days behind.",
        "Rebar placement for pile caps PC-14 through PC-22. Cadweld splices tested and approved.",
        "Temporary construction road maintenance and dust control operations site-wide.",
        "Steel deck installation Level 3 east wing - 8,400 SF of 3-inch composite deck placed.",
        "Underground fire water main installation - 8-inch ductile iron, 240 LF with 2 gate valves.",
        "Concrete slab on grade pour Zone F - 340 CY placed, power trowel finish, cure compound applied.",
    ]

    d = date(2026, 1, 5)  # Start on Monday Jan 5
    log_idx = 0
    while log_idx < 40:
        if d.weekday() < 5:  # Weekdays only
            w = random.choice(weather_opts)
            temp = random.randint(32, 58) if d.month == 1 else random.randint(38, 65)
            work = work_items[log_idx % len(work_items)]
            safety = "None" if random.random() > 0.05 else "Near miss reported - falling object from Level 2"
            delay = "None"
            if w == "rain":
                delay = "Rain delay - exterior work suspended 2 hours"
            elif random.random() < 0.1:
                delay = random.choice(["Material delivery delayed - rebar truck rescheduled to tomorrow",
                                       "Crane downtime for monthly inspection - 3 hours",
                                       "Concrete truck queue - batch plant running behind schedule"])
            rows.append({
                "log_date": d.isoformat(),
                "weather_conditions": w,
                "temperature": str(temp),
                "work_performed": work,
                "safety_incidents": safety,
                "delays": delay,
                "project_name": AIRPORT["name"],
            })
            log_idx += 1
        d += timedelta(days=1)
    return rows


def generate_daily_logs_condo():
    """40 daily logs for condo project (Jan-Feb 2026)."""
    rows = []
    weather_opts = ["clear", "partly_cloudy", "overcast", "rain", "windy"]
    work_items = [
        "Interior drywall hanging floors 25-27. Taping crew following on floors 22-24.",
        "Window wall installation floor 30 - 8 panels set. Sealant application floors 26-28.",
        "MEP overhead rough-in floors 28-30. Ductwork, sprinkler, and electrical running concurrently.",
        "Kitchen cabinet installation floors 15-17. Countertop templating floors 18-20.",
        "Elevator cab finish installation Cars 1 & 2. Cars 3 & 4 running on temporary operation.",
        "Flooring installation floors 10-12 - luxury vinyl plank in units, porcelain tile in corridors.",
        "Painting floors 19-21 - primer and first coat. Touch-up crew on floors 14-16.",
        "Plumbing fixture trim-out floors 8-10. Faucets, toilets, showerheads installed.",
        "Fire alarm device installation and wiring floors 22-26. Head-end panel programming started.",
        "Balcony railing installation floors 20-24. Welding and glass panel setting.",
        "Rooftop amenity deck waterproofing membrane installation. Pool shell shotcrete scheduled next week.",
        "Lobby marble flooring installation. Reception desk millwork delivered and staged.",
        "Unit punchlist and turnover inspections floors 3-6. 42 units cleared for CO.",
        "Penthouse custom millwork installation floor 41. Italian marble bathroom finishes floor 42.",
        "Garage floor coating application Level P1. Striping and signage to follow.",
        "Landscape rough grading and irrigation main line installation along boulevard frontage.",
        "Common area corridor lighting fixture installation floors 7-12. LED commissioning.",
        "HVAC system startup and balancing floors 3-15. TAB contractor on site.",
        "Generator load bank testing. Emergency power transfer switch tested successfully.",
        "Unit appliance installation floors 13-18. Ranges, dishwashers, and refrigerators.",
    ]

    d = date(2026, 1, 5)
    log_idx = 0
    while log_idx < 40:
        if d.weekday() < 5:
            w = random.choice(weather_opts)
            temp = random.randint(35, 60) if d.month == 1 else random.randint(40, 68)
            work = work_items[log_idx % len(work_items)]
            safety = "None" if random.random() > 0.05 else "Minor cut - first aid administered on site"
            delay = "None"
            if w == "rain":
                delay = "Exterior work paused due to rain - interior work continued"
            elif random.random() < 0.08:
                delay = random.choice(["Elevator out of service - material hoisting delayed",
                                       "Window panels backordered - installation paused floor 31",
                                       "City inspector no-show - CO inspection rescheduled"])
            rows.append({
                "log_date": d.isoformat(),
                "weather_conditions": w,
                "temperature": str(temp),
                "work_performed": work,
                "safety_incidents": safety,
                "delays": delay,
                "project_name": CONDO["name"],
            })
            log_idx += 1
        d += timedelta(days=1)
    return rows


def generate_rfis():
    rfis = [
        ("Foundation drain tile routing conflict at Grid B-7", "Structural drawings show grade beam at Grid B-7 conflicting with civil storm drain routing. Which takes priority?", "high", "2025-03-15", AIRPORT["name"]),
        ("Curtain wall anchor plate embedment depth", "Spec 08 44 13 calls for 6-inch embedment but structural detail shows 4-inch. Please clarify required depth.", "high", "2025-09-20", AIRPORT["name"]),
        ("Jet bridge connection elevation discrepancy", "Architectural elevation at Gate A-12 jet bridge connection is 3 inches lower than airline equipment spec. Confirm correct elevation.", "critical", "2025-10-05", AIRPORT["name"]),
        ("Fire suppression system zoning in concourse", "Mechanical drawings show Zone 3 boundaries different from fire protection drawings. Which layout governs?", "high", "2025-11-15", AIRPORT["name"]),
        ("Taxiway light can foundation detail", "Airfield lighting plan shows Type E light cans but FAA Advisory Circular references Type L-867. Confirm type.", "medium", "2025-12-01", AIRPORT["name"]),
        ("Apron pavement joint spacing", "Pavement design shows 15-foot joint spacing but FAA P-501 typically requires 12.5 feet for this PCC thickness. Clarify.", "medium", "2026-01-10", AIRPORT["name"]),
        ("MEP shaft size inadequate at Level 2", "Mechanical shaft at grid line C-14 undersized per updated duct routing. Structural modification needed. Request RFP.", "high", "2026-01-20", AIRPORT["name"]),
        ("Steel connection detail at canopy column", "Connection detail D/S-401 shows bolted connection but erection sequence requires field weld. Request alternative.", "medium", "2026-02-05", AIRPORT["name"]),
        ("Baggage makeup carousel motor voltage", "Spec calls for 480V motors but equipment vendor standard is 575V. Confirm acceptable voltage.", "medium", "2026-02-10", AIRPORT["name"]),
        ("Elevator shaft waterproofing scope gap", "Waterproofing spec stops at Level 1 but shaft extends below grade. Confirm scope extension needed.", "high", "2026-02-15", AIRPORT["name"]),
        ("Penthouse unit ceiling height discrepancy", "Floor 42 architectural drawings show 11-foot ceilings but structural shows beam depth reducing to 9.5 feet at living room. Clarify.", "high", "2025-08-15", CONDO["name"]),
        ("Balcony waterproofing membrane laps", "Spec requires 6-inch laps but balcony width only allows 4-inch at perimeter drain. Request alternate detail.", "medium", "2025-09-10", CONDO["name"]),
        ("Unit HVAC condensate drain routing", "Floors 30-35 condensate drain routing conflicts with structural beam. Need rerouting approval.", "medium", "2025-10-20", CONDO["name"]),
        ("Pool deck structural loading", "Rooftop pool deck design load appears insufficient for specified pavers + water depth. Structural confirm required.", "critical", "2025-11-01", CONDO["name"]),
        ("Parking garage exhaust fan capacity", "Mechanical calcs show CO levels exceeding code threshold with specified fans. Recommend upsizing to 50,000 CFM.", "high", "2025-11-20", CONDO["name"]),
        ("Fire-rated corridor ceiling assembly", "Spec calls for 2-hour rated assembly but UL listing for specified product only provides 1-hour. Alternate assembly needed.", "high", "2025-12-15", CONDO["name"]),
        ("Lobby stone flooring pattern discrepancy", "Interior design drawings show herringbone pattern but spec section calls for running bond. Confirm intent.", "low", "2026-01-05", CONDO["name"]),
        ("Unit electrical panel location per ADA", "Panels as shown on electrical drawings exceed ADA reach range for Type A accessible units. Relocation needed.", "high", "2026-01-15", CONDO["name"]),
        ("Window wall gasket material specification", "Specified EPDM gasket discontinued by manufacturer. Replacement silicone gasket submitted for approval.", "medium", "2026-01-25", CONDO["name"]),
        ("Generator fuel day tank capacity", "Emergency power calc shows 4-hour runtime at full load but code requires 6 hours. Larger day tank needed.", "high", "2026-02-01", CONDO["name"]),
    ]
    rows = []
    for subj, question, pri, due, proj in rfis:
        rows.append({
            "subject": subj, "question": question, "priority": pri,
            "due_date": due, "project_name": proj,
        })
    return rows


def generate_submittals():
    subs = [
        ("Structural Steel Shop Drawings - Concourse", "05 12 00", "2025-04-15", AIRPORT["name"]),
        ("Curtain Wall System - Mock-up", "08 44 13", "2025-08-01", AIRPORT["name"]),
        ("Concrete Mix Designs - Elevated Slabs", "03 30 00", "2025-02-15", AIRPORT["name"]),
        ("Baggage Handling System - Equipment", "34 21 00", "2026-02-01", AIRPORT["name"]),
        ("People Mover Guideway - Track System", "34 41 00", "2026-04-15", AIRPORT["name"]),
        ("Fire Alarm Control Panel", "28 31 00", "2025-09-01", AIRPORT["name"]),
        ("HVAC Air Handling Units", "23 73 00", "2025-10-15", AIRPORT["name"]),
        ("Electrical Switchgear - Main Distribution", "26 24 00", "2025-09-15", AIRPORT["name"]),
        ("Elevator Cab Finishes", "14 21 00", "2026-05-01", AIRPORT["name"]),
        ("Airfield Pavement - Mix Design", "32 13 00", "2025-11-01", AIRPORT["name"]),
        ("Window Wall System - Tower", "08 44 13", "2024-10-01", CONDO["name"]),
        ("Post-Tensioned Slab Design", "03 38 00", "2024-05-15", CONDO["name"]),
        ("Kitchen Cabinetry - Standard Units", "12 35 00", "2025-01-15", CONDO["name"]),
        ("Luxury Vinyl Plank Flooring", "09 65 00", "2025-02-01", CONDO["name"]),
        ("Rooftop Pool Equipment", "13 11 00", "2025-08-15", CONDO["name"]),
        ("Unit HVAC Fan Coil Units", "23 82 00", "2024-11-01", CONDO["name"]),
        ("Fire Sprinkler Shop Drawings", "21 13 00", "2025-01-01", CONDO["name"]),
        ("Penthouse Marble Finishes", "09 30 00", "2025-09-01", CONDO["name"]),
        ("Parking Garage Exhaust Fans", "23 34 00", "2025-10-01", CONDO["name"]),
        ("Generator & ATS", "26 32 00", "2025-07-15", CONDO["name"]),
    ]
    rows = []
    for title, spec, due, proj in subs:
        rows.append({
            "title": title, "project_name": proj, "spec_section": spec, "due_date": due,
        })
    return rows


def generate_change_orders():
    """14 change orders across both projects. status=draft to prevent auto-JE."""
    cos = [
        ("Enhanced Security Screening Expansion", "TSA requested additional 4 screening lanes requiring structural modifications to Level 2 floor plate and MEP rerouting", "owner_request", "4200000", "18", AIRPORT["name"]),
        ("Runway 17-35 Taxiway Realignment", "FAA directive to modify taxiway connector geometry for new aircraft separation standards", "code_compliance", "2800000", "22", AIRPORT["name"]),
        ("Concourse Lounge Premium Finishes Upgrade", "Airport Board requested upgrade from standard to premium finishes in international arrivals lounge", "owner_request", "1850000", "8", AIRPORT["name"]),
        ("Unforeseen Contaminated Soil - Zone C", "Environmental testing revealed petroleum contamination requiring excavation and remediation of 2,400 CY", "differing_site_conditions", "1650000", "15", AIRPORT["name"]),
        ("Additional Jet Bridges - Gates A-14 and A-15", "Airline capacity study added 2 gates requiring structural extensions and utility connections", "owner_request", "3200000", "25", AIRPORT["name"]),
        ("Fire Suppression System Upgrade to Clean Agent", "IT server room and telecom spaces require FM-200 clean agent systems per updated airport IT standards", "code_compliance", "980000", "5", AIRPORT["name"]),
        ("Electrical Vault Waterproofing Enhancement", "Water infiltration at sub-basement electrical vault requires additional waterproofing and sump system", "differing_site_conditions", "420000", "6", AIRPORT["name"]),
        # Condo COs
        ("Penthouse Floor Plan Reconfiguration", "Developer requested combining 4 penthouses into 2 full-floor units with custom layouts", "owner_request", "1800000", "12", CONDO["name"]),
        ("Rooftop Amenity Deck Expansion", "Added outdoor kitchen, fire pit lounge, and expanded pool deck per marketing team feedback", "owner_request", "2200000", "14", CONDO["name"]),
        ("Rock Excavation - Parking Level P3", "Encountered unforeseen granite formation at parking level P3 requiring rock breaking", "differing_site_conditions", "890000", "10", CONDO["name"]),
        ("EV Charging Infrastructure - All Parking Levels", "Updated building code requires 20% EV-ready spaces. Electrical infrastructure upgrade for 120 charging stations", "code_compliance", "1450000", "8", CONDO["name"]),
        ("Enhanced Acoustic Insulation - Floors 3-12", "Sound transmission testing failed STC rating. Additional insulation and resilient channels required", "unforeseen_conditions", "680000", "6", CONDO["name"]),
        ("Smart Home Technology Package", "Developer added smart lock, thermostat, lighting control, and intercom system to all 500 units", "owner_request", "2100000", "10", CONDO["name"]),
        ("Ground Floor Retail Shell Expansion", "Retail tenant signed requiring 4,000 SF additional shell space with grease trap and dedicated HVAC", "owner_request", "750000", "8", CONDO["name"]),
    ]
    rows = []
    for title, desc, reason, amt, days, proj in cos:
        rows.append({
            "title": title, "description": desc, "reason": reason,
            "amount": amt, "schedule_impact_days": days,
            "status": "draft",  # CRITICAL: draft prevents auto-JE
            "project_name": proj,
        })
    return rows


if __name__ == "__main__":
    logs_a = generate_daily_logs_airport()
    logs_c = generate_daily_logs_condo()
    print(f"Daily logs: Airport={len(logs_a)}, Condo={len(logs_c)}")

    rfis = generate_rfis()
    print(f"RFIs: {len(rfis)}")

    subs = generate_submittals()
    print(f"Submittals: {len(subs)}")

    cos = generate_change_orders()
    print(f"Change orders: {len(cos)}")
