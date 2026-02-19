export interface NavChild {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href?: string;
  icon: string;
  children?: NavChild[];
}

export const appNavigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "layout-dashboard",
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: "calendar-days",
  },
  {
    label: "Inbox",
    href: "/inbox",
    icon: "inbox",
  },
  {
    label: "Tickets",
    href: "/tickets",
    icon: "ticket",
  },
  {
    label: "Projects",
    icon: "hard-hat",
    children: [
      { label: "Overview", href: "/projects/overview" },
      { label: "Transactions", href: "/projects/transactions" },
      { label: "Active Projects", href: "/projects" },
      { label: "Gantt Schedule", href: "/projects/gantt" },
      { label: "Daily Logs", href: "/projects/daily-logs" },
      { label: "RFIs", href: "/projects/rfis" },
      { label: "Submittals", href: "/projects/submittals" },
      { label: "Change Orders", href: "/projects/change-orders" },
      { label: "Contracts", href: "/contracts" },
    ],
  },
  {
    label: "Properties",
    icon: "building-2",
    children: [
      { label: "Overview", href: "/properties/overview" },
      { label: "Transactions", href: "/properties/transactions" },
      { label: "Portfolio", href: "/properties" },
      { label: "Leases", href: "/properties/leases" },
      { label: "Expenses", href: "/properties/expenses" },
      { label: "Maintenance", href: "/properties/maintenance" },
    ],
  },
  {
    label: "Safety",
    icon: "shield-check",
    children: [
      { label: "Overview", href: "/safety/overview" },
      { label: "Transactions", href: "/safety/transactions" },
      { label: "Dashboard", href: "/safety" },
      { label: "Incidents", href: "/safety/incidents" },
      { label: "Inspections", href: "/safety/inspections" },
      { label: "Toolbox Talks", href: "/safety/toolbox-talks" },
    ],
  },
  {
    label: "Equipment",
    icon: "wrench",
    children: [
      { label: "Overview", href: "/equipment/overview" },
      { label: "Transactions", href: "/equipment/transactions" },
      { label: "Dashboard", href: "/equipment" },
      { label: "Inventory", href: "/equipment/inventory" },
      { label: "Assignments", href: "/equipment/assignments" },
      { label: "Maintenance", href: "/equipment/maintenance" },
    ],
  },
  {
    label: "Financial",
    icon: "dollar-sign",
    children: [
      { label: "Overview", href: "/financial" },
      { label: "Transactions", href: "/financial/transactions" },
      { label: "Invoices", href: "/financial/invoices" },
      { label: "Accounts Receivable", href: "/financial/ar" },
      { label: "Accounts Payable", href: "/financial/ap" },
      { label: "General Ledger", href: "/financial/general-ledger" },
      { label: "Chart of Accounts", href: "/financial/accounts" },
      { label: "Income Statement", href: "/financial/income-statement" },
      { label: "Balance Sheet", href: "/financial/balance-sheet" },
      { label: "Cash Flow", href: "/financial/cash-flow" },
      { label: "Banking", href: "/financial/banking" },
      { label: "Budget vs Actual", href: "/financial/budget" },
      { label: "Job Costing", href: "/financial/job-costing" },
      { label: "KPI Dashboard", href: "/financial/kpi" },
      { label: "Financial Audit", href: "/financial/audit" },
    ],
  },
  {
    label: "Documents",
    icon: "folder-open",
    children: [
      { label: "Overview", href: "/documents/overview" },
      { label: "Transactions", href: "/documents/transactions" },
      { label: "Library", href: "/documents" },
      { label: "Plan Room", href: "/documents/plan-room" },
    ],
  },
  {
    label: "People",
    icon: "users",
    children: [
      { label: "Overview", href: "/people/overview" },
      { label: "Transactions", href: "/people/transactions" },
      { label: "Directory", href: "/people" },
      { label: "Time & Attendance", href: "/people/time" },
      { label: "Payroll", href: "/people/payroll" },
      { label: "Certifications", href: "/people/certifications" },
      { label: "Vendors", href: "/people/vendors" },
    ],
  },
  {
    label: "CRM & Bids",
    icon: "handshake",
    children: [
      { label: "Overview", href: "/crm/overview" },
      { label: "Transactions", href: "/crm/transactions" },
      { label: "Pipeline", href: "/crm" },
      { label: "Bid Management", href: "/crm/bids" },
      { label: "Estimating", href: "/estimating" },
    ],
  },
  {
    label: "AI Assistant",
    icon: "sparkles",
    children: [
      { label: "Chat", href: "/ai-assistant" },
      { label: "Automation", href: "/automation" },
    ],
  },
  {
    label: "Reports",
    icon: "bar-chart-3",
    children: [
      { label: "Reports Center", href: "/reports" },
      { label: "Authoritative Reports", href: "/reports/authoritative" },
    ],
  },
  {
    label: "System Map",
    href: "/system-map",
    icon: "map",
  },
  {
    label: "Administration",
    icon: "settings",
    children: [
      { label: "Users & Roles", href: "/admin/users" },
      { label: "Company Settings", href: "/admin/settings" },
      { label: "AI Providers", href: "/admin/ai-providers" },
      { label: "Integrations", href: "/admin/integrations" },
      { label: "Security", href: "/admin/security" },
    ],
  },
];

export const appBottomNav: NavItem[] = [];
