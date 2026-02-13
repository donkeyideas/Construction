// ---------------------------------------------------------------------------
// Static Integration Provider Catalog
// ---------------------------------------------------------------------------

export interface IntegrationProvider {
  key: string;
  name: string;
  description: string;
  category: "accounting" | "project_management" | "communication" | "payment";
  auth_type: "oauth2" | "api_key" | "webhook";
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    key: "quickbooks",
    name: "QuickBooks Online",
    description: "Sync invoices, payments, and accounts.",
    category: "accounting",
    auth_type: "oauth2",
  },
  {
    key: "procore",
    name: "Procore",
    description: "Import projects, RFIs, and submittals.",
    category: "project_management",
    auth_type: "oauth2",
  },
  {
    key: "sage",
    name: "Sage 300 CRE",
    description: "Sync financial data with Sage.",
    category: "accounting",
    auth_type: "api_key",
  },
  {
    key: "xero",
    name: "Xero",
    description: "Sync invoices and bank transactions.",
    category: "accounting",
    auth_type: "oauth2",
  },
  {
    key: "google_calendar",
    name: "Google Calendar",
    description: "Sync project milestones and deadlines.",
    category: "communication",
    auth_type: "oauth2",
  },
  {
    key: "slack",
    name: "Slack",
    description: "Send notifications to Slack channels.",
    category: "communication",
    auth_type: "oauth2",
  },
  {
    key: "stripe",
    name: "Stripe",
    description: "Process payments and subscriptions.",
    category: "payment",
    auth_type: "api_key",
  },
  {
    key: "email_smtp",
    name: "Email (SMTP)",
    description: "Configure custom SMTP for emails.",
    category: "communication",
    auth_type: "api_key",
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  accounting: "Accounting",
  project_management: "Project Management",
  communication: "Communication",
  payment: "Payment",
};
