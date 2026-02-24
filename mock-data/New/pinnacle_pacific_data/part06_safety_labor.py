#!/usr/bin/env python3
"""Part 6: Safety, compliance, labor, and equipment maintenance."""

from part01_constants import *


def generate_safety_incidents():
    incidents = [
        ("Slip and fall on wet concrete", "Worker slipped on freshly washed concrete surface in the sub-basement. Sustained bruised knee. First aid administered on site.", "slip_trip_fall", "low", "2025-06-12", "DFW T6 - Sub-basement Zone A", "no", AIRPORT["name"]),
        ("Struck by falling bolt", "Ironworker struck on hard hat by a dropped bolt from Level 3 steel erection. No injury, hard hat cracked.", "struck_by", "low", "2025-08-22", "DFW T6 - Concourse Level 3", "no", AIRPORT["name"]),
        ("Electrical arc flash near miss", "Electrician observed arc flash from temporary panel. No injury. Panel de-energized and tagged out immediately.", "near_miss", "medium", "2025-10-15", "DFW T6 - Electrical Vault B", "no", AIRPORT["name"]),
        ("Crane load drift during high wind", "Load drifted 8 feet during lift when wind gust exceeded 25 mph. Load safely set down. Operations suspended.", "near_miss", "high", "2025-11-03", "DFW T6 - Concourse Roof", "no", AIRPORT["name"]),
        ("Heat stress - worker hospitalized", "Concrete finisher experienced heat exhaustion during summer pour. Transported to Parkland Hospital. Released same day.", "illness", "medium", "2025-07-18", "DFW T6 - Apron Pavement", "yes", AIRPORT["name"]),
        ("Laceration from sheet metal edge", "HVAC installer sustained 3-inch laceration on forearm from duct edge. Wound cleaned, butterfly closure applied.", "first_aid", "low", "2025-12-05", "DFW T6 - Mechanical Room L2", "no", AIRPORT["name"]),
        ("Fall from scaffold - 6 foot drop", "Painter fell 6 feet from rolling scaffold when caster lock failed. Fractured wrist. Transported to hospital.", "fall", "high", "2025-09-28", "PBC - Floor 18 Corridor", "yes", CONDO["name"]),
        ("Chemical splash - concrete sealer", "Worker splashed concrete sealer in eyes. Emergency eyewash used. Referred to occupational health clinic.", "exposure", "medium", "2025-11-15", "PBC - Parking Level P1", "no", CONDO["name"]),
        ("Near miss - unsecured material on edge", "Stack of drywall sheets found unsecured near floor edge opening on Floor 34. Area secured immediately.", "near_miss", "high", "2026-01-08", "PBC - Floor 34", "no", CONDO["name"]),
        ("Finger pinch in door frame", "Carpenter pinched finger while installing unit entry door. Fingertip bruised. First aid ice and wrap.", "first_aid", "low", "2026-01-22", "PBC - Floor 12 Unit 1208", "no", CONDO["name"]),
    ]
    rows = []
    for title, desc, itype, sev, idate, loc, osha, proj in incidents:
        rows.append({
            "title": title, "description": desc, "incident_type": itype,
            "severity": sev, "incident_date": idate, "location": loc,
            "osha_recordable": osha, "project_name": proj,
        })
    return rows


