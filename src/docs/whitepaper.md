# Buildwrk

## The Unified Construction & Property Management Platform

**Whitepaper v1.0 | February 2026**

A Donkey Ideas Portfolio Company

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Company Overview](#2-company-overview)
3. [Problem & Solution](#3-problem--solution)
4. [Product Description & Technology Architecture](#4-product-description--technology-architecture)
5. [Business Model](#5-business-model)
6. [Market Analysis](#6-market-analysis)
7. [Competitive Landscape](#7-competitive-landscape)
8. [Roadmap & Milestones](#8-roadmap--milestones)
9. [Financial Projections](#9-financial-projections)
10. [Unit Economics](#10-unit-economics)
11. [Legal & Regulatory](#11-legal--regulatory)

---

# 1. Executive Summary

**Buildwrk** is an enterprise-grade, all-in-one SaaS platform that unifies construction project management, property management, and full double-entry accounting into a single system. Built on modern cloud infrastructure, Buildwrk eliminates the data silos, integration headaches, and compounding software costs that plague the construction industry today.

### The Problem

Construction is the second least digitized major industry globally (McKinsey Global Institute). The average mid-market contractor uses 5-8 disconnected software tools to manage projects, finances, properties, safety, and compliance. This fragmentation contributes to 98% of megaprojects experiencing cost overruns or delays, with the average project exceeding its budget by 16-80%. The result is an estimated $1.6 trillion in annual productivity losses worldwide.

### The Solution

Buildwrk replaces the entire fragmented software stack with one unified platform spanning 20+ integrated modules - from Gantt-chart project scheduling and OSHA-compliant safety tracking to CSI MasterFormat accounting and tenant portal management. Four specialized portals (Executive, Tenant, Vendor, Super Admin) serve every stakeholder in the construction value chain through a single subscription.

### What We've Built

The platform is fully developed and deployment-ready:

| Metric | Count |
|--------|-------|
| Application Pages | 114 |
| API Endpoints | 118 |
| Database Tables | 69+ |
| Security Policies | 280+ |
| AI Provider Integrations | 9 |
| User Role Types | 7 |

### The Opportunity

The construction management software market is valued at $10.64 billion in 2025, growing at 8.9% CAGR to $17.72 billion by 2031 (Mordor Intelligence). Combined with the property management software market ($3.61 billion in 2025, 6.4% CAGR), Buildwrk addresses a $14+ billion combined market with a single platform - a positioning no current competitor offers.

### The Ask

Buildwrk is seeking **$750K - $1.25M in pre-seed funding** to acquire its first 25 customers, build go-to-market operations, and achieve product-market fit. With the product already built, 100% of investment goes toward customer acquisition and revenue generation.

---

# 2. Company Overview

## About Buildwrk

Buildwrk is a cloud-based construction and property management platform developed as a portfolio company under **Donkey Ideas**. The platform was purpose-built to address the critical software fragmentation problem in the construction industry by providing a single, integrated solution that covers the entire construction business lifecycle - from pre-construction bidding through project execution to long-term property management.

## Mission Statement

**To digitize and unify construction operations for mid-market contractors, eliminating the cost, complexity, and data loss caused by fragmented software ecosystems.**

Construction companies should focus on building - not on managing a patchwork of disconnected tools, duplicate data entry, and broken integrations. Buildwrk exists to give every construction professional - from the field worker on-site to the accountant in the office - one shared source of truth.

## Vision

**To become the operating system for construction and real estate companies - the single platform where every project, property, person, and dollar is managed, tracked, and optimized.**

We envision a future where:
- A superintendent completes a daily log on-site that automatically updates project financials in real-time
- A property manager sees maintenance requests, lease renewals, and NOI calculations in one dashboard
- An owner views portfolio-wide performance across all projects and properties with AI-powered insights
- A tenant submits a maintenance request that triggers automated workflows, vendor assignments, and cost tracking

## Core Values

### Security First
Every row of data is protected by 280+ row-level security policies. Multi-tenant isolation is enforced at the database level, not the application level. We don't just build features - we build trust.

### Construction-Industry Native
We don't adapt generic project management tools for construction. Our chart of accounts uses CSI MasterFormat divisions. Our daily logs track weather, workforce counts, and equipment hours. Our safety module tracks OSHA recordability. Every feature speaks the language of construction.

### AI-Augmented, Not AI-Replaced
We integrate 9 AI providers (OpenAI, Anthropic, Google Gemini, and more) to augment human decision-making - extracting document metadata, powering intelligent search, and providing predictive insights. The human expert remains in control.

### Unified by Design
We don't bolt modules together with fragile integrations. Project costs flow into the general ledger. Lease payments update property NOI. Equipment assignments link to project budgets. Data flows naturally because the system was designed as one platform from day one.

---

# 3. Problem & Solution

## Problem Statement

### The Fragmentation Crisis

The construction industry generates $13 trillion in annual global output, yet it remains the second least digitized major industry worldwide (McKinsey Global Institute). This isn't because technology doesn't exist - it's because the available solutions create as many problems as they solve.

**The typical mid-market contractor (50-500 employees) operates with a fragmented software stack:**

| Function | Typical Tool | Monthly Cost |
|----------|-------------|--------------|
| Project Management | Procore | $375 - $2,500/mo |
| Accounting | QuickBooks/Sage | $100 - $500/mo |
| Property Management | AppFolio/Buildium | $200 - $800/mo |
| Safety & Compliance | iAuditor/SafetyCulture | $100 - $300/mo |
| Equipment Tracking | Spreadsheets/EAM | $50 - $200/mo |
| Time & Attendance | TSheets/Clockify | $50 - $200/mo |
| Document Management | Box/Dropbox | $50 - $200/mo |
| CRM & Bids | Spreadsheets/HubSpot | $50 - $500/mo |
| **Total** | **5-8 tools** | **$975 - $5,200/mo** |

This fragmentation creates five critical problems:

**1. Data Silos Kill Visibility**
When project data lives in Procore, financial data in QuickBooks, and property data in AppFolio, no one has a complete picture. An owner cannot see how a project change order affects company cash flow without manual cross-referencing across systems.

**2. Duplicate Data Entry Wastes Time**
The same information - contacts, project details, cost codes, vendor records - is entered into multiple systems. Industry research shows construction professionals spend an average of 90 hours per month searching for information across disconnected platforms.

**3. Integration Failures Create Risk**
Third-party integrations between tools are fragile, expensive to maintain, and create single points of failure. When the QuickBooks-Procore sync breaks, financial reporting stops until IT intervenes.

**4. Cost Compounds Rapidly**
Each tool charges separately, often per-user. As the team grows, software costs scale linearly across every platform. A 100-person company can easily spend $60,000-$120,000 per year on construction software.

**5. Compliance Gaps Emerge**
Safety incidents, OSHA requirements, certification expirations, and insurance documentation scatter across systems. When an auditor arrives, assembling a complete compliance picture requires pulling data from 4-5 different platforms.

### The Cost of Inaction

The consequences of this fragmentation are staggering:

- **98% of megaprojects** experience cost overruns or delays (McKinsey)
- **Projects exceed budgets by 16-80%** on average, with only 31% finishing within 10% of budget
- **Large projects run 20% longer** than scheduled
- Construction productivity has remained **flat for 20+ years** while manufacturing productivity has grown 100%
- The industry loses an estimated **$1.6 trillion annually** to poor productivity

## Market Opportunity

The construction management software market is valued at **$10.64 billion in 2025**, growing to **$17.72 billion by 2031** at an **8.9% CAGR** (Mordor Intelligence). The property management software market adds another **$3.61 billion in 2025**, growing at **6.4% CAGR** (Grand View Research).

Three macro trends are accelerating adoption:

1. **Generational shift**: Millennials and Gen-Z entering construction management expect cloud-native, mobile-first tools - not desktop software from the 2000s
2. **Regulatory pressure**: OSHA electronic recordkeeping requirements, prevailing wage compliance, and ESG reporting demand digital solutions
3. **Labor shortage**: With 650,000+ unfilled construction positions in the US, companies must do more with fewer people - technology is the only lever

**The critical gap in the market**: No existing platform unifies construction project management AND property management AND full double-entry accounting in a single product. Buildwrk fills this gap.

## Solution

### Buildwrk: One Platform, Every Function

Buildwrk replaces the fragmented stack with a single, unified platform purpose-built for construction and real estate companies. Every module shares the same database, the same security model, and the same user interface.

**What makes Buildwrk different:**

| Capability | Traditional Approach | Buildwrk |
|-----------|---------------------|----------|
| Project + Finance | Procore + QuickBooks (separate, synced) | Unified - project costs flow directly into GL |
| Project + Property | Separate systems entirely | Same platform - convert completed projects to managed properties |
| Safety + Compliance | iAuditor + spreadsheets | Built-in OSHA tracking, cert management, audit trails |
| Field + Office | Mobile app + desktop app (different vendors) | Responsive web + mobile interface, same data |
| Multi-stakeholder | Separate portals per vendor | 4 native portals (Executive, Tenant, Vendor, Super Admin) |
| AI Capabilities | Bolt-on AI tools | 9 AI providers built-in, context-aware |

**Core principle**: Data entered once, available everywhere. A change order on a project automatically updates the project budget, affects the general ledger, and is visible in cash flow projections. No sync. No export/import. No duplicate entry.

---

# 4. Product Description & Technology Architecture

## Platform Overview

Buildwrk is a fully developed, cloud-deployed SaaS platform with **114 application pages**, **118 API endpoints**, and **69+ database tables** protected by **280+ row-level security policies**. The platform is live and accessible at `buildwrk.com` (deployment URL: construction-gamma-six.vercel.app).

## Module Inventory

### Project Management
| Feature | Description |
|---------|-------------|
| **Projects Dashboard** | Portfolio view with status tracking (pre-construction, active, on-hold, completed) |
| **Gantt Charts** | Interactive project scheduling with critical path analysis |
| **Task Management** | Hierarchical tasks with dependencies, milestones, and parent-child relationships |
| **Project Phases** | Phase-based organization with scheduling and progress tracking |
| **Daily Logs** | Site reports capturing weather conditions, workforce counts, equipment hours, and safety observations |
| **RFIs** | Request for Information workflow with cost and schedule impact tracking |
| **Change Orders** | Change order management with approval workflows and budget impact |
| **Submittals** | Document submission tracking and approval workflow |
| **Punch Lists** | Final completion items with photo documentation and verification |
| **Project Budgets** | CSI MasterFormat-coded budget lines with budget vs. actual variance tracking |

### Property Management
| Feature | Description |
|---------|-------------|
| **Property Portfolio** | Multi-property dashboard with occupancy rates and NOI calculations |
| **Unit Management** | Individual unit tracking within properties with status and tenant assignment |
| **Lease Management** | Full lease lifecycle with auto-renewal support and term tracking |
| **Rent Payments** | Payment tracking with late fee calculation and payment history |
| **Maintenance Requests** | Work order system with priority routing and tenant-initiated requests |
| **Tenant Portal** | Self-service portal for tenants to view leases, submit maintenance requests, and make payments |
| **Tenant Announcements** | Per-property announcement broadcasting to tenants |

### Financial Management
| Feature | Description |
|---------|-------------|
| **Double-Entry Accounting** | Full general ledger with journal entries and debit/credit line items |
| **Chart of Accounts** | Hierarchical COA seeded with 40+ CSI MasterFormat construction accounts |
| **Accounts Receivable** | Invoice management with aging reports and payment tracking |
| **Accounts Payable** | Vendor invoice processing with approval workflows |
| **Bank Reconciliation** | Transaction matching and bank statement reconciliation |
| **Cash Flow Analysis** | Cash flow forecasting and historical analysis |
| **Income Statement** | Revenue and expense reporting by period |
| **Balance Sheet** | Asset, liability, and equity position reporting |
| **Job Costing** | Project-level cost tracking with CSI code allocation |
| **Budget Management** | Fiscal year budgets with monthly allocation and variance tracking |
| **KPI Dashboard** | Financial key performance indicators with visual charts |

### Safety & Compliance
| Feature | Description |
|---------|-------------|
| **Safety Dashboard** | Company-wide safety metrics and trend analysis |
| **Incident Reporting** | OSHA-recordable incident tracking with severity classification (near miss, injury, OSHA recordable) |
| **Safety Inspections** | Inspection checklists (daily, weekly, OSHA) with finding documentation |
| **Toolbox Talks** | Safety meeting scheduling with attendance tracking |
| **Certification Tracking** | License and certification management with expiration alerts (OSHA, First Aid, CPR) |
| **Audit Trail** | Immutable audit log for all compliance-related actions |

### Equipment Management
| Feature | Description |
|---------|-------------|
| **Equipment Inventory** | Fleet tracking for tools, vehicles, and heavy equipment |
| **Equipment Assignments** | Project and personnel assignment tracking |
| **Maintenance Logs** | Service records and preventive maintenance scheduling |

### CRM & Business Development
| Feature | Description |
|---------|-------------|
| **Opportunities Pipeline** | Sales pipeline with weighted value calculation and stage tracking |
| **Bid Management** | Bid proposals with cost estimation and margin percentage tracking |
| **CRM Dashboard** | Pipeline analytics and conversion metrics |

### Document Management
| Feature | Description |
|---------|-------------|
| **Document Library** | Centralized document storage with metadata and categorization |
| **Plan Room** | Construction drawing viewer organized by discipline (Architectural, Structural, MEP, Civil, Landscape) |
| **PDF Markup** | Interactive annotation tools (line, rectangle, circle, text, arrow, cloud) with normalized coordinates |
| **Revision Tracking** | Drawing version management with current/superseded status |
| **Shared Documents** | Secure document sharing with tenants and vendors through portal access |

### AI & Automation
| Feature | Description |
|---------|-------------|
| **AI Assistant** | Multi-provider AI chat with context-aware responses |
| **9 AI Providers** | OpenAI, Anthropic (Claude), Google Gemini, Groq, Mistral, Cohere, xAI (Grok), Amazon Bedrock, DeepSeek |
| **Document AI** | AI-extracted metadata from uploaded documents |
| **Usage Tracking** | Token counting, cost estimation, and monthly budget limits per provider |
| **Automation Rules** | Trigger-based workflow automation (entity created, status changed, field updated, scheduled) |
| **Automation Logging** | Execution history with timing metrics and error tracking |

### Contracts
| Feature | Description |
|---------|-------------|
| **Contract Management** | Subcontractor, purchase order, and service agreement tracking |
| **Milestone Tracking** | Contract milestones with completion dates and payment triggers |
| **Vendor Contracts** | Insurance and bond tracking for subcontractor compliance |

### People & Time
| Feature | Description |
|---------|-------------|
| **Contact Management** | Unified directory for employees, vendors, subcontractors, clients, and tenants |
| **Time Tracking** | Clock in/out with GPS location tracking for field workers |
| **Certification Management** | License tracking with expiration status (expired, expiring soon, valid) |

### Communications
| Feature | Description |
|---------|-------------|
| **Internal Messaging** | Direct messaging between users with threading |
| **Ticket System** | Internal issue tracking with priority and status management |
| **Notifications** | System notifications for approvals, mentions, deadlines, and alerts |
| **Calendar** | Event management and scheduling |

### Reporting
| Feature | Description |
|---------|-------------|
| **Portfolio Reports** | Multi-property performance analysis |
| **Financial Summary** | Company-wide financial overview |
| **Aging Reports** | Receivables and payables aging analysis |
| **Project Performance** | Budget vs. actual, schedule adherence, and completion metrics |

### Data Management
| Feature | Description |
|---------|-------------|
| **CSV/XLSX Import** | Bulk import for projects, leases, maintenance, submittals, and properties |
| **Data Export** | Report and financial statement export capabilities |
| **Global Search** | Cross-module search across the entire platform |

## Portal Architecture

Buildwrk serves every stakeholder through four specialized portals:

### 1. Executive Portal (56 pages)
The primary workspace for company owners, managers, and office staff. Full access to all modules based on role permissions. Includes dashboards, project management, financial tools, reports, and administration.

### 2. Tenant Portal (8 pages)
Self-service interface for property tenants. View lease details, submit maintenance requests, view announcements, access shared documents, track payments, and manage profile. Tenants only see their own data.

### 3. Vendor Portal (10 pages)
Contractor and vendor workspace. View assigned contracts and projects, submit invoices, upload compliance documents (insurance, certifications), track payments, and manage profile. Vendors only see their own assignments.

### 4. Super Admin Portal (7 pages)
Platform-level management for SaaS administration. Manage all companies, users, subscriptions, platform announcements, content management, and SEO. Reserved for platform operators.

## Technology Stack

### Architecture

```
                    +-----------------+
                    |   Vercel CDN    |
                    |  (Edge Network) |
                    +--------+--------+
                             |
                    +--------v--------+
                    |   Next.js 16    |
                    |  (App Router +  |
                    |   Turbopack)    |
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v----+  +-----v------+  +----v--------+
     |  Supabase   |  |  Vercel AI |  |   Stripe    |
     | (Postgres + |  |    SDK     |  |  (Payments) |
     |    RLS +    |  | (9 LLM     |  +-------------+
     |   Auth +    |  | Providers) |
     |  Storage)   |  +------------+
     +-------------+
```

### Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16.1.6 + React 19 | Server-side rendering, App Router, Turbopack |
| **Language** | TypeScript 5.9 | Full type safety across client and server |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with real-time subscriptions |
| **Authentication** | Supabase Auth | Email/password authentication with session management |
| **Security** | Row-Level Security (RLS) | 280+ database-level security policies |
| **AI Integration** | Vercel AI SDK | Unified interface for 9 LLM providers |
| **Payments** | Stripe | Subscription billing, checkout, and webhooks |
| **UI Framework** | Tailwind CSS + Radix UI | Accessible component library with utility-first styling |
| **Data Tables** | TanStack Table | Sorting, filtering, pagination for data-heavy views |
| **Charts** | Recharts | Financial dashboards and analytics visualizations |
| **Forms** | React Hook Form + Zod | Validated forms with schema-based validation |
| **PDF Processing** | react-pdf + pdfjs-dist | Plan room document viewer with annotation support |
| **Data Import** | XLSX library | CSV and Excel file processing for bulk imports |
| **Hosting** | Vercel | Global edge deployment with automatic scaling |

### Security Architecture

**Multi-Tenant Data Isolation**

Every database table enforces tenant isolation through PostgreSQL Row-Level Security (RLS). Data access is controlled by three helper functions:

- `get_company_ids()` - Returns all company IDs the authenticated user belongs to
- `has_role(company_id, roles[])` - Validates user roles within a specific company
- `is_platform_admin()` - Checks platform-level administrator status

This means data isolation is enforced at the **database engine level**, not the application level. Even if application code contains a bug, the database will never return another tenant's data.

**Role-Based Access Control (7 Roles)**

| Role | Access Level |
|------|-------------|
| **Owner** | Full access including company deletion and billing |
| **Admin** | Full access except company deletion |
| **Project Manager** | Projects, properties, CRM, documents, financial read-only |
| **Superintendent** | Projects, daily logs, safety, documents |
| **Accountant** | Financial tables, invoices, payments, GL |
| **Field Worker** | Self-service time entries, daily logs |
| **Viewer** | Read-only access to projects, documents, reports |

**Additional Security Features:**
- Configurable password policies per company
- Two-factor authentication requirement by role
- IP allowlist support
- Active session monitoring with concurrent session limits
- Login history audit trail
- Immutable audit log for all data modifications
- Encrypted AI provider API key storage (pgcrypto)

### Database Schema

The database consists of 69+ tables organized across 10 migrations with comprehensive indexing (60+ indexes) and 6 generated/computed columns for real-time calculations:

- **Properties**: `occupancy_rate` (auto-calculated from occupied/total units)
- **Properties**: `noi` (Net Operating Income = monthly revenue - monthly expenses)
- **Invoices**: `balance_due` (total amount - amount paid)
- **Opportunities**: `weighted_value` (estimated value x probability)
- **Bids**: `margin_pct` (bid amount - cost / bid amount)
- **Project Budget Lines**: `variance` (budgeted - actual)

---

# 5. Business Model

## Revenue Model

Buildwrk operates on a **SaaS subscription model** with three tiers designed to match company size and feature requirements:

### Pricing Tiers

| Feature | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| **Monthly Price** | **$99/mo** | **$299/mo** | **$599/mo** |
| **Annual Price** | $79/mo (billed annually) | $249/mo (billed annually) | $499/mo (billed annually) |
| Users | Up to 10 | Up to 50 | Unlimited |
| Projects | Up to 5 | Up to 25 | Unlimited |
| Properties | Up to 10 | Up to 50 | Unlimited |
| Storage | 10 GB | 50 GB | 250 GB |
| AI Assistant | Basic (1 provider) | Standard (3 providers) | Full (9 providers) |
| Plan Room | View only | Markup + annotations | Full revision management |
| Portals | Executive only | Executive + Tenant | All 4 portals |
| Automation | - | Basic rules | Advanced rules + scheduling |
| Support | Email | Priority email + chat | Dedicated account manager |
| Onboarding | Self-service | Guided setup | White-glove migration |

### Revenue Streams

1. **Subscription Revenue** (Primary - 85% of revenue)
   - Monthly or annual SaaS subscriptions across three tiers
   - Annual contracts receive 20% discount, improving cash flow predictability

2. **Overage & Add-On Revenue** (10% of revenue)
   - Additional storage beyond tier limits
   - Additional AI usage beyond monthly budgets
   - Premium integrations (QuickBooks, Sage)

3. **Professional Services** (5% of revenue)
   - Data migration from legacy systems
   - Custom onboarding and training
   - Configuration and setup assistance

### Pricing Strategy

**Competitive positioning**: Buildwrk replaces $975-$5,200/month in combined tool costs with a single $99-$599/month subscription. Even at the Enterprise tier, customers save 40-80% compared to their current fragmented stack.

**Land and expand**: Start customers on Starter to prove value, then expand to Professional as their team grows and they adopt more modules. The unified platform creates natural expansion triggers - a company using project management will naturally want to add financial management, then property management.

**Free trial**: 14-day full-access trial with sample data to demonstrate the platform's breadth without requiring setup effort.

## Go-to-Market Strategy

### Phase 1: Foundation (Months 1-6)

**Target**: General contractors and construction companies with 50-200 employees in the Southeastern US

**Channels:**
1. **Direct outreach** to construction company owners through LinkedIn, industry associations (AGC, ABC, NAHB), and local builder groups
2. **Content marketing** focused on construction pain points: "How much does software fragmentation cost your company?" and "The hidden cost of managing 5+ construction tools"
3. **Live demo environment** with realistic sample data enabling self-serve evaluation
4. **Partnership** with local construction associations for co-marketing and referral programs

### Phase 2: Growth (Months 7-12)

**Target**: Expand to property management companies and design-build firms

**Channels:**
1. **Trade show presence** at regional construction events (World of Concrete, CONEXPO-CON/AGG)
2. **Referral program** offering existing customers one month free for successful referrals
3. **Case studies** documenting ROI from early customers (target: 3-5 published case studies)
4. **SEO-driven content** targeting high-intent keywords: "construction project management software", "all-in-one construction ERP"

### Phase 3: Scale (Year 2+)

**Target**: National expansion, mid-market contractors (200-500 employees)

**Channels:**
1. **Inside sales team** (2-3 SDRs) for outbound prospecting
2. **Channel partnerships** with construction accounting firms and consultants
3. **Integration marketplace** with QuickBooks, Sage, and scheduling tools driving inbound leads
4. **Industry analyst coverage** (Capterra, G2, Software Advice rankings)

---

# 6. Market Analysis

## Target Market

### Primary: Mid-Market Construction Companies (50-500 employees)

The US construction industry comprises **814,000+ firms with employees** and 3.7 million total construction businesses (US Census Bureau). Our primary target is the mid-market segment: companies large enough to need professional software but not large enough for enterprise solutions like Oracle Primavera or SAP.

**Ideal Customer Profile:**
- General contractor or construction management firm
- 50-500 employees
- $10M - $500M annual revenue
- Currently using 3+ disconnected software tools
- Manages both active construction projects and owned/managed properties
- Located in the United States (initial market)

**Why this segment:**
- Large enough to afford SaaS pricing ($299-$599/mo is immaterial to a $50M+ company)
- Small enough that Procore's pricing ($10,000-$60,000/year) feels expensive for what they get
- Often run by owner-operators who feel the fragmentation pain daily
- Underserved by current solutions that target either large enterprises or small residential builders

### Secondary: Property Management Companies

Companies managing commercial and multifamily properties who also handle renovation, maintenance, and capital improvement projects. These firms benefit uniquely from Buildwrk's unified project + property management.

### Tertiary: Design-Build Firms

Companies that handle both design and construction, requiring project management through the full lifecycle from pre-construction through property management.

## Market Size

### Construction Management Software

| Metric | Value | Source |
|--------|-------|--------|
| Global Market Size (2025) | $10.64 billion | Mordor Intelligence |
| Projected Size (2031) | $17.72 billion | Mordor Intelligence |
| CAGR | 8.9% | Mordor Intelligence |
| North America Share | 32.1% of global | Mordor Intelligence |
| North America Market (2025) | ~$3.4 billion | Calculated |

### Property Management Software

| Metric | Value | Source |
|--------|-------|--------|
| Global Market Size (2025) | $3.61 billion | Grand View Research |
| Projected Size (2033) | $7.8 billion | Allied Market Research |
| CAGR | 6.4% - 8.9% | Grand View Research / Allied |

### Buildwrk's Addressable Market

| Level | Definition | Size |
|-------|-----------|------|
| **TAM** | Global construction + property management software | $14.25 billion (2025) |
| **SAM** | US mid-market construction companies needing unified solutions | ~$2.1 billion |
| **SOM** | Achievable market in first 3 years (500 companies at $3,600 avg ARR) | $1.8 million ARR |

## Market Trends

### 1. Cloud Adoption Accelerating
The COVID-19 pandemic permanently shifted construction's attitude toward cloud software. Remote collaboration, mobile access, and real-time data are now expected, not optional. Cloud-based construction management is growing 2x faster than on-premise solutions.

### 2. AI Integration Becoming Table Stakes
Construction companies are increasingly expecting AI capabilities in their software - from document classification to predictive analytics. Buildwrk's integration of 9 AI providers positions it at the forefront of this trend.

### 3. Consolidation Demand
After years of adding point solutions, construction companies are experiencing "tool fatigue." There is a clear market pull toward consolidated platforms that reduce integration burden and total cost of ownership.

### 4. Regulatory Digitization
OSHA's electronic recordkeeping requirements, prevailing wage compliance needs, and emerging ESG reporting mandates are forcing even technology-resistant contractors to adopt digital solutions.

### 5. Labor Shortage Driving Efficiency
With 650,000+ unfilled construction positions in the US, companies must extract more productivity from existing teams. Software that eliminates duplicate data entry and automates workflows directly addresses this constraint.

### 6. Generational Transition
As baby boomer owners retire and millennials assume leadership, construction companies are more willing to invest in modern, cloud-native technology. This generational shift is creating a wave of software adoption decisions.

---

# 7. Competitive Landscape

## Competitive Analysis

### Direct Competitors

| Competitor | Focus Area | Pricing | Strengths | Weaknesses |
|-----------|-----------|---------|-----------|------------|
| **Procore** | Project Management | $10K-$60K/year | Market leader, unlimited users, extensive integrations | No accounting, no property mgmt, expensive for mid-market |
| **Buildertrend** | Residential Construction | $99-$599/mo | Good for residential, client portal | Limited commercial features, no property mgmt, no accounting |
| **Fieldwire** | Field Operations | $39/user/mo | Strong mobile, offline mode, plan markup | Narrow focus (field only), no financials, acquired by Hilti |
| **CoConstruct** | Custom Home Builders | Custom pricing | Excellent client communication | Niche (custom homes), merged into Buildertrend |
| **Sage 300 CRE** | Construction Accounting | $10K+/year | Deep accounting, industry standard | Legacy desktop software, poor UX, no project mgmt |
| **AppFolio** | Property Management | $1.40/unit/mo | Property-focused, tenant portal | No construction features at all |
| **Buildium** | Property Management | $52-$479/mo | Simple property mgmt | No construction, limited for commercial |

### Competitive Positioning Map

```
                    Comprehensive Features
                           |
          Sage 300 CRE     |     BUILDWRK
          (Legacy/Desktop) |     (Modern/Unified)
                           |
    Simple ----------------+---------------- Complex
                           |
          Fieldwire        |     Procore
          (Field Only)     |     (PM Only, Expensive)
                           |
                    Limited Features
```

## Competitive Advantages

### 1. The Only Unified Platform
No competitor combines construction project management, property management, and full double-entry accounting in a single product. Procore requires QuickBooks for accounting. AppFolio has zero construction features. Sage has no modern project management. Buildwrk does it all.

### 2. Modern Technology Stack
While competitors like Sage run on legacy desktop architectures and Procore was built on Ruby on Rails over a decade ago, Buildwrk is built on Next.js 16 with React 19 - the most modern web framework available. This translates to faster performance, easier feature development, and lower maintenance costs.

### 3. AI-Native Architecture
Buildwrk was built with AI integration from the ground up, supporting 9 providers with per-task model selection, cost tracking, and budget controls. Competitors are retrofitting AI into legacy codebases - a fundamentally slower approach.

### 4. Multi-Portal Architecture
Four purpose-built portals (Executive, Tenant, Vendor, Super Admin) serve every stakeholder type. Competitors typically offer one or two portal types, requiring customers to cobble together separate solutions for vendor and tenant access.

### 5. Construction-Native Accounting
The chart of accounts is seeded with 40+ CSI MasterFormat division codes, and project budget lines use the same cost codes. This means construction-specific financial reporting works out of the box - no configuration or customization required.

### 6. Security by Design
280+ row-level security policies enforced at the PostgreSQL engine level provide stronger data isolation than application-level security used by most competitors. This is an enterprise-grade security posture from day one.

### 7. Aggressive Pricing
At $99-$599/month, Buildwrk costs 60-90% less than assembling equivalent functionality from separate tools. Compared to Procore alone ($10K-$60K/year), Buildwrk's Enterprise tier ($7,188/year) delivers more features at a fraction of the cost.

---

# 8. Roadmap & Milestones

## Completed Milestones

| Milestone | Status | Details |
|-----------|--------|---------|
| Core platform development | COMPLETE | 114 pages, 118 APIs, 69+ tables |
| Multi-tenant architecture | COMPLETE | 280+ RLS policies, 7-role RBAC |
| Project management module | COMPLETE | Gantt, tasks, daily logs, RFIs, change orders, submittals, punch lists |
| Property management module | COMPLETE | Leases, units, maintenance, rent payments, tenant portal |
| Financial management module | COMPLETE | Double-entry GL, AR/AP, bank reconciliation, CSI chart of accounts |
| Safety & compliance module | COMPLETE | OSHA incidents, inspections, toolbox talks, certifications |
| Equipment management | COMPLETE | Inventory, assignments, maintenance logs |
| CRM & bid management | COMPLETE | Opportunity pipeline, bid proposals |
| Document management & plan room | COMPLETE | PDF viewer, markup annotations, drawing sets, revision tracking |
| AI integration | COMPLETE | 9 providers, conversation history, usage tracking |
| Automation engine | COMPLETE | Rules, triggers, execution logging |
| Import/export system | COMPLETE | CSV/XLSX import for projects, leases, properties, maintenance, submittals |
| Stripe billing integration | COMPLETE | Checkout, customer portal, webhook processing |
| 4 portal types | COMPLETE | Executive, Tenant, Vendor, Super Admin |
| Cloud deployment | COMPLETE | Live on Vercel with global CDN |

## Product Roadmap

### Q1 2026 (Months 1-3) - Foundation for Launch

| Initiative | Description | Priority |
|-----------|-------------|----------|
| Automated test suite | Unit, integration, and E2E test coverage for critical paths | Critical |
| Live demo environment | Self-serve demo with realistic construction company sample data | Critical |
| Onboarding flow | Guided setup wizard with data migration assistance | High |
| Performance optimization | Load testing, query optimization, caching layer | High |

### Q2 2026 (Months 4-6) - First Customers

| Initiative | Description | Priority |
|-----------|-------------|----------|
| QuickBooks Online integration | Two-way sync of chart of accounts, journal entries, invoices | Critical |
| Mobile PWA | Installable progressive web app for field workers with offline support | High |
| SOC 2 Type I preparation | Security controls documentation and audit readiness | High |
| Customer onboarding (10 target) | Hands-on onboarding of first paying customers | Critical |

### Q3-Q4 2026 (Months 7-12) - Product-Market Fit

| Initiative | Description | Priority |
|-----------|-------------|----------|
| Estimating module | Cost estimation and takeoff tools for pre-construction | High |
| E-signature integration | DocuSign/HelloSign for contracts, change orders, submittals | Medium |
| Weather API integration | Auto-populate daily logs with local weather data | Medium |
| Photo documentation | GPS-stamped, timestamped site photos linked to daily logs | Medium |
| Real-time collaboration | WebSocket-based updates for multi-user plan room and dashboards | Medium |
| Customer expansion (25 target) | Scale to 25 paying customers with case study documentation | Critical |

### 2027 - Scale

| Initiative | Description | Priority |
|-----------|-------------|----------|
| Native mobile app | React Native app for iOS and Android | High |
| Sage 300 CRE integration | Import/export with legacy construction accounting systems | Medium |
| Scheduling integration | P6 and MS Project import/export for schedule management | Medium |
| Custom report builder | User-configurable reports with PDF/Excel export | High |
| Subcontractor prequalification | Insurance cert tracking, EMR verification, bonding capacity | Medium |
| Multi-language support | Spanish language UI for field worker accessibility | Medium |
| Series A preparation | Metrics, materials, and process for Series A fundraise | Critical |
| Customer target: 100+ | Scale customer base through inside sales and marketing | Critical |

### 2028+ - Market Leadership

| Initiative | Description | Priority |
|-----------|-------------|----------|
| BIM integration | Autodesk Revit and IFC file support | Medium |
| GIS/mapping | Project location visualization and geospatial analysis | Low |
| Analytics platform | Advanced business intelligence and predictive analytics | Medium |
| Marketplace | Third-party integration marketplace | Medium |
| International expansion | Multi-currency, localization for international markets | Low |

## Key Performance Indicators (KPIs)

| Metric | Month 6 | Month 12 | Month 24 |
|--------|---------|----------|----------|
| Paying customers | 10 | 25 | 150 |
| Monthly Recurring Revenue (MRR) | $3,000 | $7,500 | $45,000 |
| Annual Run Rate (ARR) | $36,000 | $90,000 | $540,000 |
| Net Revenue Retention | N/A | >100% | >110% |
| Monthly Churn | <5% | <3% | <2% |

---

# 9. Financial Projections

## Revenue Projections

### Year 1 (2026)

| Quarter | New Customers | Total Customers | Avg MRR/Customer | Total MRR | Notes |
|---------|--------------|----------------|-------------------|-----------|-------|
| Q1 | 0 | 0 | - | $0 | Product hardening, demo prep |
| Q2 | 5 | 5 | $299 | $1,495 | First customers, mostly Professional tier |
| Q3 | 8 | 13 | $299 | $3,887 | Expansion, word-of-mouth begins |
| Q4 | 12 | 25 | $299 | $7,475 | Trade show leads converting |

**Year 1 Total Revenue: ~$38,000**
**Year 1 ARR (exit rate): $89,700**

### Year 2 (2027)

| Quarter | New Customers | Total Customers | Avg MRR/Customer | Total MRR | Notes |
|---------|--------------|----------------|-------------------|-----------|-------|
| Q1 | 20 | 45 | $325 | $14,625 | Upsells to Enterprise begin |
| Q2 | 25 | 70 | $340 | $23,800 | Inside sales team productive |
| Q3 | 35 | 105 | $350 | $36,750 | Content marketing driving inbound |
| Q4 | 45 | 150 | $360 | $54,000 | Referral program active |

**Year 2 Total Revenue: ~$387,000**
**Year 2 ARR (exit rate): $648,000**

### Year 3 (2028)

| Quarter | New Customers | Total Customers | Avg MRR/Customer | Total MRR | Notes |
|---------|--------------|----------------|-------------------|-----------|-------|
| Q1 | 60 | 210 | $370 | $77,700 | Series A fundraise |
| Q2 | 75 | 285 | $380 | $108,300 | Expanded sales team |
| Q3 | 90 | 375 | $385 | $144,375 | Channel partnerships contributing |
| Q4 | 125 | 500 | $390 | $195,000 | Market awareness strong |

**Year 3 Total Revenue: ~$1,582,000**
**Year 3 ARR (exit rate): $2,340,000**

## Expense Projections

### Year 1 Monthly Burn Rate

| Category | Monthly Cost | Annual Cost | % of Budget |
|----------|-------------|------------|-------------|
| Engineering (founder + 1 hire) | $15,000 | $180,000 | 25% |
| Sales & Business Development (1 hire) | $12,000 | $144,000 | 20% |
| Marketing & Content | $6,000 | $72,000 | 10% |
| Customer Success (1 hire) | $8,000 | $96,000 | 13% |
| Infrastructure (Vercel, Supabase, tools) | $2,000 | $24,000 | 3% |
| Legal & Compliance (SOC 2, contracts) | $3,000 | $36,000 | 5% |
| Trade Shows & Events | $2,500 | $30,000 | 4% |
| Office & Operations | $2,000 | $24,000 | 3% |
| Buffer / Contingency | $4,500 | $54,000 | 7% |
| **Total** | **$55,000** | **$660,000** | **90%** |

**Projected cash position at end of Year 1**: $128,000 - $340,000 remaining (depending on raise amount)

### Path to Profitability

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Revenue | $38K | $387K | $1.58M |
| Expenses | $660K | $1.1M | $1.6M |
| Net Income | ($622K) | ($713K) | ($20K) |
| Cumulative Cash Position | ($622K) | ($1.34M) | ($1.36M) |

**Break-even point**: Late Year 3 / Early Year 4 with current projections. Series A fundraise in Year 2 would extend runway and accelerate growth.

## Use of Funds ($750K - $1.25M Pre-Seed)

```
Engineering (25%)         ████████████████████████████████  $187K - $312K
Sales & BD (25%)          ████████████████████████████████  $187K - $312K
Marketing (15%)           ███████████████████              $112K - $187K
Customer Success (15%)    ███████████████████              $112K - $187K
Infrastructure (10%)      █████████████                    $75K - $125K
Buffer (10%)              █████████████                    $75K - $125K
```

**Key investment thesis**: The product is already built. Every dollar goes toward customer acquisition and revenue generation, not product development. This is atypical for pre-seed and represents a de-risked investment.

## Funding History

| Round | Date | Amount | Valuation | Source |
|-------|------|--------|-----------|--------|
| Bootstrapped | 2025-2026 | ~$50K (sweat equity + infrastructure) | N/A | Founder investment |
| **Pre-Seed (Current)** | **2026** | **$750K - $1.25M** | **$3M - $5M pre-money** | **Donkey Ideas** |
| Series A (Planned) | 2027 | $3M - $5M | $15M - $25M | TBD |

---

# 10. Unit Economics

## SaaS Metrics

| Metric | Target | Industry Benchmark | Notes |
|--------|--------|-------------------|-------|
| **Customer Acquisition Cost (CAC)** | $2,000 | $1,500 - $5,000 | Blended across direct sales and content marketing |
| **Average Revenue Per Account (ARPA)** | $299/mo ($3,588/yr) | Varies widely | Based on Professional tier as primary |
| **Lifetime Value (LTV)** | $10,764 | $10K - $50K | 3-year average retention |
| **LTV:CAC Ratio** | 5.4x | 3x+ healthy | Strong unit economics |
| **Payback Period** | 6.7 months | <12 months target | Fast payback due to monthly subscription |
| **Gross Margin** | 82% | 75-85% SaaS standard | Low infrastructure costs (Vercel + Supabase) |
| **Net Revenue Retention** | 110%+ | 100%+ target | Driven by tier upgrades and add-ons |
| **Monthly Churn** | <3% | 3-7% SMB SaaS | Construction is sticky once adopted (high switching cost) |

## Economics Model

### Why Construction SaaS Has Strong Unit Economics

1. **High switching costs**: Once a construction company loads projects, financial data, and documents into a platform, switching is extremely painful. Historical data, custom configurations, and team training create strong lock-in.

2. **Mission-critical workflows**: Unlike optional productivity tools, construction ERP handles payroll, invoicing, compliance, and project tracking - functions that cannot be paused or switched easily.

3. **Natural expansion**: As companies add projects, properties, and users, they naturally upgrade tiers. A Starter customer managing 5 projects will hit the limit and upgrade to Professional within 6-12 months.

4. **Low marginal cost**: Serving an additional customer on the platform costs negligible infrastructure. Supabase and Vercel pricing scales gradually, maintaining 80%+ gross margins even at volume.

### Revenue Growth Drivers

| Driver | Mechanism | Impact |
|--------|-----------|--------|
| **Tier upgrades** | Starter → Professional → Enterprise as usage grows | +50-100% ARPA |
| **Seat expansion** | Companies add users as adoption spreads internally | +10-20% ARPA |
| **Add-on features** | AI usage, premium integrations, additional storage | +5-15% ARPA |
| **Price increases** | Annual 5-10% price adjustments as platform value grows | +5-10% ARPA |

### Cost Structure

| Cost Category | % of Revenue (at Scale) | Notes |
|--------------|------------------------|-------|
| Infrastructure (Vercel, Supabase, AI APIs) | 8-12% | Scales sub-linearly with customers |
| Engineering | 25-30% | Product development and maintenance |
| Sales & Marketing | 30-35% | Customer acquisition (decreasing over time) |
| Customer Success | 10-15% | Onboarding, support, retention |
| G&A | 10-15% | Legal, accounting, operations |
| **Gross Margin** | **82-88%** | After infrastructure only |
| **Operating Margin (at scale)** | **15-25%** | Target by Year 4-5 |

---

# 11. Legal & Regulatory

## Legal Considerations

### Corporate Structure
Buildwrk operates as a portfolio company under Donkey Ideas. Intellectual property, including all source code, database schemas, and design assets, is owned by the entity.

### Intellectual Property
- All platform source code is proprietary and unpublished
- Database schema design incorporating CSI MasterFormat standards and construction-specific data models represents significant trade secrets
- UI/UX designs and workflow implementations are proprietary
- No open-source license obligations that restrict commercial use (all dependencies use MIT, Apache 2.0, or similar permissive licenses)

### Terms of Service & Privacy
- Standard SaaS terms of service governing platform usage
- Data Processing Agreement (DPA) for enterprise customers handling sensitive financial and personal data
- Privacy policy compliant with applicable data protection regulations

## Regulatory Compliance

### Data Security
- **Row-Level Security (RLS)**: 280+ database policies ensuring tenant data isolation at the PostgreSQL engine level
- **Encryption**: Data encrypted at rest (Supabase/AWS) and in transit (TLS 1.3)
- **Access Controls**: 7-level role-based access control with configurable permissions
- **Audit Logging**: Immutable audit trail capturing all data modifications with timestamps, user IDs, and IP addresses
- **Session Management**: Active session monitoring, concurrent session limits, configurable session timeouts

### Industry Compliance Capabilities
- **OSHA Compliance**: Electronic incident recordkeeping, OSHA-recordable classification, days away/restricted tracking, corrective action documentation
- **CSI MasterFormat**: Chart of accounts and budget codes aligned with Construction Specifications Institute standards
- **AIA Standards**: Retainage management and billing concepts following American Institute of Architects practices
- **Insurance Tracking**: Vendor insurance certificate and bond documentation management

### SOC 2 Readiness
Buildwrk's security architecture is designed with SOC 2 Type I certification in mind. The following controls are already implemented:

| SOC 2 Criteria | Implementation Status |
|----------------|----------------------|
| Access Controls | Implemented (RLS, RBAC, session management) |
| Logical Security | Implemented (multi-tenant isolation, encryption) |
| Change Management | Partially implemented (Git-based deployment) |
| Risk Assessment | Planned (Q2 2026) |
| Monitoring | Partially implemented (audit logs, login history) |
| Incident Response | Planned (Q2 2026) |

## Risk Factors

### Market Risks
- **Competition**: Large, well-funded competitors (Procore at $12B+ market cap) could develop similar unified offerings or acquire niche solutions to build equivalent functionality
- **Market adoption**: Construction industry has historically been slow to adopt new technology; customer acquisition may take longer than projected
- **Economic sensitivity**: Construction spending is cyclical; economic downturns could slow new customer acquisition and increase churn

### Execution Risks
- **Pre-revenue status**: The platform has zero paying customers; product-market fit has not been validated with real-world usage at scale
- **Team scaling**: Success depends on hiring effective sales and customer success personnel in a competitive labor market
- **Integration dependencies**: Key integrations (QuickBooks, Sage) are not yet built and are important for market adoption

### Technology Risks
- **Platform dependencies**: Reliance on Supabase, Vercel, and third-party AI providers introduces vendor risk
- **Security**: Despite robust architecture, any data breach would significantly damage trust in a platform handling financial and compliance data
- **Scalability**: The platform has not been load-tested with hundreds of concurrent companies; performance at scale is unproven

### Financial Risks
- **Capital requirements**: Pre-seed funding provides 12-18 months of runway; inability to achieve milestones could require additional funding at unfavorable terms
- **Revenue timeline**: Financial projections assume customer acquisition velocity that may not materialize
- **Pricing pressure**: Competitors may respond to Buildwrk's market entry with aggressive pricing, compressing margins

## Disclaimers

This whitepaper contains forward-looking statements regarding Buildwrk's business strategy, product roadmap, financial projections, and market opportunity. These statements are based on current expectations and assumptions and involve risks and uncertainties that could cause actual results to differ materially.

Market size figures are sourced from third-party research firms (Mordor Intelligence, Grand View Research, Allied Market Research, McKinsey Global Institute) and represent estimates that may not reflect actual addressable market size for Buildwrk specifically.

Financial projections presented in this document are estimates based on assumed customer acquisition rates, pricing, and retention. Actual results will depend on market conditions, competitive dynamics, execution capability, and other factors beyond the company's control.

This document does not constitute an offer to sell securities or a solicitation of an offer to buy securities. Investment decisions should be made based on thorough due diligence and professional financial advice.

---

# Appendix A: Technical Specifications

## Platform Statistics

| Component | Count |
|-----------|-------|
| Application Pages | 114 |
| API Endpoints | 118 |
| Database Tables | 69+ |
| Database Migrations | 10 |
| Row-Level Security Policies | 280+ |
| Database Indexes | 60+ |
| Generated/Computed Columns | 6 |
| CSS Stylesheets | 31 |
| UI Components | 26 |
| AI Providers Supported | 9 |
| User Roles | 7 |
| Portal Types | 4 |

## Supported AI Providers

| Provider | Models | Use Cases |
|----------|--------|-----------|
| OpenAI | GPT-4, GPT-3.5 | General chat, document analysis |
| Anthropic | Claude | Complex reasoning, document review |
| Google | Gemini | Multimodal analysis |
| Groq | Llama, Mixtral | Fast inference, real-time responses |
| Mistral | Mistral Large | European data compliance |
| Cohere | Command | Search and retrieval |
| xAI | Grok | General purpose |
| Amazon Bedrock | Various | Enterprise deployment |
| DeepSeek | DeepSeek | Cost-effective inference |

## Database Extensions

- `uuid-ossp` - UUID generation for primary keys
- `pgcrypto` - Encryption for sensitive data (API keys, credentials)

---

# Appendix B: Market Research Sources

- Mordor Intelligence - "Construction Management Software Market Size, Growth Trends 2026-2031"
- Grand View Research - "Property Management Software Market Size Report, 2033"
- Allied Market Research - "Property Management Software Market to Reach USD 7.8 Billion by 2033"
- McKinsey Global Institute - "Industry Digitization Index" and "Imagining Construction's Digital Future"
- McKinsey & Company - "Decoding Digital Transformation in Construction"
- US Census Bureau - Construction Industry Statistics
- Associated General Contractors of America - "2025 Construction Hiring and Business Outlook"
- Procore Technologies - Public pricing and financial disclosures
- Crunchbase - PlanGrid acquisition data ($875M by Autodesk, 2018)

---

*Buildwrk - Building the Future of Construction Management*

*A Donkey Ideas Portfolio Company*

*Contact: [contact information]*

*February 2026*
