# Buildwrk - Business Presentation
## For Partners, Customers, and Stakeholders

---

## SECTION 1: Who We Are

### Buildwrk is a unified construction ERP platform

We replace 5-8 disconnected software tools with a single platform that manages:

- **Projects** - Gantt scheduling, RFIs, submittals, daily logs, change orders
- **Finances** - GAAP accounting, AR/AP, job costing, bank reconciliation, financial statements
- **Safety** - Incident reporting, inspections, toolbox talks, OSHA compliance
- **Equipment** - Inventory, assignments, maintenance scheduling, depreciation
- **Properties** - Leases, units, maintenance, rent collection, NOI tracking
- **People** - Time tracking, certifications, payroll, crew management
- **Business Development** - Opportunity pipeline, bid management, CRM
- **Intelligence** - AI-powered analytics across all your company data

**One login. One database. One invoice.**

---

## SECTION 2: The Problem We Solve

### Your data shouldn't live in 8 different places

**Without Buildwrk:**
```
Change Order Approved
    |
    +--> Manually update project budget in Procore
    +--> Manually create journal entry in Sage
    +--> Manually adjust contract value in Excel
    +--> Manually update cash flow projection in spreadsheet
    +--> Manually notify PM via email
    +--> Manually file documentation in SharePoint
    |
    Result: 30-60 minutes of work, 6 data entry points, 6 opportunities for error
```

**With Buildwrk:**
```
Change Order Approved (one click)
    |
    +--> Budget updated automatically
    +--> Journal entry created automatically (DR AR / CR Revenue)
    +--> Contract value adjusted automatically
    +--> Cash flow recalculated automatically
    +--> PM notified automatically
    +--> Audit trail logged automatically
    |
    Result: 5 seconds, zero manual entry, zero errors
```

### What this costs you today

| Pain Point | Annual Cost (est.) |
|-----------|-------------------|
| Manual data entry between systems | $25K-$50K in labor |
| Reconciliation errors caught late | $10K-$30K per incident |
| Software licenses (5-8 tools) | $150K-$378K |
| Training on multiple platforms | $10K-$25K |
| Delayed financial reporting | Unquantified (decisions made on stale data) |
| **Total** | **$195K-$483K/year** |

---

## SECTION 3: Platform Overview

### 19 Modules, One Platform

#### PROJECT MANAGEMENT
- **Gantt Chart** - Visual timeline with phases, tasks, dependencies, critical path analysis
- **Daily Logs** - Weather, workforce, equipment, activities, photo documentation
- **RFIs** - Request for Information tracking with status workflow and ball-in-court tracking
- **Submittals** - Specification compliance tracking with revision history
- **Change Orders** - Owner-initiated and cost change orders with automatic financial impact
- **Punch Lists** - Deficiency tracking through project closeout

#### FINANCIAL ACCOUNTING
- **Chart of Accounts** - GAAP-compliant, hierarchical, dynamically mapped (no hardcoded numbers)
- **Journal Entries** - Full double-entry bookkeeping with draft/posted/voided workflow
- **Invoicing (AR/AP)** - Customer billing and vendor bills with retainage and tax handling
- **Payments** - Payment recording with automatic AR/AP reduction and bank balance sync
- **Job Costing** - CSI-code budget lines with budgeted/committed/actual variance
- **Bank Reconciliation** - Statement matching with GL balance comparison
- **Financial Statements** - Income Statement, Balance Sheet, Cash Flow, Trial Balance, General Ledger
- **Financial Audit** - 9-point audit suite with A-F grading (trial balance, balance sheet equation, JE coverage, bank reconciliation, revenue recognition)

#### SAFETY & COMPLIANCE
- **Incident Reporting** - Severity classification, root cause, corrective actions
- **Safety Inspections** - Template-based audits with scoring and follow-up
- **Toolbox Talks** - Scheduled safety meetings with attendance tracking
- **Certifications** - Employee credential tracking with expiration alerts
- **OSHA Metrics** - Recordable incident rates, EMR calculations