def generate_safety_inspections():
    inspections = []
    types = ["site_safety", "crane", "electrical", "scaffolding", "excavation", "fire_protection"]
    base_date = date(2025, 7, 1)
    for i in range(15):
        d = base_date + timedelta(days=i * 14)  # Biweekly
        score = random.randint(85, 98)
        itype = types[i % len(types)]
        proj = AIRPORT["name"] if i % 2 == 0 else CONDO["name"]
        findings_pool = [
            "Fall protection anchor points all properly installed. One harness expired - replaced on site.",
            "Crane daily inspection logs up to date. Load charts posted. Anti-two-block device tested OK.",
            "All GFCI outlets tested and functioning. Temporary power panels properly labeled and locked.",
            "Scaffold tags current. Cross-bracing complete. Mudsills adequate. Guardrails at 42 inches.",
            "Excavation properly sloped at 1.5:1. Spoil pile setback 4 feet from edge. Egress ladder in place.",
            "Fire extinguishers inspected and tagged. Hot work permits on file. Fire watch log maintained.",
            "Housekeeping excellent. Walking surfaces clear. Trash chutes operational. Dumpsters not overflowing.",
            "PPE compliance 100% observed. Hard hats, safety glasses, high-vis vests worn by all personnel.",
        ]
        actions_pool = [
            "Issued replacement PPE for 3 workers with expired items.",
            "Re-secured barricade tape around open floor penetrations on Level 2.",
            "Added additional lighting in stairwell B per inspector recommendation.",
            "Replaced worn sling on overhead crane - taken out of service until new sling installed.",
            "Posted additional signage at excavation perimeter in English and Spanish.",
            "Relocated fire extinguisher to accessible position near welding station.",
            "No corrective actions required - all items in compliance.",
            "Scheduled refresher training for 12 workers on fall protection procedures.",
        ]
        inspections.append({
            "inspection_type": itype,
            "inspection_date": d.isoformat(),
            "score": str(score),
            "findings": findings_pool[i % len(findings_pool)],
            "corrective_actions": actions_pool[i % len(actions_pool)],
            "status": "completed",
            "project_name": proj,
        })
    return inspections


def generate_toolbox_talks():
    talks = []
    topics = [
        ("Fall Protection Awareness", "Reviewed OSHA 1926 Subpart M requirements for fall protection. Demonstrated proper harness inspection and tie-off points.", "Fall Protection"),
        ("Crane Safety and Rigging", "Discussed crane hand signals, load chart reading, and rigging hardware inspection. Reviewed lift plan procedures.", "Crane Safety"),
        ("Electrical Safety - LOTO", "Lockout/Tagout procedures reviewed. Each crew member demonstrated proper LOTO sequence on mock panel.", "Electrical Safety"),
        ("Heat Illness Prevention", "Reviewed symptoms of heat exhaustion and heat stroke. Discussed water-rest-shade protocol and buddy system.", "Heat Illness"),
        ("Scaffolding Safety", "Proper scaffold erection, inspection before use, and fall protection requirements. Reviewed competent person duties.", "Scaffolding"),
        ("Trenching and Excavation", "OSHA excavation requirements. Soil classification, sloping/shoring, and atmospheric testing for confined spaces.", "Excavation Safety"),
        ("Fire Prevention and Hot Work", "Hot work permit procedures, fire watch responsibilities, and portable fire extinguisher use and locations.", "Fire Prevention"),
        ("PPE Requirements and Inspection", "Proper selection, use, and inspection of PPE. Demonstrated hard hat replacement criteria and safety glasses standards.", "PPE"),
        ("Housekeeping and Material Storage", "Proper material storage, clear walking paths, trash removal, and debris management on active floors.", "Housekeeping"),
        ("Silica Dust Exposure Control", "OSHA silica standard requirements. Proper use of wet cutting methods, vacuums, and respiratory protection.", "Silica Exposure"),
        ("Concrete Pump Safety", "Safe positioning, line whip prevention, and communication protocols during concrete placement operations.", "Concrete Safety"),
        ("Steel Erection Safety", "Connector safety, column anchor bolt inspection, and decking operations hazard awareness.", "Steel Erection"),
        ("Confined Space Entry", "Permit-required confined space procedures. Atmospheric testing, rescue plan, and entrant/attendant duties.", "Confined Space"),
        ("Ladder Safety", "Proper ladder selection, setup angle (4:1 ratio), and three-point contact. Extension ladder tie-off requirements.", "Ladder Safety"),
        ("Back Injury Prevention", "Proper lifting technique, team lifts for heavy objects, and use of mechanical aids for material handling.", "Ergonomics"),
        ("Emergency Action Plan Review", "Muster points, emergency contact numbers, and evacuation routes. Assembly area locations confirmed.", "Emergency Planning"),
        ("Drug and Alcohol Awareness", "Company policy review. Signs of impairment. Reporting procedures. Random testing program overview.", "Substance Abuse"),
        ("Driving Safety - Construction Vehicles", "Speed limits on site, backing procedures, spotter requirements, and seatbelt compliance.", "Vehicle Safety"),
        ("Welding Safety", "Proper ventilation, fire prevention, UV protection, and fume extraction. Welding curtain placement.", "Welding Safety"),
        ("Night Work Safety", "Lighting requirements, high-visibility clothing, communication protocols, and fatigue management.", "Night Work"),
    ]
    d = date(2025, 7, 7)  # Start Monday
    for i in range(20):
        title, desc, topic = topics[i % len(topics)]
        proj = AIRPORT["name"] if i % 2 == 0 else CONDO["name"]
        attendees = random.randint(12, 28)
        talks.append({
            "title": title, "description": desc, "topic": topic,
            "scheduled_date": d.isoformat(), "attendees_count": str(attendees),
            "notes": f"All {proj.split(' - ')[0]} field crew attended. Sign-in sheet filed.",
            "project_name": proj,
        })
        d += timedelta(days=7)
    return talks


