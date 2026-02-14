// ============================================================
// System Map Configuration
// Defines all dashboards, sections, and pages in the platform.
// Entirely config-driven -- no database needed.
// ============================================================

export type PageStatus = "active" | "coming_soon" | "inactive";

export interface SystemPage {
  label: string;
  href: string;
  status: PageStatus;
  description: string;
  roles: string[];
}

export interface SystemSection {
  label: string;
  icon: string;
  pages: SystemPage[];
}

export interface SystemDashboard {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  loginUrl: string;
  sections: SystemSection[];
}

export const systemMap: SystemDashboard[] = [
  // ──────────────────────────────────────────────
  // 1. Executive Dashboard
  // ──────────────────────────────────────────────
  {
    id: "executive",
    label: "Executive Dashboard",
    description:
      "Primary workspace for company owners, admins, project managers, superintendents, accountants, and field workers. Covers projects, properties, financials, documents, people, CRM, and AI tools.",
    icon: "layout-dashboard",
    color: "#3b82f6",
    loginUrl: "/login",
    sections: [
      {
        label: "Core",
        icon: "layout-dashboard",
        pages: [
          {
            label: "Dashboard",
            href: "/dashboard",
            status: "active",
            description: "KPIs, charts, approvals, activity, and AI insights",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant", "field_worker", "viewer"],
          },
          {
            label: "Calendar",
            href: "/calendar",
            status: "active",
            description: "Schedule view for deadlines, inspections, and milestones",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant", "field_worker", "viewer"],
          },
          {
            label: "Inbox",
            href: "/inbox",
            status: "active",
            description: "Internal messages and notifications hub",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant", "field_worker", "viewer"],
          },
          {
            label: "Tickets",
            href: "/tickets",
            status: "active",
            description: "Support tickets and issue tracking",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant", "field_worker", "viewer"],
          },
        ],
      },
      {
        label: "Contracts",
        icon: "file-text",
        pages: [
          {
            label: "Contracts",
            href: "/contracts",
            status: "active",
            description: "Contract management with milestones, terms, and tracking",
            roles: ["owner", "admin", "project_manager", "accountant"],
          },
        ],
      },
      {
        label: "Projects",
        icon: "hard-hat",
        pages: [
          {
            label: "Active Projects",
            href: "/projects",
            status: "active",
            description: "List of all active construction projects",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant", "field_worker", "viewer"],
          },
          {
            label: "Gantt Schedule",
            href: "/projects/gantt",
            status: "active",
            description: "Interactive Gantt chart for project scheduling",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
          {
            label: "Daily Logs",
            href: "/projects/daily-logs",
            status: "active",
            description: "Daily field reports and progress logs",
            roles: ["owner", "admin", "project_manager", "superintendent", "field_worker"],
          },
          {
            label: "RFIs",
            href: "/projects/rfis",
            status: "active",
            description: "Requests for information tracking",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
          {
            label: "Change Orders",
            href: "/projects/change-orders",
            status: "active",
            description: "Track and manage project change orders",
            roles: ["owner", "admin", "project_manager", "accountant"],
          },
        ],
      },
      {
        label: "Properties",
        icon: "building-2",
        pages: [
          {
            label: "Portfolio",
            href: "/properties",
            status: "active",
            description: "Overview of all managed properties with photos and units",
            roles: ["owner", "admin", "project_manager"],
          },
          {
            label: "Leases",
            href: "/properties/leases",
            status: "active",
            description: "Lease agreements and tenant assignments",
            roles: ["owner", "admin"],
          },
          {
            label: "Maintenance",
            href: "/properties/maintenance",
            status: "active",
            description: "Property maintenance requests and work orders",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
        ],
      },
      {
        label: "Safety",
        icon: "shield-check",
        pages: [
          {
            label: "Safety Dashboard",
            href: "/safety",
            status: "active",
            description: "Safety metrics, incident rates, and compliance overview",
            roles: ["owner", "admin", "project_manager", "superintendent", "field_worker"],
          },
          {
            label: "Incidents",
            href: "/safety/incidents",
            status: "active",
            description: "Report and track workplace safety incidents",
            roles: ["owner", "admin", "project_manager", "superintendent", "field_worker"],
          },
          {
            label: "Inspections",
            href: "/safety/inspections",
            status: "active",
            description: "Site inspection checklists and compliance records",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
          {
            label: "Toolbox Talks",
            href: "/safety/toolbox-talks",
            status: "active",
            description: "Safety meeting topics, schedules, and attendance",
            roles: ["owner", "admin", "project_manager", "superintendent", "field_worker"],
          },
        ],
      },
      {
        label: "Equipment",
        icon: "wrench",
        pages: [
          {
            label: "Equipment Dashboard",
            href: "/equipment",
            status: "active",
            description: "Equipment fleet overview and utilization metrics",
            roles: ["owner", "admin", "project_manager", "superintendent", "field_worker"],
          },
          {
            label: "Inventory",
            href: "/equipment/inventory",
            status: "active",
            description: "Complete equipment inventory and specifications",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
          {
            label: "Assignments",
            href: "/equipment/assignments",
            status: "active",
            description: "Equipment assignments to projects and personnel",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
          {
            label: "Maintenance",
            href: "/equipment/maintenance",
            status: "active",
            description: "Equipment maintenance schedules and service records",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
        ],
      },
      {
        label: "Financial",
        icon: "dollar-sign",
        pages: [
          {
            label: "Overview",
            href: "/financial",
            status: "active",
            description: "Financial dashboard with key metrics",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Invoices",
            href: "/financial/invoices",
            status: "active",
            description: "Create and manage invoices for clients and vendors",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Accounts Receivable",
            href: "/financial/ar",
            status: "active",
            description: "Client invoices, collections, and aging reports",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Accounts Payable",
            href: "/financial/ap",
            status: "active",
            description: "Vendor bills, payments, and aging reports",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "General Ledger",
            href: "/financial/general-ledger",
            status: "active",
            description: "Complete journal entry ledger with filtering",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Chart of Accounts",
            href: "/financial/accounts",
            status: "active",
            description: "Chart of accounts with account types and balances",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Income Statement",
            href: "/financial/income-statement",
            status: "active",
            description: "Profit & loss report for selected periods",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Balance Sheet",
            href: "/financial/balance-sheet",
            status: "active",
            description: "Assets, liabilities, and equity breakdown",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Cash Flow",
            href: "/financial/cash-flow",
            status: "active",
            description: "Cash flow projections and historical analysis",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Banking",
            href: "/financial/banking",
            status: "active",
            description: "Bank accounts, transactions, and reconciliation",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Budget vs Actual",
            href: "/financial/budget",
            status: "active",
            description: "Compare planned budgets against actual spend",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Job Costing",
            href: "/financial/job-costing",
            status: "active",
            description: "Track costs against budgets by project and phase",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "KPI Dashboard",
            href: "/financial/kpi",
            status: "active",
            description: "Financial key performance indicators and trends",
            roles: ["owner", "admin", "accountant"],
          },
        ],
      },
      {
        label: "Documents",
        icon: "folder-open",
        pages: [
          {
            label: "Library",
            href: "/documents",
            status: "active",
            description: "Central document repository for all files",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant", "field_worker", "viewer"],
          },
          {
            label: "Plan Room",
            href: "/documents/plan-room",
            status: "active",
            description: "Blueprints, drawings, and plan sets viewer with annotations",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
        ],
      },
      {
        label: "People",
        icon: "users",
        pages: [
          {
            label: "Directory",
            href: "/people",
            status: "active",
            description: "Employee and subcontractor directory",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
          {
            label: "Time & Attendance",
            href: "/people/time",
            status: "active",
            description: "Clock-in/out records and timesheets",
            roles: ["owner", "admin", "project_manager", "superintendent"],
          },
          {
            label: "Certifications",
            href: "/people/certifications",
            status: "active",
            description: "Track licenses, certifications, and expiry dates",
            roles: ["owner", "admin", "project_manager"],
          },
          {
            label: "Vendors",
            href: "/people/vendors",
            status: "active",
            description: "Vendor and subcontractor management",
            roles: ["owner", "admin", "project_manager"],
          },
        ],
      },
      {
        label: "CRM & Bids",
        icon: "handshake",
        pages: [
          {
            label: "Pipeline",
            href: "/crm",
            status: "active",
            description: "Sales pipeline and lead management",
            roles: ["owner", "admin", "project_manager"],
          },
          {
            label: "Bid Management",
            href: "/crm/bids",
            status: "active",
            description: "Create, track, and submit project bids",
            roles: ["owner", "admin", "project_manager"],
          },
        ],
      },
      {
        label: "AI & Automation",
        icon: "sparkles",
        pages: [
          {
            label: "AI Assistant",
            href: "/ai-assistant",
            status: "active",
            description: "AI-powered assistant for queries and insights",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant"],
          },
          {
            label: "Automation",
            href: "/automation",
            status: "active",
            description: "Automated workflows and rule-based triggers",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "Reports",
        icon: "bar-chart-3",
        pages: [
          {
            label: "Reports",
            href: "/reports",
            status: "active",
            description: "Generate and view project, financial, and safety reports",
            roles: ["owner", "admin", "project_manager", "accountant"],
          },
          {
            label: "Aging Report",
            href: "/reports/aging",
            status: "active",
            description: "Accounts receivable and payable aging analysis",
            roles: ["owner", "admin", "accountant"],
          },
          {
            label: "Portfolio Report",
            href: "/reports/portfolio",
            status: "active",
            description: "Property portfolio performance and occupancy",
            roles: ["owner", "admin"],
          },
          {
            label: "Project Performance",
            href: "/reports/project-performance",
            status: "active",
            description: "Project-level performance metrics and comparisons",
            roles: ["owner", "admin", "project_manager"],
          },
          {
            label: "Financial Summary",
            href: "/reports/financial-summary",
            status: "active",
            description: "Revenue, expenses, net income, and AR/AP balances",
            roles: ["owner", "admin", "accountant"],
          },
        ],
      },
      {
        label: "Administration",
        icon: "settings",
        pages: [
          {
            label: "Users & Roles",
            href: "/admin/users",
            status: "active",
            description: "Manage team members, roles, and permissions",
            roles: ["owner", "admin"],
          },
          {
            label: "Company Settings",
            href: "/admin/settings",
            status: "active",
            description: "Company profile, branding, subscription, and audit log",
            roles: ["owner", "admin"],
          },
          {
            label: "AI Providers",
            href: "/admin/ai-providers",
            status: "active",
            description: "Configure AI model providers and API keys",
            roles: ["owner", "admin"],
          },
          {
            label: "Integrations",
            href: "/admin/integrations",
            status: "active",
            description: "Third-party integrations and API connections",
            roles: ["owner", "admin"],
          },
          {
            label: "Security",
            href: "/admin/security",
            status: "active",
            description: "Security settings, sessions, login history, and audit log",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "System Map",
        icon: "map",
        pages: [
          {
            label: "System Map",
            href: "/system-map",
            status: "active",
            description: "Visual overview of all platform dashboards and pages",
            roles: ["owner", "admin", "project_manager", "superintendent", "accountant", "field_worker", "viewer"],
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // 2. Tenant Portal
  // ──────────────────────────────────────────────
  {
    id: "tenant",
    label: "Tenant Portal",
    description:
      "Self-service portal for tenants to manage leases, payments, maintenance requests, and documents.",
    icon: "home",
    color: "#22c55e",
    loginUrl: "/login/tenant",
    sections: [
      {
        label: "Home",
        icon: "home",
        pages: [
          {
            label: "Home",
            href: "/tenant",
            status: "active",
            description: "Tenant dashboard with lease summary and quick actions",
            roles: ["tenant"],
          },
        ],
      },
      {
        label: "My Lease",
        icon: "file-text",
        pages: [
          {
            label: "My Lease",
            href: "/tenant/lease",
            status: "active",
            description: "View lease details, terms, and renewal information",
            roles: ["tenant"],
          },
        ],
      },
      {
        label: "Payments",
        icon: "credit-card",
        pages: [
          {
            label: "Payments",
            href: "/tenant/payments",
            status: "active",
            description: "Pay rent, view history, and download receipts",
            roles: ["tenant"],
          },
        ],
      },
      {
        label: "Maintenance",
        icon: "wrench",
        pages: [
          {
            label: "Maintenance",
            href: "/tenant/maintenance",
            status: "active",
            description: "View maintenance requests and their status",
            roles: ["tenant"],
          },
          {
            label: "New Request",
            href: "/tenant/maintenance/new",
            status: "active",
            description: "Submit a new maintenance request",
            roles: ["tenant"],
          },
        ],
      },
      {
        label: "Documents",
        icon: "folder-open",
        pages: [
          {
            label: "Documents",
            href: "/tenant/documents",
            status: "active",
            description: "Access shared documents and forms",
            roles: ["tenant"],
          },
        ],
      },
      {
        label: "Announcements",
        icon: "megaphone",
        pages: [
          {
            label: "Announcements",
            href: "/tenant/announcements",
            status: "active",
            description: "Property-wide announcements and updates",
            roles: ["tenant"],
          },
        ],
      },
      {
        label: "Profile",
        icon: "user",
        pages: [
          {
            label: "Profile",
            href: "/tenant/profile",
            status: "active",
            description: "Manage contact info and notification preferences",
            roles: ["tenant"],
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // 3. Vendor Portal
  // ──────────────────────────────────────────────
  {
    id: "vendor",
    label: "Vendor Portal",
    description:
      "Portal for vendors and subcontractors to manage contracts, invoices, compliance documents, and project collaboration.",
    icon: "truck",
    color: "#f59e0b",
    loginUrl: "/login/vendor",
    sections: [
      {
        label: "Dashboard",
        icon: "layout-dashboard",
        pages: [
          {
            label: "Dashboard",
            href: "/vendor",
            status: "active",
            description: "Vendor overview with active contracts and pending invoices",
            roles: ["vendor"],
          },
        ],
      },
      {
        label: "Contracts",
        icon: "file-signature",
        pages: [
          {
            label: "Contracts",
            href: "/vendor/contracts",
            status: "active",
            description: "View and manage active and past contracts",
            roles: ["vendor"],
          },
        ],
      },
      {
        label: "Invoices",
        icon: "receipt",
        pages: [
          {
            label: "Invoices",
            href: "/vendor/invoices",
            status: "active",
            description: "View submitted invoices and their payment status",
            roles: ["vendor"],
          },
          {
            label: "New Invoice",
            href: "/vendor/invoices/new",
            status: "active",
            description: "Submit a new invoice against a contract",
            roles: ["vendor"],
          },
        ],
      },
      {
        label: "Payments",
        icon: "banknote",
        pages: [
          {
            label: "Payments",
            href: "/vendor/payments",
            status: "active",
            description: "Payment history and upcoming payment schedule",
            roles: ["vendor"],
          },
        ],
      },
      {
        label: "Projects",
        icon: "hard-hat",
        pages: [
          {
            label: "Projects",
            href: "/vendor/projects",
            status: "active",
            description: "Projects assigned to your company",
            roles: ["vendor"],
          },
        ],
      },
      {
        label: "Documents",
        icon: "folder-open",
        pages: [
          {
            label: "Documents",
            href: "/vendor/documents",
            status: "active",
            description: "Shared documents, specs, and drawings",
            roles: ["vendor"],
          },
        ],
      },
      {
        label: "Compliance",
        icon: "shield-check",
        pages: [
          {
            label: "Compliance",
            href: "/vendor/compliance",
            status: "active",
            description: "Insurance, licenses, and compliance document uploads",
            roles: ["vendor"],
          },
          {
            label: "Upload Document",
            href: "/vendor/compliance/upload",
            status: "active",
            description: "Upload new compliance documents",
            roles: ["vendor"],
          },
        ],
      },
      {
        label: "Profile",
        icon: "user",
        pages: [
          {
            label: "Profile",
            href: "/vendor/profile",
            status: "active",
            description: "Company profile, contact info, and W-9 details",
            roles: ["vendor"],
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // 4. Admin Dashboard
  // ──────────────────────────────────────────────
  {
    id: "admin",
    label: "Admin Dashboard",
    description:
      "Company administration panel for managing users, permissions, tenants, vendors, billing, integrations, content, and system settings.",
    icon: "settings",
    color: "#a855f7",
    loginUrl: "/login",
    sections: [
      {
        label: "Overview",
        icon: "layout-dashboard",
        pages: [
          {
            label: "Overview",
            href: "/admin-panel",
            status: "active",
            description: "Admin dashboard with company health metrics",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "Team",
        icon: "users",
        pages: [
          {
            label: "Users",
            href: "/admin-panel/users",
            status: "active",
            description: "Manage team members and their roles",
            roles: ["owner", "admin"],
          },
          {
            label: "Invitations",
            href: "/admin-panel/users/invitations",
            status: "active",
            description: "Pending invitations and invite history",
            roles: ["owner", "admin"],
          },
          {
            label: "Permissions",
            href: "/admin-panel/users/permissions",
            status: "active",
            description: "Role-based access control configuration",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "Company",
        icon: "building",
        pages: [
          {
            label: "Company Settings",
            href: "/admin-panel/company/settings",
            status: "active",
            description: "Company profile, branding, and general settings",
            roles: ["owner", "admin"],
          },
          {
            label: "Billing",
            href: "/admin-panel/company/billing",
            status: "active",
            description: "Subscription plan, payment methods, and invoices",
            roles: ["owner", "admin"],
          },
          {
            label: "Integrations",
            href: "/admin-panel/company/integrations",
            status: "active",
            description: "Third-party integrations and API connections",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "Tenants",
        icon: "home",
        pages: [
          {
            label: "Tenants",
            href: "/admin-panel/tenants",
            status: "active",
            description: "Manage tenant accounts and lease assignments",
            roles: ["owner", "admin"],
          },
          {
            label: "Tenant Invite",
            href: "/admin-panel/tenants/invite",
            status: "active",
            description: "Invite new tenants to the portal",
            roles: ["owner", "admin"],
          },
          {
            label: "Announcements",
            href: "/admin-panel/tenants/announcements",
            status: "active",
            description: "Create and manage property announcements",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "Vendors",
        icon: "truck",
        pages: [
          {
            label: "Vendors",
            href: "/admin-panel/vendors",
            status: "active",
            description: "Manage vendor accounts and assignments",
            roles: ["owner", "admin"],
          },
          {
            label: "Vendor Invite",
            href: "/admin-panel/vendors/invite",
            status: "active",
            description: "Invite new vendors and subcontractors",
            roles: ["owner", "admin"],
          },
          {
            label: "Compliance",
            href: "/admin-panel/vendors/compliance",
            status: "active",
            description: "Review vendor compliance documents and status",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "Content & SEO",
        icon: "file-text",
        pages: [
          {
            label: "Content",
            href: "/admin-panel/content",
            status: "active",
            description: "Manage CMS pages and content blocks",
            roles: ["owner", "admin"],
          },
          {
            label: "SEO",
            href: "/admin-panel/seo",
            status: "active",
            description: "SEO settings, keywords, and meta configuration",
            roles: ["owner", "admin"],
          },
        ],
      },
      {
        label: "AI & System",
        icon: "cpu",
        pages: [
          {
            label: "AI Providers",
            href: "/admin-panel/ai-providers",
            status: "active",
            description: "Configure AI model providers and API keys",
            roles: ["owner", "admin"],
          },
          {
            label: "Automation",
            href: "/admin-panel/automation",
            status: "active",
            description: "Automated workflows and rule-based triggers",
            roles: ["owner", "admin"],
          },
          {
            label: "Security",
            href: "/admin-panel/security",
            status: "active",
            description: "Security settings, sessions, and login history",
            roles: ["owner", "admin"],
          },
          {
            label: "Audit Log",
            href: "/admin-panel/audit-log",
            status: "active",
            description: "System-wide activity and change audit trail",
            roles: ["owner", "admin"],
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // 5. Platform Super Admin
  // ──────────────────────────────────────────────
  {
    id: "super-admin",
    label: "Platform Super Admin",
    description:
      "SaaS-wide administration for managing all companies, users, subscriptions, CMS, SEO, and platform announcements. Requires the is_platform_admin flag.",
    icon: "shield",
    color: "#ef4444",
    loginUrl: "/login",
    sections: [
      {
        label: "Dashboard",
        icon: "layout-dashboard",
        pages: [
          {
            label: "Dashboard",
            href: "/super-admin",
            status: "active",
            description: "Platform-wide KPIs and system health",
            roles: ["platform_admin"],
          },
        ],
      },
      {
        label: "Companies",
        icon: "building-2",
        pages: [
          {
            label: "Companies",
            href: "/super-admin/companies",
            status: "active",
            description: "Manage all registered companies on the platform",
            roles: ["platform_admin"],
          },
        ],
      },
      {
        label: "Users",
        icon: "users",
        pages: [
          {
            label: "Users",
            href: "/super-admin/users",
            status: "active",
            description: "View and manage all platform users",
            roles: ["platform_admin"],
          },
        ],
      },
      {
        label: "Subscriptions",
        icon: "credit-card",
        pages: [
          {
            label: "Subscriptions",
            href: "/super-admin/subscriptions",
            status: "active",
            description: "Manage subscription plans and billing events",
            roles: ["platform_admin"],
          },
        ],
      },
      {
        label: "CMS",
        icon: "file-text",
        pages: [
          {
            label: "CMS Pages",
            href: "/super-admin/content",
            status: "active",
            description: "Manage platform-wide CMS content pages",
            roles: ["platform_admin"],
          },
        ],
      },
      {
        label: "SEO",
        icon: "search",
        pages: [
          {
            label: "SEO Keywords",
            href: "/super-admin/seo",
            status: "active",
            description: "Platform SEO keywords and ranking configuration",
            roles: ["platform_admin"],
          },
        ],
      },
      {
        label: "Announcements",
        icon: "megaphone",
        pages: [
          {
            label: "Announcements",
            href: "/super-admin/announcements",
            status: "active",
            description: "Create platform-wide announcements for all companies",
            roles: ["platform_admin"],
          },
        ],
      },
    ],
  },
];

// ──────────────────────────────────────────────
// Helper utilities for computing stats
// ──────────────────────────────────────────────

export function getAllPages(dashboards: SystemDashboard[]): SystemPage[] {
  return dashboards.flatMap((d) => d.sections.flatMap((s) => s.pages));
}

export function getPageCountByStatus(
  dashboards: SystemDashboard[],
  status: PageStatus
): number {
  return getAllPages(dashboards).filter((p) => p.status === status).length;
}

export function getTotalPageCount(dashboards: SystemDashboard[]): number {
  return getAllPages(dashboards).length;
}
