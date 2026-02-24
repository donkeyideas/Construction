#!/usr/bin/env python3
"""Part 3: Master data - projects, contacts, vendors, equipment."""

from part01_constants import *


def generate_projects():
    return [
        {
            "name": AIRPORT["name"],
            "code": AIRPORT["code"],
            "status": "active",
            "project_type": AIRPORT["type"],
            "address": AIRPORT["address"],
            "city": AIRPORT["city"],
            "state": AIRPORT["state"],
            "zip": AIRPORT["zip"],
            "client_name": AIRPORT["client"],
            "client_email": AIRPORT["client_email"],
            "client_phone": AIRPORT["client_phone"],
            "budget": str(AIRPORT["budget"]),
            "estimated_cost": str(AIRPORT["estimated_cost"]),
            "start_date": AIRPORT["start"],
            "end_date": AIRPORT["end"],
            "description": "New international terminal with 42 gates, automated people mover, customs/immigration facilities, and dual-level roadway",
            "completion_pct": str(AIRPORT["completion"]),
        },
        {
            "name": CONDO["name"],
            "code": CONDO["code"],
            "status": "active",
            "project_type": CONDO["type"],
            "address": CONDO["address"],
            "city": CONDO["city"],
            "state": CONDO["state"],
            "zip": CONDO["zip"],
            "client_name": CONDO["client"],
            "client_email": CONDO["client_email"],
            "client_phone": CONDO["client_phone"],
            "budget": str(CONDO["budget"]),
            "estimated_cost": str(CONDO["estimated_cost"]),
            "start_date": CONDO["start"],
            "end_date": CONDO["end"],
            "description": "44-story luxury condominium tower with 500 units, rooftop amenities, 3-level underground parking, and ground-floor retail",
            "completion_pct": str(CONDO["completion"]),
        },
    ]


