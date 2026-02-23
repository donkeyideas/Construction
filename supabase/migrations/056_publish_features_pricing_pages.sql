-- 056: Publish Features and Pricing CMS pages with SEO-optimized content
-- These pages existed as drafts; this migration publishes them so they're
-- accessible at /p/features and /p/pricing.

-- ─── Features Page ───
UPDATE cms_pages
SET
  status = 'published',
  published_at = now(),
  updated_at = now(),
  title = 'Features - Buildwrk',
  meta_title = 'Features | Buildwrk Construction Management Software',
  meta_description = 'Explore Buildwrk features: project management, job costing, property management, document control, AI analytics, CRM, and multi-language support in 8 languages.',
  sections = '[
    {
      "type": "hero",
      "order": 1,
      "visible": true,
      "content": {
        "headline": "Every Feature Your Construction Business Needs",
        "subheadline": "From preconstruction bidding to property management — Buildwrk replaces 5+ disconnected tools with one unified platform. Available in 8 languages for global teams."
      }
    },
    {
      "type": "features",
      "order": 2,
      "visible": true,
      "content": {
        "headline": "Core Modules",
        "items": [
          {
            "title": "Project Management",
            "description": "Gantt scheduling, daily field reports, RFIs, submittals, change orders, and punch lists. Track every milestone from groundbreaking to substantial completion with real-time dashboards and automated notifications."
          },
          {
            "title": "Financial Management",
            "description": "Construction job costing by CSI division, accounts payable and receivable, AIA-style progress billing, lien waiver tracking, and budget-vs-actual analysis. Double-entry general ledger with automated journal entries."
          },
          {
            "title": "Property Management",
            "description": "Unit tracking, lease management, tenant communications, maintenance workflows, and rent roll reporting. Manage the full lifecycle from construction handover to long-term property operations."
          },
          {
            "title": "Document Management",
            "description": "Plan room with version control, centralized document library, and AI-powered data extraction. Upload blueprints, specifications, contracts, and permits — find anything in seconds with intelligent search."
          },
          {
            "title": "Safety & Compliance",
            "description": "Incident reporting, safety inspections, toolbox talks, and certification tracking. OSHA-aligned workflows keep your job sites compliant and your crews safe."
          },
          {
            "title": "CRM & Bid Management",
            "description": "Track leads, manage bid invitations, generate proposals, and convert opportunities into active projects from a centralized pipeline view."
          }
        ]
      }
    },
    {
      "type": "features",
      "order": 3,
      "visible": true,
      "content": {
        "headline": "Platform Capabilities",
        "items": [
          {
            "title": "AI-Powered Analytics",
            "description": "Ask questions in plain English across all your data. Bring your own API key — supports OpenAI, Anthropic Claude, Google Gemini, and 7 more providers."
          },
          {
            "title": "Multi-Language Support",
            "description": "Available in 8 languages: English, Spanish, French, German, Portuguese, Arabic, Hindi, and Chinese. Every team member works in their preferred language."
          },
          {
            "title": "Workforce & Time Tracking",
            "description": "Crew scheduling, GPS clock-in/out, certified payroll, and field worker mobile access. Dedicated employee and vendor portals for self-service."
          },
          {
            "title": "Reports & Analytics",
            "description": "Financial statements, project performance KPIs, property NOI, and custom reports. Export to PDF or Excel. Schedule automated delivery to stakeholders."
          },
          {
            "title": "Role-Based Access Control",
            "description": "Owner, admin, project manager, superintendent, accountant, field worker, and viewer roles. Row-level security ensures every company''s data is fully isolated."
          },
          {
            "title": "Integrations",
            "description": "QuickBooks sync, Stripe billing, CSV import/export, and an extensible API. Connect Buildwrk to the tools your team already uses."
          }
        ]
      }
    },
    {
      "type": "cta",
      "order": 4,
      "visible": true,
      "content": {
        "headline": "Ready to See Buildwrk in Action?",
        "button_text": "Start Your Free 14-Day Trial",
        "button_link": "/register"
      }
    }
  ]'::jsonb
WHERE page_slug = 'features';

-- ─── Pricing Page ───
UPDATE cms_pages
SET
  status = 'published',
  published_at = now(),
  updated_at = now(),
  title = 'Pricing - Buildwrk',
  meta_title = 'Pricing | Buildwrk Construction Management Software',
  meta_description = 'Simple, transparent pricing for Buildwrk. Starter, Professional, and Enterprise plans. 14-day free trial, no credit card required. Available in 8 languages.',
  sections = '[
    {
      "type": "hero",
      "order": 1,
      "visible": true,
      "content": {
        "headline": "Simple, Transparent Pricing",
        "subheadline": "No hidden fees. No per-project charges. Every plan includes a 14-day free trial with full access to all features. Available in 8 languages."
      }
    },
    {
      "type": "features",
      "order": 2,
      "visible": true,
      "content": {
        "headline": "What Every Plan Includes",
        "items": [
          {
            "title": "Full Platform Access",
            "description": "Every plan gives you access to project management, financial tracking, document control, and reporting during your trial — no feature gates."
          },
          {
            "title": "Multi-Language Support",
            "description": "All 8 languages (English, Spanish, French, German, Portuguese, Arabic, Hindi, Chinese) are included on every plan at no extra cost."
          },
          {
            "title": "Data Import & Export",
            "description": "Bulk CSV import for projects, contacts, invoices, equipment, and more. Export any report to PDF or Excel."
          },
          {
            "title": "Enterprise Security",
            "description": "Row-level data isolation, encrypted storage, role-based access control, and full audit logging on every plan."
          }
        ]
      }
    },
    {
      "type": "text",
      "order": 3,
      "visible": true,
      "content": {
        "body": "Visit the homepage pricing section to compare Starter, Professional, and Enterprise plans side by side. Or start your free 14-day trial now — no credit card required."
      }
    },
    {
      "type": "cta",
      "order": 4,
      "visible": true,
      "content": {
        "headline": "Start Building Smarter Today",
        "button_text": "Start Your Free 14-Day Trial",
        "button_link": "/register"
      }
    }
  ]'::jsonb
WHERE page_slug = 'pricing';