#### EQUIPMENT MANAGEMENT
- **Inventory** - Equipment registry with purchase cost, hourly rate, location
- **Assignments** - Equipment allocation to projects with utilization tracking
- **Maintenance** - Scheduled and reactive maintenance with cost tracking
- **Depreciation** - Useful life, salvage value, monthly depreciation journal entries

#### PROPERTY MANAGEMENT
- **Properties & Units** - Portfolio tracking with occupancy rates
- **Leases** - Tenant management with rent schedules and auto-renewal
- **Maintenance Requests** - Work order management with priority and cost tracking
- **Financial Performance** - NOI, revenue vs. expenses, cash flow per property

#### CRM & BUSINESS DEVELOPMENT
- **Opportunity Pipeline** - Kanban board with drag-and-drop stage management
- **Bid Management** - Proposal tracking with win/loss analytics
- **Contact Management** - Customers, vendors, subcontractors with tagging and search

#### AI INTELLIGENCE
- **9 LLM Providers** - OpenAI, Anthropic, Google, Groq, Mistral, Cohere, DeepSeek, xAI, AWS Bedrock
- **Live Data Queries** - AI queries real project/financial/safety data, not generic responses
- **Budget Controls** - Per-provider monthly limits with usage tracking
- **Encrypted Storage** - API keys encrypted with AES-256-GCM at rest

#### PORTALS
- **Tenant Portal** - Lease documents, maintenance requests, payment history, announcements
- **Vendor Portal** - Contracts, invoices, payment status, compliance documents
- **Employee Portal** - Time tracking, certifications, pay stubs, clock in/out

#### MOBILE (PWA)
- **Time Clock** - GPS-enabled clock in/out from the field
- **Daily Logs** - Submit field reports with photos from mobile
- **Task Management** - View and update assigned tasks on-site
- **Executive Dashboard** - Real-time KPIs from anywhere

---

## SECTION 4: Financial Engine Deep Dive

### Audit-Ready Construction Accounting

**What makes our accounting different from QuickBooks:**

| Feature | QuickBooks | Buildwrk |
|---------|-----------|----------|
| Retainage tracking | Manual workaround | Automatic (separate JE lines, AR/AP aging) |
| Change order accounting | Manual journal entry | Auto-generated on approval |
| Job costing by CSI code | Not supported | Built-in with variance analysis |
| Progress billing | Basic | Percentage-of-completion with phase linking |
| Construction-specific CoA | Generic template | Industry-standard with GAAP accounts |
| Financial audit | None | 9-point audit suite with A-F grading |
| Multi-project P&L | Basic classes | Project-level journal entry tagging |

**9-Point Financial Audit Suite:**

| Check | What it validates |
|-------|-----------------|
| 1. Trial Balance | Total debits = Total credits |
| 2. Balance Sheet Equation | Assets = Liabilities + Equity + Retained Earnings |
| 3. Invoice JE Coverage | Every invoice has a corresponding journal entry |
| 4. Payment JE Coverage | Every payment has a corresponding journal entry |
| 5. Bank Reconciliation | GL cash balance matches bank statements (within 1%) |
| 6. Unposted Entries | No draft journal entries older than 7 days |
| 7. GL Mappings | All invoices have assigned GL accounts |
| 8. Orphaned JE Lines | All JE lines reference valid accounts |
| 9. Revenue Recognition | JEs created within 30 days of invoice date |

**Result: A grade from A (excellent) to F (critical issues) — instantly visible on your dashboard.**

---

## SECTION 5: Data Import & Onboarding

### Get up and running in under 10 minutes

**Step 1: Register** (2 minutes)
- Email, password, company name
- Select industry type and company size
- Choose modules to enable

**Step 2: Import your data** (5 minutes)
- Upload CSV files for any of 48 entity types
- System auto-maps projects, contacts, GL accounts
- Automatic journal entry generation for financial data
- Row-level error feedback for any issues

**Step 3: Start working** (immediate)
- Dashboard populated with KPIs
- Financial statements auto-generated
- Project timelines visible
- Team members can be invited

**Supported import formats:**
- CSV (all entities)
- Excel (XLSX)
- MS Project XML (schedules)
- Primavera P6 XER (schedules)
- QuickBooks (OAuth2 sync — coming soon)