def generate_certifications():
    certs = [
        ("OSHA 30-Hour Construction Safety", "safety", "OSHA Training Institute", "OSHA30-2024-48291", "2024-06-15", "2027-06-15", "Marcus Thompson"),
        ("OSHA 30-Hour Construction Safety", "safety", "OSHA Training Institute", "OSHA30-2024-48292", "2024-07-01", "2027-07-01", "Carlos Ramirez"),
        ("OSHA 10-Hour Construction Safety", "safety", "OSHA Training Institute", "OSHA10-2025-11203", "2025-01-20", "2028-01-20", "Nicole Scott"),
        ("Certified Crane Operator - Lattice Boom", "equipment", "NCCCO", "NCCCO-LBC-28841", "2024-03-10", "2029-03-10", "Joseph Moore"),
        ("Certified Crane Operator - Tower Crane", "equipment", "NCCCO", "NCCCO-TSS-28842", "2024-03-10", "2029-03-10", "Joseph Moore"),
        ("Certified Welding Inspector", "quality", "AWS", "AWS-CWI-44129", "2023-11-01", "2026-11-01", "Christopher Taylor"),
        ("First Aid/CPR/AED Certified", "safety", "American Red Cross", "ARC-FA-2025-8821", "2025-02-15", "2027-02-15", "Carlos Ramirez"),
        ("First Aid/CPR/AED Certified", "safety", "American Red Cross", "ARC-FA-2025-8822", "2025-02-15", "2027-02-15", "Nicole Scott"),
        ("PE License - Civil Engineering", "professional", "Texas Board of PE", "TX-PE-118294", "2020-08-01", "2026-08-01", "Diana Martinez"),
        ("PE License - Structural Engineering", "professional", "Texas Board of PE", "TX-PE-105831", "2019-04-01", "2025-04-01", "James O'Brien"),
        ("PMP - Project Management Professional", "professional", "PMI", "PMI-PMP-3829104", "2023-05-15", "2026-05-15", "Diana Martinez"),
        ("PMP - Project Management Professional", "professional", "PMI", "PMI-PMP-4102938", "2024-01-20", "2027-01-20", "Kevin Jackson"),
        ("LEED AP BD+C", "professional", "USGBC", "LEED-APBDC-10482913", "2022-09-01", "2024-09-01", "Jessica Foster"),
        ("Concrete Field Testing Technician", "quality", "ACI", "ACI-FTT-84291", "2024-04-01", "2029-04-01", "Anthony Garcia"),
        ("Confined Space Entry Competent Person", "safety", "National Safety Council", "NSC-CSE-29481", "2025-03-01", "2027-03-01", "Michael Patel"),
        ("Scaffold Competent Person", "safety", "Scaffold Industry Association", "SIA-CP-18294", "2024-08-15", "2026-08-15", "Michael Patel"),
        ("Rigging Qualified Signal Person", "equipment", "NCCCO", "NCCCO-RSP-31928", "2024-06-01", "2029-06-01", "Brian Cooper"),
        ("Asbestos Abatement Supervisor", "safety", "TCEQ", "TCEQ-AAS-48291", "2024-01-15", "2026-01-15", "Carlos Ramirez"),
        ("CDL Class A", "equipment", "Texas DPS", "TX-CDL-A-9281034", "2023-06-01", "2027-06-01", "Brian Cooper"),
        ("Real Estate Broker License", "professional", "TREC", "TREC-BRK-829410", "2022-01-01", "2026-01-01", "Amanda Phillips"),
        ("Certified Property Manager (CPM)", "professional", "IREM", "IREM-CPM-48291", "2023-03-15", "2026-03-15", "Amanda Phillips"),
        ("ICC Building Inspector", "quality", "ICC", "ICC-BI-482910", "2024-09-01", "2027-09-01", "Laura Robinson"),
        ("EPA Lead-Safe Renovator", "safety", "EPA", "EPA-LSR-TX-28491", "2024-05-01", "2029-05-01", "Richard Clark"),
        ("AWS Certified Welder", "quality", "AWS", "AWS-CW-92841", "2024-11-01", "2026-11-01", "Christopher Taylor"),
        ("Forklift Operator Certification", "equipment", "OSHA", "OSHA-FLO-2025-1829", "2025-04-01", "2028-04-01", "Brian Cooper"),
    ]
    rows = []
    for name, ctype, issuer, num, issued, exp, contact in certs:
        rows.append({
            "cert_name": name, "cert_type": ctype, "issuing_authority": issuer,
            "cert_number": num, "issued_date": issued, "expiry_date": exp,
            "contact_name": contact,
        })
    return rows


