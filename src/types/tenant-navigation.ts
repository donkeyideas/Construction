import type { NavItem } from "./navigation";

export const tenantNavigation: NavItem[] = [
  {
    label: "Home",
    href: "/tenant",
    icon: "layout-dashboard",
  },
  {
    label: "My Lease",
    href: "/tenant/lease",
    icon: "file-text",
  },
  {
    label: "Payments",
    href: "/tenant/payments",
    icon: "credit-card",
  },
  {
    label: "Maintenance",
    icon: "wrench",
    children: [
      { label: "My Requests", href: "/tenant/maintenance" },
      { label: "Submit Request", href: "/tenant/maintenance/new" },
    ],
  },
  {
    label: "Documents",
    href: "/tenant/documents",
    icon: "folder-open",
  },
  {
    label: "Announcements",
    href: "/tenant/announcements",
    icon: "megaphone",
  },
  {
    label: "My Profile",
    href: "/tenant/profile",
    icon: "user",
  },
];