**We also offer white-glove migration assistance for Enterprise customers.**

---

## SECTION 6: Security & Compliance

### Enterprise-grade security at every layer

| Layer | Protection |
|-------|-----------|
| **Data Isolation** | 461 Row-Level Security policies ensure Company A never sees Company B's data |
| **Authentication** | Supabase Auth with email/password (Google OAuth coming soon) |
| **Authorization** | 7 role levels: Owner, Admin, PM, Super, Accountant, Field Worker, Viewer |
| **Encryption** | AES-256-GCM for sensitive credentials; TLS 1.3 in transit |
| **Audit Trail** | Every action logged with user ID, timestamp, IP address, change details |
| **Portal Isolation** | Tenants, vendors, employees see only their assigned data |
| **Infrastructure** | Vercel (SOC 2 Type II), Supabase (SOC 2 Type II) |

**Role-Based Access Control:**

| Role | Projects | Financials | Safety | Equipment | Admin |
|------|----------|-----------|--------|-----------|-------|
| Owner | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Full | Full |
| Project Manager | Full | View | Full | Full | None |
| Superintendent | Assigned | None | Full | Assigned | None |
| Accountant | View | Full | None | View | None |
| Field Worker | Assigned | None | Report | Assigned | None |
| Viewer | View | View | View | View | None |

---

## SECTION 7: Pricing

### Simple, transparent pricing

| | Starter | Professional | Enterprise |
|---|---------|-------------|-----------|
| **Monthly** | **$99** | **$249** | **$499** |
| **Annual** | $79/mo | $199/mo | $399/mo |
| **Users** | Up to 5 | Up to 25 | Unlimited |
| **Active Projects** | 3 | 15 | Unlimited |
| **Storage** | 5 GB | 50 GB | 500 GB |
| **Modules** | PM + Safety + Docs | + Financial + Equipment + CRM | + Property + AI + Portals |
| **Support** | Email | Priority + Chat | Dedicated CSM |
| **Import** | CSV | CSV + Excel | + P6/MSP + QuickBooks |
| **Reports** | Dashboard | Full financial statements | + Custom + Audit suite |

**All plans include:**
- Unlimited data history
- Mobile PWA access
- SSL encryption
- Daily backups
- 99.9% uptime SLA

**Compare to alternatives:**
- Procore: $199-$375 **per user** per month
- Sage 300 CRE: $3,000-$8,000/month
- Buildertrend Pro: $499/month (no accounting)
- **Buildwrk Professional: $249/month (everything)**

---

## SECTION 8: Why Buildwrk

### Five reasons to switch

**1. One platform instead of five**
Stop paying for Procore + Sage + SafetyCulture + Box + ADP. Buildwrk replaces them all at 80-95% lower cost.

**2. Automatic financial entries**
When business events happen (change orders, payments, equipment purchases), journal entries are created automatically. No manual bookkeeping.

**3. AI that knows your projects**
Our AI doesn't give generic answers. It queries your actual project data, financial statements, and safety records to provide actionable insights.

**4. Field-ready mobile app**
Your crew clocks in, submits daily logs, and reports safety issues from their phones. Data flows to the office dashboard in real-time.

**5. Built for construction, not adapted**
We're not a generic project management tool with construction labels. Our chart of accounts, job costing, retainage tracking, and change order accounting are built for how construction actually works.

---

## SECTION 9: Getting Started

### Three ways to evaluate Buildwrk

**Option A: Self-Serve Trial**
- Register at construction-gamma-six.vercel.app
- Import a sample dataset or start with your own data
- Full access for 30 days

**Option B: Guided Demo**
- 30-minute live demo with a Buildwrk specialist
- We'll walk through your specific use case
- Import your data during the demo

**Option C: Pilot Program**
- 60-day pilot with white-glove onboarding
- We migrate your existing data
- Dedicated support throughout the pilot
- Enterprise tier at Starter pricing during pilot

**Contact**: [your-email]
**Phone**: [your-phone]
**Web**: [buildwrk.com](https://buildwrk.com)

---

*Copyright 2026 Buildwrk. All rights reserved.*
