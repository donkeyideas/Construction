# Buildwrk - Business Deck
## Company Overview, Financials & Strategic Plan

**Confidential | February 2026**

---

## 1. Company Overview

### Mission
To eliminate the data fragmentation that costs the construction industry billions annually by providing a single, unified platform for project management, financial accounting, safety compliance, and business operations.

### Vision
To become the operating system for every construction company in the world — from the solo GC to the global developer — replacing fragmented point solutions with an integrated intelligence platform.

### Company Details

| Item | Detail |
|------|--------|
| Legal Name | Buildwrk Inc. (or your entity name) |
| Founded | 2025 |
| Stage | Pre-Seed / Pre-Revenue |
| Headquarters | [Your city, state] |
| Structure | Delaware C-Corp (recommended for VC) |
| Product | SaaS construction ERP platform |
| Live URL | construction-gamma-six.vercel.app |
| Technology | Next.js, TypeScript, Supabase/PostgreSQL, Vercel |

---

## 2. Product Summary

### Platform Statistics

| Metric | Value |
|--------|-------|
| Total Code | 80,000+ lines (TypeScript, SQL, CSS) |
| Source Files | 646 TypeScript files |
| Feature Modules | 19 integrated modules |
| Database Tables | 46 with full schema |
| RLS Security Policies | 461 (multi-tenant data isolation) |
| API Endpoints | 177 REST endpoints |
| Page Routes | 178 application pages |
| Database Migrations | 35 progressive migrations |
| AI Providers | 9 LLM providers, 30+ models |
| Demo Datasets | 13 complete construction project scenarios |
| Unit Tests | 60 tests (financial accounting engine) |

### Module Inventory

| # | Module | Sub-Features | Competitive Equivalent |
|---|--------|-------------|----------------------|
| 1 | Project Management | Gantt, phases, tasks, dependencies, daily logs | Procore |
| 2 | RFI Management | Create, track, respond, ball-in-court | Procore |
| 3 | Submittal Tracking | Specs, versions, approval workflow | Procore |
| 4 | Change Order Management | Owner/cost COs, auto-JE generation | Procore + Sage |
| 5 | Financial Accounting | GL, JEs, CoA, trial balance, financial statements | Sage 300 CRE |
| 6 | Accounts Receivable | Invoicing, aging, retainage, collections | Sage / QuickBooks |
| 7 | Accounts Payable | Vendor bills, aging, retainage, payments | Sage / QuickBooks |
| 8 | Job Costing | CSI codes, budget lines, variance analysis | Sage / Viewpoint |
| 9 | Bank Reconciliation | Multi-account, transaction categorization | Sage / QuickBooks |
| 10 | Safety Management | Incidents, inspections, toolbox talks, OSHA | SafetyCulture |
| 11 | Equipment Management | Inventory, assignments, maintenance, depreciation | HCSS |
| 12 | Property Management | Properties, units, leases, NOI, maintenance | Yardi / AppFolio |
| 13 | CRM & Pipeline | Opportunities, bids, contacts, analytics | Salesforce |
| 14 | Document Management | Upload, version, organize, plan room | Procore / Box |
| 15 | Time Tracking | Clock in/out, timesheets, GPS, cost codes | ExakTime |
| 16 | AI Intelligence | 9 providers, chat, function calling, analytics | None (unique) |
| 17 | Portal System | Tenant, vendor, employee self-service portals | None (unique) |
| 18 | Mobile PWA | Clock, daily logs, photos, tasks, dashboard | Procore mobile |
| 19 | Platform Admin | CMS, pricing, feature flags, analytics, support | Custom build |

---

## 3. Market Analysis

### 3.1 Total Addressable Market (TAM)

| Market | 2026 Size | 2031 Projection | CAGR |
|--------|----------|----------------|------|
| Global Construction Software | $11.58B | $17.72B | 8.88% |
| US Construction Software | ~$4.6B | ~$7.1B | ~9% |
| US Construction Industry Revenue | $1.3T | $1.6T | ~4% |

### 3.2 Serviceable Addressable Market (SAM)

**Target: US mid-market construction firms ($5M-$500M revenue)**