def generate_time_entries():
    """150 time entries over Jan-Feb 2026."""
    rows = []
    workers = [
        ("Foundation forming and rebar tying", "3300"),
        ("Structural steel erection and bolting", "5100"),
        ("Concrete placement and finishing", "3100"),
        ("Electrical conduit and wire pulling", "16000"),
        ("Plumbing rough-in and testing", "15000"),
        ("HVAC ductwork installation", "15500"),
        ("Drywall hanging and finishing", "9250"),
        ("Painting and wall coverings", "9900"),
        ("Flooring installation", "9650"),
        ("Curtain wall panel installation", "8400"),
        ("Fire sprinkler installation", "13900"),
        ("Elevator installation", "14200"),
        ("General carpentry and framing", "6100"),
        ("Waterproofing membrane application", "7100"),
        ("Site grading and compaction", "2200"),
    ]

    d = date(2026, 1, 5)
    entry_idx = 0
    while entry_idx < 150:
        if d.weekday() < 6:  # Mon-Sat
            desc, cost_code = workers[entry_idx % len(workers)]
            hours = 8 if d.weekday() < 5 else 6
            ot = random.choice([0, 0, 0, 1, 2]) if d.weekday() < 5 else 0
            proj = AIRPORT["name"] if entry_idx % 3 != 2 else CONDO["name"]
            rows.append({
                "entry_date": d.isoformat(),
                "hours": str(hours),
                "overtime_hours": str(ot) if ot > 0 else "",
                "description": f"{desc} - {proj.split()[0]}",
                "cost_code": cost_code,
                "project_name": proj,
            })
            entry_idx += 1
        d += timedelta(days=1)
    return rows


