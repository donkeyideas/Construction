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
    ],
  },
  {
    label: "seoGeo",
    href: "/super-admin/seo",
    icon: "globe",
  },
];

export const superAdminBottomNav: SuperAdminNavItem[] = [
  {
    label: "backToApp",
    href: "/dashboard",
    icon: "arrow-left",
  },
];