| Segment | Firms | Avg Software Spend | SAM |
|---------|-------|-------------------|-----|
| GCs ($5M-$50M) | 35,000 | $12K/yr | $420M |
| GCs ($50M-$200M) | 8,000 | $50K/yr | $400M |
| Developers ($5M-$200M) | 5,000 | $30K/yr | $150M |
| Property Managers | 10,000 | $15K/yr | $150M |
| Specialty Trades ($5M+) | 15,000 | $8K/yr | $120M |
| **Total SAM** | **73,000** | | **$1.24B** |

### 3.3 Serviceable Obtainable Market (SOM) — Year 3

| Scenario | Market Share | Customers | ARR |
|----------|-------------|-----------|-----|
| Conservative | 0.05% | 365 | $1.1M |
| Moderate | 0.15% | 1,095 | $3.3M |
| Aggressive | 0.3% | 2,190 | $6.6M |

### 3.4 Industry Trends Favoring Buildwrk

1. **AI adoption in construction** — AI-ConTech funding hit $521M in Q1 2026, highest since 2021
2. **Cloud migration** — 90% of construction firms now use at least one cloud application (up from 60% in 2020)
3. **Federal infrastructure spending** — $1.2T Infrastructure Investment and Jobs Act creating project pipeline
4. **Generational shift** — Millennial/Gen-Z PMs expect modern, mobile-first software
5. **Insurance pressure** — Carriers increasingly require digital safety documentation for favorable rates
6. **Consolidation demand** — 78% of contractors report frustration with managing multiple software tools

---

## 4. Competitive Analysis

### 4.1 Competitive Positioning Map

```
                    HIGH FEATURE DEPTH
                         |
          Sage 300    Viewpoint     Oracle
              |          |           |
              |    BUILDWRK (here)   |
              |          |           |
   Contractor |          |           | Procore
   Foreman    |          |           |
              |          |           |
              +----------+-----------+
           LOW PRICE                HIGH PRICE
              |          |           |
  CoConstruct |          |           |
              |          |           |
   Buildertrend          |
                         |
                    LOW FEATURE DEPTH
```

### 4.2 Detailed Feature Comparison

| Feature | Procore | Sage 300 | Buildertrend | Contractor Foreman | **Buildwrk** |
|---------|---------|----------|-------------|-------------------|-------------|
| Project scheduling | Yes | No | Yes | Basic | **Yes** |
| Gantt with dependencies | Yes | No | Basic | No | **Yes** |
| Daily logs | Yes | No | Yes | Yes | **Yes** |
| RFIs/Submittals | Yes | No | No | Basic | **Yes** |
| Change orders | Yes | No | Yes | Basic | **Yes** |
| GAAP accounting | No | Yes | No | No | **Yes** |
| Double-entry bookkeeping | No | Yes | No | No | **Yes** |
| Job costing (CSI) | Basic | Yes | No | No | **Yes** |
| Retainage tracking | No | Yes | No | No | **Yes** |
| Bank reconciliation | No | Yes | No | No | **Yes** |
| Financial statements | No | Yes | No | No | **Yes** |
| Financial audit suite | No | No | No | No | **Yes** |
| Safety incidents | Basic | No | No | Basic | **Yes** |
| Toolbox talks | No | No | No | No | **Yes** |
| Equipment tracking | No | No | No | Yes | **Yes** |
| Equipment depreciation | No | Yes | No | No | **Yes** |
| Property management | No | No | No | No | **Yes** |
| Lease management | No | No | No | No | **Yes** |
| AI analytics | No | No | No | No | **Yes (9 providers)** |
| Tenant/vendor portals | Basic | No | No | No | **Yes** |
| Mobile PWA | Yes | No | Yes | Yes | **Yes** |
| CSV/Excel import | No | Basic | No | No | **Yes (48 types)** |
| P6/MSP import | Plugin | No | No | No | **Yes** |
| QuickBooks integration | No | N/A | Yes | Yes | **Built (pending keys)** |
| Multi-tenant SaaS | No | No | Yes | Yes | **Yes** |
| Annual cost (25 users) | $60K-$112K | $36K-$96K | $6K | $3K | **$3K-$6K** |

### 4.3 Competitive Moats

1. **Unified data model** — Competitors would need to rebuild their entire database architecture to match our integration depth. This is a 2-3 year engineering effort.

