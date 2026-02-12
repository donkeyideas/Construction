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
    label: "Overview",
    href: "/super-admin",
    icon: "layout-dashboard",
  },
  {
    label: "Companies",
    href: "/super-admin/companies",
    icon: "building-2",
  },
  {
    label: "Users",
    href: "/super-admin/users",
    icon: "users",
  },
  {
    label: "Content",
    icon: "file-text",
    children: [
      { label: "CMS Pages", href: "/super-admin/content" },
      { label: "Announcements", href: "/super-admin/announcements" },
    ],
  },
  {
    label: "SEO & GEO",
    href: "/super-admin/seo",
    icon: "globe",
  },
];

export const superAdminBottomNav: SuperAdminNavItem[] = [
  {
    label: "Back to App",
    href: "/dashboard",
    icon: "arrow-left",
  },
];
