/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Default homepage sections – used as fallback when the CMS database
 * row is empty and as the initial seed when editing for the first time.
 *
 * Content is SEO / GEO-optimised for organic discovery around
 * "construction management software", "construction ERP", "general
 * contractor software", "property management for contractors", etc.
 */

export interface CmsSection {
  type: string;
  order: number;
  visible: boolean;
  content: Record<string, any>;
}

export const DEFAULT_META_TITLE =
  "ConstructionERP | Construction Management Software & Property Management Platform";

export const DEFAULT_META_DESCRIPTION =
  "All-in-one construction ERP for general contractors, developers & property managers. Job costing, Gantt scheduling, lease management & AI analytics. 14-day free trial — no credit card required.";

export const DEFAULT_HOMEPAGE_SECTIONS: CmsSection[] = [
  {
    type: "hero",
    order: 1,
    visible: true,
    content: {
      title:
        "Construction Management Software That Runs Your Entire Business",
      subtitle:
        "The all-in-one construction ERP platform for general contractors, real estate developers, and property managers. Gantt scheduling, job costing, document control, property operations, and AI-powered analytics — unified in one system your whole team can use.",
      cta_text: "Start Free 14-Day Trial",
      cta_link: "/register",
      secondary_text: "See How It Works →",
      secondary_link: "#about",
      image_url:
        "https://placehold.co/800x900/b45309/ffffff?text=Construction+Site",
      image_alt:
        "Construction project management software showing active job site with cranes and steel framework",
    },
  },
  {
    type: "about",
    order: 2,
    visible: true,
    content: {
      title: "Built for Builders, by People Who Understand Construction",
      body: "General contractors and real estate developers deserve better than disconnected spreadsheets, overpriced legacy platforms, and duct-taped tool stacks. ConstructionERP is the modern, AI-native construction management software that covers the full project lifecycle — from preconstruction bidding and estimating through project execution, financial closeout, and into long-term property management. Every project, every dollar, every document — one place.",
    },
  },
  {
    type: "steps",
    order: 3,
    visible: true,
    content: {
      title: "Set Up Your Construction Software in Minutes, Not Months",
      steps: [
        {
          title: "Create Your Account",
          body: "Sign up and configure your company profile, roles, and permissions in under five minutes. No IT department required — your construction management platform is ready the moment you are.",
        },
        {
          title: "Import Your Projects",
          body: "Bring in active jobs, budgets, subcontractor lists, and documents with guided CSV import. Or start fresh and let the system build your project structure from scratch.",
        },
        {
          title: "Run Everything from One Place",
          body: "Real-time dashboards, automated workflows, job costing, document control, and AI insights — all live from day one across every project in your portfolio.",
        },
      ],
    },
  },
  {
    type: "modules",
    order: 4,
    visible: true,
    content: {
      modules: [
        {
          label: "Module",
          title: "Project Management",
          body: "Gantt scheduling, daily field reports, RFIs, submittals, change orders, and punch lists — all connected in one construction project management platform. Track every milestone from groundbreaking to substantial completion with real-time progress dashboards, automated notifications, and a complete audit trail that keeps your entire team aligned.",
          cta_text: "Start Managing Projects →",
          image_url:
            "https://placehold.co/700x480/292524/ffffff?text=Project+Management",
          image_alt:
            "Construction project management module with Gantt charts, daily logs, and RFI tracking",
        },
        {
          label: "Module",
          title: "Property Management",
          body: "Unit tracking, lease management, tenant communications, maintenance workflows, and rent roll reporting for your completed real estate assets. Manage the full lifecycle from construction handover to long-term property operations without switching to a separate property management system.",
          cta_text: "Start Managing Properties →",
          image_url:
            "https://placehold.co/700x480/1d4ed8/ffffff?text=Property+Management",
          image_alt:
            "Property management module with unit tracking, lease management, and tenant portal",
        },
        {
          label: "Module",
          title: "Financial Management",
          body: "Construction job costing by CSI division, accounts payable and receivable, AIA-style progress billing, lien waiver tracking, and budget-vs-actual analysis. See exactly where every dollar goes across every project and property in your portfolio with real-time financial dashboards built for the construction industry.",
          cta_text: "Start Tracking Finances →",
          image_url:
            "https://placehold.co/700x480/78716c/ffffff?text=Financial+Management",
          image_alt:
            "Construction financial management with job costing, accounts payable, and budget tracking",
        },
        {
          label: "Module",
          title: "Document Management",
          body: "Plan room with version control, centralized construction document library, and AI-powered data extraction. Upload blueprints, specifications, contracts, and permits — then find anything in seconds with intelligent search. No more digging through email for the latest revision.",
          cta_text: "Start Organizing Documents →",
          image_url:
            "https://placehold.co/700x480/b45309/ffffff?text=Document+Management",
          image_alt:
            "Construction document management with plan room, version control, and AI extraction",
        },
      ],
    },
  },
  {
    type: "value_props",
    order: 5,
    visible: true,
    content: {
      items: [
        {
          title: "All-in-One Platform",
          body: "Replace 5+ disconnected tools with one unified construction management system for projects and real estate.",
        },
        {
          title: "Live in Minutes",
          body: "No six-month implementation. Sign up, import your data, and go live the same day.",
        },
        {
          title: "AI-Native from Day One",
          body: "Built-in AI for document extraction, cost forecasting, natural language queries, and more.",
        },
        {
          title: "Enterprise Security",
          body: "Row-level data isolation, encrypted storage, role-based access, and full audit logging.",
        },
      ],
    },
  },
  {
    type: "modules_grid",
    order: 6,
    visible: true,
    content: {
      title: "Everything Else You Need",
      subtitle:
        "Beyond the core modules, ConstructionERP includes tools for every part of your construction business.",
      cards: [
        {
          icon: "C",
          title: "CRM & Bid Management",
          body: "Track leads, manage bid invitations, generate proposals, and convert opportunities into active projects from a centralized pipeline view.",
        },
        {
          icon: "W",
          title: "Workforce & Time Tracking",
          body: "Crew scheduling, certified payroll, safety compliance, GPS clock-in/out, and field worker mobile access for every job site.",
        },
        {
          icon: "AI",
          title: "AI Assistant",
          body: 'Ask questions in plain English across all your data. Get answers like "Which projects are over budget?" or "Show overdue invoices" instantly.',
        },
        {
          icon: "R",
          title: "Reports & Analytics",
          body: "Financial statements, project performance, property NOI, and custom reports. Export to PDF or Excel. Schedule automated delivery.",
        },
      ],
    },
  },
  {
    type: "pricing",
    order: 7,
    visible: true,
    content: {
      title: "Simple, Transparent Pricing",
      subtitle:
        "No hidden fees. No per-project charges. Every plan includes a 14-day free trial with full access to all construction management features.",
      plans: [
        {
          name: "Starter",
          description: "For small contractors and owner-builders",
          price: "79",
          period: "/month",
          features: [
            "Up to 3 active projects",
            "5 team members",
            "Gantt scheduling & daily logs",
            "Invoicing and payment tracking",
            "10 GB document storage",
            "Standard reports",
            "Email support",
          ],
          featured: false,
          badge: "",
        },
        {
          name: "Professional",
          description: "For growing general contractors and developers",
          price: "199",
          period: "/month",
          features: [
            "Up to 15 active projects",
            "25 team members",
            "Everything in Starter, plus:",
            "Property & lease management",
            "AI assistant (bring your own API key)",
            "CRM & bid pipeline",
            "Workforce time tracking",
            "50 GB document storage",
            "PDF & Excel report exports",
            "Priority support",
          ],
          featured: true,
          badge: "Most Popular",
        },
        {
          name: "Enterprise",
          description: "For established firms managing large portfolios",
          price: "449",
          period: "/month",
          features: [
            "Unlimited projects",
            "Unlimited team members",
            "Everything in Professional, plus:",
            "Multi-provider AI configuration",
            "AI document extraction",
            "Tenant & vendor portals",
            "Advanced RBAC & audit logging",
            "500 GB document storage",
            "Scheduled report delivery",
            "Dedicated support channel",
          ],
          featured: false,
          badge: "",
        },
      ],
    },
  },
  {
    type: "faq",
    order: 8,
    visible: true,
    content: {
      title: "Frequently Asked Questions",
      items: [
        {
          question: "What is construction ERP software?",
          answer:
            "Construction ERP (Enterprise Resource Planning) software is a unified platform that integrates project management, financial tracking, document control, workforce management, and business operations into a single system. Instead of juggling separate tools for scheduling, accounting, and document storage, construction ERP brings everything together so teams can work faster with complete visibility across all projects.",
        },
        {
          question: "Who is ConstructionERP built for?",
          answer:
            "ConstructionERP is designed for general contractors, real estate developers, property managers, specialty subcontractors, design-build firms, and owner-builders who need a single platform to manage construction projects and real estate assets. Whether you run 3 projects or 300, the platform scales with your business.",
        },
        {
          question: "How does this compare to Procore or Buildertrend?",
          answer:
            "Unlike legacy platforms, ConstructionERP is built on modern cloud infrastructure with AI capabilities from day one. It combines construction project management AND property management in one platform — so you do not need separate systems for building and managing real estate. Pricing starts at $79/month versus the $375+ typical of enterprise construction software.",
        },
        {
          question: "What AI features are included?",
          answer:
            "An AI assistant that answers questions about your projects, finances, and properties in real time, plus AI-powered document extraction for invoices, contracts, and lien waivers. AI features use a bring-your-own-key model — you connect your preferred provider (OpenAI, Anthropic Claude, Google Gemini, and seven others) so you control costs and data privacy.",
        },
        {
          question: "Is there a free trial?",
          answer:
            "Yes. Every plan includes a 14-day free trial with full access to all features. No credit card required to start. Import your existing projects and test every module before committing.",
        },
        {
          question:
            "Can I manage both construction projects and rental properties?",
          answer:
            "Yes. ConstructionERP is one of the few platforms that covers the full lifecycle — from pre-construction bidding through project execution, then into property management with unit tracking, lease management, tenant communications, and maintenance workflows. One platform, one login, one source of truth.",
        },
        {
          question: "How secure is my data?",
          answer:
            "Every company gets fully isolated data through row-level security policies. All documents are stored with encryption at rest. The platform includes role-based access control, full audit logging, and supports SSO integration on the Enterprise plan. Your data is hosted on enterprise-grade cloud infrastructure.",
        },
        {
          question: "Can my field team use it on mobile?",
          answer:
            "Yes. ConstructionERP includes dedicated mobile views for field workers (GPS clock-in, daily logs, photo capture, safety checklists) and executives (KPI dashboards, approval queues, AI queries). Works on any smartphone or tablet browser — no app store download needed.",
        },
        {
          question: "Does ConstructionERP work for my region?",
          answer:
            "Yes. ConstructionERP is used by general contractors, real estate developers, and property managers across the United States, Canada, and internationally. The platform supports multiple currencies, tax configurations, and regional compliance requirements including certified payroll and prevailing wage tracking.",
        },
        {
          question: "What types of construction companies use ConstructionERP?",
          answer:
            "ConstructionERP serves general contractors, specialty subcontractors, real estate developers, design-build firms, owner-builders, and property management companies. Whether you build commercial offices, residential subdivisions, industrial facilities, or mixed-use developments — the platform adapts to your project types and workflows.",
        },
      ],
    },
  },
  {
    type: "cta",
    order: 9,
    visible: true,
    content: {
      title: "Ready to Run Your Construction Business from One Platform?",
      subtitle:
        "14-day free trial. No credit card required. Set up in minutes.",
      cta_text: "Start Your Free Trial",
      cta_link: "/register",
    },
  },
];
