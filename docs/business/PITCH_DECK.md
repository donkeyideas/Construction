# Buildwrk - Investor Pitch Deck
## Pre-Seed Round | February 2026

---

## SLIDE 1: Title

# Buildwrk

**The Unified Construction Intelligence Platform**

One platform to manage projects, finances, safety, and operations for the $1.3T construction industry.

Pre-Seed Round | $750K Target
February 2026

---

## SLIDE 2: The Problem

### Construction companies run on duct tape

A typical mid-market GC ($20M-$200M revenue) uses **5-8 disconnected software tools** costing **$150K-$378K/year**:

| Tool | Cost/yr | What it does |
|------|---------|-------------|
| Procore | $60K-$112K | Project management only |
| Sage 300 CRE | $36K-$96K | Accounting only |
| SafetyCulture | $6K-$24K | Safety only |
| Box/SharePoint | $6K-$18K | Documents only |
| ADP | $12K-$36K | Payroll only |

**The result:**
- Change orders approved in Procore require manual journal entries in Sage
- Safety incidents don't link to project budgets for insurance accruals
- AR/AP aging lives in accounting software; PMs have no visibility
- 5-10% of project revenue lost to data reconciliation overhead

---

## SLIDE 3: The Solution

### Buildwrk: Everything in one platform

**19 integrated modules** sharing a single database:

| Module | Replaces |
|--------|----------|
| Project Management (Gantt, RFIs, daily logs, change orders) | Procore |
| Financial Accounting (GL, AR/AP, job costing, financial statements) | Sage / QuickBooks |
| Safety (incidents, inspections, toolbox talks, OSHA) | SafetyCulture |
| Property Management (leases, units, maintenance, NOI) | Yardi / AppFolio |
| Equipment (inventory, assignments, depreciation, maintenance) | HCSS |
| CRM & Bidding (pipeline, proposals, bid tracking) | Salesforce |
| AI Analytics (9 LLM providers, natural-language data queries) | Nothing exists |

**When a change order is approved, Buildwrk automatically:**
1. Updates the project budget
2. Creates a balanced journal entry (DR AR / CR Revenue)
3. Adjusts the contract value
4. Logs the audit trail
5. Notifies stakeholders

Zero manual data entry. Zero reconciliation.

---

## SLIDE 4: Product Demo

### Live platform: construction-gamma-six.vercel.app

**Key screens:**

1. **Dashboard** - Real-time KPIs: project budgets, AR/AP aging, safety metrics, cash position
2. **Financial Statements** - Auto-generated Income Statement, Balance Sheet, Cash Flow, Trial Balance
3. **Project Timeline** - Gantt chart with phases, tasks, dependencies, critical path
4. **AI Assistant** - "What's the budget variance on the stadium project?" (real data, not generic)
5. **Mobile PWA** - Clock in/out, daily logs, photo upload from the field

**13 complete demo datasets** ready for any industry vertical:
Stadium, Highway, Tunnel, Airport, Power Plant, Hotel, Government, Bridge, Residential, Commercial

---

## SLIDE 5: How It Works

### From signup to live dashboard in 10 minutes

```
Register (2 min)
    |
Select industry & modules (1 min)
    |
Import CSV data OR start fresh (3 min)
    |
Auto-generated financial statements,
project dashboards, safety metrics (instant)
    |
Invite team members (1 min)
```

**Data import supports:**
- CSV (all 48 entity types)
- Excel (XLSX)
- MS Project XML (schedules)
- Primavera P6 XER (schedules)
- QuickBooks sync (framework built, pending API keys)

---

## SLIDE 6: Market Opportunity

### $11.6B market growing at 8.9% CAGR

**Construction Management Software Market:**
- 2026: $11.58 billion
- 2031: $17.72 billion (Mordor Intelligence)

**Our Beachhead: The Underserved Mid-Market**

| Segment | Revenue | # of Firms | Current Spend | Buildwrk Price |
|---------|---------|-----------|--------------|---------------|
| Small ($1M-$10M) | $800B | 650,000+ | $3K-$12K/yr | $1.2K-$3K/yr |
| Mid-Market ($10M-$200M) | $350B | 45,000+ | $50K-$200K/yr | $3K-$6K/yr |
| Large ($200M+) | $150B | 5,000+ | $200K-$500K/yr | $6K+/yr |

**Why mid-market wins:**
- Too big for Contractor Foreman/CoConstruct
- Too small to afford Procore + Sage + SafetyCulture
- Willing to pay for integrated solution
- Highest growth segment in construction

---

## SLIDE 7: Competitive Advantage

### What we have that others don't

| Capability | Procore | Sage | Buildertrend | Buildwrk |
|-----------|---------|------|-------------|----------|
| Project Management | Yes | No | Yes | **Yes** |
| GAAP Accounting | No | Yes | Basic | **Yes** |
| Property Management | No | No | No | **Yes** |
| Safety Compliance | Basic | No | No | **Yes** |
| AI Analytics (9 providers) | No | No | No | **Yes** |
| Multi-tenant Portals | Basic | No | No | **Yes** |
| Mobile PWA | Yes | No | Yes | **Yes** |
| Price (25 users) | $60K-$112K/yr | $36K-$96K/yr | $6K/yr | **$3K-$6K/yr** |

**Our moat:**
1. **Data network effects** - Every module enriches every other module. More usage = more value.
2. **Switching cost** - Once financial data lives in Buildwrk, migration cost is prohibitive.
3. **AI context** - Our AI queries real project/financial data; competitors offer generic chatbots.
4. **Price disruption** - 80-95% cheaper than enterprise incumbents with comparable features.