2. **AI on construction data** — Our AI queries real project/financial/safety data with function calling. Competitors offer generic AI chatbots bolted onto their platforms.

3. **Financial depth at PM price** — We offer Sage 300-level accounting at Contractor Foreman pricing. No competitor matches both financial depth and low price simultaneously.

4. **Multi-module switching cost** — Once a customer has projects, financials, safety, and equipment data in Buildwrk, the cost of migrating all four datasets to separate tools is prohibitive.

5. **Construction-native architecture** — We built for construction from day one. Competitors either adapted generic PM tools (Procore) or generic accounting tools (Sage) to construction.

---

## 5. Financial Plan

### 5.1 Revenue Model

**Primary revenue: SaaS subscriptions**

| Tier | Monthly | Annual | Target Mix (Yr 2) |
|------|---------|--------|-------------------|
| Starter | $99 | $948 | 40% |
| Professional | $249 | $2,388 | 40% |
| Enterprise | $499 | $4,788 | 20% |
| **Blended ARPA** | **$249** | **$2,988** | |

**Secondary revenue (future):**
- Data migration services: $500-$5,000 one-time
- Premium support packages: $100-$300/mo add-on
- API access for integrations: Usage-based pricing
- White-label/OEM licensing: Custom pricing

### 5.2 Financial Projections

#### Revenue Projection (3-Year)

| Quarter | New Customers | Total Customers | MRR | ARR | QoQ Growth |
|---------|-------------|----------------|-----|-----|-----------|
| **Year 1** | | | | | |
| Q2 2026 | 5 | 5 | $1,250 | $15K | -- |
| Q3 2026 | 10 | 15 | $3,750 | $45K | 200% |
| Q4 2026 | 20 | 33 | $8,250 | $99K | 120% |
| Q1 2027 | 27 | 57 | $14,250 | $171K | 73% |
| **Year 2** | | | | | |
| Q2 2027 | 43 | 95 | $23,750 | $285K | 67% |
| Q3 2027 | 55 | 143 | $35,750 | $429K | 51% |
| Q4 2027 | 70 | 203 | $50,750 | $609K | 42% |
| Q1 2028 | 97 | 285 | $71,250 | $855K | 40% |
| **Year 3** | | | | | |
| Q2 2028 | 115 | 380 | $95,000 | $1.14M | 33% |
| Q3 2028 | 140 | 493 | $123,250 | $1.48M | 30% |
| Q4 2028 | 170 | 626 | $156,500 | $1.88M | 27% |
| Q1 2029 | 200 | 776 | $194,000 | $2.33M | 24% |

**Assumptions:**
- 3% monthly churn (industry average for vertical SaaS)
- ARPA grows from $200 to $300 as customers upgrade
- No price increases in projection period
- 85% gross margin

#### Cost Projection (Year 1-2)

| Category | Monthly (Yr 1) | Monthly (Yr 2) | Notes |
|----------|---------------|----------------|-------|
| Infrastructure (Vercel/Supabase) | $200 | $1,500 | Scales with usage |
| Founder salary | $8,000 | $10,000 | Below market initially |
| Engineering hire | $0 | $12,000 | Full-stack (Q3 2026) |
| Sales hire | $0 | $10,000 | + commission (Q2 2026) |
| Customer success | $0 | $7,000 | Part-time initially (Q4 2026) |
| Marketing | $2,000 | $5,000 | Content, ads, events |
| Software/tools | $500 | $1,000 | Analytics, support tools |
| Legal/accounting | $500 | $1,000 | Startup counsel |
| Insurance | $300 | $500 | E&O, cyber liability |
| **Total Monthly Burn** | **$11,500** | **$48,000** | |
| **Annual Burn** | **$138K** | **$576K** | |

#### Path to Profitability

| Milestone | When | MRR Required | Customers |
|-----------|------|-------------|-----------|
| Cover infrastructure | Month 3 | $500 | 3 |
| Cover founder salary | Month 8 | $11,500 | 50 |
| Cover full team burn | Month 18 | $48,000 | 200 |
| Cash flow positive | Month 24 | $60,000 | 250 |
| **Profitability** | **Month 24-30** | **$60K+** | **250+** |

### 5.3 Key Metrics Targets

