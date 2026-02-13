import type { NavItem } from "./navigation";

export const adminDashboardNavigation: NavItem[] = [
  {
    label: "Overview",
    href: "/admin-panel",
    icon: "layout-dashboard",
  },
  {
    label: "Users & Roles",
    icon: "users",
    children: [
      { label: "Team Members", href: "/admin-panel/users" },
      { label: "Invitations", href: "/admin-panel/users/invitations" },
      { label: "Permissions", href: "/admin-panel/users/permissions" },
    ],
  },
  {
    label: "Company",
    icon: "building-2",
    children: [
      { label: "Settings", href: "/admin-panel/company/settings" },
      { label: "Billing", href: "/admin-panel/company/billing" },
      { label: "Integrations", href: "/admin-panel/company/integrations" },
    ],
  },
  {
    label: "Tenant Mgmt",
    icon: "key",
    children: [
      { label: "All Tenants", href: "/admin-panel/tenants" },
      { label: "Invite Tenant", href: "/admin-panel/tenants/invite" },
      { label: "Announcements", href: "/admin-panel/tenants/announcements" },
    ],
  },
  {
    label: "Vendor Mgmt",
    icon: "truck",
    children: [
      { label: "All Vendors", href: "/admin-panel/vendors" },
      { label: "Invite Vendor", href: "/admin-panel/vendors/invite" },
      { label: "Compliance", href: "/admin-panel/vendors/compliance" },
    ],
  },
  {
    label: "Content",
    icon: "file-text",
    children: [
      { label: "Content Manager", href: "/admin-panel/content" },
      { label: "SEO & GEO", href: "/admin-panel/seo" },
    ],
  },
  {
    label: "Security",
    icon: "shield",
    href: "/admin-panel/security",
  },
  {
    label: "Automation",
    icon: "zap",
    children: [
      { label: "Rules", href: "/admin-panel/automation" },
      { label: "Execution Log", href: "/admin-panel/automation/logs" },
    ],
  },
  {
    label: "AI Providers",
    href: "/admin-panel/ai-providers",
    icon: "sparkles",
  },
  {
    label: "Audit Log",
    href: "/admin-panel/audit-log",
    icon: "scroll-text",
  },
];

export const adminDashboardBottomNav: NavItem[] = [
  {
    label: "Executive View",
    href: "/dashboard",
    icon: "arrow-left",
  },
];