---

## SLIDE 8: Business Model

### SaaS subscription with expansion revenue

| Tier | Monthly | Annual | Users | Projects |
|------|---------|--------|-------|----------|
| **Starter** | $99 | $948 | 5 | 3 active |
| **Professional** | $249 | $2,388 | 25 | 15 active |
| **Enterprise** | $499 | $4,788 | Unlimited | Unlimited |

**Unit Economics (Target):**
- ARPA: $250/mo
- CAC: $500-$1,500
- LTV (36 mo): $9,000
- LTV:CAC: 6x-18x
- Gross Margin: 85%+

**Expansion triggers:**
- User growth (Starter -> Professional)
- Project growth (Professional -> Enterprise)
- Add-on modules (AI, property management)
- Data storage overages

---

## SLIDE 9: Traction & Milestones

### What's built today

| Metric | Status |
|--------|--------|
| **Lines of Code** | 80,000+ (TypeScript + SQL + CSS) |
| **Source Files** | 646 TypeScript files |
| **Database Tables** | 46 with full schema |
| **Security Policies** | 461 RLS policies |
| **API Endpoints** | 177 REST endpoints |
| **Page Routes** | 178 pages |
| **Database Migrations** | 35 progressive migrations |
| **AI Providers** | 9 integrated (30+ models) |
| **Demo Datasets** | 13 complete project scenarios |
| **Test Coverage** | 60 unit tests (financial engine) |
| **Deployment** | Live on Vercel (production) |

**Development equivalent:** 12-18 months of a 3-4 person engineering team.

**Key milestones achieved:**
- Full GAAP-compliant financial accounting with 9-point audit suite
- Multi-tenant architecture with enterprise security
- 13 demo datasets covering $1M-$500M project types
- Mobile PWA with field operations (clock, daily logs, photos)
- AI assistant with function calling against live data

---

## SLIDE 10: Financial Projections

### Path to $1M ARR in 24 months

| Quarter | Customers | MRR | ARR | Milestone |
|---------|-----------|-----|-----|-----------|
| Q2 2026 | 5 | $1,250 | $15K | First paying customers |
| Q3 2026 | 15 | $3,750 | $45K | Product-market fit signal |
| Q4 2026 | 35 | $8,750 | $105K | Seed round ready |
| Q1 2027 | 60 | $15,000 | $180K | Content marketing launch |
| Q2 2027 | 100 | $25,000 | $300K | Channel partnerships |
| Q3 2027 | 150 | $37,500 | $450K | Trade show presence |
| Q4 2027 | 250 | $62,500 | $750K | Self-serve onboarding |
| Q1 2028 | 350 | $87,500 | $1.05M | $1M ARR milestone |

**Assumptions:**
- Average customer pays $250/mo (mix of Starter/Professional/Enterprise)
- 5% monthly growth rate after initial traction
- <3% monthly churn
- CAC payback: 3-6 months

---

## SLIDE 11: The Ask

### Pre-Seed: $750K at $4M-$6M pre-money valuation

**Use of Funds:**

| Category | Amount | Purpose |
|----------|--------|---------|
| Sales & Marketing | $300K (40%) | First 50 customers, content, trade shows |
| Engineering | $225K (30%) | Test coverage, QuickBooks live sync, mobile enhancements |
| Operations | $150K (20%) | Infrastructure, support tooling, legal |
| Reserve | $75K (10%) | Working capital |

**18-Month Runway** at current burn rate

**Milestones this round enables:**
1. First 50 paying customers ($12K+ MRR)
2. Product-market fit validation
3. Complete QuickBooks integration
4. Seed-ready metrics for $2M-$5M raise

---

## SLIDE 12: Team

### [Your name and background here]

**Founder & CEO**
- [Your background, construction industry experience, technical skills]
- Built the entire 80,000 LOC platform as a solo technical founder
- [Any relevant industry connections, domain expertise]

**Hiring Plan (with funding):**
- Head of Sales (Q2 2026) - Construction industry background
- Full-Stack Engineer (Q3 2026) - Expand test coverage, feature velocity
- Customer Success Lead (Q4 2026) - Onboarding, retention, expansion

**Advisory Board (Target):**
- Construction industry CFO (financial credibility)
- SaaS GTM leader (go-to-market playbook)
- ConTech investor (strategic introductions)

---

## SLIDE 13: Why Now

### Four converging tailwinds

1. **AI maturity** - LLMs can now understand construction-specific context (budgets, CSI codes, change orders). Buildwrk is the first platform to put AI on real construction data.

2. **Cloud adoption** - COVID forced construction firms to accept cloud software. The laggard industry is now the fastest-growing SaaS segment.

3. **Infrastructure spending** - The $1.2T Infrastructure Investment and Jobs Act creates thousands of new projects needing management software.

4. **Generational shift** - Millennial PMs and superintendents expect modern, mobile-first software. They won't tolerate Sage 300's 1990s interface.

---

## SLIDE 14: Contact

# Buildwrk

**The Unified Construction Intelligence Platform**

- **Live Demo**: [construction-gamma-six.vercel.app](https://construction-gamma-six.vercel.app)
- **Email**: [your-email]
- **Phone**: [your-phone]

*"Every hour spent reconciling data between disconnected tools is an hour not spent building."*

---

*This pitch deck is confidential and intended solely for potential investors.*