| Metric | Year 1 | Year 2 | Year 3 | Industry Benchmark |
|--------|--------|--------|--------|-------------------|
| ARR | $171K | $855K | $2.33M | -- |
| MRR Growth (MoM) | 15-25% | 8-12% | 5-8% | >5% good |
| Customer Count | 57 | 285 | 776 | -- |
| ARPA | $249 | $250 | $250 | $200-$500 |
| Gross Margin | 85% | 85% | 87% | >80% good |
| Monthly Churn | <5% | <3% | <2% | <3% excellent |
| Net Revenue Retention | 100% | 110% | 120% | >100% good |
| CAC | $1,000 | $800 | $600 | Decreasing is good |
| LTV | $6,000 | $9,000 | $12,000 | -- |
| LTV:CAC | 6x | 11x | 20x | >3x good |
| CAC Payback | 4 mo | 3 mo | 2.5 mo | <12 mo good |
| Burn Multiple | 8x | 2x | 0.5x | <2x good |

---

## 6. Go-to-Market Strategy

### 6.1 Phase 1: Founder-Led Sales (Months 1-6)

**Objective:** First 50 customers, validate product-market fit

**Channels:**
- Direct outreach to local GCs (LinkedIn, construction association directories)
- Free webinars: "How to Stop Losing Money Between Procore and QuickBooks"
- Partner with 2-3 local accounting firms that serve construction clients
- Attend regional AGC (Associated General Contractors) chapter meetings

**Pricing strategy:**
- 60-day free trial for all tiers
- First 10 customers get "Founding Member" pricing (50% off for life)
- White-glove onboarding: import their data personally

**Target customer profile:**
- GC doing $5M-$50M in annual revenue
- Currently using QuickBooks + spreadsheets (or QuickBooks + Procore)
- 5-25 employees
- Pain point: manual data reconciliation between PM and accounting

### 6.2 Phase 2: Content Marketing & Referrals (Months 7-12)

**Objective:** 50-200 customers, establish market presence

**Channels:**
- Blog content: construction accounting guides, safety compliance checklists, CSI code references
- YouTube: product demos, customer testimonials, "Buildwrk vs. Procore" comparisons
- Referral program: existing customers get 1 month free for each referral that converts
- Local construction association sponsorships

**Content themes:**
- "The Hidden Cost of Software Fragmentation in Construction"
- "GAAP Accounting for General Contractors: A Complete Guide"
- "How AI is Transforming Construction Project Management"
- "Retainage Tracking: Why QuickBooks Isn't Enough"

### 6.3 Phase 3: Channel & Scale (Year 2+)

**Objective:** 200-1,000+ customers, repeatable sales motion

**Channels:**
- Trade shows: CONEXPO-CON/AGG, World of Concrete, ENR FutureTech
- Channel partnerships: CPA firms, insurance brokers, construction lenders
- Integration marketplace: QuickBooks, Procore data import, Plangrid
- Self-serve onboarding with product-led growth

**Strategic partnerships:**
- Construction accounting firms → white-label or referral fee
- Surety bonding companies → joint marketing (our financial audit helps bonding)
- Construction lenders → financial reporting integration
- Safety consultants → safety module as value-add

---

## 7. Technology Roadmap

### 7.1 Current State (February 2026)

| Component | Status | Grade |
|-----------|--------|-------|
| Core Platform | Production-deployed | A |
| Financial Accounting | GAAP-compliant, audit-ready | A+ |
| Project Management | Full Gantt, RFIs, submittals, COs | A |
| Safety Module | Incidents, inspections, toolbox talks | A |
| Equipment Management | Inventory, maintenance, depreciation | A |
| Property Management | Leases, units, NOI | A |
| AI Intelligence | 9 providers, function calling | A |
| Mobile PWA | Clock, daily logs, photos | A |
| Security | 461 RLS policies, encrypted credentials | A |
| Testing | 60 unit tests (financial engine) | C |
| i18n | Framework ready, 20% translated | C |
| QuickBooks Integration | OAuth2 framework, pending API keys | B- |

### 7.2 Roadmap

#### Q2 2026: Launch Ready
- [ ] First 5 paying customers
- [ ] QuickBooks OAuth credentials configured
- [ ] Google OAuth sign-in enabled
- [ ] Plan room storage bucket populated
- [ ] Test coverage expanded to 200+ tests
- [ ] Custom domain (buildwrk.com)