def generate_equipment_maintenance():
    """15 equipment maintenance records. cost=0 to prevent auto-JE."""
    records = [
        ("Liebherr LTM 1300 Mobile Crane", "Annual Certification Inspection", "inspection", "Full annual certification inspection per OSHA 1926.1412. Load test, structural, hydraulic, and electrical systems.", "2025-08-15", "0", "Crane Pros International", "2026-08-15"),
        ("CAT 390F Hydraulic Excavator", "2000 Hour Service", "preventive", "Engine oil and filter change. Hydraulic system filter replacement. Undercarriage inspection and track tension adjustment.", "2025-10-20", "0", "Holt Cat DFW", "2026-02-20"),
        ("CAT 980M Wheel Loader", "Transmission Service", "preventive", "Transmission fluid and filter change. Torque converter inspection. Axle oil sampling.", "2025-11-05", "0", "Holt Cat DFW", "2026-05-05"),
        ("Putzmeister BSF 47-5.16H Concrete Pump", "Boom Inspection & Wear Parts", "preventive", "Boom pin and bushing inspection. Wear plate measurement. Piston and cutting ring replacement.", "2025-09-10", "0", "Putzmeister America", "2026-03-10"),
        ("Liebherr 630 EC-H Tower Crane", "Monthly Wire Rope Inspection", "inspection", "Wire rope inspection per manufacturer specs. Sheave bearing check. Hoist brake adjustment.", "2026-01-15", "0", "Crane Pros International", "2026-02-15"),
        ("JLG 1850SJ Telescopic Boom Lift", "Annual ANSI Inspection", "inspection", "Annual ANSI/CSA inspection. Function test all controls. Emergency lowering test. Structural inspection.", "2025-12-01", "0", "JLG Industries", "2026-12-01"),
        ("Volvo A40G Articulated Hauler", "Engine Overhaul - 10000 Hours", "repair", "Top-end engine overhaul. Turbocharger rebuild. Injector replacement. Cooling system flush.", "2025-07-22", "0", "Romco Equipment", "2026-07-22"),
        ("CAT D8T Dozer", "Undercarriage Rebuild", "repair", "Full undercarriage rebuild. New track chains, idlers, rollers, and sprocket segments.", "2025-11-18", "0", "Holt Cat DFW", "2027-11-18"),
        ("Hamm H 20i Compactor", "Drum Bearing Replacement", "repair", "Drum bearing seized. Replaced both drum bearings and seals. Vibration system tested.", "2026-01-28", "0", "Wirtgen America", "2027-01-28"),
        ("Ford F-350 Super Duty", "60K Mile Service", "preventive", "Oil change, brake inspection, tire rotation, transmission fluid check, A/C service.", "2026-02-05", "0", "Park Place Ford", "2026-08-05"),
        ("Kobelco CK2750G-2 Crawler Crane", "Track Pin and Bushing Turn", "preventive", "Track pin and bushing turned. Carrier roller replacement. Track tension reset.", "2025-08-30", "0", "Kobelco USA", "2027-02-28"),
        ("Manitowoc MLC300 Lattice Crawler", "Boom Tip Section Repair", "repair", "Repaired bent lattice section from minor contact incident. NDT tested all welds.", "2025-10-12", "0", "Manitowoc Crane Care", "2026-04-12"),
        ("Schwing S 43 SX Concrete Pump", "Hydraulic System Overhaul", "repair", "Replaced main hydraulic pump. New hoses and fittings throughout. System flushed and tested.", "2025-12-20", "0", "Schwing America", "2026-06-20"),
        ("Genie S-85 XC Boom Lift", "Platform Leveling Sensor Repair", "repair", "Platform leveling sensor malfunction. Replaced sensor and recalibrated system.", "2026-01-10", "0", "Genie Service Center", "2026-07-10"),
        ("Kenworth T880 Dump Truck", "DOT Annual Inspection", "inspection", "DOT annual safety inspection. Brakes, lights, tires, frame inspection. Passed all categories.", "2026-02-01", "0", "Rush Truck Centers", "2027-02-01"),
    ]
    rows = []
    for equip, title, mtype, desc, mdate, cost, vendor, next_due in records:
        rows.append({
            "equipment_name": equip, "title": title, "maintenance_type": mtype,
            "description": desc, "maintenance_date": mdate, "cost": cost,
            "vendor_name": vendor, "next_due_date": next_due,
        })
    return rows


if __name__ == "__main__":
    incidents = generate_safety_incidents()
    print(f"Safety incidents: {len(incidents)}")

    inspections = generate_safety_inspections()
    print(f"Safety inspections: {len(inspections)}")

    talks = generate_toolbox_talks()
    print(f"Toolbox talks: {len(talks)}")

    certs = generate_certifications()
    print(f"Certifications: {len(certs)}")

    time_entries = generate_time_entries()
    print(f"Time entries: {len(time_entries)}")

    eq_maint = generate_equipment_maintenance()
    print(f"Equipment maintenance: {len(eq_maint)}")
