// ---------------------------------------------------------------------------
// Shared module definitions used across registration, settings, and sidebar
// ---------------------------------------------------------------------------

export const MODULE_KEYS = [
  "project_management",
  "property_management",
  "financial_management",
  "document_management",
  "people_workforce",
  "crm_business_dev",
  "ai_intelligence",
  "reporting_analytics",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export interface ModuleOption {
  key: ModuleKey;
  name: string;
  description: string;
  color: string;
  icon: string;
  defaultChecked: boolean;
}

export const MODULES: ModuleOption[] = [
  {
    key: "project_management",
    name: "Project Management",
    description: "Scheduling, tasks, timelines",
    color: "#2563eb",
    icon: "PM",
    defaultChecked: true,
  },
  {
    key: "property_management",
    name: "Property Management",
    description: "Tenants, leases, maintenance",
    color: "#059669",
    icon: "PR",
    defaultChecked: false,
  },
  {
    key: "financial_management",
    name: "Financial Management",
    description: "Budgets, invoices, payments",
    color: "#d97706",
    icon: "FM",
    defaultChecked: true,
  },
  {
    key: "document_management",
    name: "Document Management",
    description: "Files, contracts, blueprints",
    color: "#7c3aed",
    icon: "DM",
    defaultChecked: false,
  },
  {
    key: "people_workforce",
    name: "People & Workforce",
    description: "Crew tracking, HR, timesheets",
    color: "#dc2626",
    icon: "PW",
    defaultChecked: false,
  },
  {
    key: "crm_business_dev",
    name: "CRM & Business Dev",
    description: "Leads, clients, proposals",
    color: "#0891b2",
    icon: "CR",
    defaultChecked: false,
  },
  {
    key: "ai_intelligence",
    name: "AI Intelligence",
    description: "Smart insights, predictions",
    color: "#9333ea",
    icon: "AI",
    defaultChecked: true,
  },
  {
    key: "reporting_analytics",
    name: "Reporting & Analytics",
    description: "Dashboards, KPIs, exports",
    color: "#0d9488",
    icon: "RA",
    defaultChecked: false,
  },
];

// ---------------------------------------------------------------------------
// Maps module keys → sidebar nav labels that should show when module is enabled
// ---------------------------------------------------------------------------

export const MODULE_NAV_MAP: Record<ModuleKey, string[]> = {
  project_management: ["Projects", "Safety", "Equipment"],
  property_management: ["Properties"],
  financial_management: ["Financial"],
  document_management: ["Documents"],
  people_workforce: ["People"],
  crm_business_dev: ["CRM & Bids"],
  ai_intelligence: ["AI Intelligence"],
  reporting_analytics: ["Reports"],
};

// Nav labels always visible regardless of module selection
export const ALWAYS_VISIBLE_NAV = [
  "Dashboard",
  "Calendar",
  "Inbox",
  "Tickets",
  "System Map",
  "Administration",
];