#### Q3 2026: Growth Features
- [ ] QuickBooks two-way sync (live)
- [ ] Estimating module (takeoffs, bid generation)
- [ ] Advanced reporting (custom report builder)
- [ ] Email notifications (digest, alerts)
- [ ] Procore data import (competitive migration tool)

#### Q4 2026: Scale Features
- [ ] API documentation and developer portal
- [ ] Webhook system for external integrations
- [ ] Advanced AI: predictive budget overruns, safety risk scoring
- [ ] Multi-currency support
- [ ] Dark mode completion (full CSS coverage)

#### 2027: Platform Expansion
- [ ] Marketplace for third-party integrations
- [ ] Offline PWA with service worker sync
- [ ] Advanced analytics dashboard (BI-grade)
- [ ] SOC 2 Type II certification
- [ ] Multi-language support (Spanish priority)
- [ ] Native mobile app (iOS/Android) evaluation

---

## 8. Risk Analysis

### 8.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Slow customer acquisition | Medium | High | Pivot to freemium; partner with CPA firms |
| Procore adds accounting | Low | High | Moat: 2+ years of accounting depth; price advantage |
| Sage modernizes UI | Low | Medium | Our PM + safety modules provide differentiation |
| Data security breach | Very Low | Critical | 461 RLS policies; SOC 2 certification roadmap |
| Key person risk (solo founder) | Medium | High | Hire engineering co-founder with pre-seed funds |
| Extended sales cycles | Medium | Medium | Offer 60-day free trials; reduce friction |
| Churn from poor onboarding | Medium | Medium | White-glove migration for first 50 customers |
| Infrastructure scaling | Low | Medium | Vercel auto-scales; Supabase connection pooling |

### 8.2 Unfair Advantages

1. **Product maturity** — 80K LOC, 35 migrations, 461 RLS policies. Most pre-seed startups have a slide deck. We have a production platform.

2. **Demo data** — 13 complete project scenarios across every construction vertical. We can demo to any prospect in their specific industry context.

3. **Financial engine** — The accounting module alone (double-entry, retainage, job costing, audit suite) would take a competitor 12+ months to replicate.

4. **AI infrastructure** — 9 LLM providers with function calling against live data. No construction platform has this level of AI integration.

5. **Multi-tenant architecture** — 461 RLS policies at the database level. Retrofitting this into an existing app is a 6-12 month rewrite.

---

## 9. Fundraising

### 9.1 Current Round: Pre-Seed

| Term | Detail |
|------|--------|
| Round | Pre-Seed |
| Target Raise | $750,000 |
| Instrument | SAFE (Post-Money) or Priced Equity |
| Pre-Money Valuation | $4,000,000 - $6,000,000 |
| Dilution | 12.5% - 18.75% |
| Use of Funds | Sales (40%), Engineering (30%), Ops (20%), Reserve (10%) |
| Runway | 18 months at projected burn |

### 9.2 Use of Funds Detail

| Category | Amount | Allocation |
|----------|--------|-----------|
| **Sales & Marketing** | $300,000 | |
| - Head of Sales (salary + commission) | $150,000 | 6 months |
| - Content marketing (blog, video, SEO) | $60,000 | 12 months |
| - Trade show booth + travel | $50,000 | 2 events |
| - Paid advertising (LinkedIn, Google) | $40,000 | 12 months |
| **Engineering** | $225,000 | |
| - Full-stack engineer (salary) | $150,000 | 6 months |
| - Testing infrastructure + CI/CD | $25,000 | One-time |
| - QuickBooks integration completion | $20,000 | One-time |
| - DevOps and monitoring | $30,000 | 12 months |
| **Operations** | $150,000 | |
| - Founder salary | $96,000 | 12 months |
| - Legal (incorporation, IP, contracts) | $20,000 | One-time |
| - Accounting/bookkeeping | $12,000 | 12 months |
| - Insurance (E&O, cyber, GL) | $12,000 | 12 months |
| - Office/coworking | $10,000 | 12 months |
| **Reserve** | $75,000 | Working capital buffer |
| **Total** | **$750,000** | |

### 9.3 Milestones This Round Enables

