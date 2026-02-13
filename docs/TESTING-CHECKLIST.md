# Construction ERP - Platform Testing Checklist

> **Goal:** Sign up as a new user, create 1 real construction project, and test every feature end-to-end.
>
> **Estimated time:** 45-60 minutes to enter all data.
>
> Follow the steps in order — later sections depend on data from earlier ones.

---

## Phase 1: Account & Company Setup

### 1.1 Register
- [ ] Go to `/register`
- [ ] Enter your email, password, full name
- [ ] Confirm email if required

**Test data:**
| Field | Value |
|-------|-------|
| Email | your-email@example.com |
| Password | YourSecurePass123! |
| Full Name | Your Name |

### 1.2 Create Company
- [ ] Fill in company registration form after first login

**Test data:**
| Field | Value |
|-------|-------|
| Company Name | Apex Construction LLC |
| Address | 500 Main Street |
| City | Austin |
| State | TX |
| ZIP | 78701 |
| Phone | (512) 555-1000 |
| Industry Type | General Contractor |

### 1.3 Verify Dashboard
- [ ] Navigate to `/dashboard`
- [ ] Confirm it loads (will be empty — that's expected)

---

## Phase 2: Project Creation

### 2.1 Create Your Project
- [ ] Go to `/projects` → click **"New Project"**

**Test data — use a realistic commercial project:**
| Field | Value |
|-------|-------|
| Project Name | Downtown Office Renovation |
| Project Code | DOR-001 |
| Description | Complete interior renovation of 25,000 SF Class A office space on floors 3-4, including demo, MEP upgrades, new finishes, and ADA compliance updates |
| Status | Active |
| Project Type | Renovation |
| Address | 200 Congress Avenue |
| City | Austin |
| State | TX |
| ZIP | 78701 |
| Client Name | Capitol Realty Partners |
| Client Contact | Michael Torres |
| Client Email | mtorres@capitolrealty.com |
| Client Phone | (512) 555-2000 |
| Contract Amount | 3,850,000 |
| Estimated Cost | 3,200,000 |
| Start Date | 2026-03-01 |
| Estimated End Date | 2026-10-31 |

### 2.2 Verify Project Created
- [ ] See project card on `/projects` listing
- [ ] Click into project detail page

---

## Phase 3: Project Phases & Tasks (Gantt)

### 3.1 Add Project Phases
- [ ] Go to `/projects/gantt` or the project detail page
- [ ] Add these 5 phases:

| Phase Name | Start Date | End Date | Color |
|------------|-----------|----------|-------|
| Pre-Construction & Demo | 2026-03-01 | 2026-04-15 | Red |
| Structural & MEP Rough-In | 2026-04-01 | 2026-06-30 | Orange |
| Framing & Drywall | 2026-06-01 | 2026-08-15 | Blue |
| Finishes & FF&E | 2026-07-15 | 2026-09-30 | Green |
| Commissioning & Closeout | 2026-09-15 | 2026-10-31 | Teal |

### 3.2 Add Tasks (8-10 per project)
- [ ] Add tasks to each phase:

| Task Name | Phase | Priority | Status | % Complete |
|-----------|-------|----------|--------|------------|
| Asbestos survey & abatement plan | Pre-Construction & Demo | High | Not Started | 0% |
| Selective demolition - floors 3-4 | Pre-Construction & Demo | High | Not Started | 0% |
| Permit submission (City of Austin) | Pre-Construction & Demo | Critical | Not Started | 0% |
| Electrical rough-in | Structural & MEP Rough-In | High | Not Started | 0% |
| Plumbing rough-in | Structural & MEP Rough-In | Medium | Not Started | 0% |
| HVAC ductwork installation | Structural & MEP Rough-In | High | Not Started | 0% |
| Metal stud framing | Framing & Drywall | Medium | Not Started | 0% |
| Drywall hang & finish | Framing & Drywall | Medium | Not Started | 0% |
| Flooring installation | Finishes & FF&E | Medium | Not Started | 0% |
| Paint & wall coverings | Finishes & FF&E | Low | Not Started | 0% |
| Final inspection & punch list | Commissioning & Closeout | Critical | Not Started | 0% |

- [ ] Mark "Permit submission" as a **milestone**
- [ ] Mark "Final inspection" as a **milestone**

---

## Phase 4: Contacts / People

### 4.1 Add Contacts
- [ ] Go to `/people` → click **"Add Contact"** (or use **Import CSV**)

**Subcontractors (3):**
| Type | First Name | Last Name | Company | Job Title | Email | Phone |
|------|-----------|-----------|---------|-----------|-------|-------|
| Subcontractor | Mike | Ramirez | Ramirez Electric LLC | Owner | mike@ramirezelectric.com | (512) 555-3001 |
| Subcontractor | Lisa | Chen | CityWide Plumbing | Estimator | lchen@citywideplumb.com | (512) 555-3002 |
| Subcontractor | Tom | Baker | Baker Drywall & Paint | Foreman | tbaker@bakerdrywall.com | (512) 555-3003 |

**Vendors (2):**
| Type | First Name | Last Name | Company | Job Title | Email | Phone |
|------|-----------|-----------|---------|-----------|-------|-------|
| Vendor | Sarah | Williams | Austin Building Supply | Account Rep | swilliams@austinbuild.com | (512) 555-3004 |
| Vendor | James | Park | LoneStar Equipment Rental | Branch Mgr | jpark@lonestarequip.com | (512) 555-3005 |

**Client (1):**
| Type | First Name | Last Name | Company | Job Title | Email | Phone |
|------|-----------|-----------|---------|-----------|-------|-------|
| Client | Michael | Torres | Capitol Realty Partners | VP Development | mtorres@capitolrealty.com | (512) 555-2000 |

### 4.2 Add Certifications
- [ ] Go to `/people/certifications` → click **"Add Certification"**

| Contact | Cert Type | Name | Authority | Expiry |
|---------|----------|------|-----------|--------|
| Mike Ramirez | License | TX Master Electrician | TDLR | 2027-06-01 |
| Mike Ramirez | OSHA 30 | OSHA 30-Hour | OSHA | 2029-03-15 |
| Lisa Chen | OSHA 10 | OSHA 10-Hour | OSHA | 2028-09-01 |

### 4.3 Add Time Entry
- [ ] Go to `/people/time` → click **"New Entry"**

| Field | Value |
|-------|-------|
| Date | Today |
| Project | Downtown Office Renovation |
| Clock In | 06:30 |
| Clock Out | 15:00 |
| Hours | 8 |
| Work Type | Regular |
| Cost Code | 01 |

---

## Phase 5: Equipment

### 5.1 Add Equipment
- [ ] Go to `/equipment/inventory` → click **"Add Equipment"** (or use **Import CSV**)

| Name | Type | Make | Model | Serial # | Status | Purchase Cost | Hourly Rate |
|------|------|------|-------|----------|--------|--------------|-------------|
| Skid Steer Loader | Loader | Bobcat | S650 | BOB-2024-1234 | Available | 58,000 | 85 |
| Scissor Lift #1 | Lift | JLG | 3246ES | JLG-2023-5678 | Available | 32,000 | 55 |
| Ford F-250 Crew Cab | Vehicle | Ford | F-250 | 1FT-2024-9012 | In Use | 65,000 | 40 |

### 5.2 Assign Equipment to Project
- [ ] Go to `/equipment/assignments` → click **"New Assignment"**

| Equipment | Project | Assigned To | Start Date |
|-----------|---------|------------|-----------|
| Skid Steer Loader | Downtown Office Renovation | (yourself) | 2026-03-01 |
| Scissor Lift #1 | Downtown Office Renovation | (yourself) | 2026-04-01 |

### 5.3 Log Equipment Maintenance
- [ ] Go to `/equipment/maintenance` → click **"New Record"**

| Equipment | Type | Description | Date | Cost |
|-----------|------|------------|------|------|
| Ford F-250 | Preventive | Oil change, tire rotation, brake inspection | Today | 350 |

---

## Phase 6: Financial Setup

### 6.1 Chart of Accounts
- [ ] Go to `/financial/accounts`
- [ ] Accounts may be auto-seeded. If empty, use **Import CSV** to upload standard accounts
- [ ] Verify accounts exist: 1000 (Cash), 1100 (AR), 2000 (AP), 4000 (Revenue), 5000 (Construction Costs)

### 6.2 Add Bank Account
- [ ] Go to `/financial/banking` → click **"New Bank Account"**

| Field | Value |
|-------|-------|
| Account Name | Operating Account |
| Bank Name | Chase Bank |
| Last 4 of Account | 4521 |
| Last 4 of Routing | 0021 |
| Account Type | Checking |
| Current Balance | 125,000 |
| Is Default | Yes |

### 6.3 Add Job Cost Budget Lines
- [ ] Go to `/financial/job-costing`
- [ ] Select "Downtown Office Renovation" project
- [ ] Click **"Add Budget Line"** for each CSI division:

| CSI Code | Description | Budgeted | Committed | Actual |
|----------|------------|----------|-----------|--------|
| 01 | General Requirements | 320,000 | 280,000 | 0 |
| 02 | Selective Demolition | 185,000 | 175,000 | 0 |
| 09 | Finishes (Flooring, Paint, Tile) | 420,000 | 0 | 0 |
| 21-23 | Mechanical / HVAC / Plumbing | 680,000 | 620,000 | 0 |
| 26 | Electrical | 450,000 | 410,000 | 0 |
| 05 | Metals (Structural Steel) | 280,000 | 260,000 | 0 |

- [ ] Verify totals match: ~$2,335,000 budgeted

### 6.4 Create Invoice (Accounts Receivable)
- [ ] Go to `/financial/invoices` → click **"New Invoice"**

| Field | Value |
|-------|-------|
| Type | Receivable (AR) |
| Invoice # | INV-0001 |
| Client | Capitol Realty Partners |
| Project | Downtown Office Renovation |
| Date | Today |
| Due Date | 30 days from today |
| Line Item 1 | Mobilization & General Conditions — $120,000 |
| Tax | $9,900 (8.25%) |

### 6.5 Create Invoice (Accounts Payable)
- [ ] Create another invoice:

| Field | Value |
|-------|-------|
| Type | Payable (AP) |
| Invoice # | AP-0001 |
| Vendor | Ramirez Electric LLC |
| Project | Downtown Office Renovation |
| Date | Today |
| Due Date | 30 days from today |
| Line Item 1 | Electrical rough-in progress billing — $65,000 |

---

## Phase 7: Contracts

### 7.1 Create Prime Contract
- [ ] Go to `/contracts` → click **"New Contract"**

| Field | Value |
|-------|-------|
| Contract # | GC-2026-001 |
| Title | Downtown Office Renovation - Prime Contract |
| Type | Prime |
| Party | Capitol Realty Partners |
| Email | mtorres@capitolrealty.com |
| Amount | 3,850,000 |
| Retention | 10% |
| Payment Terms | Net 30 |
| Start Date | 2026-03-01 |
| End Date | 2026-10-31 |
| Project | Downtown Office Renovation |
| Scope | Complete interior renovation including demo, MEP, finishes, FF&E |
| Bond Required | Yes |

### 7.2 Create Subcontract
- [ ] Add another contract:

| Field | Value |
|-------|-------|
| Contract # | SC-2026-001 |
| Title | Electrical Systems - Ramirez Electric |
| Type | Subcontractor |
| Party | Ramirez Electric LLC |
| Amount | 410,000 |
| Retention | 10% |
| Project | Downtown Office Renovation |

---

## Phase 8: Field Operations

### 8.1 Create Daily Log
- [ ] Go to `/projects/daily-logs` → click **"New Daily Log"**

| Field | Value |
|-------|-------|
| Project | Downtown Office Renovation |
| Date | Today |
| Weather High | 72°F |
| Weather Low | 55°F |
| Conditions | Clear |
| Wind | 8 mph |
| Humidity | 45% |
| Workforce | Demo Crew - 6 workers, 8 hrs |
| Equipment | Skid Steer - 6 hrs, active |
| Work Performed | Began selective demolition on floor 3 east wing. Removed ceiling tiles, light fixtures, and carpet. Hazmat crew cleared asbestos areas. |
| Materials | 2 dumpsters delivered for demo debris |

### 8.2 Create RFI
- [ ] Go to `/projects/rfis` → click **"New RFI"**

| Field | Value |
|-------|-------|
| Project | Downtown Office Renovation |
| RFI # | RFI-001 |
| Subject | Structural beam reinforcement at Grid C-3 |
| Question | Existing steel beam at Grid C-3 shows signs of corrosion. Please confirm if structural reinforcement or replacement is needed before MEP rough-in. |
| Priority | High |
| Due Date | 2 weeks from today |

### 8.3 Create Change Order
- [ ] Go to `/projects/change-orders` → click **"New Change Order"**

| Field | Value |
|-------|-------|
| Project | Downtown Office Renovation |
| CO # | CO-001 |
| Title | Additional ADA restroom on Floor 4 |
| Description | Code review identified need for additional ADA-compliant restroom on floor 4. Requires plumbing relocation and wall modifications. |
| Reason | Design Change |
| Amount | 48,500 |
| Schedule Impact | 5 days |

---

## Phase 9: Safety

### 9.1 Create Safety Inspection
- [ ] Go to `/safety/inspections` → click **"New Inspection"**

| Field | Value |
|-------|-------|
| Project | Downtown Office Renovation |
| Date | Today |
| Type | Weekly |
| Score | 90 |
| Checklist Items | PPE ✓, Fall Protection ✓, Housekeeping ✗ (debris near stairwell), Electrical ✓, Fire Ext ✓ |
| Findings | Minor housekeeping issue at floor 3 stairwell |
| Corrective Actions | Assigned cleanup crew, scheduled toolbox talk |

### 9.2 Log Safety Incident
- [ ] Go to `/safety/incidents` → click **"New Incident"**

| Field | Value |
|-------|-------|
| Project | Downtown Office Renovation |
| Title | Near-miss: Falling debris during demo |
| Type | Near Miss |
| Severity | Medium |
| Date | Today |
| Location | Floor 3 - East Wing |
| Description | Drywall section fell during demo, landing in barricaded zone. No injuries. |
| Root Cause | Inadequate shoring of ceiling grid |
| Corrective Actions | Installed additional shoring; expanded barricade area |
| OSHA Recordable | No |

### 9.3 Create Toolbox Talk
- [ ] Go to `/safety/toolbox-talks` → click **"New Toolbox Talk"**

| Field | Value |
|-------|-------|
| Project | Downtown Office Renovation |
| Title | Demolition Safety & Falling Object Prevention |
| Topic | Falling Objects |
| Date | Today |
| Duration | 15 min |
| Attendees | 8 workers |
| Notes | Reviewed proper demo procedures, PPE requirements, and barricade placement |

---

## Phase 10: CRM & Bids

### 10.1 Create Opportunity
- [ ] Go to `/crm` → click **"New Opportunity"**

| Field | Value |
|-------|-------|
| Name | Tech Campus Phase 2 Build-Out |
| Client | InnovateTech Corp |
| Contact | David Lee |
| Email | dlee@innovatetech.com |
| Project Type | Commercial |
| Estimated Value | 8,500,000 |
| Probability | 40% |
| Stage | Proposal |
| Source | Referral |
| Expected Close | 2026-06-30 |

### 10.2 Create Bid
- [ ] Go to `/crm/bids` → click **"New Bid"**

| Field | Value |
|-------|-------|
| Bid # | BID-2026-001 |
| Project Name | Tech Campus Phase 2 Build-Out |
| Client | InnovateTech Corp |
| Bid Date | Today |
| Due Date | 2026-03-31 |
| Status | In Progress |
| Estimated Cost | 7,200,000 |
| Bid Amount | 8,500,000 |
| Scope | 60,000 SF office build-out including open floor plan, server room, and executive suites |

---

## Phase 11: Documents

### 11.1 Upload Documents
- [ ] Go to `/documents` → click **"Upload Document"**

Upload 2-3 test files:
| Name | Category | Project | Folder |
|------|----------|---------|--------|
| Floor Plan - Level 3.pdf | Plan | Downtown Office Renovation | /DOR-001/Drawings |
| Ramirez Electric Subcontract.pdf | Contract | Downtown Office Renovation | /DOR-001/Contracts |
| Site Photo - Demo Day 1.jpg | Photo | Downtown Office Renovation | /DOR-001/Photos |

---

## Phase 12: Tickets

### 12.1 Create Ticket
- [ ] Go to `/tickets` → click **"New Ticket"**

| Field | Value |
|-------|-------|
| Title | Dumpster delivery delay - DOR project |
| Description | Waste hauler called - 2nd dumpster delivery delayed until tomorrow. Demo crew may need to slow work on floor 4. |
| Status | Open |
| Priority | High |
| Category | Operations |
| Tags | demo, logistics |

---

## Phase 13: Property Management (Optional)

### 13.1 Create Property
- [ ] Go to `/properties` → click **"New Property"**

| Field | Value |
|-------|-------|
| Name | Congress Avenue Office Building |
| Type | Commercial |
| Address | 200 Congress Avenue, Austin, TX 78701 |
| Year Built | 2005 |
| Total SqFt | 50,000 |
| Total Units | 8 |
| Purchase Price | 12,000,000 |

### 13.2 Add a Lease
- [ ] Go to `/properties/leases` → click **"New Lease"**

| Field | Value |
|-------|-------|
| Property | Congress Avenue Office Building |
| Tenant | Capitol Realty Partners |
| Lease Start | 2026-01-01 |
| Lease End | 2028-12-31 |
| Monthly Rent | 15,000 |
| Deposit | 30,000 |

### 13.3 Create Maintenance Request
- [ ] Go to `/properties/maintenance` → click **"New Request"**

| Field | Value |
|-------|-------|
| Property | Congress Avenue Office Building |
| Title | HVAC unit making loud noise on floor 3 |
| Category | HVAC |
| Priority | High |

---

## Phase 14: Verification Checklist

After entering all data above, verify these pages show your data:

- [ ] **Dashboard** (`/dashboard`) — Shows project stats, KPIs, recent activity
- [ ] **Projects listing** (`/projects`) — Shows "Downtown Office Renovation" card
- [ ] **Gantt chart** (`/projects/gantt`) — Shows phases and tasks timeline
- [ ] **Job Costing** (`/financial/job-costing`) — Shows budget vs actual by CSI division, earned value metrics
- [ ] **Income Statement** (`/financial/income-statement`) — Reflects invoices/revenue
- [ ] **Balance Sheet** (`/financial/balance-sheet`) — Shows account balances
- [ ] **AR Aging** (`/financial/ar`) — Shows outstanding receivable
- [ ] **AP Aging** (`/financial/ap`) — Shows outstanding payable
- [ ] **Banking** (`/financial/banking`) — Shows bank account with balance
- [ ] **Reports** (`/reports`) — Data populates across report views
- [ ] **CRM Pipeline** (`/crm`) — Shows opportunity in pipeline
- [ ] **Calendar** (`/calendar`) — Shows project dates / events

---

## Quick Reference: Login After Setup

| Page | URL |
|------|-----|
| Dashboard | /dashboard |
| Projects | /projects |
| Job Costing | /financial/job-costing |
| Documents | /documents |
| Safety | /safety |
| CRM | /crm |
| Admin Settings | /admin/settings |
