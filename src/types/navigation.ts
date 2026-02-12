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
    label: "Projects",
    icon: "hard-hat",
    children: [
      { label: "Active Projects", href: "/projects" },
      { label: "Gantt Schedule", href: "/projects/gantt" },
      { label: "Daily Logs", href: "/projects/daily-logs" },
      { label: "RFIs", href: "/projects/rfis" },
      { label: "Change Orders", href: "/projects/change-orders" },
    ],
  },
  {
    label: "Properties",
    icon: "building-2",
    children: [
      { label: "Portfolio", href: "/properties" },
      { label: "Leases", href: "/properties/leases" },
      { label: "Maintenance", href: "/properties/maintenance" },
    ],
  },
  {
    label: "Financial",
    icon: "dollar-sign",
    children: [
      { label: "Overview", href: "/financial" },
      { label: "Job Costing", href: "/financial/job-costing" },
      { label: "Accounts Payable", href: "/financial/ap" },
      { label: "Accounts Receivable", href: "/financial/ar" },
      { label: "Budget vs Actual", href: "/financial/budget" },
      { label: "Cash Flow", href: "/financial/cash-flow" },
    ],
  },
  {
    label: "Documents",
    icon: "folder-open",
    children: [
      { label: "Library", href: "/documents" },
      { label: "Plan Room", href: "/documents/plan-room" },
    ],
  },
  {
    label: "People",
    icon: "users",
    children: [
      { label: "Directory", href: "/people" },
      { label: "Time & Attendance", href: "/people/time" },
      { label: "Certifications", href: "/people/certifications" },
    ],
  },
  {
    label: "CRM & Bids",
    icon: "handshake",
    children: [
      { label: "Pipeline", href: "/crm" },
      { label: "Bid Management", href: "/crm/bids" },
    ],
  },
  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: "sparkles",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "bar-chart-3",
  },
];

export const appBottomNav: NavItem[] = [
  {
    label: "Administration",
    icon: "settings",
    children: [
      { label: "Users & Roles", href: "/admin/users" },
      { label: "Company Settings", href: "/admin/settings" },
      { label: "Content Manager", href: "/admin/content" },
      { label: "SEO & GEO", href: "/admin/seo" },
      { label: "AI Providers", href: "/admin/ai-providers" },
      { label: "Platform Admin", href: "/super-admin" },
    ],
  },
];