| Milestone | Timeline | Metric |
|-----------|----------|--------|
| First paying customer | Month 2 | Revenue > $0 |
| Product-market fit signal | Month 6 | 15 customers, <5% churn |
| QuickBooks live sync | Month 4 | #1 integration request |
| Seed-ready metrics | Month 12-18 | $10K+ MRR, 50+ customers |
| Seed round ($2M-$5M) | Month 15-18 | At $10M-$20M valuation |

### 9.4 Future Rounds (Projected)

| Round | Timeline | Raise | Valuation | Purpose |
|-------|----------|-------|-----------|---------|
| Pre-Seed | Now | $750K | $4M-$6M | First 50 customers |
| Seed | Month 15-18 | $2M-$5M | $10M-$20M | Scale to 500 customers |
| Series A | Month 30-36 | $8M-$15M | $40M-$80M | National expansion |

---

## 10. Appendices

### Appendix A: Technology Stack Detail

| Component | Technology | Version | License |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 20+ | MIT |
| Framework | Next.js | 16.1.6 | MIT |
| Language | TypeScript | 5.9.3 | Apache-2.0 |
| UI Library | React | 19.2.4 | MIT |
| Database | PostgreSQL (Supabase) | 15+ | PostgreSQL License |
| Auth | Supabase Auth | Latest | Apache-2.0 |
| Hosting | Vercel | Enterprise | Proprietary |
| AI SDK | Vercel AI SDK | 6.0.83 | Apache-2.0 |
| Charts | Recharts | Latest | MIT |
| Tables | TanStack React Table | Latest | MIT |
| PDF | @react-pdf/renderer | Latest | MIT |
| Forms | React Hook Form + Zod | Latest | MIT |
| Icons | Lucide React | Latest | ISC |
| UI Primitives | Radix UI | Latest | MIT |

### Appendix B: Database Schema Summary

**46 tables across 8 domains**

| Domain | Tables | Key Entities |
|--------|--------|-------------|
| Organization | 4 | companies, user_profiles, company_members, audit_log |
| Projects | 9 | projects, phases, tasks, daily_logs, rfis, submittals, change_orders |
| Financial | 9 | chart_of_accounts, journal_entries, journal_entry_lines, invoices, payments |
| Equipment/Safety | 5 | equipment, equipment_maintenance, safety_incidents, safety_inspections |
| Property/Leasing | 6 | properties, units, leases, rent_payments, maintenance_requests |
| CRM | 4 | contacts, opportunities, bids, vendor_contracts |
| Documents | 2 | documents, cms_media |
| AI/Automation | 3 | ai_conversations, ai_provider_configs, ai_usage_log |

### Appendix C: Investor Target List

**Construction-Focused VCs:**
- Brick & Mortar Ventures (San Francisco) — Early-stage ConTech
- Building Ventures (Boston) — Series A ConTech
- Navitas Capital (Los Angeles) — PropTech/ConTech
- CEMEX Ventures (Global) — Corporate VC, Top 50 ConTech
- Fifth Wall (Los Angeles) — Built world technology
- Mighty Capital (San Francisco) — Pre-seed/Seed specialist

**General SaaS/B2B VCs:**
- Y Combinator (Mountain View) — Accelerator
- Techstars (Multiple) — Accelerator
- SV Angel (San Francisco) — Pre-seed
- Precursor Ventures (San Francisco) — Pre-seed
- Hustle Fund (San Francisco) — Pre-seed

**Strategic Angels:**
- Construction company CFOs/COOs
- Former Procore/Sage executives
- Construction association leaders

### Appendix D: Key Performance Indicators Dashboard

**Monthly Tracking Sheet:**

| KPI | Jan | Feb | Mar | Apr | May | Jun |
|-----|-----|-----|-----|-----|-----|-----|
| New Customers | | | | | | |
| Total Customers | | | | | | |
| MRR ($) | | | | | | |
| MRR Growth (%) | | | | | | |
| Churn Rate (%) | | | | | | |
| ARPA ($) | | | | | | |
| NPS Score | | | | | | |
| Support Tickets | | | | | | |
| Avg Response Time | | | | | | |
| Feature Usage (top 5) | | | | | | |

---

*This document is confidential and intended for potential investors and strategic partners only. Financial projections are estimates based on market analysis and are not guaranteed.*

*Copyright 2026 Buildwrk. All rights reserved.*
