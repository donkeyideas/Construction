export interface SuperAdminNavChild {
  label: string;
  href: string;
}

export interface SuperAdminNavItem {
  label: string;
  href?: string;
  icon: string;
  children?: SuperAdminNavChild[];
}

export const superAdminNavigation: SuperAdminNavItem[] = [
  {
    label: "overview",
    href: "/super-admin",
    icon: "layout-dashboard",
  },
  {
    label: "companies",
    href: "/super-admin/companies",
    icon: "building-2",
  },
  {
    label: "users",
    href: "/super-admin/users",
    icon: "users",
  },
  {
    label: "content",
    icon: "file-text",
    children: [
      { label: "cmsPages", href: "/super-admin/content" },
      { label: "announcements", href: "/super-admin/announcements" },
    ],
  },
  {
    label: "billing",
    icon: "credit-card",
    children: [
      { label: "pricingTiers", href: "/super-admin/pricing" },
      { label: "subscriptions", href: "/super-admin/subscriptions" },
      { label: "promoCodes", href: "/super-admin/promo-codes" },
      { label: "revenue", href: "/super-admin/revenue" },
      { label: "stripeSettings", href: "/super-admin/stripe-settings" },
    ],
  },
  {
    label: "searchAi",
    href: "/super-admin/seo",
    icon: "globe",
  },
  {
    label: "operations",
    icon: "shield",
    children: [
      { label: "supportTickets", href: "/super-admin/support-tickets" },
      { label: "auditLogs", href: "/super-admin/audit-logs" },
      { label: "systemHealth", href: "/super-admin/system-health" },
    ],
  },
  {
    label: "tools",
    icon: "wrench",
    children: [
      { label: "emailTemplates", href: "/super-admin/email-templates" },
      { label: "featureFlags", href: "/super-admin/feature-flags" },
      { label: "onboarding", href: "/super-admin/onboarding" },
      { label: "dataExport", href: "/super-admin/data-export" },
    ],
  },
  {
    label: "settings",
    href: "/super-admin/settings",
    icon: "settings",
  },
];