def generate_contacts():
    """Generate employee and client contacts."""
    rows = []

    employees = [
        ("Marcus", "Thompson", "Project Director", "marcus.thompson@pinnaclepacific.com", "972-555-0101"),
        ("Sarah", "Chen", "VP of Operations", "sarah.chen@pinnaclepacific.com", "972-555-0102"),
        ("Robert", "Williams", "Chief Financial Officer", "robert.williams@pinnaclepacific.com", "972-555-0103"),
        ("Diana", "Martinez", "Senior Project Manager - Airport", "diana.martinez@pinnaclepacific.com", "972-555-0104"),
        ("James", "O'Brien", "Senior Project Manager - Condo", "james.obrien@pinnaclepacific.com", "972-555-0105"),
        ("Michael", "Patel", "Superintendent - Airport", "michael.patel@pinnaclepacific.com", "972-555-0106"),
        ("Linda", "Nguyen", "Superintendent - Condo", "linda.nguyen@pinnaclepacific.com", "972-555-0107"),
        ("Carlos", "Ramirez", "Safety Director", "carlos.ramirez@pinnaclepacific.com", "972-555-0108"),
        ("Jessica", "Foster", "Quality Control Manager", "jessica.foster@pinnaclepacific.com", "972-555-0109"),
        ("David", "Kim", "Estimating Manager", "david.kim@pinnaclepacific.com", "972-555-0110"),
        ("Angela", "Washington", "HR Director", "angela.washington@pinnaclepacific.com", "972-555-0111"),
        ("Brian", "Cooper", "Equipment Manager", "brian.cooper@pinnaclepacific.com", "972-555-0112"),
        ("Rachel", "Torres", "Contracts Administrator", "rachel.torres@pinnaclepacific.com", "972-555-0113"),
        ("Steven", "Baker", "MEP Coordinator", "steven.baker@pinnaclepacific.com", "972-555-0114"),
        ("Patricia", "Hall", "Document Control", "patricia.hall@pinnaclepacific.com", "972-555-0115"),
        ("Kevin", "Jackson", "Assistant PM - Airport", "kevin.jackson@pinnaclepacific.com", "972-555-0116"),
        ("Michelle", "Lee", "Assistant PM - Condo", "michelle.lee@pinnaclepacific.com", "972-555-0117"),
        ("Anthony", "Garcia", "Field Engineer", "anthony.garcia@pinnaclepacific.com", "972-555-0118"),
        ("Laura", "Robinson", "Field Engineer", "laura.robinson@pinnaclepacific.com", "972-555-0119"),
        ("Thomas", "Wright", "Surveyor", "thomas.wright@pinnaclepacific.com", "972-555-0120"),
        ("Jennifer", "Adams", "Scheduler", "jennifer.adams@pinnaclepacific.com", "972-555-0121"),
        ("Daniel", "Mitchell", "Cost Engineer", "daniel.mitchell@pinnaclepacific.com", "972-555-0122"),
        ("Amanda", "Phillips", "Property Manager", "amanda.phillips@pinnaclepacific.com", "972-555-0123"),
        ("Richard", "Clark", "Maintenance Supervisor", "richard.clark@pinnaclepacific.com", "972-555-0124"),
        ("Elizabeth", "Young", "Leasing Manager", "elizabeth.young@pinnaclepacific.com", "972-555-0125"),
        ("Joseph", "Moore", "Crane Operator", "joseph.moore@pinnaclepacific.com", "972-555-0126"),
        ("Nicole", "Scott", "Safety Officer", "nicole.scott@pinnaclepacific.com", "972-555-0127"),
        ("Christopher", "Taylor", "Concrete Foreman", "christopher.taylor@pinnaclepacific.com", "972-555-0128"),
        ("Stephanie", "Harris", "Accounting Manager", "stephanie.harris@pinnaclepacific.com", "972-555-0129"),
        ("William", "Anderson", "IT Manager", "william.anderson@pinnaclepacific.com", "972-555-0130"),
    ]

    for first, last, title, email, phone in employees:
        rows.append({
            "first_name": first, "last_name": last, "contact_type": "employee",
            "email": email, "phone": phone, "company_name": COMPANY, "job_title": title,
        })

    # Client / external contacts
    externals = [
        ("Howard", "Graves", "client", "howard.graves@dfwairport.gov", "972-555-0201", "DFW Airport Board", "Director of Capital Programs"),
        ("Sandra", "Whitfield", "client", "sandra.whitfield@dfwairport.gov", "972-555-0202", "DFW Airport Board", "Construction Manager"),
        ("Roger", "Pennington", "client", "roger@pinnaclebaydev.com", "214-555-0201", "Pinnacle Bay Development LLC", "Managing Partner"),
        ("Karen", "Duval", "client", "karen@pinnaclebaydev.com", "214-555-0202", "Pinnacle Bay Development LLC", "VP Development"),
        ("Dr. Raymond", "Sato", "inspector", "rsato@cityofdallasinspections.gov", "214-555-0301", "City of Dallas", "Chief Building Inspector"),
        ("Maria", "Calderon", "inspector", "mcalderon@txdot.gov", "512-555-0301", "TxDOT", "Aviation Division Inspector"),
        ("Philip", "Dunn", "architect", "philip.dunn@hksa.com", "214-555-0401", "HKS Architects", "Principal"),
        ("Aisha", "Mohammed", "engineer", "aisha@thorntontomasetti.com", "212-555-0401", "Thornton Tomasetti", "Structural Lead"),
        ("Gregory", "Baxter", "consultant", "gbaxter@turnertownsend.com", "214-555-0501", "Turner & Townsend", "Program Manager"),
        ("Catherine", "Reese", "consultant", "creese@cushwake.com", "214-555-0502", "Cushman & Wakefield", "Property Consultant"),
        ("Neil", "Kapoor", "subcontractor", "neil@kapoorengineering.com", "817-555-0601", "Kapoor Engineering", "Principal Engineer"),
        ("Frank", "Delgado", "subcontractor", "frank@delgadoconcrete.com", "817-555-0602", "Delgado Concrete Inc", "Owner"),
        ("Janet", "Morrison", "subcontractor", "janet@morrisonsteel.com", "214-555-0603", "Morrison Steel Fabricators", "VP Sales"),
        ("Wayne", "Tucker", "insurance", "wtucker@marshmclennan.com", "972-555-0701", "Marsh McLennan", "Construction Practice Lead"),
        ("Deborah", "Strand", "legal", "dstrand@winsteadpc.com", "214-555-0801", "Winstead PC", "Construction Law Partner"),
    ]

    for first, last, ctype, email, phone, company, title in externals:
        rows.append({
            "first_name": first, "last_name": last, "contact_type": ctype,
            "email": email, "phone": phone, "company_name": company, "job_title": title,
        })

    return rows


def generate_vendors():
    """Generate 25 vendor/subcontractor contacts."""
    vendors = [
        ("Hensel Phelps Construction", "Travis", "McCormick", "travis.m@henselphelps.com", "817-555-1001", "Senior Estimator"),
        ("Austin Commercial LP", "Derek", "Nolan", "dnolan@austincommercial.com", "512-555-1002", "Project Executive"),
        ("Delgado Concrete Inc", "Frank", "Delgado", "frank@delgadoconcrete.com", "817-555-1003", "Owner"),
        ("Morrison Steel Fabricators", "Janet", "Morrison", "janet@morrisonsteel.com", "214-555-1004", "VP Sales"),
        ("Lone Star MEP Services", "Bradley", "Simmons", "bsimmons@lonestarmep.com", "972-555-1005", "Operations Manager"),
        ("DFW Electric Co", "Pamela", "Roth", "proth@dfwelectric.com", "214-555-1006", "Commercial Manager"),
        ("Trinity Plumbing & Fire", "Manuel", "Ochoa", "mochoa@trinityplumbing.com", "817-555-1007", "VP Construction"),
        ("Kapoor Engineering", "Neil", "Kapoor", "neil@kapoorengineering.com", "817-555-1008", "Principal"),
        ("Southwest Curtain Wall", "Robert", "Cheng", "rcheng@swcurtainwall.com", "972-555-1009", "Director"),
        ("Dallas Glass & Glazing", "Tina", "Marks", "tmarks@dallasglass.com", "214-555-1010", "Sales Manager"),
        ("Patriot Roofing Systems", "Wayne", "Harrell", "wharrell@patriotroofing.com", "817-555-1011", "President"),
        ("Precision Elevator Co", "Sandra", "Lin", "slin@precisionelevator.com", "972-555-1012", "PM"),
        ("Texas Drywall & Acoustics", "Larry", "Webb", "lwebb@txdrywall.com", "214-555-1013", "Estimator"),
        ("Metro Painting Contractors", "Rosa", "Vega", "rvega@metropaint.com", "817-555-1014", "Owner"),
        ("Alliance Flooring Group", "Keith", "Dunn", "kdunn@allianceflooring.com", "972-555-1015", "Commercial Sales"),
        ("Crossland Heavy Civil", "Paul", "Strickland", "pstrickland@crosslandheavy.com", "817-555-1016", "VP Operations"),
        ("Sunbelt Equipment Rental", "Donna", "Hayes", "dhayes@sunbelt.com", "972-555-1017", "Branch Manager"),
        ("Vulcan Materials DFW", "Roger", "Pham", "rpham@vulcanmat.com", "214-555-1018", "Sales Rep"),
        ("Martin Marietta Aggregates", "Lisa", "Frost", "lfrost@martinmarietta.com", "817-555-1019", "Account Manager"),
        ("HD Supply Waterworks", "Craig", "Butler", "cbutler@hdsupply.com", "972-555-1020", "Outside Sales"),
        ("Ferguson Enterprises", "Amy", "Ross", "aross@ferguson.com", "214-555-1021", "Commercial Specialist"),
        ("Graybar Electric", "Jason", "Cole", "jcole@graybar.com", "817-555-1022", "Account Manager"),
        ("White Cap Supply", "Maria", "Santos", "msantos@whitecap.com", "972-555-1023", "Branch Manager"),
        ("United Rentals", "Scott", "Graham", "sgraham@unitedrentals.com", "214-555-1024", "Heavy Equipment"),
        ("CEMEX Texas Operations", "Victor", "Luna", "vluna@cemex.com", "817-555-1025", "Sales Manager"),
    ]

    rows = []
    for company, first, last, email, phone, title in vendors:
        rows.append({
            "company_name": company, "first_name": first, "last_name": last,
            "email": email, "phone": phone, "job_title": title,
        })
    return rows


def generate_equipment():
    """Generate 25 equipment items. purchase_cost=0 to prevent auto-JE."""
    items = [
        ("Liebherr LTM 1300 Mobile Crane", "crane", "Liebherr", "LTM 1300-6.3", "LH1300-28491", "350", "2022-03-15"),
        ("Liebherr 630 EC-H Tower Crane", "crane", "Liebherr", "630 EC-H 40", "LH630-19832", "520", "2021-06-20"),
        ("CAT 390F Hydraulic Excavator", "excavator", "Caterpillar", "390F L", "CAT390F-44721", "285", "2023-01-10"),
        ("CAT 336 Next Gen Excavator", "excavator", "Caterpillar", "336 GC", "CAT336-55103", "195", "2023-08-05"),
        ("CAT 980M Wheel Loader", "loader", "Caterpillar", "980M", "CAT980M-33892", "210", "2022-07-12"),
        ("CAT 966M Wheel Loader", "loader", "Caterpillar", "966M XE", "CAT966-41205", "175", "2023-04-18"),
        ("Komatsu PC490LC Excavator", "excavator", "Komatsu", "PC490LC-11", "KMTSU490-72841", "265", "2022-11-22"),
        ("Volvo A40G Articulated Hauler", "hauler", "Volvo CE", "A40G", "VLVA40G-18934", "185", "2023-02-28"),
        ("CAT D8T Dozer", "dozer", "Caterpillar", "D8T", "CATD8T-62013", "225", "2022-09-14"),
        ("John Deere 850L Dozer", "dozer", "John Deere", "850L", "JD850L-45928", "195", "2023-05-30"),
        ("Putzmeister BSF 47-5.16H Concrete Pump", "concrete_pump", "Putzmeister", "BSF 47-5.16H", "PTZ47-12845", "380", "2022-04-10"),
        ("Schwing S 43 SX Concrete Pump", "concrete_pump", "Schwing", "S 43 SX", "SWG43-29174", "320", "2023-03-22"),
        ("JLG 1850SJ Telescopic Boom Lift", "boom_lift", "JLG", "1850SJ", "JLG1850-38472", "145", "2023-07-15"),
        ("Genie S-85 XC Boom Lift", "boom_lift", "Genie", "S-85 XC", "GEN85-51293", "125", "2023-01-08"),
        ("Genie GS-4069 Scissor Lift", "scissor_lift", "Genie", "GS-4069 RT", "GEN4069-67281", "85", "2023-06-20"),
        ("Skyjack SJ9263 RT Scissor Lift", "scissor_lift", "Skyjack", "SJ9263 RT", "SKY9263-14852", "75", "2023-09-11"),
        ("CAT 140 Motor Grader", "grader", "Caterpillar", "140 AWD", "CAT140-39281", "165", "2022-12-05"),
        ("Hamm H 20i Compactor", "compactor", "Hamm", "H 20i", "HAMM20-82194", "95", "2023-04-25"),
        ("Kobelco CK2750G-2 Crawler Crane", "crane", "Kobelco", "CK2750G-2", "KBL2750-11493", "680", "2021-10-08"),
        ("Manitowoc MLC300 Lattice Crawler", "crane", "Manitowoc", "MLC300", "MAN300-24618", "750", "2020-08-14"),
        ("Potain MCT 565 Tower Crane", "crane", "Potain", "MCT 565", "POT565-37291", "580", "2022-01-20"),
        ("Ford F-350 Super Duty", "vehicle", "Ford", "F-350 XLT", "1FT8W3BT-48291", "45", "2024-01-15"),
        ("Ford F-250 Super Duty", "vehicle", "Ford", "F-250 Lariat", "1FT7W2BT-51832", "40", "2024-02-10"),
        ("Kenworth T880 Dump Truck", "dump_truck", "Kenworth", "T880", "KW880-19284", "155", "2022-06-18"),
        ("Mack Granite GR64F Mixer", "concrete_mixer", "Mack", "Granite GR64F", "MACK64-28471", "135", "2023-08-22"),
    ]

    rows = []
    for name, etype, make, model, serial, rate, pdate in items:
        rows.append({
            "name": name, "equipment_type": etype, "make": make, "model": model,
            "serial_number": serial, "purchase_cost": "0", "hourly_rate": rate,
            "purchase_date": pdate,
        })
    return rows


if __name__ == "__main__":
    projects = generate_projects()
    print(f"Projects: {len(projects)}")

    contacts = generate_contacts()
    emps = sum(1 for c in contacts if c["contact_type"] == "employee")
    print(f"Contacts: {len(contacts)} ({emps} employees)")

    vendors = generate_vendors()
    print(f"Vendors: {len(vendors)}")

    equipment = generate_equipment()
    print(f"Equipment: {len(equipment)}")
